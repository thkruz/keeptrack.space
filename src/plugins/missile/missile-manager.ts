/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
/* eslint-disable complexity */
/* eslint-disable max-statements */
/* eslint-disable max-lines-per-function */
/* eslint-disable max-params */
/* eslint-disable max-lines */
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { MissileParams, ToastMsgType } from '@app/engine/core/interfaces';
import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { jday } from '@app/engine/utils/transforms';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { DEG2RAD, Degrees, EciVec3, Kilometers, KilometersPerSecond, MILLISECONDS_TO_DAYS, RAD2DEG, Sensor, Sgp4, SpaceObjectType, ecfRad2rae, eci2ecf, eci2lla } from '@ootk/src/main';
import { SettingsMenuPlugin } from '../settings-menu/settings-menu';
import { ChinaICBM, FraSLBM, NorthKoreanBM, RussianICBM, USATargets, UsaICBM, globalBMTargets, ukSLBM } from './missile-data';
import { ServiceLocator } from '@app/engine/core/service-locator';

let BurnRate: number, EarthMass: number, EarthRadius: number, FuelDensity: number, G: number, R: number, WarheadMass: number, h: number;
const missileArray: MissileObject[] = [];

let isMassRaidLoaded = false;

// External Functions

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
        if (!catalogManagerInstance.objectCache[x].velocity?.x && !catalogManagerInstance.objectCache[x].velocity?.y && !catalogManagerInstance.objectCache[x].velocity?.z) {
          catalogManagerInstance.objectCache[x].velocity = { x: 0, y: 0, z: 0 } as EciVec3<KilometersPerSecond>;
        }
        catalogManagerInstance.objectCache[x].totalVelocity ??= 0;

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
          catalogManagerInstance.satCruncher.postMessage({
            id: missileObj.id,
            typ: CruncerMessageTypes.NEW_MISSILE,
            name: `M00${missileObj.id}`,
            satId: missileObj.id,
            static: true,
            missile: true,
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
    catalogManagerInstance.objectCache[x].velocity ??= { x: 0, y: 0, z: 0 } as EciVec3<KilometersPerSecond>;
    catalogManagerInstance.objectCache[x].totalVelocity ??= 0;

    catalogManagerInstance.satCruncher.postMessage({
      id: missileObj.id,
      typ: CruncerMessageTypes.NEW_MISSILE,
      ON: `RV_${missileObj.id}`,
      satId: missileObj.id,
      active: missileObj.active,
      type: missileObj.type,
      name: missileObj.id,
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
 * Calculates and designs the flight path of an intercontinental ballistic missile (ICBM).
 * This function calls upon many sub-functions to help it iteratively calculate many of the
 * changing variables as the rocket makes its path around the world. Changing variables that had to be taken into
 * account include:
 * - Air density vs altitude
 * - Air pressure vs altitude
 * - Air temperature vs altitude
 * - Drag coefficient vs mach number
 * - Speed of sound vs altitude
 * - Drag force vs time
 * - Gravitational attraction vs altitude
 * - Fuel mass vs time
 * - Thrust vs time
 * - Vertical velocity vs time
 * - Angular velocity vs time
 * - Vertical acceleration vs time
 * - Angular acceleration vs time
 * - Angular distance rocket travels vs time
 * - Total distance rocket travels vs time
 *
 * The coordinates are to be inputed as degrees and NumberWarheads must be an integer. The first thing the
 * program does is calculate everything regarding the path the rocket will take to minimize
 * distance needed to travel. It uses the CoordinateCalculator function to accomplish this.
 * It then calculates everything regarding the casing and fuel of the rocket. After calculating all
 * the necessary constants it starts its iterative calculation of the rockets actual path and collects
 * information into lists as it moves through its times steps. It changes its iterative approach once
 * the rocket runs out of fuel by dropping out everything used to calculate the trust. Once the rocket
 * reaches an altitude of zero meters it ends the iterations.
 *
 * Many of these variables are dependent on each other. The inputs of this function are:
 * @param CurrentLatitude - Latitude of the starting position
 * @param CurrentLongitude - Longitude of the starting position
 * @param TargetLatitude - Latitude of the ending position
 * @param TargetLongitude - Longitude of the ending position
 * @param NumberWarheads - Number of warhead loaded onto the missile
 * @param MissileObjectNum - The missile object number
 * @param CurrentTime - The current time
 * @param MissileDesc - The missile description
 * @param Length - The length of the missile (m)
 * @param Diameter - The diameter of the missile (m)
 * @param NewBurnRate - The new burn rate
 * @param MaxMissileRange - The maximum missile range (km)
 * @param country - The country
 * @param minAltitude - The minimum altitude
 *
 * @returns 0 if there is an error, otherwise returns the calculated path of the missile
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

  EarthRadius = 6371000; // (m)
  R = 287; // (J * K^-1 * kg^-1)
  G = 6.67384 * 10 ** -11; // (m^3 * kg^-1 * s^-2)
  EarthMass = 5.9726 * 10 ** 24; // (kg)

  // This function will calculate the path the rocket will take in terms of coordinates
  const LatList = [];
  const LongList = [];

  const [EstLatList, EstLongList, , ArcLength, EstDistanceList, GoalDistance] = calculateCoordinates_(CurrentLatitude, CurrentLongitude, TargetLatitude, TargetLongitude);

  if (ArcLength < 320000) {
    missileManager.lastMissileErrorType = ToastMsgType.critical;
    missileManager.lastMissileError = 'Error: This missile has a minimum distance of 320 km.';

    return 0;
  }

  if (ArcLength > MaxMissileRange * 1000) {
    missileManager.lastMissileErrorType = ToastMsgType.critical;
    missileManager.lastMissileError = `Error: This missile has a maximum distance of ${MaxMissileRange} km.`;

    return 0;
  }

  // Calculate Notional Altitude
  const minAltitudeTrue = minAltitude * (Math.min(3, MaxMissileRange / (ArcLength / 1000)) / 2);

  // Calculations for the warheads
  WarheadMass = 500 * NumberWarheads; // (Kg)

  // Calculations for the casing
  const Thickness = 0.050389573 * Diameter; // (m)
  const RocketArea = 0.25 * Math.PI * Diameter ** 2; // (m^2)

  const RocketCasingDensity = 1628.75; // (kg/m^3)http://scholar.lib.vt.edu/theses/available/etd-101198-161441/unrestricted/appendix.pdf
  const RocketCasingVolume = 0.25 * Math.PI * Length * (Diameter ** 2 - (Diameter - Thickness) ** 2); // (m^3)
  const RocketCasingMass1 = RocketCasingDensity * RocketCasingVolume; // (kg)
  const RocketCasingMass2 = RocketCasingDensity * 0.25 * Math.PI * (Length * 0.4937) * (Diameter ** 2 - (Diameter - Thickness) ** 2); // (kg)
  const RocketCasingMass3 = RocketCasingDensity * 0.25 * Math.PI * (Length * 0.157) * ((Diameter * 0.75) ** 2 - (Diameter * 0.75 - (Thickness / 2) ** 2)); // (kg)

  // Calculations for the fuel
  BurnRate = NewBurnRate || 0.042; // (m/s)
  FuelDensity = 1750; // (kg/m^2)
  const FuelArea1 = 0.25 * Math.PI * (Diameter - Thickness) ** 2; // (m^2)
  const FuelArea2 = 0.25 * Math.PI * (Diameter * 0.75 - Thickness) ** 2; // (m^2)
  const FuelVolume = FuelArea1 * (Length * 0.651) + FuelArea2 * (Length * 0.178); // (m^3)
  let FuelMass = FuelDensity * FuelVolume; // http://www.lr.tudelft.nl/en/organisation/departments/space-engineering/space-systems-engineering/expertise-areas/space-propulsion/design-of-elements/rocket-propellants/solids/

  // Here are the initial conditions
  let dthetadt = 0.001; // (m/s)
  let drdt = 0.001; // (m/s)
  let Altitude = 0; // (m)
  const NozzleAltitude1 = 0; // (m)
  let Distance = 0; // (m)
  let ArcDistance = 0; // (m)
  const MassIn = 0; // (kg/s)

  // Here are the time steps and counters
  h = 1;

  // Here are the definitions for all the lists

  const AltitudeList = [];

  const hList = [];

  let NozzleAltitude2, NozzleAltitude3;

  const AngleCoefficient = calculateAngle_(
    FuelArea1,
    FuelArea2,
    FuelMass,
    FuelVolume,
    RocketArea,
    Altitude,
    RocketCasingMass1,
    RocketCasingMass2,
    RocketCasingMass3,
    NozzleAltitude1,
    drdt,
    dthetadt,
    Distance,
    ArcDistance,
    MassIn,
    ArcLength,
    GoalDistance,
  );

  while (FuelMass / FuelDensity / FuelVolume > 0.4 && Altitude >= 0) {
    const iterationFunOutput = launchDetailed_(
      FuelArea1,
      FuelMass,
      RocketArea,
      Altitude,
      RocketCasingMass1,
      NozzleAltitude1,
      drdt,
      dthetadt,
      Distance,
      ArcDistance,
      MassIn,
      AngleCoefficient,
    );

    FuelMass = iterationFunOutput[0];
    drdt = iterationFunOutput[12];
    Altitude = iterationFunOutput[13];
    Distance = iterationFunOutput[14];

    ArcDistance = iterationFunOutput[16];
    dthetadt = iterationFunOutput[18];
    NozzleAltitude2 = Altitude;

    AltitudeList.push(Math.round((Altitude / 1000) * 1e2) / 1e2);

    for (let i = 0; i < EstDistanceList.length; i++) {
      if (EstDistanceList[i] <= Distance / 1000 && (EstDistanceList[i + 1] > Distance / 1000)) {
        LatList.push(Math.round(EstLatList[i] * 1e2) / 1e2);
        LongList.push(Math.round(EstLongList[i] * 1e2) / 1e2);
        break;
      }
    }

    let hListSum = 0;

    for (const h_ of hList) {
      hListSum += h_;
    }
    hList.push(h + hListSum);
  }

  while (FuelMass / FuelDensity / FuelVolume > 0.19 && Altitude >= 0) {
    const iterationFunOutput = launchDetailed_(
      FuelArea1,
      FuelMass,
      RocketArea,
      Altitude,
      RocketCasingMass2,
      NozzleAltitude2,
      drdt,
      dthetadt,
      Distance,
      ArcDistance,
      MassIn,
      AngleCoefficient,
    );

    FuelMass = iterationFunOutput[0];
    drdt = iterationFunOutput[12];
    Altitude = iterationFunOutput[13];
    Distance = iterationFunOutput[14];

    ArcDistance = iterationFunOutput[16];
    dthetadt = iterationFunOutput[18];
    NozzleAltitude3 = Altitude;

    AltitudeList.push(Math.round((Altitude / 1000) * 1e2) / 1e2);

    for (let i = 0; i < EstDistanceList.length; i++) {
      if (EstDistanceList[i] <= Distance / 1000 && (EstDistanceList[i + 1] > Distance / 1000)) {
        LatList.push(Math.round(EstLatList[i] * 1e2) / 1e2);
        LongList.push(Math.round(EstLongList[i] * 1e2) / 1e2);
        break;
      }
    }

    let hListSum = 0;

    for (const h_ of hList) {
      hListSum += h_;
    }
    hList.push(h + hListSum);
  }

  while (FuelMass / FuelDensity / FuelVolume > 0 && Altitude >= 0) {
    const iterationFunOutput = launchDetailed_(
      FuelArea2,
      FuelMass,
      RocketArea,
      Altitude,
      RocketCasingMass3,
      NozzleAltitude3,
      drdt,
      dthetadt,
      Distance,
      ArcDistance,
      MassIn,
      AngleCoefficient,
    );

    FuelMass = iterationFunOutput[0];
    drdt = iterationFunOutput[12];
    Altitude = iterationFunOutput[13];
    Distance = iterationFunOutput[14];
    ArcDistance = iterationFunOutput[16];
    dthetadt = iterationFunOutput[18];

    AltitudeList.push(Math.round((Altitude / 1000) * 1e2) / 1e2);

    for (let i = 0; i < EstDistanceList.length; i++) {
      if (EstDistanceList[i] <= Distance / 1000 && (EstDistanceList[i + 1] > Distance / 1000)) {
        LatList.push(Math.round(EstLatList[i] * 1e2) / 1e2);
        LongList.push(Math.round(EstLongList[i] * 1e2) / 1e2);
        break;
      }
    }

    let hListSum = 0;

    for (const h_ of hList) {
      hListSum += h_;
    }
    hList.push(h + hListSum);
  }

  while (Altitude > 0) {
    FuelMass = 0;
    const iterationFunOutput = launchDetailed_(
      FuelArea2,
      FuelMass,
      RocketArea,
      Altitude,
      RocketCasingMass3,
      NozzleAltitude3,
      drdt,
      dthetadt,
      Distance,
      ArcDistance,
      MassIn,
      AngleCoefficient,
    );

    FuelMass = iterationFunOutput[0];
    drdt = iterationFunOutput[12];
    Altitude = iterationFunOutput[13];
    Distance = iterationFunOutput[14];
    ArcDistance = iterationFunOutput[16];
    dthetadt = iterationFunOutput[18];

    AltitudeList.push(Math.round((Altitude / 1000) * 1e2) / 1e2);

    for (let i = 0; i < EstDistanceList.length; i++) {
      if (EstDistanceList[i] <= Distance / 1000 && (EstDistanceList[i + 1] > Distance / 1000)) {
        LatList.push(Math.round(EstLatList[i] * 1e2) / 1e2);
        LongList.push(Math.round(EstLongList[i] * 1e2) / 1e2);
        break;
      }
    }
  }

  const MaxAltitude = AltitudeList.reduce((a, b) => Math.max(a, b), 0);

  if (MaxAltitude < minAltitudeTrue) {
    // Try again with 25% increase to burn rate
    const burnMultiplier = Math.min(3, minAltitudeTrue / MaxAltitude);
    // setTimeout(function () {

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
      NewBurnRate * burnMultiplier,
      MaxMissileRange,
      country,
      minAltitude,
    );
    // }, 10);

    return 0;
  }

  if (minAltitudeTrue === (minAltitude * 3) / 2) {
    missileManager.lastMissileErrorType = ToastMsgType.critical;
    missileManager.lastMissileError = 'Error: This distance is too close for the selected missile.';

    return 0;
  }

  if (missileObj) {
    missileObj.altList = smoothList_(AltitudeList, 35);
    missileObj.latList = smoothList_(LatList, 35);
    missileObj.lonList = smoothList_(LongList, 35);
    missileObj.active = true;
    missileObj.type = SpaceObjectType.BALLISTIC_MISSILE;
    missileObj.id = MissileObjectNum;
    missileObj.name = `RV_${missileObj.id}`;
    missileObj.desc = MissileDesc;
    // maxAlt is used for zoom controls
    missileObj.maxAlt = MaxAltitude;
    missileObj.startTime = CurrentTime;
    if (country) {
      missileObj.country = country;
    }

    missileArray.push(missileObj);
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    catalogManagerInstance.satCruncher.postMessage({
      id: missileObj.id,
      typ: CruncerMessageTypes.NEW_MISSILE,
      ON: `RV_${missileObj.id}`, // Don't think catalogManagerInstance.satCruncher needs this
      satId: missileObj.id,
      active: missileObj.active,
      type: missileObj.type,
      name: missileObj.id,
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
export const getMissileTEARR = (missile: MissileObject, sensors?: Sensor[]) => {
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
    positionEcf = eci2ecf({ x, y, z }, gmst);
    lookAngles = ecfRad2rae(sensor.llaRad(), positionEcf);
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
  if (sensor.minAz > sensor.maxAz) {
    if (
      ((currentTEARR.az >= sensor.minAz || currentTEARR.az <= sensor.maxAz) &&
        currentTEARR.el >= sensor.minEl &&
        currentTEARR.el <= sensor.maxEl &&
        currentTEARR.rng <= sensor.maxRng &&
        currentTEARR.rng >= sensor.minRng) ||
      ((currentTEARR.az >= sensor.minAz2 || currentTEARR.az <= sensor.maxAz2) &&
        currentTEARR.el >= sensor.minEl2 &&
        currentTEARR.el <= sensor.maxEl2 &&
        currentTEARR.rng <= sensor.maxRng2 &&
        currentTEARR.rng >= sensor.minRng2)
    ) {
      currentTEARR.inView = true;
    } else {
      currentTEARR.inView = false;
    }
  } else if (
    (currentTEARR.az >= sensor.minAz &&
      currentTEARR.az <= sensor.maxAz &&
      currentTEARR.el >= sensor.minEl &&
      currentTEARR.el <= sensor.maxEl &&
      currentTEARR.rng <= sensor.maxRng &&
      currentTEARR.rng >= sensor.minRng) ||
    (currentTEARR.az >= sensor.minAz2 &&
      currentTEARR.az <= sensor.maxAz2 &&
      currentTEARR.el >= sensor.minEl2 &&
      currentTEARR.el <= sensor.maxEl2 &&
      currentTEARR.rng <= sensor.maxRng2 &&
      currentTEARR.rng >= sensor.minRng2)
  ) {
    currentTEARR.inView = true;
  } else {
    currentTEARR.inView = false;
  }

  const sensorManagerInstance = ServiceLocator.getSensorManager();

  if (sensorManagerInstance) {
    sensorManagerInstance.currentTEARR = currentTEARR;
  }

  return currentTEARR;
};

// TODO: Future Use
/*
 *missileManager.MassRaid = function (time, BurnRate, RaidType) {
 *  var a = 0;
 *  var b = 500 - missileManager.missilesInUse;
 *  var i = 0;
 *  missilesLaunched = 0;
 *  isResetMissilesLaunched = false;
 *  var launchTime = 0;
 *  var success = 0;
 *
 *  if (RaidType === 'Russia') {
 *    console.info('Russian Mass Raid Start: ' + Date.now());
 *    isResetMissilesLaunched = false;
 *    missilesLaunched = 0;
 *    for (a = 0; a < missileManager.RussianICBM.length / 4; a++) {
 *      if (isResetMissilesLaunched) {
 *        missilesLaunched = 0;
 *        isResetMissilesLaunched = false;
 *      }
 *      for (i = 0; i < USATargets.length / 2; i++) {
 *        if (b <= 500 - maxRussianMissiles) continue; // Don't Launch more than 252 Missiles
 *        if (missileManager.RussianICBM[a * 4 + 3] !== 8300 && missilesLaunched > 19) continue; // 20 missiles per site
 *        if (missileManager.RussianICBM[a * 4 + 3] === 8300 && missilesLaunched > 11) continue; // 12 missiles per sub
 *        if (Math.random() < 0.3) {
 *          // Skip over 70% of the cities to make it more random
 *          launchTime = time * 1 + Math.random() * 240 * 1000;
 *          success = missileManager.Missile(
 *            missileManager.RussianICBM[a * 4],
 *            missileManager.RussianICBM[a * 4 + 1],
 *            USATargets[i * 2],
 *            USATargets[i * 2 + 1],
 *            3,
 *            catalogManagerInstance.satData.length - b,
 *            launchTime,
 *            missileManager.RussianICBM[a * 4 + 2],
 *            30,
 *            2.9,
 *            BurnRate,
 *            missileManager.RussianICBM[a * 4 + 3],
 *            'Russia'
 *          );
 *          missilesLaunched += success; // Add 1 if missile passed range checks
 *          b -= success;
 *          console.info('Missiles Launched: ' + (500 - b) + ' - ' + missileManager.RussianICBM[a * 4 + 2]);
 *        }
 *      }
 *      if (b <= 500 - maxRussianMissiles) continue;
 *      if (
 *        (missileManager.RussianICBM[a * 4 + 3] !== 8300 && missilesLaunched <= 18 && i >= USATargets.length / 2) || // If less than 25 missiles launched redo that brigade
 *        (missileManager.RussianICBM[a * 4 + 3] === 8300 && missilesLaunched <= 10 && i >= USATargets.length / 2)
 *      ) {
 *        // If submarine then limit to 16 missiles
 *        a--;
 *        isResetMissilesLaunched = false;
 *      } else {
 *        isResetMissilesLaunched = true;
 *      }
 *    }
 *  } else if (RaidType === 'China') {
 *    console.info('Chinese Mass Raid Start: ' + Date.now());
 *    isResetMissilesLaunched = false;
 *    missilesLaunched = 0;
 *    for (a = 0; a < missileManager.ChinaICBM.length / 4; a++) {
 *      if (isResetMissilesLaunched) {
 *        missilesLaunched = 0;
 *        isResetMissilesLaunched = false;
 *      }
 *      for (i = 0; i < USATargets.length / 2; i++) {
 *        if (b <= 500 - maxChineseMissiles) continue; // Don't Launch more than 252 Missiles
 *        if (missilesLaunched > 12) continue; // 12 missiles per brigade
 *        if (Math.random() < 0.3) {
 *          // Skip over 70% of the cities to make it more random
 *          launchTime = time + Math.random() * 240 * 1000;
 *          success = missileManager.Missile(
 *            missileManager.ChinaICBM[a * 4],
 *            missileManager.ChinaICBM[a * 4 + 1],
 *            USATargets[i * 2],
 *            USATargets[i * 2 + 1],
 *            3,
 *            catalogManagerInstance.satData.length - b,
 *            launchTime,
 *            missileManager.ChinaICBM[a * 4 + 2],
 *            30,
 *            2.9,
 *            BurnRate,
 *            missileManager.ChinaICBM[a * 4 + 3],
 *            'China'
 *          );
 *          missilesLaunched += success; // Add 1 if missile passed range checks
 *          b -= success;
 *          console.info('Missiles Launched: ' + (500 - b));
 *        }
 *      }
 *      if (b <= 500 - maxChineseMissiles) continue;
 *      if (missilesLaunched <= 11 && i >= USATargets.length / 2) {
 *        // If less than 12 missiles launched redo that brigade
 *        a--;
 *        isResetMissilesLaunched = false;
 *      } else {
 *        isResetMissilesLaunched = true;
 *      }
 *    }
 *  } else if (RaidType === 'North Korea') {
 *    console.info('North Korea Mass Raid Start: ' + Date.now());
 *    isResetMissilesLaunched = false;
 *    missilesLaunched = 0;
 *    for (a = 0; a < missileManager.NorthKoreanBM.length / 4; a++) {
 *      if (isResetMissilesLaunched) {
 *        missilesLaunched = 0;
 *        isResetMissilesLaunched = false;
 *      }
 *      for (i = 0; i < USATargets.length / 2; i++) {
 *        if (b <= 500 - maxNorthKoreanMissiles) continue; // Don't Launch more than 252 Missiles
 *        if (missilesLaunched > 12) continue; // 12 missiles per brigade
 *        if (Math.random() < 0.3) {
 *          // Skip over 70% of the cities to make it more random
 *          launchTime = time + Math.random() * 240 * 1000;
 *          success = missileManager.Missile(
 *            missileManager.NorthKoreanBM[a * 4],
 *            missileManager.NorthKoreanBM[a * 4 + 1],
 *            USATargets[i * 2],
 *            USATargets[i * 2 + 1],
 *            3,
 *            catalogManagerInstance.satData.length - b,
 *            launchTime,
 *            missileManager.NorthKoreanBM[a * 4 + 2],
 *            30,
 *            2.9,
 *            BurnRate,
 *            missileManager.NorthKoreanBM[a * 4 + 3],
 *            'North Korea'
 *          );
 *          missilesLaunched += success; // Add 1 if missile passed range checks
 *          b -= success;
 *          console.info('Missiles Launched: ' + (500 - b));
 *        }
 *      }
 *      if (b <= 500 - maxNorthKoreanMissiles) continue;
 *      if (missilesLaunched <= 4 && i >= USATargets.length / 2) {
 *        // If less than 5 missiles launched redo that brigade
 *        a--;
 *        isResetMissilesLaunched = false;
 *      } else {
 *        isResetMissilesLaunched = true;
 *      }
 *    }
 *  } else if (RaidType === 'USA2Russia' || RaidType === 'USA2China' || RaidType === 'USA2NorthKorea') {
 *    console.info('USA Mass Raid Start: ' + Date.now());
 *    isResetMissilesLaunched = false;
 *    missilesLaunched = 0;
 *    for (a = 0; a < missileManager.UsaICBM.length / 4; a++) {
 *      i = 0;
 *      if (isResetMissilesLaunched) {
 *        missilesLaunched = 0;
 *        isResetMissilesLaunched = false;
 *      }
 *      if (RaidType === 'USA2Russia') {
 *        for (i = 0; i < missileManager.RussianICBM.length / 4; i++) {
 *          if (b <= 500 - maxUSAMissiles) continue; // Don't Launch more than 350 Missiles
 *          if (missilesLaunched > 50) continue; // 50 missiles per site
 *          if (Math.random() < 0.3) {
 *            // Skip over 70% of the cities to make it more random
 *            launchTime = time + Math.random() * 240 * 1000;
 *            success = missileManager.Missile(
 *              missileManager.UsaICBM[a * 4],
 *              missileManager.UsaICBM[a * 4 + 1],
 *              missileManager.RussianICBM[i * 4],
 *              missileManager.RussianICBM[i * 4 + 1],
 *              3,
 *              catalogManagerInstance.satData.length - b,
 *              launchTime,
 *              missileManager.UsaICBM[a * 4 + 2],
 *              30,
 *              2.9,
 *              BurnRate,
 *              missileManager.UsaICBM[a * 4 + 3],
 *              'United States'
 *            );
 *            missilesLaunched += success; // Add 1 if missile passed range checks
 *            b -= success;
 *            console.info('Missiles Launched: ' + (500 - b));
 *          }
 *        }
 *        if (b > 500 - maxUSAMissiles) {
 *          if (missilesLaunched <= 50) {
 *            a--;
 *            isResetMissilesLaunched = false;
 *          } else {
 *            isResetMissilesLaunched = true;
 *          }
 *        }
 *      } else if (RaidType === 'USA2China') {
 *        for (i = 0; i < missileManager.ChinaICBM.length / 4; i++) {
 *          if (b <= 500 - maxUSAMissiles) continue; // Don't Launch more than 350 Missiles
 *          if (missilesLaunched > 50) continue; // 50 missiles per site
 *          if (Math.random() < 0.3) {
 *            // Skip over 70% of the cities to make it more random
 *            launchTime = time + Math.random() * 240 * 1000;
 *            success = missileManager.Missile(
 *              missileManager.UsaICBM[a * 4],
 *              missileManager.UsaICBM[a * 4 + 1],
 *              missileManager.ChinaICBM[i * 4],
 *              missileManager.ChinaICBM[i * 4 + 1],
 *              3,
 *              catalogManagerInstance.satData.length - b,
 *              launchTime,
 *              missileManager.UsaICBM[a * 4 + 2],
 *              30,
 *              2.9,
 *              BurnRate,
 *              missileManager.UsaICBM[a * 4 + 3],
 *              'United States'
 *            );
 *            missilesLaunched += success; // Add 1 if missile passed range checks
 *            b -= success;
 *            console.info('Missiles Launched: ' + (500 - b));
 *          }
 *        }
 *        if (b > 500 - maxUSAMissiles) {
 *          if (missilesLaunched <= 50) {
 *            a--;
 *            isResetMissilesLaunched = false;
 *          } else {
 *            isResetMissilesLaunched = true;
 *          }
 *        }
 *      } else if (RaidType === 'USA2NorthKorea') {
 *        for (i = 0; i < missileManager.NorthKoreanBM.length / 4; i++) {
 *          if (b <= 500 - 18) continue; // Don't Launch more than 15 Missiles
 *          if (missilesLaunched > 5) continue; // 30 missiles per site
 *          if (Math.random() < 0.3) {
 *            // Skip over 70% of the cities to make it more random
 *            launchTime = time + Math.random() * 240 * 1000;
 *            success = missileManager.Missile(
 *              missileManager.UsaICBM[a * 4],
 *              missileManager.UsaICBM[a * 4 + 1],
 *              missileManager.NorthKoreanBM[i * 4],
 *              missileManager.NorthKoreanBM[i * 4 + 1],
 *              3,
 *              catalogManagerInstance.satData.length - b,
 *              launchTime,
 *              missileManager.UsaICBM[a * 4 + 2],
 *              30,
 *              2.9,
 *              BurnRate,
 *              missileManager.UsaICBM[a * 4 + 3],
 *              'United States'
 *            );
 *            missilesLaunched += success; // Add 1 if missile passed range checks
 *            b -= success;
 *            console.info('Missiles Launched: ' + (500 - b));
 *          }
 *        }
 *        if (b > 500 - maxUSAMissiles) {
 *          if (missilesLaunched <= 5) {
 *            a--;
 *            isResetMissilesLaunched = false;
 *          } else {
 *            isResetMissilesLaunched = true;
 *          }
 *        }
 *      }
 *    }
 *    missileManager.missilesInUse = 500 - b;
 *  }
 *};
 *missileManager.minMaxSimulation = function (launchTime, lat, lon, missileDesc, maxRange, minAlt, minLat, maxLat, minLon, maxLon, degInt) {
 *  missileManager.clearMissiles();
 *  console.info('Min Max Test Started: ' + Date.now());
 *  isResetMissilesLaunched = false;
 *  missilesLaunched = 0;
 *  let success;
 *  for (let i = minLat; i <= maxLat; i += degInt) {
 *    for (let j = minLon; j < maxLon; j += degInt) {
 *      success = missileManager.Missile(
 *        i,
 *        j,
 *        lat,
 *        lon,
 *        3, // Does this matter?
 *        catalogManagerInstance.missileSats - (500 - missilesLaunched),
 *        launchTime,
 *        missileDesc,
 *        30,
 *        2.9,
 *        0.07,
 *        maxRange,
 *        'Analyst',
 *        minAlt
 *      );
 *      if (success === 1) {
 *        console.log(`Missile ${missilesLaunched} Launched`);
 *      } else {
 *        console.log('Missile Out of Range');
 *      }
 *      missilesLaunched += success; // Add 1 if missile passed range checks
 *      if (missilesLaunched >= 500) break;
 *    }
 *    if (missilesLaunched >= 500) break;
 *  }
 *};
 *missileManager.asat = (CurrentLatitude, CurrentLongitude, satId, MissileObjectNum, CurrentTime, Length, Diameter, NewBurnRate, AngleCoefficient) => {
 *  let NumberWarheads = 3;
 *  let MissileDesc = 'ASAT';
 *  let MaxMissileRange = 200000;
 *  let country = 'USA';
 *  let sat = getSat(satId);
 *  let satTEARR = sat.getTEARR();
 *  let satAlt = satTEARR.alt;
 *  console.log(satTEARR.lat * RAD2DEG);
 *  console.log(satTEARR.lon * RAD2DEG);
 *  console.log(satTEARR.alt);
 *  let TargetLatitude = CurrentLatitude * -1;
 *  let TargetLongitude = CurrentLongitude >= 0 ? CurrentLongitude - 180 : CurrentLongitude + 180;
 *  let timeInFlight;
 *  timeInFlight = missileManager.asatPreFlight(CurrentLatitude, CurrentLongitude, TargetLatitude, TargetLongitude, NumberWarheads, MissileObjectNum, CurrentTime, MissileDesc, Length, Diameter, NewBurnRate, MaxMissileRange, country, satAlt);
 *  console.log(timeInFlight);
 *  let startTime = timeManager.calculateSimulationTime();
 *  // CurrentTime = startTime;
 *  let propOffset = timeManager.getOffsetTimeObj(timeInFlight * 1000, startTime);
 *  console.log(propOffset);
 *  let satTEARR2 = satellite.getTEARR(sat, SensorManager.sensors.COD, propOffset);
 *  let satAlt2 = satTEARR2.alt;
 *  console.log(satTEARR2.lat * RAD2DEG);
 *  console.log(satTEARR2.lon * RAD2DEG);
 *  console.log(satTEARR2.alt);
 *  TargetLatitude = satTEARR2.lat * RAD2DEG;
 *  TargetLongitude = satTEARR2.lon * RAD2DEG;
 *  TargetLongitude = TargetLongitude > 180 ? TargetLongitude - 360 : TargetLongitude;
 *  TargetLongitude = TargetLongitude < -180 ? TargetLongitude + 360 : TargetLongitude;
 *  let [timeInFlight2, tgtLat, tgtLon] = missileManager.asatFlight(
 *    CurrentLatitude,
 *    CurrentLongitude,
 *    TargetLatitude,
 *    TargetLongitude,
 *    satAlt2,
 *    NumberWarheads,
 *    MissileObjectNum,
 *    CurrentTime,
 *    MissileDesc,
 *    Length,
 *    Diameter,
 *    NewBurnRate,
 *    MaxMissileRange,
 *    country,
 *    timeInFlight,
 *    AngleCoefficient
 *  );
 *  console.log(timeInFlight2);
 *  console.log(`tgtLat: ${tgtLat} - tgtLon: ${tgtLon}`);
 *
 *  propOffset = timeManager.getOffsetTimeObj(timeInFlight2 * 1000, startTime);
 *  console.log(propOffset);
 *  let satTEARR3 = satellite.getTEARR(sat, SensorManager.sensors.COD, propOffset);
 *  let satAlt3 = satTEARR3.alt;
 *  console.log(satTEARR3.lat * RAD2DEG);
 *  console.log(satTEARR3.lon * RAD2DEG);
 *  console.log(satTEARR3.alt);
 *  TargetLatitude = satTEARR3.lat * RAD2DEG;
 *  TargetLongitude = satTEARR3.lon * RAD2DEG;
 *  TargetLongitude = TargetLongitude > 180 ? TargetLongitude - 360 : TargetLongitude;
 *  TargetLongitude = TargetLongitude < -180 ? TargetLongitude + 360 : TargetLongitude;
 *  let [timeInFlight3, tgtLat2, tgtLon2] = missileManager.asatFlight(
 *    CurrentLatitude,
 *    CurrentLongitude,
 *    TargetLatitude,
 *    TargetLongitude,
 *    satAlt3,
 *    NumberWarheads,
 *    MissileObjectNum,
 *    CurrentTime,
 *    MissileDesc,
 *    Length,
 *    Diameter,
 *    NewBurnRate,
 *    MaxMissileRange,
 *    country,
 *    timeInFlight2,
 *    AngleCoefficient
 *  );
 *  console.log(timeInFlight3);
 *  console.log(`tgtLat: ${tgtLat2} - tgtLon: ${tgtLon2}`);
 *};
 *missileManager.asatPreFlight = (CurrentLatitude, CurrentLongitude, TargetLatitude, TargetLongitude, NumberWarheads, MissileObjectNum, CurrentTime, MissileDesc, Length, Diameter, NewBurnRate, MaxMissileRange, country, minAltitude) => {
 *  // Air density vs altitude
 *  // Air pressure vs altitude
 *  // Air temperature vs altitude
 *  // Drag coefficient vs mach number
 *  // Speed of sound vs altitude
 *  // Drag force vs time
 *  // Gravitational attraction vs altitude
 *  // Fuel mass vs time
 *  // Thrust vs time
 *  // Vertical velocity vs time
 *  // Angular velocity vs time
 *  // Vertical acceleration vs time
 *  // Angular acceleration vs time
 *  // Angular distance rocket travels vs time
 *  // Total distance rocket travels vs time
 *  // Many of these variables are dependent on each other. The inputs of this function are:
 *  // Currentlat:  Latitude of the starting position
 *  // Currentlon: Longitude of the starting position
 *  // Targetlat:   Latitude of the ending position
 *  // Targetlon:  Longitude of the ending position
 *  // NumberWarheads:   Number of warhead loaded onto the missile
 *
 *  //   var MissileObject = getSat(MissileObjectNum);
 *
 *  // Dimensions of the rocket
 *  Length = Length || 17; // (m)
 *  Diameter = Diameter || 3.1; // (m)
 *
 *  if (CurrentLatitude > 90 || CurrentLatitude < -90) {
 *    console.debug('Error: Current Latitude must be between 90 and -90 degrees');
 *    return 0;
 *  }
 *  if (CurrentLongitude > 180 || CurrentLongitude < -180) {
 *    console.debug('Error: Current Longitude must be between 180 and -180 degrees');
 *    return 0;
 *  }
 *
 *  if (NumberWarheads > 12) {
 *    console.debug('Error: Rocket can hold up to 12 warheads');
 *    return 0;
 *  }
 *  if (parseFloat(NumberWarheads) % 1 > 0) {
 *    console.debug('Error: The number of warheads must be a whole number');
 *    return 0;
 *  }
 *
 *  EarthRadius = 6371000; // (m)
 *  R = 287; // (J * K^-1 * kg^-1)
 *  G = 6.67384 * Math.pow(10, -11); // (m^3 * kg^-1 * s^-2)
 *  EarthMass = 5.9726 * Math.pow(10, 24); // (kg)
 *
 *  // This function will calculate the path the rocket will take in terms of coordinates
 *  var GoalDistance;
 *  var EstDistanceList = [];
 *  var LatList = [];
 *  var LongList = [];
 *  var EstLatList = [];
 *  var EstLongList = [];
 *  //   var Alpha1;
 *
 *  var calculatedCoordinates = [];
 *
 *  calculatedCoordinates = _CoordinateCalculator(CurrentLatitude, CurrentLongitude, TargetLatitude, TargetLongitude);
 *  EstLatList = calculatedCoordinates[0];
 *  EstLongList = calculatedCoordinates[1];
 *  //   Alpha1 = calculatedCoordinates[2];
 *  ArcLength = calculatedCoordinates[3];
 *  EstDistanceList = calculatedCoordinates[4];
 *  GoalDistance = calculatedCoordinates[5];
 *
 *  if (ArcLength > MaxMissileRange * 1000) {
 *    // console.debug('Error: This missile has a maximum distance of ' + MaxMissileRange + ' km.');
 *    // console.debug('Please choose different target coordinates.');
 *    missileManager.lastMissileErrorType = ToastMsgType.critical;
 *    missileManager.lastMissileError = 'Error: This missile has a maximum distance of ' + MaxMissileRange + ' km.';
 *    return 0;
 *  }
 *
 *  // Calculations for the warheads
 *  WarheadMass = 500 * NumberWarheads; // (Kg)
 *  //   var WarheadPayload = 475 * NumberWarheads; // (KiloTons of TNT)
 *  //   var TotalDestruction = 92.721574 * NumberWarheads; // (km^2)
 *  //   var PartialDestruction = 261.5888 * NumberWarheads; // (km^2)
 *
 *  // Calculations for the casing
 *  var Thickness = 0.050389573 * Diameter; // (m)
 *  var RocketArea = 0.25 * Math.PI * Math.pow(Diameter, 2); // (m^2)
 *  //   var RocketVolume = RocketArea * Length; // (m^3)
 *  var RocketCasingDensity = 1628.75; // (kg/m^3)http://scholar.lib.vt.edu/theses/available/etd-101198-161441/unrestricted/appendix.pdf
 *  var RocketCasingVolume = 0.25 * Math.PI * Length * (Math.pow(Diameter, 2) - Math.pow(Diameter - Thickness, 2)); // (m^3)
 *  var RocketCasingMass1 = RocketCasingDensity * RocketCasingVolume; // (kg)
 *  var RocketCasingMass2 = RocketCasingDensity * 0.25 * Math.PI * (Length * 0.4937) * (Math.pow(Diameter, 2) - Math.pow(Diameter - Thickness, 2)); // (kg)
 *  var RocketCasingMass3 = RocketCasingDensity * 0.25 * Math.PI * (Length * 0.157) * (Math.pow(Diameter * 0.75, 2) - (Diameter * 0.75 - Math.pow(Thickness / 2), 2)); // (kg)
 *
 *  // Calculations for the fuel
 *  BurnRate = NewBurnRate || 0.042; // (m/s)
 *  FuelDensity = 1750; // (kg/m^2)
 *  var FuelArea1 = 0.25 * Math.PI * Math.pow(Diameter - Thickness, 2); // (m^2)
 *  var FuelArea2 = 0.25 * Math.PI * Math.pow(Diameter * 0.75 - Thickness, 2); // (m^2)
 *  var FuelVolume = FuelArea1 * (Length * 0.651) + FuelArea2 * (Length * 0.178); // (m^3)
 *  var FuelMass = FuelDensity * FuelVolume; // http://www.lr.tudelft.nl/en/organisation/departments/space-engineering/space-systems-engineering/expertise-areas/space-propulsion/design-of-elements/rocket-propellants/solids/
 *  var RocketMass = FuelMass + RocketCasingMass1 + WarheadMass; // (kg)
 *
 *  // Here are the initial conditions
 *  var dthetadt = 0.001; // (m/s)
 *  var drdt = 0.001; // (m/s)
 *  var Altitude = 0; // (m)
 *  var NozzleAltitude1 = 0; // (m)
 *  var Distance = 0; // (m)
 *  var ArcDistance = 0; // (m)
 *  var MassIn = 0; // (kg/s)
 *
 *  // Here are the time steps and counters
 *  // var y = 0;
 *  // var z = 0;
 *  var t = 0;
 *  h = 1;
 *
 *  // Here are the definitions for all the lists
 *  var OppositeList = [];
 *  var AdjacentList = [];
 *  var WeightForceList = [];
 *  var AltitudeList = [];
 *  var DistanceList = [];
 *  var ArcDistanceList = [];
 *  var drdtList = [];
 *  var dthetadtList = [];
 *  var MList = [];
 *  var FuelMassList = [];
 *  var hList = [];
 *  var ThrustList = [];
 *  var NozzleAltitude = [];
 *  for (var i = 0; i < 100000; i++) {
 *    NozzleAltitude.push(i);
 *  }
 *  var ExitcDList = [];
 *  var Exitdr2dtList = [];
 *  var Exitdtheta2dtList = [];
 *  var ExitDragForceList = [];
 *  var ExitcList = [];
 *  var ExitAirDensityList = [];
 *  var ExitPatmList = [];
 *  var ExitTatmList = [];
 *  var EntercDList = [];
 *  var Enterdr2dtList = [];
 *  var Enterdtheta2dtList = [];
 *  var EnterDragForceList = [];
 *  var EnterAirDensityList = [];
 *  var EnterPatmList = [];
 *  var EnterTatmList = [];
 *  var EntercList = [];
 *  // var TotalDistanceList = [];
 *  var TimeList = [];
 *  var dtheta2dt, ArcLength, dr2dt, WeightForce, DragForce, Thrust, cD, M, c, AirDensity, Patm, Tatm;
 *
 *  var AngleCoefficient = _Bisection(FuelArea1, FuelArea2, FuelMass, FuelVolume, RocketArea, Altitude, RocketCasingMass1, RocketCasingMass2, RocketCasingMass3, NozzleAltitude1, drdt, dthetadt, Distance, ArcDistance, MassIn, ArcLength, GoalDistance);
 *
 *  while (FuelMass / FuelDensity / FuelVolume > 0.4 && Altitude >= 0) {
 *    var iterationFunOutput = _IterationFun(FuelArea1, FuelMass, RocketArea, Altitude, RocketCasingMass1, NozzleAltitude1, drdt, dthetadt, Distance, ArcDistance, MassIn, AngleCoefficient);
 *    FuelMass = iterationFunOutput[0];
 *    RocketMass = iterationFunOutput[1];
 *    Tatm = iterationFunOutput[2];
 *    Patm = iterationFunOutput[3];
 *    AirDensity = iterationFunOutput[4];
 *    c = iterationFunOutput[5];
 *    M = iterationFunOutput[6];
 *    cD = iterationFunOutput[7];
 *    Thrust = iterationFunOutput[8];
 *    DragForce = iterationFunOutput[9];
 *    WeightForce = iterationFunOutput[10];
 *    dr2dt = iterationFunOutput[11];
 *    drdt = iterationFunOutput[12];
 *    Altitude = iterationFunOutput[13];
 *    Distance = iterationFunOutput[14];
 *    // ArcVelocity = iterationFunOutput[15];
 *    ArcDistance = iterationFunOutput[16];
 *    dtheta2dt = iterationFunOutput[17];
 *    dthetadt = iterationFunOutput[18];
 *    var NozzleAltitude2 = Altitude;
 *
 *    AdjacentList.push(Math.cos(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    OppositeList.push(Math.sin(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    WeightForceList.push(WeightForce / RocketMass);
 *    ThrustList.push(Thrust / 1000);
 *    MList.push(M);
 *    AltitudeList.push(Math.round((Altitude / 1000) * 1e2) / 1e2);
 *    DistanceList.push(Distance / 1000);
 *    ArcDistanceList.push(ArcDistance / 1000);
 *    for (i = 0; i < EstDistanceList.length; i++) {
 *      if (EstDistanceList[i] <= Distance / 1000 && !(EstDistanceList[i + 1] <= Distance / 1000)) {
 *        LatList.push(Math.round(EstLatList[i] * 1e2) / 1e2);
 *        LongList.push(Math.round(EstLongList[i] * 1e2) / 1e2);
 *        // if (!CurrentTime) console.log(t + 's - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Dist: ' + EstDistanceList[i].toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        // if (CurrentTime) console.log(new Date(t) + ' - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        break;
 *      }
 *    }
 *    drdtList.push(drdt);
 *    dthetadtList.push(dthetadt);
 *    var hListSum;
 *    for (i = 0; i < hList.length; i++) {
 *      hListSum += hList[i];
 *    }
 *    hList.push(h + hListSum);
 *    Exitdr2dtList.push(dr2dt);
 *    Exitdtheta2dtList.push(dtheta2dt);
 *    if (Altitude < 120000) ExitDragForceList.push(DragForce / 1000);
 *    if (Altitude < 100000) ExitcList.push(c);
 *    if (Altitude < 120000) ExitAirDensityList.push(AirDensity);
 *    if (Altitude < 120000) ExitPatmList.push(Patm / 101325);
 *    if (Altitude < 100000) ExitTatmList.push(Tatm);
 *    if (Altitude < 100000) ExitcDList.push(cD);
 *    if (FuelMass > 0) FuelMassList.push(FuelMass);
 *    TimeList.push(t);
 *    t += 1;
 *  }
 *  //   var FirstStageTime = t;
 *
 *  while (FuelMass / FuelDensity / FuelVolume > 0.19 && Altitude >= 0) {
 *    iterationFunOutput = _IterationFun(FuelArea1, FuelMass, RocketArea, Altitude, RocketCasingMass2, NozzleAltitude2, drdt, dthetadt, Distance, ArcDistance, MassIn, AngleCoefficient);
 *    FuelMass = iterationFunOutput[0];
 *    RocketMass = iterationFunOutput[1];
 *    Tatm = iterationFunOutput[2];
 *    Patm = iterationFunOutput[3];
 *    AirDensity = iterationFunOutput[4];
 *    c = iterationFunOutput[5];
 *    M = iterationFunOutput[6];
 *    cD = iterationFunOutput[7];
 *    Thrust = iterationFunOutput[8];
 *    DragForce = iterationFunOutput[9];
 *    WeightForce = iterationFunOutput[10];
 *    dr2dt = iterationFunOutput[11];
 *    drdt = iterationFunOutput[12];
 *    Altitude = iterationFunOutput[13];
 *    Distance = iterationFunOutput[14];
 *    // ArcVelocity = iterationFunOutput[15];
 *    ArcDistance = iterationFunOutput[16];
 *    dtheta2dt = iterationFunOutput[17];
 *    dthetadt = iterationFunOutput[18];
 *    var NozzleAltitude3 = Altitude;
 *
 *    AdjacentList.push(Math.cos(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    OppositeList.push(Math.sin(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    WeightForceList.push(WeightForce / RocketMass);
 *    ThrustList.push(Thrust / 1000);
 *    MList.push(M);
 *    AltitudeList.push(Math.round((Altitude / 1000) * 1e2) / 1e2);
 *    DistanceList.push(Distance / 1000);
 *    ArcDistanceList.push(ArcDistance / 1000);
 *    for (i = 0; i < EstDistanceList.length; i++) {
 *      if (EstDistanceList[i] <= Distance / 1000 && !(EstDistanceList[i + 1] <= Distance / 1000)) {
 *        LatList.push(Math.round(EstLatList[i] * 1e2) / 1e2);
 *        LongList.push(Math.round(EstLongList[i] * 1e2) / 1e2);
 *        // if (!CurrentTime) console.log(t + 's - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Dist: ' + EstDistanceList[i].toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        // if (CurrentTime) console.log(new Date(t) + ' - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        break;
 *      }
 *    }
 *    drdtList.push(drdt);
 *    dthetadtList.push(dthetadt);
 *    hListSum;
 *    for (i = 0; i < hList.length; i++) {
 *      hListSum += hList[i];
 *    }
 *    hList.push(h + hListSum);
 *    Exitdr2dtList.push(dr2dt);
 *    Exitdtheta2dtList.push(dtheta2dt);
 *    if (Altitude < 120000) ExitDragForceList.push(DragForce / 1000);
 *    if (Altitude < 100000) ExitcList.push(c);
 *    if (Altitude < 120000) ExitAirDensityList.push(AirDensity);
 *    if (Altitude < 120000) ExitPatmList.push(Patm / 101325);
 *    if (Altitude < 100000) ExitTatmList.push(Tatm);
 *    if (Altitude < 100000) ExitcDList.push(cD);
 *    if (FuelMass > 0) FuelMassList.push(FuelMass);
 *    TimeList.push(t);
 *    t += 1;
 *  }
 *  //   var SecondStageTime = t;
 *
 *  while (FuelMass / FuelDensity / FuelVolume > 0 && Altitude >= 0) {
 *    iterationFunOutput = _IterationFun(FuelArea2, FuelMass, RocketArea, Altitude, RocketCasingMass3, NozzleAltitude3, drdt, dthetadt, Distance, ArcDistance, MassIn, AngleCoefficient);
 *    FuelMass = iterationFunOutput[0];
 *    RocketMass = iterationFunOutput[1];
 *    Tatm = iterationFunOutput[2];
 *    Patm = iterationFunOutput[3];
 *    AirDensity = iterationFunOutput[4];
 *    c = iterationFunOutput[5];
 *    M = iterationFunOutput[6];
 *    cD = iterationFunOutput[7];
 *    Thrust = iterationFunOutput[8];
 *    DragForce = iterationFunOutput[9];
 *    WeightForce = iterationFunOutput[10];
 *    dr2dt = iterationFunOutput[11];
 *    drdt = iterationFunOutput[12];
 *    Altitude = iterationFunOutput[13];
 *    Distance = iterationFunOutput[14];
 *    // ArcVelocity = iterationFunOutput[15];
 *    ArcDistance = iterationFunOutput[16];
 *    dtheta2dt = iterationFunOutput[17];
 *    dthetadt = iterationFunOutput[18];
 *
 *    AdjacentList.push(Math.cos(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    OppositeList.push(Math.sin(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    WeightForceList.push(WeightForce / RocketMass);
 *    ThrustList.push(Thrust / 1000);
 *    MList.push(M);
 *    AltitudeList.push(Math.round((Altitude / 1000) * 1e2) / 1e2);
 *    DistanceList.push(Distance / 1000);
 *    ArcDistanceList.push(ArcDistance / 1000);
 *    for (i = 0; i < EstDistanceList.length; i++) {
 *      if (EstDistanceList[i] <= Distance / 1000 && !(EstDistanceList[i + 1] <= Distance / 1000)) {
 *        LatList.push(Math.round(EstLatList[i] * 1e2) / 1e2);
 *        LongList.push(Math.round(EstLongList[i] * 1e2) / 1e2);
 *        // if (!CurrentTime) console.log(t + 's - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Dist: ' + EstDistanceList[i].toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        // if (CurrentTime) console.log(new Date(t) + ' - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        break;
 *      }
 *    }
 *    drdtList.push(drdt);
 *    dthetadtList.push(dthetadt);
 *    hListSum;
 *    for (i = 0; i < hList.length; i++) {
 *      hListSum += hList[i];
 *    }
 *    hList.push(h + hListSum);
 *    Exitdr2dtList.push(dr2dt);
 *    Exitdtheta2dtList.push(dtheta2dt);
 *    if (Altitude < 120000) ExitDragForceList.push(DragForce / 1000);
 *    if (Altitude < 100000) ExitcList.push(c);
 *    if (Altitude < 120000) ExitAirDensityList.push(AirDensity);
 *    if (Altitude < 120000) ExitPatmList.push(Patm / 101325);
 *    if (Altitude < 100000) ExitTatmList.push(Tatm);
 *    if (Altitude < 100000) ExitcDList.push(cD);
 *    if (FuelMass > 0) FuelMassList.push(FuelMass);
 *    TimeList.push(t);
 *    t += 1;
 *  }
 *  //   var ThirdStageTime = t;
 *
 *  while (Altitude > 0) {
 *    FuelMass = 0;
 *    iterationFunOutput = _IterationFun(FuelArea2, FuelMass, RocketArea, Altitude, RocketCasingMass3, NozzleAltitude3, drdt, dthetadt, Distance, ArcDistance, MassIn, AngleCoefficient);
 *    FuelMass = iterationFunOutput[0];
 *    RocketMass = iterationFunOutput[1];
 *    Tatm = iterationFunOutput[2];
 *    Patm = iterationFunOutput[3];
 *    AirDensity = iterationFunOutput[4];
 *    c = iterationFunOutput[5];
 *    M = iterationFunOutput[6];
 *    cD = iterationFunOutput[7];
 *    Thrust = iterationFunOutput[8];
 *    DragForce = iterationFunOutput[9];
 *    WeightForce = iterationFunOutput[10];
 *    dr2dt = iterationFunOutput[11];
 *    drdt = iterationFunOutput[12];
 *    Altitude = iterationFunOutput[13];
 *    Distance = iterationFunOutput[14];
 *    // ArcVelocity = iterationFunOutput[15];
 *    ArcDistance = iterationFunOutput[16];
 *    dtheta2dt = iterationFunOutput[17];
 *    dthetadt = iterationFunOutput[18];
 *    AdjacentList.push(Math.cos(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    OppositeList.push(Math.sin(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    WeightForceList.push(WeightForce / RocketMass);
 *    MList.push(M);
 *    AltitudeList.push(Math.round((Altitude / 1000) * 1e2) / 1e2);
 *    DistanceList.push(Distance / 1000);
 *    ArcDistanceList.push(ArcDistance / 1000);
 *    for (i = 0; i < EstDistanceList.length; i++) {
 *      if (EstDistanceList[i] <= Distance / 1000 && !(EstDistanceList[i + 1] <= Distance / 1000)) {
 *        LatList.push(Math.round(EstLatList[i] * 1e2) / 1e2);
 *        LongList.push(Math.round(EstLongList[i] * 1e2) / 1e2);
 *        // if (!CurrentTime) console.log(t + 's - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Dist: ' + EstDistanceList[i].toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        // if (CurrentTime) console.log(new Date(t) + ' - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        break;
 *      }
 *    }
 *    drdtList.push(drdt);
 *    dthetadtList.push(dthetadt);
 *    if (Altitude < 120000) EnterDragForceList.push(DragForce / 1000);
 *    if (Altitude < 120000) EntercList.push(c);
 *    if (Altitude < 120000) EnterAirDensityList.push(AirDensity);
 *    if (Altitude < 120000) EnterPatmList.push(Patm / 101325);
 *    if (Altitude < 120000) EnterTatmList.push(Tatm);
 *    if (Altitude < 120000) Enterdr2dtList.push(dr2dt);
 *    if (Altitude < 120000) Enterdtheta2dtList.push(dtheta2dt);
 *    if (Altitude < 120000) EntercDList.push(cD);
 *    TimeList.push(t);
 *    t += 1;
 *  }
 *  //   var impactTime = t;
 *
 *  // This will find the max acceleration, max velocity, and max height out of their lists
 *  //   var MaxVerticalAcceleration = Exitdr2dtList.reduce(function (a, b) {
 *  //     return Math.max(a, b);
 *  //   });
 *  //   var MaxAngularAcceleration = Exitdtheta2dtList.reduce(function (a, b) {
 *  //     return Math.max(a, b);
 *  //   });
 *  //   var MaxVerticalVelocity = drdtList.reduce(function (a, b) {
 *  //     return Math.max(a, b);
 *  //   });
 *  //   var MaxAngularVelocity = dthetadtList.reduce(function (a, b) {
 *  //     return Math.max(a, b);
 *  //   });
 *  var MaxAltitude = AltitudeList.reduce(function (a, b) {
 *    return Math.max(a, b);
 *  });
 *
 *  console.log(`Max Altitude ${MaxAltitude}`);
 *  console.log(AltitudeList);
 *  console.log(`Required Altitude ${minAltitude}`);
 *  if (MaxAltitude < minAltitude) {
 *    missileManager.lastMissileErrorType = ToastMsgType.critical;
 *    missileManager.lastMissileError = `Failed Min Altitude Check! Max Altitude ${MaxAltitude} km.`;
 *    return -1;
 *  }
 *
 *  console.log(CurrentTime);
 *
 *  for (i = 0; i < AltitudeList.length; i++) {
 *    if (AltitudeList[i] === MaxAltitude) var MaxAltitudePossition = i;
 *  }
 *  console.log(`Time Until Max Altitude: ${MaxAltitudePossition}`);
 *  return MaxAltitudePossition; // Time Until Max Altitude
 *
 *  //   for (i = 0; i < drdtList.length; i++) {
 *  //     if (drdtList[i] === MaxVerticalVelocity) var MaxVerticalVelocityPossition = i;
 *  //   }
 *  //   var AverageAngularVelocity = 0;
 *  //   for (i = 0; i < dthetadtList.length; i++) {
 *  //     if (dthetadtList[i] === MaxAngularVelocity) var MaxAngularVelocityPossition = i;
 *  //     AverageAngularVelocity += dthetadtList[i];
 *  //   }
 *  //   for (i = 0; i < Exitdr2dtList.length; i++) {
 *  //     if (Exitdr2dtList[i] === MaxVerticalAcceleration) var MaxVerticalAccelerationPossition = i;
 *  //   }
 *  //   for (i = 0; i < Exitdtheta2dtList.length; i++) {
 *  //     if (Exitdtheta2dtList[i] === MaxAngularAcceleration) var MaxAngularAccelerationPossition = i;
 *  //   }
 *
 *  //   if (MissileObject) {
 *  //     MissileObject.static = false;
 *  //     MissileObject.altList = AltitudeList;
 *  //     MissileObject.latList = LatList;
 *  //     MissileObject.lonList = LongList;
 *  //     // MissileObject.timeList = TimeList;
 *  //     MissileObject.active = true;
 *  //     MissileObject.missile = true;
 *  //     MissileObject.type = '';
 *  //     MissileObject.id = MissileObjectNum;
 *  //     MissileObject.ON = 'RV_' + MissileObject.id;
 *  //     MissileObject.satId = MissileObjectNum;
 *  //     MissileObject.maxAlt = MaxAltitude;
 *  //     MissileObject.startTime = CurrentTime;
 *  //     if (country) MissileObject.C = country;
 *
 *  //     if (MissileObject.apogee) delete MissileObject.apogee;
 *  //     if (MissileObject.argOfPerigee) delete MissileObject.argOfPerigee;
 *  //     if (MissileObject.eccentricity) delete MissileObject.eccentricity;
 *  //     if (MissileObject.inclination) delete MissileObject.inclination;
 *  //     // maxAlt is used for zoom controls
 *  //     // if (MissileObject.maxAlt) delete MissileObject.maxAlt;
 *  //     if (MissileObject.meanMotion) delete MissileObject.meanMotion;
 *  //     if (MissileObject.perigee) delete MissileObject.perigee;
 *  //     if (MissileObject.period) delete MissileObject.period;
 *  //     if (MissileObject.raan) delete MissileObject.raan;
 *  //     if (MissileObject.semiMajorAxis) delete MissileObject.semiMajorAxis;
 *  //     if (MissileObject.semiMinorAxis) delete MissileObject.semiMinorAxis;
 *
 *  //     if (MissileDesc) MissileObject.desc = MissileDesc;
 *  //     // console.log(MissileObject);
 *  //     missileArray.push(MissileObject);
 *  //     catalogManagerInstance.satCruncher.postMessage({
 *  //       id: MissileObject.id,
 *  //       typ: CruncerMessageTypes.NEW_MISSILE,
 *  //       ON: 'RV_' + MissileObject.id, // Don't think catalogManagerInstance.satCruncher needs this
 *  //       satId: MissileObject.id,
 *  //       static: MissileObject.static,
 *  //       missile: MissileObject.missile,
 *  //       active: MissileObject.active,
 *  //       type: MissileObject.type,
 *  //       name: MissileObject.id,
 *  //       latList: MissileObject.latList,
 *  //       lonList: MissileObject.lonList,
 *  //       altList: MissileObject.altList,
 *  //       startTime: MissileObject.startTime,
 *  //     });
 *  //     updateOrbitBuffer(MissileObjectNum, MissileObject.latList, MissileObject.lonList, MissileObject.altList, MissileObject.startTime);
 *
 *  //     missileManager.missileArray = missileArray;
 *
 *  //     // if (MissileObject.latList) delete MissileObject.latList;
 *  //     // if (MissileObject.lonList) delete MissileObject.lonList;
 *  //     // if (MissileObject.altList) delete MissileObject.altList;
 *  //     // if (MissileObject.startTime) delete MissileObject.startTime;
 *  //   }
 *  //   missileManager.missilesInUse++;
 *  //   missileManager.lastMissileErrorType = 'normal';
 *  //   missileManager.lastMissileError = 'Missile Named RV_' + MissileObject.id + '<br>has been created.';
 *  //   return 1; // Successful Launch
 *};
 *missileManager.asatFlight = function (
 *  CurrentLatitude,
 *  CurrentLongitude,
 *  TargetLatitude,
 *  TargetLongitude,
 *  targetAltitude,
 *  NumberWarheads,
 *  MissileObjectNum,
 *  CurrentTime,
 *  MissileDesc,
 *  Length,
 *  Diameter,
 *  NewBurnRate,
 *  MaxMissileRange,
 *  country,
 *  timeInFlight,
 *  AngleCoefficient
 *) {
 *  // This is the main function for this program. It calculates and designs the flight path of an intercontinental
 *  // ballistic missile (ICBM). This function calls upon many sub-functions to help it iteratively calculate many of the
 *  // changing variables as the rocket makes its path around the world. Changing variables that had to be taken into
 *  // account include:
 *  // Air density vs altitude
 *  // Air pressure vs altitude
 *  // Air temperature vs altitude
 *  // Drag coefficient vs mach number
 *  // Speed of sound vs altitude
 *  // Drag force vs time
 *  // Gravitational attraction vs altitude
 *  // Fuel mass vs time
 *  // Thrust vs time
 *  // Vertical velocity vs time
 *  // Angular velocity vs time
 *  // Vertical acceleration vs time
 *  // Angular acceleration vs time
 *  // Angular distance rocket travels vs time
 *  // Total distance rocket travels vs time
 *  // Many of these variables are dependent on each other. The inputs of this function are:
 *  // Currentlat:  Latitude of the starting position
 *  // Currentlon: Longitude of the starting position
 *  // Targetlat:   Latitude of the ending position
 *  // Targetlon:  Longitude of the ending position
 *  // NumberWarheads:   Number of warhead loaded onto the missile
 *  // The coordinates are to be inputed as degrees and NumberWarheads must be an intagure. The first thing the
 *  // program does is calculate everything regarding the path the rocket will take to minimize
 *  // distance needed to travel. It uses the CoordinateCalculator function to accomplish this.
 *  // It then calculates everything regarding the casing and fuel of the rocket. After calculating all
 *  // the necessary constants it starts its iterative calculation of the rockets actual path and collects
 *  // information into lists as it moves through its times steps. It changes its iterative approach once
 *  // the rocket runs out of fuel by dropping out everything used to calculate the trust. Once the rocket
 *  // reaches an altitude of zero meters it ends the iterations. Using all the information gathers it
 *  // presents them in the form of print statements and also plots.
 *
 *  var MissileObject = getSat(MissileObjectNum);
 *
 *  // Dimensions of the rocket
 *  Length = Length || 17; // (m)
 *  Diameter = Diameter || 3.1; // (m)
 *
 *  if (CurrentLatitude > 90 || CurrentLatitude < -90) {
 *    console.debug('Error: Current Latitude must be between 90 and -90 degrees');
 *    return 0;
 *  }
 *  if (CurrentLongitude > 180 || CurrentLongitude < -180) {
 *    console.debug('Error: Current Longitude must be between 180 and -180 degrees');
 *    return 0;
 *  }
 *  if (TargetLatitude > 90 || TargetLatitude < -90) {
 *    // console.debug('Error: Target Latitude must be between 90 and -90 degrees');
 *    missileManager.lastMissileErrorType = ToastMsgType.critical;
 *    missileManager.lastMissileError = 'Error: Target Latitude must be<br>between 90 and -90 degrees';
 *    return 0;
 *  }
 *  if (TargetLongitude > 180 || TargetLongitude < -180) {
 *    // console.debug('Error: Target Longitude must be between 180 and -180 degrees');
 *    console.log(TargetLongitude);
 *    missileManager.lastMissileErrorType = ToastMsgType.critical;
 *    missileManager.lastMissileError = 'Error: Target Longitude must be<br>between 180 and -180 degrees';
 *    return 0;
 *  }
 *  if (NumberWarheads > 12) {
 *    console.debug('Error: Rocket can hold up to 12 warheads');
 *    return 0;
 *  }
 *  if (parseFloat(NumberWarheads) % 1 > 0) {
 *    console.debug('Error: The number of warheads must be a whole number');
 *    return 0;
 *  }
 *
 *  var minAltitude = 0;
 *
 *  EarthRadius = 6371000; // (m)
 *  R = 287; // (J * K^-1 * kg^-1)
 *  G = 6.67384 * Math.pow(10, -11); // (m^3 * kg^-1 * s^-2)
 *  EarthMass = 5.9726 * Math.pow(10, 24); // (kg)
 *
 *  // This function will calculate the path the rocket will take in terms of coordinates
 *  //   var GoalDistance;
 *  var EstDistanceList = [];
 *  var LatList = [];
 *  var LongList = [];
 *  var EstLatList = [];
 *  var EstLongList = [];
 *  //   var Alpha1;
 *
 *  var calculatedCoordinates = [];
 *
 *  calculatedCoordinates = _CoordinateCalculator(CurrentLatitude, CurrentLongitude, TargetLatitude, TargetLongitude);
 *  EstLatList = calculatedCoordinates[0];
 *  EstLongList = calculatedCoordinates[1];
 *  //   Alpha1 = calculatedCoordinates[2];
 *  ArcLength = calculatedCoordinates[3];
 *  EstDistanceList = calculatedCoordinates[4];
 *  //   GoalDistance = calculatedCoordinates[5];
 *
 *  // if (ArcLength < 320000) {
 *  //   // console.debug('Error: This missile has a minimum distance of 320 km.');
 *  //   // console.debug('Please choose different target coordinates.');
 *  //   missileManager.lastMissileError = 'Error: This missile has a minimum distance of 320 km.';
 *  //   return 0;
 *  // }
 *
 *  if (ArcLength > MaxMissileRange * 1000) {
 *    // console.debug('Error: This missile has a maximum distance of ' + MaxMissileRange + ' km.');
 *    // console.debug('Please choose different target coordinates.');
 *    missileManager.lastMissileErrorType = ToastMsgType.critical;
 *    missileManager.lastMissileError = 'Error: This missile has a maximum distance of ' + MaxMissileRange + ' km.';
 *    return 0;
 *  }
 *
 *  // Calculations for the warheads
 *  WarheadMass = 500 * NumberWarheads; // (Kg)
 *  //   var WarheadPayload = 475 * NumberWarheads; // (KiloTons of TNT)
 *  //   var TotalDestruction = 92.721574 * NumberWarheads; // (km^2)
 *  //   var PartialDestruction = 261.5888 * NumberWarheads; // (km^2)
 *
 *  // Calculations for the casing
 *  var Thickness = 0.050389573 * Diameter; // (m)
 *  var RocketArea = 0.25 * Math.PI * Math.pow(Diameter, 2); // (m^2)
 *  //   var RocketVolume = RocketArea * Length; // (m^3)
 *  var RocketCasingDensity = 1628.75; // (kg/m^3)http://scholar.lib.vt.edu/theses/available/etd-101198-161441/unrestricted/appendix.pdf
 *  var RocketCasingVolume = 0.25 * Math.PI * Length * (Math.pow(Diameter, 2) - Math.pow(Diameter - Thickness, 2)); // (m^3)
 *  var RocketCasingMass1 = RocketCasingDensity * RocketCasingVolume; // (kg)
 *  var RocketCasingMass2 = RocketCasingDensity * 0.25 * Math.PI * (Length * 0.4937) * (Math.pow(Diameter, 2) - Math.pow(Diameter - Thickness, 2)); // (kg)
 *  var RocketCasingMass3 = RocketCasingDensity * 0.25 * Math.PI * (Length * 0.157) * (Math.pow(Diameter * 0.75, 2) - (Diameter * 0.75 - Math.pow(Thickness / 2), 2)); // (kg)
 *
 *  // Calculations for the fuel
 *  BurnRate = NewBurnRate || 0.042; // (m/s)
 *  FuelDensity = 1750; // (kg/m^2)
 *  var FuelArea1 = 0.25 * Math.PI * Math.pow(Diameter - Thickness, 2); // (m^2)
 *  var FuelArea2 = 0.25 * Math.PI * Math.pow(Diameter * 0.75 - Thickness, 2); // (m^2)
 *  var FuelVolume = FuelArea1 * (Length * 0.651) + FuelArea2 * (Length * 0.178); // (m^3)
 *  var FuelMass = FuelDensity * FuelVolume; // http://www.lr.tudelft.nl/en/organisation/departments/space-engineering/space-systems-engineering/expertise-areas/space-propulsion/design-of-elements/rocket-propellants/solids/
 *  var RocketMass = FuelMass + RocketCasingMass1 + WarheadMass; // (kg)
 *
 *  // Here are the initial conditions
 *  var dthetadt = 0.001; // (m/s)
 *  var drdt = 0.001; // (m/s)
 *  var Altitude = 0; // (m)
 *  var NozzleAltitude1 = 0; // (m)
 *  var Distance = 0; // (m)
 *  var ArcDistance = 0; // (m)
 *  var MassIn = 0; // (kg/s)
 *
 *  // Here are the time steps and counters
 *  // var y = 0;
 *  // var z = 0;
 *  var t = 0;
 *  h = 1;
 *
 *  // Here are the definitions for all the lists
 *  var OppositeList = [];
 *  var AdjacentList = [];
 *  var WeightForceList = [];
 *  var AltitudeList = [];
 *  var DistanceList = [];
 *  var ArcDistanceList = [];
 *  var drdtList = [];
 *  var dthetadtList = [];
 *  var MList = [];
 *  var FuelMassList = [];
 *  var hList = [];
 *  var ThrustList = [];
 *  var NozzleAltitude = [];
 *  for (var i = 0; i < 100000; i++) {
 *    NozzleAltitude.push(i);
 *  }
 *  var ExitcDList = [];
 *  var Exitdr2dtList = [];
 *  var Exitdtheta2dtList = [];
 *  var ExitDragForceList = [];
 *  var ExitcList = [];
 *  var ExitAirDensityList = [];
 *  var ExitPatmList = [];
 *  var ExitTatmList = [];
 *  var EntercDList = [];
 *  var Enterdr2dtList = [];
 *  var Enterdtheta2dtList = [];
 *  var EnterDragForceList = [];
 *  var EnterAirDensityList = [];
 *  var EnterPatmList = [];
 *  var EnterTatmList = [];
 *  var EntercList = [];
 *  // var TotalDistanceList = [];
 *  var TimeList = [];
 *  var dtheta2dt, ArcLength, dr2dt, WeightForce, DragForce, Thrust, cD, M, c, AirDensity, Patm, Tatm;
 *
 *  // var AngleCoefficient = _Bisection(FuelArea1, FuelArea2, FuelMass, FuelVolume, RocketArea, Altitude, RocketCasingMass1, RocketCasingMass2, RocketCasingMass3, NozzleAltitude1, drdt, dthetadt, Distance, ArcDistance, MassIn, ArcLength, GoalDistance);
 *  // console.log(AngleCoefficient);
 *
 *  while (FuelMass / FuelDensity / FuelVolume > 0.4 && Altitude >= 0) {
 *    var iterationFunOutput = _IterationFun(FuelArea1, FuelMass, RocketArea, Altitude, RocketCasingMass1, NozzleAltitude1, drdt, dthetadt, Distance, ArcDistance, MassIn, AngleCoefficient);
 *    FuelMass = iterationFunOutput[0];
 *    RocketMass = iterationFunOutput[1];
 *    Tatm = iterationFunOutput[2];
 *    Patm = iterationFunOutput[3];
 *    AirDensity = iterationFunOutput[4];
 *    c = iterationFunOutput[5];
 *    M = iterationFunOutput[6];
 *    cD = iterationFunOutput[7];
 *    Thrust = iterationFunOutput[8];
 *    DragForce = iterationFunOutput[9];
 *    WeightForce = iterationFunOutput[10];
 *    dr2dt = iterationFunOutput[11];
 *    drdt = iterationFunOutput[12];
 *    Altitude = iterationFunOutput[13];
 *    Distance = iterationFunOutput[14];
 *    // ArcVelocity = iterationFunOutput[15];
 *    ArcDistance = iterationFunOutput[16];
 *    dtheta2dt = iterationFunOutput[17];
 *    dthetadt = iterationFunOutput[18];
 *    var NozzleAltitude2 = Altitude;
 *
 *    AdjacentList.push(Math.cos(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    OppositeList.push(Math.sin(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    WeightForceList.push(WeightForce / RocketMass);
 *    ThrustList.push(Thrust / 1000);
 *    MList.push(M);
 *    AltitudeList.push(Math.round((Altitude / 1000) * 1e2) / 1e2);
 *    DistanceList.push(Distance / 1000);
 *    ArcDistanceList.push(ArcDistance / 1000);
 *    for (i = 0; i < EstDistanceList.length; i++) {
 *      if (EstDistanceList[i] <= Distance / 1000 && !(EstDistanceList[i + 1] <= Distance / 1000)) {
 *        LatList.push(Math.round(EstLatList[i] * 1e2) / 1e2);
 *        LongList.push(Math.round(EstLongList[i] * 1e2) / 1e2);
 *        // if (!CurrentTime) console.log(t + 's - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Dist: ' + EstDistanceList[i].toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        // if (CurrentTime) console.log(new Date(t) + ' - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        break;
 *      }
 *    }
 *    drdtList.push(drdt);
 *    dthetadtList.push(dthetadt);
 *    var hListSum;
 *    for (i = 0; i < hList.length; i++) {
 *      hListSum += hList[i];
 *    }
 *    hList.push(h + hListSum);
 *    Exitdr2dtList.push(dr2dt);
 *    Exitdtheta2dtList.push(dtheta2dt);
 *    if (Altitude < 120000) ExitDragForceList.push(DragForce / 1000);
 *    if (Altitude < 100000) ExitcList.push(c);
 *    if (Altitude < 120000) ExitAirDensityList.push(AirDensity);
 *    if (Altitude < 120000) ExitPatmList.push(Patm / 101325);
 *    if (Altitude < 100000) ExitTatmList.push(Tatm);
 *    if (Altitude < 100000) ExitcDList.push(cD);
 *    if (FuelMass > 0) FuelMassList.push(FuelMass);
 *    TimeList.push(t);
 *    t += 1;
 *  }
 *  //   var FirstStageTime = t;
 *
 *  while (FuelMass / FuelDensity / FuelVolume > 0.19 && Altitude >= 0) {
 *    iterationFunOutput = _IterationFun(FuelArea1, FuelMass, RocketArea, Altitude, RocketCasingMass2, NozzleAltitude2, drdt, dthetadt, Distance, ArcDistance, MassIn, AngleCoefficient);
 *    FuelMass = iterationFunOutput[0];
 *    RocketMass = iterationFunOutput[1];
 *    Tatm = iterationFunOutput[2];
 *    Patm = iterationFunOutput[3];
 *    AirDensity = iterationFunOutput[4];
 *    c = iterationFunOutput[5];
 *    M = iterationFunOutput[6];
 *    cD = iterationFunOutput[7];
 *    Thrust = iterationFunOutput[8];
 *    DragForce = iterationFunOutput[9];
 *    WeightForce = iterationFunOutput[10];
 *    dr2dt = iterationFunOutput[11];
 *    drdt = iterationFunOutput[12];
 *    Altitude = iterationFunOutput[13];
 *    Distance = iterationFunOutput[14];
 *    // ArcVelocity = iterationFunOutput[15];
 *    ArcDistance = iterationFunOutput[16];
 *    dtheta2dt = iterationFunOutput[17];
 *    dthetadt = iterationFunOutput[18];
 *    var NozzleAltitude3 = Altitude;
 *
 *    AdjacentList.push(Math.cos(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    OppositeList.push(Math.sin(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    WeightForceList.push(WeightForce / RocketMass);
 *    ThrustList.push(Thrust / 1000);
 *    MList.push(M);
 *    AltitudeList.push(Math.round((Altitude / 1000) * 1e2) / 1e2);
 *    DistanceList.push(Distance / 1000);
 *    ArcDistanceList.push(ArcDistance / 1000);
 *    for (i = 0; i < EstDistanceList.length; i++) {
 *      if (EstDistanceList[i] <= Distance / 1000 && !(EstDistanceList[i + 1] <= Distance / 1000)) {
 *        LatList.push(Math.round(EstLatList[i] * 1e2) / 1e2);
 *        LongList.push(Math.round(EstLongList[i] * 1e2) / 1e2);
 *        // if (!CurrentTime) console.log(t + 's - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Dist: ' + EstDistanceList[i].toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        // if (CurrentTime) console.log(new Date(t) + ' - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        break;
 *      }
 *    }
 *    drdtList.push(drdt);
 *    dthetadtList.push(dthetadt);
 *    hListSum;
 *    for (i = 0; i < hList.length; i++) {
 *      hListSum += hList[i];
 *    }
 *    hList.push(h + hListSum);
 *    Exitdr2dtList.push(dr2dt);
 *    Exitdtheta2dtList.push(dtheta2dt);
 *    if (Altitude < 120000) ExitDragForceList.push(DragForce / 1000);
 *    if (Altitude < 100000) ExitcList.push(c);
 *    if (Altitude < 120000) ExitAirDensityList.push(AirDensity);
 *    if (Altitude < 120000) ExitPatmList.push(Patm / 101325);
 *    if (Altitude < 100000) ExitTatmList.push(Tatm);
 *    if (Altitude < 100000) ExitcDList.push(cD);
 *    if (FuelMass > 0) FuelMassList.push(FuelMass);
 *    TimeList.push(t);
 *    t += 1;
 *  }
 *  //   var SecondStageTime = t;
 *
 *  while (FuelMass / FuelDensity / FuelVolume > 0 && Altitude >= 0) {
 *    iterationFunOutput = _IterationFun(FuelArea2, FuelMass, RocketArea, Altitude, RocketCasingMass3, NozzleAltitude3, drdt, dthetadt, Distance, ArcDistance, MassIn, AngleCoefficient);
 *    FuelMass = iterationFunOutput[0];
 *    RocketMass = iterationFunOutput[1];
 *    Tatm = iterationFunOutput[2];
 *    Patm = iterationFunOutput[3];
 *    AirDensity = iterationFunOutput[4];
 *    c = iterationFunOutput[5];
 *    M = iterationFunOutput[6];
 *    cD = iterationFunOutput[7];
 *    Thrust = iterationFunOutput[8];
 *    DragForce = iterationFunOutput[9];
 *    WeightForce = iterationFunOutput[10];
 *    dr2dt = iterationFunOutput[11];
 *    drdt = iterationFunOutput[12];
 *    Altitude = iterationFunOutput[13];
 *    Distance = iterationFunOutput[14];
 *    // ArcVelocity = iterationFunOutput[15];
 *    ArcDistance = iterationFunOutput[16];
 *    dtheta2dt = iterationFunOutput[17];
 *    dthetadt = iterationFunOutput[18];
 *
 *    AdjacentList.push(Math.cos(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    OppositeList.push(Math.sin(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    WeightForceList.push(WeightForce / RocketMass);
 *    ThrustList.push(Thrust / 1000);
 *    MList.push(M);
 *    AltitudeList.push(Math.round((Altitude / 1000) * 1e2) / 1e2);
 *    DistanceList.push(Distance / 1000);
 *    ArcDistanceList.push(ArcDistance / 1000);
 *    for (i = 0; i < EstDistanceList.length; i++) {
 *      if (EstDistanceList[i] <= Distance / 1000 && !(EstDistanceList[i + 1] <= Distance / 1000)) {
 *        LatList.push(Math.round(EstLatList[i] * 1e2) / 1e2);
 *        LongList.push(Math.round(EstLongList[i] * 1e2) / 1e2);
 *        // if (!CurrentTime) console.log(t + 's - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Dist: ' + EstDistanceList[i].toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        // if (CurrentTime) console.log(new Date(t) + ' - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        break;
 *      }
 *    }
 *    drdtList.push(drdt);
 *    dthetadtList.push(dthetadt);
 *    hListSum;
 *    for (i = 0; i < hList.length; i++) {
 *      hListSum += hList[i];
 *    }
 *    hList.push(h + hListSum);
 *    Exitdr2dtList.push(dr2dt);
 *    Exitdtheta2dtList.push(dtheta2dt);
 *    if (Altitude < 120000) ExitDragForceList.push(DragForce / 1000);
 *    if (Altitude < 100000) ExitcList.push(c);
 *    if (Altitude < 120000) ExitAirDensityList.push(AirDensity);
 *    if (Altitude < 120000) ExitPatmList.push(Patm / 101325);
 *    if (Altitude < 100000) ExitTatmList.push(Tatm);
 *    if (Altitude < 100000) ExitcDList.push(cD);
 *    if (FuelMass > 0) FuelMassList.push(FuelMass);
 *    TimeList.push(t);
 *    t += 1;
 *  }
 *  //   var ThirdStageTime = t;
 *
 *  while (Altitude / 1000 <= targetAltitude) {
 *    // while (Altitude > 0) {
 *    FuelMass = 0;
 *    iterationFunOutput = _IterationFun(FuelArea2, FuelMass, RocketArea, Altitude, RocketCasingMass3, NozzleAltitude3, drdt, dthetadt, Distance, ArcDistance, MassIn, AngleCoefficient);
 *    FuelMass = iterationFunOutput[0];
 *    RocketMass = iterationFunOutput[1];
 *    Tatm = iterationFunOutput[2];
 *    Patm = iterationFunOutput[3];
 *    AirDensity = iterationFunOutput[4];
 *    c = iterationFunOutput[5];
 *    M = iterationFunOutput[6];
 *    cD = iterationFunOutput[7];
 *    Thrust = iterationFunOutput[8];
 *    DragForce = iterationFunOutput[9];
 *    WeightForce = iterationFunOutput[10];
 *    dr2dt = iterationFunOutput[11];
 *    drdt = iterationFunOutput[12];
 *    Altitude = iterationFunOutput[13];
 *    Distance = iterationFunOutput[14];
 *    // ArcVelocity = iterationFunOutput[15];
 *    ArcDistance = iterationFunOutput[16];
 *    dtheta2dt = iterationFunOutput[17];
 *    dthetadt = iterationFunOutput[18];
 *    AdjacentList.push(Math.cos(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    OppositeList.push(Math.sin(ArcDistance / EarthRadius) * (Altitude + EarthRadius));
 *    WeightForceList.push(WeightForce / RocketMass);
 *    MList.push(M);
 *    AltitudeList.push(Math.round((Altitude / 1000) * 1e2) / 1e2);
 *    DistanceList.push(Distance / 1000);
 *    ArcDistanceList.push(ArcDistance / 1000);
 *    for (i = 0; i < EstDistanceList.length; i++) {
 *      if (EstDistanceList[i] <= Distance / 1000 && !(EstDistanceList[i + 1] <= Distance / 1000)) {
 *        LatList.push(Math.round(EstLatList[i] * 1e2) / 1e2);
 *        LongList.push(Math.round(EstLongList[i] * 1e2) / 1e2);
 *        // if (!CurrentTime) console.log(t + 's - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Dist: ' + EstDistanceList[i].toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        // if (CurrentTime) console.log(new Date(t) + ' - Altitude: ' + (Altitude/1000).toFixed(1) + ' - Lat: ' + EstLatList[i].toFixed(1) + ' - Lon: ' + EstLongList[i].toFixed(1));
 *        break;
 *      }
 *    }
 *    drdtList.push(drdt);
 *    dthetadtList.push(dthetadt);
 *    if (Altitude < 120000) EnterDragForceList.push(DragForce / 1000);
 *    if (Altitude < 120000) EntercList.push(c);
 *    if (Altitude < 120000) EnterAirDensityList.push(AirDensity);
 *    if (Altitude < 120000) EnterPatmList.push(Patm / 101325);
 *    if (Altitude < 120000) EnterTatmList.push(Tatm);
 *    if (Altitude < 120000) Enterdr2dtList.push(dr2dt);
 *    if (Altitude < 120000) Enterdtheta2dtList.push(dtheta2dt);
 *    if (Altitude < 120000) EntercDList.push(cD);
 *    TimeList.push(t);
 *    t += 1;
 *  }
 *  //   var timeInFlight = t;
 *
 *  // This will find the max acceleration, max velocity, and max height out of their lists
 *  // var MaxVerticalAcceleration = Exitdr2dtList.reduce(function (a, b) {
 *  //   return Math.max(a, b);
 *  // });
 *  // var MaxAngularAcceleration = Exitdtheta2dtList.reduce(function (a, b) {
 *  //   return Math.max(a, b);
 *  // });
 *  // var MaxVerticalVelocity = drdtList.reduce(function (a, b) {
 *  //   return Math.max(a, b);
 *  // });
 *  // var MaxAngularVelocity = dthetadtList.reduce(function (a, b) {
 *  //   return Math.max(a, b);
 *  // });
 *  var MaxAltitude = AltitudeList.reduce(function (a, b) {
 *    return Math.max(a, b);
 *  });
 *
 *  // console.log(MaxAltitude);
 *  console.log(CurrentTime);
 *
 *  if (MaxAltitude < minAltitude) {
 *    // Try again with 25% increase to burn rate
 *    // let burnMultiplier = Math.min(3, minAltitude / MaxAltitude);
 *    // setTimeout(function () {
 *    missileManager.asatFlight(CurrentLatitude, CurrentLongitude, TargetLatitude, TargetLongitude, targetAltitude, NumberWarheads, MissileObjectNum, CurrentTime, MissileDesc, Length, Diameter, NewBurnRate, MaxMissileRange, country);
 *    // }, 10);
 *    return 0;
 *  }
 *
 *  // for (i = 0; i < AltitudeList.length; i++) {
 *  //   if (AltitudeList[i] === MaxAltitude) var MaxAltitudePossition = i;
 *  // }
 *  // for (i = 0; i < drdtList.length; i++) {
 *  //   if (drdtList[i] === MaxVerticalVelocity) var MaxVerticalVelocityPossition = i;
 *  // }
 *  // var AverageAngularVelocity = 0;
 *  // for (i = 0; i < dthetadtList.length; i++) {
 *  //   if (dthetadtList[i] === MaxAngularVelocity) var MaxAngularVelocityPossition = i;
 *  //   AverageAngularVelocity += dthetadtList[i];
 *  // }
 *  // for (i = 0; i < Exitdr2dtList.length; i++) {
 *  //   if (Exitdr2dtList[i] === MaxVerticalAcceleration) var MaxVerticalAccelerationPossition = i;
 *  // }
 *  // for (i = 0; i < Exitdtheta2dtList.length; i++) {
 *  //   if (Exitdtheta2dtList[i] === MaxAngularAcceleration) var MaxAngularAccelerationPossition = i;
 *  // }
 *
 *  // console.log('Max Angular Velocity: ' + MaxAngularVelocity / 1000);
 *  // console.log('Average Angular Velocity: ' + AverageAngularVelocity / dthetadtList.length / 1000);
 *
 *  // This will print the variables at their max value with its respective time in minutes
 *  // It takes into acount the difference in the singular and plural form of the words 'minutes' and 'seconds'
 *
 *  // if (CurrentTime) {
 *  //   console.info('First Stage = ' + new Date(FirstStageTime));
 *  //   console.info('Second Stage = ' + new Date(SecondStageTime));
 *  //   console.info('Third Stage = ' + new Date(ThirdStageTime));
 *  //   console.info('Impact Time = ' + new Date(impactTime));
 *  // } else {
 *  // console.info('First Stage = ' + FirstStageTime + ' sec (' + FirstStageTime / 60 + ' min)');
 *  // console.info('Second Stage = ' + SecondStageTime + ' sec (' + SecondStageTime / 60 + ' min)');
 *  // console.info('Third Stage = ' + ThirdStageTime + ' sec (' + ThirdStageTime / 60 + ' min)');
 *  // console.info('Impact Time = ' + impactTime + ' sec (' + impactTime / 60 + ' min)');
 *  // }
 *  // console.info('ArcDistance = ' + Math.round(ArcDistance / 1000, 2) + 'Km');
 *  // console.info('Distance to target is' + Math.round(ArcLength / 1000, 2) + 'km');
 *  // console.info('Direction to target is' + Math.round(Alpha1, 2) + ' degrees from north');
 *  // console.info('Warhead payload delivered:' + WarheadPayload + 'Kilotons of TNT');
 *  // console.info('Total Blast area for complete structural destruction:' + Math.round(TotalDestruction, 2) + 'Square Kilometers');
 *  // console.info('Total Blast area for partial structural destruction:' + Math.round(PartialDestruction, 2) + 'Square Kilometers');
 *
 *  if (MissileObject) {
 *    MissileObject.static = false;
 *    MissileObject.altList = AltitudeList;
 *    MissileObject.latList = LatList;
 *    MissileObject.lonList = LongList;
 *    // MissileObject.timeList = TimeList;
 *    MissileObject.active = true;
 *    MissileObject.missile = true;
 *    MissileObject.type = '';
 *    MissileObject.id = MissileObjectNum;
 *    MissileObject.ON = 'RV_' + MissileObject.id;
 *    MissileObject.satId = MissileObjectNum;
 *    MissileObject.maxAlt = MaxAltitude;
 *    MissileObject.startTime = CurrentTime;
 *    if (country) MissileObject.C = country;
 *
 *    if (MissileObject.apogee) delete MissileObject.apogee;
 *    if (MissileObject.argOfPerigee) delete MissileObject.argOfPerigee;
 *    if (MissileObject.eccentricity) delete MissileObject.eccentricity;
 *    if (MissileObject.inclination) delete MissileObject.inclination;
 *    // maxAlt is used for zoom controls
 *    // if (MissileObject.maxAlt) delete MissileObject.maxAlt;
 *    if (MissileObject.meanMotion) delete MissileObject.meanMotion;
 *    if (MissileObject.perigee) delete MissileObject.perigee;
 *    if (MissileObject.period) delete MissileObject.period;
 *    if (MissileObject.raan) delete MissileObject.raan;
 *    if (MissileObject.semiMajorAxis) delete MissileObject.semiMajorAxis;
 *    if (MissileObject.semiMinorAxis) delete MissileObject.semiMinorAxis;
 *
 *    if (MissileDesc) MissileObject.desc = MissileDesc;
 *    // console.log(MissileObject);
 *    missileArray.push(MissileObject);
 *    catalogManagerInstance.satCruncher.postMessage({
 *      id: MissileObject.id,
 *      typ: CruncerMessageTypes.NEW_MISSILE,
 *      ON: 'RV_' + MissileObject.id, // Don't think catalogManagerInstance.satCruncher needs this
 *      satId: MissileObject.id,
 *      static: MissileObject.static,
 *      missile: MissileObject.missile,
 *      active: MissileObject.active,
 *      type: MissileObject.type,
 *      name: MissileObject.id,
 *      latList: MissileObject.latList,
 *      lonList: MissileObject.lonList,
 *      altList: MissileObject.altList,
 *      startTime: MissileObject.startTime,
 *    });
 *    updateOrbitBuffer(MissileObjectNum, MissileObject.latList, MissileObject.lonList, MissileObject.altList, MissileObject.startTime);
 *
 *    missileManager.missileArray = missileArray;
 *
 *    // if (MissileObject.latList) delete MissileObject.latList;
 *    // if (MissileObject.lonList) delete MissileObject.lonList;
 *    // if (MissileObject.altList) delete MissileObject.altList;
 *    // if (MissileObject.startTime) delete MissileObject.startTime;
 *  }
 *  missileManager.missilesInUse++;
 *  missileManager.lastMissileErrorType = 'normal';
 *  missileManager.lastMissileError = 'Missile Named RV_' + MissileObject.id + '<br>has been created.';
 *  return [timeInFlight, LatList[timeInFlight - 1], LongList[timeInFlight - 1]]; // Successful Launch
 *};
 */

// Internal Functions
export const calculatePressure_ = (Altitude: number) => {
  /*
   * This function calculates the atmospheric pressure. The only iMathut is the
   * Altitude. The constiables in the function are:
   */

  /*
   * Po:   Atmospheric pressure at sea level
   * mol:  Amount of air in one gram
   * Tsea: Temperature at sea level
   * R:    Gas constant for air
   * g:    Gravitational constant
   */

  // The function will return the calculated atmospheric pressure

  const Po = 101325; // (Pa)
  const mol = 0.02897; // (mol)
  const Tsea = 288; // (K)
  const _R = 8.31451; // (J / K mol)
  const g = 9.81; // (m/s^2)


  return Po * Math.exp((-mol * g * Altitude) / (_R * Tsea)); // (Pa)
};
export const calculateTemperature_ = (Altitude: number) => {
  /*
   * This function calculates the atmospheric temperature at any given altitude.
   * The function has one iMathut for altitude. Because atmospheric temperature can not
   * be represented as one equation, this function is made up of a series of curve fits
   * which each make up a section of the atmosphere. After an elevation of 120 km
   * the atmosphere becomes so sparse that it become negligible so the function keeps a
   * constant temperature after that point.
   */

  Altitude /= 1000; // (km)
  if (Altitude < 12.5) {
    return 276.642857143 - 5.02285714286 * Altitude;
  } // (K)
  if (Altitude < 20) {
    return 213.0;
  } // (K)
  if (Altitude < 47.5) {
    return 171.224358974 + 2.05384615385 * Altitude;
  } // (K)
  if (Altitude < 52.5) {
    return 270.0;
  } // (K)
  if (Altitude < 80) {
    return 435.344405594 - 3.13916083916 * Altitude;
  } // (K)
  if (Altitude < 90) {
    return 183.0;
  } // (K)
  if (Altitude < 110) {
    return -221.111111111 + 4.47 * Altitude;
  } // (K)
  if (Altitude < 120) {
    return -894.0 + 10.6 * Altitude;
  } // (K)
  if (Altitude >= 120) {
    return -894.0 + 10.6 * 120;
  } // (K)

  // Catch All
  return -894.0 + 10.6 * 120; // (K)
};
export const calculateDrag_ = (M: number) => {
  /*
   * This function calculates the drag coefficient of the rocket. This function is based
   * off of a plot that relates the drag coefficient with the mach number of the rocket.
   * Because the plot can not be represented with one equation it is broken up into multiple
   * curve fits. The only iMathut for the function is the mach number the rocket is traveling.
   */

  if (M < 0.5) {
    return 0.125;
  }
  if (M < 1.1875) {
    return -0.329086061307 + 2.30117394072 * M + -4.06597222013 * M ** 2 + 3.01851851676 * M ** 3 + -0.666666666129 * M ** 4;
  }
  if (M < 1.625) {
    return 0.10937644721 + -4.61979595244 * M + 9.72917139612 * M ** 2 + -6.33333563852 * M ** 3 + 1.33333375211 * M ** 4;
  }
  if (M < 3.625) {
    return 0.97916002909 + -0.540978181863 * M + 0.125235817144 * M ** 2 + -0.00666103733277 * M ** 3 + -0.000558009790208 * M ** 4;
  }
  if (M > 3.625) {
    return 0.25;
  }

  // Catch All
  return 0.25;
};
export const calculateThrust_ = (MassOut: number, Altitude: any, FuelArea: number, NozzleAltitude: any) => {
  /*
   * This function calculates the thrust force of the rocket by maximizing the efficiency
   * through designing the correct shaped nozzle for the given rocket scenario. For this
   * function is gives the option for stages of the rocket to be introduced. Theoretically
   * this function can have an unlimited amount of stages but for this particular use there
   * will only be 3 stages. The iMathuts for the function are:
   */

  /*
   * MassOut:            Mass leaving the nozzle
   * Altitude:           Rockets current elevation
   * FuelArea:           Burn area in the combustion chamber
   * NozzleAltitude:     Altitude immediately after a rocket stage detaches
   */

  /*
   * The constants for the function were based off of data found for the Trident II Intercontinental
   * ballistic missile. These constants are:
   * k:  Specific heat ratio for the fuel
   * Ru:  Universal gas constant
   * Tc: Chamber temperature
   * Pc: Chamber pressure
   * Mw: Molecular weight of the fuel
   * q:  Mass flow out through the nozzle
   * Pa: Atmospheric pressure used for optimizing nozzle diameters
   * The iteratively calculated variables for this function are:
   * Pe: Current atmospheric pressure
   * Pt: Throat pressure
   * Tt: Throat temperature
   * At: Throat area
   * Nm: Mach number of the exiting gas
   * Ae: Exit area of the nozzle
   * Ve: Velocity of the fuel exiting the nozzle
   * After making all of these calculations the function will return the force generated by the trust
   * of the fuel in units of Newtons. This function will also make sure that the exit nozzle area will
   * not exceed that of the cross sectional area for the inside of rocket casing.
   */

  const k = 1.2; // Heat Ratio
  const Ru = 8314.4621; // Universal Gas Constant (m^3 Pa / K mol)
  const Tc = 3700; // (K)
  const Pc = 25 * 10 ** 6; // Chamber Pressure (Pa)
  const Mw = 22; // Molecular Weight
  const q = MassOut; // Mass Flow Rate (kg/s)
  const Pa = calculatePressure_(NozzleAltitude); // Ambient pressure used to calculate nozzle (Pa)
  const Pe = calculatePressure_(Altitude); // Actual Atmospheric Pressure (Pa)
  const Pt = (Pc * (1 + (k - 1) / 2)) ** (-k / (k - 1)); // Throat Pressure (Pa)
  const Tt = Tc / (1 + (k - 1) / 2); // Throat Temperature (k)
  const At = (q / Pt) * Math.sqrt((Ru * Tt) / (Mw * k)); // Throat Area (m^2)
  const Nm = Math.sqrt((2 / (k - 1)) * (Pc / Pa) ** ((k - 1) / k - 1)); // Mach Number
  let Ae = (At / Nm) * (1 + (((k - 1) / 2) * Nm ** 2) / ((k + 1) / 2)) ** ((k + 1) / (2 * (k - 1))); // Exit Nozzle Area (m^2)

  if (Ae > FuelArea) {
    Ae = FuelArea;
  }
  const VeSub = ((2 * k) / (k - 1)) * ((Ru * Tc) / Mw) * (1 - Pe / Pc) ** ((k - 1) / k);
  const Ve = Math.sqrt(VeSub); // Partical Exit Velocity (m/s)


  return q * Ve + (Pe - Pa) * Ae; // Thrust (N)
};

// prettier-ignore
export const calculateCoordinates_ = (
  CurrentLatitude: number,
  CurrentLongitude: number,
  TargetLatitude: number,
  TargetLongitude: number,
): [number[], number[], number, number, number[], number] => { // NOSONAR
  /*
   * This function calculates the path of the rocket across the earth in terms of coordinates by using
   * great-circle equations. It will also calculate which direction will be the shortest distance to the
   * target and then calculate the distance across the surface of the earth to the target. There is only
   * one constant for this function and that is the radius of the earth. After finding all the variables
   * for the final and initial points it will the calculate the coordinates along the path by first extending
   * the line between the two points until it reaches the equator. To calculate coordinates along the path it
   * needs the angle the line makes at the equator and also at what longitude the line intersects the equator.
   * The iMathuts for this function are:
   * Phi1:    Latitude coordinate of the starting point
   * Lambda1: Longitude coordinate of the starting point
   * Phi2:    Latitude coordinate of the ending point
   * Lambda2: Longitude coordinate of the ending point
   * The variables that are calculated are:
   * Lambda12:     Angle difference between the starting and ending longitude coordinates
   * Alpha1:       Angle from north the initial point will start its travel at
   * Alpha2:       Angle from north the final point will be traveling at
   * DeltaTheta12: Angle between the two initial and final coordinates
   * ArcLength:    Distance along the earth between the two points
   * Alphao:       Angle off of the great circle line and north when extended back to the equator.
   * DeltaSigma01: Angular distance between the point at the equator and the initial point.
   * DeltaSigma02: Angular distance between the point at the equator and the final point
   * Lambda01:     Longitude difference between the initial point and the point at the equator
   * Lambdao:      Longitude at the point where the great circle intersects the equator
   * Sigma:        Arc distance between the first point and any point along the great circle.
   * Phi:          Latitude at the arbitrary point on the great circle
   * Lambda:       Longitude at the arbitrary point on the great circle
   * This function generates 100 points along the great circle and calculates each longitude and latitude
   * and then stores them in lists. Because these list will be used to plot the great circle path the
   * coordinate will be broken up into multiple lists if the path passes over edge of the map. The last thing
   * the function does before returning the outputs is plotting the great circle onto a map of the globe.
   * The outputs are:
   * The list of latitudes
   * The list of longitudes
   * The angle from north to start the great circle
   * The angular distance between the starting and ending point
   */

  const r = EarthRadius; // (m)
  const Phi1 = (CurrentLatitude * Math.PI) / 180; // (Rad)
  const Lambda1 = (CurrentLongitude * Math.PI) / 180; // (Rad)
  const Phi2 = (TargetLatitude * Math.PI) / 180; // (Rad)
  const Lambda2 = (TargetLongitude * Math.PI) / 180; // (Rad)
  let Lambda12;

  if (Lambda2 - Lambda1 >= -180 && Lambda2 - Lambda1 <= 180) {
    Lambda12 = Lambda2 - Lambda1;
  } // (Rad)
  if (Lambda2 - Lambda1 > 180) {
    Lambda12 = Lambda2 - Lambda1 - 2 * Math.PI;
  } // (Rad)
  if (Lambda2 - Lambda1 < -180) {
    Lambda12 = Lambda2 - Lambda1 + 2 * Math.PI;
  } // (Rad)

  const Alpha1 = Math.atan2(Math.sin(Lambda12), Math.cos(Phi1) * Math.tan(Phi2) - Math.sin(Phi1) * Math.cos(Lambda12)); // (Rad)
  const DeltaTheta12 = Math.acos(Math.sin(Phi1) * Math.sin(Phi2) + Math.cos(Phi1) * Math.cos(Phi2) * Math.cos(Lambda12)); // (Rad)
  const ArcLength = DeltaTheta12 * r; // (m)
  const Alphao = Math.asin(Math.sin(Alpha1) * Math.cos(Phi1)); // (Rad)
  const DeltaSigma01 = Math.atan2(Math.tan(Phi1), Math.cos(Alpha1)); // (Rad)
  const DeltaSigma02 = DeltaSigma01 + DeltaTheta12; // (Rad)
  const Lambda01 = Math.atan2(Math.sin(Alphao) * Math.sin(DeltaSigma01), Math.cos(DeltaSigma01)); // (Rad)
  const Lambdao = Lambda1 - Lambda01; // (Rad)
  const EstLatList = [];
  const latList1 = [];
  const latList2 = [];
  const latList3 = [];
  const EstLongList = [];
  const lonList1 = [];
  const lonList2 = [];
  const lonList3 = [];
  const EstDistanceList: number[] = [];
  let GoalDistance;

  for (let i = 0; i <= 2400; i++) {
    const Sigma = DeltaSigma01 + (i * (DeltaSigma02 - DeltaSigma01)) / 2000; // (Rad)
    const Phi = (Math.asin(Math.cos(Alphao) * Math.sin(Sigma)) * 180) / Math.PI; // (Degrees)
    const Lambda = ((Lambdao + Math.atan2(Math.sin(Alphao) * Math.sin(Sigma), Math.cos(Sigma))) * 180) / Math.PI; // (Degrees)

    if (i === 2000) {
      GoalDistance = (Sigma - DeltaSigma01) * r;
    }
    EstDistanceList.push(((Sigma - DeltaSigma01) * r) / 1000);
    if (Lambda >= -180 && Lambda <= 180) {
      lonList1.push(Lambda); // (Degrees)
      latList1.push(Phi); // (Degrees)
    } else if (Lambda < -180) {
      lonList3.push(Lambda + 360); // (Degrees)
      latList3.push(Phi); // (Degrees)
    } else if (Lambda > 180) {
      lonList2.push(Lambda - 360); // (Degrees)
      latList2.push(Phi); // (Degrees)
    } else {
      // Do nothing
    }
  }

  for (const lat of latList1) {
    EstLatList.push(lat);
  }
  for (const lat of latList2) {
    EstLatList.push(lat);
  }
  for (const lat of latList3) {
    EstLatList.push(lat);
  }
  for (const lon of lonList1) {
    EstLongList.push(lon);
  }
  for (const lon of lonList2) {
    EstLongList.push(lon);
  }
  for (const lon of lonList3) {
    EstLongList.push(lon);
  }

  return [EstLatList, EstLongList, (Alpha1 * 180) / Math.PI, ArcLength, EstDistanceList, GoalDistance];
};

// prettier-ignore
export const launchDetailed_ = (
  FuelArea: number,
  FuelMass: number,
  RocketArea: number,
  Altitude: number,
  RocketCasingMass: number,
  NozzleAltitude: number,
  drdt: number,
  dthetadt: number,
  Distance: number,
  ArcDistance: number,
  MassIn: number,
  AngleCoefficient: number,
) => { // NOSONAR
  /*
   * This function is the heart of the program. It calculates the simulated flight
   * of the missile. This is only one step of the flight, to get the whole flight
   * simulated it must be iterated in a loop. The iMathuts for the function are:
   * FuelArea:         Area of the fuel surface being burned
   * FuelMass:         Current mass left in the rocket
   * RocketArea:       Cross sectional area of the missile
   * Altitude:         Current altitude of the missile
   * RocketCasingMass: Mass of the casing for the missile
   * NozzleAltitude:   Altitude when the casing stage detaches
   * drdt:             Current velocity in the vertical direction
   * dthetadt:         Current angular velocity around the earth
   * Distance:         Current distance traveled by the missile
   * ArcDistance:      Current distance traveled along the earths surface
   * MassIn:           Current fuel mass entering the rocket (always 0)
   * AngleCoefficient: The coefficient used to govern the missiles trajectory
   * The outputs for this function are:
   * FuelMass:    Mass left in the missile
   * RocketMass:  Total Mass of the missile
   * Tatm:        Atmospheric temperature
   * Patm:        Atmospheric pressure
   * AirDensity:  Density of the atmosphere
   * c:           Current speed of sound of the atmosphere
   * M:           Missiles mach number
   * cD:          Missiles drag Coefficient
   * Thrust:      Thrust produced by the missile
   * DragForce:   Drag force acting upon the missile
   * WeightForce: Gravitational attraction exerted by the earth
   * dr2dt:       Acceleration in the vertical direction
   * drdt:        New velocity in the vertical direction
   * Altitude:    New altitude of the missile
   * Distance:    New distance traveled by the missile
   * ArcVelocity: Velocity of the missile across the surface of the earth
   * ArcDistance: New distance traveled along the earths surface
   * dtheta2dt:   Angular acceleration around the earth
   * dthetadt:    New angular velocity around the earth
   * Some of these values do not need to be returned for calculations in later
   * iterations but are returned anyways to present the data later on in plots
   * in order to understand the flight of the missile and its governing principles
   */

  // This governs the thrust angle as a function of altitude
  let ThrustAngle;

  if (Altitude < 1200000) {
    ThrustAngle =
      (90 -
        AngleCoefficient *
        (1.5336118956 +
          0.00443173537387 * Altitude -
          9.30373890848 * 10 ** -8 * Altitude ** 2 +
          8.37838197732 * 10 ** -13 * Altitude ** 3 -
          2.71228576626 * 10 ** -18 * Altitude ** 4)) *
      0.0174533;
    // (Degrees)
  } else {
    ThrustAngle = 30;
  }

  // This calculates the angle the drag force acts upon the missile
  const Radius = EarthRadius + Altitude; // (m)
  const DragAngle = Math.atan2(drdt, dthetadt); // (Degrees)

  let MassOut = 0; // (kg)

  // This calculates fuel mass vs time
  if (FuelMass > 0) {
    MassOut = FuelDensity * FuelArea * BurnRate; // (kg)
    const dmdt = MassIn - MassOut; // (kg/s)

    FuelMass += dmdt * h; // (kg)
  } else {
    FuelMass = 0;
  }

  const RocketMass = FuelMass + RocketCasingMass + WarheadMass; // (Kg)
  const Tatm = calculateTemperature_(Altitude); // (K)
  const Patm = calculatePressure_(Altitude); // (pa)
  const AirDensity = Patm / (R * Tatm); // (kg/m^3)

  // This calculates the drag coeficiant
  const c = (1.4 * R * Tatm) ** (1 / 2); // (m/s)
  const M = Math.sqrt(drdt ** 2 + dthetadt ** 2) / c; // (Unitless)
  const cD = calculateDrag_(Math.abs(M)); // (Unitless)

  // This calculates all the forces acting upon the missile
  let Thrust = 0;

  if (FuelMass > 0) {
    Thrust = calculateThrust_(MassOut, Altitude, FuelArea, NozzleAltitude);
  } // (N)

  const DragForce = (1 / 2) * AirDensity * (drdt ** 2 + dthetadt ** 2) * RocketArea * cD; // (N)
  const WeightForce = (G * EarthMass * RocketMass) / Radius ** 2; // (N)

  // Vertical Acceleration and velocity
  const dr2dt = (Thrust * Math.sin(ThrustAngle) - DragForce * Math.sin(DragAngle) - WeightForce) / RocketMass + Radius * (dthetadt / Radius) ** 2; // (m/s^2)

  drdt += dr2dt * h; // (m/s)

  Altitude += drdt * h; // (m)

  Distance += dthetadt * h; // (m)

  // Angular distance the missile traveled vs time
  const ArcVelocity = (dthetadt * EarthRadius) / Radius; // (m/s)

  ArcDistance += ArcVelocity * h; // (m)

  // Angular acceleration and velocity
  const dtheta2dt = (Thrust * Math.cos(ThrustAngle) - DragForce * Math.cos(DragAngle)) / RocketMass - 2 * drdt * (dthetadt / Radius); // (m/s^2)

  dthetadt += dtheta2dt * h; // (m/s)

  return [FuelMass, RocketMass, Tatm, Patm, AirDensity, c, M, cD, Thrust, DragForce, WeightForce, dr2dt, drdt, Altitude, Distance, ArcVelocity, ArcDistance, dtheta2dt, dthetadt];
};

// prettier-ignore
export const calculateAngle_ = (
  FuelArea1: number,
  FuelArea2: number,
  FuelMass: number,
  FuelVolume: number,
  RocketArea: number,
  Altitude: number,
  RocketCasingMass1: number,
  RocketCasingMass2: number,
  RocketCasingMass3: number,
  NozzleAltitude1: number,
  drdt: number,
  dthetadt: number,
  Distance: number,
  ArcDistance: number,
  MassIn: number,
  _ArcLength: number,
  GoalDistance: number,
) => { // NOSONAR
  /*
   * This function is designed to calculate the needed angle coefficient to for the trust
   * to govern the missiles path into its designated target. Because this missile has the
   * capability of entering into orbit, more complicated calculations needed to be used to
   * ensure that the program would be successful in finding the correct drag coefficient
   * in all instances. How the function works is by running the missile simulation multiple
   * times with different angle coefficients to find with one lands the missile closest to
   * its target. Once it has a ball park region for the angle coefficient it runs a modified
   * bisection method to further bring the angle coefficient closer to the needed value to
   * land the missile on the target. The inputs for the program are:
   * FuelArea1:         Area of the fuel surface being burned for the first and second stages of the missile
   * FuelArea2:         Area of the fuel surface being burned for the third stage of the missile
   * FuelMass:          Mass left in the missile
   * FuelVolume:        Initial value of the total volume of fuel stored in the missile
   * RocketArea:        Cross sectional area of the missile
   * Altitude:          Initial condition for the altitude (0 meters)
   * RocketCasingMass1: Mass of the casing for the missiles during the first stage
   * RocketCasingMass2: Mass of the casing for the missiles during the second stage
   * RocketCasingMass3: Mass of the casing for the missiles during the third stage
   * NozzleAltitude1:   The altitude used to calculate the nozzle for the first stage (0 meters)
   * drdt:              Initial condition for the velocity in the vertical direction (0 m/s)
   * dthetadt:          Initial condition for the angular velocity around the earth (0 m/s)
   * Distance:          Initial condition for the distance traveled by the missile (0 meters)
   * ArcDistance:       Initial condition for the distance traveled along the earths surface (0 meters)
   * MassIn:            Initial condition for the mass entering the missile (always 0)
   * ArcLength:         Distance from the starting point to the target along the surface of the earth
   * The functions output it:
   * AngleCoefficient:  The angle coefficient which directs the missile directly to it's target
   */

  const DistanceSteps = [];
  let AngleCoefficient = 0;
  let DistanceClosePossition = 0;
  let AC1 = 0;
  let AC2 = 0;
  const Steps = 500;

  for (let i = 0; i < Steps; i++) {
    AngleCoefficient = (i * 1) / Steps / 2 + 0.5;
    DistanceSteps.push(
      launchSimple_(
        FuelArea1,
        FuelArea2,
        FuelMass,
        FuelVolume,
        RocketArea,
        Altitude,
        RocketCasingMass1,
        RocketCasingMass2,
        RocketCasingMass3,
        NozzleAltitude1,
        drdt,
        dthetadt,
        Distance,
        ArcDistance,
        MassIn,
        AngleCoefficient,
      ),
    );
  }
  let DistanceClosest = DistanceSteps[0];
  let oldDistanceClosest = Math.abs(DistanceSteps[0] - GoalDistance);

  for (const distance_ of DistanceSteps) {
    const newDistanceClosest = Math.abs(distance_ - GoalDistance);

    if (newDistanceClosest < oldDistanceClosest) {
      oldDistanceClosest = newDistanceClosest;
      DistanceClosest = distance_;
    }
  }
  for (let i = 0; i < Steps; i++) {
    if (DistanceSteps[i] === DistanceClosest) {
      DistanceClosePossition = i;
      break;
    }
  }
  AngleCoefficient = (DistanceClosePossition * 1) / Steps / 2 + 0.5;

  // bisection method
  AC1 = (DistanceClosePossition - 2) / Steps / 2 + 0.5;
  AC2 = (DistanceClosePossition + 2) / Steps / 2 + 0.5;
  let ACNew: number = (AC1 + AC2) / 2;
  const qRunACNew = launchSimple_(
    FuelArea1,
    FuelArea2,
    FuelMass,
    FuelVolume,
    RocketArea,
    Altitude,
    RocketCasingMass1,
    RocketCasingMass2,
    RocketCasingMass3,
    NozzleAltitude1,
    drdt,
    dthetadt,
    Distance,
    ArcDistance,
    MassIn,
    ACNew,
  );
  let error = Math.abs((GoalDistance - qRunACNew) / GoalDistance) * 100;

  while (error > 0.01 && Math.abs(AC2 - AC1) >= 0.0001) {
    ACNew = (AC1 + AC2) / 2;
    error =
      Math.abs(
        (GoalDistance -
          launchSimple_(
            FuelArea1,
            FuelArea2,
            FuelMass,
            FuelVolume,
            RocketArea,
            Altitude,
            RocketCasingMass1,
            RocketCasingMass2,
            RocketCasingMass3,
            NozzleAltitude1,
            drdt,
            dthetadt,
            Distance,
            ArcDistance,
            MassIn,
            ACNew,
          )) /
        GoalDistance,
      ) * 100;
    if (
      launchSimple_(
        FuelArea1,
        FuelArea2,
        FuelMass,
        FuelVolume,
        RocketArea,
        Altitude,
        RocketCasingMass1,
        RocketCasingMass2,
        RocketCasingMass3,
        NozzleAltitude1,
        drdt,
        dthetadt,
        Distance,
        ArcDistance,
        MassIn,
        ACNew,
      ) > GoalDistance
    ) {
      AC2 = ACNew;
    } else {
      AC1 = ACNew;
    }
  }
  AngleCoefficient = ACNew;

  return AngleCoefficient;
};

// prettier-ignore
export const launchSimple_ = (
  FuelArea1: any,
  FuelArea2: any,
  FuelMass: number,
  FuelVolume: number,
  RocketArea: any,
  Altitude: number,
  RocketCasingMass1: any,
  RocketCasingMass2: any,
  RocketCasingMass3: any,
  NozzleAltitude1: any,
  drdt: any,
  dthetadt: any,
  Distance: any,
  ArcDistance: any,
  MassIn: any,
  AngleCoefficient: number,
) => { // NOSONAR
  /*
   * This function calculates the entire simulation of the missiles tragectory without
   * collecting any information along the way. It's purpose is for the angle cooefficeint
   * optimizer to have a quick way to run the simulation and retreive the final distance
   * the missile traveled along the surface of the earth. The functions inputs are:
   * FuelArea1:         Area of the fuel surface being burned for the first and second stages of the missile
   * FuelArea2:         Area of the fuel surface being burned for the third stage of the missile
   * FuelMass:          Mass left in the missile
   * FuelVolume:        Initial value of the total volume of fuel stored in the missile
   * RocketArea:        Cross sectional area of the missile
   * Altitude:          Initial condition for the altitude (0 meters)
   * RocketCasingMass1: Mass of the casing for the missiles during the first stage
   * RocketCasingMass2: Mass of the casing for the missiles during the second stage
   * RocketCasingMass3: Mass of the casing for the missiles during the third stage
   * NozzleAltitude1:   The altitude used to calculate the nozzle for the first stage (0 meters)
   * drdt:              Initial condition for the velocity in the vertical direction (0 m/s)
   * dthetadt:          Initial condition for the angular velocity around the earth (0 m/s)
   * Distance:          Initial condition for the distance traveled by the missile (0 meters)
   * ArcDistance:       Initial condition for the distance traveled along the earths surface (0 meters)
   * MassIn:            Initial condition for the mass entering the missile (always 0)
   * AngleCoefficient:  Coefficient used to govern the angle of the thrust to dirrect the missile towards its target
   * The output for this function is:
   * ArcDistance:       The total distance traveled by the missile along the surface of the earth
   * var RocketMass, Tatm, Patm, AirDensity, c, M, cD, Thrust, DragForce, WeightForce, dr2dt, ArcVelocity, theta2dt;
   */
  let NozzleAltitude2, NozzleAltitude3;
  let iterationFunOutput = [];
  const MaxAltitude = [];

  while (FuelMass / FuelDensity / FuelVolume > 0.4 && Altitude >= 0) {
    iterationFunOutput = launchDetailed_(
      FuelArea1,
      FuelMass,
      RocketArea,
      Altitude,
      RocketCasingMass1,
      NozzleAltitude1,
      drdt,
      dthetadt,
      Distance,
      ArcDistance,
      MassIn,
      AngleCoefficient,
    );
    FuelMass = iterationFunOutput[0];
    drdt = iterationFunOutput[12];
    Altitude = iterationFunOutput[13];
    MaxAltitude.push(Altitude);
    Distance = iterationFunOutput[14];
    ArcDistance = iterationFunOutput[16];
    dthetadt = iterationFunOutput[18];
    NozzleAltitude2 = Altitude;
  }
  while (FuelMass / FuelDensity / FuelVolume > 0.19 && Altitude >= 0) {
    iterationFunOutput = launchDetailed_(
      FuelArea1,
      FuelMass,
      RocketArea,
      Altitude,
      RocketCasingMass2,
      NozzleAltitude2,
      drdt,
      dthetadt,
      Distance,
      ArcDistance,
      MassIn,
      AngleCoefficient,
    );
    FuelMass = iterationFunOutput[0];
    drdt = iterationFunOutput[12];
    Altitude = iterationFunOutput[13];
    MaxAltitude.push(Altitude);
    Distance = iterationFunOutput[14];
    ArcDistance = iterationFunOutput[16];
    dthetadt = iterationFunOutput[18];
    NozzleAltitude3 = Altitude;
  }
  while (FuelMass / FuelDensity / FuelVolume > 0 && Altitude >= 0) {
    iterationFunOutput = launchDetailed_(
      FuelArea2,
      FuelMass,
      RocketArea,
      Altitude,
      RocketCasingMass3,
      NozzleAltitude3,
      drdt,
      dthetadt,
      Distance,
      ArcDistance,
      MassIn,
      AngleCoefficient,
    );
    FuelMass = iterationFunOutput[0];
    drdt = iterationFunOutput[12];
    Altitude = iterationFunOutput[13];
    MaxAltitude.push(Altitude);
    Distance = iterationFunOutput[14];
    ArcDistance = iterationFunOutput[16];
    dthetadt = iterationFunOutput[18];
  }
  while (Altitude > 0) {
    FuelMass = 0;
    iterationFunOutput = launchDetailed_(
      FuelArea2,
      FuelMass,
      RocketArea,
      Altitude,
      RocketCasingMass3,
      NozzleAltitude3,
      drdt,
      dthetadt,
      Distance,
      ArcDistance,
      MassIn,
      AngleCoefficient,
    );
    FuelMass = iterationFunOutput[0];
    drdt = iterationFunOutput[12];
    Altitude = iterationFunOutput[13];
    MaxAltitude.push(Altitude);
    Distance = iterationFunOutput[14];
    ArcDistance = iterationFunOutput[16];
    dthetadt = iterationFunOutput[18];
  }

  let MaxAltitudeMax = 0;

  for (const alt_ of MaxAltitude) {
    if (alt_ > MaxAltitudeMax) {
      MaxAltitudeMax = alt_;
    }
  }

  return Distance;
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

