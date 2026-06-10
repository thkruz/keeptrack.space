import { SatMath } from '@app/app/analysis/sat-math';
import { SensorMath } from '@app/app/sensors/sensor-math';
import { SoundNames } from '@app/engine/audio/sounds';
import { GetSatType, MenuMode, SatPassTimes, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ICommandPaletteCommand } from '@app/engine/plugins/core';
import { lineManagerInstance } from '@app/engine/rendering/line-manager';
import { LineColors } from '@app/engine/rendering/line-manager/line';
import { dateFormat } from '@app/engine/utils/dateFormat';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { MILLISECONDS_PER_DAY, Satellite } from '@ootk/src/main';
import pictureInPicturePng from '@public/img/icons/picture-in-picture.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { WatchlistPlugin } from './watchlist';
import './watchlist-overlay.css';

/**
 * Tier CSS class names returned by classifyTier_.
 * null means the entry should be filtered out entirely.
 */
type TierClass = 'wl-tier-active' | 'wl-tier-imminent' | 'wl-tier-upcoming' | 'wl-tier-aware' | 'wl-tier-background' | 'wl-tier-departed' | null;

/** Order index used for grouping headers. Lower = higher on screen. */
const TIER_ORDER: Record<string, number> = {
  'wl-tier-departed': 0,
  'wl-tier-active': 1,
  'wl-tier-imminent': 2,
  'wl-tier-upcoming': 3,
  'wl-tier-aware': 4,
  'wl-tier-background': 5,
};

/** Max departed entries visible at once; extras rotate every DEPARTED_ROTATE_MS_ */
const DEPARTED_MAX_VISIBLE_ = 5;
const DEPARTED_ROTATE_MS_ = 10000;

const TIER_LABELS: Record<string, string> = {
  'wl-tier-active': 'IN VIEW',
  'wl-tier-imminent': 'NEXT UP',
  'wl-tier-upcoming': 'UPCOMING',
  'wl-tier-aware': 'LATER',
  'wl-tier-background': 'BACKGROUND',
  'wl-tier-departed': 'DEPARTED',
};

export class WatchlistOverlay extends KeepTrackPlugin {
  readonly id = 'WatchlistOverlay';
  dependencies_ = [WatchlistPlugin.name];
  private watchlistPlugin_: WatchlistPlugin;

  constructor() {
    super();
    this.watchlistPlugin_ = PluginRegistry.getPlugin(WatchlistPlugin)!;
  }

  menuMode: MenuMode[] = [MenuMode.CATALOG, MenuMode.ALL];

  /** ~72 minutes - just enough buffer beyond the 60-min display cap */
  private readonly OVERLAY_CALC_LENGTH_IN_DAYS_ = 0.05;

  // Tier thresholds in milliseconds
  private static readonly IMMINENT_MS_ = 5 * 60 * 1000;
  private static readonly UPCOMING_MS_ = 15 * 60 * 1000;
  private static readonly AWARE_MS_ = 30 * 60 * 1000;
  private static readonly DISPLAY_CAP_MS_ = 60 * 60 * 1000;
  private static readonly DEPARTED_MS_ = 5 * 60 * 1000;

  /** Auto-recalculation interval (5 minutes real-time) */
  private static readonly RECALC_INTERVAL_MS_ = 5 * 60 * 1000;
  /** Cooldown to prevent rapid-fire recalcs when list empties during time warp */
  private static readonly RECALC_COOLDOWN_MS_ = 30 * 1000;

  private lastSensorId_: number;
  private lastSimTimeWhenCalc_: number;
  private nextPassArray_: SatPassTimes[] = [];
  private recalcTimer_: ReturnType<typeof setInterval> | null = null;
  private lastRecalcTime_ = 0;

  /** Cached FOV exit times keyed by satellite ID. Cleared on each recalc. */
  private readonly exitTimeCache_ = new Map<number, Date | null>();

  /** Departed rotation state - avoids index jumps when departed count changes */
  private departedRotationOffset_ = 0;
  private lastDepartedRotationTime_ = 0;

  /**
   * Search forward from current sim time to find when a satellite leaves the sensor FOV.
   * Returns null if exit not found within 30 minutes.
   */
  private computeExitTime_(sat: Satellite, propTime: number): Date | null {
    if (this.exitTimeCache_.has(sat.id)) {
      return this.exitTimeCache_.get(sat.id) ?? null;
    }

    const sensor = ServiceLocator.getSensorManager().currentSensors[0];
    const stepMs = 10000; // 10-second steps
    const maxSearchMs = 30 * 60 * 1000; // 30 minutes

    for (let offset = 0; offset <= maxSearchMs; offset += stepMs) {
      const checkTime = new Date(propTime + offset);
      const aer = SatMath.getRae(checkTime, sat.satrec, sensor, true);

      if (!SatMath.checkIsInView(sensor, aer)) {
        this.exitTimeCache_.set(sat.id, checkTime);

        return checkTime;
      }
    }

    this.exitTimeCache_.set(sat.id, null);

    return null;
  }

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'WatchlistOverlay.open',
        label: 'Open Watchlist Overlay',
        category: 'Watchlist',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  bottomIconElementName: string = 'info-overlay-icon';
  bottomIconImg = pictureInPicturePng;

  lastOverlayUpdateTime = 0;

  isRequireSensorSelected = true;

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
      const wrapper = document.createElement('div');

      wrapper.id = 'info-overlay-menu';
      wrapper.classList.add('start-hidden');
      wrapper.innerHTML = '<div id="info-overlay-content"></div>';
      getEl('ui-wrapper')?.appendChild(wrapper);
    });
  }

  onBottomIconClick(): void {
    if (this.isMenuButtonActive) {
      if (!this.verifySensorSelected()) {
        return;
      }

      const watchlist = PluginRegistry.getPlugin(WatchlistPlugin);

      if (!watchlist || watchlist.watchlistList.length === 0) {
        ServiceLocator.getUiManager().toast('Add Satellites to List!', ToastMsgType.caution);

        return;
      }

      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
      this.setBottomIconToSelected();
      getEl('info-overlay-menu')?.classList.remove('start-hidden');
      this.openOverlayMenu_();
      this.startRecalcTimer_();
    } else {
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
      this.setBottomIconToUnselected();
      getEl('info-overlay-menu')?.classList.add('start-hidden');
      this.stopRecalcTimer_();
    }
  }

  static uiManagerFinal() {
    getEl('info-overlay-content')!.addEventListener('click', (evt: Event) => {
      const target = evt.target as HTMLElement;
      const entry = target.closest('.wl-entry') as HTMLElement | null;

      if (!entry) {
        return;
      }

      const satId = Number.parseInt(entry.dataset.satId ?? '-1');

      if (satId >= 0) {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(satId);
      }
    });
  }

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(EventBusEvent.updateLoop, this.updateLoop.bind(this));
    EventBus.getInstance().on(EventBusEvent.onWatchlistUpdated, this.onWatchlistUpdated_.bind(this));
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, WatchlistOverlay.uiManagerFinal.bind(this));

    window.addEventListener('keydown', (evt: KeyboardEvent) => {
      if (evt.key === 'F2' && evt.shiftKey) {
        const overlay = getEl('info-overlay-menu');

        if (overlay) {
          overlay.classList.toggle('ui-hidden');
        }
      }
    }, true);
  }

  updateLoop() {
    this.updateNextPassOverlay_();

    if (!ServiceLocator.getDotsManager().inViewData) {
      return;
    }

    if (this.watchlistPlugin_.watchlistList.length <= 0) {
      return;
    }
    this.updateFovLines_();
  }

  private updateFovLinesMulti_(sat: Satellite) {
    const idx = this.watchlistPlugin_.watchlistList.findIndex((el) => el.id === sat.id);

    ServiceLocator.getOrbitManager().removeInViewOrbit(this.watchlistPlugin_.watchlistList[idx].id);
    for (const sensor of ServiceLocator.getSensorManager().currentSensors) {
      lineManagerInstance.createSensorToSatFovOnly(sensor, sat, LineColors.GREEN);
    }
  }

  private updateFovLinesSingle_(sat: Satellite) {
    const inView = ServiceLocator.getDotsManager().inViewData[sat.id];
    const uiManagerInstance = ServiceLocator.getUiManager();
    const idx = this.watchlistPlugin_.watchlistList.findIndex((el) => el.id === sat.id);
    const inViewListVal = this.watchlistPlugin_.watchlistList[idx]?.inView ?? false;

    if (inView === 1 && inViewListVal === false) {
      // Is inview and wasn't previously
      this.watchlistPlugin_.watchlistList[idx].inView = true;
      uiManagerInstance.toast(`Satellite ${sat.sccNum} is In Field of View!`, ToastMsgType.normal);
      lineManagerInstance.createSensorToSatFovOnly(ServiceLocator.getSensorManager().currentSensors[0], sat, LineColors.GREEN);
      ServiceLocator.getOrbitManager().addInViewOrbit(this.watchlistPlugin_.watchlistList[idx].id);
    }
    if (inView === 0 && inViewListVal === true) {
      // Isn't inview and was previously
      this.watchlistPlugin_.watchlistList[idx].inView = false;
      uiManagerInstance.toast(`Satellite ${sat.sccNum} left Field of View!`, ToastMsgType.standby);
      ServiceLocator.getOrbitManager().removeInViewOrbit(this.watchlistPlugin_.watchlistList[idx].id);
    }
  }

  private updateFovLines_() {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    for (const obj of this.watchlistPlugin_.watchlistList) {
      const sat = catalogManagerInstance.getSat(obj.id);

      if (!sat) {
        continue;
      }

      if (sensorManagerInstance.currentSensors.length > 1) {
        this.updateFovLinesMulti_(sat);
      } else {
        this.updateFovLinesSingle_(sat);
      }
    }
  }

  private onWatchlistUpdated_(watchlistList: number[]) {
    if (watchlistList.length === 0) {
      this.setBottomIconToDisabled();
    } else if (this.verifySensorSelected(false)) {
      this.setBottomIconToEnabled();
    }

    // Recalculate if overlay is currently open and watchlist changed
    if (this.isMenuButtonActive) {
      this.openOverlayMenu_();
    }
  }

  private startRecalcTimer_(): void {
    this.stopRecalcTimer_();
    this.recalcTimer_ = setInterval(() => {
      this.openOverlayMenu_();
    }, WatchlistOverlay.RECALC_INTERVAL_MS_);
  }

  private stopRecalcTimer_(): void {
    if (this.recalcTimer_ !== null) {
      clearInterval(this.recalcTimer_);
      this.recalcTimer_ = null;
    }
  }

  private openOverlayMenu_() {
    const sensorManagerInstance = ServiceLocator.getSensorManager();
    const timeManager = ServiceLocator.getTimeManager();

    if (
      this.nextPassArray_.length === 0 ||
      this.lastSimTimeWhenCalc_ > timeManager.simulationTimeObj.getTime() ||
      new Date(this.lastSimTimeWhenCalc_ * 1 + (MILLISECONDS_PER_DAY * this.OVERLAY_CALC_LENGTH_IN_DAYS_) / 2).getTime() < timeManager.simulationTimeObj.getTime() ||
      this.watchlistPlugin_.isWatchlistChanged ||
      this.lastSensorId_ !== sensorManagerInstance.currentSensors[0].id
    ) {
      showLoading(() => {
        const catalogManagerInstance = ServiceLocator.getCatalogManager();

        const satArray: Satellite[] = [];

        for (const obj of this.watchlistPlugin_.watchlistList) {
          const satellite = catalogManagerInstance.getSat(obj.id, GetSatType.EXTRA_ONLY);

          if (!satellite) {
            continue;
          }
          satArray.push(satellite);
        }

        this.nextPassArray_ = SensorMath.nextpassList(satArray, sensorManagerInstance.currentSensors, 1, this.OVERLAY_CALC_LENGTH_IN_DAYS_);
        this.nextPassArray_.sort((a: { time: string | number | Date }, b: { time: string | number | Date }) => new Date(a.time).getTime() - new Date(b.time).getTime());

        this.lastSimTimeWhenCalc_ = timeManager.simulationTimeObj.getTime();
        this.lastSensorId_ = sensorManagerInstance.currentSensors[0].id;

        this.exitTimeCache_.clear();
        this.lastOverlayUpdateTime = 0;
        this.lastRecalcTime_ = Date.now();
        this.updateNextPassOverlay_(true);
        this.watchlistPlugin_.isWatchlistChanged = false;
      });
    } else {
      this.updateNextPassOverlay_();
    }
  }

  /**
   * Classify a pass into a tier based on time delta and in-view status.
   * Returns null if the pass should be filtered out entirely.
   */
  private classifyTier_(deltaMs: number, isSatInView: number | undefined): TierClass {
    // Currently in FOV and pass time is near
    if (isSatInView === 1 && deltaMs < WatchlistOverlay.IMMINENT_MS_) {
      return 'wl-tier-active';
    }

    // Future passes
    if (deltaMs >= 0) {
      if (deltaMs > WatchlistOverlay.DISPLAY_CAP_MS_) {
        return null; // Beyond 60-min display cap
      }
      if (deltaMs < WatchlistOverlay.IMMINENT_MS_) {
        return 'wl-tier-imminent';
      }
      if (deltaMs < WatchlistOverlay.UPCOMING_MS_) {
        return 'wl-tier-upcoming';
      }
      if (deltaMs < WatchlistOverlay.AWARE_MS_) {
        return 'wl-tier-aware';
      }

      return 'wl-tier-background';
    }

    // Past passes
    if (-deltaMs < WatchlistOverlay.DEPARTED_MS_) {
      return 'wl-tier-departed';
    }

    return null; // Too far in the past
  }

  /**
   * Format pass time for display based on urgency tier.
   * - Active: T-M:SS countdown until leaving FOV
   * - Imminent: T-M:SS countdown until entering FOV
   * - Upcoming-Background: HH:MM only
   * - Departed: HH:MM +Xm ago
   */
  private formatPassTime_(passTime: Date, propTime: number, tier: string, exitTime?: Date | null): string {
    const deltaMs = passTime.getTime() - propTime;

    if (tier === 'wl-tier-active' && exitTime) {
      // Countdown until leaving FOV
      const remainMs = Math.max(0, exitTime.getTime() - propTime);
      const mins = Math.floor(remainMs / 60000);
      const secs = Math.floor((remainMs % 60000) / 1000);
      const countdown = `T-${mins}:${String(secs).padStart(2, '0')}`;
      const timeStr = dateFormat(exitTime, 'isoTime', true);

      return `${countdown} ${timeStr}`;
    }

    if (tier === 'wl-tier-active' || tier === 'wl-tier-imminent') {
      const absDelta = Math.abs(deltaMs);
      const mins = Math.floor(absDelta / 60000);
      const secs = Math.floor((absDelta % 60000) / 1000);
      const countdown = deltaMs >= 0
        ? `T-${mins}:${String(secs).padStart(2, '0')}`
        : `T+${mins}:${String(secs).padStart(2, '0')}`;
      const timeStr = dateFormat(passTime, 'isoTime', true);

      return `${countdown} ${timeStr}`;
    }

    if (tier === 'wl-tier-departed') {
      const agoMins = Math.floor(-deltaMs / 60000);
      const timeStr = dateFormat(passTime, 'HH:MM', true);

      return `${timeStr} +${agoMins}m ago`;
    }

    // Upcoming, Aware, Background - HH:MM only
    return dateFormat(passTime, 'HH:MM', true);
  }

  private updateNextPassOverlay_(isForceUpdate = false) {
    const timeManagerInstance = ServiceLocator.getTimeManager();

    if (this.nextPassArray_.length <= 0 && !this.isMenuButtonActive) {
      return;
    }

    const mainCameraInstance = ServiceLocator.getMainCamera();

    if ((Date.now() > this.lastOverlayUpdateTime * 1 + 5000 && !mainCameraInstance.state.isDragging) || isForceUpdate) {
      const propTime = timeManagerInstance.simulationTimeObj.getTime();
      const dotsManager = ServiceLocator.getDotsManager();

      // Bucket entries by tier
      const buckets: Record<string, string[]> = {};

      for (const tier of Object.keys(TIER_ORDER)) {
        buckets[tier] = [];
      }

      let visibleCount = 0;

      for (let s = 0; s < this.nextPassArray_.length; s++) {
        const pass = this.nextPassArray_[s];
        const deltaMs = pass.time.getTime() - propTime;
        const isSatInView = dotsManager.inViewData?.[pass.sat.id];
        const tier = this.classifyTier_(deltaMs, isSatInView);

        if (tier === null) {
          continue;
        }

        const name = pass.sat.sccNum ? pass.sat.sccNum : pass.sat.name;

        // For active satellites, compute when they leave FOV
        let exitTime: Date | null = null;

        if (tier === 'wl-tier-active') {
          try {
            exitTime = this.computeExitTime_(pass.sat, propTime);
          } catch {
            // Bad satrec or sensor - fall back to pass-start countdown
          }
        }
        const timeStr = this.formatPassTime_(pass.time, propTime, tier, exitTime);

        // Build countdown span only for imminent/active tiers
        let countdownHtml = '';
        let clockHtml = timeStr;

        if (tier === 'wl-tier-active' || tier === 'wl-tier-imminent') {
          const parts = timeStr.split(' ');

          countdownHtml = `<span class="wl-countdown">${parts[0]}</span>`;
          clockHtml = parts[1] || '';
        }

        buckets[tier].push(
          `<div class="wl-entry ${tier}" data-sat-id="${pass.sat.id}"><span class="wl-name">${name}</span>${countdownHtml}<span class="wl-time">${clockHtml}</span></div>`,
        );
        visibleCount++;
      }

      // Rotate departed entries: show up to 5, advancing offset every 10 seconds
      const allDeparted = buckets['wl-tier-departed'];
      const departedTotal = allDeparted.length;

      if (departedTotal > DEPARTED_MAX_VISIBLE_) {
        const now = Date.now();

        if (now - this.lastDepartedRotationTime_ >= DEPARTED_ROTATE_MS_) {
          this.departedRotationOffset_++;
          this.lastDepartedRotationTime_ = now;
        }

        // Keep offset in bounds even when count shrinks
        const offset = this.departedRotationOffset_ % departedTotal;
        const visible: string[] = [];

        for (let i = 0; i < DEPARTED_MAX_VISIBLE_; i++) {
          visible.push(allDeparted[(offset + i) % departedTotal]);
        }
        buckets['wl-tier-departed'] = visible;
      } else {
        this.departedRotationOffset_ = 0;
      }

      // Build final HTML with group headers
      const htmlParts: string[] = ['<div>'];
      const tiersWithEntries = Object.keys(TIER_ORDER)
        .sort((a, b) => TIER_ORDER[a] - TIER_ORDER[b])
        .filter((tier) => buckets[tier].length > 0);
      const showHeaders = tiersWithEntries.length > 1;

      for (const tier of tiersWithEntries) {
        if (showHeaders) {
          const countSuffix = tier === 'wl-tier-departed' && departedTotal > DEPARTED_MAX_VISIBLE_
            ? ` (${departedTotal})`
            : '';

          htmlParts.push(`<div class="wl-group-header">${TIER_LABELS[tier]}${countSuffix}</div>`);
        }
        htmlParts.push(...buckets[tier]);
      }

      if (visibleCount === 0) {
        const noPassesMsg = 'No passes within 60 minutes';

        htmlParts.push(`<div class="wl-entry wl-tier-background" style="justify-content:center">${noPassesMsg}</div>`);
      }

      htmlParts.push('</div>');

      // Set innerHTML directly - requestIdleCallback (setInnerHtml) defers too
      // long in a busy render loop and can cause stale/empty overlay content
      const contentEl = getEl('info-overlay-content');

      if (contentEl) {
        contentEl.innerHTML = htmlParts.join('');
      }
      this.lastOverlayUpdateTime = timeManagerInstance.realTime;

      // Auto-recalc when list empties (with cooldown to prevent rapid-fire)
      if (visibleCount === 0 && this.isMenuButtonActive && Date.now() - this.lastRecalcTime_ > WatchlistOverlay.RECALC_COOLDOWN_MS_) {
        this.openOverlayMenu_();
      }
    }
  }
}
