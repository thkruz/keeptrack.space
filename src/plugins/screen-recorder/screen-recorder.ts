import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { IBottomIconConfig, ICommandPaletteCommand } from '@app/engine/plugins/core/plugin-capabilities';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';
import videocamPng from '@public/img/icons/videocam.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { RecordingNotice, RecordingState, StreamManager } from './stream-manager';
import './screen-recorder.css';

export class ScreenRecorder extends KeepTrackPlugin {
  readonly id = 'ScreenRecorder';
  dependencies_ = [];
  static readonly FILE_NAME = 'keeptrack.webm';
  /** A one-shot toggle: its Tools row already shows the recording state, so a Recent copy is a duplicate. */
  override isExcludedFromDrawerRecent = true;

  // Bridge to onBottomIconClick until base class wires up component callbacks
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  private isCompatibilityIssue_ = false;
  private streamManagerInstance_: StreamManager;
  private statusElement_: HTMLElement | null = null;
  private durationTimer_: ReturnType<typeof setInterval> | null = null;
  private startedAt_ = 0;

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'screen-recorder-bottom-icon',
      label: t7e('plugins.ScreenRecorder.bottomIconLabel'),
      image: videocamPng,
      menuMode: [MenuMode.TOOLS, MenuMode.ALL],
    };
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'ScreenRecorder.toggle',
        label: t7e('ScreenRecorder.toggleCommand'),
        category: 'Export',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  onBottomIconClick(): void {
    if (this.isCompatibilityIssue_) {
      errorManagerInstance.warn(t7e('ScreenRecorder.recordingUnavailable'));
      this.shakeBottomIcon();

      return;
    }

    if (!this.streamManagerInstance_) {
      return;
    }
    if (this.streamManagerInstance_.state !== 'idle') {
      this.streamManagerInstance_.stop();
    } else {
      try {
        this.streamManagerInstance_.start();
      } catch {
        errorManagerInstance.warn(t7e('ScreenRecorder.compatibilityError'));
        this.setBottomIconToUnselected();
        this.shakeBottomIcon();
      }
    }
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerOnReady, () => {
      if (!window.isSecureContext && !settingsManager.offlineMode) {
        this.isCompatibilityIssue_ = true;
        this.setBottomIconToDisabled();

        return;
      }

      try {
        this.streamManagerInstance_ = new StreamManager(
          settingsManager.videoBitsPerSecond,
          this.onStop_.bind(this),
          this.onMinorError_.bind(this),
          this.onError_.bind(this),
          this.onStateChange_.bind(this),
          this.onNotice_.bind(this)
        );
      } catch (e) {
        errorManagerInstance.debug(`ScreenRecorder: ${String(e)}`);
        errorManagerInstance.warn(t7e('ScreenRecorder.compatibilityError'));
        this.isCompatibilityIssue_ = true;
        this.setBottomIconToDisabled();
      }
    });
  }

  getRecorderObject(): StreamManager {
    return this.streamManagerInstance_;
  }

  private onError_(): void {
    this.setBottomIconToDisabled();
    this.isIconDisabled = true;
    this.shakeBottomIcon();
    this.isCompatibilityIssue_ = true;
  }

  private onMinorError_(): void {
    this.setBottomIconToUnselected();
  }

  private onStop_(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/gu, '-');

    if (this.streamManagerInstance_.save(`keeptrack-${timestamp}.webm`)) {
      ServiceLocator.getUiManager()?.toast(t7e('ScreenRecorder.saved'), ToastMsgType.normal);
    }
    this.setBottomIconToUnselected();
  }

  /** Localized feedback for every way a recording can end without a saved file. */
  private onNotice_(notice: RecordingNotice): void {
    const messages: Record<RecordingNotice, { key: Parameters<typeof t7e>[0]; type: ToastMsgType }> = {
      cancelled: { key: 'ScreenRecorder.cancelled', type: ToastMsgType.standby },
      tooShort: { key: 'ScreenRecorder.tooShort', type: ToastMsgType.caution },
      notReadable: { key: 'ScreenRecorder.notReadable', type: ToastMsgType.caution },
      failed: { key: 'ScreenRecorder.failed', type: ToastMsgType.caution },
    };
    const { key, type } = messages[notice];

    ServiceLocator.getUiManager()?.toast(t7e(key), type);
  }

  private onStateChange_(state: RecordingState): void {
    if (this.durationTimer_) {
      clearInterval(this.durationTimer_);
      this.durationTimer_ = null;
    }
    if (state === 'recording') {
      this.setBottomIconToSelected();
      this.startedAt_ = Date.now();
      this.durationTimer_ = setInterval(() => this.updateStatus_(state), 1000);
    } else {
      this.setBottomIconToUnselected();
    }
    document.getElementById(this.bottomIconElementName)?.setAttribute('data-recording-state', state);
    this.updateStatus_(state);
  }

  private updateStatus_(state: RecordingState): void {
    if (!this.statusElement_?.isConnected) {
      this.statusElement_ = document.getElementById('screen-recorder-status') ?? document.createElement('div');
      this.statusElement_.id = 'screen-recorder-status';
      this.statusElement_.setAttribute('role', 'status');
      this.statusElement_.setAttribute('aria-live', 'polite');
      document.getElementById('keeptrack-root')?.appendChild(this.statusElement_);
    }
    this.statusElement_.hidden = state === 'idle';
    if (state === 'idle') {
      this.statusElement_.textContent = '';
      this.statusElement_.dataset.state = state;

      return;
    }
    const elapsed = Math.floor((Date.now() - this.startedAt_) / 1000);
    const duration = `${Math.floor(elapsed / 60)
      .toString()
      .padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`;
    const label = t7e(`ScreenRecorder.${state}` as Parameters<typeof t7e>[0]);

    if (this.statusElement_.dataset.state !== state) {
      this.statusElement_.dataset.state = state;
      this.statusElement_.textContent = label;
      if (state === 'recording') {
        const timer = document.createElement('span');

        timer.setAttribute('role', 'timer');
        timer.setAttribute('aria-live', 'off');
        this.statusElement_.append(timer);
      }
    }
    const timer = this.statusElement_.querySelector('[role="timer"]');

    if (timer) {
      timer.textContent = ` ${duration}`;
    }
  }
}
