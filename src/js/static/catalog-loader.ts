import { CatalogManager, RadarDataObject, SatObject, SensorObject } from '@app/js/interfaces';
import { getEl } from '@app/js/lib/get-el';
import { SpaceObjectType } from '@app/js/lib/space-object-type';
import { StringPad } from '@app/js/lib/stringPad';
import { errorManagerInstance } from '@app/js/singletons/errorManager';

import { TleLine1, TleLine2 } from 'ootk';
import { KeepTrackApiEvents, keepTrackApi } from '../keepTrackApi';
import { SettingsManager } from '../settings/settings';
import { FormatTle } from './format-tle';

interface JsSat {
  NoradId: string;
  SCC: string;
  TLE1: string;
  TLE2: string;
  altId: number;
  source: string;
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

export class CatalogLoader {
  static filterTLEDatabase(resp: SatObject[], limitSatsArray?: string[], extraSats?: ExtraSat[], asciiCatalog?: AsciiTleSat[] | void, jsCatalog?: JsSat[]): void {
    let tempSatData: (SatObject | SensorObject | RadarDataObject)[] = [];
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    catalogManagerInstance.sccIndex = <{ [key: string]: number }>{};
    catalogManagerInstance.cosparIndex = <{ [key: string]: number }>{};

    CatalogLoader.checkForLimitSats_(limitSatsArray);

    let notionalSatNum = 400000; // Start at 400,000 to avoid conflicts with real satellites
    for (let i = 0; i < resp.length; i++) {
      CatalogLoader.fixMissingZeros_(resp, i);

      // Check if first digit is a letter
      resp[i].sccNum = FormatTle.convertA5to6Digit(resp[i].sccNum);

      if (settingsManager.limitSats === '') {
        CatalogLoader.processAllSats_(resp, i, catalogManagerInstance, tempSatData, notionalSatNum);
      } else {
        CatalogLoader.processLimitedSats_(limitSatsArray, resp, i, catalogManagerInstance, tempSatData);
      }
    }

    if (extraSats?.length > 0) {
      CatalogLoader.processExtraSats_(extraSats, catalogManagerInstance, tempSatData);
    }

    if (asciiCatalog && asciiCatalog?.length > 0) {
      tempSatData = CatalogLoader.processAsciiCatalog_(asciiCatalog, catalogManagerInstance, tempSatData);
    }

    if (jsCatalog?.length > 0) {
      CatalogLoader.processJsCatalog_(jsCatalog, catalogManagerInstance, tempSatData);
    }

    if (settingsManager.isExtraSatellitesAdded) {
      keepTrackApi.register({
        event: KeepTrackApiEvents.uiManagerFinal,
        cbName: 'CatalogLoader',
        cb: () => {
          try {
            document.querySelector<HTMLElement>('.legend-pink-box').style.display = 'block';
            document.querySelectorAll('.legend-pink-box').forEach((element) => {
              element.parentElement.style.display = 'none';
              element.parentElement.innerHTML = `<div class="Square-Box legend-pink-box"></div>${settingsManager.nameOfSpecialSats}`;
            });
          } catch (e) {
            // Intentionally Blank
          }
        },
      });
    }

    CatalogLoader.addNonSatelliteObjects_(catalogManagerInstance, tempSatData);

    catalogManagerInstance.satData = tempSatData;
  }

  /**
   *  This function will load the catalog, additional catalogs, and merge them together.
   *
   *  Primary Catalogs
   *  1. TLE.json - this contains extended object information including launch location and RCS.
   *  2. TLEdebris.json - this contains all non-payload data from TLE.json
   *  Secondary Catalogs
   *  1. extra.json - this contains supplemental information about the catalog in json format.
   *  2. TLE.txt - this contains a local ASCII TLE file.
   *  3. externalTLEs - this contains an external TLE file.
   *  4. jsc-orbits.json - this contains JSC Vimpel TLE data.
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

      if (settingsManager.isUseDebrisCatalog) {
        await fetch(`${settingsManager.installDirectory}tle/TLEdebris.json`)
          .then((response) => response.json())
          .then((data) => CatalogLoader.parse(data, extraSats, { asciiCatalog }, jsCatalog))
          .catch((error) => {
            errorManagerInstance.error(error, 'tleManagerInstance.loadCatalog');
          });
      } else {
        await fetch(`${settingsManager.installDirectory}tle/TLE2.json`)
          .then((response) => response.json())
          .then((data) => CatalogLoader.parse(data, extraSats, { externalCatalog, asciiCatalog }, jsCatalog))
          .catch((error) => {
            errorManagerInstance.error(error, 'tleManagerInstance.loadCatalog');
          });
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
  static async parse(
    resp: SatObject[],
    extraSats: Promise<ExtraSat[]>,
    altCatalog: {
      asciiCatalog: Promise<AsciiTleSat[] | void>;
      externalCatalog?: Promise<void> | Promise<AsciiTleSat[] | void>;
    },
    jsCatalog: Promise<JsSat[]>
  ) {
    await Promise.all([extraSats, altCatalog.asciiCatalog, altCatalog.externalCatalog, jsCatalog]).then(([extraSats, asciiCatalog, externalCatalog, jsCatalog]) => {
      asciiCatalog = externalCatalog || asciiCatalog;
      const limitSatsArray = !settingsManager.limitSats ? CatalogLoader.setupGetVariables() : settingsManager.limitSats.split(',');

      // Make sure everyone agrees on what time it is
      keepTrackApi.getTimeManager().synchronize();

      // Filter TLEs
      // Sets catalogManagerInstance.satData internally to reduce memory usage
      CatalogLoader.filterTLEDatabase(resp, limitSatsArray, extraSats, asciiCatalog, jsCatalog);

      const catalogManagerInstance = keepTrackApi.getCatalogManager();
      catalogManagerInstance.numSats = catalogManagerInstance.satData.length;
      const satDataString = CatalogLoader.getSatDataString_(catalogManagerInstance.satData);

      /** Send satDataString to satCruncher to begin propagation loop */
      catalogManagerInstance.satCruncher.postMessage({
        typ: 'satdata',
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
   * @param tempSatData - An array of temporary satellite data.
   */
  private static addNonSatelliteObjects_(catalogManagerInstance: CatalogManager, tempSatData: (SatObject | SensorObject | RadarDataObject)[]) {
    catalogManagerInstance.orbitalSats = tempSatData.length + settingsManager.maxAnalystSats;
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    dotsManagerInstance.starIndex1 = catalogManagerInstance.starIndex1 + catalogManagerInstance.orbitalSats;
    dotsManagerInstance.starIndex2 = catalogManagerInstance.starIndex2 + catalogManagerInstance.orbitalSats;

    for (const staticSat of catalogManagerInstance.staticSet) {
      staticSat.id = tempSatData.length;
      tempSatData.push(staticSat);
    }
    for (const analSat of catalogManagerInstance.analSatSet) {
      analSat.id = tempSatData.length;
      tempSatData.push(analSat);
    }

    // TODO: Planned feature
    // radarDataManager.satDataStartIndex = tempSatData.length + 1;
    for (const radarData of catalogManagerInstance.radarDataSet) {
      tempSatData.push(radarData);
    }

    for (const missileObj of catalogManagerInstance.missileSet) {
      tempSatData.push(missileObj);
    }

    catalogManagerInstance.missileSats = tempSatData.length; // This is the start of the missiles index

    for (const fieldOfViewMarker of catalogManagerInstance.fieldOfViewSet) {
      fieldOfViewMarker.id = tempSatData.length;
      tempSatData.push(fieldOfViewMarker);
    }
  }

  /**
   * Checks if there are any limit sats and sets the settingsManager accordingly.
   * @param limitSatsArray - An array of limit sats.
   */
  private static checkForLimitSats_(limitSatsArray: string[]) {
    if (typeof limitSatsArray === 'undefined' || limitSatsArray.length == 0 || limitSatsArray[0] == null) {
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
  private static fixMissingZeros_(resp: SatObject[], i: number) {
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
      jsCatalog = CatalogLoader.getJscCatalog_(settingsManager);
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
    let asciiCatalog: AsciiTleSat[] = [];
    const resp = await fetch(`${settingsManager.installDirectory}tle/TLE.txt`);

    if (resp.ok) {
      const asciiCatalogFile = await resp.text();
      const content = asciiCatalogFile.split('\n');
      for (let i = 0; i < content.length; i = i + 2) {
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
  private static async getExternalCatalog_(settingsManager: SettingsManager): Promise<AsciiTleSat[] | void> {
    return fetch(settingsManager.externalTLEs)
      .then((resp) => {
        if (resp.ok) {
          const externalCatalog: AsciiTleSat[] = [];
          resp.text().then((data) => {
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
        } else {
          errorManagerInstance.warn('Error loading external TLEs from ' + settingsManager.externalTLEs);
          errorManagerInstance.info('Reverting to internal TLEs');
          settingsManager.externalTLEs = '';
        }
      })
      .catch(() => {
        errorManagerInstance.warn('Error loading external TLEs from ' + settingsManager.externalTLEs);
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
  private static async getJscCatalog_(settingsManager: SettingsManager): Promise<JsSat[]> {
    return fetch(`${settingsManager.installDirectory}tle/jsc-orbits.json`)
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          errorManagerInstance.warn('Error loading jsc-orbits.json');
          return [];
        }
      })
      .catch(() => {
        errorManagerInstance.warn('Error loading jsc-orbits.json');
      });
  }

  /**
   * Consolidate the satData into a string to send to satCruncher
   *
   * There is a lot of extra data that we don't need to send to satCruncher.
   */
  private static getSatDataString_(satData: any[]) {
    return JSON.stringify(
      satData.map((sat) => {
        const satData = <any>{
          static: sat.static,
          missile: sat.missile,
          isRadarData: sat.isRadarData,
          lat: sat.lat,
          lon: sat.lon,
          alt: sat.alt,
          latList: sat.latList,
          lonList: sat.lonList,
          altList: sat.altList,
          TLE1: sat.TLE1,
          TLE2: sat.TLE2,
          marker: sat.marker,
        };

        if (sat.type === SpaceObjectType.STAR) {
          satData.isStar = true;
          satData.ra = sat.ra;
          satData.dec = sat.dec;
        }

        return satData;
      })
    );
  }

  private static makeDebris(notionalDebris: any, meanAnom: number, notionalSatNum: number, tempSatData: any[]) {
    const debris = { ...notionalDebris };
    debris.id = tempSatData.length;
    debris.sccNum = notionalSatNum.toString();

    if (notionalSatNum < 1300000) {
      // ESA estimates 1300000 objects larger than 1cm
      // Random number between 0.01 and 0.1
      debris.rcs = 0.01 + Math.random() * 0.09;
    } else {
      // Random number between 0.001 and 0.01
      debris.name = `${notionalDebris.name} (1mm Notional)`; // 1mm
      debris.rcs = 0.001 + Math.random() * 0.009;
    }

    notionalSatNum++;

    meanAnom = parseFloat(debris.TLE2.substr(43, 51)) + meanAnom;
    if (meanAnom > 360) meanAnom -= 360;
    if (meanAnom < 0) meanAnom += 360;

    debris.TLE2 =
      debris.TLE2.substr(0, 17) + // Columns 1-18
      StringPad.pad0((Math.random() * 360).toFixed(4), 8) + // New RAAN
      debris.TLE2.substr(25, 18) + // Columns 25-44
      StringPad.pad0(meanAnom.toFixed(4), 8) + // New Mean Anomaly
      debris.TLE2.substr(51); // Columns 51-69
    tempSatData.push(debris);
  }

  private static parseAscii3LE_(content: string[], externalCatalog: AsciiTleSat[]) {
    for (let i = 0; i < content.length; i = i + 3) {
      externalCatalog.push({
        SCC: StringPad.pad0(content[i + 1].substring(2, 7).trim(), 5),
        ON: content[i].trim(),
        TLE1: <TleLine1>content[i + 1],
        TLE2: <TleLine2>content[i + 2],
      });
    }
  }

  private static parseAsciiTLE_(content: string[], externalCatalog: AsciiTleSat[]) {
    for (let i = 0; i < content.length; i = i + 2) {
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
      errorManagerInstance.debug('intlDes is empty for ' + TLE1);
      return 'None';
    }
    if (isNaN(parseInt(year))) {
      // eslint-disable-next-line no-debugger
      debugger;
    }
    const prefix = parseInt(year) > 50 ? '19' : '20';
    year = prefix + year;
    const rest = TLE1.substring(9, 17).trim().substring(2);
    return year + '-' + rest;
  }

  private static processAllSats_(resp: SatObject[], i: number, catalogManagerInstance: CatalogManager, tempSatData: any[], notionalSatNum: number) {
    const intlDes = CatalogLoader.parseIntlDes_(resp[i].TLE1);
    resp[i].intlDes = intlDes;
    catalogManagerInstance.sccIndex[`${resp[i].sccNum}`] = i;
    catalogManagerInstance.cosparIndex[`${resp[i].intlDes}`] = i;
    resp[i].active = true;
    if (!settingsManager.isDebrisOnly || (settingsManager.isDebrisOnly && (resp[i].type === 2 || resp[i].type === 3))) {
      resp[i].id = tempSatData.length;
      resp[i].source = 'USSF';
      tempSatData.push(resp[i]);
    }

    if (settingsManager.isNotionalDebris && resp[i].type === 3) {
      let notionalDebris = {
        id: 0,
        name: `${resp[i].name} (1cm Notional)`,
        TLE1: resp[i].TLE1,
        TLE2: resp[i].TLE2,
        sccNum: '',
        type: SpaceObjectType.NOTIONAL,
        source: 'Notional',
        active: true,
      };

      for (let i = 0; i < 8; i++) {
        if (tempSatData.length > settingsManager.maxNotionalDebris) break;
        CatalogLoader.makeDebris(notionalDebris, 15 + Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, -15 - Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, 30 + Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, -30 - Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, 45 + Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, -45 - Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, 60 + Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, -60 - Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, 75 + Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, -75 - Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, 90 + Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, -90 - Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, 105 + Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, -105 - Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, 120 + Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, -120 - Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, 135 + Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, -135 - Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, 150 + Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, -150 - Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, 165 + Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, -165 - Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, 180 + Math.random() * 15, notionalSatNum, tempSatData);
        CatalogLoader.makeDebris(notionalDebris, -180 - Math.random() * 15, notionalSatNum, tempSatData);
      }
    }
  }

  private static processAsciiCatalogKnown_(catalogManagerInstance: CatalogManager, element: AsciiTleSat, tempSatData: any[]) {
    const i = catalogManagerInstance.sccIndex[`${element.SCC}`];
    tempSatData[i].TLE1 = element.TLE1;
    tempSatData[i].TLE2 = element.TLE2;
    tempSatData[i].name = element.ON || tempSatData[i].name || 'Unknown';
    tempSatData[i].isExternal = true;
    tempSatData[i].source = settingsManager.externalTLEs ? settingsManager.externalTLEs.split('/')[2] : 'TLE.txt';
  }

  private static processAsciiCatalogUnknown_(element: AsciiTleSat, tempSatData: any[], catalogManagerInstance: CatalogManager) {
    settingsManager.isExtraSatellitesAdded = true;

    if (typeof element.ON == 'undefined') {
      element.ON = 'Unknown';
    }
    if (typeof element.OT == 'undefined') {
      element.OT = SpaceObjectType.SPECIAL;
    }
    const intlDes = this.parseIntlDes_(element.TLE1);
    const sccNum = FormatTle.convertA5to6Digit(element.SCC.toString());
    const asciiSatInfo = {
      static: false,
      missile: false,
      active: true,
      name: element.ON,
      type: element.OT,
      country: 'Unknown',
      rocket: 'Unknown',
      site: 'Unknown',
      sccNum: sccNum,
      TLE1: element.TLE1,
      TLE2: element.TLE2,
      source: settingsManager.externalTLEs ? settingsManager.externalTLEs.split('/')[2] : 'TLE.txt',
      intlDes: intlDes,
      typ: 'sat',
      id: tempSatData.length,
      isExternal: true,
    };
    catalogManagerInstance.sccIndex[`${sccNum.toString()}`] = tempSatData.length;
    catalogManagerInstance.cosparIndex[`${intlDes}`] = tempSatData.length;
    tempSatData.push(asciiSatInfo);
  }

  private static processAsciiCatalog_(asciiCatalog: AsciiTleSat[], catalogManagerInstance: CatalogManager, tempSatData: any[]) {
    if (settingsManager.externalTLEs) {
      errorManagerInstance.info(`Processing ${settingsManager.externalTLEs}`);
    } else {
      errorManagerInstance.log(`Processing ASCII Catalog`);
    }

    // If asciiCatalog catalogue
    for (const element of asciiCatalog) {
      if (!element.TLE1 || !element.TLE2) continue; // Don't Process Bad Satellite Information

      // See if we know anything about it already
      if (typeof catalogManagerInstance.sccIndex[`${element.SCC}`] !== 'undefined') {
        CatalogLoader.processAsciiCatalogKnown_(catalogManagerInstance, element, tempSatData);
      } else {
        CatalogLoader.processAsciiCatalogUnknown_(element, tempSatData, catalogManagerInstance);
      }
    }

    if (settingsManager.externalTLEs) {
      tempSatData = tempSatData.filter((sat) => sat.isExternal);
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
      if (!element.SCC || !element.TLE1 || !element.TLE2) continue; // Don't Process Bad Satellite Information
      if (typeof catalogManagerInstance.sccIndex[`${element.SCC}`] !== 'undefined') {
        const i = catalogManagerInstance.sccIndex[`${element.SCC}`];
        if (typeof tempSatData[i] === 'undefined') continue;
        tempSatData[i].TLE1 = element.TLE1;
        tempSatData[i].TLE2 = element.TLE2;
        tempSatData[i].source = 'extra.json';
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
          TLE1: element.TLE1,
          TLE2: element.TLE2,
          source: 'extra.json',
          intlDes: intlDes,
          typ: 'sat',
          id: tempSatData.length,
          vmag: element.vmag,
        };
        catalogManagerInstance.sccIndex[`${element.SCC.toString()}`] = tempSatData.length;
        catalogManagerInstance.cosparIndex[`${intlDes}`] = tempSatData.length;
        tempSatData.push(extrasSatInfo);
      }
    }
  }

  private static processJsCatalog_(jsCatalog: JsSat[], catalogManagerInstance: CatalogManager, tempSatData: any[]) {
    errorManagerInstance.debug(`Processing ${settingsManager.isEnableJscCatalog ? 'JSC Vimpel' : 'Extended'} Catalog`);
    // If jsCatalog catalogue
    for (const element of jsCatalog) {
      if (!element.TLE1 || !element.TLE2) continue; // Don't Process Bad Satellite Information
      if (typeof catalogManagerInstance.sccIndex[`${element.SCC}`] !== 'undefined') {
        // console.warn('Duplicate Satellite Found in jsCatalog');
        // NOTE: We don't trust the jsCatalog, so we don't update the TLEs
        // i = catalogManagerInstance.sccIndex[`${jsCatalog[s].SCC}`];
        // tempSatData[i].TLE1 = jsCatalog[s].TLE1;
        // tempSatData[i].TLE2 = jsCatalog[s].TLE2;
      } else {
        settingsManager.isExtraSatellitesAdded = true;
        const intlDes = CatalogLoader.parseIntlDes_(element.TLE1);
        const jsSatInfo = {
          static: false,
          missile: false,
          active: true,
          name: `${element.source} ${element.altId}`,
          type: SpaceObjectType.DEBRIS,
          country: 'Unknown',
          rocket: 'Unknown',
          site: 'Unknown',
          sccNum: element.SCC.toString(),
          TLE1: element.TLE1,
          TLE2: element.TLE2,
          source: element.source,
          altId: element.altId,
          intlDes: intlDes,
          id: tempSatData.length,
        };
        catalogManagerInstance.sccIndex[`${element.SCC.toString()}`] = tempSatData.length;
        tempSatData.push(jsSatInfo);
      }
    }
  }

  private static processLimitedSats_(limitSatsArray: string[], resp: SatObject[], i: number, catalogManagerInstance: CatalogManager, tempSatData: any[]) {
    let newId = 0;
    for (const limitSat of limitSatsArray) {
      if (resp[i].sccNum === limitSat) {
        const intlDes = CatalogLoader.parseIntlDes_(resp[i].TLE1);
        resp[i].intlDes = intlDes;
        resp[i].id = newId;
        newId++;
        catalogManagerInstance.sccIndex[`${resp[i].sccNum}`] = resp[i].id;
        catalogManagerInstance.cosparIndex[`${resp[i].intlDes}`] = resp[i].id;
        resp[i].active = true;
        resp[i].source = 'USSF';
        tempSatData.push(resp[i]);
      }
    }
  }

  private static sortByScc_(catalog: AsciiTleSat[] | JsSat[] | ExtraSat[]) {
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
