/* eslint-disable max-lines */
import { country2flagIcon } from '@app/catalogs/countries';
import { Doris } from '@app/doris/doris';
import { GetSatType, ToastMsgType } from '@app/interfaces';
import { TimeManager } from '@app/keeptrack/core/time-manager';
import { KeepTrackApiEvents } from '@app/keeptrack/events/event-types';
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
import { SatMath, SunStatus } from '@app/static/sat-math';
import { SensorMath, TearrData } from '@app/static/sensor-math';
import { StringExtractor } from '@app/static/string-extractor';
import bookmarkAddPng from '@public/img/icons/bookmark-add.png';
import bookmarkRemovePng from '@public/img/icons/bookmark-remove.png';
import Draggabilly from 'draggabilly';
import { BaseObject, CatalogSource, DEG2RAD, DetailedSatellite, MINUTES_PER_DAY, PayloadStatus, RfSensor, SpaceObjectType, Sun, SunTime, cKmPerMs, eci2lla } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { missileManager } from '../missile/missile-manager';
import { SensorManager } from '../sensor/sensorManager';
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
  private readonly selectSatManager_: SelectSatManager;
  private isVisible_ = false;

  constructor() {
    super();
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  private static readonly containerId_ = 'sat-infobox';

  private isorbitalDataLoaded_ = false;
  private issecondaryDataLoaded_ = false;
  private issensorInfoLoaded_ = false;
  private islaunchDataLoaded_ = false;
  private issatMissionDataLoaded_ = false;
  private isTopLinkEventListenersAdded_ = false;

  // Starting values of the collapsable sections
  private readonly isActionsSectionCollapsed_ = true;
  private readonly isIdentifiersSectionCollapsed_ = false;
  private readonly isOrbitalSectionCollapsed_ = false;
  private readonly isSecondaryDataSectionCollapsed_ = false;
  private readonly isSensorDataSectionCollapsed_ = false;
  private readonly isObjectDataSectionCollapsed_ = false;
  private readonly isMissionSectionCollapsed_ = false;

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

    Doris.getInstance().on(KeepTrackApiEvents.selectSatData, (obj: BaseObject): void => {
      /*
       * NOTE: This has to go first.
       * Register orbital element data
       */
      this.orbitalData(obj);
      // Register sensor data
      SatInfoBox.updateSensorInfo_(obj);
      // Register launch data
      SatInfoBox.updateLaunchData_(obj);
      // Register mission data
      SatInfoBox.updateSatMissionData_(obj);
      // Register object data
      SatInfoBox.updateObjectData_(obj);
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

    Doris.getInstance().on(KeepTrackApiEvents.AfterHtmlInitialize, this.uiManagerFinal_.bind(this));
  }

  addJs(): void {
    super.addJs();
    // eslint-disable-next-line complexity, max-statements
    Doris.getInstance().on(KeepTrackApiEvents.updateSelectBox, (obj: BaseObject) => {
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

            if (!newPosition || (newPosition?.x === 0 && newPosition?.y === 0 && newPosition?.z === 0)) {
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

          this.currentTEARR = currentTearr;
        } else {
          // Is Missile
          this.currentTEARR = missileManager.getMissileTEARR(obj as MissileObject);
        }

        const { gmst } = SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj);
        const lla = eci2lla(obj.position, gmst);

        const satLonElement = getEl('sat-longitude');
        const satLatElement = getEl('sat-latitude');

        if (satLonElement && satLatElement) {
          if (lla.lon >= 0) {
            satLonElement.innerHTML = `${lla.lon.toFixed(3)}°E`;
          } else {
            satLonElement.innerHTML = `${(lla.lon * -1).toFixed(3)}°W`;
          }
          if (lla.lat >= 0) {
            satLatElement.innerHTML = `${lla.lat.toFixed(3)}°N`;
          } else {
            satLatElement.innerHTML = `${(lla.lat * -1).toFixed(3)}°S`;
          }
        }

        const covMatrix = this.selectSatManager_.primarySatCovMatrix;
        let covRadial = covMatrix[0];
        let covCrossTrack = covMatrix[1];
        let covInTrack = covMatrix[2];

        const useKm =
          covRadial > 0.5 &&
          covCrossTrack > 0.5 &&
          covInTrack > 0.5;

        if (useKm) {
          getEl('sat-uncertainty-radial')!.innerHTML = `${(covMatrix[0]).toFixed(2)} km`;
          getEl('sat-uncertainty-crosstrack')!.innerHTML = `${(covMatrix[1]).toFixed(2)} km`;
          getEl('sat-uncertainty-intrack')!.innerHTML = `${(covMatrix[2]).toFixed(2)} km`;
        } else {
          covRadial *= 1000;
          covCrossTrack *= 1000;
          covInTrack *= 1000;
          getEl('sat-uncertainty-radial')!.innerHTML = `${covRadial.toFixed(2)} m`;
          getEl('sat-uncertainty-crosstrack')!.innerHTML = `${covCrossTrack.toFixed(2)} m`;
          getEl('sat-uncertainty-intrack')!.innerHTML = `${covInTrack.toFixed(2)} m`;
        }

        if (
          settingsManager.plugins?.stereoMap &&
          keepTrackApi.getPlugin(StereoMap)?.isMenuButtonActive &&
          timeManagerInstance.realTime > settingsManager.lastMapUpdateTime + 30000
        ) {
          keepTrackApi.getPlugin(StereoMap)?.updateMap();
          settingsManager.lastMapUpdateTime = timeManagerInstance.realTime;
        }

        const satAltitudeElement = getEl('sat-altitude');
        const satVelocityElement = getEl('sat-velocity');

        if (satAltitudeElement && satVelocityElement) {

          if (obj.isSatellite()) {
            const sat = obj as DetailedSatellite;
            const { gmst } = SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj);


            satAltitudeElement.innerHTML = `${SatMath.getAlt(sat.position, gmst).toFixed(2)} km`;
            satVelocityElement.innerHTML = `${sat.totalVelocity.toFixed(2)} km/s`;
          } else {
            const misl = obj as MissileObject;

            satAltitudeElement.innerHTML = `${(this.currentTEARR?.alt ?? 0).toFixed(2)} km`;
            if (misl.totalVelocity) {
              satVelocityElement.innerHTML = `${misl.totalVelocity.toFixed(2)} km/s`;
            } else {
              satVelocityElement.innerHTML = 'Unknown';
            }
          }
        }

        this.updateSatelliteTearrData_(obj, sensorManagerInstance, timeManagerInstance);

        if (this.selectSatManager_.secondarySat !== -1 && getEl('secondary-sat-info')?.style?.display === 'none') {
          showEl('secondary-sat-info');
          showEl('sec-angle-link');
        } else if (this.selectSatManager_.secondarySat === -1 && getEl('secondary-sat-info')?.style?.display !== 'none') {
          hideEl('secondary-sat-info');
          hideEl('sec-angle-link');
        }

        if (this.selectSatManager_.secondarySatObj && obj.isSatellite()) {
          const sat = obj as DetailedSatellite;
          const ric = CoordinateTransforms.sat2ric(this.selectSatManager_.secondarySatObj, sat);
          const dist = SensorMath.distanceString(sat, this.selectSatManager_.secondarySatObj).split(' ')[2];

          const satDistanceElement = getEl('sat-sec-dist');
          const satRadiusElement = getEl('sat-sec-rad');
          const satInTrackElement = getEl('sat-sec-intrack');
          const satCrossTrackElement = getEl('sat-sec-crosstrack');

          if (satDistanceElement && satRadiusElement && satInTrackElement && satCrossTrackElement) {
            satDistanceElement.innerHTML = `${dist} km`;
            satRadiusElement.innerHTML = `${ric.position[0].toFixed(2)}km`;
            satInTrackElement.innerHTML = `${ric.position[1].toFixed(2)}km`;
            satCrossTrackElement.innerHTML = `${ric.position[2].toFixed(2)}km`;
          } else {
            errorManagerInstance.debug('Error updating secondary satellite info!');
          }
        }

        const nextPassElement = getEl('sat-nextpass');

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
              if (nextPassElement) {
                nextPassElement.innerHTML = 'Beyond Max Range';
              }
            } else if (nextPassElement) {
              nextPassElement.innerHTML = SensorMath.nextpass(sat, sensorManagerInstance.currentSensors, 2, 5);
            }

            /*
             *  IDEA: Code isInSun()
             * sun.getXYZ();
             * lineManager.create('ref',[sun.sunvar.position.x,sun.sunvar.position.y,sun.sunvar.position.z]);
             */
          }
          uiManagerInstance.lastNextPassCalcSatId = this.selectSatManager_.selectedSat;
          uiManagerInstance.lastNextPassCalcSensorShortName = sensorManagerInstance.currentSensors[0]?.objName ?? '';
        } else if (nextPassElement) {
          nextPassElement.innerHTML = 'Unavailable';
        }
      } catch (e) {
        errorManagerInstance.debug('Error updating satellite info!');
      }
    });

    Doris.getInstance().on(KeepTrackApiEvents.onWatchlistUpdated, (watchlistList: { id: number, inView: boolean }[]) => {
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
    });

    Doris.getInstance().on(KeepTrackApiEvents.selectSatData, this.selectSat_.bind(this));
  }

  private updateSatelliteTearrData_(obj: BaseObject, sensorManagerInstance: SensorManager, timeManagerInstance: TimeManager) {
    const elements = {
      az: getEl('sat-azimuth'),
      el: getEl('sat-elevation'),
      rng: getEl('sat-range'),
      vmag: getEl('sat-vmag'),
      beamwidth: getEl('sat-beamwidth'),
      maxTmx: getEl('sat-maxTmx'),
    };

    if (this.currentTEARR.inView) {
      this.updateSatTearrInFov_(elements, obj, sensorManagerInstance, timeManagerInstance);
    } else {
      this.updateSatTearrOutFov_(elements, sensorManagerInstance);
    }
  }

  private updateSatTearrOutFov_(elements: {
    az: HTMLElement | null; el: HTMLElement | null; rng: HTMLElement | null; vmag: HTMLElement | null; beamwidth: HTMLElement | null;
    maxTmx: HTMLElement | null;
  }, sensorManagerInstance: SensorManager) {
    if (elements.vmag) {
      elements.vmag.innerHTML = 'Out of FOV';
    }
    if (elements.az) {
      elements.az.innerHTML = 'Out of FOV';
      elements.az.title = `Azimuth: ${this.currentTEARR.az.toFixed(0)}°`;
    }

    if (elements.el) {
      elements.el.innerHTML = 'Out of FOV';
      elements.el.title = `Elevation: ${this.currentTEARR.el.toFixed(1)}°`;
    }

    if (elements.rng) {
      elements.rng.innerHTML = 'Out of FOV';
      elements.rng.title = `Range: ${this.currentTEARR.rng.toFixed(2)} km`;
    }

    let beamwidthString = 'Unknown';

    if (sensorManagerInstance.currentSensors[0] instanceof RfSensor) {
      beamwidthString = sensorManagerInstance.currentSensors[0]?.beamwidth ? `${sensorManagerInstance.currentSensors[0].beamwidth}°` : 'Unknown';
    }
    if (elements.beamwidth) {
      elements.beamwidth.innerHTML = 'Out of FOV';
    }
    if (elements.beamwidth) {
      elements.beamwidth.title = beamwidthString;
    }
    if (elements.maxTmx) {
      elements.maxTmx.innerHTML = 'Out of FOV';
    }
  }

  private updateSatTearrInFov_(elements: {
    az: HTMLElement | null; el: HTMLElement | null; rng: HTMLElement | null; vmag: HTMLElement | null; beamwidth: HTMLElement | null;
    maxTmx: HTMLElement | null;
  }, obj: BaseObject, sensorManagerInstance: SensorManager, timeManagerInstance: TimeManager) {
    if (elements.az) {
      elements.az.innerHTML = `${this.currentTEARR.az.toFixed(0)}°`;
    } // Convert to Degrees
    if (elements.el) {
      elements.el.innerHTML = `${this.currentTEARR.el.toFixed(1)}°`;
    }
    if (elements.rng) {
      elements.rng.innerHTML = `${this.currentTEARR.rng.toFixed(2)} km`;
    }
    const sun = keepTrackApi.getScene().sun;

    if (elements.vmag) {
      if (obj.isMissile()) {
        elements.vmag.innerHTML = 'N/A';
      } else {
        const sat = obj as DetailedSatellite;

        elements.vmag.innerHTML = SatMath.calculateVisMag(sat, sensorManagerInstance.currentSensors[0], timeManagerInstance.simulationTimeObj, sun).toFixed(2);
      }
    }
    let beamwidthString = 'Unknown';

    if (sensorManagerInstance.currentSensors[0] instanceof RfSensor) {
      beamwidthString = sensorManagerInstance.currentSensors[0].beamwidth
        ? `${(this.currentTEARR.rng * Math.sin(DEG2RAD * sensorManagerInstance.currentSensors[0].beamwidth)).toFixed(2)} km`
        : 'Unknown';
    }
    if (elements.beamwidth) {
      elements.beamwidth.innerHTML = beamwidthString;
    }
    if (elements.maxTmx) {
      // Time for RF to hit target and bounce back
      elements.maxTmx.innerHTML = `${((this.currentTEARR.rng / cKmPerMs) * 2).toFixed(2)} ms`;
    }
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

  private addListenerToCollapseElement_(collapseEl: HTMLElement | null, section: HTMLElement | null, isCollapsedRef: { value: boolean }): void {
    if (!collapseEl || !section) {
      return;
    }

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

  orbitalData(obj: BaseObject): void {
    // Only show orbital data if it is available
    if (obj === null || typeof obj === 'undefined') {
      return;
    }

    if (obj.isSatellite()) {
      this.updateOrbitData_(obj as DetailedSatellite);
    }
  }

  private nearObjectsLinkClick_(distance: number = 100): void {
    keepTrackApi.getSoundManager().play(SoundNames.CLICK);
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    if (this.selectSatManager_.selectedSat === -1) {
      return;
    }
    const selectedSatelliteId = this.selectSatManager_.selectedSat;
    const sat = catalogManagerInstance.getObject(selectedSatelliteId, GetSatType.POSITION_ONLY);

    if (!sat) {
      errorManagerInstance.warn('No satellite selected!');

      return;
    }

    const SccNums: string[] = [];
    let pos = sat.position;
    const posXmin = pos.x - distance;
    const posXmax = pos.x + distance;
    const posYmin = pos.y - distance;
    const posYmax = pos.y + distance;
    const posZmin = pos.z - distance;
    const posZmax = pos.z + distance;

    (<HTMLInputElement>getEl('search')).value = '';
    for (let i = 0; i < catalogManagerInstance.numSatellites; i++) {
      const satelliteAtIndex = catalogManagerInstance.getObject(i, GetSatType.POSITION_ONLY);

      if (!satelliteAtIndex) {
        errorManagerInstance.debug(`No satellite at index ${i}`);
        continue;
      }

      pos = satelliteAtIndex.position;
      if (pos.x < posXmax && pos.x > posXmin && pos.y < posYmax && pos.y > posYmin && pos.z < posZmax && pos.z > posZmin) {
        const sat = catalogManagerInstance.getSat(i, GetSatType.EXTRA_ONLY);

        if (sat) {
          SccNums.push(sat.sccNum);
        }
      }
    }

    for (let i = 0; i < SccNums.length; i++) {
      (<HTMLInputElement>getEl('search')).value += i < SccNums.length - 1 ? `${SccNums[i]},` : SccNums[i];
    }

    keepTrackApi.getUiManager().doSearch((<HTMLInputElement>getEl('search')).value.toString());
  }

  private nearOrbitsLink_() {
    keepTrackApi.getSoundManager().play(SoundNames.CLICK);
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const selectedSatellite = catalogManagerInstance.getSat(this.selectSatManager_.selectedSat);

    if (!selectedSatellite) {
      errorManagerInstance.warn('No satellite selected!');

      return;
    }

    const nearbyObjects = CatalogSearch.findObjsByOrbit(catalogManagerInstance.getSats(), selectedSatellite);
    const searchStr = SearchManager.doArraySearch(catalogManagerInstance, nearbyObjects);

    keepTrackApi.getUiManager().searchManager.doSearch(searchStr, false);
  }

  private allObjectsLink_(): void {
    keepTrackApi.getSoundManager().play(SoundNames.CLICK);
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const selectedSatelliteData = catalogManagerInstance.getSat(this.selectSatManager_.selectedSat, GetSatType.EXTRA_ONLY);

    if (!selectedSatelliteData) {
      return;
    }
    const searchStr = selectedSatelliteData.intlDes.slice(0, 8);

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

  private updateOrbitData_(sat: DetailedSatellite): void {
    if (sat.isSatellite()) {
      getEl('sat-apogee')!.innerHTML = `${sat.apogee.toFixed(0)} km`;
      getEl('sat-perigee')!.innerHTML = `${sat.perigee.toFixed(0)} km`;
      getEl('sat-inclination')!.innerHTML = `${sat.inclination.toFixed(2)}°`;
      getEl('sat-eccentricity')!.innerHTML = sat.eccentricity.toFixed(3);
      getEl('sat-raan')!.innerHTML = `${sat.rightAscension.toFixed(2)}°`;
      getEl('sat-argPe')!.innerHTML = `${sat.argOfPerigee.toFixed(2)}°`;

      const periodDom = getEl('sat-period')!;

      periodDom.innerHTML = `${sat.period.toFixed(2)} min`;
      periodDom.dataset.position = 'top';
      periodDom.dataset.delay = '50';
      periodDom.dataset.tooltip = `Mean Motion: ${(MINUTES_PER_DAY / sat.period).toFixed(2)}`;

      const now: Date | number | string = new Date();
      const daysold = sat.ageOfElset(now);
      const age = daysold >= 1 ? daysold : daysold * 24;
      const units = daysold >= 1 ? 'Days' : 'Hours';
      const elsetAgeDom = getEl('sat-elset-age')!;

      elsetAgeDom.innerHTML = `${age.toFixed(2)} ${units}`;

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
  }

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
      const confidenceScore = SatMath.calculateSatConfidenceScore(sat);

      if (settingsManager.dataSources.externalTLEsOnly) {
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

  private static updateObjectData_(obj: BaseObject): void {
    if (!obj || obj.isStatic() || obj.isSensor()) {
      return;
    }

    const isHasAltName: boolean = !!((obj as DetailedSatellite)?.altName && (obj as DetailedSatellite).altName !== '');
    const isHasAltId: boolean = !!((obj as DetailedSatellite)?.altId && (obj as DetailedSatellite).altId !== '');

    getEl('sat-info-title-name')!.innerHTML = obj.name;

    if (obj.isSatellite() && (obj as DetailedSatellite).sccNum5 === '25544') {
      getEl('sat-infobox-fi')!.classList.value = 'fi fi-iss';
    } else {
      getEl('sat-infobox-fi')!.classList.value = `fi ${country2flagIcon((obj as DetailedSatellite).country)}`;
    }

    if (isHasAltName) {
      showEl(getEl('sat-alt-name')!.parentElement!, 'flex');
      getEl('sat-alt-name')!.innerHTML = (obj as DetailedSatellite).altName;
    } else {
      hideEl(getEl('sat-alt-name')!.parentElement!);
    }

    if (isHasAltId) {
      showEl(getEl('sat-alt-id')!.parentElement!, 'flex');
      getEl('sat-alt-id')!.innerHTML = (obj as DetailedSatellite).altId;
    } else {
      hideEl(getEl('sat-alt-id')!.parentElement!);
    }

    const watchlistPlugin = keepTrackApi.getPlugin(WatchlistPlugin);

    if (watchlistPlugin) {
      if (watchlistPlugin.isOnWatchlist(obj.id)) {
        getEl('sat-remove-watchlist')!.style.display = 'block';
        getEl('sat-add-watchlist')!.style.display = 'none';
      } else {
        getEl('sat-add-watchlist')!.style.display = 'block';
        getEl('sat-remove-watchlist')!.style.display = 'none';
      }
    } else {
      getEl('sat-add-watchlist')!.style.display = 'none';
      getEl('sat-remove-watchlist')!.style.display = 'none';
    }

    SatInfoBox.updateSatType_(obj);
    SatInfoBox.updateSatStatus_(obj);

    /*
     * TODO:
     * getEl('edit-satinfo-link').innerHTML = "<a class='iframe' href='editor.htm?scc=" + sat.sccNum + "&popup=true'>Edit Satellite Info</a>";
     */

    if (obj.isMissile()) {
      getEl('sat-intl-des')!.innerHTML = 'N/A';
      getEl('sat-objnum')!.innerHTML = 'N/A';
      getEl('sat-source')!.innerHTML = 'N/A';
    } else {
      const sat = obj as DetailedSatellite;

      getEl('sat-intl-des')!.innerHTML = sat.intlDes === 'none' ? 'N/A' : sat.intlDes;
      if (sat.source && sat.source === CatalogSource.VIMPEL) {
        getEl('sat-objnum')!.innerHTML = 'N/A';
        getEl('sat-intl-des')!.innerHTML = 'N/A';
      } else {
        getEl('sat-objnum')!.innerHTML = sat.sccNum;
        // satObjNumDom.setAttribute('data-tooltip', `${FormatTle.convert6DigitToA5(sat.sccNum)}`);
      }

      getEl('sat-source')!.innerHTML = sat.source || CatalogSource.CELESTRAK;
      SatInfoBox.updateRcsData_(sat);
    }
  }

  private static updateLaunchData_(obj?: BaseObject) {
    if (!obj || (!obj.isSatellite() && !obj.isMissile())) {
      return;
    }
    const satMisl = obj as DetailedSatellite | MissileObject;

    SatInfoBox.updateCountryCorrelationTable_(satMisl);
    SatInfoBox.updateLaunchSiteCorrelationTable_(satMisl);

    SatInfoBox.updateLaunchVehicleCorrelationTable_(obj);

    if (satMisl.isMissile()) {
      return;
    }

    const sat = satMisl as DetailedSatellite;

    getEl('sat-configuration')!.innerHTML = sat.configuration !== '' ? sat.configuration : 'Unknown';
  }

  private static updateLaunchVehicleCorrelationTable_(obj: BaseObject) {
    let satVehicleDom = getEl('sat-vehicle');

    if (!satVehicleDom) {
      errorManagerInstance.debug('sat-vehicle element not found');

      return;
    }

    const tempEl = satVehicleDom.cloneNode(true);

    if (!satVehicleDom.parentNode) {
      errorManagerInstance.debug('sat-vehicle element parent not found');

      return;
    }

    // Remove any existing event listeners
    satVehicleDom.parentNode.replaceChild(tempEl, satVehicleDom);

    // Update links
    satVehicleDom = getEl('sat-vehicle');

    if (!satVehicleDom) {
      errorManagerInstance.debug('sat-vehicle element not found');

      return;
    }

    if (obj.isMissile()) {
      const missile = obj as MissileObject;

      missile.launchVehicle = missile.desc.split('(')[1].split(')')[0]; // Remove the () from the booster type
      satVehicleDom.innerHTML = missile.launchVehicle;
    } else {
      const sat = obj as DetailedSatellite;

      satVehicleDom.innerHTML = sat.launchVehicle; // Set to JSON record
      if (sat.launchVehicle === 'U') {
        satVehicleDom.innerHTML = 'Unknown';
      } // Replace with Unknown if necessary
      const satLvString = StringExtractor.extractLiftVehicle(sat.launchVehicle); // Replace with link if available

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
  }

  private static updateLaunchSiteCorrelationTable_(obj: BaseObject) {
    let siteArr: string[] = [];
    const site = {
      site: 'Unknown',
      launchPad: 'Unknown',
      wikiUrl: null as string | null,
    };
    let missileOrigin: string;

    if (obj.isMissile()) {
      const misl = obj as MissileObject;

      siteArr = misl.desc.split('(');
      missileOrigin = siteArr[0].slice(0, siteArr[0].length - 1);

      site.site = missileOrigin;
      site.launchPad = 'Unknown';
    } else {
      const sat = obj as DetailedSatellite;

      // Enhanced Catalog uses full names
      if (sat.launchSite?.length > 6) {
        site.site = sat.launchSite;
      } else {
        const launchData = StringExtractor.extractLaunchSite(sat.launchSite);

        site.site = launchData.site;
        site.wikiUrl = launchData.wikiUrl;
      }

      site.launchPad = sat.launchPad;
    }

    const launchSiteElement = getEl('sat-launchSite');
    const launchPadElement = getEl('sat-launchPad');

    if (!launchSiteElement || !launchPadElement) {
      errorManagerInstance.debug('sat-launchSite or sat-launchPad element not found');

      return;
    }

    launchPadElement.innerHTML = site.launchPad;

    if (site.wikiUrl) {
      launchSiteElement.innerHTML = `<a class="iframe" href="${site.wikiUrl}">${site.site}</a>`;
      launchSiteElement.classList.add('pointable');
      launchSiteElement.addEventListener('click', (e) => {
        e.preventDefault();
        openColorbox((<HTMLAnchorElement>launchSiteElement.firstChild).href);
      });
    } else {
      launchSiteElement.innerHTML = site.site;
      launchSiteElement.classList.remove('pointable');
    }

  }

  private static updateCountryCorrelationTable_(obj: DetailedSatellite | MissileObject) {
    const satCountryElement = getEl('sat-country');

    if (!satCountryElement) {
      errorManagerInstance.debug('sat-country element not found');

      return;
    }

    if (obj.country?.length > 4) {
      satCountryElement.innerHTML = obj.country;
    } else {
      const country = StringExtractor.extractCountry(obj.country);

      satCountryElement.innerHTML = country;
    }
  }

  private static createLaunchData_() {
    getEl(SatInfoBox.containerId_)?.insertAdjacentHTML(
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
            <div class="sat-info-row">
              <div class="sat-info-key" data-position="top" data-delay="50"
                data-tooltip="Type of Object">Status</div>
              <div class="sat-info-value" id="sat-status">STATUS</div>
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
                <div id="sat-launchSite">LAUNCH SITE</div>
                <div id="sat-launchPad">LAUNCH PAD</div>
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
    getEl(SatInfoBox.containerId_)?.insertAdjacentHTML(
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
    getEl('ui-wrapper')?.insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
      <div id="sat-infobox" class="text-select satinfo-fixed start-hidden">
        <div id="sat-info-header">
          <div id="sat-info-title" class="center-text sat-info-section-header">
            <img id="sat-add-watchlist" src="${bookmarkAddPng}"/>
            <img id="sat-remove-watchlist" src="${bookmarkRemovePng}"/>
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
            data-tooltip="Visualize RIC Vector">Draw sat RIC frame...</div>
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
            <div class="sat-info-value" id="sat-alt-id">99999</div>
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
              data-tooltip="Time Since Official Orbit Calculated (Older GPs are Less Accuarate Usually)">
              Age of GP
            </div>
            <div class="sat-info-value" id="sat-elset-age">xxx.xxxx</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Radial Uncertainty (meters)">
              Radial Sigma
            </div>
            <div class="sat-info-value" id="sat-uncertainty-radial">xxx.xxxx</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="In Track Uncertainty (meters)">
              In Track Sigma
            </div>
            <div class="sat-info-value" id="sat-uncertainty-intrack">xxx.xxxx</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Cross Track Uncertainty (meters)">
              Cross Track Sigma
            </div>
            <div class="sat-info-value" id="sat-uncertainty-crosstrack">xxx.xxxx</div>
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
        const satInfoBoxElement = getEl(SatInfoBox.containerId_)!;

        satInfoBoxElement.style.height = 'fit-content';
        satInfoBoxElement.style.maxHeight = '80%';
        document.documentElement.style.setProperty('--search-box-bottom', '0px');
        satInfoBoxElement.classList.remove('satinfo-fixed');

        getEl('search-results')!.style.maxHeight = '80%';
      });
    }

    // If right click kill and reinit
    const satInfobox = getEl(SatInfoBox.containerId_)!;

    satInfobox.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 2) {
        SatInfoBox.resetMenuLocation(satInfobox);
        getEl('search-results')!.style.maxHeight = '';
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

  static resetMenuLocation(satInfoboxDom: HTMLElement | null, isShow = true) {
    if (!satInfoboxDom) {
      return;
    }

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
    const satTypeElement = getEl('sat-type');

    if (!satTypeElement) {
      errorManagerInstance.debug('sat-type element not found');

      return;
    }

    switch (obj.type) {
      case SpaceObjectType.UNKNOWN:
        satTypeElement.innerHTML = 'TBA';
        break;
      case SpaceObjectType.PAYLOAD:
        satTypeElement.innerHTML = 'Payload';
        break;
      case SpaceObjectType.ROCKET_BODY:
        satTypeElement.innerHTML = 'Rocket Body';
        break;
      case SpaceObjectType.DEBRIS:
        satTypeElement.innerHTML = 'Debris';
        break;
      case SpaceObjectType.SPECIAL:
        satTypeElement.innerHTML = 'Special';
        break;
      default:
        if (obj.isMissile()) {
          satTypeElement.innerHTML = 'Ballistic Missile';
        }
    }
  }

  private static updateSatStatus_(obj: BaseObject) {
    const satStatusElement = getEl('sat-status');
    const satStatusParentElement = satStatusElement?.parentElement;

    if (!satStatusElement) {
      errorManagerInstance.debug('sat-status element not found');

      return;
    }

    if (!satStatusParentElement) {
      errorManagerInstance.debug('sat-status parent element not found');

      return;
    }

    if (obj.type !== SpaceObjectType.PAYLOAD) {
      satStatusParentElement.style.display = 'none';

      return;
    }
    satStatusParentElement.style.display = 'flex';

    const sat = obj as DetailedSatellite;

    switch (sat.status) {
      case PayloadStatus.OPERATIONAL:
        satStatusElement.innerHTML = 'Operational';
        break;
      case PayloadStatus.NONOPERATIONAL:
        satStatusElement.innerHTML = 'Non-Operational';
        break;
      case PayloadStatus.PARTIALLY_OPERATIONAL:
        satStatusElement.innerHTML = 'Partially Operational';
        break;
      case PayloadStatus.EXTENDED_MISSION:
        satStatusElement.innerHTML = 'Extended Mission';
        break;
      case PayloadStatus.BACKUP_STANDBY:
        satStatusElement.innerHTML = 'Backup Standby';
        break;
      case PayloadStatus.SPARE:
        satStatusElement.innerHTML = 'Spare';
        break;
      case PayloadStatus.UNKNOWN:
      default:
        satStatusElement.innerHTML = 'Unknown';
    }
  }

  private static updateRcsData_(sat: DetailedSatellite) {
    const satRcsEl = getEl('sat-rcs');

    if (!satRcsEl) {
      errorManagerInstance.debug('sat-rcs element not found');

      return;
    }

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

  // eslint-disable-next-line complexity
  private static updateSatMissionData_(obj?: BaseObject) {
    if (obj === null || typeof obj === 'undefined') {
      return;
    }

    if (obj.isSatellite()) {
      const sat = obj as DetailedSatellite;

      keepTrackApi.containerRoot.querySelectorAll('.sat-only-info')?.forEach((el) => {
        (<HTMLElement>el).style.display = 'flex';
      });
      let satUserDom = getEl('sat-user')!;
      const satUserString = StringExtractor.extractUserUrl(sat?.owner); // Replace with link if available

      satUserDom.innerHTML = satUserString;
      const tempEl = satUserDom.cloneNode(true);

      satUserDom.parentNode!.replaceChild(tempEl, satUserDom);
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


      const satMissionElement = getEl('sat-mission');
      const satPurposeElement = getEl('sat-purpose');
      const satContractorElement = getEl('sat-contractor');
      const satLaunchMassElement = getEl('sat-launchMass');
      const satDryMassElement = getEl('sat-dryMass');
      const satLifetimeElement = getEl('sat-lifetime');
      const satPowerElement = getEl('sat-power');
      const satStandardMagnitudeElement = getEl('sat-stdmag');
      const satBusElement = getEl('sat-bus');
      const satConfigurationElement = getEl('sat-configuration');
      const satPayloadElement = getEl('sat-payload');
      const satEquipmentElement = getEl('sat-equipment');
      const satMotorElement = getEl('sat-motor');
      const satLengthElement = getEl('sat-length');
      const satDiameterElement = getEl('sat-diameter');
      const satSpanElement = getEl('sat-span');
      const satShapeElement = getEl('sat-shape');

      if (!satMissionElement || !satPurposeElement || !satContractorElement || !satLaunchMassElement || !satDryMassElement || !satLifetimeElement || !satPowerElement ||
        !satStandardMagnitudeElement || !satBusElement || !satConfigurationElement || !satPayloadElement || !satEquipmentElement || !satMotorElement || !satLengthElement ||
        !satDiameterElement || !satSpanElement || !satShapeElement) {
        errorManagerInstance.warn('One or more updateSatMissionData_ elements not found');

        return;
      }

      satMissionElement.innerHTML = sat?.mission && sat?.mission !== '' ? sat?.mission : 'Unknown';
      satPurposeElement.innerHTML = sat?.purpose && sat?.purpose !== '' ? sat?.purpose : 'Unknown';
      satContractorElement.innerHTML = sat?.manufacturer && sat?.manufacturer !== '' ? sat?.manufacturer : 'Unknown';
      // Update with other mass options
      satLaunchMassElement.innerHTML = sat?.launchMass && sat?.launchMass !== '' ? `${sat?.launchMass} kg` : 'Unknown';
      satDryMassElement.innerHTML = sat?.dryMass && sat?.dryMass !== '' ? `${sat?.dryMass} kg` : 'Unknown';
      satLifetimeElement.innerHTML = sat?.lifetime && sat?.lifetime !== '' ? `${sat?.lifetime} yrs` : 'Unknown';
      satPowerElement.innerHTML = sat?.power && sat?.power !== '' ? `${sat?.power} w` : 'Unknown';
      if (!sat?.vmag && sat?.vmag !== 0) {
        sat.vmag = SatInfoBox.calculateStdMag_(sat);
      }
      satStandardMagnitudeElement.innerHTML = sat?.vmag && sat?.vmag?.toFixed(2) !== '' ? sat?.vmag?.toFixed(2) : 'Unknown';
      satBusElement.innerHTML = sat?.bus && sat?.bus !== '' ? sat?.bus : 'Unknown';
      satConfigurationElement.innerHTML = sat?.configuration && sat?.configuration !== '' ? sat?.configuration : 'Unknown';
      satPayloadElement.innerHTML = sat?.payload && sat?.payload !== '' ? sat?.payload : 'Unknown';
      satEquipmentElement.innerHTML = sat?.equipment && sat?.equipment !== '' ? sat?.equipment : 'Unknown';
      satMotorElement.innerHTML = sat?.motor && sat?.motor !== '' ? sat?.motor : 'Unknown';
      satLengthElement.innerHTML = sat?.length && sat?.length !== '' ? `${sat?.length} m` : 'Unknown';
      satDiameterElement.innerHTML = sat?.diameter && sat?.diameter !== '' ? `${sat?.diameter} m` : 'Unknown';
      satSpanElement.innerHTML = sat?.span && sat?.span !== '' ? `${sat?.span} m` : 'Unknown';
      satShapeElement.innerHTML = sat?.shape && sat?.shape !== '' ? sat?.shape : 'Unknown';
    } else {
      const satInfoElement = (<HTMLElement>keepTrackApi.containerRoot).querySelector('.sat-only-info');

      if (satInfoElement) {
        (<HTMLElement>satInfoElement).style.display = 'none';
      } else {
        errorManagerInstance.debug('sat-only-info element not found');
      }
    }
  }

  private static calculateStdMag_(obj: DetailedSatellite): number | null {
    if (obj.vmag) {
      return obj.vmag;
    }

    const similarVmag: number[] = [];
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
    getEl(SatInfoBox.containerId_)?.insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
        <div id="sat-mission-data" class="start hidden">
          <div class="sat-info-section-header">
            Mission
            <span id="mission-section-collapse" class="section-collapse material-icons" style="position: absolute; right: 0;">expand_less</span>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Overview of the Satellite's Mission">
              Mission
            </div>
            <div class="sat-info-value" id="sat-mission">
              NO DATA
            </div>
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
              data-tooltip="Equipment on the Satellite">
              Equipment
            </div>
            <div class="sat-info-value" id="sat-equipment">
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

    if (!sensorManagerInstance.isSensorSelected()) {
      const satSunDom = getEl('sat-sun');

      if (satSunDom?.parentElement) {
        satSunDom.parentElement.style.display = 'none';
      }
    } else {
      SatInfoBox.calculateSunStatus_(obj);
    }
  }

  private static calculateSunStatus_(obj: BaseObject) {
    let satInSun: SunStatus;
    let sunTime: SunTime;
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    let now = new Date(timeManagerInstance.simulationTimeObj.getTime());

    try {
      sunTime = Sun.getTimes(now, sensorManagerInstance.currentSensors[0].lat, sensorManagerInstance.currentSensors[0].lon);
      satInSun = SatMath.calculateIsInSun(obj, keepTrackApi.getScene().sun.eci);
    } catch {
      sunTime = {
        sunriseStart: new Date(2050),
        sunsetEnd: new Date(1970),
      } as SunTime;
      satInSun = SunStatus.UNKNOWN;
    }

    // Reset the time to the current simulation time
    now = new Date(timeManagerInstance.simulationTimeObj.getTime());

    // If No Sensor, then Ignore Sun Exclusion
    const satSunDom = getEl('sat-sun');

    if (satSunDom?.parentElement) {
      // If No Sensor, then Ignore Sun Exclusion
      if (!sensorManagerInstance.isSensorSelected()) {
        satSunDom.parentElement.style.display = 'none';

        return;
      }
      satSunDom.parentElement.style.display = 'flex';

      // If Radar Selected, then Say the Sun Doesn't Matter
      if (sensorManagerInstance.currentSensors[0].type !== SpaceObjectType.OPTICAL && sensorManagerInstance.currentSensors[0].type !== SpaceObjectType.OBSERVER) {
        satSunDom.innerHTML = 'No Effect';
        satSunDom.style.color = 'green';

        return;
      }

      // If we are in the sun exclusion zone, then say so
      if (sunTime?.sunriseStart.getTime() - now.getTime() < 0 && (sunTime?.sunsetEnd.getTime() - now.getTime() > 0)) {
        // Unless you are in sun exclusion
        satSunDom.innerHTML = 'Sun Exclusion';
        satSunDom.style.color = 'red';

        return;
      }

      // If it is night then tell the user if the satellite is illuminated
      switch (satInSun) {
        case SunStatus.UMBRAL:
          satSunDom.innerHTML = 'No Sunlight';
          satSunDom.style.color = 'red';
          break;
        case SunStatus.PENUMBRAL:
          satSunDom.innerHTML = 'Limited Sunlight';
          satSunDom.style.color = 'orange';
          break;
        case SunStatus.SUN:
          satSunDom.innerHTML = 'Direct Sunlight';
          satSunDom.style.color = 'green';
          break;
        case SunStatus.UNKNOWN:
        default:
          satSunDom.innerHTML = 'Unable to Calculate';
          satSunDom.style.color = 'red';
          break;
      }
    }
  }

  private static createSensorInfo() {
    getEl(SatInfoBox.containerId_)?.insertAdjacentHTML(
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

        if (!el?.parentElement) {
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

        if (!el?.parentElement) {
          return;
        }
        el.parentElement.style.display = 'flex';
      },
    );

    const satMissionData = getEl('sat-mission-data', true);

    if (settingsManager.isMissionDataEnabled) {
      satMissionData!.style.display = 'block';
    } else {
      satMissionData!.style.display = 'none';
    }

    const satIdentifierData = getEl('sat-identifier-data', true);

    if (satIdentifierData) {
      satIdentifierData.style.display = 'block';
    }
  }
}
