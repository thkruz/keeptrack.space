/* eslint-disable no-console */
/**
 * Minimal ANSI logger for the plugin CLI. Self-contained (the build reporter is
 * spinner-oriented and meant for the bundler); colors mirror build/lib/build-error.ts.
 */
const STYLE = {
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
} as const;

function paint(color: keyof typeof STYLE, msg: string): string {
  return `${STYLE[color]}${msg}${STYLE.reset}`;
}

export const log = {
  info: (msg: string): void => console.log(paint('cyan', msg)),
  warn: (msg: string): void => console.warn(paint('yellow', `⚠ ${msg}`)),
  error: (msg: string): void => console.error(paint('red', `✖ ${msg}`)),
  success: (msg: string): void => console.log(paint('green', `✓ ${msg}`)),
  step: (msg: string): void => console.log(paint('gray', `  ${msg}`)),
  plain: (msg: string): void => console.log(msg),
  bold: (msg: string): string => paint('bold', msg),
  dim: (msg: string): string => paint('gray', msg),
};

/** A fatal CLI error whose message is already user-facing (no stack dump needed). */
export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
    Object.setPrototypeOf(this, CliError.prototype);
  }
}
