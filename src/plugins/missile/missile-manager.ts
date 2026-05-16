/* eslint-disable max-params */
/* eslint-disable max-statements */
/* eslint-disable max-lines-per-function */
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { MissileParams, ToastMsgType } from '@app/engine/core/interfaces';
import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { jday } from '@app/engine/utils/transforms';
import { DEG2RAD, Degrees, TemeVec3, Kilometers, KilometersPerSecond, MILLISECONDS_TO_DAYS, RAD2DEG, Sgp4, SpaceObjectType, ecefRad2rae, eci2ecef, eci2lla } from '@ootk/src/main';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SettingsMenuPlugin } from '../settings-menu/settings-menu';
import { ChinaICBM, FraSLBM, NorthKoreanBM, RussianICBM, USATargets, UsaICBM, globalBMTargets, ukSLBM } from './missile-data';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { MissileSimulation } from './missile-simulation';
import { MissileSpec } from './missile-types';

const missileArray: MissileObject[] = [];

let isMassRaidLoaded = false;

// This function stalls Jest for multiple minutes.
/* istanbul ignore next */
export const MassRaidPre = async (time: number, simFile: string) => {
  missileManager.clearMissiles();
  await fetch(simFile)
    .then((response) => response.json())
    .then((newMissileArray) => {
      const catalogManagerInstance = ServiceLocator.getCatalogManager();
      const satSetLen = catalogManagerInstance.missileSats;

      missileManager.missilesInUse = newMissileArray.length;
      for (let i = 0; i < newMissileArray.length; i++) {
        const x = satSetLen - 500 + i;

        newMissileArray[i].startTime = time;
        newMissileArray[i].name = newMissileArray[i].ON;
        newMissileArray[i].country = newMissileArray[i].C;

        // Add the missile to the catalog
        catalogManagerInstance.objectCache[x] = newMissileArray[i];
        const cachedObj = catalogManagerInstance.objectCache[x] as unknown as { velocity?: TemeVec3<KilometersPerSecond>; totalVelocity?: number };

        if (!cachedObj.velocity?.x && !cachedObj.velocity?.y && !cachedObj.velocity?.z) {
          cachedObj.velocity = { x: 0, y: 0, z: 0 } as TemeVec3<KilometersPerSecond>;
        }
        cachedObj.totalVelocity ??= 0;

        // Convert legacy format to new MissileObject class
        const missileObjData = catalogManagerInstance.getObject(x) as MissileObject;
        const missileObj = new MissileObject({
          id: x,
          name: missileObjData.name,
          country: missileObjData.country,
          desc: missileObjData.desc,
          active: missileObjData.active,
          type: missileObjData.type,
          latList: missileObjData.latList,
          lonList: missileObjData.lonList,
          altList: missileObjData.altList,
          startTime: missileObjData.startTime,
        } as unknown as MissileParams);

        catalogManagerInstance.objectCache[x] = missileObj;

        if (missileObj) {
          missileObj.id = satSetLen - 500 + i;
          catalogManagerInstance.satCruncherThread.sendNewMissile({
            id: missileObj.id,
            active: missileObj.active,
            type: missileObj.type,
            latList: missileObj.latList,
            lonList: missileObj.lonList,
            altList: missileObj.altList,
            startTime: missileObj.startTime,
          });
          const orbitManagerInstance = ServiceLocator.getOrbitManager();

          orbitManagerInstance.updateOrbitBuffer(missileObj.id, missileObj);
        }
      }
      missileManager.missileArray = newMissileArray;
    });

  ServiceLocator.getUiManager().toast('Missile Mass Raid Loaded Successfully', ToastMsgType.normal);
  settingsManager.searchLimit = settingsManager.searchLimit > 500 ? settingsManager.searchLimit : 500;
  SettingsMenuPlugin.syncOnLoad();

  isMassRaidLoaded = true;
  ServiceLocator.getUiManager().doSearch('RV_');
};

export const clearMissiles = () => {
  const uiManagerInstance = ServiceLocator.getUiManager();
  const catalogManagerInstance = ServiceLocator.getCatalogManager();

  uiManagerInstance.doSearch('');
  const satSetLen = catalogManagerInstance.missileSats;

  for (let i = 0; i < 500; i++) {
    const x = satSetLen - 500 + i;

    const missileObj: MissileObject = <MissileObject>catalogManagerInstance.getObject(x);

    missileObj.active = false;
    missileObj.latList = [];
    missileObj.lonList = [];
    missileObj.name = '';
    missileObj.startTime = 0;

    catalogManagerInstance.objectCache[x] = missileObj;
    // Set the velocity to 0 if it doesn't exist
    const cachedMissile = catalogManagerInstance.objectCache[x] as unknown as { velocity?: TemeVec3<KilometersPerSecond>; totalVelocity?: number };

    cachedMissile.velocity ??= { x: 0, y: 0, z: 0 } as TemeVec3<KilometersPerSecond>;
    cachedMissile.totalVelocity ??= 0;

    catalogManagerInstance.satCruncherThread.sendNewMissile({
      id: missileObj.id,
      active: missileObj.active,
      type: missileObj.type,
      latList: missileObj.latList,
      lonList: missileObj.lonList,
      altList: missileObj.altList,
      startTime: missileObj.startTime,
    });

    if (missileObj.id) {
      const orbitManagerInstance = ServiceLocator.getOrbitManager();

      orbitManagerInstance.updateOrbitBuffer(missileObj.id, missileObj);
    }
  }
  missileManager.missilesInUse = 0;
};

/**
 * @warning This function stalls Jest for multiple minutes.
 *
 * Designs the flight path of an intercontinental ballistic missile (ICBM) and
 * writes the result into the catalog at `MissileObjectNum`.
 *
 * As of PR 2 of issue #914, the physics simulation has been extracted into
 * [MissileSimulation](./missile-simulation.ts). This function now owns:
 *   - Argument validation (lat/lon/warheads/range bounds).
 *   - Catalog interaction (`getObject`, `satCruncherThread.sendNewMissile`,
 *     `orbitManager.updateOrbitBuffer`).
 *   - Trajectory post-processing (`smoothList_`) and writing to the missile object.
 *   - The low-apogee retry recursion (preserved verbatim — the bug where this
 *     path returns 0 even when the recursive call succeeded is fixed in PR 4).
 *
 * The 14-positional signature and `1` / `0` return value are preserved for
 * backward compatibility; PR 4 will switch callers to `MissileSpec` /
 * `MissileLaunchResult`.
 */
export const Missile = (
  CurrentLatitude: number,
  CurrentLongitude: number,
  TargetLatitude: number,
  TargetLongitude: number,
  NumberWarheads: number,
  MissileObjectNum: number,
  CurrentTime: number,
  MissileDesc: string,
  Length: number,
  Diameter: number,
  NewBurnRate: number,
  MaxMissileRange: number,
  country: string,
  minAltitude: number,
) => {
  const missileObj: MissileObject = <MissileObject>ServiceLocator.getCatalogManager().getObject(MissileObjectNum);

  if (isMassRaidLoaded) {
    clearMissiles();
    const satSetLen = ServiceLocator.getCatalogManager().missileSats;

    MissileObjectNum = satSetLen - 500;
  }

  if (missileManager.missilesInUse >= 500) {
    missileManager.lastMissileErrorType = ToastMsgType.critical;
    missileManager.lastMissileError = 'Error: Maximum number of missiles<br>have been reached.';

    return 0;
  }

  // Dimensions of the rocket
  Length = Length || 17; // (m)
  Diameter = Diameter || 3.1; // (m)

  if (CurrentLatitude > 90 || CurrentLatitude < -90) {
    return 0;
  }
  if (CurrentLongitude > 180 || CurrentLongitude < -180) {
    return 0;
  }
  if (TargetLatitude > 90 || TargetLatitude < -90) {
    missileManager.lastMissileErrorType = ToastMsgType.critical;
    missileManager.lastMissileError = 'Error: Target Latitude must be<br>between 90 and -90 degrees';

    return 0;
  }
  if (TargetLongitude > 180 || TargetLongitude < -180) {
    missileManager.lastMissileErrorType = ToastMsgType.critical;
    missileManager.lastMissileError = 'Error: Target Longitude must be<br>between 90 and -90 degrees';

    return 0;
  }
  if (NumberWarheads > 12) {
    return 0;
  }
  if (NumberWarheads % 1 > 0) {
    return 0;
  }

  if (typeof minAltitude === 'undefined') {
    minAltitude = 0;
  }

  const spec: MissileSpec = {
    launchLatitude: CurrentLatitude,
    launchLongitude: CurrentLongitude,
    targetLatitude: TargetLatitude,
    targetLongitude: TargetLongitude,
    numberOfWarheads: NumberWarheads,
    missileObjectNum: MissileObjectNum,
    startTime: CurrentTime,
    description: MissileDesc,
    length: Length,
    diameter: Diameter,
    burnRate: NewBurnRate,
    maxRangeKm: MaxMissileRange,
    country,
    minAltitudeKm: minAltitude,
  };

  const sim = new MissileSimulation(spec);
  const result = sim.run();

  if (result.kind === 'error') {
    missileManager.lastMissileErrorType = result.errorType;
    missileManager.lastMissileError = result.errorMessage;

    return 0;
  }

  if (result.kind === 'lowApogee') {
    // PRESERVED BUG (fixed in PR 4): the recursive retry may succeed in
    // writing a missile to the catalog, but this function returns 0 anyway,
    // falsely signalling failure to the caller.
    missileManager.createMissile(
      CurrentLatitude,
      CurrentLongitude,
      TargetLatitude,
      TargetLongitude,
      NumberWarheads,
      MissileObjectNum,
      CurrentTime,
      MissileDesc,
      Length,
      Diameter,
      NewBurnRate * result.burnMultiplier,
      MaxMissileRange,
      country,
      minAltitude,
    );

    return 0;
  }

  if (result.kind === 'tooClose') {
    missileManager.lastMissileErrorType = result.errorType;
    missileManager.lastMissileError = result.errorMessage;

    return 0;
  }

  // result.kind === 'success'
  const trajectory = result.trajectory;

  if (missileObj) {
    missileObj.altList = smoothList_(trajectory.altList, 35);
    missileObj.latList = smoothList_(trajectory.latList, 35);
    missileObj.lonList = smoothList_(trajectory.lonList, 35);
    missileObj.active = true;
    missileObj.type = SpaceObjectType.BALLISTIC_MISSILE;
    missileObj.id = MissileObjectNum;
    missileObj.name = `RV_${missileObj.id}`;
    missileObj.desc = MissileDesc;
    // maxAlt is used for zoom controls
    missileObj.maxAlt = trajectory.maxAltitudeKm;
    missileObj.startTime = CurrentTime;
    if (country) {
      missileObj.country = country;
    }

    missileArray.push(missileObj);
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    catalogManagerInstance.satCruncherThread.sendNewMissile({
      id: missileObj.id,
      active: missileObj.active,
      type: missileObj.type,
      latList: missileObj.latList,
      lonList: missileObj.lonList,
      altList: missileObj.altList,
      startTime: missileObj.startTime,
    });
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    orbitManagerInstance.updateOrbitBuffer(MissileObjectNum, {
      latList: missileObj.latList,
      lonList: missileObj.lonList,
      altList: missileObj.altList,
    });

    missileManager.missileArray = missileArray;
  }
  missileManager.missilesInUse++;
  missileManager.lastMissileErrorType = ToastMsgType.normal;
  missileManager.lastMissileError = `Missile Named RV_${missileObj.id}<br>has been created.`;

  return 1; // Successful Launch
};

/**
 * Removes jagged edges to create a more perfect parabolic path.
 * @param list A list of points along a rough parabolic path.
 * @param smoothingFactor  A smoothed list of points along a parabolic path.
 */
export const smoothList_ = <T extends number>(list: T[], smoothingFactor: number): T[] => {
  const newList: T[] = [];

  for (let i = 0; i < list.length; i++) {
    if (i < list.length / 3) {
      let sum = 0;

      for (let j = 0; j < smoothingFactor; j++) {
        sum += list[i + j];
      }
      newList.push((sum / smoothingFactor) as T);
    } else {
      newList.push(list[i]);
    }
  }

  return newList;
};

/**
 * Calculates the current TEARR (Target Elevation, Azimuth, Range, and Range Rate) data for a given missile object and sensor(s).
 * @param missile - The missile object for which to calculate the TEARR data.
 * @param sensors - An optional array of sensor objects to use for the calculation. If not provided, the current sensor(s) will be used.
 * @returns An object containing the current TEARR data for the missile.
 */
export const getMissileTEARR = (missile: MissileObject, sensors?: DetailedSensor[]) => {
  const timeManagerInstance = ServiceLocator.getTimeManager();

  const currentTEARR = {
    objName: '',
    time: '',
    alt: 0 as Kilometers,
    lon: 0 as Degrees,
    lat: 0 as Degrees,
    az: 0 as Degrees,
    el: 0 as Degrees,
    rng: 0 as Kilometers,
    inView: false,
  }; // Most current TEARR data that is set in satellite object and returned.
  const now = timeManagerInstance.simulationTimeObj;
  let j = jday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
  ); // Converts time to jday (TLEs use epoch year/day)

  j += now.getUTCMilliseconds() * MILLISECONDS_TO_DAYS;
  const gmst = Sgp4.gstime(j);

  // If no sensor passed to function then try to use the 'currentSensor'
  if (typeof sensors === 'undefined') {
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    if (typeof sensorManagerInstance.currentSensors === 'undefined') {
      throw new Error('getTEARR requires a sensor or for a sensor to be currently selected.');
    } else {
      sensors = sensorManagerInstance.currentSensors;
    }
  }

  // TODO: We should return an array
  const sensor = sensors[0];

  let curMissileTime;

  for (let t = 0; t < missile.altList.length; t++) {
    if (missile.startTime + t * 1000 > now.getTime()) {
      curMissileTime = t;
      break;
    }
  }
  const cosLat = Math.cos(missile.latList[curMissileTime] * DEG2RAD);
  const sinLat = Math.sin(missile.latList[curMissileTime] * DEG2RAD);
  const cosLon = Math.cos(missile.lonList[curMissileTime] * DEG2RAD + gmst);
  const sinLon = Math.sin(missile.lonList[curMissileTime] * DEG2RAD + gmst);

  const x = <Kilometers>((RADIUS_OF_EARTH + missile.altList[curMissileTime]) * cosLat * cosLon);
  const y = <Kilometers>((RADIUS_OF_EARTH + missile.altList[curMissileTime]) * cosLat * sinLon);
  const z = <Kilometers>((RADIUS_OF_EARTH + missile.altList[curMissileTime]) * sinLat);

  let lookAngles, positionEcf;

  try {
    const gpos = eci2lla({ x, y, z }, gmst);

    currentTEARR.alt = gpos.alt;
    currentTEARR.lon = gpos.lon;
    currentTEARR.lat = gpos.lat;
    positionEcf = eci2ecef({ x, y, z }, gmst);
    lookAngles = ecefRad2rae(sensor.llaRad(), positionEcf);
    currentTEARR.az = lookAngles.az * RAD2DEG as Degrees;
    currentTEARR.el = lookAngles.el * RAD2DEG as Degrees;
    currentTEARR.rng = lookAngles.rng;
  } catch {
    currentTEARR.alt = 0 as Kilometers;
    currentTEARR.lon = 0 as Degrees;
    currentTEARR.lat = 0 as Degrees;
    currentTEARR.az = 0 as Degrees;
    currentTEARR.el = 0 as Degrees;
    currentTEARR.rng = 0 as Kilometers;
  }

  // Check if satellite is in field of view of a sensor.
  const hasSecondaryFov = sensor.minAz2 !== undefined && sensor.maxAz2 !== undefined &&
    sensor.minEl2 !== undefined && sensor.maxEl2 !== undefined &&
    sensor.minRng2 !== undefined && sensor.maxRng2 !== undefined;

  if (sensor.minAz > sensor.maxAz) {
    const inPrimaryFov = (currentTEARR.az >= sensor.minAz || currentTEARR.az <= sensor.maxAz) &&
      currentTEARR.el >= sensor.minEl &&
      currentTEARR.el <= sensor.maxEl &&
      currentTEARR.rng <= sensor.maxRng &&
      currentTEARR.rng >= sensor.minRng;

    const inSecondaryFov = hasSecondaryFov &&
      (currentTEARR.az >= sensor.minAz2! || currentTEARR.az <= sensor.maxAz2!) &&
      currentTEARR.el >= sensor.minEl2! &&
      currentTEARR.el <= sensor.maxEl2! &&
      currentTEARR.rng <= sensor.maxRng2! &&
      currentTEARR.rng >= sensor.minRng2!;

    currentTEARR.inView = inPrimaryFov || inSecondaryFov;
  } else {
    const inPrimaryFov = currentTEARR.az >= sensor.minAz &&
      currentTEARR.az <= sensor.maxAz &&
      currentTEARR.el >= sensor.minEl &&
      currentTEARR.el <= sensor.maxEl &&
      currentTEARR.rng <= sensor.maxRng &&
      currentTEARR.rng >= sensor.minRng;

    const inSecondaryFov = hasSecondaryFov &&
      currentTEARR.az >= sensor.minAz2! &&
      currentTEARR.az <= sensor.maxAz2! &&
      currentTEARR.el >= sensor.minEl2! &&
      currentTEARR.el <= sensor.maxEl2! &&
      currentTEARR.rng <= sensor.maxRng2! &&
      currentTEARR.rng >= sensor.minRng2!;

    currentTEARR.inView = inPrimaryFov || inSecondaryFov;
  }

  const sensorManagerInstance = ServiceLocator.getSensorManager();

  if (sensorManagerInstance) {
    sensorManagerInstance.currentTEARR = currentTEARR;
  }

  return currentTEARR;
};

export type MissileManager = typeof missileManager;
const missileManager = {
  isLoaded: true,
  lastMissileErrorType: <ToastMsgType>'',
  missilesInUse: 0,
  lastMissileError: '',
  RussianICBM,
  ChinaICBM,
  NorthKoreanBM,
  UsaICBM,
  FraSLBM,
  ukSLBM,
  globalBMTargets,
  USATargets,
  missileArray,
  clearMissiles,
  createMissile: Missile,
  massRaidPre: MassRaidPre,
  getMissileTEARR,
};

export { missileManager };
