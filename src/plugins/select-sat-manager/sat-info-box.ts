/* eslint-disable max-lines */
/* eslint-disable complexity */
/* eslint-disable max-statements */
import { country2flagIcon } from '@app/catalogs/countries';
import { GetSatType, KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { openColorbox } from '@app/lib/colorbox';
import { getEl, hideEl, showEl } from '@app/lib/get-el';
import { MissileObject } from '@app/singletons/catalog-manager/MissileObject';
import { lineManagerInstance } from '@app/singletons/draw-manager/line-manager';
import { LineColors } from '@app/singletons/draw-manager/line-manager/line';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { SearchManager } from '@app/singletons/search-manager';
import { CatalogSearch } from '@app/static/catalog-search';
import { CoordinateTransforms } from '@app/static/coordinate-transforms';
import { SatMath } from '@app/static/sat-math';
import { SensorMath, TearrData } from '@app/static/sensor-math';
import { StringExtractor } from '@app/static/string-extractor';
import addPng from '@public/img/icons/add.png';
import removePng from '@public/img/icons/remove.png';
import Draggabilly from 'draggabilly';
import { BaseObject, CatalogSource, DEG2RAD, DetailedSatellite, MINUTES_PER_DAY, RfSensor, SpaceObjectType, Sun, cKmPerMs, eci2lla } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { missileManager } from '../missile/missileManager';
import { SoundNames } from '../sounds/SoundNames';
import { StereoMap } from '../stereo-map/stereo-map';
import { WatchlistPlugin } from '../watchlist/watchlist';
import './sat-info-box.css';
import { SelectSatManager } from './select-sat-manager';

/**
 * This class controls all the functionality of the satellite info box.
 * There are select events and update events that are registered to the keepTrackApi.
 */
export class SatInfoBox extends KeepTrackPlugin {
  readonly id = 'SatInfoBox';
  dependencies_: string[] = [SelectSatManager.name];
  private selectSatManager_: SelectSatManager;
  private isVisible_ = false;

  constructor() {
    super();
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
  }

  private static readonly containerId_ = 'sat-infobox';

  private isorbitalDataLoaded_ = false;
  private issecondaryDataLoaded_ = false;
  private issensorInfoLoaded_ = false;
  private islaunchDataLoaded_ = false;
  private issatMissionDataLoaded_ = false;
  private isTopLinkEventListenersAdded_ = false;
  private isActionsSectionCollapsed_ = true;
  private isIdentifiersSectionCollapsed_ = false;
  private isOrbitalSectionCollapsed_ = false;
  private isSecondaryDataSectionCollapsed_ = false;
  private isSensorDataSectionCollapsed_ = false;
  private isObjectDataSectionCollapsed_ = false;
  private isMissionSectionCollapsed_ = false;

  currentTEARR = <TearrData>{
    az: 0,
    el: 0,
    rng: 0,
    objName: '',
    lat: 0,
    lon: 0,
    alt: 0,
    inView: false,
  };

  addHtml(): void {
    super.addHtml();

    /*
     * NOTE: This has to go first.
     * Register orbital element data
     */
    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: `${this.id}_orbitalData`,
      cb: this.orbitalData.bind(this),
    });

    // Register sensor data
    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: `${this.id}_sensorInfo`,
      cb: SatInfoBox.updateSensorInfo_.bind(this),
    });

    // Register launch data
    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: `${this.id}_launchData`,
      cb: SatInfoBox.updateLaunchData_.bind(this),
    });

    const keyboardManager = keepTrackApi.getInputManager().keyboard;

    keyboardManager.registerKeyDownEvent({
      key: 'i',
      callback: () => {
        if (this.isVisible_) {
          this.hide();
        } else {
          this.show();
        }
      },
    });

    // Register mission data
    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: `${this.id}_satMissionData`,
      cb: SatInfoBox.updateSatMissionData_.bind(this),
    });

    // Register object data
    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: `${this.id}_objectData`,
      cb: SatInfoBox.updateObjectData_,
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: this.uiManagerFinal_.bind(this),
    });
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.updateSelectBox,
      cbName: this.id,
      cb: (obj: BaseObject) => {
        if (!keepTrackApi.isInitialized) {
          return;
        }

        if (!obj?.isSatellite() && !obj?.isMissile()) {
          return;
        }

        try {
          const timeManagerInstance = keepTrackApi.getTimeManager();
          const sensorManagerInstance = keepTrackApi.getSensorManager();

          if (obj.isSatellite()) {
            const sat = obj as DetailedSatellite;

            if (!sat.position?.x || !sat.position?.y || !sat.position?.z || isNaN(sat.position?.x) || isNaN(sat.position?.y) || isNaN(sat.position?.z)) {
              const newPosition = SatMath.getEci(sat, timeManagerInstance.simulationTimeObj).position as { x: number; y: number; z: number };

              if (!newPosition || (newPosition?.x == 0 && newPosition?.y == 0 && newPosition?.z == 0)) {
                keepTrackApi
                  .getUiManager()
                  .toast(
                    `Satellite ${sat.sccNum} is not in orbit!<br>Sim time is ${timeManagerInstance.simulationTimeObj.toUTCString()}.<br>Be sure to check you have the right TLE.`,
                    ToastMsgType.error,
                    true,
                  );
                this.selectSatManager_.selectSat(-1);

                return;
              }
            }

            let isInView, rae;

            if (keepTrackApi.getSensorManager().isSensorSelected()) {
              const sensor = keepTrackApi.getSensorManager().currentSensors[0];

              rae = sensor.rae(sat, timeManagerInstance.simulationTimeObj);
              isInView = sensor.isRaeInFov(rae);
            } else {
              rae = {
                az: 0,
                el: 0,
                rng: 0,
              };
              isInView = false;
            }

            const lla = eci2lla(sat.position, SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj).gmst);
            const currentTearr: TearrData = {
              time: timeManagerInstance.simulationTimeObj.toISOString(),
              az: rae.az,
              el: rae.el,
              rng: rae.rng,
              objName: sat.name,
              lat: lla.lat,
              lon: lla.lon,
              alt: lla.alt,
              inView: isInView,
            };

            this.currentTEARR = currentTearr; // TODO: Make SatMath 100% static
          } else {
            // Is Missile
            this.currentTEARR = missileManager.getMissileTEARR(obj as MissileObject);
          }

          const { gmst } = SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj);
          const lla = eci2lla(obj.position, gmst);

          if (lla.lon >= 0) {
            getEl('sat-longitude').innerHTML = `${lla.lon.toFixed(3)}°E`;
          } else {
            getEl('sat-longitude').innerHTML = `${(lla.lon * -1).toFixed(3)}°W`;
          }
          if (lla.lat >= 0) {
            getEl('sat-latitude').innerHTML = `${lla.lat.toFixed(3)}°N`;
          } else {
            getEl('sat-latitude').innerHTML = `${(lla.lat * -1).toFixed(3)}°S`;
          }

          if (
            settingsManager.plugins?.stereoMap &&
            keepTrackApi.getPlugin(StereoMap)?.isMenuButtonActive &&
            timeManagerInstance.realTime > settingsManager.lastMapUpdateTime + 30000
          ) {
            keepTrackApi.getPlugin(StereoMap).updateMap();
            settingsManager.lastMapUpdateTime = timeManagerInstance.realTime;
          }

          if (obj.isSatellite()) {
            const sat = obj as DetailedSatellite;
            const { gmst } = SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj);

            getEl('sat-altitude').innerHTML = `${SatMath.getAlt(sat.position, gmst).toFixed(2)} km`;
            getEl('sat-velocity').innerHTML = `${sat.totalVelocity.toFixed(2)} km/s`;
          } else {
            const misl = obj as MissileObject;

            getEl('sat-altitude').innerHTML = `${this.currentTEARR.alt.toFixed(2)} km`;
            if (misl.totalVelocity) {
              getEl('sat-velocity').innerHTML = `${misl.totalVelocity.toFixed(2)} km/s`;
            } else {
              getEl('sat-velocity').innerHTML = 'Unknown';
            }
          }

          if (this.currentTEARR.inView) {
            if (getEl('sat-azimuth')) {
              getEl('sat-azimuth').innerHTML = `${this.currentTEARR.az.toFixed(0)}°`;
            } // Convert to Degrees
            if (getEl('sat-elevation')) {
              getEl('sat-elevation').innerHTML = `${this.currentTEARR.el.toFixed(1)}°`;
            }
            if (getEl('sat-range')) {
              getEl('sat-range').innerHTML = `${this.currentTEARR.rng.toFixed(2)} km`;
            }
            const sun = keepTrackApi.getScene().sun;

            if (getEl('sat-vmag')) {
              if (obj.isMissile()) {
                getEl('sat-vmag').innerHTML = 'N/A';
              } else {
                const sat = obj as DetailedSatellite;

                getEl('sat-vmag').innerHTML = SatMath.calculateVisMag(sat, sensorManagerInstance.currentSensors[0], timeManagerInstance.simulationTimeObj, sun).toFixed(2);
              }
            }
            let beamwidthString = 'Unknown';

            if (sensorManagerInstance.currentSensors[0] instanceof RfSensor) {
              beamwidthString = sensorManagerInstance.currentSensors[0].beamwidth
                ? `${(this.currentTEARR.rng * Math.sin(DEG2RAD * sensorManagerInstance.currentSensors[0].beamwidth)).toFixed(2)} km`
                : 'Unknown';
            }
            if (getEl('sat-beamwidth')) {
              getEl('sat-beamwidth').innerHTML = beamwidthString;
            }
            if (getEl('sat-maxTmx')) {
              getEl('sat-maxTmx').innerHTML = `${((this.currentTEARR.rng / cKmPerMs) * 2).toFixed(2)} ms`;
            } // Time for RF to hit target and bounce back
          } else {
            if (getEl('sat-vmag')) {
              getEl('sat-vmag').innerHTML = 'Out of FOV';
            }
            if (getEl('sat-azimuth')) {
              getEl('sat-azimuth').innerHTML = 'Out of FOV';
            }
            if (getEl('sat-azimuth')) {
              getEl('sat-azimuth').title = `Azimuth: ${this.currentTEARR.az.toFixed(0)}°`;
            }

            const elevationDom = getEl('sat-elevation');

            if (elevationDom) {
              elevationDom.innerHTML = 'Out of FOV';
            }
            if (elevationDom) {
              elevationDom.title = `Elevation: ${this.currentTEARR.el.toFixed(1)}°`;
            }

            const rangeDom = getEl('sat-range');

            if (rangeDom) {
              rangeDom.innerHTML = 'Out of FOV';
            }
            if (rangeDom) {
              rangeDom.title = `Range: ${this.currentTEARR.rng.toFixed(2)} km`;
            }

            let beamwidthString = 'Unknown';

            if (sensorManagerInstance.currentSensors[0] instanceof RfSensor) {
              beamwidthString = sensorManagerInstance.currentSensors[0]?.beamwidth ? `${sensorManagerInstance.currentSensors[0].beamwidth}°` : 'Unknown';
            }
            if (getEl('sat-beamwidth')) {
              getEl('sat-beamwidth').innerHTML = 'Out of FOV';
            }
            if (getEl('sat-beamwidth')) {
              getEl('sat-beamwidth').title = beamwidthString;
            }
            if (getEl('sat-maxTmx')) {
              getEl('sat-maxTmx').innerHTML = 'Out of FOV';
            }
          }

          if (this.selectSatManager_.secondarySat !== -1 && getEl('secondary-sat-info')?.style?.display === 'none') {
            console.log('showing secondary sat info');
            console.log(this.selectSatManager_.secondarySat);
            showEl('secondary-sat-info');
            showEl('sec-angle-link');
          } else if (this.selectSatManager_.secondarySat === -1 && getEl('secondary-sat-info')?.style?.display !== 'none') {
            hideEl('secondary-sat-info');
            hideEl('sec-angle-link');
          }

          if (this.selectSatManager_.secondarySat !== -1 && obj.isSatellite()) {
            const sat = obj as DetailedSatellite;
            const ric = CoordinateTransforms.sat2ric(this.selectSatManager_.secondarySatObj, sat);
            const dist = SensorMath.distanceString(sat, this.selectSatManager_.secondarySatObj).split(' ')[2];

            getEl('sat-sec-dist').innerHTML = `${dist} km`;
            getEl('sat-sec-rad').innerHTML = `${ric.position[0].toFixed(2)}km`;
            getEl('sat-sec-intrack').innerHTML = `${ric.position[1].toFixed(2)}km`;
            getEl('sat-sec-crosstrack').innerHTML = `${ric.position[2].toFixed(2)}km`;
          }

          if (sensorManagerInstance.isSensorSelected()) {
            const uiManagerInstance = keepTrackApi.getUiManager();

            /*
             * If we didn't just calculate next pass time for this satellite and sensor combination do it
             * TODO: Make new logic for this to allow it to be updated while selected
             */
            if (
              (this.selectSatManager_.selectedSat !== uiManagerInstance.lastNextPassCalcSatId ||
                sensorManagerInstance.currentSensors[0].objName !== uiManagerInstance.lastNextPassCalcSensorShortName) &&
              !obj.isMissile()
            ) {
              const sat = obj as DetailedSatellite;

              if (sat.perigee > sensorManagerInstance.currentSensors[0].maxRng) {
                if (getEl('sat-nextpass')) {
                  getEl('sat-nextpass').innerHTML = 'Beyond Max Range';
                }
              } else if (getEl('sat-nextpass')) {
                getEl('sat-nextpass').innerHTML = SensorMath.nextpass(sat, sensorManagerInstance.currentSensors, 2, 5);
              }

              /*
               *  IDEA: Code isInSun()
               * sun.getXYZ();
               * lineManager.create('ref',[sun.sunvar.position.x,sun.sunvar.position.y,sun.sunvar.position.z]);
               */
            }
            uiManagerInstance.lastNextPassCalcSatId = this.selectSatManager_.selectedSat;
            uiManagerInstance.lastNextPassCalcSensorShortName = sensorManagerInstance.currentSensors[0].objName;
          } else if (getEl('sat-nextpass')) {
            getEl('sat-nextpass').innerHTML = 'Unavailable';
          }
        } catch (e) {
          errorManagerInstance.debug('Error updating satellite info!');
        }
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.onWatchlistUpdated,
      cbName: this.id,
      cb: (watchlistList: { id: number, inView: boolean }[]) => {
        let isOnList = false;

        watchlistList.forEach(({ id }) => {
          if (id === this.selectSatManager_.selectedSat) {
            isOnList = true;
          }
        });

        const addRemoveWatchlistDom = getEl('sat-add-watchlist');

        if (addRemoveWatchlistDom) {
          if (isOnList) {
            (<HTMLImageElement>getEl('sat-remove-watchlist')).style.display = 'block';
            (<HTMLImageElement>getEl('sat-add-watchlist')).style.display = 'none';
          } else {
            (<HTMLImageElement>getEl('sat-add-watchlist')).style.display = 'block';
            (<HTMLImageElement>getEl('sat-remove-watchlist')).style.display = 'none';
          }
        }
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.id,
      cb: this.selectSat_.bind(this),
    });
  }

  private uiManagerFinal_(): void {
    if (!this.isorbitalDataLoaded_) {
      SatInfoBox.createOrbitalData_();
      this.isorbitalDataLoaded_ = true;
    }
    if (!this.issecondaryDataLoaded_) {
      SatInfoBox.createSecondaryData_();
      this.issecondaryDataLoaded_ = true;
    }

    if (!this.issensorInfoLoaded_) {
      SatInfoBox.createSensorInfo();
      this.issensorInfoLoaded_ = true;
    }

    if (!this.islaunchDataLoaded_) {
      SatInfoBox.createLaunchData_();
      this.islaunchDataLoaded_ = true;
    }

    if (!this.issatMissionDataLoaded_) {
      SatInfoBox.createSatMissionData();
      this.issatMissionDataLoaded_ = true;
    }

    // Now that is is loaded, reset the sizing and location
    SatInfoBox.resetMenuLocation(getEl(SatInfoBox.containerId_), false);

    this.addListenerToCollapseElement_(getEl('actions-section-collapse'), getEl('actions-section'), { value: this.isActionsSectionCollapsed_ });
    this.addListenerToCollapseElement_(getEl('identifiers-section-collapse'), getEl('sat-identifier-data'), { value: this.isIdentifiersSectionCollapsed_ });
    this.addListenerToCollapseElement_(getEl('orbit-data-section-collapse'), getEl('orbital-section'), { value: this.isOrbitalSectionCollapsed_ });
    this.addListenerToCollapseElement_(getEl('secondary-sat-info-collapse'), getEl('secondary-sat-info'), { value: this.isSecondaryDataSectionCollapsed_ });
    this.addListenerToCollapseElement_(getEl('sensor-data-section-collapse'), getEl('sensor-sat-info'), { value: this.isSensorDataSectionCollapsed_ });
    this.addListenerToCollapseElement_(getEl('object-data-section-collapse'), getEl('launch-section'), { value: this.isObjectDataSectionCollapsed_ });
    this.addListenerToCollapseElement_(getEl('mission-section-collapse'), getEl('sat-mission-data'), { value: this.isMissionSectionCollapsed_ });
  }

  private addListenerToCollapseElement_(collapseEl: HTMLElement, section: HTMLElement, isCollapsedRef: { value: boolean }): void {
    collapseEl.addEventListener('click', () => {
      section.classList.toggle('collapsed');
      collapseEl.classList.toggle('collapse-closed');
      isCollapsedRef.value = !isCollapsedRef.value;

      if (collapseEl.classList.contains('collapse-closed')) {
        collapseEl.textContent = 'expand_more';
      } else {
        collapseEl.textContent = 'expand_less';
      }
    });
  }

  hide(): void {
    hideEl(SatInfoBox.containerId_);
    this.isVisible_ = false;
  }

  show(): void {
    if (this.selectSatManager_.primarySatObj.id === -1) {
      return;
    }
    showEl(SatInfoBox.containerId_);
    this.isVisible_ = true;
  }

  orbitalData(sat: DetailedSatellite): void {
    // Only show orbital data if it is available
    if (sat === null || typeof sat === 'undefined') {
      return;
    }

    this.updateOrbitData_(sat);
  }

  private nearObjectsLinkClick_(distance: number = 100): void {
    keepTrackApi.getSoundManager().play(SoundNames.CLICK);
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    if (this.selectSatManager_.selectedSat === -1) {
      return;
    }
    const sat = this.selectSatManager_.selectedSat;
    const SCCs = [];
    let pos = catalogManagerInstance.getObject(sat, GetSatType.POSITION_ONLY).position;
    const posXmin = pos.x - distance;
    const posXmax = pos.x + distance;
    const posYmin = pos.y - distance;
    const posYmax = pos.y + distance;
    const posZmin = pos.z - distance;
    const posZmax = pos.z + distance;

    (<HTMLInputElement>getEl('search')).value = '';
    for (let i = 0; i < catalogManagerInstance.numSatellites; i++) {
      pos = catalogManagerInstance.getObject(i, GetSatType.POSITION_ONLY).position;
      if (pos.x < posXmax && pos.x > posXmin && pos.y < posYmax && pos.y > posYmin && pos.z < posZmax && pos.z > posZmin) {
        SCCs.push(catalogManagerInstance.getSat(i, GetSatType.EXTRA_ONLY).sccNum);
      }
    }

    for (let i = 0; i < SCCs.length; i++) {
      (<HTMLInputElement>getEl('search')).value += i < SCCs.length - 1 ? `${SCCs[i]},` : SCCs[i];
    }

    keepTrackApi.getUiManager().doSearch((<HTMLInputElement>getEl('search')).value.toString());
  }

  private nearOrbitsLink_() {
    keepTrackApi.getSoundManager().play(SoundNames.CLICK);
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const nearbyObjects = CatalogSearch.findObjsByOrbit(catalogManagerInstance.getSats(), catalogManagerInstance.getSat(this.selectSatManager_.selectedSat));
    const searchStr = SearchManager.doArraySearch(catalogManagerInstance, nearbyObjects);

    keepTrackApi.getUiManager().searchManager.doSearch(searchStr, false);
  }

  private allObjectsLink_(): void {
    keepTrackApi.getSoundManager().play(SoundNames.CLICK);
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    if (this.selectSatManager_.selectedSat === -1) {
      return;
    }
    const intldes = catalogManagerInstance.getSat(this.selectSatManager_.selectedSat, GetSatType.EXTRA_ONLY).intlDes;
    const searchStr = intldes.slice(0, 8);

    keepTrackApi.getUiManager().doSearch(searchStr);
    (<HTMLInputElement>getEl('search')).value = searchStr;
  }

  private drawLineToSun_() {
    keepTrackApi.getSoundManager().play(SoundNames.CLICK);
    lineManagerInstance.createSat2Sun(this.selectSatManager_.primarySatObj);
  }

  private drawRicLines_() {
    keepTrackApi.getSoundManager().play(SoundNames.CLICK);
    lineManagerInstance.createSatRicFrame(this.selectSatManager_.primarySatObj);
  }

  private drawLineToEarth_() {
    keepTrackApi.getSoundManager().play(SoundNames.CLICK);
    lineManagerInstance.createSatToRef(this.selectSatManager_.primarySatObj, [0, 0, 0], LineColors.PURPLE);
  }

  private drawLineToSat_() {
    keepTrackApi.getSoundManager().play(SoundNames.CLICK);
    if (this.selectSatManager_.secondarySat === -1) {
      keepTrackApi.getUiManager().toast('No Secondary Satellite Selected', ToastMsgType.caution);

      return;
    }

    lineManagerInstance.createObjToObj(this.selectSatManager_.primarySatObj, this.selectSatManager_.secondarySatObj, LineColors.BLUE);
  }

  private updateOrbitData_ = (sat: DetailedSatellite): void => {
    if (sat.isSatellite()) {
      getEl('sat-apogee').innerHTML = `${sat.apogee.toFixed(0)} km`;
      getEl('sat-perigee').innerHTML = `${sat.perigee.toFixed(0)} km`;
      getEl('sat-inclination').innerHTML = `${sat.inclination.toFixed(2)}°`;
      getEl('sat-eccentricity').innerHTML = sat.eccentricity.toFixed(3);
      getEl('sat-raan').innerHTML = `${sat.rightAscension.toFixed(2)}°`;
      getEl('sat-argPe').innerHTML = `${sat.argOfPerigee.toFixed(2)}°`;

      const periodDom = getEl('sat-period');

      periodDom.innerHTML = `${sat.period.toFixed(2)} min`;
      periodDom.dataset.position = 'top';
      periodDom.dataset.delay = '50';
      periodDom.dataset.tooltip = `Mean Motion: ${(MINUTES_PER_DAY / sat.period).toFixed(2)}`;

      const now: Date | number | string = new Date();
      const daysold = SatMath.calcElsetAge(sat, now);
      const elsetAgeDom = getEl('sat-elset-age');

      if (elsetAgeDom) {
        elsetAgeDom.innerHTML = `${daysold.toFixed(2)} Days`;
      }

      SatInfoBox.updateConfidenceDom_(sat);

      elsetAgeDom.dataset.position = 'top';
      elsetAgeDom.dataset.delay = '50';
      elsetAgeDom.dataset.tooltip = `Epoch Year: ${sat.tle1.substr(18, 2).toString()} Day: ${sat.tle1.substr(20, 8).toString()}`;
    }

    if (!this.isTopLinkEventListenersAdded_) {
      getEl('sat-add-watchlist')?.addEventListener('click', this.addRemoveWatchlist_.bind(this));
      getEl('sat-remove-watchlist')?.addEventListener('click', this.addRemoveWatchlist_.bind(this));
      getEl('all-objects-link')?.addEventListener('click', this.allObjectsLink_.bind(this));
      getEl('near-orbits-link')?.addEventListener('click', this.nearOrbitsLink_.bind(this));
      getEl('near-objects-link1')?.addEventListener('click', () => this.nearObjectsLinkClick_(100));
      getEl('near-objects-link2')?.addEventListener('click', () => this.nearObjectsLinkClick_(200));
      getEl('near-objects-link4')?.addEventListener('click', () => this.nearObjectsLinkClick_(400));
      getEl('sun-angle-link')?.addEventListener('click', this.drawLineToSun_.bind(this));
      getEl('ric-angle-link')?.addEventListener('click', this.drawRicLines_.bind(this));
      getEl('nadir-angle-link')?.addEventListener('click', this.drawLineToEarth_.bind(this));
      getEl('sec-angle-link')?.addEventListener('click', this.drawLineToSat_.bind(this));
      this.isTopLinkEventListenersAdded_ = true;
    }
  };

  private addRemoveWatchlist_() {
    const watchlistPlugin = keepTrackApi.getPlugin(WatchlistPlugin);

    if (watchlistPlugin) {
      const id = this.selectSatManager_.selectedSat;

      keepTrackApi.getSoundManager().play(SoundNames.CLICK);
      if (watchlistPlugin.isOnWatchlist(id)) {
        watchlistPlugin.removeSat(id);
      } else {
        watchlistPlugin.addSat(id);
      }
    }
  }

  private static updateConfidenceDom_(sat: DetailedSatellite) {
    let color = '';
    let text = '';

    const confidenceDom = getEl('sat-confidence');

    if (confidenceDom) {
      // We encode confidence score in the 65th character in the TLE line 1
      const confidenceScore = parseInt(sat.tle1.substring(64, 65)) || 0;

      if (settingsManager.externalTLEsOnly) {
        text = 'External';
        color = 'gray';
      } else if (confidenceScore >= 7) {
        text = `High (${confidenceScore})`;
        color = 'green';
      } else if (confidenceScore >= 4) {
        text = `Medium (${confidenceScore})`;
        color = 'orange';
      } else {
        text = `Low (${confidenceScore})`;
        color = 'red';
      }

      confidenceDom.innerHTML = text;
      confidenceDom.style.color = color;
    }
  }

  private static updateObjectData_ = (obj: BaseObject): void => {
    if (!obj || obj.isStatic() || obj.isSensor()) {
      return;
    }

    const isHasAltName = (obj as DetailedSatellite)?.altName && (obj as DetailedSatellite).altName !== '';

    getEl('sat-info-title-name').innerHTML = obj.name;
    getEl('sat-infobox-fi').classList.value = `fi ${country2flagIcon((obj as DetailedSatellite).country)}`;
    getEl('sat-alt-name').innerHTML = isHasAltName ? (obj as DetailedSatellite).altName : 'N/A';

    const watchlistPlugin = <WatchlistPlugin>keepTrackApi.getPlugin(WatchlistPlugin);

    if (watchlistPlugin) {
      if (watchlistPlugin.isOnWatchlist(obj.id)) {
        getEl('sat-remove-watchlist').style.display = 'block';
        getEl('sat-add-watchlist').style.display = 'none';
      } else {
        getEl('sat-add-watchlist').style.display = 'block';
        getEl('sat-remove-watchlist').style.display = 'none';
      }
    } else {
      getEl('sat-add-watchlist').style.display = 'none';
      getEl('sat-remove-watchlist').style.display = 'none';
    }

    SatInfoBox.updateSatType_(obj);

    /*
     * TODO:
     * getEl('edit-satinfo-link').innerHTML = "<a class='iframe' href='editor.htm?scc=" + sat.sccNum + "&popup=true'>Edit Satellite Info</a>";
     */

    if (obj.isMissile()) {
      getEl('sat-intl-des').innerHTML = 'N/A';
      getEl('sat-objnum').innerHTML = 'N/A';
      getEl('sat-altid').innerHTML = 'N/A';
      getEl('sat-source').innerHTML = 'N/A';
    } else {
      const sat = obj as DetailedSatellite;

      getEl('sat-intl-des').innerHTML = sat.intlDes === 'none' ? 'N/A' : sat.intlDes;
      if (sat.source && sat.source === CatalogSource.VIMPEL) {
        getEl('sat-objnum').innerHTML = 'N/A';
        getEl('sat-intl-des').innerHTML = 'N/A';
      } else {
        const satObjNumDom = getEl('sat-objnum');

        satObjNumDom.innerHTML = sat.sccNum;
        // satObjNumDom.setAttribute('data-tooltip', `${FormatTle.convert6DigitToA5(sat.sccNum)}`);
      }

      getEl('sat-altid').innerHTML = sat.altId || 'N/A';
      getEl('sat-source').innerHTML = sat.source || CatalogSource.USSF;
      SatInfoBox.updateRcsData_(sat);
    }
  };

  private static updateLaunchData_(obj?: BaseObject) {
    if (!obj || (!obj.isSatellite() && !obj.isMissile())) {
      return;
    }
    const satMisl = obj as DetailedSatellite | MissileObject;

    SatInfoBox.updateCountryCorrelationTable_(satMisl);
    const { missileLV, satLvString }: { missileLV: string; satLvString: string } = SatInfoBox.updateLaunchSiteCorrelationTable_(satMisl);

    SatInfoBox.updateLaunchVehicleCorrelationTable_(obj, missileLV, satLvString);

    if (satMisl.isMissile()) {
      return;
    }

    const sat = satMisl as DetailedSatellite;

    getEl('sat-configuration').innerHTML = sat.configuration !== '' ? sat.configuration : 'Unknown';
  }

  private static updateLaunchVehicleCorrelationTable_(obj: BaseObject, missileLV: string, satLvString: string) {
    let satVehicleDom = getEl('sat-vehicle');
    // Remove any existing event listeners
    const tempEl = satVehicleDom.cloneNode(true);

    satVehicleDom.parentNode.replaceChild(tempEl, satVehicleDom);
    // Update links
    satVehicleDom = getEl('sat-vehicle');

    if (obj.isMissile()) {
      const missile = obj as MissileObject;

      missile.launchVehicle = missileLV;
      satVehicleDom.innerHTML = missile.launchVehicle;
    } else {
      const sat = obj as DetailedSatellite;

      satVehicleDom.innerHTML = sat.launchVehicle; // Set to JSON record
      if (sat.launchVehicle === 'U') {
        satVehicleDom.innerHTML = 'Unknown';
      } // Replace with Unknown if necessary
      satLvString = StringExtractor.extractLiftVehicle(sat.launchVehicle); // Replace with link if available
      satVehicleDom.innerHTML = satLvString;

      if (satLvString.includes('http')) {
        satVehicleDom.classList.add('pointable');
        satVehicleDom.addEventListener('click', (e) => {
          e.preventDefault();
          openColorbox((<HTMLAnchorElement>satVehicleDom.firstChild).href);
        });
      } else {
        satVehicleDom.classList.remove('pointable');
      }
    }

    return satLvString;
  }

  private static updateLaunchSiteCorrelationTable_(obj: BaseObject) {
    let siteArr = [];
    let site = {} as any;
    let missileLV: any;
    let missileOrigin: any;
    let satLvString: any;

    if (obj.isMissile()) {
      const misl = obj as MissileObject;

      siteArr = misl.desc.split('(');
      missileOrigin = siteArr[0].substr(0, siteArr[0].length - 1);
      missileLV = misl.desc.split('(')[1].split(')')[0]; // Remove the () from the booster type

      site.site = missileOrigin;
      site.sitec = misl.country;
    } else {
      const sat = obj as DetailedSatellite;

      site = StringExtractor.extractLaunchSite(sat.launchSite);
    }

    getEl('sat-site').innerHTML = site.site;
    getEl('sat-sitec').innerHTML = site.sitec;

    return { missileLV, satLvString };
  }

  private static updateCountryCorrelationTable_(obj: DetailedSatellite | MissileObject) {
    if (obj.country?.length > 4) {
      getEl('sat-country').innerHTML = obj.country;
    } else {
      const country = StringExtractor.extractCountry(obj.country);

      getEl('sat-country').innerHTML = country;
    }
  }

  private static createLaunchData_() {
    getEl(SatInfoBox.containerId_).insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
          <div id="launch-section">
            <div class="sat-info-section-header">
              Object Data
              <span id="object-data-section-collapse" class="section-collapse material-icons" style="position: absolute; right: 0;">expand_less</span>
            </div>
            <div class="sat-info-row">
              <div class="sat-info-key" data-position="top" data-delay="50"
                data-tooltip="Type of Object">Type</div>
              <div class="sat-info-value" id="sat-type">PAYLOAD</div>
            </div>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key" data-position="top" data-delay="50"
                data-tooltip="Country That Owns the Object">Country</div>
              <div class="sat-info-value" id="sat-country">COUNTRY</div>
            </div>
            <div class="sat-info-row" id="sat-site-row">
              <div class="sat-info-key" data-position="top" data-delay="50"
                data-tooltip="Location Where Object Launched From">Launch Site</div>
              <div class="sat-info-value">
                <div id="sat-site">SITE</div>
                <div id="sat-sitec">LAUNCH COUNTRY</div>
              </div>
              </div>
            <div class="sat-info-row">
              <div class="sat-info-key" data-position="top" data-delay="50"
                data-tooltip="Space Lift Vehicle That Launched Object">Rocket</div>
              <div class="sat-info-value pointable" id="sat-vehicle">VEHICLE</div>
            </div>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key" data-position="top" data-delay="50"
                data-tooltip="Configuration of the Rocket">
                Configuration
              </div>
              <div class="sat-info-value" id="sat-configuration">
                NO DATA
              </div>
            </div>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key" data-position="top" data-delay="50"
                data-tooltip="Radar Cross Section - How reflective the object is to a radar">
                RCS
              </div>
              <div class="sat-info-value" data-position="top" data-delay="50" id="sat-rcs">NO DATA</div>
            </div>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key" data-position="top" data-delay="50"
                data-tooltip="Standard Magnitude - Smaller Numbers Are Brighter">
                Standard Mag
              </div>
              <div class="sat-info-value" id="sat-stdmag">
                NO DATA
              </div>
            </div>
          </div>
          `,
    );
  }

  private static createSecondaryData_() {
    getEl(SatInfoBox.containerId_).insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
          <div id="secondary-sat-info">
            <div class="sat-info-section-header">
              Secondary Satellite
              <span id="secondary-sat-info-collapse" class="section-collapse material-icons" style="position: absolute; right: 0;">expand_less</span>
            </div>
            <div class="sat-info-row">
              <div class="sat-info-key" data-position="top" data-delay="50"
                data-tooltip="Linear Distance from Secondary Satellite">
                Linear
              </div>
              <div class="sat-info-value" id="sat-sec-dist">xxxx km</div>
            </div>
            <div class="sat-info-row">
              <div class="sat-info-key" data-position="top" data-delay="50"
                data-tooltip="Radial Distance">
                Radial
              </div>
              <div class="sat-info-value" id="sat-sec-rad">XX deg</div>
            </div>
            <div class="sat-info-row">
              <div class="sat-info-key" data-position="top" data-delay="50"
                data-tooltip="In-Track Distance from Secondary Satellite">
                In-Track
              </div>
              <div class="sat-info-value" id="sat-sec-intrack">XX deg</div>
            </div>
            <div class="sat-info-row">
              <div class="sat-info-key" data-position="top" data-delay="50"
                data-tooltip="Cross-Track Distance from Secondary Satellite">
                Cross-Track
              </div>
              <div class="sat-info-value" id="sat-sec-crosstrack">xxxx km</div>
            </div>
          </div>
          `,
    );
  }

  private static createOrbitalData_() {
    getEl('ui-wrapper').insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
      <div id="sat-infobox" class="text-select satinfo-fixed start-hidden">
        <div id="sat-info-header">
          <div id="sat-info-title" class="center-text sat-info-section-header">
            <img id="sat-add-watchlist" src="${addPng}"/>
            <img id="sat-remove-watchlist" src="${removePng}"/>
            <span id="sat-info-title-name">
              This is a title
            </span>
            <span id="sat-infobox-fi" class="fi"></span>
          </div>
          <div id="actions-section" class="collapsed">
            <div class="sat-info-section-header">
              Actions
              <span id="actions-section-collapse" class="section-collapse collapse-closed material-icons" style="position: absolute; right: 0;">expand_more</span>
            </div>
            ${getEl('search') ? SatInfoBox.createSearchLinks_() : ''}
            <div id="draw-line-links">
            <div id="sun-angle-link" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
            data-tooltip="Visualize Angle to Sun">Draw sat to sun line...</div>
            <div id="ric-angle-link" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
            data-tooltip="Visualize RIC Vector">Draw sat to RIC line...</div>
            <div id="nadir-angle-link" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
            data-tooltip="Visualize Angle to Earth">Draw sat to nadir line...</div>
            <div id="sec-angle-link" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
            data-tooltip="Visualize Angle to Secondary Satellite">Draw sat to second sat line...</div>
          </div>
        </div>
        <div id="sat-identifier-data">
          <div class="sat-info-section-header">
            Identifiers
            <span id="identifiers-section-collapse" class="section-collapse material-icons" style="position: absolute; right: 0;">expand_less</span>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="International Designator - Launch Year, Launch Number, and Piece Designator">COSPAR</div>
            <div class="sat-info-value" id="sat-intl-des">xxxx-xxxA</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="USSF Catalog Number - Originally North American Air Defense (NORAD)">NORAD</div>
            <div class="sat-info-value" id="sat-objnum" data-position="top" data-delay="50">99999</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key">Alt Name</div>
            <div class="sat-info-value" id="sat-alt-name">Alt Name</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key">Alt ID</div>
            <div class="sat-info-value" id="sat-altid">99999</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key">Source</div>
            <div class="sat-info-value" id="sat-source">USSF</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key">Confidence</div>
            <div class="sat-info-value" id="sat-confidence">High</div>
          </div>
        </div>
        <div id="orbital-section">
          <div class="sat-info-section-header">
            Orbit Data
            <span id="orbit-data-section-collapse" class="section-collapse material-icons" style="position: absolute; right: 0;">expand_less</span>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Highest Point in the Orbit">
              Apogee
            </div>
            <div class="sat-info-value" id="sat-apogee">xxx km</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Lowest Point in the Orbit">
              Perigee
            </div>
            <div class="sat-info-value" id="sat-perigee">xxx km</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Angle Measured from Equator on the Ascending Node">
              Inclination
            </div>
            <div class="sat-info-value" id="sat-inclination">xxx.xx</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="How Circular the Orbit Is (0 is a Circle)">
              Eccentricity
            </div>
            <div class="sat-info-value" id="sat-eccentricity">x.xx</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Where it Rises Above the Equator">
              Right Asc.
            </div>
            <div class="sat-info-value" id="sat-raan">x.xx</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Where the Lowest Part of the Orbit Is">
              Arg of Perigee
            </div>
            <div class="sat-info-value" id="sat-argPe">x.xx</div>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Current Latitude Over Earth">
              Latitude
            </div>
            <div class="sat-info-value" id="sat-latitude">x.xx</div>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Current Longitude Over Earth">
              Longitude
            </div>
            <div class="sat-info-value" id="sat-longitude">x.xx</div>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Current Altitude Above Sea Level">
              Altitude
            </div>
            <div class="sat-info-value" id="sat-altitude">xxx km</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Time for One Complete Revolution Around Earth">
              Period
            </div>
            <div class="sat-info-value" id="sat-period">xxx min</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Current Velocity of the Satellite (Higher the Closer to Earth it Is)">
              Velocity
            </div>
            <div class="sat-info-value" id="sat-velocity">xxx km/s</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Time Since Official Orbit Calculated (Older ELSETs are Less Accuarate Usually)">
              Age of ELSET
            </div>
            <div class="sat-info-value" id="sat-elset-age">xxx.xxxx</div>
          </div>
        </div>
      </div>
    `,
    );

    // Create a Sat Info Box Initializing Script
    if (!settingsManager.isMobileModeEnabled) {
      const draggie = new Draggabilly(getEl(SatInfoBox.containerId_), {
        containment: keepTrackApi.containerRoot,
      });

      draggie.on('dragStart', () => {
        getEl(SatInfoBox.containerId_).style.height = 'fit-content';
        getEl(SatInfoBox.containerId_).style.maxHeight = '80%';
        document.documentElement.style.setProperty('--search-box-bottom', '0px');
        getEl(SatInfoBox.containerId_).classList.remove('satinfo-fixed');

        getEl('search-results').style.maxHeight = '80%';
      });
    }

    // If right click kill and reinit
    const satInfobox = getEl(SatInfoBox.containerId_);

    satInfobox.addEventListener('mousedown', (e: any) => {
      if (e.button === 2) {
        SatInfoBox.resetMenuLocation(satInfobox);
        getEl('search-results').style.maxHeight = '';
      }
    });
  }

  private static createSearchLinks_(): string {
    return keepTrackApi.html`
    <div id="search-links">
      <div id="all-objects-link" class="link sat-infobox-links menu-selectable sat-only-info" data-position="top" data-delay="50"
      data-tooltip="Find Related Objects">Find all objects from this launch...</div>
      <div id="near-orbits-link" class="link sat-infobox-links menu-selectable sat-only-info" data-position="top" data-delay="50"
      data-tooltip="Find Objects in Orbital Plane">Find all objects near this orbit...</div>
      <div id="near-objects-link1" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
      data-tooltip="Find Nearby Objects">Find all objects within 100km...</div>
      <div id="near-objects-link2" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
      data-tooltip="Find Nearby Objects">Find all objects within 200km...</div>
      <div id="near-objects-link4" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
      data-tooltip="Find Nearby Objects">Find all objects within 400km...</div>
    </div>`;
  }

  static resetMenuLocation(satInfoboxDom: HTMLElement, isShow = true) {
    satInfoboxDom.classList.remove('satinfo-fixed');
    satInfoboxDom.removeAttribute('style');

    if (isShow) {
      satInfoboxDom.style.display = 'block';
    }

    const searchBoxHeight = satInfoboxDom?.getBoundingClientRect().height ?? 0;
    const bottomMenuTopVar = document.documentElement.style.getPropertyValue('--bottom-menu-top').split('px')[0];

    document.documentElement.style.setProperty('--search-box-bottom', `${searchBoxHeight + bottomMenuTopVar}px`);
  }

  private static updateSatType_(obj: BaseObject) {
    switch (obj.type) {
      case SpaceObjectType.UNKNOWN:
        getEl('sat-type').innerHTML = 'TBA';
        break;
      case SpaceObjectType.PAYLOAD:
        getEl('sat-type').innerHTML = 'Payload';
        break;
      case SpaceObjectType.ROCKET_BODY:
        getEl('sat-type').innerHTML = 'Rocket Body';
        break;
      case SpaceObjectType.DEBRIS:
        getEl('sat-type').innerHTML = 'Debris';
        break;
      case SpaceObjectType.SPECIAL:
        getEl('sat-type').innerHTML = 'Special';
        break;
      default:
        if (obj.isMissile()) {
          getEl('sat-type').innerHTML = 'Ballistic Missile';
        }
    }
  }

  private static updateRcsData_(sat: DetailedSatellite) {
    const satRcsEl = getEl('sat-rcs');

    if ((sat.rcs === null || typeof sat.rcs === 'undefined')) {
      const estRcs = SatMath.estimateRcsUsingHistoricalData(sat);

      if (estRcs !== null) {
        satRcsEl.innerHTML = `H-Est ${estRcs.toFixed(4)} m<sup>2</sup>`;
        satRcsEl.setAttribute('data-tooltip', `${SatMath.mag2db(estRcs).toFixed(2)} dBsm (Historical Estimate)`);
      } else if (sat.length && sat.diameter && sat.span && sat.shape) {
        const rcs = SatMath.estimateRcs(parseFloat(sat.length), parseFloat(sat.diameter), parseFloat(sat.span), sat.shape);

        satRcsEl.innerHTML = `Est ${rcs.toFixed(4)} m<sup>2</sup>`;
        satRcsEl.setAttribute('data-tooltip', `Est ${SatMath.mag2db(rcs).toFixed(2)} dBsm`);
      } else {
        satRcsEl.innerHTML = 'Unknown';
        satRcsEl.setAttribute('data-tooltip', 'Unknown');
      }
    } else if (!isNaN(sat.rcs)) {
      satRcsEl.innerHTML = `${sat.rcs} m<sup>2</sup>`;
    } else {
      satRcsEl.innerHTML = 'Unknown';
      satRcsEl.setAttribute('data-tooltip', 'Unknown');
      // satRcsEl.setAttribute('data-tooltip', `${SatMath.mag2db(sat.rcs).toFixed(2)} dBsm`);
    }
  }

  private static updateSatMissionData_(obj?: BaseObject) {
    if (obj === null || typeof obj === 'undefined') {
      return;
    }

    if (obj.isSatellite()) {
      const sat = obj as DetailedSatellite;

      keepTrackApi.containerRoot.querySelectorAll('.sat-only-info')?.forEach((el) => {
        (<HTMLElement>el).style.display = 'flex';
      });
      let satUserDom = getEl('sat-user');
      const satUserString = StringExtractor.extractUserUrl(sat?.owner); // Replace with link if available

      satUserDom.innerHTML = satUserString;
      const tempEl = satUserDom.cloneNode(true);

      satUserDom.parentNode.replaceChild(tempEl, satUserDom);
      satUserDom = tempEl as HTMLElement;

      if (satUserString.includes('http')) {
        satUserDom.classList.add('pointable');
        satUserDom.addEventListener('click', (e) => {
          e.preventDefault();
          const href = (<HTMLAnchorElement>satUserDom.firstChild).href;

          if (href.includes('http')) {
            openColorbox(href);
          }
        });
      } else {
        satUserDom.classList.remove('pointable');
      }


      getEl('sat-purpose').innerHTML = sat?.purpose && sat?.purpose !== '' ? sat?.purpose : 'Unknown';
      getEl('sat-contractor').innerHTML = sat?.manufacturer && sat?.manufacturer !== '' ? sat?.manufacturer : 'Unknown';
      // Update with other mass options
      getEl('sat-launchMass').innerHTML = sat?.launchMass && sat?.launchMass !== '' ? `${sat?.launchMass} kg` : 'Unknown';
      getEl('sat-dryMass').innerHTML = sat?.dryMass && sat?.dryMass !== '' ? `${sat?.dryMass} kg` : 'Unknown';
      getEl('sat-lifetime').innerHTML = sat?.lifetime && sat?.lifetime !== '' ? `${sat?.lifetime} yrs` : 'Unknown';
      getEl('sat-power').innerHTML = sat?.power && sat?.power !== '' ? `${sat?.power} w` : 'Unknown';
      if (!sat?.vmag && sat?.vmag !== 0) {
        sat.vmag = SatInfoBox.calculateStdMag_(sat);
      }
      getEl('sat-stdmag').innerHTML = sat?.vmag && sat?.vmag?.toFixed(2) !== '' ? sat?.vmag?.toFixed(2) : 'Unknown';
      getEl('sat-bus').innerHTML = sat?.bus && sat?.bus !== '' ? sat?.bus : 'Unknown';
      getEl('sat-configuration').innerHTML = sat?.configuration && sat?.configuration !== '' ? sat?.configuration : 'Unknown';
      getEl('sat-payload').innerHTML = sat?.payload && sat?.payload !== '' ? sat?.payload : 'Unknown';
      getEl('sat-motor').innerHTML = sat?.motor && sat?.motor !== '' ? sat?.motor : 'Unknown';
      getEl('sat-length').innerHTML = sat?.length && sat?.length !== '' ? `${sat?.length} m` : 'Unknown';
      getEl('sat-diameter').innerHTML = sat?.diameter && sat?.diameter !== '' ? `${sat?.diameter} m` : 'Unknown';
      getEl('sat-span').innerHTML = sat?.span && sat?.span !== '' ? `${sat?.span} m` : 'Unknown';
      getEl('sat-shape').innerHTML = sat?.shape && sat?.shape !== '' ? sat?.shape : 'Unknown';
    } else {
      (<HTMLElement>keepTrackApi.containerRoot.querySelector('.sat-only-info')).style.display = 'none';
    }
  }

  private static calculateStdMag_(obj: DetailedSatellite): number {
    if (obj.vmag) {
      return obj.vmag;
    }

    const similarVmag = [];
    const catalogManager = keepTrackApi.getCatalogManager();
    const curSatType = obj.type;
    const curSatId = obj.id;
    const curSatCountry = obj.country;
    const curSatName = obj.name.toLowerCase();

    catalogManager.getSats().forEach((posSat) => {
      if (!posSat.vmag) {
        return;
      }
      if (curSatCountry !== posSat.country) {
        // Only look at same country
        return;
      }
      if (curSatType !== posSat.type) {
        // Only look at same type of curSat
        return;
      }
      if (curSatId === posSat.id) {
        // Don't look at the same curSat
        return;
      }

      similarVmag.push(posSat.vmag);

      // Only use the first word of the name
      const posName = posSat.name.toLowerCase();

      if (curSatName.length < 4 || posName.length < 4) {
        return;
      }

      // Determine how many characters match
      const matchingChars = curSatName.split('').filter((char, index) => char === posName[index]);

      if (matchingChars.length / curSatName.length > 0.85) {
        similarVmag.push(posSat.vmag);
        similarVmag.push(posSat.vmag);
        similarVmag.push(posSat.vmag);
      }
    });

    if (similarVmag.length > 0) {
      const avgVmag = similarVmag.reduce((a, b) => a + b, 0) / similarVmag.length;


      return avgVmag;
    }

    return null;
  }

  private static createSatMissionData() {
    getEl(SatInfoBox.containerId_).insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
        <div id="sat-mission-data">
          <div class="sat-info-section-header">
            Mission
            <span id="mission-section-collapse" class="section-collapse material-icons" style="position: absolute; right: 0;">expand_less</span>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Primary User of the Satellite">
              User
            </div>
            <div class="sat-info-value" id="sat-user">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Main Function of the Satellite">
              Purpose
            </div>
            <div class="sat-info-value" id="sat-purpose">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Contractor Who Built the Satellite">
              Contractor
            </div>
            <div class="sat-info-value" id="sat-contractor">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Mass at Lift Off">
              Lift Mass
            </div>
            <div class="sat-info-value" id="sat-launchMass">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50" data-tooltip="Unfueled Mass">
              Dry Mass
            </div>
            <div class="sat-info-value" id="sat-dryMass">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="How Long the Satellite was Expected to be Operational">
              Life Expectancy
            </div>
            <div class="sat-info-value" id="sat-lifetime">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Satellite Bus">
              Bus
            </div>
            <div class="sat-info-value" id="sat-bus">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Primary Payload">
              Payload
            </div>
            <div class="sat-info-value" id="sat-payload">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Primary Motor">
              Motor
            </div>
            <div class="sat-info-value" id="sat-motor">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Length in Meters">
              Length
            </div>
            <div class="sat-info-value" id="sat-length">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Diameter in Meters">
              Diameter
            </div>
            <div class="sat-info-value" id="sat-diameter">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Span in Meters">
              Span
            </div>
            <div class="sat-info-value" id="sat-span">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Description of Shape">
              Shape
            </div>
            <div class="sat-info-value" id="sat-shape">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Power of the Satellite">
              Power
            </div>
            <div class="sat-info-value" id="sat-power">
              NO DATA
            </div>
          </div>
        </div>
        `,
    );
  }

  private static updateSensorInfo_(obj: BaseObject) {
    if (obj === null || typeof obj === 'undefined' || !settingsManager.plugins.sensor) {
      return;
    }
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    /*
     * If we are using the sensor manager plugin then we should hide the sensor to satellite
     * info when there is no sensor selected
     */
    if (settingsManager.plugins.sensor) {
      if (sensorManagerInstance.isSensorSelected()) {
        showEl('sensor-sat-info');
      } else {
        hideEl('sensor-sat-info');
      }
    }

    if (!sensorManagerInstance.currentSensors[0]?.lat) {
      const satSunDom = getEl('sat-sun');

      if (satSunDom) {
        satSunDom.parentElement.style.display = 'none';
      }
    } else {
      const timeManagerInstance = keepTrackApi.getTimeManager();
      const now = new Date(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.propOffset);

      let satInSun = -1;
      let sunTime;

      try {
        sunTime = Sun.getTimes(now, sensorManagerInstance.currentSensors[0].lat, sensorManagerInstance.currentSensors[0].lon);
        satInSun = SatMath.calculateIsInSun(obj, keepTrackApi.getScene().sun.eci);
      } catch {
        satInSun = -1;
      }

      // If No Sensor, then Ignore Sun Exclusion
      const satSunDom = getEl('sat-sun');

      if (sensorManagerInstance.currentSensors[0].lat === null) {
        if (satSunDom) {
          satSunDom.parentElement.style.display = 'none';
        }

        return;
      } else if (satSunDom) {
        satSunDom.parentElement.style.display = 'flex';
      }

      // If Radar Selected, then Say the Sun Doesn't Matter
      if (sensorManagerInstance.currentSensors[0].type !== SpaceObjectType.OPTICAL && sensorManagerInstance.currentSensors[0].type !== SpaceObjectType.OBSERVER && satSunDom) {
        satSunDom.innerHTML = 'No Effect';
        // If Dawn Dusk Can be Calculated then show if the satellite is in the sun
      } else if (sunTime?.sunriseStart.getTime() - now.getTime() > 0 || (sunTime?.sunsetEnd.getTime() - now.getTime() < 0 && satSunDom)) {
        if (satInSun == 0) {
          satSunDom.innerHTML = 'No Sunlight';
        }
        if (satInSun == 1) {
          satSunDom.innerHTML = 'Limited Sunlight';
        }
        if (satInSun == 2) {
          satSunDom.innerHTML = 'Direct Sunlight';
        }
        /*
         * If Optical Sesnor but Dawn Dusk Can't Be Calculated, then you are at a
         * high latitude and we need to figure that out
         */
      } else if (sunTime?.nadir != 'Invalid Date' && (sunTime?.sunriseStart == 'Invalid Date' || sunTime?.sunsetEnd == 'Invalid Date') && satSunDom) {
        // TODO: Figure out how to calculate this
        console.debug('No Dawn or Dusk');
        if (satInSun == 0) {
          satSunDom.innerHTML = 'No Sunlight';
        }
        if (satInSun == 1) {
          satSunDom.innerHTML = 'Limited Sunlight';
        }
        if (satInSun == 2) {
          satSunDom.innerHTML = 'Direct Sunlight';
        }
      } else if (satSunDom) {
        if (satInSun == -1) {
          satSunDom.innerHTML = 'Unable to Calculate';
        } else {
          // Unless you are in sun exclusion
          satSunDom.innerHTML = 'Sun Exclusion';
        }
      }
    }
  }

  private static createSensorInfo() {
    getEl(SatInfoBox.containerId_).insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
      <div id="sensor-sat-info">
        <div class="sat-info-section-header">
          Sensor Data
          <span id="sensor-data-section-collapse" class="section-collapse material-icons" style="position: absolute; right: 0;">expand_less</span>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Distance from the Sensor">
            Range
          </div>
          <div class="sat-info-value" id="sat-range">xxxx km</div>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Angle (Left/Right) from the Sensor">
            Azimuth
          </div>
          <div class="sat-info-value" id="sat-azimuth">XX deg</div>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Angle (Up/Down) from the Sensor">
            Elevation
          </div>
          <div class="sat-info-value" id="sat-elevation">XX deg</div>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Linear Width at Target's Range">
            Beam Width
          </div>
          <div class="sat-info-value" id="sat-beamwidth">xxxx km</div>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Time for RF/Light to Reach Target and Back">
            Max Tmx Time
          </div>
          <div class="sat-info-value" id="sat-maxTmx">xxxx ms</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Does the Sun Impact the Sensor">
            Sun
          </div>
          <div class="sat-info-value" id="sat-sun">Sun Stuff</div>
        </div>
        <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Visual Magnitude (Lower numbers are brighter)">
              Vis Mag
            </div>
            <div class="sat-info-value" id="sat-vmag">xx.x</div>
          </div>
        <div id="sat-info-nextpass-row" class="sat-info-row sat-only-info">
          <div id="sat-info-nextpass" class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Next Time in Coverage">
            Next Pass
          </div>
          <div id="sat-nextpass" class="sat-info-value">00:00:00z</div>
        </div>
      </div>
      `,
    );
  }

  /**
   * Selects a satellite, missile, or sensor object and updates the satellite info box accordingly.
   *
   * @param obj - The satellite, missile, or sensor object to be selected.
   */
  private selectSat_(obj?: BaseObject): void {
    if (obj) {
      if (obj.isSensor()) {
        return;
      }

      this.show();

      const satInfoBoxDom = getEl(SatInfoBox.containerId_);
      // Get the height of the DOM
      const searchBoxHeight = keepTrackApi.getUiManager().searchManager.isResultsOpen ? satInfoBoxDom?.getBoundingClientRect().height : 0;
      const bottomMenuTopVar = document.documentElement.style.getPropertyValue('--bottom-menu-top').split('px')[0];
      const curVal = document.documentElement.style.getPropertyValue('--search-box-bottom');

      if (curVal !== `${searchBoxHeight + bottomMenuTopVar}px`) {
        document.documentElement.style.setProperty('--search-box-bottom', `${searchBoxHeight + bottomMenuTopVar}px`);
      }

      if (obj.isSatellite()) {
        SatInfoBox.setSatInfoBoxSatellite_();
      } else {
        SatInfoBox.setSatInfoBoxMissile_();
      }
    }
  }

  private static setSatInfoBoxMissile_() {
    // TODO: There is an interdependency with SatCoreInfoBox and SelectSatManager.
    ['sat-apogee', 'sat-perigee', 'sat-inclination', 'sat-eccentricity', 'sat-raan', 'sat-argPe', 'sat-stdmag', 'sat-configuration', 'sat-elset-age', 'sat-period'].forEach(
      (id) => {
        const el = getEl(id, true);

        if (!el) {
          return;
        }
        hideEl(el.parentElement);
      },
    );

    const satMissionData = getEl('sat-mission-data', true);

    if (satMissionData) {
      satMissionData.style.display = 'none';
    }

    const satIdentifierData = getEl('sat-identifier-data', true);

    if (satIdentifierData) {
      satIdentifierData.style.display = 'none';
    }
  }

  private static setSatInfoBoxSatellite_() {
    // TODO: There is an interdependency with SatCoreInfoBox and SelectSatManager.
    ['sat-apogee', 'sat-perigee', 'sat-inclination', 'sat-eccentricity', 'sat-raan', 'sat-argPe', 'sat-stdmag', 'sat-configuration', 'sat-elset-age', 'sat-period'].forEach(
      (id) => {
        const el = getEl(id, true);

        if (!el) {
          return;
        }
        el.parentElement.style.display = 'flex';
      },
    );

    const satMissionData = getEl('sat-mission-data', true);

    if (satMissionData) {
      satMissionData.style.display = 'block';
    }

    const satIdentifierData = getEl('sat-identifier-data', true);

    if (satIdentifierData) {
      satIdentifierData.style.display = 'block';
    }
  }
}
