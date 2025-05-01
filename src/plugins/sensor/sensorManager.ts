/* eslint-disable max-depth */
/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * sensorManager.ts is the primary interface between the user interface and the
 * ground based sensors.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
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
import { KeepTrackApiEvents } from '@app/interfaces';
import { openColorbox } from '@app/lib/colorbox';
import { PLANETARIUM_DIST, RADIUS_OF_EARTH } from '@app/lib/constants';
import { getEl, setInnerHtml } from '@app/lib/get-el';
import { lat2pitch, lon2yaw } from '@app/lib/transforms';
import { waitForCruncher } from '@app/lib/waitForCruncher';
import { t7e } from '@app/locales/keys';
import { lineManagerInstance } from '@app/singletons/draw-manager/line-manager';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { PersistenceManager, StorageKey } from '@app/singletons/persistence-manager';
import { SatMath, SunStatus } from '@app/static/sat-math';
import { TearrData } from '@app/static/sensor-math';
import { PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { DEG2RAD, DetailedSensor, EpochUTC, GreenwichMeanSiderealTime, Radians, SpaceObjectType, Sun, ZoomValue, calcGmst, lla2eci, spaceObjType2Str } from 'ootk';
import { sensorGroups } from '../../catalogs/sensor-groups';
import { keepTrackApi } from '../../keepTrackApi';
import { Astronomy } from '../astronomy/astronomy';
import { Planetarium } from '../planetarium/planetarium';
import { SensorFov } from '../sensor-fov/sensor-fov';
import { SensorSurvFence } from '../sensor-surv/sensor-surv-fence';
import { LookAnglesPlugin } from './look-angles-plugin';
import { SensorInfoPlugin } from './sensor-info-plugin';

export class SensorManager {
  lastMultiSiteArray: TearrData[];

  getSensor(): DetailedSensor | null {
    return this.currentSensors[0] ?? null;
  }

  getSensorList(list: string) {
    for (const sensorGroup in sensorGroups) {
      if (sensorGroups[sensorGroup].name === list) {
        return sensorGroups[sensorGroup].list.map((sensor) => sensors[sensor]);
      }
    }

    return [];
  }

  getSensorById(sensorId: number): DetailedSensor | null {
    // Look through all current, secondary, and stf sensors
    const sensors = this.currentSensors.concat(this.secondarySensors).concat(this.stfSensors);

    for (const sensor of sensors) {
      if (sensor.sensorId === sensorId) {
        return sensor;
      }
    }

    return null;
  }

  getSensorByObjName(objName: string | undefined): DetailedSensor | null {
    if (!objName) {
      return null;
    }

    // Look through all current, secondary, and stf sensors
    const sensors = this.currentSensors.concat(this.secondarySensors).concat(this.stfSensors);

    for (const sensor of sensors) {
      if (sensor.objName === objName) {
        return sensor;
      }
    }

    return null;
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
      errorManagerInstance.warn(t7e('errorMsgs.SensorNotFound'));

      return;
    }

    switch (sensor.objName) {
      case 'CODSFS':
      case 'BLEAFB':
      case 'CLRSFS':
      case 'THLSFB':
        lineManagerInstance.createSensorScanHorizon(keepTrackApi.getSensorManager().getSensorById(sensorId), 1, 2);
        lineManagerInstance.createSensorScanHorizon(keepTrackApi.getSensorManager().getSensorById(sensorId), 2, 2);
        break;
      case 'RAFFYL':
        lineManagerInstance.createSensorScanHorizon(keepTrackApi.getSensorManager().getSensorById(sensorId), 1, 3);
        lineManagerInstance.createSensorScanHorizon(keepTrackApi.getSensorManager().getSensorById(sensorId), 2, 3);
        lineManagerInstance.createSensorScanHorizon(keepTrackApi.getSensorManager().getSensorById(sensorId), 3, 3);
        break;
      case 'COBRADANE':
        lineManagerInstance.createSensorScanHorizon(keepTrackApi.getSensorManager().getSensorById(sensorId), 1, 1);
        break;
      default:
        errorManagerInstance.warn(t7e('errorMsgs.SensorNotFound'));
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

  removeSensor(sensor: DetailedSensor | null) {
    this.currentSensors = this.currentSensors.filter((s) => s !== sensor);

    if (this.currentSensors.length === 0) {
      if (this.secondarySensors.length > 0) {
        const nextSecondarySensor = this.secondarySensors.pop();

        if (nextSecondarySensor) {
          this.currentSensors = [nextSecondarySensor];
        } else {
          this.resetSensorSelected();
        }
      } else {
        this.resetSensorSelected();
      }
    }

    this.secondarySensors = this.secondarySensors.filter((s) => s !== sensor);
    this.stfSensors = this.stfSensors.filter((s) => s !== sensor);
    this.updatePositionCruncher_();
  }

  removePrimarySensor(sensor?: DetailedSensor) {
    if (sensor) {
      this.currentSensors = this.currentSensors.filter((s) => s !== sensor);
    } else {
      this.currentSensors.pop();
    }

    if (this.currentSensors.length === 0) {
      if (this.secondarySensors.length > 0) {
        const nextSecondarySensor = this.secondarySensors.pop();

        if (nextSecondarySensor) {
          this.currentSensors = [nextSecondarySensor];
        } else {
          this.resetSensorSelected();
        }
      } else {
        this.resetSensorSelected();
      }
    }

    this.updatePositionCruncher_();
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
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    catalogManagerInstance.satCruncher.postMessage({
      typ: CruncerMessageTypes.SENSOR,
      sensor: [],
    });

    keepTrackApi.getPlugin(SensorFov)?.disableFovView();
    keepTrackApi.getPlugin(SensorSurvFence)?.disableSurvView();

    keepTrackApi.getPlugin(SensorInfoPlugin)?.setBottomIconToUnselected();
    keepTrackApi.getPlugin(SensorFov)?.setBottomIconToUnselected();
    keepTrackApi.getPlugin(SensorSurvFence)?.setBottomIconToUnselected();
    keepTrackApi.getPlugin(LookAnglesPlugin)?.setBottomIconToUnselected();
    keepTrackApi.getPlugin(Planetarium)?.setBottomIconToUnselected();
    keepTrackApi.getPlugin(Astronomy)?.setBottomIconToUnselected();
    keepTrackApi.getPlugin(SensorInfoPlugin)?.setBottomIconToUnselected();
    keepTrackApi.getPlugin(SensorInfoPlugin)?.setBottomIconToDisabled();
    keepTrackApi.getPlugin(SensorFov)?.setBottomIconToUnselected();
    keepTrackApi.getPlugin(SensorFov)?.setBottomIconToDisabled();
    keepTrackApi.getPlugin(SensorSurvFence)?.setBottomIconToUnselected();
    keepTrackApi.getPlugin(SensorSurvFence)?.setBottomIconToDisabled();
    keepTrackApi.getPlugin(LookAnglesPlugin)?.setBottomIconToUnselected();
    keepTrackApi.getPlugin(LookAnglesPlugin)?.setBottomIconToDisabled();
    keepTrackApi.getPlugin(Planetarium)?.setBottomIconToUnselected();
    keepTrackApi.getPlugin(Planetarium)?.setBottomIconToDisabled();
    keepTrackApi.getPlugin(Astronomy)?.setBottomIconToUnselected();
    keepTrackApi.getPlugin(Astronomy)?.setBottomIconToDisabled();

    setTimeout(() => {
      const dotsManagerInstance = keepTrackApi.getDotsManager();

      dotsManagerInstance.resetSatInView();
      colorSchemeManagerInstance.calculateColorBuffers(true);
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
    } else if (sensor[0] !== null) {
      this.currentSensors = sensor;
    } else if (sensor !== null) {
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

  setSensor(selectedSensor: DetailedSensor | string | null, sensorId: number | null = null): void {
    selectedSensor ??= SensorManager.getSensorFromsensorId(sensorId);

    if (selectedSensor instanceof DetailedSensor) {
      keepTrackApi.analytics.track('select_sensor', {
        sensor: selectedSensor.uiName,
        objName: selectedSensor.objName,
      });
    }

    PersistenceManager.getInstance().saveItem(StorageKey.CURRENT_SENSOR, JSON.stringify([selectedSensor, sensorId]));

    if (selectedSensor === null && sensorId === null) {
      // No sensor selected
      this.sensorTitle = '';
      this.currentSensors = [];
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


        setInnerHtml('sensor-country', this.currentSensors[0]?.country ?? '');
      }

      this.sensorTitle = this.currentSensors[0].name;
    } else {
      let isSensorFound = false;

      for (const sensorGroup of sensorGroups) {
        if (sensorGroup.name === selectedSensor) {
          this.sensorTitle = sensorGroup.header;
          this.currentSensors = sensorGroup.list.map((sensor) => {
            if (sensors[sensor] instanceof DetailedSensor) {
              return sensors[sensor];
            }

            return null;
          }).filter((sensor) => sensor !== null) as DetailedSensor[];
          isSensorFound = true;
          break;
        }
      }

      // Look through all known sensors
      if (!isSensorFound) {
        for (const sensor in sensors) {
          if (!(sensors[sensor] instanceof DetailedSensor)) {
            continue;
          }
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
              setInnerHtml('sensor-country', this.currentSensors[0].country ?? '');
            }

            this.sensorTitle = this.currentSensors[0].name;
          }
        }
      }
    }

    // Run any callbacks
    keepTrackApi.runEvent(KeepTrackApiEvents.setSensor, selectedSensor, sensorId ?? null);

    for (const sensor of this.currentSensors) {
      keepTrackApi.getScene().sensorFovFactory.generateSensorFovMesh(sensor);
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
        if (selectedSensor && (m.sensorMarkerArray?.length ?? -1) > 0) {
          return true;
        }

        if (!selectedSensor && (m.satInView?.length ?? -1) > 0) {
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
        keepTrackApi.getPlugin(SensorInfoPlugin)?.setBottomIconToUnselected();
        keepTrackApi.getPlugin(SensorFov)?.setBottomIconToUnselected();
        keepTrackApi.getPlugin(SensorSurvFence)?.setBottomIconToUnselected();
        keepTrackApi.getPlugin(Planetarium)?.setBottomIconToUnselected();
        keepTrackApi.getPlugin(Astronomy)?.setBottomIconToUnselected();

        if (getEl('reset-sensor-button', true)) {
          (getEl('reset-sensor-button') as HTMLButtonElement).disabled = false;
        }
      } else if (getEl('reset-sensor-button', true)) {
        (getEl('reset-sensor-button') as HTMLButtonElement).disabled = true;
      }
    } catch (error) {
      errorManagerInstance.warn(t7e('errorMsgs.SensorManager.errorUpdatingUi'));
    }
  }

  verifySensors(sensors: DetailedSensor[] | undefined): DetailedSensor[] {
    // If no sensor passed to function then try to use the 'currentSensor'
    if (typeof sensors === 'undefined' || sensors === null) {
      if (typeof this.currentSensors === 'undefined') {
        throw new Error('getTEARR requires a sensor or for a sensor to be currently selected.');
      } else {
        sensors = this.currentSensors;
      }
    }

    return sensors;
  }

  getAllActiveSensors(): DetailedSensor[] {
    return this.currentSensors.concat(this.secondarySensors).concat(this.stfSensors);
  }

  getAllSensors(): DetailedSensor[] {
    return Object.values(sensors);
  }

  private sensorSunStatus_(now: Date, sensor?: DetailedSensor): { sunStatus: SunStatus } {
    if (!sensor) {
      throw new Error(t7e('errorMsgs.SensorNotFound'));
    }
    // Station Lat Lon Alt vector for further ECI transformation
    const lla = {
      lat: (sensor.lat * DEG2RAD) as Radians,
      lon: (sensor.lon * DEG2RAD) as Radians,
      alt: sensor.alt,
    };
    const { gmst } = calcGmst(now);
    const sunPos = Sun.position(EpochUTC.fromDateTime(now));
    const sensorPos = lla2eci(lla, gmst);

    sensor.position = sensorPos;
    const sunStatus = SatMath.calculateIsInSun(sensor, sunPos);


    return {
      sunStatus,
    };
  }

  private canStationObserve_(now: Date, sensor: DetailedSensor): boolean {
    if (sensor.type !== SpaceObjectType.OPTICAL) {
      return true;
    }

    const status = this.sensorSunStatus_(now, sensor).sunStatus;

    return ((status === SunStatus.UMBRAL) || (status === SunStatus.PENUMBRAL));
  }

  canStationsObserve(now: Date, sensors: DetailedSensor[]): boolean {
    return sensors.some((sensor) => this.canStationObserve_(now, sensor));
  }

  calculateSensorPos(now: Date, sensors?: DetailedSensor[]): { x: number; y: number; z: number; lat: number; lon: number; gmst: GreenwichMeanSiderealTime } {
    sensors = this.verifySensors(sensors);
    const sensor = sensors[0];

    if (!sensor) {
      throw new Error(t7e('errorMsgs.SensorNotFound'));
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
      keepTrackApi.getScene().sensorFovFactory.generateSensorFovMesh(sensor);
    }

    catalogManagerInstance.satCruncher.postMessage({
      typ: CruncerMessageTypes.SENSOR,
      sensor: combinedSensors,
    });
  }
}
