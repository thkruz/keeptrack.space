import { Options } from 'new-github-issue-url';
import { keepTrackContainer } from '../container';
import { Singletons, UiManager } from '../interfaces';
import { isThisNode } from '../keepTrackApi';

export class ErrorManager {
  private readonly ALLOW_DEBUG = window.location.hostname === 'localhost';
  private readonly ALLOW_LOG = window.location.hostname === 'localhost';
  private readonly ALLOW_INFO = true;
  private readonly ALLOW_WARN = true;
  isDebug = false;

  private newGithubIssueUrl_: (options: Options) => string;

  constructor() {
    // hostname is not localhost
    if (!isThisNode() && window.location.hostname !== 'localhost') {
      import('new-github-issue-url')
        .then((mod) => {
          this.newGithubIssueUrl_ = mod.default;
        })
        .catch(() => {
          this.newGithubIssueUrl_ = () => '';
        });
    } else {
      this.newGithubIssueUrl_ = () => '';
      if (isThisNode()) {
        this.newGithubIssueUrl_ = () => '';
      }
    }
  }

  public error(e: Error, funcName: string, toastMsg?: string) {
    console.error(e);

    toastMsg ??= e.message || 'Unknown error';
    const url = this.getErrorUrl(e, funcName);

    if (url !== '') {
      window.open(url, '_blank');
    }

    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
    uiManagerInstance.toast(toastMsg, 'error', true);

    if (isThisNode()) {
      throw e;
    }
  }

  private getErrorUrl(e: Error, funcName: string) {
    return this.newGithubIssueUrl_({
      user: 'thkruz',
      repo: 'keeptrack.space',
      title: `${e.name} in ${funcName}`,
      labels: ['Problems : Bug'],
      body: `#### User Description
Type what you were trying to do here...\n\n\n
#### Error Title
${e.name}
#### Error Message
${e.message}
#### Stack
${e.stack}`,
    });
  }

  public warn(msg: string) {
    if (this.ALLOW_WARN) {
      const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
      uiManagerInstance.toast(msg, 'serious', true);
    }
    if (this.isDebug) {
      console.warn(msg);
    }
  }

  public info(msg: string) {
    if (this.ALLOW_INFO) {
      const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
      uiManagerInstance.toast(msg, 'normal', true);
    }
    if (this.isDebug) {
      console.info(msg);
    }
  }

  public log(msg: string) {
    if (this.ALLOW_LOG) {
      const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
      uiManagerInstance.toast(msg, 'normal', true);
    }
    if (this.isDebug) {
      console.log(msg);
    }
  }

  public debug(msg: string) {
    if (this.ALLOW_DEBUG) {
      const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
      uiManagerInstance.toast(msg, 'standby', true);
      // eslint-disable-next-line no-debugger
      debugger;
    }
    if (this.isDebug) {
      console.debug(msg);
    }
  }
}

export const errorManagerInstance = new ErrorManager();
