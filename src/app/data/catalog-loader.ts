/* eslint-disable max-lines */
import { rgbaArray, SolarBody } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { CelestialBody } from '@app/engine/rendering/draw-manager/celestial-bodies/celestial-body';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { StringPad } from '@app/engine/utils/stringPad';
import { CruncerMessageTypes, CruncherSat } from '@app/webworker/positionCruncher';
import {
  BaseObject,
  CatalogSource,
  DetailedSatellite,
  DetailedSensor,
  LandObject,
  Marker,
  PayloadStatus,
  Sensor,
  SpaceObjectType,
  Star,
  Tle,
  TleLine1,
  TleLine2,
} from '@ootk/src/main';
import { SettingsManager } from '../../settings/settings';
import { Planet } from '../objects/planet';
import { CatalogManager } from './catalog-manager';
import { LaunchSite } from './catalog-manager/LaunchFacility';
import { MissileObject } from './catalog-manager/MissileObject';

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
  tle1: TleLine1;
  /** Second TLE line */
  tle2: TleLine2;
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
  status?: PayloadStatus;
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
  static filterTLEDatabase(resp: KeepTrackTLEFile[], extraSats: ExtraSat[] | null, asciiCatalog: AsciiTleSat[] | null, jsCatalog: JsSat[] | null): void {
    let tempObjData: DetailedSatellite[] = [];
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    catalogManagerInstance.sccIndex = <{ [key: string]: number }>{};
    catalogManagerInstance.cosparIndex = <{ [key: string]: number }>{};

    const notionalSatNum = 400000; // Start at 400,000 to avoid conflicts with real satellites

    for (let i = 0; i < resp.length; i++) {
      CatalogLoader.addSccNum_(resp, i);

      // Check if first digit is a letter
      resp[i].sccNum = Tle.convertA5to6Digit(resp[i]?.sccNum ?? '');

      CatalogLoader.processAllSats_(resp, i, catalogManagerInstance, tempObjData, notionalSatNum);
    }

    if ((extraSats?.length ?? 0) > 0) {
      CatalogLoader.processExtraSats_(extraSats as ExtraSat[], catalogManagerInstance, tempObjData);
    }

    if (asciiCatalog && asciiCatalog?.length > 0) {
      tempObjData = CatalogLoader.processAsciiCatalog_(asciiCatalog, catalogManagerInstance, tempObjData);
    }

    if ((jsCatalog?.length ?? 0) > 0) {
      CatalogLoader.processJsCatalog_(jsCatalog as JsSat[], catalogManagerInstance, tempObjData);
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
      // TODO: Which sources can use this should be definied in the settings (Celestrak Rebase)
      if (
        (/^https?:\/\/(?:api\.keeptrack\.space|localhost:8787)\/v[23]\/sats(?:\/celestrak)?$/u).test(settingsManager.dataSources.tle)
      ) {
        // If using v3 switch to v2
        if (settingsManager.dataSources.tle.includes('v2') || settingsManager.limitSats.length > 0) {
          settingsManager.dataSources.tle = settingsManager.dataSources.tle.replace(/\/v3\//u, '/v2/');
        }

        settingsManager.dataSources.tle = `${settingsManager.dataSources.tle}/${settingsManager.limitSats}`;
        settingsManager.dataSources.tle = settingsManager.dataSources.tle.replace(/\/$/u, '');
      }

      const {
        extraSats,
        asciiCatalog,
        jsCatalog,
        externalCatalog,
      } =
        CatalogLoader.getAdditionalCatalogs_(settingsManager);

      if (settingsManager.dataSources.externalTLEsOnly) {
        if (settingsManager.dataSources.isSupplementExternal) {
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
        } else {
          // Load the external TLEs only
          await CatalogLoader.parse({
            externalCatalog,
          });
        }
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
      } else if (settingsManager.offlineMode) {
        await fetch(`${settingsManager.installDirectory}tle/tle.json`)
          .then((response) => response.json())
          .then((data) => CatalogLoader.parse({
            keepTrackTle: data,
            keepTrackExtra: extraSats,
            keepTrackAscii: asciiCatalog,
            externalCatalog,
            vimpelCatalog: jsCatalog,
          }));
      } else {
        // Load the primary catalog
        await fetch(settingsManager.dataSources.tle)
          .then((response) => response.json())
          .then((data) => CatalogLoader.parse({
            keepTrackTle: data,
            keepTrackExtra: extraSats,
            keepTrackAscii: asciiCatalog,
            externalCatalog,
            vimpelCatalog: jsCatalog,
          }))
          .catch(async (error) => {
            if (error.message === 'Failed to fetch') {
              errorManagerInstance.warn('Failed to download latest catalog! Using offline catalog which may be out of date!');
              await fetch(`${settingsManager.installDirectory}tle/tle.json`)
                .then((response) => response.json())
                .then((data) => CatalogLoader.parse({
                  keepTrackTle: data,
                  keepTrackExtra: extraSats,
                  keepTrackAscii: asciiCatalog,
                  externalCatalog,
                  vimpelCatalog: jsCatalog,
                }));
            } else {
              errorManagerInstance.error(error, 'tleManagerInstance.loadCatalog');
            }
          });
      }
    } catch {
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
    keepTrackExtra?: Promise<ExtraSat[]> | null;
    keepTrackAscii?: Promise<AsciiTleSat[]> | null;
    externalCatalog?: Promise<AsciiTleSat[] | null> | null;
    vimpelCatalog?: Promise<JsSat[]> | null;
  }): Promise<void> {
    await Promise.all([extraSats, asciiCatalog, externalCatalog, jsCatalog]).then(([extraSats, asciiCatalog, externalCatalog, jsCatalog]) => {
      asciiCatalog = externalCatalog || asciiCatalog;

      // Make sure everyone agrees on what time it is
      ServiceLocator.getTimeManager().init();
      ServiceLocator.getTimeManager().synchronize();

      /*
       * Filter TLEs
       * Sets catalogManagerInstance.satData internally to reduce memory usage
       */
      CatalogLoader.filterTLEDatabase(resp, extraSats, asciiCatalog, jsCatalog);

      const catalogManagerInstance = ServiceLocator.getCatalogManager();

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
   * Adds non-satellite objects to the catalog manager instance.
   * @param catalogManagerInstance - The catalog manager instance to add the objects to.
   * @param tempObjData - An array of temporary satellite data.
   */
  private static addNonSatelliteObjects_(catalogManagerInstance: CatalogManager, tempObjData: BaseObject[]) {
    catalogManagerInstance.orbitalSats = tempObjData.length + settingsManager.maxAnalystSats;
    const dotsManagerInstance = ServiceLocator.getDotsManager();

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
      } else if (staticSat instanceof LaunchSite) {
        tempObjData.push(staticSat);
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

    for (let i = 0; i < settingsManager.maxOemSatellites; i++) {
      tempObjData.push(new BaseObject({
        id: tempObjData.length,
        name: `OEM Satellite ${i + 1}`,
      }));
    }

    dotsManagerInstance.planetDot1 = tempObjData.length;

    const planetList = ServiceLocator.getScene().planets;
    const dwarfPlanetList = ServiceLocator.getScene().dwarfPlanets;

    if (planetList) {
      Object.keys(planetList).forEach((planet) => {
        const planetDot = new Planet({
          id: tempObjData.length,
          name: planet,
          type: planetList[planet]?.type ?? SpaceObjectType.UNKNOWN,
        });

        planetDot.color = planetList[planet]?.color ?? [1.0, 1.0, 1.0, 1.0] as rgbaArray;
        if (planetList[planet]) {
          (planetList[planet] as CelestialBody).planetObject = planetDot;
        }

        tempObjData.push(planetDot);
      });

      // Add the Moon if Earth is present
      const earthDot = new Planet({
        id: tempObjData.length,
        name: SolarBody.Earth,
        type: SpaceObjectType.TERRESTRIAL_PLANET,
      });

      earthDot.color = (planetList[SolarBody.Earth]?.color ?? [0.0, 0.5, 1.0, 1.0]) as rgbaArray;
      ServiceLocator.getScene().earth.planetObject = earthDot;
      tempObjData.push(earthDot);

      // const moonDot = new Planet({
      //   id: tempObjData.length,
      //   name: SolarBody.Moon,
      // });

      // moonDot.color = (planetList[SolarBody.Moon]?.color ?? [1.0, 1.0, 1.0, 1.0]);
      // ServiceLocator.getScene().planets.Moon.planetObject = moonDot;

      // tempObjData.push(moonDot);
    }

    if (dwarfPlanetList) {
      Object.keys(dwarfPlanetList).forEach((dwarfPlanet) => {
        const dwarfPlanetDot = new Planet({
          id: tempObjData.length,
          name: dwarfPlanet,
          type: dwarfPlanetList[dwarfPlanet]?.type ?? SpaceObjectType.UNKNOWN,
        });

        dwarfPlanetDot.color = dwarfPlanetList[dwarfPlanet]?.color ?? [1.0, 1.0, 1.0, 1.0] as rgbaArray;
        if (dwarfPlanetList[dwarfPlanet]) {
          (dwarfPlanetList[dwarfPlanet] as CelestialBody).planetObject = dwarfPlanetDot;
        }

        tempObjData.push(dwarfPlanetDot);
      });
    }

    dotsManagerInstance.planetDot2 = tempObjData.length;

    for (const missileObj of catalogManagerInstance.missileSet) {
      tempObjData.push(missileObj);
    }

    catalogManagerInstance.missileSats = tempObjData.length; // This is the end of the missiles index

    // FOV Markers must go last!!!

    for (const fieldOfViewMarker of catalogManagerInstance.fieldOfViewSet) {
      fieldOfViewMarker.id = tempObjData.length;
      const marker = new Marker(fieldOfViewMarker);

      tempObjData.push(marker);
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
    resp[i].sccNum = StringPad.pad0(resp[i].tle1.substring(2, 7).trim(), 5);
    // Also update TLE1
    resp[i].tle1 = <TleLine1>(resp[i].tle1.substring(0, 2) + resp[i].sccNum + resp[i].tle1.substring(7));
    // Also update TLE2
    resp[i].tle2 = <TleLine2>(resp[i].tle2.substring(0, 2) + resp[i].sccNum + resp[i].tle2.substring(7));
  }

  /**
   * Returns an object containing promises for extraSats, asciiCatalog, jsCatalog, and externalCatalog.
   * @param settingsManager - The settings manager object.
   * @returns An object containing promises for extraSats, asciiCatalog, jsCatalog, and externalCatalog.
   */
  private static getAdditionalCatalogs_(settingsManager: SettingsManager) {
    let extraSats: Promise<ExtraSat[]> | null = null;
    let externalCatalog: Promise<AsciiTleSat[] | null> | null = null;
    let asciiCatalog: Promise<AsciiTleSat[]> | null = null;
    let jsCatalog: Promise<JsSat[]> | null = null;

    if (settingsManager.offlineMode && !settingsManager.isDisableExtraCatalog) {
      extraSats = CatalogLoader.getExtraCatalog_(settingsManager);
    }
    if (!settingsManager.dataSources.externalTLEs && !settingsManager.isDisableAsciiCatalog) {
      asciiCatalog = CatalogLoader.getAsciiCatalog_(settingsManager);
    }
    if (settingsManager.isEnableJscCatalog) {
      jsCatalog = CatalogLoader.getJscCatalog_(settingsManager);
    }
    if (settingsManager.dataSources.externalTLEs) {
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
  private static async getExternalCatalog_(settingsManager: SettingsManager): Promise<AsciiTleSat[] | null> {
    return fetch(settingsManager.dataSources.externalTLEs)
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
        errorManagerInstance.warn(`Error loading external TLEs from ${settingsManager.dataSources.externalTLEs}`);
        errorManagerInstance.info('Reverting to internal TLEs');
        settingsManager.dataSources.externalTLEs = '';

        return [];
      })
      .catch(() => {
        errorManagerInstance.warn(`Error loading external TLEs from ${settingsManager.dataSources.externalTLEs}`);
        errorManagerInstance.info('Reverting to internal TLEs');
        settingsManager.dataSources.externalTLEs = '';

        return null;
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
   * Retrieves the JSC catalog by fetching the `vimpel.json` file from the specified data source.
   * If the primary source fails, it attempts to load a fallback `vimpel.json` file from the offline directory.
   * Logs warnings if both the primary and/or fallback sources fail.
   *
   * @param settingsManager - An instance of `SettingsManager` containing configuration details,
   *                          including the data source URL and installation directory.
   * @returns A promise that resolves to an array of `JsSat` objects representing the catalog.
   *          If both the primary and fallback sources fail, an empty array is returned.
   * @throws An error if the fallback `vimpel.json` cannot be loaded.
   */
  private static async getJscCatalog_(settingsManager: SettingsManager): Promise<JsSat[]> {
    const vimpelJson = await fetch(settingsManager.dataSources.vimpel)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Error loading vimpel.json');
      })
      .catch(async () => {
        errorManagerInstance.warn('Failed to download latest vimpel.json ! Using offline vimpel.json which may be out of date!');

        const vimpelJson = await fetch(`${settingsManager.installDirectory}tle/vimpel.json`)
          .then((response) => {
            if (response.ok) {
              return response.json();
            }
            throw new Error('Error loading fallback vimpel.json');
          }).catch(() => {
            errorManagerInstance.warn('Error loading fallback vimpel.json');

            return [];
          }) as JsSat[];

        return vimpelJson;
      }) as JsSat[];

    return vimpelJson;
  }

  /**
   * Consolidate the satData into a string to send to satCruncher
   *
   * There is a lot of extra data that we don't need to send to satCruncher.
   */
  private static getSatDataString_(objData: BaseObject[]) {
    return JSON.stringify(
      objData.map((obj) => {
        let data: CruncherSat = {};

        // Order matters here
        if (obj.isSatellite()) {
          data = {
            tle1: (obj as DetailedSatellite).tle1,
            tle2: (obj as DetailedSatellite).tle2,
            active: obj.active,
          };
        } else if (obj.isMissile()) {
          data = {
            latList: (obj as MissileObject).latList,
            lonList: (obj as MissileObject).lonList,
            altList: (obj as MissileObject).altList,
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

  private static makeDebris(notionalDebris: DetailedSatellite, meanAnom: number, notionalSatNum: number, tempSatData: BaseObject[]) {
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

    meanAnom = parseFloat(debris.tle2.substr(43, 51)) + meanAnom;
    if (meanAnom > 360) {
      meanAnom -= 360;
    }
    if (meanAnom < 0) {
      meanAnom += 360;
    }

    debris.tle2 =
      debris.tle2.substr(0, 17) + // Columns 1-18
      StringPad.pad0((Math.random() * 360).toFixed(4), 8) + // New RAAN
      debris.tle2.substr(25, 18) + // Columns 25-44
      StringPad.pad0(meanAnom.toFixed(4), 8) + // New Mean Anomaly
      debris.tle2.substr(51) as TleLine2; // Columns 51-69

    const debrisObj = new DetailedSatellite(debris);

    tempSatData.push(debrisObj);
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

    const intlDes = CatalogLoader.parseIntlDes_(resp[i].tle1);

    resp[i].intlDes = intlDes;
    resp[i].active = true;
    if (!settingsManager.isDebrisOnly || (settingsManager.isDebrisOnly && (resp[i].type === SpaceObjectType.ROCKET_BODY || resp[i].type === SpaceObjectType.DEBRIS))) {
      resp[i].id = tempObjData.length;
      resp[i].source = CatalogSource.CELESTRAK;

      /*
       * Embed a confidence level into the 64th character of the TLE1
       * All 9s is the default value
       * TODO: Generate a better confidence level system
       */
      if (resp[i].source === CatalogSource.CELESTRAK) {
        resp[i].tle1 = `${resp[i].tle1.substring(0, 64)}9${resp[i].tle1.substring(65)}` as TleLine1;
      } else {
        resp[i].tle1 = `${resp[i].tle1.substring(0, 64)}5${resp[i].tle1.substring(65)}` as TleLine1;
      }

      let rcs: number | null = null;

      // TODO: Celestrak does not include these rough estimates, so we need to get them from somewhere else
      rcs = resp[i].rcs === 'LARGE' ? 5 : rcs;
      rcs = resp[i].rcs === 'MEDIUM' ? 0.5 : rcs;
      rcs = resp[i].rcs === 'SMALL' ? 0.05 : rcs;
      rcs = resp[i].rcs && !isNaN(parseFloat(resp[i].rcs)) ? parseFloat(resp[i].rcs) : rcs;

      // Never fail just because of one bad satellite
      let isAddedToCatalog = false;

      try {
        const satellite = new DetailedSatellite({
          ...resp[i],
          id: tempObjData.length,
          tle1: resp[i].tle1,
          tle2: resp[i].tle2,
          rcs,
        });

        tempObjData.push(satellite);
        isAddedToCatalog = true;
      } catch (e) {
        errorManagerInstance.log(e);
      }

      if (isAddedToCatalog) {
        catalogManagerInstance.sccIndex[`${resp[i].sccNum}`] = tempObjData.length - 1;
        catalogManagerInstance.cosparIndex[`${resp[i].intlDes}`] = tempObjData.length - 1;
      }
    }

    if (settingsManager.isNotionalDebris && resp[i].type === SpaceObjectType.DEBRIS) {
      const notionalDebris = new DetailedSatellite({
        id: 0,
        name: `${resp[i].name} (1cm Notional)`,
        tle1: resp[i].tle1,
        tle2: resp[i].tle2,
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

  private static processAsciiCatalogKnown_(catalogManagerInstance: CatalogManager, element: AsciiTleSat, tempSatData: DetailedSatellite[]) {
    const i = catalogManagerInstance.sccIndex[`${element.SCC}`];

    tempSatData[i].tle1 = element.TLE1;
    tempSatData[i].tle2 = element.TLE2;
    tempSatData[i].name = element.ON || tempSatData[i].name || 'Unknown';
    tempSatData[i].source = settingsManager.dataSources.externalTLEs ? settingsManager.dataSources.externalTLEs.split('/')[2] : CatalogSource.TLE_TXT;
    if (settingsManager.dataSources.externalTLEs === 'https://storage.keeptrack.space/data/celestrak.txt') {
      tempSatData[i].source = CatalogSource.CELESTRAK;
    }
    tempSatData[i].altId = 'EXTERNAL_SAT'; // TODO: This is a hack to make sure the satellite is not removed by the filter

    try {
      const satellite = new DetailedSatellite(tempSatData[i]);

      tempSatData[i] = satellite;
    } catch {
      errorManagerInstance.warn(`Failed to process satellite: ${element.ON} (${element.SCC})`);
    }
  }

  private static processAsciiCatalogUnknown_(element: AsciiTleSat, tempSatData: BaseObject[], catalogManagerInstance: CatalogManager) {
    if (typeof element.ON === 'undefined') {
      element.ON = 'Unknown';
    }
    if (typeof element.OT === 'undefined') {
      element.OT = SpaceObjectType.UNKNOWN;
    }
    const intlDes = this.parseIntlDes_(element.TLE1);
    const sccNum = Tle.convertA5to6Digit(element.SCC.toString());
    const asciiSatInfo = {
      static: false,
      missile: false,
      active: true,
      name: parseInt(sccNum) >= 90000 && parseInt(sccNum) <= 99999 ? `Analyst ${sccNum}` : element.ON,
      type: element.OT,
      country: 'Unknown',
      rocket: 'Unknown',
      site: 'Unknown',
      sccNum,
      tle1: element.TLE1,
      tle2: element.TLE2,
      source: settingsManager.dataSources.externalTLEs ? settingsManager.dataSources.externalTLEs.split('/')[2] : CatalogSource.TLE_TXT,
      intlDes,
      typ: 'sat', // TODO: What is this?
      id: tempSatData.length,
    };

    if (settingsManager.dataSources.externalTLEs === 'https://storage.keeptrack.space/data/celestrak.txt') {
      asciiSatInfo.source = CatalogSource.CELESTRAK;
    }

    catalogManagerInstance.sccIndex[`${sccNum.toString()}`] = tempSatData.length;
    catalogManagerInstance.cosparIndex[`${intlDes}`] = tempSatData.length;

    try {
      const satellite = new DetailedSatellite({
        ...asciiSatInfo,
        tle1: asciiSatInfo.tle1,
        tle2: asciiSatInfo.tle2,
      });

      satellite.id = tempSatData.length;
      satellite.altId = 'EXTERNAL_SAT'; // TODO: This is a hack to make sure the satellite is not removed by the filter

      tempSatData.push(satellite);
    } catch {
      errorManagerInstance.warn(`Failed to process satellite: ${element.ON} (${element.SCC})`);
    }
  }

  private static processAsciiCatalog_(asciiCatalog: AsciiTleSat[], catalogManagerInstance: CatalogManager, tempSatData: DetailedSatellite[]) {
    if (settingsManager.dataSources.externalTLEs) {
      if (settingsManager.dataSources.externalTLEs !== 'https://storage.keeptrack.space/data/celestrak.txt') {
        errorManagerInstance.log(`Processing ${settingsManager.dataSources.externalTLEs}`);
      }
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

    if (settingsManager.dataSources.externalTLEs) {
      if (settingsManager.dataSources.externalTLEsOnly) {
        tempSatData = tempSatData.filter((sat) => {
          if (sat.altId === 'EXTERNAL_SAT') {
            sat.altId = ''; // Reset the altId

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

  private static processExtraSats_(extraSats: ExtraSat[], catalogManagerInstance: CatalogManager, tempSatData: DetailedSatellite[]) {
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
        tempSatData[i].tle1 = element.TLE1 as TleLine1;
        tempSatData[i].tle2 = element.TLE2 as TleLine2;
        tempSatData[i].source = CatalogSource.EXTRA_JSON;
      } else {
        const intlDes = CatalogLoader.parseIntlDes_(element.TLE1);
        const extrasSatInfo = {
          static: false,
          missile: false,
          active: true,
          name: element.ON ?? 'Unknown',
          type: element.OT ?? SpaceObjectType.UNKNOWN,
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
          ...extrasSatInfo,
          tle1: extrasSatInfo.tle1,
          tle2: extrasSatInfo.tle2,
        });

        satellite.id = tempSatData.length;

        tempSatData.push(satellite);
      }
    }
  }

  private static processJsCatalog_(jsCatalog: JsSat[], catalogManagerInstance: CatalogManager, tempObjData: BaseObject[]) {
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
            source: CatalogSource.VIMPEL,
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
}
