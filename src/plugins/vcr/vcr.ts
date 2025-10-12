import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { t7e } from '@app/locales/keys';
import fastForwardPng from '@public/img/icons/fast-forward.png';
import pausePng from '@public/img/icons/pause.png';
import playPng from '@public/img/icons/play.png';
import resumePng from '@public/img/icons/resume.png';
import rewindPng from '@public/img/icons/rewind.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
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

  addHtml() {
    super.addHtml();
    keepTrackApi.on(
      EventBusEvent.uiManagerInit,
      () => {
        const topLeftMenuElement = getEl(TopMenu.TOP_LEFT_ID);

        if (topLeftMenuElement) {
          topLeftMenuElement.innerHTML +=
            html`
            <div id="vcr-container" class="vcr-container">
              <div id="vcr-rewind-btn" class="vcr-btn top-menu-icons" title="Rewind">
                <img class="top-menu-icons__blue-img" src="${rewindPng}" alt="Rewind">
              </div>
              <div id="vcr-play-pause-btn" class="vcr-btn top-menu-icons bmenu-item-selected" title="Pause">
                <img class="top-menu-icons__blue-img" src="${pausePng}" alt="Pause">
              </div>
              <div id="vcr-fast-forward-btn" class="vcr-btn top-menu-icons" title="Fast Forward">
                <img class="top-menu-icons__blue-img" src="${fastForwardPng}" alt="Fast Forward">
              </div>
            </div>
          `;
        }
      },
    );
  }

  addJs() {
    super.addJs();

    keepTrackApi.on(EventBusEvent.uiManagerInit, () => {
      this.rewindBtn = document.getElementById('vcr-rewind-btn');
      this.playPauseBtn = document.getElementById('vcr-play-pause-btn');
      this.fastForwardBtn = document.getElementById('vcr-fast-forward-btn');

      this.rewindBtn?.addEventListener('click', this.handleRewind.bind(this));
      this.playPauseBtn?.addEventListener('click', this.handlePlayPause.bind(this));
      this.fastForwardBtn?.addEventListener('click', this.handleFastForward.bind(this));
    });
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

    if (timeManagerInstance.propRate === 1) {
      this.isPlaying = false;
      this.playPauseBtn.innerHTML = html`<img class="top-menu-icons__blue-img" src="${playPng}" alt="Play">`;
      timeManagerInstance.changePropRate(0);
    } else {
      this.isPlaying = true;
      this.playPauseBtn.innerHTML = html`<img class="top-menu-icons__blue-img" src="${pausePng}" alt="Pause">`;
      timeManagerInstance.changePropRate(1);
    }

    this.playPauseBtn?.classList.add('bmenu-item-selected');

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

    if (timeManagerInstance.propRate === 0) {
      this.isPlaying = false;
      this.playPauseBtn!.innerHTML = html`<img class="top-menu-icons__blue-img" src="${pausePng}" alt="Pause">`;
      this.playPauseBtn?.classList.remove('bmenu-item-selected');
    } else if (timeManagerInstance.propRate === 1) {
      this.isPlaying = true;
      this.playPauseBtn!.innerHTML = html`<img class="top-menu-icons__blue-img" src="${playPng}" alt="Play">`;
      this.playPauseBtn?.classList.add('bmenu-item-selected');
    } else {
      this.isPlaying = false;
      this.playPauseBtn!.innerHTML = html`<img class="top-menu-icons__blue-img" src="${resumePng}" alt="Pause">`;
      this.playPauseBtn?.classList.remove('bmenu-item-selected');
    }
  }
}
