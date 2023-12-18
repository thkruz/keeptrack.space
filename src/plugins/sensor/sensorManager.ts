/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * sensorManager.ts is the primary interface between the user interface and the
 * ground based sensors.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2023 Heather Kruczek
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

import { sensors } from '@app/js/catalogs/sensors';
import { openColorbox } from '@app/js/lib/colorbox';
import { DEG2RAD, PLANETARIUM_DIST, RADIUS_OF_EARTH } from '@app/js/lib/constants';
import { getEl } from '@app/js/lib/get-el';
import { spaceObjType2Str } from '@app/js/lib/spaceObjType2Str';
import { errorManagerInstance } from '@app/js/singletons/errorManager';

import { lat2pitch, lon2yaw } from '@app/js/lib/transforms';
import { ZoomValue } from '@app/js/singletons/camera';
import { LineTypes, lineManagerInstance } from '@app/js/singletons/draw-manager/line-manager';
import { PersistenceManager, StorageKey } from '@app/js/singletons/persistence-manager';
import { LegendManager } from '@app/js/static/legend-manager';
import { SatMath } from '@app/js/static/sat-math';
import { TearrData } from '@app/js/static/sensor-math';
import { Degrees, GreenwichMeanSiderealTime, Kilometers, Radians } from 'ootk';
import { SensorManager, SensorObject } from '../../interfaces';
import { keepTrackApi } from '../../keepTrackApi';

export class StandardSensorManager implements SensorManager {
  // TODO: Merge empty and default
  private readonly emptySensor: SensorObject = {
    id: null,
    observerGd: {
      lat: <Radians>null,
      lon: <Radians>0,
      alt: <Kilometers>0,
    },
    alt: null,
    country: '',
    lat: null,
    lon: null,
    name: '',
    uiName: '',
    system: '',
    operator: '',
    obsmaxaz: <Degrees>0,
    obsmaxel: <Degrees>0,
    obsmaxrange: <Kilometers>0,
    obsminaz: <Degrees>0,
    obsminel: <Degrees>0,
    obsminrange: <Kilometers>0,
    objName: '',
    staticNum: 0,
    volume: false,
    zoom: ZoomValue.GEO,
  };

  lastMultiSiteArray: TearrData[];

  readonly defaultSensor = <SensorObject[]>[
    {
      observerGd: {
        lat: null,
        lon: 0,
        alt: 0,
      },
    },
  ];

  addSecondarySensor(sensor: SensorObject): void {
    // If there is no primary sensor, make this the primary sensor
    if (!this.currentSensors[0].lat) {
      this.currentSensors.push(sensor);
      this.setSensor(sensor, null);
    } else {
      this.secondarySensors.push(sensor);
    }
    this.updatePositionCruncher_();
    this.cameraToCurrentSensor_();
  }

  /** Sensors that are currently selected/active */
  currentSensors = <SensorObject[]>null;
  customSensors = <SensorObject[]>[];
  // UI Stuff
  isCustomSensorMenuOpen = false;
  isLookanglesMenuOpen = false;
  /** List of secondary sensors
   * This is used for STFs and other "sensors" that are not actually sensors
   * and still require a primary sensor to be selected
   */
  secondarySensors = <SensorObject[]>[];
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
  /** List of STF sensors
   * This is used for STFs and other "sensors" that are not actually sensors
   * and still require a primary sensor to be selected
   */
  stfSensors = <SensorObject[]>[];
  whichRadar = '';

  constructor() {
    this.currentSensors = [...this.defaultSensor];
  }

  static drawFov(sensor: SensorObject) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    switch (sensor.objName) {
      case 'COD':
      case 'BLE':
      case 'CLR':
      case 'THL':
        lineManagerInstance.create(
          LineTypes.SENSOR_SCAN_HORIZON,
          [catalogManagerInstance.getSensorFromSensorName(sensor.name), sensor.obsminaz, sensor.obsminaz + 120, sensor.obsminel, sensor.obsmaxrange],
          'c'
        );
        lineManagerInstance.create(
          LineTypes.SENSOR_SCAN_HORIZON,
          [catalogManagerInstance.getSensorFromSensorName(sensor.name), sensor.obsminaz + 120, sensor.obsmaxaz, sensor.obsminel, sensor.obsmaxrange],
          'c'
        );
        break;
      case 'FYL':
        // TODO: Find actual face directions
        lineManagerInstance.create(LineTypes.SENSOR_SCAN_HORIZON, [catalogManagerInstance.getSensorFromSensorName(sensor.name), 300, 60, sensor.obsminel, sensor.obsmaxrange], 'c');
        lineManagerInstance.create(LineTypes.SENSOR_SCAN_HORIZON, [catalogManagerInstance.getSensorFromSensorName(sensor.name), 60, 180, sensor.obsminel, sensor.obsmaxrange], 'c');
        lineManagerInstance.create(
          LineTypes.SENSOR_SCAN_HORIZON,
          [catalogManagerInstance.getSensorFromSensorName(sensor.name), 180, 300, sensor.obsminel, sensor.obsmaxrange],
          'c'
        );
        break;
      case 'CDN':
        // NOTE: This will be a bit more complicated later
        lineManagerInstance.create(
          LineTypes.SENSOR_SCAN_HORIZON,
          [catalogManagerInstance.getSensorFromSensorName(sensor.name), sensor.obsminaz, sensor.obsmaxaz, sensor.obsminel, sensor.obsmaxrange],
          'c'
        );
        break;
      default:
        errorManagerInstance.warn('Sensor not found');
        break;
    }
  }

  addStf(sensor: SensorObject) {
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
    if (this.currentSensors[0].name && this.currentSensors[0].name !== '' && this.currentSensors[0].lat !== null && this.currentSensors[0].observerGd?.lat !== null) {
      return true;
    }

    return false;
  }

  removeSecondarySensor(sensor?: SensorObject) {
    if (sensor) {
      this.secondarySensors = this.secondarySensors.filter((s) => s !== sensor);
    } else {
      this.secondarySensors.pop();
    }
    this.updatePositionCruncher_();
  }

  removeStf(sensor?: SensorObject) {
    if (sensor) {
      this.stfSensors = this.stfSensors.filter((s) => s !== sensor);
    } else {
      this.stfSensors.pop();
    }
    this.updatePositionCruncher_();
  }

  resetSensorSelected() {
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    // Return to default settings with nothing 'inview'
    StandardSensorManager.updateSensorUiStyling(null);
    this.setSensor(null, null); // Pass staticNum to identify which sensor the user clicked
    if (settingsManager.currentColorScheme == colorSchemeManagerInstance.default) {
      LegendManager.change('default');
    }
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    catalogManagerInstance.satCruncher.postMessage({
      typ: 'sensor',
      setlatlong: true,
      resetObserverGd: true,
      sensor: [this.defaultSensor],
    });
    catalogManagerInstance.satCruncher.postMessage({
      isShowFOVBubble: 'reset',
      isShowSurvFence: 'disable',
    });
    settingsManager.isFOVBubbleModeOn = false;
    settingsManager.isShowSurvFence = false;
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

    keepTrackApi.methods.resetSensor();
  }

  setCurrentSensor(sensor: SensorObject[] | null): void {
    // TODO: This function is totally redundant to setSensor. There should be
    // ONE selectedSensor/currentSensor and it should be an array of selected sensors.
    if (sensor === null) {
      this.currentSensors[0] = this.emptySensor;
      console.warn(this.currentSensors[0]);
    } else if (sensor[0] != null) {
      this.currentSensors = sensor;
    } else if (sensor != null) {
      throw new Error('SensorManager.setCurrentSensor: sensor is not an array');
    }

    this.currentSensors = sensor.map((s) => {
      s.observerGd = {
        // Array to calculate look angles in propagate()
        lat: <Radians>(s.lat * DEG2RAD),
        lon: <Radians>(s.lon * DEG2RAD),
        alt: s.alt,
      };
      return s;
    });
  }

  static getSensorFromStaticNum(staticNum: number): SensorObject {
    if (typeof staticNum === 'undefined') return null;

    for (const sensor in sensors) {
      if (sensors[sensor].staticNum === staticNum) {
        return sensors[sensor];
      }
    }

    return null;
  }

  setSensor(selectedSensor: SensorObject | string, staticNum?: number): void {
    if (!selectedSensor) {
      selectedSensor = StandardSensorManager.getSensorFromStaticNum(staticNum);
    }

    PersistenceManager.getInstance().saveItem(StorageKey.CURRENT_SENSOR, JSON.stringify([selectedSensor, staticNum]));

    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    if (selectedSensor == null && staticNum == null) {
      // No sensor selected
      this.sensorTitle = '';
      this.currentSensors = [this.defaultSensor[0]];
    } else if (selectedSensor === 'SSN') {
      this.sensorTitle = 'All Space Surveillance Network Sensors';
      const filteredSensors = Object.values(sensors).filter((sensor) => sensor.country === 'United States' || sensor.country === 'United Kingdom' || sensor.country === 'Norway');
      StandardSensorManager.updateSensorUiStyling(filteredSensors);
    } else if (selectedSensor === 'NATO-MW') {
      this.sensorTitle = 'All North American Aerospace Defense Command Sensors';
      this.currentSensors = Object.values(sensors).filter((sensor: SensorObject) =>
        [sensors.BLEAFB, sensors.CODSFS, sensors.CAVSFS, sensors.CLRSFS, sensors.COBRADANE, sensors.RAFFYL, sensors.PITSB].includes(sensor)
      );
    } else if (selectedSensor === 'RUS-ALL') {
      this.sensorTitle = 'All Russian Sensors';
      this.currentSensors = Object.values(sensors).filter((sensor: SensorObject) =>
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
        ].includes(sensor)
      );
    } else if (selectedSensor === 'PRC-ALL') {
      this.sensorTitle = 'All Chinese Sensors';
      this.currentSensors = Object.values(sensors).filter((sensor: SensorObject) => [sensors.SHD, sensors.HEI, sensors.ZHE, sensors.XIN, sensors.PMO].includes(sensor));
    } else if (selectedSensor === 'LEO-LABS') {
      this.sensorTitle = 'All LEO Labs Sensors';
      this.currentSensors = Object.values(sensors).filter((sensor: SensorObject) =>
        [sensors.LEOCRSR, sensors.LEOAZORES, sensors.LEOKSR, sensors.LEOPFISR, sensors.LEOMSR].includes(sensor)
      );
    } else if (selectedSensor === 'ESOC-ALL') {
      this.sensorTitle = 'All Missile Defense Agency Sensors';
      this.currentSensors = Object.values(sensors).filter((sensor: SensorObject) =>
        [
          sensors.GRV,
          sensors.TIR,
          sensors.GES,
          sensors.NRC,
          sensors.PDM,
          sensors.TRO,
          sensors.Tenerife,
          sensors.ZimLAT,
          sensors.ZimSMART,
          sensors.Tromso,
          sensors.Kiruna,
          sensors.Sodankyla,
          sensors.Svalbard,
        ].includes(sensor)
      );
    } else if (selectedSensor === 'MD-ALL') {
      this.sensorTitle = 'All Missile Defense Agency Sensors';
      this.currentSensors = Object.values(sensors).filter((sensor: SensorObject) =>
        [sensors.HARTPY, sensors.QTRTPY, sensors.KURTPY, sensors.SHATPY, sensors.KCSTPY, sensors.SBXRDR].includes(sensor)
      );
    } else if ((<SensorObject>selectedSensor)?.name === 'Custom Sensor') {
      this.currentSensors = [<SensorObject>selectedSensor];

      // TODO: This should all be in the sensor plugin instead
      const sensorInfoTitleDom = getEl('sensor-info-title', true);

      if (sensorInfoTitleDom) {
        sensorInfoTitleDom.innerHTML = "<a href=''>" + this.currentSensors[0].name + '</a>';
        sensorInfoTitleDom.addEventListener('click', () => {
          openColorbox(this.currentSensors[0].url);
        });

        getEl('sensor-type').innerHTML = spaceObjType2Str(this.currentSensors[0].type);
        getEl('sensor-country').innerHTML = this.currentSensors[0].country;
      }

      this.sensorTitle = this.currentSensors[0].name;
    } else {
      // Look through all known sensors
      for (const sensor in sensors) {
        // TODO: Require explicit sensor selection!
        // If this is the sensor we selected
        const isMatchString = typeof selectedSensor === 'string' && sensors[sensor].objName === selectedSensor;
        const isMatchObj = typeof selectedSensor !== 'string' && sensors[sensor] === selectedSensor;
        const isMatchStaticNum = typeof staticNum !== 'undefined' && sensors[sensor].staticNum === staticNum;

        if (isMatchString || isMatchObj || isMatchStaticNum) {
          this.currentSensors = [sensors[sensor]];

          // TODO: This should all be in the sensor plugin instead
          const sensorInfoTitleDom = getEl('sensor-info-title', true);

          if (sensorInfoTitleDom) {
            sensorInfoTitleDom.innerHTML = "<a href=''>" + this.currentSensors[0].name + '</a>';
            sensorInfoTitleDom.addEventListener('click', () => {
              openColorbox(this.currentSensors[0].url);
            });

            getEl('sensor-type').innerHTML = spaceObjType2Str(this.currentSensors[0].type);
            getEl('sensor-country').innerHTML = this.currentSensors[0].country;
          }

          this.sensorTitle = this.currentSensors[0].name;
        }
      }
    }

    // Run any callbacks
    keepTrackApi.methods.setSensor(selectedSensor, staticNum);

    // TODO: Move this to top menu plugin
    // Update UI to reflect new sensor
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

    // Update Satellite Math with new sensor - TODO: SatMath should reference the sensorManagerInstance
    StandardSensorManager.updateSensorUiStyling(this.currentSensors);
    // Update position cruncher with new sensor
    this.updatePositionCruncher_();
    // Update the color scheme
    colorSchemeManagerInstance.setColorScheme(settingsManager.currentColorScheme, true);
  }

  updateCruncherOnCustomSensors() {
    this.whichRadar = this.customSensors.length > 1 ? 'MULTI CUSTOM' : 'CUSTOM';
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    catalogManagerInstance.satCruncher.postMessage({
      typ: 'sensor',
      setlatlong: true,
      sensor: this.customSensors,
      multiSensor: this.customSensors.length > 1,
    });
  }

  static updateSensorUiStyling(sensors: SensorObject[]) {
    try {
      if (typeof sensors == 'undefined' || sensors == null) {
        const resetSensorTextDOM = getEl('reset-sensor-text', true);
        if (resetSensorTextDOM) {
          resetSensorTextDOM.style.display = 'none';
        }
        return;
      }

      getEl('menu-sensor-info', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-fov-bubble', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-surveillance', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-planetarium', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-astronomy', true)?.classList.remove('bmenu-item-disabled');
      const resetSensorTextDOM = getEl('reset-sensor-text', true);
      if (resetSensorTextDOM) {
        resetSensorTextDOM.style.display = 'block';
      }
    } catch (error) {
      errorManagerInstance.warn('Error updating sensor UI styling');
    }
  }

  verifySensors(sensors: SensorObject[]): SensorObject[] {
    // If no sensor passed to function then try to use the 'currentSensor'
    if (typeof sensors == 'undefined' || sensors == null) {
      if (typeof this.currentSensors == 'undefined') {
        throw new Error('getTEARR requires a sensor or for a sensor to be currently selected.');
      } else {
        sensors = this.currentSensors;
      }
    }
    // If sensor's observerGd is not set try to set it using it parameters
    if (typeof sensors[0].observerGd == 'undefined') {
      try {
        sensors[0].observerGd = {
          alt: sensors[0].alt,
          lat: <Radians>(sensors[0].lat * DEG2RAD),
          lon: <Radians>(sensors[0].lon * DEG2RAD),
        };
      } catch (e) {
        throw new Error('observerGd is not set and could not be guessed.');
      }
    }
    return sensors;
  }

  public calculateSensorPos(now: Date, sensors?: SensorObject[]): { x: number; y: number; z: number; lat: number; lon: number; gmst: GreenwichMeanSiderealTime } {
    sensors = this.verifySensors(sensors);
    const sensor = sensors[0];

    const { gmst } = SatMath.calculateTimeVariables(now);

    const cosLat = Math.cos(sensor.lat * DEG2RAD);
    const sinLat = Math.sin(sensor.lat * DEG2RAD);
    const cosLon = Math.cos(sensor.lon * DEG2RAD + gmst);
    const sinLon = Math.sin(sensor.lon * DEG2RAD + gmst);

    return {
      x: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * cosLon,
      y: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * sinLon,
      z: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * sinLat,
      gmst: gmst,
      lat: sensor.lat,
      lon: sensor.lon,
    };
  }

  private cameraToCurrentSensor_() {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const primarySensor = this.currentSensors[0];

    if (primarySensor.obsmaxrange > 6000) {
      keepTrackApi.getMainCamera().changeZoom(ZoomValue.GEO);
    } else {
      keepTrackApi.getMainCamera().changeZoom(ZoomValue.LEO);
    }
    keepTrackApi.getMainCamera().camSnap(lat2pitch(primarySensor.lat), lon2yaw(primarySensor.lon, timeManagerInstance.selectedDate));
  }

  private updatePositionCruncher_(): void {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    const combinedSensors = this.currentSensors.concat(this.secondarySensors).concat(this.stfSensors);

    catalogManagerInstance.satCruncher.postMessage({
      typ: 'sensor',
      setlatlong: true,
      sensor: combinedSensors,
      multiSensor: combinedSensors.length > 1,
    });
  }
}
