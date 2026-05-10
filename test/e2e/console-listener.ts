import { type ConsoleMessage, type Page, expect } from '@playwright/test';

export interface AllowlistEntry {
  pattern: RegExp;
  reason: string;
}

export interface ConsoleViolation {
  kind: 'console.warning' | 'console.error' | 'pageerror';
  text: string;
  location?: string;
}

export interface ListenerHandle {
  getViolations(): ConsoleViolation[];
  clear(): void;
  detach(): void;
}

/**
 * Allowlist mirrors the filter in test/vitest-setup.ts so the same noise
 * suppressed in unit tests is also suppressed at the E2E layer. Add a new
 * entry only when the noise is genuinely outside our control (third-party
 * library, browser policy warning) — application warnings should be fixed,
 * not allowlisted.
 */
export const DEFAULT_ALLOWLIST: AllowlistEntry[] = [
  { pattern: /geo3D exists\./u, reason: 'echarts-gl harmless re-registration on hot reload' },
  { pattern: /googleads\.g\.doubleclick\.net|googlesyndication\.com|adservice\.google/u, reason: 'Google ad provider 403/blocked requests in test env are not application bugs' },
  { pattern: /GPU stall due to ReadPixels/u, reason: 'Chromium WebGL driver perf hint, hardware-dependent and not actionable from app code' },
];

/**
 * Attaches console / pageerror listeners that record violations against the
 * given allowlist. Returns a handle for retrieval, clearing, and detachment.
 */
export function attachConsoleListener(
  page: Page,
  allowlist: AllowlistEntry[] = DEFAULT_ALLOWLIST,
): ListenerHandle {
  const violations: ConsoleViolation[] = [];

  const isAllowlisted = (text: string, locationUrl?: string): boolean =>
    allowlist.some((entry) => entry.pattern.test(text) || (locationUrl ? entry.pattern.test(locationUrl) : false));

  const onConsole = (msg: ConsoleMessage): void => {
    const type = msg.type();

    if (type !== 'warning' && type !== 'error') {
      return;
    }
    const text = msg.text();
    const loc = msg.location();
    const location = loc.url ? `${loc.url}:${loc.lineNumber}:${loc.columnNumber}` : undefined;

    if (isAllowlisted(text, loc.url)) {
      return;
    }
    violations.push({
      kind: type === 'warning' ? 'console.warning' : 'console.error',
      text,
      location,
    });
  };

  const onPageError = (err: Error): void => {
    if (isAllowlisted(err.message)) {
      return;
    }
    violations.push({
      kind: 'pageerror',
      text: `${err.name}: ${err.message}`,
      location: err.stack?.split('\n')[1]?.trim(),
    });
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  return {
    getViolations: () => violations.slice(),
    clear: () => {
      violations.length = 0;
    },
    detach: () => {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
    },
  };
}

/**
 * Throws an `expect`-formatted assertion error if the handle has captured
 * any non-allowlisted console violations. The error body lists every
 * violation with its source location for fast triage from CI logs.
 */
export function assertNoConsoleViolations(handle: ListenerHandle): void {
  const violations = handle.getViolations();

  if (violations.length === 0) {
    return;
  }
  const lines = violations.map((v, i) => {
    const where = v.location ? `\n      at ${v.location}` : '';


    return `  [${i + 1}] (${v.kind}) ${v.text}${where}`;
  });
  const summary = `${violations.length} console violation(s) detected during E2E run:\n${lines.join('\n')}`;

  expect(violations, summary).toHaveLength(0);
}
