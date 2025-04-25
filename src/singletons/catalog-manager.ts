/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * catalogManagerInstance.ts is the primary interface between sat-cruncher and the main application.
 * It manages all interaction with the satellite catalogue.
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference https://keeptrack.space/license/thingsinspace.txt
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

import { KeepTrackApiEvents, MissileParams } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { BaseObject, Degrees, DetailedSatellite, EciVec3, KilometersPerSecond, Radians, SatelliteRecord, Sgp4, SpaceObjectType, Star, Tle, TleLine1, TleLine2 } from 'ootk';
import { controlSites } from '../catalogs/control-sites';
import { launchSites } from '../catalogs/launch-sites';
import { sensors } from '../catalogs/sensors';
import { stars } from '../catalogs/stars';
import { GetSatType, SatCruncherMessageData } from '../interfaces';
import { isThisNode } from '../static/isThisNode';
import { SatMath } from '../static/sat-math';
import { SplashScreen } from '../static/splash-screen';
import { StringExtractor } from '../static/string-extractor';
import { UrlManager } from '../static/url-manager';
import { MissileObject } from './catalog-manager/MissileObject';
import { SatLinkManager } from './catalog-manager/satLinkManager';
import { errorManagerInstance } from './errorManager';

declare module '@app/interfaces' {
  interface SatCruncherMessageData {
    extraData?: string;
    extraUpdate?: boolean;
    /**
     * Object id that is now being skipped by the cruncher
     * due to a bad TLE. VIMPEL don't have satids so we use the
     * object id instead.
     */
    badObjectId?: number;
    // JSON string
    satId?: number;
    sensorMarkerArray?: number[];
  }
  interface UserSettings {
    installDirectory: string;
  }
}

export interface DensityBin {
  minAltitude: number;
  maxAltitude: number;
  count: number;
  density: number; // spatial density (objects per km³)
}

export class CatalogManager {
  private static readonly TEMPLATE_INTLDES = '58001A';
  private static readonly TEMPLATE_TLE1_BEGINNING = '1 ';
  private static readonly TEMPLATE_TLE1_ENDING = 'U 58002B   17115.48668720 +.00000144 +00000-0 +16234-3 0  9994';
  private static readonly TEMPLATE_TLE2_BEGINNING = '2 ';
  private static readonly TEMPLATE_TLE2_ENDING = ' 034.2502 167.2636 0042608 222.6554 121.5501 14.84703551080477';
  static readonly ANALYST_START_ID = 90000;

  analSatSet = <DetailedSatellite[]>[];
  cosparIndex: { [key: string]: number } = {};
  fieldOfViewSet = [] as {
    static: boolean;
    marker: boolean;
    id: number;
  }[];
  hoveringSat = -1;
  isLaunchSiteManagerLoaded = false;
  isSensorManagerLoaded = false;
  isStarManagerLoaded = false;
  launchSites: {
    [key: string]: {
      name: string;
      lat: Degrees;
      lon: Degrees;
    };
  } = {};

  missileSats: number = 0;
  missileSet = [] as MissileObject[];
  numSatellites: number = 0;
  numObjects: number = 0;
  orbitDensity: DensityBin[] = [];
  orbitDensityMax = 0;
  orbitalPlaneDensity: number[][] = [];
  orbitalPlaneDensityMax = 0;
  orbitalSats: number;
  satCruncher: Worker;
  objectCache: BaseObject[];
  satExtraData;
  satLinkManager: SatLinkManager;
  sccIndex: { [key: string]: number } = {};
  sensorMarkerArray: number[] = [];
  starIndex1 = 0;
  starIndex2 = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  staticSet = [] as any[];
  updateCruncherBuffers = (mData: SatCruncherMessageData): void => {
    keepTrackApi.getDotsManager().updateCruncherBuffers(mData);

    if (typeof mData?.sensorMarkerArray !== 'undefined' && mData?.sensorMarkerArray?.length !== 0) {
      this.sensorMarkerArray = mData.sensorMarkerArray;
    }

    const highestMarkerNumber = this.sensorMarkerArray?.[this.sensorMarkerArray?.length - 1] || 0;

    settingsManager.dotsOnScreen = Math.max(this.numObjects - settingsManager.maxFieldOfViewMarkers, highestMarkerNumber);
  };

  /**
   * Calculates the Satellite Record (satrec) for a given satellite object.
   * If a cached satrec exists, it returns it. Otherwise, it performs and stores
   * satellite initialization calculations using the Sgp4.createSatrec method.
   * The calculated satrec is then cached for later use.
   *
   * @param {SatObject} sat - The satellite object for which to calculate the satrec.
   * @returns {SatelliteRecord} The calculated or cached Satellite Record.
   */
  calcSatrec(sat: DetailedSatellite): SatelliteRecord {
    // If cached satrec exists, return it
    if (sat.satrec) {
      return sat.satrec;
    }

    // Perform and store sat init calcs
    const satrec = Sgp4.createSatrec(sat.tle1, sat.tle2);

    // Cache the satrec for later use.
    if (this.objectCache[sat.id]?.isSatellite()) {
      (this.objectCache[sat.id] as DetailedSatellite).satrec = satrec;
    } else {
      errorManagerInstance.warn('calcSatrec: satId not found in satData');
    }

    return satrec;
  }

  /**
   * Converts an array of satellite numbers to an array of corresponding IDs.
   *
   * @param {number[]} satnumArray - An array of satellite numbers.
   * @returns {number[]} - An array of IDs corresponding to the satellite numbers.
   * If a satellite number does not have a corresponding ID, it is not included in the returned array.
   */
  satnums2ids(satnumArray: number[]): number[] {
    return satnumArray.map((satnum) => this.sccNum2Id(satnum.toString().padStart(5, '0'), false) ?? null).filter((id) => id !== null);
  }

  /**
   * Converts an international designation to its corresponding ID.
   * @param intlDes The international designation to convert.
   * @returns The corresponding ID if found, otherwise null.
   */
  intlDes2id(intlDes: string): number | null {
    return typeof this.cosparIndex[`${intlDes}`] !== 'undefined' ? this.cosparIndex[`${intlDes}`] : null;
  }

  /**
   * This method is used to get the ID from the object number.
   *
   * @param {number} a5Num - The NORAD satellite catalog number.
   * @param {boolean} isExtensiveSearch - A flag to determine if an extensive search should be performed. Default is true.
   *
   * @returns {number | null} - Returns the ID if found, otherwise returns null.
   *
   * The method first checks if the object number exists in the `sccIndex`. If it does, it returns the corresponding ID.
   * If the object number does not exist in the `sccIndex` and `isExtensiveSearch` is true, it performs an extensive search in the `satData`.
   * If the object number is found in the `satData`, it returns the index as the ID. If not found, it returns null.
   */
  sccNum2Id(a5Num: string | number, isExtensiveSearch = true): number | null {
    // For backwards compatibility, this method accepts a number or string as the a5Num parameter.
    if (typeof a5Num === 'number') {
      a5Num = a5Num.toString().padStart(5, '0');
    }

    const satBySccIndex = this.sccIndex[`${a5Num}`];

    if (typeof satBySccIndex !== 'undefined') {
      return this.sccIndex[`${a5Num}`];
    } else if (isExtensiveSearch) {
      for (let i = 0; i < this.objectCache.length; i++) {
        const obj = this.objectCache[i];

        if (obj?.isSatellite() && (obj as DetailedSatellite)?.sccNum === a5Num.toString()) {
          return i;
        }
      }
    }

    return null;
  }

  /**
   * Retrieves a satellite object based on its object number.
   *
   * @param sccNum - The object number of the satellite.
   * @returns The satellite object if found, null otherwise.
   */
  sccNum2Sat(sccNum: number): DetailedSatellite | null {
    const sat = this.getObject(this.sccNum2Id(sccNum.toString().padStart(5, '0')));

    if (!sat?.isSatellite()) {
      errorManagerInstance.debug(`Object ${sccNum} is not a satellite!`);

      return null;
    }

    return sat as DetailedSatellite;
  }

  /**
   * @deprecated - Stars are not currently working
   *
   * Converts a star name to its corresponding ID within a given range.
   * @param starName - The name of the star.
   * @param starIndex1 - The starting index of the range.
   * @param starIndex2 - The ending index of the range.
   * @returns The ID of the star if found within the range, otherwise null.
   */
  starName2Id(starName: string, starIndex1: number, starIndex2: number): number | null {
    const i = this.objectCache.slice(starIndex1, starIndex2).findIndex((object) => object?.type === SpaceObjectType.STAR && object?.name === starName);


    return i === -1 ? null : i + starIndex1;
  }

  /**
   * Retrieves a satellite object from the catalog.
   *
   * Optional GetSatType parameter can be used speed up the function by retrieving only the required data.
   *
   */
  getObject(i: number | null | undefined, type: GetSatType = GetSatType.DEFAULT): BaseObject | null {
    if (i === null || typeof i === 'undefined' || (i ?? -1) <= -1) {
      // errorManagerInstance.debug('getSat: i is null'); - This happens a lot but is useful for debugging

      return null;
    }

    if (i === -1 || !this.objectCache?.[i]) {
      if (!isThisNode() && i >= 0 && !this.objectCache[i]) {
        errorManagerInstance.debug(`Satellite ${i} not found`);
      }

      return null;
    }

    if (type === GetSatType.EXTRA_ONLY) {
      return this.objectCache[i];
    }

    if (type === GetSatType.POSITION_ONLY) {
      this.objectCache[i].position = keepTrackApi.getDotsManager().getCurrentPosition(i);

      return this.objectCache[i];
    }

    if (type !== GetSatType.SKIP_POS_VEL) {
      keepTrackApi.getDotsManager().updatePosVel(this.objectCache[i], i);
    }

    return this.objectCache[i];
  }

  getSat(satId: number, type: GetSatType = GetSatType.DEFAULT): DetailedSatellite | null {
    const sat = this.getObject(satId, type);

    if (!sat?.isSatellite()) {
      return null;
    }

    return sat as DetailedSatellite;
  }

  getSats(): DetailedSatellite[] {
    // sats are the first numSats objects in the objectCache
    return this.objectCache.slice(0, this.numSatellites).filter((sat) => sat.isSatellite()) as DetailedSatellite[];
  }

  getMissile(missileId: number): MissileObject | null {
    const missile = this.getObject(missileId);

    if (!missile?.isMissile()) {
      return null;
    }

    return missile as MissileObject;
  }

  getSensorFromSensorName(sensorName: string): number {
    return this.objectCache.findIndex((object: BaseObject) => object.isSensor() && object.name === sensorName);
  }

  id2satnum(satIdArray: number[]) {
    return satIdArray.map((id) => ((<DetailedSatellite>this.getObject(id))?.sccNum || -1).toString()).filter((satnum) => satnum !== '-1');
  }

  init(satCruncherOveride?: Worker): void {
    try {
      SplashScreen.loadStr(SplashScreen.msg.elsets);
      // See if we are running jest right now for testing
      if (isThisNode()) {
        if (satCruncherOveride) {
          this.satCruncher = satCruncherOveride;
        } else {
          try {
            const url = 'http://localhost:8080/js/positionCruncher.js';

            this.satCruncher = new Worker(url);
          } catch (error) {
            this.satCruncher = {} as Worker;
            errorManagerInstance.debug(error);
          }
        }
      } else {
        if (typeof Worker === 'undefined') {
          throw new Error('Your browser does not support web workers.');
        }
        /* istanbul ignore next */
        try {
          this.satCruncher = new Worker('./js/positionCruncher.js');
        } catch (error) {
          // If you are trying to run this off the desktop you might have forgotten --allow-file-access-from-files
          if (window.location.href.startsWith('file://')) {
            throw new Error(
              'Critical Error: You need to allow access to files from your computer! Ensure "--allow-file-access-from-files" is added to your chrome shortcut and that no other' +
              'copies of chrome are running when you start it.',
            );
          } else {
            throw new Error(error);
          }
        }
      }

      this.satCruncher.onmessage = this.satCruncherOnMessage.bind(this);
    } catch (error) {
      throw new Error(error);
    }
  }

  getActiveSats(): DetailedSatellite[] {
    return this.objectCache.filter((obj) => obj.isSatellite() && obj.active) as DetailedSatellite[];
  }

  initObjects() {
    // Create a buffer of missile objects
    for (let i = 0; i < settingsManager.maxMissiles; i++) {
      this.missileSet.push(
        new MissileObject({
          active: false,
          type: SpaceObjectType.BALLISTIC_MISSILE,
          name: `Missile ${i}`,
          latList: [],
          lonList: [],
          altList: [],
          timeList: [],
        } as unknown as MissileParams),
      );
    }

    // Create a buffer of analyst satellite objects
    for (let i = 0; i < settingsManager.maxAnalystSats; i++) {
      const sccNum = Tle.convert6DigitToA5((CatalogManager.ANALYST_START_ID + i).toString());

      this.analSatSet.push(
        new DetailedSatellite({
          active: false,
          name: `Analyst Sat ${i}`,
          country: 'ANALSAT',
          launchVehicle: 'Analyst Satellite',
          launchSite: 'ANALSAT',
          sccNum,
          tle1: `${CatalogManager.TEMPLATE_TLE1_BEGINNING}${sccNum}${CatalogManager.TEMPLATE_TLE1_ENDING}` as TleLine1,
          tle2: `${CatalogManager.TEMPLATE_TLE2_BEGINNING}${sccNum}${CatalogManager.TEMPLATE_TLE2_ENDING}` as TleLine2,
          intlDes: CatalogManager.TEMPLATE_INTLDES,
          type: SpaceObjectType.PAYLOAD,
          id: i,
        }),
      );
    }

    // Create Stars
    if (!settingsManager.lowPerf && !settingsManager.isDisableStars) {
      stars.forEach((star) => {
        this.staticSet.push({
          name: star.name,
          isStatic: () => true,
          type: SpaceObjectType.STAR,
          dec: star.dec as Radians,
          ra: star.ra as Radians,
          vmag: star.vmag,
        } as Star);
      });
      this.isStarManagerLoaded = true;
    } else {
      this.isStarManagerLoaded = false;
    }

    // Create Sensors
    if (!settingsManager.isDisableSensors) {
      let i = 0;

      for (const sensor in sensors) {
        if (Object.prototype.hasOwnProperty.call(sensors, sensor)) {
          sensors[sensor].sensorId = i;
          this.staticSet.push(sensors[sensor]);
          i++;
        }
      }
    }

    // Create Launch Sites
    if (!settingsManager.isDisableLaunchSites) {
      for (const launchSiteName in launchSites) {
        if (!Object.prototype.hasOwnProperty.call(launchSites, launchSiteName)) {
          continue;
        }
        const launchSite = launchSites[launchSiteName];

        this.staticSet.push({
          isStatic: () => true,
          type: SpaceObjectType.LAUNCH_FACILITY,
          name: launchSite.name,
          lat: launchSite.lat,
          lon: launchSite.lon,
          // alt: launchSite.alt,
        });
      }
      this.launchSites = launchSites;
      this.isLaunchSiteManagerLoaded = true;
    } else {
      this.isLaunchSiteManagerLoaded = false;
    }

    // Try Loading the Control Site Module
    if (!settingsManager.isDisableControlSites) {
      controlSites
        // Remove any control sites that are closed
        .filter((controlSite) => controlSite.TStop === '')
        // Until all the control sites enums are implemented ignore the odd ones
        .filter((controlSite) => controlSite.type < SpaceObjectType.MAX_SPACE_OBJECT_TYPE)
        .filter(StringExtractor.controlSiteTypeFilter)
        // Add the static properties to the control site objects
        .map((controlSite) => ({ ...{ static: true }, ...controlSite }))
        // Add the control site objects to the static set
        .forEach((controlSite) => {
          this.staticSet.push(controlSite);
        });
    }

    if (typeof settingsManager.maxFieldOfViewMarkers !== 'undefined') {
      for (let i = 0; i < settingsManager.maxFieldOfViewMarkers; i++) {
        const fieldOfViewMarker = {
          static: true,
          marker: true,
          id: i,
        };

        this.fieldOfViewSet.push(fieldOfViewMarker);
      }
    } else {
      errorManagerInstance.debug('settingsManager.maxFieldOfViewMarkers missing or broken!');
    }

    // Initialize the satLinkMananger and then attach it to the object manager
    try {
      const satLinkManager = new SatLinkManager();

      satLinkManager.init(controlSites);
      this.satLinkManager = satLinkManager;
    } catch (e) {
      errorManagerInstance.debug('satLinkManager Failed to Initialize!');
    }
  }

  addAnalystSat(tle1: string, tle2: string, id: number, sccNum?: string): DetailedSatellite | null {
    if (tle1.length !== 69) {
      throw new Error(`Invalid TLE1: length is not 69 - ${tle1}`);
    }
    if (tle2.length !== 69) {
      throw new Error(`Invalid TLE1: length is not 69 - ${tle2}`);
    }

    let satrec: SatelliteRecord;

    try {
      satrec = Sgp4.createSatrec(tle1, tle2);
    } catch (e) {
      errorManagerInstance.error(e, 'catalog-manager.ts', 'Error creating satellite record!');

      return null;
    }

    if (SatMath.altitudeCheck(satrec, keepTrackApi.getTimeManager().simulationTimeObj) > 1) {
      this.objectCache[id] = new DetailedSatellite({
        active: true,
        name: `Analyst Sat ${id}`,
        country: 'ANALSAT',
        launchVehicle: 'Analyst Satellite',
        launchSite: 'ANALSAT',
        sccNum: sccNum ?? tle1.substring(2, 7).trim().padStart(5, '0'),
        tle1: tle1 as TleLine1,
        tle2: tle2 as TleLine2,
        intlDes: tle1.substring(9, 17),
        type: SpaceObjectType.PAYLOAD,
        id,
      });

      const m = {
        typ: CruncerMessageTypes.SAT_EDIT,
        id,
        active: true,
        tle1,
        tle2,
      };

      this.satCruncher.postMessage(m);
      keepTrackApi.getOrbitManager().changeOrbitBufferData(id, tle1, tle2);
      const sat = this.objectCache[id] as DetailedSatellite;

      if (!sat.isSatellite()) {
        throw new Error(`Object ${id} is not a satellite!`);
      }

      return sat;
    }
    errorManagerInstance.debug(tle1);
    errorManagerInstance.debug(tle2);
    errorManagerInstance.warn('New Analyst Satellite is Invalid!');


    return null;
  }

  satCruncherOnMessage({ data: mData }: { data: SatCruncherMessageData }) {
    if (!mData) {
      return;
    }

    if (mData.badObjectId) {
      if (mData.badObjectId >= 0) {
        // Mark the satellite as inactive
        const id = mData.badObjectId;

        if (id !== null) {
          const sat = this.objectCache[id] as DetailedSatellite;

          sat.active = false;
          /*
           * (<any>window).decayedSats = (<any>window).decayedSats || [];
           * (<any>window).decayedSats.push(this.satData[id].sccNum);
           */
          errorManagerInstance.debug(`Object ${mData.badObjectId} is inactive due to bad TLE\nSatellite ${sat.sccNum}\n${sat.tle1}\n${sat.tle2}`);
        }
      } else {
        /*
         * console.debug(`Bad sat number: ${mData.badObjectId}`);
         * How are we getting a negative number? There is a bug somewhere...
         */
      }
    }

    if (mData?.extraUpdate) {
      return;
    }

    this.updateCruncherBuffers(mData);

    // Run any callbacks for a normal position cruncher message
    keepTrackApi.runEvent(KeepTrackApiEvents.onCruncherMessage);

    // Only do this once after satData, positionData, and velocityData are all received/processed from the cruncher
    if (!settingsManager.cruncherReady && this.objectCache && keepTrackApi.getDotsManager().positionData && keepTrackApi.getDotsManager().velocityData) {
      this.onCruncherReady_();
    }
  }

  private onCruncherReady_() {
    SplashScreen.hideSplashScreen();

    const stars = this.objectCache.filter((sat) => sat?.type === SpaceObjectType.STAR);

    if (stars.length > 0) {
      stars.sort((a, b) => a.id - b.id);
      // this is the smallest id
      keepTrackApi.getDotsManager().starIndex1 = stars[0].id;
      // this is the largest id
      keepTrackApi.getDotsManager().starIndex2 = stars[stars.length - 1].id;
      keepTrackApi.getDotsManager().updateSizeBuffer();
    }

    UrlManager.parseGetVariables();

    this.buildOrbitDensityMatrix_();

    // Run any functions registered with the API
    keepTrackApi.runEvent(KeepTrackApiEvents.onCruncherReady);

    settingsManager.cruncherReady = true;
  }

  private buildOrbitDensityMatrix_() {
    const activeSats = this.getSats().filter((sat) => sat.active);

    this.orbitDensity = this.calculateOrbitalDensity_(activeSats, 25);
    this.buildOrbitPlaneDensityMatrix_(activeSats);
  }

  private calculateEffectiveAltitude_(satellite: DetailedSatellite): number {
    // Using the mean altitude approach
    return (satellite.apogee + satellite.perigee) / 2;
  }

  private buildOrbitPlaneDensityMatrix_(satellites: DetailedSatellite[]) {
    // Build the orbit density matrix
    for (let i = 0; i < 180; i += 2) {
      this.orbitalPlaneDensity[i] = [];
      for (let a = 75; a < 40000; a += 25) {
        this.orbitalPlaneDensity[i][a] = 0;
      }
    }

    for (let i = 0; i < satellites.length; i++) {
      // Static objects lack these values and including them increase the JS heap a lot
      if (!satellites[i].active) {
        continue;
      }
      const sat = satellites[i] as DetailedSatellite;

      if (satellites[i].active) {
        const inc = Math.floor(sat.inclination / 2) * 2;
        const alt = Math.floor(this.calculateEffectiveAltitude_(sat) / 25) * 25;

        this.orbitalPlaneDensity[inc][alt] += 1;
      }

      satellites[i].velocity = { x: 0, y: 0, z: 0 } as EciVec3<KilometersPerSecond>;
    }

    this.orbitalPlaneDensityMax = 0;
    for (let i = 0; i < 180; i += 2) {
      for (let alt = 75; alt < 40000; alt += 25) {
        if (this.orbitalPlaneDensity[i][alt] > this.orbitalPlaneDensityMax) {
          this.orbitalPlaneDensityMax = this.orbitalPlaneDensity[i][alt];
        }
      }
    }
  }

  private calculateOrbitalDensity_(satellites: DetailedSatellite[], binSize: number = 25): DensityBin[] {
    const altitudes = satellites.map((satellite) => (
      {
        id: satellite.id,
        sccNum: satellite.sccNum,
        altitude: this.calculateEffectiveAltitude_(satellite),
      }
    ));

    // Sort satellites by altitude
    const sortedSatellites = [...altitudes].sort((a, b) => a.altitude - b.altitude);

    /*
     * Find min and max altitudes
     */
    // const minAltitude = Math.floor(sortedSatellites[0].altitude / binSize) * binSize;
    const minAltitude = 75;
    //  const maxAltitude = Math.ceil(sortedSatellites[sortedSatellites.length - 1].altitude / binSize) * binSize;
    const maxAltitude = 2000;

    // Create altitude bins
    const bins: DensityBin[] = [];

    for (let alt = minAltitude; alt < maxAltitude; alt += binSize) {
      bins.push({
        minAltitude: alt,
        maxAltitude: alt + binSize,
        count: 0,
        density: 0,
      });
    }

    // Count satellites in each bin
    for (const satellite of sortedSatellites) {
      const binIndex = Math.floor((satellite.altitude - minAltitude) / binSize);

      if (binIndex >= 0 && binIndex < bins.length) {
        bins[binIndex].count++;
      }
    }

    // Calculate density for each bin
    for (const bin of bins) {
      // Calculate the volume of the spherical shell (in km³)
      const innerRadius = 6371 + bin.minAltitude; // Earth radius (6371 km) + min altitude
      const outerRadius = 6371 + bin.maxAltitude; // Earth radius (6371 km) + max altitude
      const volume = (4 / 3) * Math.PI * (outerRadius ** 3 - innerRadius ** 3);

      // Calculate spatial density (objects per km³)
      bin.density = bin.count / volume;
    }

    return bins;
  }
}
