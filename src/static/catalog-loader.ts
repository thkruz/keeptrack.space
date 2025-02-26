/* eslint-disable max-lines */
import { getEl } from '@app/lib/get-el';
import { StringPad } from '@app/lib/stringPad';
import type { CatalogManager } from '@app/singletons/catalog-manager';
import { MissileObject } from '@app/singletons/catalog-manager/MissileObject';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { CruncerMessageTypes, CruncherSat } from '@app/webworker/positionCruncher';
import {
  BaseObject,
  CatalogSource,
  Degrees,
  DetailedSatellite,
  DetailedSensor,
  Kilometers,
  LandObject,
  Marker,
  Sensor,
  SpaceObjectType,
  Star,
  Tle,
  TleLine1,
  TleLine2,
} from 'ootk';

import { PersistenceManager, StorageKey } from '@app/singletons/persistence-manager';
import { keepTrackApi } from '../keepTrackApi';
import { settingsManager, SettingsManager } from '../settings/settings';

interface JsSat {
  TLE1: string;
  TLE2: string;
  vmag?: number;
}

interface ExtraSat {
  ON?: string;
  OT?: SpaceObjectType;
  SCC: string;
  TLE1: string;
  TLE2: string;
  vmag?: number;
}

interface AsciiTleSat {
  ON?: string;
  OT?: SpaceObjectType;
  SCC: string;
  TLE1: TleLine1;
  TLE2: TleLine2;
}

export interface KeepTrackTLEFile {
  /** First TLE line */
  TLE1: TleLine1;
  /** Second TLE line */
  TLE2: TleLine2;
  /** Satellite Bus */
  bus?: string;
  /** Lift vehicle configuration */
  configuration?: string;
  /** Owner country of the object */
  country?: string;
  /** Length of the object in meters */
  length?: string;
  /** Size of the object's diameter in meters */
  diameter?: string;
  /** Size of the object's width in meters */
  span?: string;
  /** Dry mass of the object in kilograms */
  dryMass?: string;
  /** Equipment on the object */
  equipment?: string;
  /** Date launched into space in YYYY-MM-DD */
  launchDate?: string;
  /**
   * Stable Date in YYYY-MM-DD.
   * This is mainly for identifying fragment creation dates
   */
  stableDate?: string;
  /** Launch mass including fuel in kilograms */
  launchMass?: string;
  /** Launch site */
  launchSite?: string;
  /** Launch Pad */
  launchPad?: string;
  /** Launch vehicle */
  launchVehicle?: string;
  /** Lifetime of the object in years */
  lifetime?: string | number;
  /** Manufacturer of the object */
  manufacturer?: string;
  /** Mission of the object */
  mission?: string;
  /** Motor of the object */
  motor?: string;
  /** Primary Name of the object */
  name: string;
  /** Alternate name of the object */
  altName?: string;
  /** Owner of the object */
  owner?: string;
  /** Payload of the object */
  payload?: string;
  /** Power information */
  power?: string;
  /** Purpose of the object */
  purpose?: string;
  /** Size of the object in Radar Cross Section (RCS) in meters squared */
  rcs?: string;
  /** Shape of the object */
  shape?: string;
  /** Current status of the object */
  status?: string;
  /** Type of the object */
  type?: SpaceObjectType;
  /** Visual magnitude of the object */
  vmag?: number;
  /**
   * Used internally only and deleted before saving
   * @deprecated Not really, but it makes it clear that this is not saved to disk
   */
  JCAT?: string;
  altId?: string;
  /** This is added in addSccNum_ */
  sccNum?: string;
  /** This is added in parseIntlDes_ */
  intlDes?: string;
  /** This is added in this file */
  active?: boolean;
  /** This is added in this file */
  source?: CatalogSource;
  /** This is added in this file */
  id?: number;
}

export class CatalogLoader {
  static filterTLEDatabase(resp: KeepTrackTLEFile[], limitSatsArray?: string[], extraSats?: ExtraSat[], asciiCatalog?: AsciiTleSat[] | void, jsCatalog?: JsSat[]): void {
    let tempObjData: BaseObject[] = [];
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    catalogManagerInstance.sccIndex = <{ [key: string]: number }>{};
    catalogManagerInstance.cosparIndex = <{ [key: string]: number }>{};

    CatalogLoader.checkForLimitSats_(limitSatsArray);

    const notionalSatNum = 400000; // Start at 400,000 to avoid conflicts with real satellites

    for (let i = 0; i < resp.length; i++) {
      CatalogLoader.addSccNum_(resp, i);

      // Check if first digit is a letter
      resp[i].sccNum = Tle.convertA5to6Digit(resp[i]?.sccNum);

      if (settingsManager.limitSats === '') {
        CatalogLoader.processAllSats_(resp, i, catalogManagerInstance, tempObjData, notionalSatNum);
      } else {
        CatalogLoader.processLimitedSats_(limitSatsArray, resp, i, catalogManagerInstance, tempObjData);
      }
    }

    if (extraSats?.length > 0) {
      CatalogLoader.processExtraSats_(extraSats, catalogManagerInstance, tempObjData);
    }

    if (asciiCatalog && asciiCatalog?.length > 0) {
      tempObjData = CatalogLoader.processAsciiCatalog_(asciiCatalog, catalogManagerInstance, tempObjData);
    }

    if (jsCatalog?.length > 0) {
      CatalogLoader.processJsCatalog_(jsCatalog, catalogManagerInstance, tempObjData);
    }

    CatalogLoader.addNonSatelliteObjects_(catalogManagerInstance, tempObjData);

    catalogManagerInstance.objectCache = tempObjData;
  }

  /**
   *  This function will load the catalog, additional catalogs, and merge them together.
   *
   *  Primary Catalogs
   *  1. tle.json - this contains extended object information including launch location and RCS.
   *  2. tleDebris.json - this contains all non-payload data from TLE.json
   *  Secondary Catalogs
   *  1. extra.json - this contains supplemental information about the catalog in json format.
   *  2. TLE.txt - this contains a local ASCII TLE file.
   *  3. externalTLEs - this contains an external TLE file.
   *  4. vimpel.json - this contains JSC Vimpel TLE data.
   *
   *  The catalog is loaded in the above order appending/overwriting the information each step of the way.
   *
   *  If a file is missing, the function will skip it and continue loading the next file.
   *
   *  If all files are missing, the function will return an error.
   */
  static async load(): Promise<void> {
    const settingsManager: SettingsManager = window.settingsManager;

    try {
      const {
        extraSats,
        asciiCatalog,
        jsCatalog,
        externalCatalog,
      }: { extraSats: Promise<ExtraSat[]>; asciiCatalog: Promise<AsciiTleSat[] | void>; jsCatalog: Promise<JsSat[]>; externalCatalog: Promise<AsciiTleSat[] | void> } =
        CatalogLoader.getAdditionalCatalogs_(settingsManager);

      if (settingsManager.externalTLEsOnly) {
        // Load our database for the extra information - the satellites will be filtered out
        await fetch(settingsManager.dataSources.tle)
          .then((response) => response.json())
          .then((data) => CatalogLoader.parse({
            keepTrackTle: data,
            externalCatalog,
          }))
          .catch((error) => {
            errorManagerInstance.error(error, 'tleManagerInstance.loadCatalog');
          });
      } else if (settingsManager.isUseDebrisCatalog) {
        // Load the debris catalog
        await fetch(settingsManager.dataSources.tleDebris)
          .then((response) => response.json())
          .then((data) => CatalogLoader.parse({
            keepTrackTle: data,
            keepTrackExtra: extraSats,
            keepTrackAscii: asciiCatalog,
            vimpelCatalog: jsCatalog,
          }))
          .catch((error) => {
            errorManagerInstance.error(error, 'tleManagerInstance.loadCatalog');
          });
      } else if (settingsManager.loadPhaseAJsonFile) {
        // Load phaseA.json file
        const resp = await fetch(`${settingsManager.installDirectory}tle/phaseA.json`);
        if (resp.ok) {
          const data = await resp.json();
          console.log('phaseA.json loaded. Data:', data);
          await CatalogLoader.parse({
            keepTrackTle: data,
            keepTrackExtra: extraSats,
            keepTrackAscii: asciiCatalog,
            vimpelCatalog: jsCatalog,
          });
        } else {
          errorManagerInstance.warn('Error loading phaseA.json');
        }

      } else if (settingsManager.loadPhaseBJsonFile) {
        // Load phaseA.json file
        const resp = await fetch(`${settingsManager.installDirectory}tle/phaseB.json`);
        if (resp.ok) {
          const data = await resp.json();
          console.log('phaseB.json loaded. Data:', data);
          await CatalogLoader.parse({
            keepTrackTle: data,
            keepTrackExtra: extraSats,
            keepTrackAscii: asciiCatalog,
            vimpelCatalog: jsCatalog,
          });
        } else {
          errorManagerInstance.warn('Error loading phaseB.json');
        }

      } else {
        // use cached file
        let tleData = await this.loadTleData();
        if (tleData) {
          await CatalogLoader.parse({
            keepTrackTle: tleData, // Pass the TLE data here
            keepTrackExtra: extraSats,
            keepTrackAscii: asciiCatalog,
            externalCatalog,
            vimpelCatalog: jsCatalog
          });
        } else {
          console.error('No TLE data available for parsing.');
        }
        // Load the primary catalog
        // await fetch(settingsManager.dataSources.tle)
        //   .then((response) => response.json())
        //   .then((data) => CatalogLoader.parse({
        //     keepTrackTle: data,
        //     keepTrackExtra: extraSats,
        //     keepTrackAscii: asciiCatalog,
        //     externalCatalog,
        //     vimpelCatalog: jsCatalog,
        //   }))
        //   .catch((error) => {
        //     errorManagerInstance.error(error, 'tleManagerInstance.loadCatalog');
        //   });
      }
    } catch (e) {
      errorManagerInstance.warn('Failed to load TLE catalog(s)!');
    }
  }

  /**
   * Parses the satellite catalog data and filters TLEs based on the given parameters.
   * @param resp - An array of SatObject containing the satellite catalog data.
   * @param extraSats - A Promise that resolves to an array of ExtraSat objects.
   * @param altCatalog - An object containing alternate catalogs. It has the following properties:
   *    - asciiCatalog: A Promise that resolves to an array of AsciiTleSat objects.
   *    - externalCatalog: (optional) A Promise that resolves to an array of AsciiTleSat objects or void.
   * @param jsCatalog - A Promise that resolves to an array of JsSat objects.
   */
  static async parse({
    keepTrackTle: resp = [],
    keepTrackExtra: extraSats = Promise.resolve([]),
    keepTrackAscii: asciiCatalog = Promise.resolve([]),
    externalCatalog = Promise.resolve([]),
    vimpelCatalog: jsCatalog = Promise.resolve([]),
  }: {
    keepTrackTle?: KeepTrackTLEFile[];
    keepTrackExtra?: Promise<ExtraSat[]>;
    keepTrackAscii?: Promise<AsciiTleSat[] | void>;
    externalCatalog?: Promise<AsciiTleSat[] | void>;
    vimpelCatalog?: Promise<JsSat[]>;
  }): Promise<void> {
    await Promise.all([extraSats, asciiCatalog, externalCatalog, jsCatalog]).then(([extraSats, asciiCatalog, externalCatalog, jsCatalog]) => {
      asciiCatalog = externalCatalog || asciiCatalog;
      const limitSatsArray = !settingsManager.limitSats ? CatalogLoader.setupGetVariables() : settingsManager.limitSats.split(',');

      // Make sure everyone agrees on what time it is
      keepTrackApi.getTimeManager().synchronize();

      /*
       * Filter TLEs
       * Sets catalogManagerInstance.satData internally to reduce memory usage
       */
      CatalogLoader.filterTLEDatabase(resp, limitSatsArray, extraSats, asciiCatalog, jsCatalog);

      const catalogManagerInstance = keepTrackApi.getCatalogManager();

      catalogManagerInstance.numObjects = catalogManagerInstance.objectCache.length;

      const satDataString = CatalogLoader.getSatDataString_(catalogManagerInstance.objectCache);

      /** Send satDataString to satCruncher to begin propagation loop */
      catalogManagerInstance.satCruncher.postMessage({
        typ: CruncerMessageTypes.OBJ_DATA,
        dat: satDataString,
        fieldOfViewSetLength: catalogManagerInstance.fieldOfViewSet.length,
        isLowPerf: settingsManager.lowPerf,
      });
    });
  }

  /**
   * Parses GET variables for SatCruncher initialization
   * @returns An array of strings containing the limitSats values
   */
  static setupGetVariables() {
    let limitSatsArray: string[] = [];
    /** Parses GET variables for SatCruncher initialization */
    // This should be somewhere else!!
    const queryStr = window.location.search.substring(1);
    const params = queryStr.split('&');

    for (const param of params) {
      const key = param.split('=')[0];
      const val = param.split('=')[1];

      switch (key) {
        case 'limitSats':
          settingsManager.limitSats = val;
          (<HTMLInputElement>getEl('limitSats')).value = val;
          getEl('limitSats-Label').classList.add('active');
          limitSatsArray = val.split(',');
          break;
        case 'future use':
        default:
          break;
      }
    }

    return limitSatsArray;
  }

  /**
   * Adds non-satellite objects to the catalog manager instance.
   * @param catalogManagerInstance - The catalog manager instance to add the objects to.
   * @param tempObjData - An array of temporary satellite data.
   */
  private static addNonSatelliteObjects_(catalogManagerInstance: CatalogManager, tempObjData: BaseObject[]) {
    catalogManagerInstance.orbitalSats = tempObjData.length + settingsManager.maxAnalystSats;
    const dotsManagerInstance = keepTrackApi.getDotsManager();

    dotsManagerInstance.starIndex1 = catalogManagerInstance.starIndex1 + catalogManagerInstance.orbitalSats;
    dotsManagerInstance.starIndex2 = catalogManagerInstance.starIndex2 + catalogManagerInstance.orbitalSats;

    let i = 0;

    for (const staticSat of catalogManagerInstance.staticSet) {
      staticSat.id = tempObjData.length;
      catalogManagerInstance.staticSet[i].id = tempObjData.length;
      i++;

      if (staticSat.maxRng) {
        const sensor = new DetailedSensor({
          id: tempObjData.length,
          ...staticSat,
        });

        tempObjData.push(sensor);
      } else {
        const landObj = new LandObject({
          id: tempObjData.length,
          ...staticSat,
        });

        tempObjData.push(landObj);
      }
    }
    for (const analSat of catalogManagerInstance.analSatSet) {
      analSat.id = tempObjData.length;
      tempObjData.push(analSat);
    }

    catalogManagerInstance.numSatellites = tempObjData.length;

    for (const missileObj of catalogManagerInstance.missileSet) {
      tempObjData.push(missileObj);
    }

    catalogManagerInstance.missileSats = tempObjData.length; // This is the start of the missiles index

    for (const fieldOfViewMarker of catalogManagerInstance.fieldOfViewSet) {
      fieldOfViewMarker.id = tempObjData.length;
      const marker = new Marker(fieldOfViewMarker);

      tempObjData.push(marker);
    }
  }

  /**
   * Checks if there are any limit sats and sets the settingsManager accordingly.
   * @param limitSatsArray - An array of limit sats.
   */
  private static checkForLimitSats_(limitSatsArray: string[]) {
    if (typeof limitSatsArray === 'undefined' || limitSatsArray.length === 0 || limitSatsArray[0] === null) {
      // If there are no limits then just process like normal
      settingsManager.limitSats = '';
    }
  }

  /**
   * Removes any extra lines and \r characters from the given string array.
   * @param content - The string array to be cleaned.
   */
  private static cleanAsciiCatalogFile_(content: string[]) {
    // Check for extra line at the end of the file
    if (content[content.length - 1] === '') {
      content.pop();
    }

    // Remove any \r characters
    for (let i = 0; i < content.length; i++) {
      content[i] = content[i].replace('\r', '');
    }
  }

  /**
   * Fix missing zeros in the SCC number
   *
   * TODO: This should be done by the catalog-manager itself
   */
  private static addSccNum_(resp: KeepTrackTLEFile[], i: number) {
    resp[i].sccNum = StringPad.pad0(resp[i].TLE1.substring(2, 7).trim(), 5);
    // Also update TLE1
    resp[i].TLE1 = <TleLine1>(resp[i].TLE1.substring(0, 2) + resp[i].sccNum + resp[i].TLE1.substring(7));
    // Also update TLE2
    resp[i].TLE2 = <TleLine2>(resp[i].TLE2.substring(0, 2) + resp[i].sccNum + resp[i].TLE2.substring(7));
  }

  /**
   * Returns an object containing promises for extraSats, asciiCatalog, jsCatalog, and externalCatalog.
   * @param settingsManager - The settings manager object.
   * @returns An object containing promises for extraSats, asciiCatalog, jsCatalog, and externalCatalog.
   */
  private static getAdditionalCatalogs_(settingsManager: SettingsManager) {
    let extraSats: Promise<ExtraSat[]> = null;
    let externalCatalog: Promise<AsciiTleSat[] | void> = null;
    let asciiCatalog: Promise<AsciiTleSat[]> = null;
    let jsCatalog: Promise<JsSat[]> = null;

    if (settingsManager.offline && !settingsManager.isDisableExtraCatalog) {
      extraSats = CatalogLoader.getExtraCatalog_(settingsManager);
    }
    if (!settingsManager.externalTLEs && !settingsManager.isDisableAsciiCatalog) {
      asciiCatalog = CatalogLoader.getAsciiCatalog_(settingsManager);
    }
    if (settingsManager.isEnableJscCatalog) {
      // jsCatalog = CatalogLoader.getJscCatalog_(settingsManager);
      jsCatalog = null;
    }
    if (settingsManager.externalTLEs) {
      externalCatalog = CatalogLoader.getExternalCatalog_(settingsManager);
    }

    return { extraSats, asciiCatalog, jsCatalog, externalCatalog };
  }

  /**
   * Retrieves the ASCII catalog from the TLE.txt file in the install directory.
   * @param settingsManager - The settings manager instance.
   * @returns An array of AsciiTleSat objects representing the catalog.
   */
  private static async getAsciiCatalog_(settingsManager: SettingsManager) {
    const asciiCatalog: AsciiTleSat[] = [];
    const resp = await fetch(`${settingsManager.installDirectory}tle/TLE.txt`);

    if (resp.ok) {
      const asciiCatalogFile = await resp.text();
      const content = asciiCatalogFile.split('\n');

      for (let i = 0; i < content.length; i += 2) {
        asciiCatalog.push({
          SCC: StringPad.pad0(content[i].substring(2, 7).trim(), 5),
          TLE1: <TleLine1>content[i],
          TLE2: <TleLine2>content[i + 1],
        });
      }

      // Sort asciiCatalog by SCC
      CatalogLoader.sortByScc_(asciiCatalog);
    }

    return asciiCatalog;
  }

  /**
   * Asynchronously retrieves an external catalog of satellite TLEs from a URL specified in the settingsManager.
   * @param {SettingsManager} settingsManager - The settings manager containing the URL for the external TLEs.
   * @returns {Promise<AsciiTleSat[]>} - A promise that resolves to an array of AsciiTleSat objects representing the satellite TLEs.
   */
  // eslint-disable-next-line require-await
  private static async getExternalCatalog_(settingsManager: SettingsManager): Promise<AsciiTleSat[] | void> {
    return fetch(settingsManager.externalTLEs)
      .then((resp) => {
        if (resp.ok) {
          const externalCatalog: AsciiTleSat[] = [];

          return resp.text().then((data) => {
            const content = data.split('\n');
            // Check if last line is empty and remove it if so

            CatalogLoader.cleanAsciiCatalogFile_(content);

            if (content[0].startsWith('1 ')) {
              CatalogLoader.parseAsciiTLE_(content, externalCatalog);
            } else if (content[1].startsWith('1 ')) {
              CatalogLoader.parseAscii3LE_(content, externalCatalog);
            } else {
              errorManagerInstance.warn('External TLEs are not in the correct format');
            }

            CatalogLoader.sortByScc_(externalCatalog);

            return externalCatalog;
          });
        }
        errorManagerInstance.warn(`Error loading external TLEs from ${settingsManager.externalTLEs}`);
        errorManagerInstance.info('Reverting to internal TLEs');
        settingsManager.externalTLEs = '';

        return [];
      })
      .catch(() => {
        errorManagerInstance.warn(`Error loading external TLEs from ${settingsManager.externalTLEs}`);
        errorManagerInstance.info('Reverting to internal TLEs');
        settingsManager.externalTLEs = '';
      });
  }

  /**
   * Retrieves the extra catalog from the specified install directory.
   * @param settingsManager - The settings manager instance.
   * @returns A promise that resolves to an array of ExtraSat objects.
   */
  private static async getExtraCatalog_(settingsManager: SettingsManager): Promise<ExtraSat[]> {
    return (await fetch(`${settingsManager.installDirectory}tle/extra.json`)).json().catch(() => {
      errorManagerInstance.warn('Error loading extra.json');
    });
  }

  /**
   * Retrieves the JsSat catalog from the specified settings manager.
   * @param settingsManager - The settings manager to retrieve the catalog from.
   * @returns A promise that resolves to an array of JsSat objects.
   */
  // eslint-disable-next-line require-await
  // private static async getJscCatalog_(settingsManager: SettingsManager): Promise<JsSat[]> {
  //   return fetch(settingsManager.dataSources.vimpel)
  //     .then((response) => {
  //       if (response.ok) {
  //         return response.json();
  //       }
  //       errorManagerInstance.warn('Error loading vimpel.json');

  //       return [];

  //     })
  //     .catch(() => {
  //       errorManagerInstance.warn('Error loading vimpel.json');
  //     });
  // }

  /**
   * Consolidate the satData into a string to send to satCruncher
   *
   * There is a lot of extra data that we don't need to send to satCruncher.
   */
  private static getSatDataString_(objData: BaseObject[]) {
    return JSON.stringify(
      objData.map((obj) => {
        let data: CruncherSat;

        // Order matters here
        if (obj.isSatellite()) {
          data = {
            tle1: (obj as DetailedSatellite).tle1,
            tle2: (obj as DetailedSatellite).tle2,
            active: obj.active,
          };
        } else if (obj.isMissile()) {
          data = {
            latList: (obj as MissileObject).latList as Degrees[],
            lonList: (obj as MissileObject).lonList as Degrees[],
            altList: (obj as MissileObject).altList as Kilometers[],
          };
        } else if (obj.isStar()) {
          data.ra = (obj as Star).ra;
          data.dec = (obj as Star).dec;
        } else if (obj.isMarker()) {
          data = {
            isMarker: true,
          };
        } else if ((obj as Sensor | LandObject).isStatic()) {
          data = {
            lat: (obj as Sensor | LandObject).lat,
            lon: (obj as Sensor | LandObject).lon,
            alt: (obj as Sensor | LandObject).alt,
          };
        } else {
          throw new Error('Unknown object type');
        }

        return data;
      }),
    );
  }

  private static makeDebris(notionalDebris: any, meanAnom: number, notionalSatNum: number, tempSatData: BaseObject[]) {
    const debris = { ...notionalDebris };

    debris.id = tempSatData.length;
    debris.sccNum = notionalSatNum.toString();

    if (notionalSatNum < 1300000) {
      /*
       * ESA estimates 1300000 objects larger than 1cm
       * Random number between 0.01 and 0.1
       */
      debris.rcs = 0.01 + Math.random() * 0.09;
    } else {
      // Random number between 0.001 and 0.01
      debris.name = `${notionalDebris.name} (1mm Notional)`; // 1mm
      debris.rcs = 0.001 + Math.random() * 0.009;
    }

    notionalSatNum++;

    meanAnom = parseFloat(debris.TLE2.substr(43, 51)) + meanAnom;
    if (meanAnom > 360) {
      meanAnom -= 360;
    }
    if (meanAnom < 0) {
      meanAnom += 360;
    }

    debris.TLE2 =
      debris.TLE2.substr(0, 17) + // Columns 1-18
      StringPad.pad0((Math.random() * 360).toFixed(4), 8) + // New RAAN
      debris.TLE2.substr(25, 18) + // Columns 25-44
      StringPad.pad0(meanAnom.toFixed(4), 8) + // New Mean Anomaly
      debris.TLE2.substr(51); // Columns 51-69
    tempSatData.push(debris);
  }

  private static parseAscii3LE_(content: string[], externalCatalog: AsciiTleSat[]) {
    for (let i = 0; i < content.length; i += 3) {
      externalCatalog.push({
        SCC: StringPad.pad0(content[i + 1].substring(2, 7).trim(), 5),
        ON: content[i].trim(),
        TLE1: <TleLine1>content[i + 1],
        TLE2: <TleLine2>content[i + 2],
      });
    }
  }

  private static parseAsciiTLE_(content: string[], externalCatalog: AsciiTleSat[]) {
    for (let i = 0; i < content.length; i += 2) {
      externalCatalog.push({
        SCC: StringPad.pad0(content[i].substring(2, 7).trim(), 5),
        TLE1: <TleLine1>content[i],
        TLE2: <TleLine2>content[i + 1],
      });
    }
  }

  private static parseIntlDes_(TLE1: string) {
    let year = TLE1.substring(9, 17).trim().substring(0, 2); // clean up intl des for display

    if (year === '') {
      errorManagerInstance.debug(`intlDes is empty for ${TLE1}`);

      return 'None';
    }
    if (isNaN(parseInt(year))) {
      // eslint-disable-next-line no-debugger
      debugger;
    }
    const prefix = parseInt(year) > 50 ? '19' : '20';

    year = prefix + year;
    const rest = TLE1.substring(9, 17).trim().substring(2);


    return `${year}-${rest}`;
  }

  private static processAllSats_(resp: KeepTrackTLEFile[], i: number, catalogManagerInstance: CatalogManager, tempObjData: BaseObject[], notionalSatNum: number): void {
    if (settingsManager.isStarlinkOnly && resp[i].name.indexOf('STARLINK') === -1) {
      return;
    }

    const intlDes = CatalogLoader.parseIntlDes_(resp[i].TLE1);

    resp[i].intlDes = intlDes;
    catalogManagerInstance.sccIndex[`${resp[i].sccNum}`] = i;
    catalogManagerInstance.cosparIndex[`${resp[i].intlDes}`] = i;
    resp[i].active = true;
    if (!settingsManager.isDebrisOnly || (settingsManager.isDebrisOnly && (resp[i].type === 2 || resp[i].type === 3))) {
      resp[i].id = tempObjData.length;
      const source = Tle.classification(resp[i].TLE1);

      switch (source) {
        case 'U':
          resp[i].source = CatalogSource.USSF;
          break;
        case 'C':
          resp[i].source = CatalogSource.CELESTRAK;
          break;
        case 'M':
          resp[i].source = CatalogSource.UNIV_OF_MICH;
          break;
        // case 'V':
        //   resp[i].source = CatalogSource.VIMPEL;
        //   break;
        default:
          // Default to USSF for now
          resp[i].source = CatalogSource.USSF;
      }

      let rcs: number;

      rcs = resp[i].rcs === 'LARGE' ? 5 : rcs;
      rcs = resp[i].rcs === 'MEDIUM' ? 0.5 : rcs;
      rcs = resp[i].rcs === 'SMALL' ? 0.05 : rcs;
      rcs = resp[i].rcs && !isNaN(parseFloat(resp[i].rcs)) ? parseFloat(resp[i].rcs) : rcs ?? null;

      // Never fail just because of one bad satellite
      try {
        const satellite = new DetailedSatellite({
          id: tempObjData.length,
          tle1: resp[i].TLE1,
          tle2: resp[i].TLE2,
          ...resp[i],
          rcs,
        });

        tempObjData.push(satellite);
      } catch (e) {
        errorManagerInstance.log(e);
      }
    }

    if (settingsManager.isNotionalDebris && resp[i].type === 3) {
      const notionalDebris = new DetailedSatellite({
        id: 0,
        name: `${resp[i].name} (1cm Notional)`,
        tle1: resp[i].TLE1,
        tle2: resp[i].TLE2,
        sccNum: '',
        type: SpaceObjectType.NOTIONAL,
        source: 'Notional',
        active: true,
      });

      for (let i = 0; i < 8; i++) {
        if (tempObjData.length > settingsManager.maxNotionalDebris) {
          break;
        }
        CatalogLoader.makeDebris(notionalDebris, 15 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -15 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 30 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -30 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 45 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -45 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 60 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -60 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 75 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -75 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 90 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -90 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 105 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -105 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 120 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -120 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 135 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -135 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 150 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -150 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 165 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -165 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 180 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -180 - Math.random() * 15, notionalSatNum, tempObjData);
      }
    }
  }

  private static processAsciiCatalogKnown_(catalogManagerInstance: CatalogManager, element: AsciiTleSat, tempSatData: any[]) {
    const i = catalogManagerInstance.sccIndex[`${element.SCC}`];

    tempSatData[i].tle1 = element.TLE1;
    tempSatData[i].tle2 = element.TLE2;
    tempSatData[i].name = element.ON || tempSatData[i].name || 'Unknown';
    tempSatData[i].isExternal = true;
    tempSatData[i].source = settingsManager.externalTLEs ? settingsManager.externalTLEs.split('/')[2] : CatalogSource.TLE_TXT;

    tempSatData[i].altId = 'EXTERNAL_SAT'; // TODO: This is a hack to make sure the satellite is not removed by the filter
  }

  private static processAsciiCatalogUnknown_(element: AsciiTleSat, tempObjData: BaseObject[], catalogManagerInstance: CatalogManager) {
    settingsManager.isExtraSatellitesAdded = true;

    if (typeof element.ON === 'undefined') {
      element.ON = 'Unknown';
    }
    if (typeof element.OT === 'undefined') {
      element.OT = SpaceObjectType.SPECIAL;
    }
    const intlDes = this.parseIntlDes_(element.TLE1);
    const sccNum = Tle.convertA5to6Digit(element.SCC.toString());
    const asciiSatInfo = {
      static: false,
      missile: false,
      active: true,
      name: element.ON,
      type: element.OT,
      country: 'Unknown',
      rocket: 'Unknown',
      site: 'Unknown',
      sccNum,
      tle1: element.TLE1,
      tle2: element.TLE2,
      source: settingsManager.externalTLEs ? settingsManager.externalTLEs.split('/')[2] : CatalogSource.TLE_TXT,
      intlDes,
      typ: 'sat', // TODO: What is this?
      id: tempObjData.length,
      isExternal: true,
    };

    catalogManagerInstance.sccIndex[`${sccNum.toString()}`] = tempObjData.length;
    catalogManagerInstance.cosparIndex[`${intlDes}`] = tempObjData.length;

    const satellite = new DetailedSatellite({
      tle1: asciiSatInfo.tle1,
      tle2: asciiSatInfo.tle2,
      ...asciiSatInfo,
    });

    satellite.id = tempObjData.length;
    satellite.altId = 'EXTERNAL_SAT'; // TODO: This is a hack to make sure the satellite is not removed by the filter

    tempObjData.push(satellite);
  }

  private static processAsciiCatalog_(asciiCatalog: AsciiTleSat[], catalogManagerInstance: CatalogManager, tempSatData: any[]) {
    if (settingsManager.externalTLEs) {
      errorManagerInstance.info(`Processing ${settingsManager.externalTLEs}`);
    } else {
      errorManagerInstance.log('Processing ASCII Catalog');
    }

    // If asciiCatalog catalogue
    for (const element of asciiCatalog) {
      if (!element.TLE1 || !element.TLE2) {
        continue;
      } // Don't Process Bad Satellite Information

      // See if we know anything about it already
      if (typeof catalogManagerInstance.sccIndex[`${element.SCC}`] !== 'undefined') {
        CatalogLoader.processAsciiCatalogKnown_(catalogManagerInstance, element, tempSatData);
      } else {
        CatalogLoader.processAsciiCatalogUnknown_(element, tempSatData, catalogManagerInstance);
      }
    }

    if (settingsManager.externalTLEs) {
      if (settingsManager.externalTLEsOnly) {
        tempSatData = tempSatData.filter((sat) => {
          if (sat.altId === 'EXTERNAL_SAT') {
            console.log(sat);

            return true;
          }

          return false;
        });
      }
      catalogManagerInstance.sccIndex = <{ [key: string]: number }>{};
      catalogManagerInstance.cosparIndex = <{ [key: string]: number }>{};

      for (let idx = 0; idx < tempSatData.length; idx++) {
        tempSatData[idx].id = idx;
        catalogManagerInstance.sccIndex[`${tempSatData[idx].sccNum}`] = idx;
        catalogManagerInstance.cosparIndex[`${tempSatData[idx].intlDes}`] = idx;
      }
    }

    return tempSatData;
  }

  private static processExtraSats_(extraSats: ExtraSat[], catalogManagerInstance: CatalogManager, tempSatData: any[]) {
    // If extra catalogue
    for (const element of extraSats) {
      if (!element.SCC || !element.TLE1 || !element.TLE2) {
        continue;
      } // Don't Process Bad Satellite Information
      if (typeof catalogManagerInstance.sccIndex[`${element.SCC}`] !== 'undefined') {
        const i = catalogManagerInstance.sccIndex[`${element.SCC}`];

        if (typeof tempSatData[i] === 'undefined') {
          continue;
        }
        tempSatData[i].TLE1 = element.TLE1;
        tempSatData[i].TLE2 = element.TLE2;
        tempSatData[i].source = CatalogSource.EXTRA_JSON;
      } else {
        settingsManager.isExtraSatellitesAdded = true;

        const intlDes = CatalogLoader.parseIntlDes_(element.TLE1);
        const extrasSatInfo = {
          static: false,
          missile: false,
          active: true,
          name: element.ON || 'Unknown',
          type: element.OT || SpaceObjectType.SPECIAL,
          country: 'Unknown',
          rocket: 'Unknown',
          site: 'Unknown',
          sccNum: element.SCC.toString(),
          tle1: element.TLE1 as TleLine1,
          tle2: element.TLE2 as TleLine2,
          source: 'extra.json',
          intlDes,
          typ: 'sat', // TODO: What is this?
          id: tempSatData.length,
          vmag: element.vmag,
        };

        catalogManagerInstance.sccIndex[`${element.SCC.toString()}`] = tempSatData.length;
        catalogManagerInstance.cosparIndex[`${intlDes}`] = tempSatData.length;

        const satellite = new DetailedSatellite({
          tle1: extrasSatInfo.tle1,
          tle2: extrasSatInfo.tle2,
          ...extrasSatInfo,
        });

        satellite.id = tempSatData.length;

        tempSatData.push(satellite);
      }
    }
  }

  private static processJsCatalog_(jsCatalog: JsSat[], catalogManagerInstance: CatalogManager, tempObjData: any[]) {
    errorManagerInstance.debug(`Processing ${settingsManager.isEnableJscCatalog ? 'JSC Vimpel' : 'Extended'} Catalog`);
    // If jsCatalog catalogue
    for (const element of jsCatalog) {
      if (!element.TLE1 || !element.TLE2) {
        continue;
      } // Don't Process Bad Satellite Information
      const scc = Tle.convertA5to6Digit(element.TLE1.substring(2, 7).trim());

      if (typeof catalogManagerInstance.sccIndex[`${scc}`] !== 'undefined') {
        /*
         * console.warn('Duplicate Satellite Found in jsCatalog');
         * NOTE: We don't trust the jsCatalog, so we don't update the TLEs
         * i = catalogManagerInstance.sccIndex[`${jsCatalog[s].SCC}`];
         * tempSatData[i].TLE1 = jsCatalog[s].TLE1;
         * tempSatData[i].TLE2 = jsCatalog[s].TLE2;
         */
      } else {
        // Check if the 8th character is 'V' for Vimpel
        const isVimpel = element.TLE1[7] === 'V';

        if (isVimpel) {
          const altId = element.TLE1.substring(9, 17).trim();

          settingsManager.isExtraSatellitesAdded = true;
          const jsSatInfo = {
            static: false,
            missile: false,
            active: true,
            name: `JSC Vimpel ${altId}`,
            type: SpaceObjectType.DEBRIS,
            country: 'Unknown',
            rocket: 'Unknown',
            site: 'Unknown',
            sccNum: '',
            TLE1: element.TLE1,
            TLE2: element.TLE2,
            source: 'JSC Vimpel',
            altId,
            intlDes: '',
            id: tempObjData.length,
          };

          const satellite = new DetailedSatellite({
            tle1: jsSatInfo.TLE1 as TleLine1,
            tle2: jsSatInfo.TLE2 as TleLine2,
            ...jsSatInfo,
          });

          satellite.id = tempObjData.length;

          tempObjData.push(satellite);
        } else {
          errorManagerInstance.debug('Skipping non-Vimpel satellite in JSC Vimpel catalog');
        }
      }
    }
  }

  private static processLimitedSats_(limitSatsArray: string[], resp: KeepTrackTLEFile[], i: number, catalogManagerInstance: CatalogManager, tempObjData: any[]) {
    for (const limitSat of limitSatsArray) {
      if (resp[i].sccNum === limitSat) {
        const intlDes = CatalogLoader.parseIntlDes_(resp[i].TLE1);

        resp[i].intlDes = intlDes;
        catalogManagerInstance.sccIndex[`${resp[i].sccNum}`] = resp[i].id;
        catalogManagerInstance.cosparIndex[`${resp[i].intlDes}`] = resp[i].id;
        resp[i].active = true;
        const source = Tle.classification(resp[i].TLE1);

        switch (source) {
          case 'U':
            resp[i].source = CatalogSource.USSF;
            break;
          case 'C':
            resp[i].source = CatalogSource.CELESTRAK;
            break;
          case 'M':
            resp[i].source = CatalogSource.UNIV_OF_MICH;
            break;
          case 'N':
            resp[i].source = CatalogSource.NUSPACE;
            break;
          case 'P':
            resp[i].source = CatalogSource.CALPOLY;
            break;
          case 'V':
            resp[i].source = CatalogSource.VIMPEL;
            break;
          default:
            // Default to USSF for now
            resp[i].source = CatalogSource.USSF;
        }

        let rcs: number | null;

        rcs = resp[i].rcs === 'LARGE' ? 5 : rcs;
        rcs = resp[i].rcs === 'MEDIUM' ? 0.5 : rcs;
        rcs = resp[i].rcs === 'SMALL' ? 0.05 : rcs;
        rcs = resp[i].rcs && !isNaN(parseFloat(resp[i].rcs)) ? parseFloat(resp[i].rcs) : rcs ?? null;

        const satellite = new DetailedSatellite({
          id: tempObjData.length,
          tle1: resp[i].TLE1,
          tle2: resp[i].TLE2,
          ...resp[i],
          rcs,
        });

        tempObjData.push(satellite);
      }
    }
  }

  private static sortByScc_(catalog: AsciiTleSat[] | ExtraSat[]) {
    catalog.sort((a: { SCC: string }, b: { SCC: string }) => {
      if (a.SCC < b.SCC) {
        return -1;
      }
      if (a.SCC > b.SCC) {
        return 1;
      }

      return 0;
    });
  }

  private static async fetchTleData(): Promise<any> {
    try {
      const response = await fetch(settingsManager.dataSources.tle);
      if (!response.ok) {
        throw new Error(`Error fetching TLE data: ${response.statusText}`);
      }

      const tledata = await response.json();
      return tledata; // Return the TLE data instead of void
    } catch (error) {
      console.error('Failed to fetch and update TLE data:', error);
      return null; // Return null on error
    }
  }

  private static async loadTleData(): Promise<any> {
    try {
      // Retrieve cached data
      let strCachedData = PersistenceManager.getInstance().getItem(StorageKey.SETTINGS_CACHED_TLE);
      let data = strCachedData ? JSON.parse(strCachedData) : {}; // Parse only if strCachedData exists

      // Check if cached data is empty
      if (Object.keys(data).length === 0) {
        console.log('WARNING: No cached TLE data found, fetching for the first time.');
        const jsondata = await this.fetchTleData(); // Get the data for the first time

        if (jsondata) {
          // Filter limitSats data to reduce the number of elements to be stored
          const jsonDataFiltered = this.filterLimitSats(jsondata);

          const strdata = JSON.stringify(jsonDataFiltered);
          PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_CACHED_TLE, strdata);
          PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_CACHED_TLE_TIMESTAMP, Date.now().toString());
          data = jsondata; // Store the new data
        }
        return data; // Return the newly obtained data

      } else {
        const duration = 24 * 60 * 60 * 1000; // 24 hours

        let ts = PersistenceManager.getInstance().getItem(StorageKey.SETTINGS_CACHED_TLE_TIMESTAMP);
        let timestamp = ts ? parseInt(ts) : 0; // Default to 0 if no timestamp exists
        const now = Date.now();

        // Check if an update is needed
        if (now - timestamp > duration) {
          const jsondata = await this.fetchTleData(); // Update the data

          // Save the new data to the cache if it's not null
          if (jsondata) {

            // Filter limitSats data to reduce the number of elements to be stored
            const jsonDataFiltered = this.filterLimitSats(jsondata);

            const strdata = JSON.stringify(jsonDataFiltered);
            PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_CACHED_TLE, strdata);
            PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_CACHED_TLE_TIMESTAMP, Date.now().toString());
            data = jsonDataFiltered; // Store the updated data
          }
        }
        return data; // Return the cached data
      }
    } catch (error) {
      console.error('Error loading TLE data:', error);
      return null; // Return null in case of an error
    }
  }

  // Filter limitSats data to reduce the number of elements to be stored
  private static filterLimitSats(jsondata: any): string[] {
    const settingsManager: SettingsManager = window.settingsManager;
    if (settingsManager.limitSats === '') {
      return jsondata;
    } else {
      let limitSatsArray = settingsManager.limitSats.split(',');
      let outputJsonData = [];

      for (let i = 0; i < jsondata.length; i++) {
        for (let j = 0; j < limitSatsArray.length; j++) {
          // check if the noradid number is in TLE1 or TLE2
          const noradid = ' ' + limitSatsArray[j] + ' ';
          if (jsondata[i].TLE1.includes(noradid) || jsondata[i].TLE2.includes(noradid)) {
            outputJsonData.push(jsondata[i]);
          }
        }
      }
      return outputJsonData;
    }
  }
}
