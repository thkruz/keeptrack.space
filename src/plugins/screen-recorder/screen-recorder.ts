import { MenuMode } from '@app/engine/core/interfaces';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import videocamPng from '@public/img/icons/videocam.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { StreamManager } from './stream-manager';
import { EventBus } from '@app/engine/events/event-bus';

export class ScreenRecorder extends KeepTrackPlugin {
  readonly id = 'ScreenRecorder';
  dependencies_ = [];
  static readonly FILE_NAME = 'keeptrack.webm';

  bottomIconCallback = () => {
    if (this.isCompatibilityIssue_) {
      errorManagerInstance.warn('Recording unavailable due to compatibility issues!');
      this.shakeBottomIcon();

      return;
    }

    if (this.streamManagerInstance_.isVideoRecording) {
      this.streamManagerInstance_.stop();
    } else {
      try {
        this.setBottomIconToSelected();
        this.streamManagerInstance_.start();
        this.streamManagerInstance_.isVideoRecording = true;
      } catch {
        errorManagerInstance.warn('Compatibility Error with Recording!');
        this.streamManagerInstance_.isVideoRecording = false;
        this.setBottomIconToDisabled();
        this.shakeBottomIcon();
        this.isCompatibilityIssue_ = true;
      }
    }
  };

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = videocamPng;
  private isCompatibilityIssue_ = false;
  private streamManagerInstance_: StreamManager;

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerOnReady,
      () => {
        try {
          this.streamManagerInstance_ = new StreamManager(settingsManager.videoBitsPerSecond, this.onStop_.bind(this), this.onMinorError_.bind(this), this.onError_.bind(this));
        } catch (e) {
          errorManagerInstance.warn(`Compatibility Error with Recording: ${e}`);
        }
      },
    );
  }

  getRecorderObject(): StreamManager {
    return this.streamManagerInstance_;
  }

  private onError_(): void {
    this.setBottomIconToDisabled();
    this.isIconDisabled = true;
    this.streamManagerInstance_.isVideoRecording = false;
    this.shakeBottomIcon();
    this.isCompatibilityIssue_ = true;
  }

  private onMinorError_(): void {
    this.setBottomIconToUnselected();
  }

  private onStop_(): void {
    this.streamManagerInstance_.save(ScreenRecorder.FILE_NAME);
    this.setBottomIconToUnselected();
  }
}

