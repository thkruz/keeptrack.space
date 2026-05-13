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

export class ErrorManager {
  private minLevel_: LogLevel;
  private lastErrorTime_ = 0;
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

  private toError_(e: unknown): Error {
    if (e instanceof Error) {
      return e;
    }
    if (e === null || e === undefined) {
      return new Error('Unknown error');
    }
    if (typeof e === 'string') {
      return new Error(e);
    }
    try {
      return new Error(JSON.stringify(e));
    } catch {
      return new Error(String(e));
    }
  }

  error(e: Error, funcName: string, toastMsg?: string, opts?: { skipAutoFile?: boolean; skipToast?: boolean }): void {
    if (!this.shouldLog_(LogLevel.ERROR)) {
      return;
    }

    const err = this.toError_(e);

    EventBus.getInstance().emit(EventBusEvent.error, err, funcName);

    // eslint-disable-next-line no-console
    console.error(this.formatMsg_(LogLevel.ERROR, `${funcName}: ${err.message}`), err);
    if (!isThisNode()) {
      // eslint-disable-next-line no-console
      console.trace();
    }

    toastMsg ??= err.message || 'Unknown error';

    const skipAutoFile = opts?.skipAutoFile === true || this.isExternalFetchError_(err);

    if (!skipAutoFile) {
      const url = this.getErrorUrl_(err, funcName);

      // Max 1 error per 5 minutes
      if (url !== '' && Date.now() - this.lastErrorTime_ > 1000 * 60 * 5) {
        window.open(url, '_blank');
        this.lastErrorTime_ = Date.now();
      }
    }

    if (opts?.skipToast !== true) {
      ServiceLocator.getUiManager()?.toast(toastMsg, ToastMsgType.error, true);
    }

    if (isThisNode()) {
      throw err;
    }
  }

  private isExternalFetchError_(err: Error): boolean {
    if (typeof (err as { status?: unknown }).status === 'number') {
      return true;
    }
    if (err instanceof TypeError && (/failed to fetch|networkerror|load failed|fetch/iu).test(err.message)) {
      return true;
    }

    return false;
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

  private getErrorUrl_(e: Error, funcName: string): string {
    return this.newGithubIssueUrl_({
      user: 'thkruz',
      repo: 'keeptrack.space',
      title: `${e?.name || 'Unknown'} in ${funcName}`,
      labels: ['Problems : Bug'],
      body: `#### User Description
Type what you were trying to do here...\n\n\n
#### Version
${__VERSION__} - ${new Date(__VERSION_DATE__).toLocaleString()}
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
