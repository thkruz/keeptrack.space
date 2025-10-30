import { ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
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

  forwardRewindSpeed = 60; // seconds per second when rewinding or fast-forwarding

  isRewinding: boolean = false;
  isPlaying: boolean = true;
  isFastForwarding: boolean = false;

  rewindBtn: HTMLElement | null = null;
  playPauseBtn: HTMLElement | null = null;
  fastForwardBtn: HTMLElement | null = null;
  scenario: ScenarioData | null = null;

  addHtml() {
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

  addJs() {
    super.addJs();

    this.scenario = PluginRegistry.getPlugin(ScenarioManagementPlugin)?.scenario ?? null;

    EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
      this.rewindBtn = document.getElementById('vcr-rewind-btn');
      this.playPauseBtn = document.getElementById('vcr-play-pause-btn');
      this.fastForwardBtn = document.getElementById('vcr-fast-forward-btn');

      this.rewindBtn?.addEventListener('click', this.handleRewind.bind(this));
      this.playPauseBtn?.addEventListener('click', this.handlePlayPause.bind(this));
      this.fastForwardBtn?.addEventListener('click', this.handleFastForward.bind(this));
    });

    EventBus.getInstance().on(EventBusEvent.propRateChanged, this.onPropRateChanged_.bind(this));
    EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, this.onPropRateChanged_.bind(this));
    EventBus.getInstance().on(EventBusEvent.staticOffsetChange, this.onStaticOffsetChanged_.bind(this));
  }

  verifyTimeControl(): boolean {
    const timeManagerInstance = ServiceLocator.getTimeManager();

    if (!timeManagerInstance.isTimeChangingEnabled) {
      ServiceLocator.getUiManager().toast(t7e('errorMsgs.catalogNotFullyInitialized'), ToastMsgType.caution, true);

      return false;
    }

    return true;
  }

  handlePlayPause() {
    if (!this.verifyTimeControl()) {
      return;
    }

    if (!this.playPauseBtn) {
      return;
    }
    const timeManagerInstance = ServiceLocator.getTimeManager();

    if (ServiceLocator.getTimeManager().simulationTimeObj.getTime() === this.scenario!.endTime?.getTime()) {
      ServiceLocator.getUiManager().toast('Cannot Play: Simulation time is at the end of the scenario.', ToastMsgType.caution, true);

      return;
    }

    if (timeManagerInstance.propRate === 1) {
      timeManagerInstance.changePropRate(0);
    } else {
      timeManagerInstance.changePropRate(1);
    }

    this.updatePausePlayBtn();
    this.stopRewind();
    this.stopFastForward();
  }

  handleRewind() {
    if (!this.verifyTimeControl()) {
      return;
    }

    const timeManagerInstance = ServiceLocator.getTimeManager();

    if (this.isRewinding) {
      this.stopRewind();
      timeManagerInstance.changePropRate(1);
      this.rewindBtn?.classList.remove('bmenu-item-selected');
    } else {
      this.isRewinding = true;
      timeManagerInstance.changePropRate(-this.forwardRewindSpeed);
      this.rewindBtn?.classList.add('bmenu-item-selected');
    }

    this.stopFastForward();
    this.updatePausePlayBtn();
  }

  handleFastForward() {
    if (!this.verifyTimeControl()) {
      return;
    }

    const timeManagerInstance = ServiceLocator.getTimeManager();

    if (this.isFastForwarding) {
      this.stopFastForward();
      timeManagerInstance.changePropRate(1);
      this.fastForwardBtn?.classList.remove('bmenu-item-selected');
    } else {
      this.isFastForwarding = true;
      timeManagerInstance.changePropRate(this.forwardRewindSpeed);
      this.fastForwardBtn?.classList.add('bmenu-item-selected');
    }

    this.stopRewind();
    this.updatePausePlayBtn();
  }

  private stopRewind() {
    if (this.isRewinding) {
      this.isRewinding = false;
      this.rewindBtn?.classList.remove('bmenu-item-selected');
    }
  }

  private stopFastForward() {
    if (this.isFastForwarding) {
      this.isFastForwarding = false;
      this.fastForwardBtn?.classList.remove('bmenu-item-selected');
    }
  }

  private updatePausePlayBtn() {
    const timeManagerInstance = ServiceLocator.getTimeManager();

    this.playPauseBtn?.classList.remove('bmenu-item-help');

    if (timeManagerInstance.propRate === 0) {
      this.isPlaying = false;
      this.playPauseBtn!.innerHTML = html`<img class="top-menu-icons__blue-img" src="${playPng}">`;
      if (timeManagerInstance.simulationTimeObj.getTime() === this.scenario!.endTime?.getTime()) {
        // Change tooltip to indicate end of scenario
        this.playPauseBtn?.classList.add('bmenu-item-help');
        this.playPauseBtn!.innerHTML = html`<img class="top-menu-icons__blue-img" src="${playPng}">`;
        this.playPauseBtn!.setAttribute('kt-tooltip', 'Scenario Ended');
      } else {
        this.playPauseBtn?.classList.add('bmenu-item-selected');
        this.playPauseBtn!.setAttribute('kt-tooltip', 'Click to Play');
      }
    } else if (timeManagerInstance.propRate === 1) {
      this.isPlaying = true;
      this.playPauseBtn!.innerHTML = html`<img class="top-menu-icons__blue-img" src="${pausePng}">`;
      this.playPauseBtn!.setAttribute('kt-tooltip', 'Click to Pause');
      this.playPauseBtn?.classList.add('bmenu-item-selected');
    } else {
      this.isPlaying = false;
      this.playPauseBtn!.innerHTML = html`<img class="top-menu-icons__blue-img" src="${resumePng}">`;
      this.playPauseBtn!.setAttribute('kt-tooltip', 'Click to Resume');
      this.playPauseBtn?.classList.remove('bmenu-item-selected');
    }
  }

  private onStaticOffsetChanged_(): void {
    if ((this.scenario?.endTime?.getTime() ?? -Infinity) >= ServiceLocator.getTimeManager().simulationTimeObj.getTime()) {
      this.updatePausePlayBtn();
    }
  }

  private onPropRateChanged_(propRate?: number): void {
    const timeManagerInstance = ServiceLocator.getTimeManager();

    propRate ??= timeManagerInstance.propRate;

    if (propRate === 0 || propRate === 1) {
      this.isFastForwarding = false;
      this.isRewinding = false;
      this.fastForwardBtn?.classList.remove('bmenu-item-selected');
      this.rewindBtn?.classList.remove('bmenu-item-selected');
      this.updatePausePlayBtn();
    } else if (propRate > 1) {
      this.isFastForwarding = true;
      this.isRewinding = false;
      this.fastForwardBtn?.classList.add('bmenu-item-selected');
      this.rewindBtn?.classList.remove('bmenu-item-selected');
      this.updatePausePlayBtn();
    } else if (propRate <= -1) {
      this.isRewinding = true;
      this.isFastForwarding = false;
      this.rewindBtn?.classList.add('bmenu-item-selected');
      this.fastForwardBtn?.classList.remove('bmenu-item-selected');
      this.updatePausePlayBtn();
    }
  }
}
