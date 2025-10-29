import { ToastMsgType } from '@app/engine/core/interfaces';
import githubIssueUrl, { Options } from 'new-github-issue-url';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { isThisNode } from './isThisNode';

export class ErrorManager {
  private readonly ALLOW_DEBUG = false; // window.location.hostname === 'localhost';
  private readonly ALLOW_LOG = window.location.hostname === 'localhost';
  private readonly ALLOW_INFO = true;
  private readonly ALLOW_WARN = true;
  private lastErrorTime = 0;
  isDebug = false;

  private newGithubIssueUrl_: (options: Options) => string;

  constructor() {
    // hostname is not localhost
    if (!isThisNode() && window.location.hostname !== 'localhost') {
      this.newGithubIssueUrl_ = githubIssueUrl;
    } else {
      this.newGithubIssueUrl_ = () => '';
      if (isThisNode()) {
        this.newGithubIssueUrl_ = () => '';
      }
    }
  }

  error(e: Error, funcName: string, toastMsg?: string) {
    EventBus.getInstance().emit(EventBusEvent.error, e, funcName);

    // eslint-disable-next-line no-console
    console.error(e);

    toastMsg ??= e.message || 'Unknown error';
    const url = this.getErrorUrl(e, funcName);

    // Max 1 error per 5 minutes
    if (url !== '' && Date.now() - this.lastErrorTime > 1000 * 60 * 5) {
      window.open(url, '_blank');
      this.lastErrorTime = Date.now();
    }

    ServiceLocator.getUiManager()?.toast(toastMsg, ToastMsgType.error, true);

    if (isThisNode()) {
      throw e;
    }
  }

  private getErrorUrl(e: Error, funcName: string) {
    return this.newGithubIssueUrl_({
      user: 'thkruz',
      repo: 'keeptrack.space',
      title: `${e?.name || 'Unknown'} in ${funcName}`,
      labels: ['Problems : Bug'],
      body: `#### User Description
Type what you were trying to do here...\n\n\n
#### Version
${settingsManager.versionNumber} - ${settingsManager.versionDate}
#### Error Title
${e.name}
#### Error Message
${e.message}
#### Stack
${e.stack}`,
    });
  }

  warn(msg: string, isHideFromConsole = false) {
    if (this.ALLOW_WARN) {
      ServiceLocator.getUiManager()?.toast(msg, ToastMsgType.serious, true);
    }

    if (!isHideFromConsole) {
      // eslint-disable-next-line no-console
      console.warn(msg);
      if (!isThisNode()) {
        // eslint-disable-next-line no-console
        console.trace();
      }
    }
  }

  info(msg: string) {
    if (this.ALLOW_INFO) {
      ServiceLocator.getUiManager()?.toast(msg, ToastMsgType.normal, true);
    }
    if (this.isDebug && !isThisNode()) {
      // eslint-disable-next-line no-console
      console.info(msg);
      if (!isThisNode()) {
        // eslint-disable-next-line no-console
        console.trace();
      }
    }
  }

  log(msg: string) {
    if (this.ALLOW_LOG) {
      ServiceLocator.getUiManager()?.toast(msg, ToastMsgType.standby, true);
    }
    if (this.isDebug && !isThisNode()) {
      // eslint-disable-next-line no-console
      console.log(msg);
      if (!isThisNode()) {
        // eslint-disable-next-line no-console
        console.trace();
      }
    }
  }

  debug(msg: string) {
    if (this.ALLOW_DEBUG) {
      ServiceLocator.getUiManager()?.toast(msg, ToastMsgType.standby, true);
      // eslint-disable-next-line no-debugger
      debugger;
    }
    if (this.isDebug && !isThisNode()) {
      // eslint-disable-next-line no-console
      console.debug(msg);
      if (!isThisNode()) {
        // eslint-disable-next-line no-console
        console.trace();
      }
    }
  }
}

export const errorManagerInstance = new ErrorManager();
