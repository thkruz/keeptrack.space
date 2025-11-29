import { ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import fastForwardPng from '@public/img/icons/fast-forward.png';
import pausePng from '@public/img/icons/pause.png';
import playPng from '@public/img/icons/play.png';
import resumePng from '@public/img/icons/resume.png';
import rewindPng from '@public/img/icons/rewind.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { ScenarioData, ScenarioManagementPlugin } from '../scenario-management/scenario-management';
import { TopMenu } from '../top-menu/top-menu';

export class VcrPlugin extends KeepTrackPlugin {
  readonly id = 'VcrPlugin';
  dependencies_ = [TopMenu.name];

  private static readonly DEFAULT_FORWARD_REWIND_SPEED_ = 60;

  forwardRewindSpeed = VcrPlugin.DEFAULT_FORWARD_REWIND_SPEED_;

  isRewinding = false;
  isPlaying = true;
  isFastForwarding = false;

  private rewindBtn_: HTMLElement | null = null;
  private playPauseBtn_: HTMLElement | null = null;
  private fastForwardBtn_: HTMLElement | null = null;
  private scenario_: ScenarioData | null = null;

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: ' ',
        callback: () => this.handlePlayPause(),
      },
      {
        key: 'ArrowLeft',
        callback: () => this.handleRewind(),
      },
      {
        key: 'ArrowRight',
        callback: () => this.handleFastForward(),
      },
    ];
  }

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerInit,
      () => {
        const topLeftMenuElement = getEl(TopMenu.TOP_LEFT_ID);

        if (topLeftMenuElement) {
          topLeftMenuElement.innerHTML +=
            html`
            <div id="vcr-container" class="vcr-container">
              <div id="vcr-rewind-btn" class="vcr-btn top-menu-icons" kt-tooltip="Click to Rewind">
                <img class="top-menu-icons__blue-img" src="${rewindPng}">
              </div>
              <div id="vcr-play-pause-btn" class="vcr-btn top-menu-icons bmenu-item-selected" kt-tooltip="Click to Pause">
                <img class="top-menu-icons__blue-img" src="${pausePng}">
              </div>
              <div id="vcr-fast-forward-btn" class="vcr-btn top-menu-icons" kt-tooltip="Click to Fast Forward">
                <img class="top-menu-icons__blue-img" src="${fastForwardPng}">
              </div>
            </div>
          `;
        }
      },
    );
  }

  addJs(): void {
    super.addJs();

    this.scenario_ = PluginRegistry.getPlugin(ScenarioManagementPlugin)?.scenario ?? null;
    this.forwardRewindSpeed =
      (settingsManager.plugins?.[this.id] as { forwardRewindSpeed?: number })?.forwardRewindSpeed ?? VcrPlugin.DEFAULT_FORWARD_REWIND_SPEED_;

    EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
      this.rewindBtn_ = document.getElementById('vcr-rewind-btn');
      this.playPauseBtn_ = document.getElementById('vcr-play-pause-btn');
      this.fastForwardBtn_ = document.getElementById('vcr-fast-forward-btn');

      this.rewindBtn_?.addEventListener('click', this.handleRewind.bind(this));
      this.playPauseBtn_?.addEventListener('click', this.handlePlayPause.bind(this));
      this.fastForwardBtn_?.addEventListener('click', this.handleFastForward.bind(this));
    });

    EventBus.getInstance().on(EventBusEvent.propRateChanged, this.onPropRateChanged_.bind(this));
    EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, this.onPropRateChanged_.bind(this));
    EventBus.getInstance().on(EventBusEvent.staticOffsetChange, this.onStaticOffsetChanged_.bind(this));
  }

  verifyTimeControl(): boolean {
    const timeManager = ServiceLocator.getTimeManager();

    if (!timeManager.isTimeChangingEnabled) {
      ServiceLocator.getUiManager().toast(t7e('errorMsgs.catalogNotFullyInitialized'), ToastMsgType.caution, true);

      return false;
    }

    return true;
  }

  handlePlayPause(): void {
    if (!this.verifyTimeControl() || !this.playPauseBtn_) {
      return;
    }

    const timeManager = ServiceLocator.getTimeManager();

    if (this.isAtScenarioEnd_(timeManager)) {
      ServiceLocator.getUiManager().toast(t7e('VcrPlugin.endOfScenario'), ToastMsgType.caution, true);

      return;
    }

    if (timeManager.propRate === 1) {
      timeManager.changePropRate(0);
    } else {
      timeManager.changePropRate(1);
    }

    this.updatePausePlayBtn_();
    this.stopRewind_();
    this.stopFastForward_();
  }

  handleRewind(): void {
    if (!this.verifyTimeControl()) {
      return;
    }

    const timeManager = ServiceLocator.getTimeManager();

    if (this.isRewinding) {
      this.stopRewind_();
      timeManager.changePropRate(1);
      this.rewindBtn_?.classList.remove('bmenu-item-selected');
    } else {
      this.isRewinding = true;
      timeManager.changePropRate(-this.forwardRewindSpeed);
      this.rewindBtn_?.classList.add('bmenu-item-selected');
    }

    this.stopFastForward_();
    this.updatePausePlayBtn_();
  }

  handleFastForward(): void {
    if (!this.verifyTimeControl()) {
      return;
    }

    const timeManager = ServiceLocator.getTimeManager();

    if (this.isFastForwarding) {
      this.stopFastForward_();
      timeManager.changePropRate(1);
      this.fastForwardBtn_?.classList.remove('bmenu-item-selected');
    } else {
      this.isFastForwarding = true;
      timeManager.changePropRate(this.forwardRewindSpeed);
      this.fastForwardBtn_?.classList.add('bmenu-item-selected');
    }

    this.stopRewind_();
    this.updatePausePlayBtn_();
  }

  private isAtScenarioEnd_(timeManager: ReturnType<typeof ServiceLocator.getTimeManager>): boolean {
    const scenarioEndTime = this.scenario_?.endTime?.getTime();

    if (typeof scenarioEndTime !== 'number') {
      return false;
    }

    return timeManager.simulationTimeObj.getTime() === scenarioEndTime;
  }

  private stopRewind_(): void {
    if (this.isRewinding) {
      this.isRewinding = false;
      this.rewindBtn_?.classList.remove('bmenu-item-selected');
    }
  }

  private stopFastForward_(): void {
    if (this.isFastForwarding) {
      this.isFastForwarding = false;
      this.fastForwardBtn_?.classList.remove('bmenu-item-selected');
    }
  }

  private updatePausePlayBtn_(): void {
    if (!this.playPauseBtn_) {
      return;
    }

    const timeManager = ServiceLocator.getTimeManager();

    this.playPauseBtn_.classList.remove('bmenu-item-help');

    if (timeManager.propRate === 0) {
      this.updateButtonForPaused_(timeManager);
    } else if (timeManager.propRate === 1) {
      this.updateButtonForPlaying_();
    } else {
      this.updateButtonForFastMode_();
    }
  }

  private updateButtonForPaused_(timeManager: ReturnType<typeof ServiceLocator.getTimeManager>): void {
    this.isPlaying = false;
    this.playPauseBtn_!.innerHTML = html`<img class="top-menu-icons__blue-img" src="${playPng}">`;

    if (this.isAtScenarioEnd_(timeManager)) {
      this.playPauseBtn_!.classList.add('bmenu-item-help');
      this.playPauseBtn_!.setAttribute('kt-tooltip', t7e('VcrPlugin.scenarioEnded'));
    } else {
      this.playPauseBtn_!.classList.add('bmenu-item-selected');
      this.playPauseBtn_!.setAttribute('kt-tooltip', t7e('VcrPlugin.clickToPlay'));
    }
  }

  private updateButtonForPlaying_(): void {
    this.isPlaying = true;
    this.playPauseBtn_!.innerHTML = html`<img class="top-menu-icons__blue-img" src="${pausePng}">`;
    this.playPauseBtn_!.setAttribute('kt-tooltip', t7e('VcrPlugin.clickToPause'));
    this.playPauseBtn_!.classList.add('bmenu-item-selected');
  }

  private updateButtonForFastMode_(): void {
    this.isPlaying = false;
    this.playPauseBtn_!.innerHTML = html`<img class="top-menu-icons__blue-img" src="${resumePng}">`;
    this.playPauseBtn_!.setAttribute('kt-tooltip', t7e('VcrPlugin.clickToResume'));
    this.playPauseBtn_!.classList.remove('bmenu-item-selected');
  }

  private onStaticOffsetChanged_(): void {
    const timeManager = ServiceLocator.getTimeManager();
    const scenarioEndTime = this.scenario_?.endTime?.getTime() ?? -Infinity;

    if (scenarioEndTime >= timeManager.simulationTimeObj.getTime()) {
      this.updatePausePlayBtn_();
    }
  }

  private onPropRateChanged_(propRate?: number): void {
    const timeManager = ServiceLocator.getTimeManager();

    propRate ??= timeManager.propRate;

    if (propRate === 0 || propRate === 1) {
      this.isFastForwarding = false;
      this.isRewinding = false;
      this.fastForwardBtn_?.classList.remove('bmenu-item-selected');
      this.rewindBtn_?.classList.remove('bmenu-item-selected');
      this.updatePausePlayBtn_();
    } else if (propRate > 1) {
      this.isFastForwarding = true;
      this.isRewinding = false;
      this.fastForwardBtn_?.classList.add('bmenu-item-selected');
      this.rewindBtn_?.classList.remove('bmenu-item-selected');
      this.updatePausePlayBtn_();
    } else if (propRate <= -1) {
      this.isRewinding = true;
      this.isFastForwarding = false;
      this.rewindBtn_?.classList.add('bmenu-item-selected');
      this.fastForwardBtn_?.classList.remove('bmenu-item-selected');
      this.updatePausePlayBtn_();
    }
  }
}
