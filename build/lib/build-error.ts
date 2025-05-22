// src/scripts/utils/errorHandling.ts

/**
 * Custom error class for build process errors
 */
export class BuildError extends Error {
  constructor(message: string, public readonly code: string = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'BuildError';

    // This is necessary for proper instanceof checks with custom Error classes
    Object.setPrototypeOf(this, BuildError.prototype);
  }
}

/**
 * Error codes for common build errors
 */
export const ErrorCodes = {
  INVALID_MODE: 'INVALID_MODE',
  FILE_OPERATION: 'FILE_OPERATION',
  COMPILER_CREATION: 'COMPILER_CREATION',
  PLUGIN_CONFIG: 'PLUGIN_CONFIG',
  ENV_CONFIG: 'ENV_CONFIG',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
} as const;

export enum ConsoleStyles {
  DEBUG = '\x1b[90m', // Gray
  INFO = '\x1b[36m', // Cyan
  ERROR = '\x1b[31m', // Red
  WARNING = '\x1b[33m', // Yellow
  SUCCESS = '\x1b[32m', // Green
  RESET = '\x1b[0m', // Reset
}

/**
 * Wraps an operation that might throw with proper error handling
 * @param operation Function to execute
 * @param errorMessage Message to display if operation fails
 * @param errorCode Error code to use if operation fails
 */
export function tryCatchWithBuildError<T>(
  operation: () => T,
  errorMessage: string,
  errorCode: string = ErrorCodes.FILE_OPERATION,
): T {
  try {
    return operation();
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);

    throw new BuildError(`${errorMessage}: ${details}`, errorCode);
  }
}

/**
 * Handles the build process errors uniformly
 * @param error The error that occurred
 * @param exitProcess Whether to exit the process (defaults to true)
 */
export function handleBuildError(error: unknown, exitProcess = true): void {
  if (error instanceof BuildError) {
    console.error(
      `${ConsoleStyles.ERROR}Build Error [${error.code}]: ${error.message}${ConsoleStyles.RESET}`,
    );
  } else if (error instanceof Error) {
    console.error(
      `${ConsoleStyles.ERROR}Unexpected Error: ${error.message}${ConsoleStyles.RESET}`,
    );
    console.error(error.stack);
  } else {
    console.error(
      `${ConsoleStyles.ERROR}Unknown Error: ${String(error)}${ConsoleStyles.RESET}`,
    );
  }

  if (exitProcess) {
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
}

/**
 * Logs a styled message to the console
 * @param message Message to log
 * @param style Style to use
 */
export function logWithStyle(message: string, style: ConsoleStyles = ConsoleStyles.INFO): void {
  console.log(`${style}${message}${ConsoleStyles.RESET}`);
}
