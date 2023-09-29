import recorderPng from '@app/img/icons/video.png';
import { keepTrackApi, KeepTrackApiMethods } from '@app/js/keepTrackApi';
import { errorManagerInstance } from '@app/js/singletons/errorManager';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { StreamManager } from './stream-manager';

export class ScreenRecorder extends KeepTrackPlugin {
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

  constructor() {
    const PLUGIN_NAME = 'Screen Recorder';
    super(PLUGIN_NAME);
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      method: KeepTrackApiMethods.uiManagerOnReady,
      cbName: this.PLUGIN_NAME,
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
