import { MenuMode } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { IBottomIconConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';
import videocamPng from '@public/img/icons/videocam.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { StreamManager } from './stream-manager';

export class ScreenRecorder extends KeepTrackPlugin {
  readonly id = 'ScreenRecorder';
  dependencies_ = [];
  static readonly FILE_NAME = 'keeptrack.webm';

  // Bridge to onBottomIconClick until base class wires up component callbacks
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  private isCompatibilityIssue_ = false;
  private streamManagerInstance_: StreamManager;

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'screen-recorder-bottom-icon',
      label: 'Record',
      image: videocamPng,
      menuMode: [MenuMode.ADVANCED, MenuMode.ALL],
    };
  }

  onBottomIconClick(): void {
    if (this.isCompatibilityIssue_) {
      errorManagerInstance.warn(t7e('ScreenRecorder.recordingUnavailable'));
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
        errorManagerInstance.warn(t7e('ScreenRecorder.compatibilityError'));
        this.streamManagerInstance_.isVideoRecording = false;
        this.setBottomIconToDisabled();
        this.shakeBottomIcon();
        this.isCompatibilityIssue_ = true;
      }
    }
  }

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

