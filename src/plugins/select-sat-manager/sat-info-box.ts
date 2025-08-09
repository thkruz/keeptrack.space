/* eslint-disable max-lines */
import { KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { InputEventType, keepTrackApi } from '@app/keepTrackApi';
import { getEl, hideEl, showEl } from '@app/lib/get-el';
import { MissileObject } from '@app/singletons/catalog-manager/MissileObject';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { TimeManager } from '@app/singletons/time-manager';
import { CoordinateTransforms } from '@app/static/coordinate-transforms';
import { SatMath } from '@app/static/sat-math';
import { SensorMath, TearrData } from '@app/static/sensor-math';
import { BaseObject, DEG2RAD, DetailedSatellite, RfSensor, cKmPerMs, eci2lla } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { missileManager } from '../missile/missile-manager';
import { SensorManager } from '../sensor/sensorManager';
import { SoundNames } from '../sounds/SoundNames';
import { StereoMap } from '../stereo-map/stereo-map';
import { SatInfoBoxComponents } from './sat-info-box-components';
import { SAT_INFO_BOX_CONSTANTS as SIB } from './sat-info-box-constants';
import { SatInfoBoxHandlers } from './sat-info-box-handlers';
import { SatInfoBoxUpdaters } from './sat-info-box-updaters';
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
  private readonly elements_: {
    html: string | null;
    order: number;
  }[] = [];

  constructor() {
    super();
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  static readonly containerId_ = 'sat-infobox';

  // Starting values of the collapsable sections
  private readonly isActionsSectionCollapsed_ = true;
  private readonly isLinksSectionCollapsed_ = true;
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

    keepTrackApi.on(KeepTrackApiEvents.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.on(
      KeepTrackApiEvents.updateSelectBox,
      // eslint-disable-next-line complexity, max-statements
      (obj: BaseObject) => {
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

            const lla = eci2lla(sat.position, keepTrackApi.getTimeManager().gmst);
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

          const gmst = keepTrackApi.getTimeManager().gmst;
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
            settingsManager.plugins?.StereoMap &&
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
              const gmst = keepTrackApi.getTimeManager().gmst;

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
      },
    );

    keepTrackApi.on(
      KeepTrackApiEvents.onWatchlistUpdated,
      (watchlistList: { id: number, inView: boolean }[]) => {
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
    );

    keepTrackApi.on(KeepTrackApiEvents.selectSatData, SatInfoBoxUpdaters.updateOrbitData_.bind(SatInfoBoxUpdaters));
    keepTrackApi.on(KeepTrackApiEvents.selectSatData, SatInfoBoxUpdaters.updateSensorInfo_.bind(SatInfoBoxUpdaters));
    keepTrackApi.on(KeepTrackApiEvents.selectSatData, SatInfoBoxUpdaters.updateLaunchData_.bind(SatInfoBoxUpdaters));
    keepTrackApi.on(KeepTrackApiEvents.selectSatData, SatInfoBoxUpdaters.updateSatMissionData_.bind(SatInfoBoxUpdaters));
    keepTrackApi.on(KeepTrackApiEvents.selectSatData, SatInfoBoxUpdaters.updateObjectData_.bind(SatInfoBoxUpdaters));

    keepTrackApi.on(InputEventType.KeyDown, SatInfoBoxHandlers.onKeyDownLowerI.bind(SatInfoBoxHandlers));
    keepTrackApi.on(KeepTrackApiEvents.selectSatData, (obj?: BaseObject) => SatInfoBoxHandlers.selectSat(this, obj));

    keepTrackApi.on(KeepTrackApiEvents.satInfoBoxAddListeners, () => {
      getEl(SIB.EL.HEADER.ADD_WATCHLIST)?.addEventListener('click', this.withClickSound(SatInfoBoxHandlers.addRemoveWatchlist_.bind(SatInfoBoxHandlers)));
      getEl(SIB.EL.HEADER.REMOVE_WATCHLIST)?.addEventListener('click', this.withClickSound(SatInfoBoxHandlers.addRemoveWatchlist_.bind(SatInfoBoxHandlers)));
      getEl(SIB.EL.ACTIONS.ALL_OBJECTS_LINK)?.addEventListener('click', this.withClickSound(SatInfoBoxHandlers.allObjectsLink_.bind(SatInfoBoxHandlers)));
      getEl(SIB.EL.ACTIONS.NADIR_ANGLE_LINK)?.addEventListener('click', this.withClickSound(SatInfoBoxHandlers.nearOrbitsLink_.bind(SatInfoBoxHandlers)));
      getEl(SIB.EL.ACTIONS.NEAR_OBJECTS_LINK1)?.addEventListener('click', this.withClickSound(() => SatInfoBoxHandlers.nearObjectsLinkClick_(100)));
      getEl(SIB.EL.ACTIONS.NEAR_OBJECTS_LINK2)?.addEventListener('click', this.withClickSound(() => SatInfoBoxHandlers.nearObjectsLinkClick_(200)));
      getEl(SIB.EL.ACTIONS.NEAR_OBJECTS_LINK4)?.addEventListener('click', this.withClickSound(() => SatInfoBoxHandlers.nearObjectsLinkClick_(400)));
      getEl(SIB.EL.ACTIONS.SUN_ANGLE_LINK)?.addEventListener('click', this.withClickSound(SatInfoBoxHandlers.drawLineToSun_.bind(SatInfoBoxHandlers)));
      getEl(SIB.EL.ACTIONS.RIC_ANGLE_LINK)?.addEventListener('click', this.withClickSound(SatInfoBoxHandlers.drawRicLines_.bind(SatInfoBoxHandlers)));
      getEl(SIB.EL.ACTIONS.NADIR_ANGLE_LINK)?.addEventListener('click', this.withClickSound(SatInfoBoxHandlers.drawLineToEarth_.bind(SatInfoBoxHandlers)));
      getEl(SIB.EL.ACTIONS.SEC_ANGLE_LINK)?.addEventListener('click', this.withClickSound(SatInfoBoxHandlers.drawLineToSat_.bind(SatInfoBoxHandlers)));
      getEl(SIB.EL.LINKS.CELESTRAK)?.addEventListener('click', this.withClickSound(SatInfoBoxHandlers.openCelestrakLink_.bind(SatInfoBoxHandlers)));
      getEl(SIB.EL.LINKS.KAYHAN)?.addEventListener('click', this.withClickSound(SatInfoBoxHandlers.openKayhanLink_.bind(SatInfoBoxHandlers)));
      getEl(SIB.EL.LINKS.HEAVENS_ABOVE)?.addEventListener('click', this.withClickSound(SatInfoBoxHandlers.openHeavensAboveLink_.bind(SatInfoBoxHandlers)));
    });
  }

  addElement(element: { html: string | null; order: number }): void {
    this.elements_.push(element);
  }

  getElements(): { html: string | null; order: number }[] {
    return this.elements_.sort((a, b) => a.order - b.order);
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
    SatInfoBoxComponents.createContainer(); // This is run during the uiManagerFinal event to ensure the rest of the DOM is ready

    // Now that is is loaded, reset the sizing and location
    SatInfoBox.initPosition(getEl(SatInfoBox.containerId_), false);

    this.addListenerToCollapseElement_(getEl(`${SIB.SECTIONS.ACTIONS}`), { value: this.isActionsSectionCollapsed_ });
    this.addListenerToCollapseElement_(getEl(`${SIB.SECTIONS.LINKS}`), { value: this.isLinksSectionCollapsed_ });
    this.addListenerToCollapseElement_(getEl(`${SIB.SECTIONS.IDENTIFIERS}`), { value: this.isIdentifiersSectionCollapsed_ });
    this.addListenerToCollapseElement_(getEl(`${SIB.SECTIONS.ORBITAL}`), { value: this.isOrbitalSectionCollapsed_ });
    this.addListenerToCollapseElement_(getEl(`${SIB.SECTIONS.SECONDARY}`), { value: this.isSecondaryDataSectionCollapsed_ });
    this.addListenerToCollapseElement_(getEl(`${SIB.SECTIONS.SENSOR}`), { value: this.isSensorDataSectionCollapsed_ });
    this.addListenerToCollapseElement_(getEl(`${SIB.SECTIONS.OBJECT}`), { value: this.isObjectDataSectionCollapsed_ });
    this.addListenerToCollapseElement_(getEl(`${SIB.SECTIONS.MISSION}`), { value: this.isMissionSectionCollapsed_ });

    keepTrackApi.emit(KeepTrackApiEvents.satInfoBoxAddListeners);
  }

  private withClickSound<T extends unknown[]>(handler: (...args: T) => unknown): (...args: T) => unknown {
    return (...args: T) => {
      // This code will run before the handler
      keepTrackApi.getSoundManager().play(SoundNames.CLICK);

      return handler.apply(this, args);
    };
  }

  static initPosition(satInfoboxDom: HTMLElement | null, isShow = true) {
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

  private addListenerToCollapseElement_(section: HTMLElement | null, isCollapsedRef: { value: boolean }): void {
    const collapseEl = getEl(`${section?.id}-collapse`);

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

  private isVisible_ = false;

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

  toggle(): void {
    if (this.isVisible_) {
      this.hide();
    } else {
      this.show();
    }
  }
}
