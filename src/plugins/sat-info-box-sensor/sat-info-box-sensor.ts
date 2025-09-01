/* eslint-disable max-lines */
import { SatMath, SunStatus } from '@app/app/analysis/sat-math';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { SensorMath, TearrData } from '@app/app/sensors/sensor-math';
import { KeepTrackApiEvents, ToastMsgType } from '@app/engine/core/interfaces';
import type { TimeManager } from '@app/engine/core/time-manager';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { BaseObject, cKmPerMs, DEG2RAD, DetailedSatellite, eci2lla, RfSensor, SpaceObjectType, Sun, SunTime } from 'ootk';
import type { SensorManager } from '../../app/sensors/sensorManager';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { missileManager } from '../missile/missile-manager';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { StereoMap } from '../stereo-map/stereo-map';

const SECTIONS = {
  SENSOR: 'sensor-sat-info',
};

const EL = {
  RANGE: 'sat-range',
  AZIMUTH: 'sat-azimuth',
  ELEVATION: 'sat-elevation',
  BEAMWIDTH: 'sat-beamwidth',
  MAX_TMX: 'sat-maxTmx',
  SUN: 'sat-sun',
  VMAG: 'sat-vmag',
  NEXT_PASS: 'sat-nextpass',
};

export class SatInfoBoxSensor extends KeepTrackPlugin {
  readonly id = 'SatInfoBoxSensor';
  dependencies_: string[] = [SatInfoBox.name];

  // Starting values of the collapsable sections
  private readonly isSensorSectionCollapsed_ = true;

  addHtml(): void {
    super.addHtml();

    keepTrackApi.on(KeepTrackApiEvents.satInfoBoxInit, () => {
      keepTrackApi.getPlugin(SatInfoBox)!.addElement({ html: this.createSensorSection_(), order: 5 });
    });
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.on(KeepTrackApiEvents.satInfoBoxAddListeners, this.satInfoBoxAddListeners_.bind(this));
    keepTrackApi.on(KeepTrackApiEvents.selectSatData, this.updateSensorInfo_.bind(this));
    keepTrackApi.on(KeepTrackApiEvents.updateSelectBox, this.updateSelectBox_.bind(this));
  }

  private satInfoBoxAddListeners_() {
    const satInfoBoxPlugin = keepTrackApi.getPlugin(SatInfoBox)!;

    satInfoBoxPlugin.addListenerToCollapseElement(getEl(`${SECTIONS.SENSOR}`), { value: this.isSensorSectionCollapsed_ });
  }

  private createSensorSection_(): string {
    // Similar structure for sensor section
    const rows = [
      { key: 'Range', id: EL.RANGE, tooltip: 'Distance from the Sensor', value: 'xxxx km' },
      { key: 'Azimuth', id: EL.AZIMUTH, tooltip: 'Angle (Left/Right) from the Sensor', value: 'XX deg' },
      { key: 'Elevation', id: EL.ELEVATION, tooltip: 'Angle (Up/Down) from the Sensor', value: 'XX deg' },
      { key: 'Beam Width', id: EL.BEAMWIDTH, tooltip: 'Linear Width at Target\'s Range', value: 'xxxx km' },
      { key: 'Max Tmx Time', id: EL.MAX_TMX, tooltip: 'Time for RF/Light to Reach Target and Back', value: 'xxxx ms' },
      { key: 'Sun', id: EL.SUN, tooltip: 'Does the Sun Impact the Sensor', value: 'Sun Stuff' },
      { key: 'Vis Mag', id: EL.VMAG, tooltip: 'Visual Magnitude (Lower numbers are brighter)', value: 'xx.x' },
      { key: 'Next Pass', id: EL.NEXT_PASS, tooltip: 'Next Time in Coverage', value: '00:00:00z' },
    ];

    return keepTrackApi.html`
      <div id="${SECTIONS.SENSOR}">
      <div class="sat-info-section-header">
        Sensor Data
        <span id="${SECTIONS.SENSOR}-collapse" class="section-collapse material-icons">expand_less</span>
      </div>
      ${rows.map((row) => keepTrackApi.html`
        <div
          class="sat-info-row${row.id === EL.SUN || row.id === EL.VMAG || row.id === EL.NEXT_PASS ? ' sat-only-info' : ''}"
        >
        <div class="sat-info-key" data-position="top" data-delay="50"
          data-tooltip="${row.tooltip}"
        >
          ${row.key}
        </div>
        <div class="sat-info-value" id="${row.id}">${row.value}</div>
        </div>
      `).join('')}
      </div>
    `;
  }

  private updateSensorInfo_(obj: BaseObject) {
    if (obj === null || typeof obj === 'undefined' || settingsManager.isDisableSensors) {
      return;
    }
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    /*
     * If we are using the sensor manager plugin then we should hide the sensor to satellite
     * info when there is no sensor selected
     */
    if (!settingsManager.isDisableSensors) {
      if (sensorManagerInstance.isSensorSelected()) {
        showEl(SECTIONS.SENSOR);
      } else {
        hideEl(SECTIONS.SENSOR);
      }
    }

    if (!sensorManagerInstance.isSensorSelected()) {
      const satSunDom = getEl(EL.SUN);

      if (satSunDom?.parentElement) {
        satSunDom.parentElement.style.display = 'none';
      }
    } else {
      this.calculateSunStatus_(obj);
    }
  }

  private calculateSunStatus_(obj: BaseObject) {
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
    const satSunDom = getEl(EL.SUN);

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

  // eslint-disable-next-line max-statements, complexity
  private updateSelectBox_(obj: BaseObject) {
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
            keepTrackApi.getPlugin(SelectSatManager)!.selectSat(-1);

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

        keepTrackApi.getSensorManager().currentTEARR = currentTearr;
      } else {
        // Is Missile
        keepTrackApi.getSensorManager().currentTEARR = missileManager.getMissileTEARR(obj as MissileObject);
      }

      if (
        settingsManager.plugins?.StereoMap &&
        keepTrackApi.getPlugin(StereoMap)?.isMenuButtonActive &&
        timeManagerInstance.realTime > settingsManager.lastMapUpdateTime + 30000
      ) {
        keepTrackApi.getPlugin(StereoMap)?.updateMap();
        settingsManager.lastMapUpdateTime = timeManagerInstance.realTime;
      }

      this.updateSatelliteTearrData_(obj, sensorManagerInstance, timeManagerInstance);

      const nextPassElement = getEl('sat-nextpass');

      if (sensorManagerInstance.isSensorSelected()) {
        const uiManagerInstance = keepTrackApi.getUiManager();

        /*
         * If we didn't just calculate next pass time for this satellite and sensor combination do it
         * TODO: Make new logic for this to allow it to be updated while selected
         */
        if (
          (keepTrackApi.getPlugin(SelectSatManager)!.selectedSat !== uiManagerInstance.lastNextPassCalcSatId ||
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
        uiManagerInstance.lastNextPassCalcSatId = keepTrackApi.getPlugin(SelectSatManager)!.selectedSat;
        uiManagerInstance.lastNextPassCalcSensorShortName = sensorManagerInstance.currentSensors[0]?.objName ?? '';
      } else if (nextPassElement) {
        nextPassElement.innerHTML = 'Unavailable';
      }
    } catch (e) {
      errorManagerInstance.debug('Error updating satellite info!');
    }
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

    if (keepTrackApi.getSensorManager().currentTEARR.inView) {
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
      const az = keepTrackApi.getSensorManager().currentTEARR.az;

      if (az) {
        elements.az.title = `Azimuth: ${az.toFixed(0)}°`;
      } else {
        elements.az.title = 'Unknown';
      }
    }

    if (elements.el) {
      elements.el.innerHTML = 'Out of FOV';
      const el = keepTrackApi.getSensorManager().currentTEARR.el;

      if (el) {
        elements.el.title = `Elevation: ${el.toFixed(1)}°`;
      } else {
        elements.el.title = 'Unknown';
      }
    }

    if (elements.rng) {
      elements.rng.innerHTML = 'Out of FOV';
      const rng = keepTrackApi.getSensorManager().currentTEARR.rng;

      if (rng) {
        elements.rng.title = `Range: ${rng.toFixed(2)} km`;
      } else {
        elements.rng.title = 'Unknown';
      }
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
      const az = keepTrackApi.getSensorManager().currentTEARR.az;

      if (az) {
        elements.az.innerHTML = `${az.toFixed(0)}°`;
      } else {
        elements.az.innerHTML = 'Unknown';
      }
    } // Convert to Degrees
    if (elements.el) {
      const el = keepTrackApi.getSensorManager().currentTEARR.el;

      if (el) {
        elements.el.innerHTML = `${el.toFixed(1)}°`;
      } else {
        elements.el.innerHTML = 'Unknown';
      }
    }
    if (elements.rng) {
      const rng = keepTrackApi.getSensorManager().currentTEARR.rng;

      if (rng) {
        elements.rng.innerHTML = `${rng.toFixed(2)} km`;
      } else {
        elements.rng.innerHTML = 'Unknown';
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
        const currentRange = keepTrackApi.getSensorManager().currentTEARR.rng;

        beamwidthString = sensorManagerInstance.currentSensors[0].beamwidth && currentRange
          ? `${(currentRange * Math.sin(DEG2RAD * sensorManagerInstance.currentSensors[0].beamwidth)).toFixed(2)} km`
          : 'Unknown';
      }
      if (elements.beamwidth) {
        elements.beamwidth.innerHTML = beamwidthString;
      }
      if (elements.maxTmx) {
        const currentRange = keepTrackApi.getSensorManager().currentTEARR.rng;
        // Time for RF to hit target and bounce back

        elements.maxTmx.innerHTML = currentRange ? `${((currentRange / cKmPerMs) * 2).toFixed(2)} ms` : 'Unknown';
      }
    }
  }
}
