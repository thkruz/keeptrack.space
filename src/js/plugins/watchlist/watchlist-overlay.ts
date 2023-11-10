import infoPng from '@app/img/icons/info.png';
import { GetSatType, SatObject } from '@app/js/interfaces';
import { KeepTrackApiEvents, keepTrackApi } from '@app/js/keepTrackApi';
import { MILLISECONDS_PER_DAY } from '@app/js/lib/constants';
import { dateFormat } from '@app/js/lib/dateFormat';
import { getEl } from '@app/js/lib/get-el';
import { shake } from '@app/js/lib/shake';
import { showLoading } from '@app/js/lib/showLoading';
import { lineManagerInstance } from '@app/js/singletons/draw-manager/line-manager';
import { SatMath } from '@app/js/static/sat-math';
import { SensorMath } from '@app/js/static/sensor-math';
import { Sgp4 } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { WatchlistPlugin, watchlistPlugin } from './watchlist';

export class WatchlistOverlay extends KeepTrackPlugin {
  private readonly OVERLAY_CALC_LENGTH_IN_DAYS = 0.5;

  private infoOverlayDOMHtmlStrArr = [];
  private lastSensorId: number;
  private lastSimTimeWhenCalc: number;
  private nextPassArray: any = [];

  static readonly PLUGIN_NAME = 'Watchlist Overlay';

  bottomIconCallback = () => {
    if (!this.verifySensorSelected()) {
      return;
    }

    if ((<WatchlistPlugin>keepTrackApi.getPlugin(WatchlistPlugin)).watchlistList.length === 0) {
      keepTrackApi.getUiManager().toast(`Add Satellites to Watchlist!`, 'caution');
      shake(getEl('menu-info-overlay'));
      return;
    }

    if (!this.isMenuButtonEnabled) return;

    if (watchlistPlugin.watchlistList.length === 0 && !watchlistPlugin.isWatchlistChanged) {
      keepTrackApi.getUiManager().toast(`Add Satellites to Watchlist!`, 'caution');
      shake(getEl('menu-info-overlay'));
      this.nextPassArray = [];
      return;
    }

    this.openOverlayMenu_();
  };

  bottomIconElementName: string = 'info-overlay-icon';
  bottomIconImg = infoPng;
  bottomIconLabel = 'Overlay';
  dependencies = [watchlistPlugin.PLUGIN_NAME];
  helpBody: string = keepTrackApi.html`
    <p>
      The Watchlist Overlay shows the next pass time for each satellite in your watchlist. The overlay is updated every 10 seconds.
    </p>
    <p>
      The overlay is color coded to show the time to the next pass. The colors are as follows:
    </p>
    <ul>
      <li>Yellow - In View</li>
      <li>Blue - Time to Next Pass is up to 30 minutes after the current time or 10 minutes before the current time</li>
      <li>White - Any future pass not fitting the above requirements</li>
    </ul>
    <p>
      Clicking on a satellite in the overlay will center the map on that satellite.
    </p>`;

  helpTitle: string = 'Watchlist Overlay';
  lastOverlayUpdateTime = 0;
  sideMenuElementHtml = keepTrackApi.html`
    <div id="info-overlay-menu" class="side-menu-parent start-hidden text-select">
      <div id="info-overlay-content"></div>
    </div>`;

  sideMenuElementName = 'info-overlay-menu';

  constructor() {
    super(WatchlistOverlay.PLUGIN_NAME);
  }

  static uiManagerFinal() {
    getEl('info-overlay-content').addEventListener('click', (evt: Event) => {
      const catalogManagerInstance = keepTrackApi.getCatalogManager();

      const objNum = parseInt((<HTMLElement>evt.target).textContent.split(':')[0]);
      const satId = catalogManagerInstance.getIdFromObjNum(objNum);
      if (satId !== null) {
        catalogManagerInstance.setSelectedSat(satId);
      }
    });
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: 'updateLoop',
      cbName: 'watchlist',
      cb: this.updateLoop.bind(this),
    });
    keepTrackApi.register({
      event: KeepTrackApiEvents.onWatchlistUpdated,
      cbName: this.PLUGIN_NAME,
      cb: this.onWatchlistUpdated_.bind(this),
    });
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: WatchlistOverlay.uiManagerFinal.bind(this),
    });
  }

  updateLoop() {
    this.updateNextPassOverlay_();

    if (!keepTrackApi.getDotsManager().inViewData) return;

    if (watchlistPlugin.watchlistList.length <= 0) return;
    WatchlistOverlay.updateFovLines_();

    for (const element of watchlistPlugin.watchlistInViewList) {
      if (element === true) {
        return;
      }
    }
  }

  private static updateFovLinesMulti_(sat: SatObject, i: number) {
    keepTrackApi.getOrbitManager().removeInViewOrbit(watchlistPlugin.watchlistList[i]);
    for (const sensor of keepTrackApi.getSensorManager().currentSensors) {
      const satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
      const rae = SatMath.getRae(keepTrackApi.getTimeManager().simulationTimeObj, satrec, sensor);
      const isInFov = SatMath.checkIsInView(sensor, rae);
      if (!isInFov) continue;
      lineManagerInstance.create('sat3', [sat.id, keepTrackApi.getCatalogManager().getSensorFromSensorName(sensor.name)], 'g');
    }
  }

  private static updateFovLinesSingle_(sat: SatObject, i: number) {
    const inView = keepTrackApi.getDotsManager().inViewData[sat.id];
    const uiManagerInstance = keepTrackApi.getUiManager();

    if (inView === 1 && watchlistPlugin.watchlistInViewList[i] === false) {
      // Is inview and wasn't previously
      watchlistPlugin.watchlistInViewList[i] = true;
      uiManagerInstance.toast(`Satellite ${sat.sccNum} is In Field of View!`, 'normal');
      lineManagerInstance.create('sat3', [sat.id, keepTrackApi.getCatalogManager().getSensorFromSensorName(keepTrackApi.getSensorManager().currentSensors[0].name)], 'g');
      keepTrackApi.getOrbitManager().addInViewOrbit(watchlistPlugin.watchlistList[i]);
    }
    if (inView === 0 && watchlistPlugin.watchlistInViewList[i] === true) {
      // Isn't inview and was previously
      watchlistPlugin.watchlistInViewList[i] = false;
      uiManagerInstance.toast(`Satellite ${sat.sccNum} left Field of View!`, 'standby');
      keepTrackApi.getOrbitManager().removeInViewOrbit(watchlistPlugin.watchlistList[i]);
    }
  }

  private static updateFovLines_() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    for (let i = 0; i < watchlistPlugin.watchlistList.length; i++) {
      const sat = catalogManagerInstance.getSat(watchlistPlugin.watchlistList[i]);
      if (sensorManagerInstance.currentSensors.length > 1) {
        WatchlistOverlay.updateFovLinesMulti_(sat, i);
      } else {
        WatchlistOverlay.updateFovLinesSingle_(sat, i);
      }
    }
  }

  private onWatchlistUpdated_(watchlistList: number[]) {
    if (watchlistList.length === 0) {
      this.setBottomIconToDisabled();
    } else if (this.verifySensorSelected()) {
      this.setBottomIconToEnabled();
    }
  }

  private openOverlayMenu_() {
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    const timeManager = keepTrackApi.getTimeManager();

    if (
      this.nextPassArray.length === 0 ||
      this.lastSimTimeWhenCalc > timeManager.simulationTimeObj.getTime() ||
      new Date(this.lastSimTimeWhenCalc * 1 + (MILLISECONDS_PER_DAY * this.OVERLAY_CALC_LENGTH_IN_DAYS) / 2).getTime() < timeManager.simulationTimeObj.getTime() ||
      watchlistPlugin.isWatchlistChanged ||
      this.lastSensorId !== sensorManagerInstance.currentSensors[0].id
    ) {
      showLoading(() => {
        this.nextPassArray = [];
        const catalogManagerInstance = keepTrackApi.getCatalogManager();

        for (const satId of watchlistPlugin.watchlistList) {
          this.nextPassArray.push(catalogManagerInstance.getSat(satId, GetSatType.EXTRA_ONLY));
        }

        this.nextPassArray = SensorMath.nextpassList(this.nextPassArray, 1, this.OVERLAY_CALC_LENGTH_IN_DAYS);
        this.nextPassArray.sort(function (a: { time: string | number | Date }, b: { time: string | number | Date }) {
          return new Date(a.time).getTime() - new Date(b.time).getTime();
        });

        this.lastSimTimeWhenCalc = timeManager.simulationTimeObj.getTime();
        this.lastSensorId = sensorManagerInstance.currentSensors[0].id;

        this.lastOverlayUpdateTime = 0;
        this.updateNextPassOverlay_(true);
        watchlistPlugin.isWatchlistChanged = false;
      });
    } else {
      this.updateNextPassOverlay_();
    }
  }

  private pushOverlayElement_(s: number, propTime: any, infoOverlayDOMHtmlStrArr: string[]) {
    const isSatInView = keepTrackApi.getDotsManager().inViewData[keepTrackApi.getCatalogManager().getIdFromObjNum(this.nextPassArray[s].sccNum)];
    // If old time and not in view, skip it
    if (this.nextPassArray[s].time - propTime < -1000 * 60 * 5 && !isSatInView) return;

    // Get the pass Time
    const time = dateFormat(this.nextPassArray[s].time, 'isoTime', true);

    // Yellow - In View (Only one pass can be in view at a time)
    if (isSatInView === 1 && this.nextPassArray[s].time - propTime < 1000 * 60 * 5) {
      infoOverlayDOMHtmlStrArr.push(
        '<div class="row"><h5 class="center-align watchlist-object link" style="color: yellow">' + this.nextPassArray[s].sccNum + ': ' + time + '</h5></div>'
      );
      return;
    }
    // Blue - Time to Next Pass is up to 30 minutes after the current time or 10 minutes before the current time
    // This makes recent objects stay at the top of the list in blue
    if (this.nextPassArray[s].time - propTime < 1000 * 60 * 30 && propTime - this.nextPassArray[s].time < 1000 * 60 * 10) {
      infoOverlayDOMHtmlStrArr.push(
        '<div class="row"><h5 class="center-align watchlist-object link" style="color: #0095ff">' + this.nextPassArray[s].sccNum + ': ' + time + '</h5></div>'
      );
      return;
    }
    // White - Any future pass not fitting the above requirements
    if (this.nextPassArray[s].time - propTime > 0) {
      infoOverlayDOMHtmlStrArr.push(
        '<div class="row"><h5 class="center-align watchlist-object link" style="color: white">' + this.nextPassArray[s].sccNum + ': ' + time + '</h5></div>'
      );
    }
  }

  private updateNextPassOverlay_(isForceUpdate = false) {
    const timeManagerInstance = keepTrackApi.getTimeManager();

    if (this.nextPassArray.length <= 0 && !this.isMenuButtonEnabled) return;
    // TODO: This should auto update the overlay when the time changes outside the original search window
    // Update once every 10 seconds
    const mainCameraInstance = keepTrackApi.getMainCamera();
    if (
      (Date.now() > this.lastOverlayUpdateTime * 1 + 10000 &&
        keepTrackApi.getCatalogManager().selectedSat === -1 &&
        !mainCameraInstance.isDragging &&
        mainCameraInstance.zoomLevel() < mainCameraInstance.zoomTarget + 0.01 &&
        mainCameraInstance.zoomLevel() > mainCameraInstance.zoomTarget - 0.01) ||
      isForceUpdate
    ) {
      this.infoOverlayDOMHtmlStrArr = [];
      this.infoOverlayDOMHtmlStrArr.push('<div>');
      for (let s = 0; s < this.nextPassArray.length; s++) {
        this.pushOverlayElement_(s, timeManagerInstance.simulationTimeObj, this.infoOverlayDOMHtmlStrArr);
      }
      this.infoOverlayDOMHtmlStrArr.push('</div>');
      getEl('info-overlay-content').innerHTML = this.infoOverlayDOMHtmlStrArr.join('');
      this.lastOverlayUpdateTime = timeManagerInstance.realTime;
    }
  }
}

export const watchlistOverlayPlugin = new WatchlistOverlay();
