import { SensorMath } from '@app/app/sensors/sensor-math';
import { GetSatType, MenuMode, SatPassTimes, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { lineManagerInstance } from '@app/engine/rendering/line-manager';
import { LineColors } from '@app/engine/rendering/line-manager/line';
import { dateFormat } from '@app/engine/utils/dateFormat';
import { html } from '@app/engine/utils/development/formatter';
import { getEl, setInnerHtml } from '@app/engine/utils/get-el';
import { shake } from '@app/engine/utils/shake';
import { showLoading } from '@app/engine/utils/showLoading';
import { DetailedSatellite, MILLISECONDS_PER_DAY } from '@ootk/src/main';
import pictureInPicturePng from '@public/img/icons/picture-in-picture.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { WatchlistPlugin } from './watchlist';

export class WatchlistOverlay extends KeepTrackPlugin {
  readonly id = 'WatchlistOverlay';
  dependencies_ = [WatchlistPlugin.name];
  private watchlistPlugin_: WatchlistPlugin;

  constructor() {
    super();
    this.watchlistPlugin_ = PluginRegistry.getPlugin(WatchlistPlugin)!;
  }

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  private readonly OVERLAY_CALC_LENGTH_IN_DAYS = 0.5;
  private infoOverlayDOMHtmlStrArr = [] as string[];
  private lastSensorId: number;
  private lastSimTimeWhenCalc: number;
  private nextPassArray: SatPassTimes[] = [];

  bottomIconCallback = () => {
    if (!this.verifySensorSelected()) {
      return;
    }

    if (PluginRegistry.getPlugin(WatchlistPlugin)?.watchlistList.length === 0) {
      ServiceLocator.getUiManager().toast('Add Satellites to Watchlist!', ToastMsgType.caution);
      shake(getEl('menu-info-overlay'));

      return;
    }

    if (!this.isMenuButtonActive) {
      return;
    }

    if (this.watchlistPlugin_.watchlistList.length === 0 && !this.watchlistPlugin_.isWatchlistChanged) {
      ServiceLocator.getUiManager().toast('Add Satellites to Watchlist!', ToastMsgType.caution);
      shake(getEl('menu-info-overlay'));
      this.nextPassArray = [];

      return;
    }

    this.openOverlayMenu_();
  };

  bottomIconElementName: string = 'info-overlay-icon';
  bottomIconImg = pictureInPicturePng;

  lastOverlayUpdateTime = 0;
  sideMenuElementHtml = html`
    <div id="info-overlay-menu" class="side-menu-parent start-hidden text-select">
      <div id="info-overlay-content"></div>
    </div>`;

  sideMenuElementName = 'info-overlay-menu';

  isRequireSensorSelected = true;

  static uiManagerFinal() {
    getEl('info-overlay-content')!.addEventListener('click', (evt: Event) => {
      const catalogManagerInstance = ServiceLocator.getCatalogManager();

      const sccNum = parseInt((<HTMLElement>evt.target).textContent!.split(':')[0]);
      const id = catalogManagerInstance.sccNum2Id(sccNum);

      if (id !== null) {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(id);
      }
    });
  }

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(EventBusEvent.updateLoop, this.updateLoop.bind(this));
    EventBus.getInstance().on(EventBusEvent.onWatchlistUpdated, this.onWatchlistUpdated_.bind(this));
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, WatchlistOverlay.uiManagerFinal.bind(this));
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

  private updateFovLinesMulti_(sat: DetailedSatellite) {
    const idx = this.watchlistPlugin_.watchlistList.findIndex((el) => el.id === sat.id);

    ServiceLocator.getOrbitManager().removeInViewOrbit(this.watchlistPlugin_.watchlistList[idx].id);
    for (const sensor of ServiceLocator.getSensorManager().currentSensors) {
      lineManagerInstance.createSensorToSatFovOnly(sensor, sat, LineColors.GREEN);
    }
  }

  private updateFovLinesSingle_(sat: DetailedSatellite) {
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
  }

  private openOverlayMenu_() {
    const sensorManagerInstance = ServiceLocator.getSensorManager();
    const timeManager = ServiceLocator.getTimeManager();

    if (
      this.nextPassArray.length === 0 ||
      this.lastSimTimeWhenCalc > timeManager.simulationTimeObj.getTime() ||
      new Date(this.lastSimTimeWhenCalc * 1 + (MILLISECONDS_PER_DAY * this.OVERLAY_CALC_LENGTH_IN_DAYS) / 2).getTime() < timeManager.simulationTimeObj.getTime() ||
      this.watchlistPlugin_.isWatchlistChanged ||
      this.lastSensorId !== sensorManagerInstance.currentSensors[0].id
    ) {
      showLoading(() => {
        const catalogManagerInstance = ServiceLocator.getCatalogManager();

        const satArray: DetailedSatellite[] = [];

        for (const obj of this.watchlistPlugin_.watchlistList) {
          const satellite = catalogManagerInstance.getSat(obj.id, GetSatType.EXTRA_ONLY);

          if (!satellite) {
            continue;
          }
          satArray.push(satellite);
        }

        this.nextPassArray = SensorMath.nextpassList(satArray, sensorManagerInstance.currentSensors, 1, this.OVERLAY_CALC_LENGTH_IN_DAYS);
        this.nextPassArray.sort((a: { time: string | number | Date }, b: { time: string | number | Date }) => new Date(a.time).getTime() - new Date(b.time).getTime());

        this.lastSimTimeWhenCalc = timeManager.simulationTimeObj.getTime();
        this.lastSensorId = sensorManagerInstance.currentSensors[0].id;

        this.lastOverlayUpdateTime = 0;
        this.updateNextPassOverlay_(true);
        this.watchlistPlugin_.isWatchlistChanged = false;
      });
    } else {
      this.updateNextPassOverlay_();
    }
  }

  private pushOverlayElement_(s: number, propTime: number, infoOverlayDOMHtmlStrArr: string[]) {
    const isSatInView = ServiceLocator.getDotsManager().inViewData[this.nextPassArray[s].sat.id];
    // If old time and not in view, skip it

    if (this.nextPassArray[s].time.getTime() - propTime < -1000 * 60 * 5 && !isSatInView) {
      return;
    }

    // Get the pass Time
    const time = dateFormat(this.nextPassArray[s].time, 'isoTime', true);
    const name = this.nextPassArray[s].sat.sccNum ? this.nextPassArray[s].sat.sccNum : this.nextPassArray[s].sat.name;

    // Yellow - In View (Only one pass can be in view at a time)
    if (isSatInView === 1 && this.nextPassArray[s].time.getTime() - propTime < 1000 * 60 * 5) {
      infoOverlayDOMHtmlStrArr.push(`<div class="row"><h5 class="center-align watchlist-object link" style="color: yellow">${name}: ${time}</h5></div>`);

      return;
    }
    /*
     * Blue - Time to Next Pass is up to 30 minutes after the current time or 10 minutes before the current time
     * This makes recent objects stay at the top of the list in blue
     */
    if (this.nextPassArray[s].time.getTime() - propTime < 1000 * 60 * 30 && propTime - this.nextPassArray[s].time.getTime() < 1000 * 60 * 10) {
      infoOverlayDOMHtmlStrArr.push(`<div class="row"><h5 class="center-align watchlist-object link" style="color: #0095ff">${name}: ${time}</h5></div>`);

      return;
    }
    // White - Any future pass not fitting the above requirements
    if (this.nextPassArray[s].time.getTime() - propTime > 0) {
      infoOverlayDOMHtmlStrArr.push(`<div class="row"><h5 class="center-align watchlist-object link" style="color: white">${name}: ${time}</h5></div>`);
    }
  }

  private updateNextPassOverlay_(isForceUpdate = false) {
    const timeManagerInstance = ServiceLocator.getTimeManager();

    if (this.nextPassArray.length <= 0 && !this.isMenuButtonActive) {
      return;
    }
    /*
     * TODO: This should auto update the overlay when the time changes outside the original search window
     * Update once every 10 seconds
     */
    const mainCameraInstance = ServiceLocator.getMainCamera();

    if ((Date.now() > this.lastOverlayUpdateTime * 1 + 10000 && !mainCameraInstance.state.isDragging) || isForceUpdate) {
      this.infoOverlayDOMHtmlStrArr = [];
      this.infoOverlayDOMHtmlStrArr.push('<div>');
      for (let s = 0; s < this.nextPassArray.length; s++) {
        this.pushOverlayElement_(s, timeManagerInstance.simulationTimeObj.getTime(), this.infoOverlayDOMHtmlStrArr);
      }
      this.infoOverlayDOMHtmlStrArr.push('</div>');
      setInnerHtml('info-overlay-content', this.infoOverlayDOMHtmlStrArr.join(''));
      this.lastOverlayUpdateTime = timeManagerInstance.realTime;
    }
  }
}
