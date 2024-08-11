/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * sensorManager.ts is the primary interface between the user interface and the
 * ground based sensors.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2024 Theodore Kruczek
 * @Copyright (C) 2020-2024 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { sensors } from '@app/catalogs/sensors';
import { openColorbox } from '@app/lib/colorbox';
import { PLANETARIUM_DIST, RADIUS_OF_EARTH } from '@app/lib/constants';
import { getEl, setInnerHtml } from '@app/lib/get-el';
import { errorManagerInstance } from '@app/singletons/errorManager';

import { KeepTrackApiEvents } from '@app/interfaces';
import { lat2pitch, lon2yaw } from '@app/lib/transforms';
import { waitForCruncher } from '@app/lib/waitForCruncher';
import { LineTypes, lineManagerInstance } from '@app/singletons/draw-manager/line-manager';
import { PersistenceManager, StorageKey } from '@app/singletons/persistence-manager';
import { LegendManager } from '@app/static/legend-manager';
import { SatMath } from '@app/static/sat-math';
import { TearrData } from '@app/static/sensor-math';
import { PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { DEG2RAD, DetailedSensor, GreenwichMeanSiderealTime, ZoomValue, spaceObjType2Str } from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { SensorFov } from '../sensor-fov/sensor-fov';
import { SensorSurvFence } from '../sensor-surv/sensor-surv-fence';

export class SensorManager {
  lastMultiSiteArray: TearrData[];

  getSensor(): DetailedSensor | null {
    return this.currentSensors[0] ?? null;
  }

  addSecondarySensor(sensor: DetailedSensor, isReplaceSensor = false): void {
    // If there is no primary sensor, make this the primary sensor
    const primarySensor = this.currentSensors[0];

    if (!primarySensor?.isSensor() || isReplaceSensor) {
      this.currentSensors = [sensor];
      this.setSensor(sensor);
    } else {
      this.secondarySensors.push(sensor);
    }
    this.updatePositionCruncher_();
    this.cameraToCurrentSensor_();
    // Force a recalculation of the color buffers on next cruncher
    keepTrackApi.getColorSchemeManager().calcColorBufsNextCruncher();
  }

  /** Sensors that are currently selected/active */
  currentSensors: DetailedSensor[] = [];
  // UI Stuff
  isCustomSensorMenuOpen = false;
  isLookanglesMenuOpen = false;
  /**
   * List of secondary sensors
   * This is used for STFs and other "sensors" that are not actually sensors
   * and still require a primary sensor to be selected
   */
  secondarySensors = <DetailedSensor[]>[];
  sensorListUS = [
    sensors.CODSFS,
    sensors.BLEAFB,
    sensors.CAVSFS,
    sensors.CLRSFS,
    sensors.EGLAFB,
    sensors.RAFFYL,
    sensors.PITSB,
    sensors.MITMIL,
    sensors.KWAJALT,
    sensors.RAFASC,
    sensors.COBRADANE,
  ];

  sensorTitle = '';
  /**
   * List of STF sensors
   * This is used for STFs and other "sensors" that are not actually sensors
   * and still require a primary sensor to be selected
   */
  stfSensors = <DetailedSensor[]>[];
  whichRadar = '';

  constructor() {
    this.currentSensors = [];
  }

  static drawFov(sensor: DetailedSensor) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const sensorId = catalogManagerInstance.getSensorFromSensorName(sensor.name);

    if (!sensorId) {
      errorManagerInstance.warn('Sensor not found');

      return;
    }

    switch (sensor.objName) {
      case 'CODSFS':
      case 'BLEAFB':
      case 'CLRSFS':
      case 'THLSFB':
        lineManagerInstance.create(LineTypes.SENSOR_SCAN_HORIZON, [sensorId, sensor.minAz, sensor.minAz + 120, sensor.minEl, sensor.maxRng], 'c');
        lineManagerInstance.create(LineTypes.SENSOR_SCAN_HORIZON, [sensorId, sensor.minAz + 120, sensor.maxAz, sensor.minEl, sensor.maxRng], 'c');
        break;
      case 'RAFFYL':
        // TODO: Find actual face directions
        lineManagerInstance.create(LineTypes.SENSOR_SCAN_HORIZON, [sensorId, 300, 60, sensor.minEl, sensor.maxRng], 'c');
        lineManagerInstance.create(LineTypes.SENSOR_SCAN_HORIZON, [sensorId, 60, 180, sensor.minEl, sensor.maxRng], 'c');
        lineManagerInstance.create(LineTypes.SENSOR_SCAN_HORIZON, [sensorId, 180, 300, sensor.minEl, sensor.maxRng], 'c');
        break;
      case 'COBRADANE':
        // NOTE: This will be a bit more complicated later
        lineManagerInstance.create(LineTypes.SENSOR_SCAN_HORIZON, [sensorId, sensor.minAz, sensor.maxAz, sensor.minEl, sensor.maxRng], 'c');
        break;
      default:
        errorManagerInstance.warn('Sensor not found');
        break;
    }
  }

  addStf(sensor: DetailedSensor) {
    this.stfSensors.push(sensor);
    this.updatePositionCruncher_();
  }

  clearSecondarySensors() {
    this.secondarySensors = [];
    if (this.currentSensors[0]?.name === 'Custom Sensor') {
      this.resetSensorSelected();
    }
    this.updatePositionCruncher_();
  }

  clearStf() {
    this.stfSensors = [];
    this.updatePositionCruncher_();
  }

  isSensorSelected(): boolean {
    return this.currentSensors?.length > 0 && this.currentSensors[0]?.isSensor();
  }

  removeSecondarySensor(sensor?: DetailedSensor) {
    if (sensor) {
      this.secondarySensors = this.secondarySensors.filter((s) => s !== sensor);
    } else {
      this.secondarySensors.pop();
    }
    this.updatePositionCruncher_();
  }

  removeStf(sensor?: DetailedSensor) {
    if (sensor) {
      this.stfSensors = this.stfSensors.filter((s) => s !== sensor);
    } else {
      this.stfSensors.pop();
    }
    this.updatePositionCruncher_();
  }

  resetSensorSelected() {
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    // Remove satellite minibox hover
    const satMinibox = getEl('sat-minibox');

    if (satMinibox) {
      satMinibox.innerHTML = '';
    }

    // Return to default settings with nothing 'inview'
    SensorManager.updateSensorUiStyling(null);
    this.setSensor(null); // Pass sensorId to identify which sensor the user clicked
    if (settingsManager.currentColorScheme == colorSchemeManagerInstance.default) {
      LegendManager.change('default');
    }
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    catalogManagerInstance.satCruncher.postMessage({
      typ: CruncerMessageTypes.SENSOR,
      sensor: [],
    });

    keepTrackApi.getPlugin(SensorFov)?.disableFovView();
    keepTrackApi.getPlugin(SensorSurvFence)?.disableSurvView();

    getEl('menu-sensor-info')?.classList.remove('bmenu-item-selected');
    getEl('menu-fov-bubble')?.classList.remove('bmenu-item-selected');
    getEl('menu-surveillance')?.classList.remove('bmenu-item-selected');
    getEl('menu-lookangles')?.classList.remove('bmenu-item-selected');
    getEl('menu-planetarium')?.classList.remove('bmenu-item-selected');
    getEl('menu-astronomy')?.classList.remove('bmenu-item-selected');
    getEl('menu-sensor-info')?.classList.add('bmenu-item-disabled');
    getEl('menu-fov-bubble')?.classList.add('bmenu-item-disabled');
    getEl('menu-surveillance')?.classList.add('bmenu-item-disabled');
    getEl('menu-lookangles')?.classList.add('bmenu-item-disabled');
    getEl('menu-planetarium')?.classList.add('bmenu-item-disabled');
    getEl('menu-astronomy')?.classList.add('bmenu-item-disabled');

    setTimeout(() => {
      const dotsManagerInstance = keepTrackApi.getDotsManager();

      dotsManagerInstance.resetSatInView();
      colorSchemeManagerInstance.setColorScheme(settingsManager.currentColorScheme, true);
    }, 2000);

    keepTrackApi.runEvent(KeepTrackApiEvents.resetSensor);
  }

  setCurrentSensor(sensor: DetailedSensor[] | null): void {
    /*
     * TODO: This function is totally redundant to setSensor. There should be
     * ONE selectedSensor/currentSensor and it should be an array of selected sensors.
     */
    if (sensor === null) {
      this.currentSensors = [];
    } else if (sensor[0] != null) {
      this.currentSensors = sensor;
    } else if (sensor != null) {
      throw new Error('SensorManager.setCurrentSensor: sensor is not an array');
    }
  }

  static getSensorFromsensorId(sensorId: number | null | undefined): DetailedSensor | null {
    if (sensorId && sensorId >= 0) {
      for (const sensor in sensors) {
        if (sensors[sensor].sensorId === sensorId) {
          return sensors[sensor];
        }
      }
    }

    return null;
  }

  sensorListMw = Object.values(sensors).filter((sensor: DetailedSensor) =>
    [sensors.BLEAFB, sensors.CODSFS, sensors.CAVSFS, sensors.CLRSFS, sensors.RAFFYL, sensors.PITSB].includes(sensor),
  );
  sensorListRus = Object.values(sensors).filter((sensor: DetailedSensor) =>
    [
      sensors.OLED,
      sensors.OLEV,
      sensors.PEC,
      sensors.MISD,
      sensors.MISV,
      sensors.LEKV,
      sensors.ARMV,
      sensors.KALV,
      sensors.BARV,
      sensors.YENV,
      sensors.ORSV,
      sensors.STO,
      sensors.NAK,
    ].includes(sensor),
  );
  sensorListPrc = Object.values(sensors).filter((sensor: DetailedSensor) => [sensors.SHD, sensors.HEI, sensors.ZHE, sensors.XIN, sensors.PMO].includes(sensor));
  sensorListLeoLabs = Object.values(sensors).filter((sensor: DetailedSensor) =>
    [sensors.LEOCRSR, sensors.LEOAZORES, sensors.LEOKSR, sensors.LEOPFISR, sensors.LEOMSR].includes(sensor),
  );
  sensorListEsoc = Object.values(sensors).filter((sensor: DetailedSensor) =>
    [
      sensors.GRV,
      sensors.TIR,
      sensors.GES,
      sensors.NRC,
      sensors.PDM,
      sensors.TRO,
      sensors.SDT,
      sensors.ZimLAT,
      sensors.ZimSMART,
      sensors.Tromso,
      sensors.Kiruna,
      sensors.Sodankyla,
      sensors.Svalbard,
    ].includes(sensor),
  );
  sensorListOther = Object.values(sensors).filter((sensor: DetailedSensor) => [sensors.ROC, sensors.MLS, sensors.PO, sensors.LSO, sensors.MAY].includes(sensor));
  sensorListMda = Object.values(sensors).filter((sensor: DetailedSensor) =>
    [sensors.COBRADANE, sensors.HARTPY, sensors.QTRTPY, sensors.KURTPY, sensors.SHATPY, sensors.KCSTPY, sensors.SBXRDR].includes(sensor),
  );
  sensorListSsn = Object.values(sensors).filter((sensor) => [
    sensors.EGLAFB,
    sensors.KWAJSPF,
    sensors.GEODDSDGC,
    sensors.GEODDSMAU,
    sensors.GEODDSSOC,
    sensors.KWAJALT,
    sensors.KWAJMMW,
    sensors.KWAJALC,
    sensors.KWAJTDX,
    sensors.MITMIL,
    sensors.RAFASC,
    sensors.GLBII,
    sensors.HOLCBAND,
    sensors.HOLSST,
  ].includes(sensor));

  setSensor(selectedSensor: DetailedSensor | string | null, sensorId?: number): void {
    if (!selectedSensor) {
      selectedSensor = SensorManager.getSensorFromsensorId(sensorId);
    }

    PersistenceManager.getInstance().saveItem(StorageKey.CURRENT_SENSOR, JSON.stringify([selectedSensor, sensorId]));

    if (selectedSensor == null && sensorId == null) {
      // No sensor selected
      this.sensorTitle = '';
      this.currentSensors = [];
    } else if (selectedSensor === 'SSN') {
      this.sensorTitle = 'All Space Surveillance Network Sensors';
      this.currentSensors = this.sensorListSsn;
      SensorManager.updateSensorUiStyling(this.currentSensors);
    } else if (selectedSensor === 'NATO-MW') {
      this.sensorTitle = 'All Missile Warning Sensors';
      this.currentSensors = this.sensorListMw;
    } else if (selectedSensor === 'RUS-ALL') {
      this.sensorTitle = 'All Russian Sensors';
      this.currentSensors = this.sensorListRus;
    } else if (selectedSensor === 'PRC-ALL') {
      this.sensorTitle = 'All Chinese Sensors';
      this.currentSensors = this.sensorListPrc;
    } else if (selectedSensor === 'LEO-LABS') {
      this.sensorTitle = 'All LEO Labs Sensors';
      this.currentSensors = this.sensorListLeoLabs;
    } else if (selectedSensor === 'ESOC-ALL') {
      this.sensorTitle = 'All ESOC Sensors';
      this.currentSensors = this.sensorListEsoc;
    } else if (selectedSensor === 'MD-ALL') {
      this.sensorTitle = 'All Missile Defense Agency Sensors';
      this.currentSensors = this.sensorListMda;
    } else if ((<DetailedSensor>selectedSensor)?.name === 'Custom Sensor') {
      this.currentSensors = [<DetailedSensor>selectedSensor];

      // TODO: This should all be in the sensor plugin instead
      const sensorInfoTitleDom = getEl('sensor-info-title', true);

      if (sensorInfoTitleDom) {
        sensorInfoTitleDom.innerHTML = `<a href=''>${this.currentSensors[0].name}</a>`;
        const url = this.currentSensors[0]?.url;

        if (url && url.length > 0) {
          sensorInfoTitleDom.addEventListener('click', () => {
            openColorbox(url);
          });
        }

        if (this.currentSensors[0].type) {
          setInnerHtml('sensor-type', this.currentSensors[0].getTypeString());
        } else {
          setInnerHtml('sensor-type', 'Unknown Sensor');
        }
        setInnerHtml('sensor-country', this.currentSensors[0].country);
      }

      this.sensorTitle = this.currentSensors[0].name;
    } else {
      // Look through all known sensors
      for (const sensor in sensors) {
        /*
         * TODO: Require explicit sensor selection!
         * If this is the sensor we selected
         */
        const isMatchString = typeof selectedSensor === 'string' && sensors[sensor].objName === selectedSensor;
        const isMatchObj = typeof selectedSensor !== 'string' && sensors[sensor] === selectedSensor;
        const isMatchsensorId = typeof sensorId !== 'undefined' && sensors[sensor].sensorId === sensorId;

        if (isMatchString || isMatchObj || isMatchsensorId) {
          this.currentSensors = [sensors[sensor]];

          // TODO: This should all be in the sensor plugin instead
          const sensorInfoTitleDom = getEl('sensor-info-title', true);

          if (sensorInfoTitleDom) {
            sensorInfoTitleDom.innerHTML = `<a href=''>${this.currentSensors[0].name}</a>`;
            const url = this.currentSensors[0].url;

            if (url && url.length > 0) {
              sensorInfoTitleDom.addEventListener('click', () => {
                openColorbox(url);
              });
            }

            if (this.currentSensors[0].type) {
              setInnerHtml('sensor-type', spaceObjType2Str(this.currentSensors[0].type));
            } else {
              setInnerHtml('sensor-type', 'Unknown Sensor');
            }
            setInnerHtml('sensor-country', this.currentSensors[0].country);
          }

          this.sensorTitle = this.currentSensors[0].name;
        }
      }
    }

    // Run any callbacks
    keepTrackApi.runEvent(KeepTrackApiEvents.setSensor, selectedSensor, sensorId);

    /*
     * TODO: Move this to top menu plugin
     * Update UI to reflect new sensor
     */
    const sensorSelectedDom = getEl('sensor-selected', true);

    if (sensorSelectedDom) {
      sensorSelectedDom.innerText = this.sensorTitle;

      // If this.sensorTitle is empty hide the div
      if (this.sensorTitle === '') {
        sensorSelectedDom.style.display = 'none';
      } else {
        sensorSelectedDom.style.display = 'block';
      }
    }

    for (const sensor of this.currentSensors) {
      keepTrackApi.getScene().customMeshFactory.createRadarDome(sensor);
    }

    // Update Satellite Math with new sensor - TODO: SatMath should reference the sensorManagerInstance
    SensorManager.updateSensorUiStyling(this.currentSensors);
    // Update position cruncher with new sensor
    this.updatePositionCruncher_();

    waitForCruncher({
      cruncher: keepTrackApi.getCatalogManager().satCruncher,
      cb: () => {
        keepTrackApi.getColorSchemeManager().calculateColorBuffers(true);
      },
      validationFunc: (m: PositionCruncherOutgoingMsg) => {
        if (selectedSensor && m.sensorMarkerArray?.length > 0) {
          return true;
        }

        if (!selectedSensor && m.satInView?.length > 0) {
          return true;
        }

        return false;
      },
      isSkipFirst: true,
      isRunCbOnFailure: true,
      maxRetries: 5,
    });
  }

  static updateSensorUiStyling(sensors: DetailedSensor[] | null) {
    try {
      if (sensors?.[0]?.objName) {
        getEl('menu-sensor-info', true)?.classList.remove('bmenu-item-disabled');
        getEl('menu-fov-bubble', true)?.classList.remove('bmenu-item-disabled');
        getEl('menu-surveillance', true)?.classList.remove('bmenu-item-disabled');
        getEl('menu-planetarium', true)?.classList.remove('bmenu-item-disabled');
        getEl('menu-astronomy', true)?.classList.remove('bmenu-item-disabled');

        if (getEl('reset-sensor-button')) {
          (getEl('reset-sensor-button') as HTMLButtonElement).disabled = false;
        }
      } else if (getEl('reset-sensor-button')) {
        (getEl('reset-sensor-button') as HTMLButtonElement).disabled = true;
      }
    } catch (error) {
      errorManagerInstance.warn('Error updating sensor UI styling');
    }
  }

  verifySensors(sensors: DetailedSensor[] | undefined): DetailedSensor[] {
    // If no sensor passed to function then try to use the 'currentSensor'
    if (typeof sensors === 'undefined' || sensors == null) {
      if (typeof this.currentSensors === 'undefined') {
        throw new Error('getTEARR requires a sensor or for a sensor to be currently selected.');
      } else {
        sensors = this.currentSensors;
      }
    }

    return sensors;
  }

  public calculateSensorPos(now: Date, sensors?: DetailedSensor[]): { x: number; y: number; z: number; lat: number; lon: number; gmst: GreenwichMeanSiderealTime } {
    sensors = this.verifySensors(sensors);
    const sensor = sensors[0];

    if (!sensor) {
      throw new Error('Sensor not found');
    }

    const { gmst } = SatMath.calculateTimeVariables(now);

    const cosLat = Math.cos(sensor.lat * DEG2RAD);
    const sinLat = Math.sin(sensor.lat * DEG2RAD);
    const cosLon = Math.cos(sensor.lon * DEG2RAD + gmst);
    const sinLon = Math.sin(sensor.lon * DEG2RAD + gmst);

    return {
      x: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * cosLon,
      y: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * sinLon,
      z: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * sinLat,
      gmst,
      lat: sensor.lat,
      lon: sensor.lon,
    };
  }

  private cameraToCurrentSensor_() {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const primarySensor = this.currentSensors[0];

    if (primarySensor.maxRng > 6000) {
      keepTrackApi.getMainCamera().changeZoom(ZoomValue.GEO);
    } else {
      keepTrackApi.getMainCamera().changeZoom(ZoomValue.LEO);
    }
    keepTrackApi.getMainCamera().camSnap(lat2pitch(primarySensor.lat), lon2yaw(primarySensor.lon, timeManagerInstance.selectedDate));
  }

  private updatePositionCruncher_(): void {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    const combinedSensors = this.currentSensors.concat(this.secondarySensors).concat(this.stfSensors);

    for (const sensor of combinedSensors) {
      keepTrackApi.getScene().customMeshFactory.createRadarDome(sensor);
    }

    catalogManagerInstance.satCruncher.postMessage({
      typ: CruncerMessageTypes.SENSOR,
      sensor: combinedSensors,
    });
  }
}
