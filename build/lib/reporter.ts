/* eslint-disable no-process-env */
/*
 * Zero-dependency terminal reporter for the build scripts (pnpm/vite style output).
 *
 * Interactive terminals get animated spinner steps that collapse into
 * check-marked one-liners, plus an in-place compile progress bar. Non-TTY
 * environments (CI, piped output) get plain sequential lines with no cursor
 * movement so logs stay readable.
 */
import { styleText } from 'node:util';

export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

type StyleFormat = Parameters<typeof styleText>[0];

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_INTERVAL_MS = 80;
const PROGRESS_BAR_WIDTH = 20;
/** Width of the label column so durations and notes line up across steps. */
const LABEL_PAD = 30;

/** Formats a millisecond duration as 12ms / 1.4s / 2m 8s. */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);

  return `${minutes}m ${seconds}s`;
}

/** Formats a byte count as 512 B / 98.4 kB / 2.31 MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;

    return `${kb >= 100 ? kb.toFixed(0) : kb.toFixed(1)} kB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface ActiveStep {
  label: string;
  startedAt: number;
}

interface CompilerProgress {
  pct: number;
  msg: string;
}

class Reporter {
  private readonly isInteractive_: boolean;
  private readonly isVerbose_: boolean;
  private spinnerTimer_: NodeJS.Timeout | null = null;
  private spinnerFrame_ = 0;
  private activeStep_: ActiveStep | null = null;
  private readonly compilers_ = new Map<string, CompilerProgress>();
  private isCompiling_ = false;
  private hasActiveLine_ = false;

  constructor() {
    if (process.env.BUILD_INTERACTIVE === '1') {
      this.isInteractive_ = true;
    } else if (process.env.BUILD_INTERACTIVE === '0' || process.env.CI) {
      this.isInteractive_ = false;
    } else {
      this.isInteractive_ = process.stdout.isTTY === true;
    }

    this.isVerbose_ = process.argv.includes('--verbose') || process.env.BUILD_VERBOSE === '1';
  }

  get isVerbose(): boolean {
    return this.isVerbose_;
  }

  /** Prints the build header, e.g. "KeepTrack  v13.0.6 · pro · production". */
  banner(title: string, subtitle: string): void {
    this.clearActiveLine_();
    console.log('');
    console.log(`  ${this.paint_('bold', title)}  ${this.paint_('dim', subtitle)}`);
    console.log('');
  }

  /**
   * Runs a synchronous build phase behind a spinner that collapses into a
   * check-marked line with its duration. The optional note callback turns the
   * phase result into a dim annotation, e.g. "12 languages".
   */
  phase<T>(label: string, fn: () => T, note?: (result: T) => string): T {
    const startedAt = Date.now();

    this.startStep_(label, startedAt);

    try {
      const result = fn();

      this.finishStep_(label, startedAt, note?.(result));

      return result;
    } catch (error) {
      this.failStep_(label);
      throw error;
    }
  }

  /** Prints a completed-but-skipped phase line, e.g. "✓ Locales  skipped (pre-merged)". */
  skip(label: string, note: string): void {
    this.clearActiveLine_();
    const annotation = `skipped (${note})`;

    console.log(`  ${this.paint_('green', '✓')} ${label.padEnd(LABEL_PAD)}${this.paint_('dim', annotation)}`);
    this.redrawActiveLine_();
  }

  /** Prints a completed step that ran elsewhere (e.g. a compiler child), with its duration. */
  stepDone(label: string, durationMs: number): void {
    this.clearActiveLine_();
    console.log(`  ${this.paint_('green', '✓')} ${label.padEnd(LABEL_PAD)}${this.paint_('dim', formatDuration(durationMs))}`);
    this.redrawActiveLine_();
  }

  /** Marks the currently running phase as failed. Safe to call when no phase is active. */
  failActive(): void {
    if (this.activeStep_) {
      this.failStep_(this.activeStep_.label);
    }
  }

  /**
   * Level-based logging used by logWithStyle. Debug lines only print with
   * --verbose (or BUILD_VERBOSE=1); everything cooperates with the active
   * spinner/progress line so output never interleaves mid-line.
   */
  log(message: string, level: LogLevel = 'info'): void {
    if (level === 'debug' && !this.isVerbose_) {
      return;
    }

    this.clearActiveLine_();

    const styles: Record<LogLevel, StyleFormat> = {
      debug: 'gray',
      info: 'cyan',
      success: 'green',
      warn: 'yellow',
      error: 'red',
    };
    const line = this.paint_(styles[level], message);

    if (level === 'error') {
      console.error(line);
    } else {
      console.log(line);
    }

    this.redrawActiveLine_();
  }

  /**
   * Returns an rspack ProgressPlugin handler for the named compiler. All
   * registered compilers render as a single combined progress bar.
   */
  createCompileProgressHandler(name: string): (percentage: number, msg: string) => void {
    this.compilers_.set(name, { pct: 0, msg: '' });

    return (percentage: number, msg: string) => {
      const state = this.compilers_.get(name);

      if (!state) {
        return;
      }

      state.pct = percentage;
      state.msg = msg;

      if (!this.isCompiling_) {
        this.isCompiling_ = true;
        this.startSpinnerTimer_();
      }
      this.renderActiveLine_();
    };
  }

  /** Clears the compile progress bar (idempotent). Call before printing results. */
  clearProgress(): void {
    this.isCompiling_ = false;
    for (const state of this.compilers_.values()) {
      state.pct = 0;
      state.msg = '';
    }
    this.clearActiveLine_();
    this.syncSpinnerTimer_();
  }

  /** Watch-mode rebuild notification, e.g. "✓ rebuilt in 1.2s  (14:03:22)". */
  rebuilt(durationMs: number, verb: string = 'rebuilt'): void {
    this.clearActiveLine_();
    const clock = `(${new Date().toLocaleTimeString()})`;
    const message = `${verb} in ${formatDuration(durationMs)}`;

    console.log(`  ${this.paint_('green', '✓')} ${this.paint_('green', message)}  ${this.paint_('dim', clock)}`);
    this.redrawActiveLine_();
  }

  /**
   * Prints the emitted-asset summary table: the largest assets with their raw
   * and gzip sizes, then a total line for everything else.
   */
  assetSummary(rows: { name: string; size: number; gzipSize?: number }[], totalCount: number, totalBytes: number): void {
    if (rows.length === 0) {
      return;
    }

    this.clearActiveLine_();
    console.log('');

    const nameWidth = Math.max(...rows.map((row) => row.name.length)) + 2;

    for (const row of rows) {
      const size = formatBytes(row.size).padStart(9);
      const gzipNote = typeof row.gzipSize === 'number' ? `│ gzip ${formatBytes(row.gzipSize).padStart(9)}` : '';
      const gzip = gzipNote ? ` ${this.paint_('dim', gzipNote)}` : '';

      console.log(`  ${this.paint_('dim', row.name.padEnd(nameWidth))}${size}${gzip}`);
    }

    const remaining = totalCount - rows.length;
    const summaryLabel = remaining > 0 ? `... ${remaining} more assets` : `${totalCount} assets`;

    console.log(`  ${this.paint_('dim', summaryLabel.padEnd(nameWidth))}${formatBytes(totalBytes).padStart(9)} ${this.paint_('dim', 'total')}`);
  }

  /** Prints the closing "Done in 44.7s" line. */
  done(totalMs: number): void {
    this.clearActiveLine_();
    const message = `Done in ${formatDuration(totalMs)}`;

    console.log('');
    console.log(`  ${this.paint_(['bold', 'green'], message)}`);
    console.log('');
  }

  private startStep_(label: string, startedAt: number): void {
    this.activeStep_ = { label, startedAt };

    if (this.isInteractive_) {
      this.startSpinnerTimer_();
      this.renderActiveLine_();
    }
  }

  private finishStep_(label: string, startedAt: number, note?: string): void {
    this.activeStep_ = null;
    this.syncSpinnerTimer_();
    this.clearActiveLine_();

    const duration = formatDuration(Date.now() - startedAt);
    const annotation = note ? `${duration}  ${note}` : duration;

    console.log(`  ${this.paint_('green', '✓')} ${label.padEnd(LABEL_PAD)}${this.paint_('dim', annotation)}`);
    this.redrawActiveLine_();
  }

  private failStep_(label: string): void {
    this.activeStep_ = null;
    this.syncSpinnerTimer_();
    this.clearActiveLine_();
    console.log(`  ${this.paint_('red', '✗')} ${label}`);
  }

  /** Renders the current spinner/progress line in place (interactive mode only). */
  private renderActiveLine_(): void {
    if (!this.isInteractive_) {
      return;
    }

    let line: string | null = null;

    if (this.activeStep_) {
      line = `  ${this.paint_('cyan', SPINNER_FRAMES[this.spinnerFrame_])} ${this.activeStep_.label}`;
    } else if (this.isCompiling_) {
      line = this.buildProgressLine_();
    }

    if (line === null) {
      return;
    }

    const columns = process.stdout.columns ?? 80;

    if (line.length > columns - 1) {
      line = line.slice(0, columns - 1);
    }

    process.stdout.write(`\r\x1b[2K${line}`);
    this.hasActiveLine_ = true;
  }

  private buildProgressLine_(): string {
    const entries = [...this.compilers_.entries()];
    const avg = entries.reduce((sum, [, state]) => sum + state.pct, 0) / Math.max(entries.length, 1);
    const filled = Math.round(avg * PROGRESS_BAR_WIDTH);
    const bar = '█'.repeat(filled) + '░'.repeat(PROGRESS_BAR_WIDTH - filled);
    const pct = `${Math.round(avg * 100)}%`.padStart(4);
    const perCompiler = entries.map(([name, state]) => `${name} ${Math.round(state.pct * 100)}%`).join(' · ');

    return `  ${this.paint_('cyan', SPINNER_FRAMES[this.spinnerFrame_])} Compiling [${bar}] ${pct}  ${this.paint_('dim', perCompiler)}`;
  }

  private clearActiveLine_(): void {
    if (this.isInteractive_ && this.hasActiveLine_) {
      process.stdout.write('\r\x1b[2K');
      this.hasActiveLine_ = false;
    }
  }

  private redrawActiveLine_(): void {
    if (this.activeStep_ || this.isCompiling_) {
      this.renderActiveLine_();
    }
  }

  private startSpinnerTimer_(): void {
    if (!this.isInteractive_ || this.spinnerTimer_) {
      return;
    }

    this.spinnerTimer_ = setInterval(() => {
      this.spinnerFrame_ = (this.spinnerFrame_ + 1) % SPINNER_FRAMES.length;
      this.renderActiveLine_();
    }, SPINNER_INTERVAL_MS);
    // The spinner must never keep the build process alive on its own
    this.spinnerTimer_.unref();
  }

  /** Stops the spinner timer when nothing is animating. */
  private syncSpinnerTimer_(): void {
    if (!this.activeStep_ && !this.isCompiling_ && this.spinnerTimer_) {
      clearInterval(this.spinnerTimer_);
      this.spinnerTimer_ = null;
    }
  }

  /** styleText handles NO_COLOR/FORCE_COLOR and disables colors on non-TTY streams. */
  private paint_(format: StyleFormat, text: string): string {
    return styleText(format, text);
  }
}

export const reporter = new Reporter();
