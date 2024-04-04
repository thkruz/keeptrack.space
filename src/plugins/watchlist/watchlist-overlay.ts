import { GetSatType, KeepTrackApiEvents, SatPassTimes } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { dateFormat } from '@app/lib/dateFormat';
import { getEl } from '@app/lib/get-el';
import { shake } from '@app/lib/shake';
import { showLoading } from '@app/lib/showLoading';
import { LineTypes, lineManagerInstance } from '@app/singletons/draw-manager/line-manager';
import { SatMath } from '@app/static/sat-math';
import { SensorMath } from '@app/static/sensor-math';
import infoPng from '@public/img/icons/info.png';
import { DetailedSatellite, MILLISECONDS_PER_DAY, Sgp4 } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { WatchlistPlugin } from './watchlist';

export class WatchlistOverlay extends KeepTrackPlugin {
  static readonly PLUGIN_NAME = 'Watchlist Overlay';
  dependencies = [WatchlistPlugin.PLUGIN_NAME];
  private watchlistPlugin_: WatchlistPlugin;

  constructor() {
    super(WatchlistOverlay.PLUGIN_NAME);
    this.watchlistPlugin_ = keepTrackApi.getPlugin(WatchlistPlugin);
  }

  private readonly OVERLAY_CALC_LENGTH_IN_DAYS = 0.5;
  private infoOverlayDOMHtmlStrArr = [];
  private lastSensorId: number;
  private lastSimTimeWhenCalc: number;
  private nextPassArray: SatPassTimes[] = [];

  bottomIconCallback = () => {
    if (!this.verifySensorSelected()) {
      return;
    }

    if (keepTrackApi.getPlugin(WatchlistPlugin).watchlistList.length === 0) {
      keepTrackApi.getUiManager().toast(`Add Satellites to Watchlist!`, 'caution');
      shake(getEl('menu-info-overlay'));
      return;
    }

    if (!this.isMenuButtonActive) return;

    if (this.watchlistPlugin_.watchlistList.length === 0 && !this.watchlistPlugin_.isWatchlistChanged) {
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

  static uiManagerFinal() {
    getEl('info-overlay-content').addEventListener('click', (evt: Event) => {
      const catalogManagerInstance = keepTrackApi.getCatalogManager();

      const sccNum = parseInt((<HTMLElement>evt.target).textContent.split(':')[0]);
      const id = catalogManagerInstance.sccNum2Id(sccNum);
      if (id !== null) {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(id);
      }
    });
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.updateLoop,
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

    if (this.watchlistPlugin_.watchlistList.length <= 0) return;
    this.updateFovLines_();

    for (const element of this.watchlistPlugin_.watchlistInViewList) {
      if (element === true) {
        return;
      }
    }
  }

  private updateFovLinesMulti_(sat: DetailedSatellite, i: number) {
    keepTrackApi.getOrbitManager().removeInViewOrbit(this.watchlistPlugin_.watchlistList[i]);
    for (const sensor of keepTrackApi.getSensorManager().currentSensors) {
      const satrec = Sgp4.createSatrec(sat.tle1, sat.tle2); // perform and store sat init calcs
      const rae = SatMath.getRae(keepTrackApi.getTimeManager().simulationTimeObj, satrec, sensor);
      const isInFov = SatMath.checkIsInView(sensor, rae);
      if (!isInFov) continue;
      lineManagerInstance.create(LineTypes.SELECTED_SENSOR_TO_SAT_IF_IN_FOV, [sat.id, keepTrackApi.getCatalogManager().getSensorFromSensorName(sensor.name)], 'g');
    }
  }

  private updateFovLinesSingle_(sat: DetailedSatellite, i: number) {
    const inView = keepTrackApi.getDotsManager().inViewData[sat.id];
    const uiManagerInstance = keepTrackApi.getUiManager();

    if (inView === 1 && this.watchlistPlugin_.watchlistInViewList[i] === false) {
      // Is inview and wasn't previously
      this.watchlistPlugin_.watchlistInViewList[i] = true;
      uiManagerInstance.toast(`Satellite ${sat.sccNum} is In Field of View!`, 'normal');
      lineManagerInstance.create(
        LineTypes.SELECTED_SENSOR_TO_SAT_IF_IN_FOV,
        [sat.id, keepTrackApi.getCatalogManager().getSensorFromSensorName(keepTrackApi.getSensorManager().currentSensors[0].name)],
        'g'
      );
      keepTrackApi.getOrbitManager().addInViewOrbit(this.watchlistPlugin_.watchlistList[i]);
    }
    if (inView === 0 && this.watchlistPlugin_.watchlistInViewList[i] === true) {
      // Isn't inview and was previously
      this.watchlistPlugin_.watchlistInViewList[i] = false;
      uiManagerInstance.toast(`Satellite ${sat.sccNum} left Field of View!`, 'standby');
      keepTrackApi.getOrbitManager().removeInViewOrbit(this.watchlistPlugin_.watchlistList[i]);
    }
  }

  private updateFovLines_() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    for (let i = 0; i < this.watchlistPlugin_.watchlistList.length; i++) {
      const sat = catalogManagerInstance.getSat(this.watchlistPlugin_.watchlistList[i]);
      if (sensorManagerInstance.currentSensors.length > 1) {
        this.updateFovLinesMulti_(sat, i);
      } else {
        this.updateFovLinesSingle_(sat, i);
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
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    const timeManager = keepTrackApi.getTimeManager();

    if (
      this.nextPassArray.length === 0 ||
      this.lastSimTimeWhenCalc > timeManager.simulationTimeObj.getTime() ||
      new Date(this.lastSimTimeWhenCalc * 1 + (MILLISECONDS_PER_DAY * this.OVERLAY_CALC_LENGTH_IN_DAYS) / 2).getTime() < timeManager.simulationTimeObj.getTime() ||
      this.watchlistPlugin_.isWatchlistChanged ||
      this.lastSensorId !== sensorManagerInstance.currentSensors[0].id
    ) {
      showLoading(() => {
        const catalogManagerInstance = keepTrackApi.getCatalogManager();

        const satArray: DetailedSatellite[] = [];
        for (const id of this.watchlistPlugin_.watchlistList) {
          satArray.push(catalogManagerInstance.getSat(id, GetSatType.EXTRA_ONLY));
        }

        this.nextPassArray = SensorMath.nextpassList(satArray, sensorManagerInstance.currentSensors, 1, this.OVERLAY_CALC_LENGTH_IN_DAYS);
        this.nextPassArray.sort(function (a: { time: string | number | Date }, b: { time: string | number | Date }) {
          return new Date(a.time).getTime() - new Date(b.time).getTime();
        });

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

  private pushOverlayElement_(s: number, propTime: any, infoOverlayDOMHtmlStrArr: string[]) {
    const isSatInView = keepTrackApi.getDotsManager().inViewData[this.nextPassArray[s].sat.id];
    // If old time and not in view, skip it
    if (this.nextPassArray[s].time.getTime() - propTime < -1000 * 60 * 5 && !isSatInView) return;

    // Get the pass Time
    const time = dateFormat(this.nextPassArray[s].time, 'isoTime', true);
    const name = this.nextPassArray[s].sat.sccNum ? this.nextPassArray[s].sat.sccNum : this.nextPassArray[s].sat.name;

    // Yellow - In View (Only one pass can be in view at a time)
    if (isSatInView === 1 && this.nextPassArray[s].time.getTime() - propTime < 1000 * 60 * 5) {
      infoOverlayDOMHtmlStrArr.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: yellow">' + name + ': ' + time + '</h5></div>');
      return;
    }
    // Blue - Time to Next Pass is up to 30 minutes after the current time or 10 minutes before the current time
    // This makes recent objects stay at the top of the list in blue
    if (this.nextPassArray[s].time.getTime() - propTime < 1000 * 60 * 30 && propTime - this.nextPassArray[s].time.getTime() < 1000 * 60 * 10) {
      infoOverlayDOMHtmlStrArr.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: #0095ff">' + name + ': ' + time + '</h5></div>');
      return;
    }
    // White - Any future pass not fitting the above requirements
    if (this.nextPassArray[s].time.getTime() - propTime > 0) {
      infoOverlayDOMHtmlStrArr.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: white">' + name + ': ' + time + '</h5></div>');
    }
  }

  private updateNextPassOverlay_(isForceUpdate = false) {
    const timeManagerInstance = keepTrackApi.getTimeManager();

    if (this.nextPassArray.length <= 0 && !this.isMenuButtonActive) return;
    // TODO: This should auto update the overlay when the time changes outside the original search window
    // Update once every 10 seconds
    const mainCameraInstance = keepTrackApi.getMainCamera();
    if ((Date.now() > this.lastOverlayUpdateTime * 1 + 10000 && !mainCameraInstance.isDragging) || isForceUpdate) {
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
