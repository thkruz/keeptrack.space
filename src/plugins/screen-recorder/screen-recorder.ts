import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { errorManagerInstance } from '@app/singletons/errorManager';
import recorderPng from '@public/img/icons/video.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { StreamManager } from './stream-manager';

export class ScreenRecorder extends KeepTrackPlugin {
  protected dependencies_: string[];
  static readonly FILE_NAME = 'keeptrack.webm';

  bottomIconCallback = () => {
    if (this.isCompatibilityIssue) {
      errorManagerInstance.warn('Recording unavailable due to compatibility issues!');
      this.shakeBottomIcon();

      return;
    }

    if (this.streamManagerInstance.isVideoRecording) {
      this.streamManagerInstance.stop();
    } else {
      try {
        this.setBottomIconToSelected();
        this.streamManagerInstance.start();
        this.streamManagerInstance.isVideoRecording = true;
      } catch (e) {
        errorManagerInstance.warn('Compatibility Error with Recording!');
        this.streamManagerInstance.isVideoRecording = false;
        this.setBottomIconToDisabled();
        this.shakeBottomIcon();
        this.isCompatibilityIssue = true;
      }
    }
  };

  bottomIconElementName = 'menu-record';
  bottomIconImg = recorderPng;
  bottomIconLabel = 'Record Video';
  isCompatibilityIssue = false;
  streamManagerInstance: StreamManager;

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerOnReady,
      cbName: this.constructor.name,
      cb: () => {
        try {
          this.streamManagerInstance = new StreamManager(settingsManager.videoBitsPerSecond, this.onStop.bind(this), this.onMinorError.bind(this), this.onError.bind(this));
        } catch (e) {
          console.warn(e);
        }
      },
    });
  }

  getRecorderObject(): StreamManager {
    return this.streamManagerInstance;
  }

  onError(): void {
    this.setBottomIconToDisabled();
    this.isIconDisabled = true;
    this.streamManagerInstance.isVideoRecording = false;
    this.shakeBottomIcon();
    this.isCompatibilityIssue = true;
  }

  onMinorError(): void {
    this.setBottomIconToUnselected();
  }

  onStop(): void {
    this.streamManagerInstance.save(ScreenRecorder.FILE_NAME);
    this.setBottomIconToUnselected();
  }
}

export const screenRecorderPlugin = new ScreenRecorder();
