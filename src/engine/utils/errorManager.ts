import { ToastMsgType } from '@app/engine/core/interfaces';
import githubIssueUrl, { Options } from 'new-github-issue-url';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { isThisNode } from './isThisNode';

export enum LogLevel {
  DEBUG = 0,
  LOG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  NONE = 5,
}

const LOG_LABELS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.LOG]: 'LOG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.NONE]: '',
};

const SIGNATURE_WINDOW_MS = 5 * 60 * 1000;
const SIGNATURE_MAP_PRUNE_THRESHOLD = 100;

export interface ErrorOptions {
  skipAutoFile?: boolean;
  skipToast?: boolean;
}

export interface ErrorContext {
  /** Raw thrown value — may be null/undefined for cross-origin script errors. */
  error: unknown;
  funcName: string;
  /** event.message — preserved even when `error` is null. */
  message?: string;
  /** event.filename */
  source?: string;
  /** event.lineno */
  line?: number;
  /** event.colno */
  col?: number;
  /** True when event.error is null AND message is 'Script error.' (cross-origin). */
  isCrossOrigin?: boolean;
  /**
   * True when an event handler received an opaque payload — null error, no message, no source
   * (e.g. a cross-origin/opaque Web Worker onerror). The source sets this because reportEvent
   * can't distinguish it from a deliberate `error(null)` call after the fact.
   */
  isOpaqueEvent?: boolean;
  isUnhandledRejection?: boolean;
  toastMsg?: string;
  opts?: ErrorOptions;
}

/**
 * True when a window `error` event carries no actionable payload — the browser handed us only the
 * cross-origin/opaque husk of a script error, not the real Error. The spec sentinel is a null
 * `error` with message `'Script error.'`, but some Chromium forks (e.g. the VivoBrowser fork in
 * #1353) leak a non-standard message or drop the filename instead, so the exact-sentinel check
 * alone misses them. Any null-error event without a usable message or source is treated as
 * cross-origin so it's tagged unactionable downstream (no toast, no auto-filed "Unknown error").
 *
 * Guarded by `!e.error`: a genuine same-origin uncaught error always carries the real Error object,
 * so this never swallows actionable bugs that merely happen to lack a message or filename.
 */
export function isOpaqueWindowError(e: Pick<ErrorEvent, 'error' | 'message' | 'filename'>): boolean {
  if (e.error) {
    return false;
  }

  return e.message === 'Script error.' || !e.message || !e.filename;
}

export class ErrorManager {
  private minLevel_: LogLevel;
  private signatureWindow_ = new Map<string, number>();
  private newGithubIssueUrl_: (options: Options) => string;

  constructor() {
    if (!isThisNode() && window.location.hostname === 'localhost') {
      this.minLevel_ = LogLevel.LOG;
    } else {
      this.minLevel_ = LogLevel.WARN;
    }

    if (!isThisNode() && window.location.hostname !== 'localhost') {
      this.newGithubIssueUrl_ = githubIssueUrl;
    } else {
      this.newGithubIssueUrl_ = () => '';
    }
  }

  setLogLevel(level: LogLevel): void {
    this.minLevel_ = level;
  }

  private shouldLog_(level: LogLevel): boolean {
    return level >= this.minLevel_;
  }

  private formatMsg_(level: LogLevel, msg: string): string {
    return `[${LOG_LABELS[level]}] ${msg}`;
  }

  private toError_(e: unknown, message?: string, source?: string, line?: number, col?: number): Error {
    if (e instanceof Error) {
      return e;
    }

    // Cross-origin / synthetic case: build an Error whose stack reflects the captured event fields.
    if ((e === null || e === undefined) && (message || source)) {
      const err = new Error(message ?? 'Unknown error');

      err.stack = `${err.name}: ${err.message}\n    at ${source ?? '<anonymous>'}:${line ?? '?'}:${col ?? '?'}`;

      return err;
    }

    let err: Error;

    if (e === null || e === undefined) {
      err = new Error('Unknown error');
    } else if (typeof e === 'string') {
      err = new Error(e);
    } else {
      try {
        err = new Error(JSON.stringify(e));
      } catch {
        err = new Error(String(e));
      }
    }

    // Re-anchor the stack to the caller of toError_, so reports don't all look like
    // "at ErrorManager.toError_". V8 only — other engines keep the constructor stack.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    const captureStackTrace = (Error as unknown as { captureStackTrace?: (target: object, constructorOpt: Function) => void }).captureStackTrace;

    if (typeof captureStackTrace === 'function') {
      captureStackTrace(err, this.toError_);
    }

    return err;
  }

  /**
   * Structured entry point — preserves ErrorEvent / PromiseRejectionEvent context
   * so reports carry real source locations even when the raw thrown value is null.
   */
  reportEvent(ctx: ErrorContext): void {
    if (!this.shouldLog_(LogLevel.ERROR)) {
      return;
    }

    const err = this.toError_(ctx.error, ctx.message, ctx.source, ctx.line, ctx.col);

    // Cross-origin / opaque / third-party-loader errors are unfixable on our end — Cloudflare
    // Rocket Loader and other CDN-injected scripts trigger these, including via unhandled promise
    // rejections whose reason is null, and opaque Web Worker onerror events carry no payload at all
    // (the window `error` handler flags 'Script error.' with isCrossOrigin, but worker/rejection
    // handlers can't, so we also sniff the event fields and stack). Surface to telemetry and console
    // once, but tag the error as unactionable so telemetry skips the bug-filing POST, and don't toast
    // the user or auto-file a useless "Unknown error" GitHub issue (see #1371).
    if (this.isUnactionableError_(err, ctx)) {
      (err as { isUnactionable?: boolean }).isUnactionable = true;
      EventBus.getInstance().emit(EventBusEvent.error, err, ctx.funcName);
      // eslint-disable-next-line no-console
      console.warn(
        this.formatMsg_(LogLevel.WARN, `${ctx.funcName}: suppressed cross-origin script error`),
        { message: ctx.message, source: ctx.source, line: ctx.line, col: ctx.col },
      );

      return;
    }

    EventBus.getInstance().emit(EventBusEvent.error, err, ctx.funcName);

    // eslint-disable-next-line no-console
    console.error(this.formatMsg_(LogLevel.ERROR, `${ctx.funcName}: ${err.message}`), err);
    if (!isThisNode()) {
      // eslint-disable-next-line no-console
      console.trace();
    }

    const toastMsg = ctx.toastMsg ?? err.message ?? 'Unknown error';
    const isDup = this.isDuplicateSuppressed_(this.getSignature_(err));
    const skipAutoFile = ctx.opts?.skipAutoFile === true || this.isExternalFetchError_(err) || isDup;

    if (!skipAutoFile) {
      const url = this.getErrorUrl_(err, ctx);

      if (url !== '') {
        window.open(url, '_blank');
      }
    }

    if (ctx.opts?.skipToast !== true && !isDup) {
      ServiceLocator.getUiManager()?.toast(toastMsg, ToastMsgType.error, true);
    }

    if (isThisNode()) {
      throw err;
    }
  }

  /**
   * Thin wrapper preserved for the ~28 existing call sites. New code should use
   * {@link reportEvent} directly to pass through ErrorEvent / PromiseRejection fields.
   */
  error(e: Error, funcName: string, toastMsg?: string, opts?: ErrorOptions): void {
    this.reportEvent({ error: e, funcName, toastMsg, opts });
  }

  private getSignature_(err: Error): string {
    const firstFrame = (err.stack ?? '')
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('at ')) ?? '';

    return `${err.name}::${err.message}::${firstFrame}`;
  }

  private isDuplicateSuppressed_(signature: string): boolean {
    const now = Date.now();
    const last = this.signatureWindow_.get(signature);

    if (last !== undefined && now - last < SIGNATURE_WINDOW_MS) {
      return true;
    }

    this.signatureWindow_.set(signature, now);

    if (this.signatureWindow_.size > SIGNATURE_MAP_PRUNE_THRESHOLD) {
      for (const [sig, t] of this.signatureWindow_) {
        if (now - t > SIGNATURE_WINDOW_MS) {
          this.signatureWindow_.delete(sig);
        }
      }
    }

    return false;
  }

  /**
   * Errors we can't act on: cross-origin script errors, opaque event payloads, and third-party
   * loader noise. These get logged + counted but are never toasted, auto-filed, or POSTed to the
   * bug-filing telemetry endpoint (which would surface them as false-positive GitHub issues).
   *
   * Three sources:
   * - Same-origin 'Script error.' from a cross-origin script, flagged upstream with `isCrossOrigin`.
   * - Opaque events (flagged upstream with `isOpaqueEvent`): the raw thrown value is null/undefined
   *   AND the event carried no message and no source. A Web Worker `onerror` for a cross-origin/opaque
   *   worker (e.g. colorCruncher) arrives this way. `toError_` can only synthesize a bare 'Unknown
   *   error' whose stack points back at `reportEvent` — there is nothing to debug. The source flags
   *   this because reportEvent can't tell it apart from a deliberate `error(null)` call after the fact.
   * - Cloudflare Rocket Loader / CDN-injected loaders: null-reason rejections that never get flagged,
   *   so we match their telltale frames (`cdn-cgi`, `rocket-loader`) in the stack or captured source.
   *   Matching the rebuilt synthetic stack works because `toError_` re-anchors a null-reason error to
   *   the synchronous caller, which is the loader itself (#1371).
   */
  private isUnactionableError_(err: Error, ctx: ErrorContext): boolean {
    if (ctx.isCrossOrigin || ctx.isOpaqueEvent) {
      return true;
    }

    return (/cdn-cgi|rocket-loader/iu).test(`${ctx.source ?? ''}\n${err.stack ?? ''}`);
  }

  private isExternalFetchError_(err: Error): boolean {
    // HTTP-status-bearing errors (e.g. CelesTrak `err.status = 500`) are server-side, not our bug.
    if (typeof (err as { status?: unknown }).status === 'number') {
      return true;
    }

    /*
     * Network-layer fetch failures (offline, DNS, CORS, dead host) surface with one of these
     * browser-specific messages: 'Failed to fetch' (Chromium), 'NetworkError when attempting
     * to fetch resource.' (Firefox), 'Load failed' (Safari). Match on the MESSAGE regardless of
     * prototype — an error that crosses a Web Worker / structured-clone boundary, or is rebuilt by
     * toError_, arrives as a plain Error and would slip past an `instanceof TypeError` check and
     * get auto-filed as a spurious GitHub issue. The phrases are specific enough that a real app
     * bug is unlikely to collide; a bare 'fetch' is deliberately NOT matched (too broad).
     */
    return (/failed to fetch|networkerror|load failed/iu).test(err.message);
  }

  warn(msg: string, ...optionalParams: unknown[]): void {
    if (!this.shouldLog_(LogLevel.WARN)) {
      return;
    }

    ServiceLocator.getUiManager()?.toast(msg, ToastMsgType.serious, true);

    // eslint-disable-next-line no-console
    console.warn(this.formatMsg_(LogLevel.WARN, msg), ...optionalParams);
    if (!isThisNode()) {
      // eslint-disable-next-line no-console
      console.trace();
    }
  }

  warnToast(msg: string): void {
    if (!this.shouldLog_(LogLevel.WARN)) {
      return;
    }

    ServiceLocator.getUiManager()?.toast(msg, ToastMsgType.serious, true);
  }

  info(msg: string, ...optionalParams: unknown[]): void {
    if (!this.shouldLog_(LogLevel.INFO)) {
      return;
    }

    ServiceLocator.getUiManager()?.toast(msg, ToastMsgType.normal, true);

    // eslint-disable-next-line no-console
    console.info(this.formatMsg_(LogLevel.INFO, msg), ...optionalParams);
  }

  log(msg: string, ...optionalParams: unknown[]): void {
    if (!this.shouldLog_(LogLevel.LOG)) {
      return;
    }

    ServiceLocator.getUiManager()?.toast(msg, ToastMsgType.standby, true);

    // eslint-disable-next-line no-console
    console.log(this.formatMsg_(LogLevel.LOG, msg), ...optionalParams);
  }

  debug(msg: string, ...optionalParams: unknown[]): void {
    if (!this.shouldLog_(LogLevel.DEBUG)) {
      return;
    }

    ServiceLocator.getUiManager()?.toast(msg, ToastMsgType.standby, true);

    // eslint-disable-next-line no-console
    console.debug(this.formatMsg_(LogLevel.DEBUG, msg), ...optionalParams);
  }

  private getErrorUrl_(e: Error, ctx: ErrorContext): string {
    const sourceLocation = ctx.source
      ? `\n#### Source\n${ctx.source}:${ctx.line ?? '?'}:${ctx.col ?? '?'}`
      : '';
    const rejectionFlag = ctx.isUnhandledRejection
      ? '\n#### Type\nUnhandled Promise Rejection'
      : '';

    return this.newGithubIssueUrl_({
      user: 'thkruz',
      repo: 'keeptrack.space',
      title: `${e?.name || 'Unknown'} in ${ctx.funcName}`,
      labels: ['Problems : Bug'],
      body: `#### User Description
Type what you were trying to do here...\n\n\n
#### Version
${__VERSION__} - ${new Date(__VERSION_DATE__).toLocaleString()}
#### Function
${ctx.funcName}${rejectionFlag}${sourceLocation}
#### Error Title
${e.name}
#### Error Message
${e.message}
#### Stack
${e.stack}`,
    });
  }
}

export const errorManagerInstance = new ErrorManager();
