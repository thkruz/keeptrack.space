/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * catalogManagerInstance.ts is the primary interface between sat-cruncher and the main application.
 * It manages all interaction with the satellite catalogue.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2023 Heather Kruczek
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
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

import { keepTrackApi } from '@app/js/keepTrackApi';
import { SatelliteRecord, Sgp4 } from 'ootk';
import { controlSites } from '../catalogs/control-sites';
import { launchSites } from '../catalogs/launch-sites';
import { sensors } from '../catalogs/sensors';
import { stars } from '../catalogs/stars';
import { CatalogManager, GetSatType, RadarDataObject, SatCruncherMessageData, SatObject } from '../interfaces';
import { getEl } from '../lib/get-el';
import { SpaceObjectType } from '../lib/space-object-type';
import { StringPad } from '../lib/stringPad';
import { isThisNode } from '../static/isThisNode';
import { SatMath } from '../static/sat-math';
import { SplashScreen } from '../static/splash-screen';
import { StringExtractor } from '../static/string-extractor';
import { UrlManager } from '../static/url-manager';
import { CameraType } from './camera';
import { SatLinkManager } from './catalog-manager/satLinkManager';
import { lineManagerInstance } from './draw-manager/line-manager';
import { errorManagerInstance } from './errorManager';
import { StandardUiManager } from './uiManager';
// TODO: FUTURE FEATURE
// import { radarDataManager } from '@app/js/catalogManagerInstance/radarDataManager.js';

// prettier-ignore
/*
// export const updateRadarData = () => {
//   for (let i = 0; i < radarDataManager.radarData.length; i++) {
//     try {
//       catalogManagerInstance.satData[radarDataManager.satDataStartIndex + i].isRadarData = true;
//       catalogManagerInstance.satData[radarDataManager.satDataStartIndex + i].mId = parseInt(radarDataManager.radarData[i].m);
//       catalogManagerInstance.satData[radarDataManager.satDataStartIndex + i].t = radarDataManager.radarData[i].t;
//       catalogManagerInstance.satData[radarDataManager.satDataStartIndex + i].rcs = parseInt(radarDataManager.radarData[i].rc);
//       catalogManagerInstance.satData[radarDataManager.satDataStartIndex + i].trackId = parseInt(radarDataManager.radarData[i].ti);
//       catalogManagerInstance.satData[radarDataManager.satDataStartIndex + i].objectId = parseInt(radarDataManager.radarData[i].oi);
//       catalogManagerInstance.satData[radarDataManager.satDataStartIndex + i].satId = parseInt(radarDataManager.radarData[i].si);
//       catalogManagerInstance.satData[radarDataManager.satDataStartIndex + i].missileComplex = parseInt(radarDataManager.radarData[i].mc);
//       catalogManagerInstance.satData[radarDataManager.satDataStartIndex + i].missileObject = parseInt(radarDataManager.radarData[i].mo);
//       catalogManagerInstance.satData[radarDataManager.satDataStartIndex + i].azError = radarDataManager.radarData[i].ae;
//       catalogManagerInstance.satData[radarDataManager.satDataStartIndex + i].elError = radarDataManager.radarData[i].ee;
//       catalogManagerInstance.satData[radarDataManager.satDataStartIndex + i].dataType = radarDataManager.radarData[i].dataType;
//     } catch (e) {
//       // console.log(radarDataManager.radarData[i]);
//     }
//   }
//   colorSchemeManagerInstance.setColorScheme(settingsManager.currentColorScheme, true);
// };
*/

declare module '@app/js/interfaces' {
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

export class StandardCatalogManager implements CatalogManager {
  private static readonly TEMPLATE_INTLDES = '58001A';
  private static readonly TEMPLATE_TLE1_BEGINNING = '1 ';
  private static readonly TEMPLATE_TLE1_ENDING = 'U 58002B   17115.48668720 +.00000144 +00000-0 +16234-3 0  9994';
  private static readonly TEMPLATE_TLE2_BEGINNING = '2 ';
  private static readonly TEMPLATE_TLE2_ENDING = ' 034.2502 167.2636 0042608 222.6554 121.5501 24.84703551080477';

  private lastSelectedSat_ = -1;

  analSatSet = [];
  cosparIndex = null;
  fieldOfViewSet = [];
  gotExtraData = false;
  public hoveringSat = -1;
  public isLaunchSiteManagerLoaded = false;
  public isSensorManagerLoaded = false;
  public isStarManagerLoaded = false;
  public launchSites = null;
  missileSats = null;
  public missileSet = [];
  numSats = null;
  orbitDensity = [];
  orbitDensityMax = 0;
  orbitalSats = null;
  public radarDataSet = [];
  satCruncher = <Worker>null;
  satData = <SatObject[]>null;
  satExtraData = null;
  public satLinkManager: SatLinkManager = null;
  sccIndex = null;
  public secondarySat = -1;
  public secondarySatObj = null;
  public selectedSat = -1;
  sensorMarkerArray = null;
  public starIndex1 = 0;
  public starIndex2 = 0;
  public staticSet = [];
  public updateCruncherBuffers = (mData: SatCruncherMessageData): void => {
    // We need to wait for the first message to arrive before we can start updating the buffers
    // this.wait5_++;
    // if (this.wait5_ <= 5) return;

    keepTrackApi.getDotsManager().updateCruncherBuffers(mData);

    if (typeof mData?.sensorMarkerArray != 'undefined' && mData?.sensorMarkerArray?.length !== 0) {
      this.sensorMarkerArray = mData.sensorMarkerArray;
    }

    const highestMarkerNumber = this.sensorMarkerArray?.[this.sensorMarkerArray?.length - 1] || 0;
    settingsManager.dotsOnScreen = Math.max(this.numSats - settingsManager.maxFieldOfViewMarkers, highestMarkerNumber);
  };

  wait5_ = 0;

  /**
   * Calculates the Satellite Record (satrec) for a given satellite object.
   * If a cached satrec exists, it returns it. Otherwise, it performs and stores
   * satellite initialization calculations using the Sgp4.createSatrec method.
   * The calculated satrec is then cached for later use.
   *
   * @param {SatObject} sat - The satellite object for which to calculate the satrec.
   * @returns {SatelliteRecord} The calculated or cached Satellite Record.
   */
  public calcSatrec(sat: SatObject): SatelliteRecord {
    // If cached satrec exists, return it
    if (sat.satrec) {
      return sat.satrec;
    }

    // Perform and store sat init calcs
    const satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2);

    // Cache the satrec for later use.
    if (this.satData[sat.id]) {
      this.satData[sat.id].satrec = satrec;
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
  public convertSatnumArrayToIdArray(satnumArray: number[]) {
    return satnumArray.map((satnum) => this.getIdFromObjNum(satnum, false) || null).filter((id) => id !== null);
  }

  public cruncherExtraData(mData: SatCruncherMessageData) {
    if (!mData?.extraData) throw new Error('extraData required!');

    const satExtraData = JSON.parse(mData.extraData);

    if (typeof this.satData === 'undefined') throw new Error('No sat data');
    if (typeof satExtraData === 'undefined') throw new Error('No extra data');

    for (let i = 0; i < 180; i++) {
      this.orbitDensity[i] = [];
      for (let p = 90; p < 1500; p++) {
        this.orbitDensity[i][p] = 0;
      }
    }

    for (let satCrunchIndex = 0; satCrunchIndex < this.numSats; satCrunchIndex++) {
      try {
        // Static objects lack these values and including them increase the JS heap a lot
        if (this.satData[satCrunchIndex].static) continue;
        this.satData[satCrunchIndex].inclination = satExtraData[satCrunchIndex].inclination;
        this.satData[satCrunchIndex].eccentricity = satExtraData[satCrunchIndex].eccentricity;
        this.satData[satCrunchIndex].raan = satExtraData[satCrunchIndex].raan;
        this.satData[satCrunchIndex].argPe = satExtraData[satCrunchIndex].argPe;
        this.satData[satCrunchIndex].meanMotion = satExtraData[satCrunchIndex].meanMotion;

        this.satData[satCrunchIndex].semiMajorAxis = satExtraData[satCrunchIndex].semiMajorAxis;
        this.satData[satCrunchIndex].semiMinorAxis = satExtraData[satCrunchIndex].semiMinorAxis;
        this.satData[satCrunchIndex].apogee = satExtraData[satCrunchIndex].apogee;
        this.satData[satCrunchIndex].perigee = satExtraData[satCrunchIndex].perigee;
        this.satData[satCrunchIndex].period = satExtraData[satCrunchIndex].period;
        this.satData[satCrunchIndex].satrec = this.calcSatrec(this.satData[satCrunchIndex]);

        if (this.satData[satCrunchIndex].type !== SpaceObjectType.PAYLOAD) {
          const inc = Math.round(satExtraData[satCrunchIndex].inclination);
          const per = Math.round(satExtraData[satCrunchIndex].period);
          this.orbitDensity[inc][per] += 1;
        }

        this.satData[satCrunchIndex].velocity = { total: 0, x: 0, y: 0, z: 0 };
      } catch (error) {
        if (typeof satExtraData[satCrunchIndex] === 'undefined') throw new Error('No extra data for sat ' + satCrunchIndex);
        if (typeof this.satData[satCrunchIndex] === 'undefined') throw new Error('No data for sat ' + satCrunchIndex);
        // Intentionally left blank
      }
    }

    this.orbitDensityMax = 0;
    for (let i = 0; i < 180; i++) {
      for (let p = 90; p < 1500; p++) {
        if (this.orbitDensity[i][p] > this.orbitDensityMax) this.orbitDensityMax = this.orbitDensity[i][p];
      }
    }

    this.gotExtraData = true;
  }

  public cruncherExtraUpdate(mData: SatCruncherMessageData) {
    if (!mData?.extraUpdate) throw new Error('extraUpdate required!');

    const satExtraData = JSON.parse(mData.extraData);
    const satCrunchIndex = mData.satId;

    this.satData[satCrunchIndex].inclination = satExtraData[0].inclination;
    this.satData[satCrunchIndex].eccentricity = satExtraData[0].eccentricity;
    this.satData[satCrunchIndex].raan = satExtraData[0].raan;
    this.satData[satCrunchIndex].argPe = satExtraData[0].argPe;
    this.satData[satCrunchIndex].meanMotion = satExtraData[0].meanMotion;

    this.satData[satCrunchIndex].semiMajorAxis = satExtraData[0].semiMajorAxis;
    this.satData[satCrunchIndex].semiMinorAxis = satExtraData[0].semiMinorAxis;
    this.satData[satCrunchIndex].apogee = satExtraData[0].apogee;
    this.satData[satCrunchIndex].perigee = satExtraData[0].perigee;
    this.satData[satCrunchIndex].period = satExtraData[0].period;
    this.satData[satCrunchIndex].TLE1 = satExtraData[0].TLE1;
    this.satData[satCrunchIndex].TLE2 = satExtraData[0].TLE2;
  }

  public getIdFromIntlDes(intlDes: string): number | null {
    return typeof this.cosparIndex[`${intlDes}`] !== 'undefined' ? this.cosparIndex[`${intlDes}`] : null;
  }

  /**
   * This method is used to get the ID from the object number.
   *
   * @param {number} objNum - The object number for which the ID is to be found.
   * @param {boolean} isExtensiveSearch - A flag to determine if an extensive search should be performed. Default is true.
   *
   * @returns {number | null} - Returns the ID if found, otherwise returns null.
   *
   * The method first checks if the object number exists in the `sccIndex`. If it does, it returns the corresponding ID.
   * If the object number does not exist in the `sccIndex` and `isExtensiveSearch` is true, it performs an extensive search in the `satData`.
   * If the object number is found in the `satData`, it returns the index as the ID. If not found, it returns null.
   */
  public getIdFromObjNum(objNum: number, isExtensiveSearch = true): number | null {
    if (typeof this.sccIndex?.[`${objNum}`] !== 'undefined') {
      return this.sccIndex[`${objNum}`];
    } else if (isExtensiveSearch) {
      for (let i = 0; i < this.satData.length; i++) {
        if (parseInt(this.satData[i]?.sccNum) == objNum) return i;
      }
    }
    return null;
  }

  public getIdFromStarName(starName: string, starIndex1: number, starIndex2: number): number | null {
    const i = this.satData.slice(starIndex1, starIndex2).findIndex((object: SatObject) => object?.type === SpaceObjectType.STAR && object?.name === starName);
    return i === -1 ? null : i + starIndex1;
  }

  /**
   * Retrieves a satellite object from the catalog.
   *
   * Optional GetSatType parameter can be used speed up the function by retrieving only the required data.
   *
   * @param {number | null} i - The index of the satellite in the catalog. If the index is -1 or null, or if the satellite data is not available, the function will return null.
   * @param {GetSatType} type - An optional parameter that specifies the type of data to retrieve. By default, it retrieves the default satellite data. If set to GetSatType.EXTRA_ONLY, it retrieves only the extra data. If set to GetSatType.POSITION_ONLY, it retrieves only the position data.
   *
   * @returns {SatObject | null} - Returns the satellite object if found, otherwise returns null. The returned object may contain different data depending on the 'type' parameter.
   */
  public getSat(i: number | null, type: GetSatType = GetSatType.DEFAULT): SatObject | null {
    if (i == -1 || !this.satData || !this.satData[i]) {
      if (!isThisNode() && i >= 0 && !this.satData[i]) console.warn(`Satellite ${i} not found`);
      return null;
    }

    if (type === GetSatType.EXTRA_ONLY) {
      return this.satData[i];
    }

    if (type === GetSatType.POSITION_ONLY) {
      this.satData[i].position = keepTrackApi.getDotsManager().getCurrentPosition(i);
      return this.satData[i];
    }

    if (this.gotExtraData && type !== GetSatType.SKIP_POS_VEL) {
      keepTrackApi.getDotsManager().updatePosVel(this.satData[i], i);
    }

    // Update the satrec object
    if (this.satData[i].TLE1) this.calcSatrec(this.satData[i]);

    return this.satData[i];
  }

  /**
   * Retrieves a satellite object based on its object number.
   *
   * @param objNum - The object number of the satellite.
   * @returns The satellite object if found, null otherwise.
   */
  public getSatFromObjNum(objNum: number): SatObject | null {
    return this.getSat(this.getIdFromObjNum(objNum));
  }

  public getSensorFromSensorName(sensorName: string): number | null {
    return this.satData.findIndex(
      // Find the first static object that isn't a missile or a star
      (object: SatObject) => (object?.static && !object?.missile && object?.type !== SpaceObjectType.STAR ? object.name === sensorName : false) // Test
    );
  }

  public id2satnum(satIdArray: number[]) {
    return satIdArray.map((id) => (this.getSat(id)?.sccNum || -1).toString()).filter((satnum) => satnum !== '-1');
  }

  public async init(satCruncherOveride?: any): Promise<void> {
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
            this.satCruncher = {} as any;
            console.debug(error);
          }
        }
      } else {
        if (typeof Worker === 'undefined') {
          throw new Error('Your browser does not support web workers.');
        }
        /* istanbul ignore next */
        try {
          this.satCruncher = new Worker(settingsManager.installDirectory + 'js/positionCruncher.js');
        } catch (error) {
          // If you are trying to run this off the desktop you might have forgotten --allow-file-access-from-files
          if (window.location.href.indexOf('file://') === 0) {
            throw new Error(
              'Critical Error: You need to allow access to files from your computer! Ensure "--allow-file-access-from-files" is added to your chrome shortcut and that no other copies of chrome are running when you start it.'
            );
          } else {
            throw new Error(error);
          }
        }
      }

      this.registerKeyboardEvents_();

      this.satCruncher.onmessage = this.satCruncherOnMessage.bind(this);
      this.gotExtraData = false;
      // TODO: FUTURE FEATURE
      // this.radarDataManager = radarDataManager;
    } catch (error) {
      throw new Error(error);
    }
  }

  public initObjects() {
    // Create a buffer of missile objects
    for (let i = 0; i < settingsManager.maxMissiles; i++) {
      this.missileSet.push({
        static: false,
        missile: true,
        active: false,
        type: SpaceObjectType.UNKNOWN,
        name: i,
        latList: [],
        lonList: [],
        altList: [],
        timeList: [],
      });
    }

    // Create a buffer of radar data objects
    for (let i = 0; i < settingsManager.maxRadarData; i++) {
      const radarDataInfo = <RadarDataObject>{
        static: true,
        missile: false,
        active: false,
        type: SpaceObjectType.UNKNOWN,
        name: `Radar Data ${i}`,
      };
      this.radarDataSet.push(radarDataInfo);
    }

    // Create a buffer of analyst satellite objects
    for (let i = 0; i < settingsManager.maxAnalystSats; i++) {
      const sccNum = (80000 + i).toString();
      this.analSatSet.push(<SatObject>{
        static: false,
        missile: false,
        active: false,
        name: 'Analyst Sat ' + i,
        country: 'ANALSAT',
        launchVehicle: 'Analyst Satellite',
        launchSite: 'ANALSAT',
        sccNum: sccNum,
        TLE1: `${StandardCatalogManager.TEMPLATE_TLE1_BEGINNING}${sccNum}${StandardCatalogManager.TEMPLATE_TLE1_ENDING}`,
        TLE2: `${StandardCatalogManager.TEMPLATE_TLE2_BEGINNING}${sccNum}${StandardCatalogManager.TEMPLATE_TLE2_ENDING}`,
        intlDes: StandardCatalogManager.TEMPLATE_INTLDES,
        type: SpaceObjectType.PAYLOAD,
        id: i,
      });
    }

    // Create Stars
    if (!settingsManager.lowPerf && !settingsManager.isDisableStars) {
      stars.forEach((star) => {
        this.staticSet.push({
          name: star.name,
          static: true,
          shortName: 'STAR',
          type: SpaceObjectType.STAR,
          dec: star.dec,
          ra: star.ra,
          vmag: star.vmag,
        });
      });
      this.isStarManagerLoaded = true;
    } else {
      this.isStarManagerLoaded = false;
    }

    // Create Sensors
    if (!settingsManager.isDisableSensors) {
      let i = 0;
      for (const sensor in sensors) {
        sensors[sensor].staticNum = i;
        sensors[sensor].static = true;
        this.staticSet.push(sensors[sensor]);
        i++;
      }
    }
    this.isSensorManagerLoaded = true; // TODO: Why is this always true?

    // Create Launch Sites
    if (!settingsManager.isDisableLaunchSites) {
      for (const launchSiteName in launchSites) {
        const launchSite = launchSites[launchSiteName];
        this.staticSet.push({
          static: true,
          type: SpaceObjectType.LAUNCH_FACILITY,
          name: launchSite.name,
          lat: launchSite.lat,
          lon: launchSite.lon,
          alt: launchSite.alt,
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
        // TODO: Control sites all should have an SpaceObjectType Enum
        // Until all the control sites have enums ignore the legacy ones
        .filter((controlSite) => typeof controlSite.type !== 'string')
        // Until all the control sites enums are implemented ignore the odd ones
        .filter((controlSite) => controlSite.type <= 25)
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
      console.debug(`settingsManager.maxFieldOfViewMarkers missing or broken!`);
    }

    // Initialize the satLinkMananger and then attach it to the object manager
    try {
      const satLinkManager = new SatLinkManager();
      satLinkManager.init(controlSites);
      this.satLinkManager = satLinkManager;
    } catch (e) {
      console.log('satLinkManager Failed to Initialize!');
    }
  }

  public insertNewAnalystSatellite(TLE1: string, TLE2: string, id: number, sccNum?: string): any {
    if (TLE1.length !== 69) throw new Error(`Invalid TLE1: length is not 69 - ${TLE1}`);
    if (TLE2.length !== 69) throw new Error(`Invalid TLE1: length is not 69 - ${TLE2}`);

    let satrec: SatelliteRecord;
    try {
      satrec = Sgp4.createSatrec(TLE1, TLE2);
    } catch (e) {
      errorManagerInstance.error(e, 'catalog-manager.ts', 'Error creating satellite record!');
      return;
    }

    if (SatMath.altitudeCheck(satrec, keepTrackApi.getTimeManager().simulationTimeObj) > 1) {
      this.satCruncher.postMessage({
        typ: 'satEdit',
        id: id,
        active: true,
        TLE1: TLE1,
        TLE2: TLE2,
      });
      keepTrackApi.getOrbitManager().changeOrbitBufferData(id, TLE1, TLE2);
      const sat = this.getSat(id);
      sat.active = true;
      sat.type = SpaceObjectType.PAYLOAD; // Default to Satellite
      sat.sccNum = sccNum || StringPad.pad0(TLE1.substr(2, 5).trim(), 5);
      return sat;
    } else {
      console.debug(TLE1);
      console.debug(TLE2);
      keepTrackApi.getUiManager().toast(`New Analyst Satellite is Invalid!`, 'critical');
      return false;
    }
  }

  public lastSelectedSat(id?: number): number {
    this.lastSelectedSat_ = id >= 0 ? id : this.lastSelectedSat_;
    return this.lastSelectedSat_;
  }

  public satCruncherOnMessage({ data: mData }: { data: SatCruncherMessageData }) {
    if (!mData) return;

    if (mData.badObjectId) {
      if (mData.badObjectId >= 0) {
        // Mark the satellite as inactive
        const id = this.getIdFromObjNum(mData.badObjectId);
        if (id !== null) {
          this.satData[id].active = false;
          // (<any>window).decayedSats = (<any>window).decayedSats || [];
          // (<any>window).decayedSats.push(this.satData[id].sccNum);
          errorManagerInstance.debug(`Satellite ${mData.badObjectId} is inactive due to bad TLE`);
        }
      } else {
        // console.debug(`Bad sat number: ${mData.badObjectId}`);
        // How are we getting a negative number? There is a bug somewhere...
      }
    }

    // store extra data that comes from crunching
    // Only do this once
    if (!this.gotExtraData && mData.extraData) {
      this.cruncherExtraData(mData);
      return;
    }

    if (mData?.extraUpdate) {
      this.cruncherExtraUpdate(mData);
      return;
    }

    this.updateCruncherBuffers(mData);

    // Run any callbacks for a normal position cruncher message
    keepTrackApi.methods.onCruncherMessage();

    // Only do this once after satData, positionData, and velocityData are all received/processed from the cruncher
    if (!settingsManager.cruncherReady && this.satData && keepTrackApi.getDotsManager().positionData && keepTrackApi.getDotsManager().velocityData) {
      SplashScreen.hideSplashScreen();

      const stars = this.satData.filter((sat) => sat?.type === SpaceObjectType.STAR);
      if (stars.length > 0) {
        stars.sort((a, b) => a.id - b.id);
        // this is the smallest id
        keepTrackApi.getDotsManager().starIndex1 = stars[0].id;
        // this is the largest id
        keepTrackApi.getDotsManager().starIndex2 = stars[stars.length - 1].id;
        keepTrackApi.getDotsManager().updateSizeBuffer();
      }

      UrlManager.parseGetVariables();

      if (!settingsManager.disableUI && settingsManager.isLoadLastSensor) {
        StandardUiManager.reloadLastSensor();
      }

      // Run any functions registered with the API
      keepTrackApi.methods.onCruncherReady();

      settingsManager.cruncherReady = true;
    }
  }

  // TODO: Move this to Higher Level
  public selectSat(i: number): void {
    if (settingsManager.isDisableSelectSat) return;
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();
    const { gl } = keepTrackApi.getDrawManager();

    if (i === this.lastSelectedSat()) return;

    this.satCruncher.postMessage({
      typ: 'satelliteSelected',
      satelliteSelected: [i],
    });

    gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManagerInstance.colorBuffer);
    // If Old Select Sat Picked Color it Correct Color
    const lastSelectedObject = this.lastSelectedSat();
    if (lastSelectedObject !== -1) {
      const newColor = colorSchemeManagerInstance.currentColorScheme(this.getSat(lastSelectedObject)).color;
      colorSchemeManagerInstance.colorData[lastSelectedObject * 4] = newColor[0]; // R
      colorSchemeManagerInstance.colorData[lastSelectedObject * 4 + 1] = newColor[1]; // G
      colorSchemeManagerInstance.colorData[lastSelectedObject * 4 + 2] = newColor[2]; // B
      colorSchemeManagerInstance.colorData[lastSelectedObject * 4 + 3] = newColor[3]; // A
      gl.bufferSubData(gl.ARRAY_BUFFER, lastSelectedObject * 4 * 4, new Float32Array(newColor));

      if (!settingsManager.lastSearchResults.includes(lastSelectedObject)) {
        dotsManagerInstance.sizeData[lastSelectedObject] = 0.0;
        gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.buffers.size);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, dotsManagerInstance.sizeData);
      }
    }
    // If New Select Sat Picked Color it
    if (i !== -1) {
      // if error then log i
      if (i > colorSchemeManagerInstance.colorData.length / 4) {
        console.error('i is greater than colorData length');
        console.error(i);
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, i * 4 * 4, new Float32Array(settingsManager.selectedColor));

      dotsManagerInstance.sizeData[i] = 1.0;
      gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.buffers.size);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, dotsManagerInstance.sizeData);
    }

    this.setSelectedSat(i);

    if (this.isSensorManagerLoaded && keepTrackApi.getSensorManager().isSensorSelected()) {
      getEl('menu-lookangles', true)?.classList.remove('bmenu-item-disabled');
    }
    getEl('menu-lookanglesmultisite', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-satview', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-map', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-editSat', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-sat-fov', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-newLaunch', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-breakup', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-plot-analysis', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-plot-analysis2', true)?.classList.remove('bmenu-item-disabled');

    keepTrackApi.methods.selectSatData(this.getSat(i), i);
  }

  public setSat(i: number, sat: SatObject): void {
    // TODO: This shouldnt ever happen
    if (!this.satData) return; // Cant set a satellite without a catalog
    this.satData[i] = sat;
    this.satData[i].velocity ??= { total: 0, x: 0, y: 0, z: 0 }; // Set the velocity to 0 if it doesn't exist
  }

  getSatsFromSatData(): SatObject[] {
    return <SatObject[]>this.satData;
  }

  public getSelectedSat(): SatObject {
    return this.getSat(this.selectedSat);
  }

  public setSecondarySat(id: number): void {
    if (settingsManager.isDisableSelectSat) return;
    this.secondarySat = id;
    if (!(this.secondarySatObj?.id === id)) {
      this.secondarySatObj = this.getSat(id);
    }

    keepTrackApi.methods.setSecondarySat(this.secondarySatObj, id);
  }

  public setSelectedSat(id: number): void {
    if (settingsManager.isDisableSelectSat || id === null) return;
    this.selectedSat = id;

    UrlManager.updateURL();
  }

  panToStar(c: SatObject): void {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const dotsManagerInstance = keepTrackApi.getDotsManager();

    // Try with the pname
    let satId = this.getIdFromStarName(c.name, dotsManagerInstance.starIndex1, dotsManagerInstance.starIndex2);
    let sat = this.getSat(satId);

    if (sat == null) throw new Error('Star not found');

    lineManagerInstance.clear();
    if (this.isStarManagerLoaded) {
      keepTrackApi.getStarManager().isAllConstellationVisible = false;
    }

    lineManagerInstance.create('ref', [sat.position.x, sat.position.y, sat.position.z], [1, 0.4, 0, 1]);
    keepTrackApi.getMainCamera().cameraType = CameraType.OFFSET;
    keepTrackApi.getMainCamera().lookAtPosition(sat.position, false, timeManagerInstance.selectedDate);
  }

  public switchPrimarySecondary(): void {
    const _primary = this.selectedSat;
    const _secondary = this.secondarySat;
    this.setSecondarySat(_primary);
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    if (_primary !== -1) {
      orbitManagerInstance.setSelectOrbit(_primary, true);
    } else {
      orbitManagerInstance.clearSelectOrbit(true);
    }
    this.setSelectedSat(_secondary);
  }

  private registerKeyboardEvents_() {
    const inputManagerInstance = keepTrackApi.getInputManager();
    inputManagerInstance.keyboard.registerKeyDownEvent({
      key: ']',
      callback: () => {
        this.switchPrimarySecondary();
      },
    });
    inputManagerInstance.keyboard.registerKeyDownEvent({
      key: '{',
      callback: () => {
        this.switchPrimarySecondary();
      },
    });
  }
}
