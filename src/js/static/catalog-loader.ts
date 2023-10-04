import { keepTrackContainer } from '@app/js/container';
import { CatalogManager, SatObject, Singletons } from '@app/js/interfaces';
import { MILLISECONDS2DAYS, RAD2DEG } from '@app/js/lib/constants';
import { getEl } from '@app/js/lib/get-el';
import { SpaceObjectType } from '@app/js/lib/space-object-type';
import { StringPad } from '@app/js/lib/stringPad';
import { errorManagerInstance } from '@app/js/singletons/errorManager';

import { DotsManager } from '@app/js/singletons/dots-manager';
import { keepTrackApi } from '../keepTrackApi';
import { SettingsManager } from '../settings/settings';

export class CatalogLoader {
  /**
   *  @returns {Promise<any>}
   *  This function will load the catalog and will return the catalog.
   *
   *  There are three catalog files that are loaded:
   *
   *  1. TLE.json - this contains extended object information including launch location and RCS.
   *  2. extra.json - this contains supplemental information about the catalog.
   *  3. TLE.txt - this contains ASCII TLE data similar to that found on space-track.org.
   *
   *  The catalog is loaded in the above order appending the information each step of the way.
   *
   *  If a file is missing, the function will skip it and continue loading the next file.
   *
   *  If all files are missing, the function will return an error.
   */
  static async load(): Promise<void> {
    const settingsManager: SettingsManager = window.settingsManager;

    try {
      let extraSats: any = [];
      if (settingsManager.offline && !settingsManager.isDisableExtraCatalog) {
        fetch(`${settingsManager.installDirectory}tle/extra.json`).then((resp) => {
          if (resp.ok) {
            resp.json().then((data) => {
              extraSats = data;
            });
          } else {
            errorManagerInstance.info('Error loading extra.json');
          }
        });
      }

      const asciiCatalog: { SCC: string; TLE1: any; TLE2: any }[] = [];
      if (!settingsManager.isDisableAsciiCatalog) {
        const resp = await (await fetch(`${settingsManager.installDirectory}tle/TLE.txt`)).text();
        const content = resp.split('\n');
        for (let i = 0; i < content.length; i = i + 2) {
          asciiCatalog.push({
            SCC: StringPad.pad0(content[i].substr(2, 5).trim(), 5),
            TLE1: content[i],
            TLE2: content[i + 1],
          });
        }
      }

      const jsCatalog: {
        source: string;
        altId: string;
        NoradId: string;
        SCC: string;
        TLE1: string;
        TLE2: string;
        OrbitType: string;
        Name: string;
        Country: string;
        BirthDate: string;
        Operator: string;
        Users: string;
        Purpose: string;
        DetailedPurpose: string;
        LaunchMass: string;
        DryMass: string;
        Power: string;
        Lifetime: string;
        Contractor: string;
        LaunchSite: string;
        LaunchVehicle: string;
      }[] = [];
      if (settingsManager.isEnableExtendedCatalog) {
        try {
          const resp = await (await fetch(`${settingsManager.installDirectory}tle/tle4.js`)).text();
          const content = resp.split('`')[3].split('\n');
          for (let i = 1; i < content.length; i++) {
            const data = content[i].split('\t');

            if (data[0] === '0') continue; // SKIP USSF

            const inc = parseFloat(data[6]) * RAD2DEG;
            const raan = parseFloat(data[7]) * RAD2DEG;
            const ecc = parseFloat(data[5]);
            const argpe = parseFloat(data[8]) * RAD2DEG;
            const meana = parseFloat(data[9]) * RAD2DEG;

            const G = 6.6725985e-11;
            const massEarth = 5.97378250603408e24;
            const TAU = 2 * Math.PI;
            const a = parseFloat(data[4]);
            let period = TAU * Math.sqrt((a * a * a) / (G * (1 + massEarth)));
            period = period / 60; // Convert to minutes

            let epoch = new Date(data[3]);
            const meanmo = 1440 / period;
            const yy = epoch.getUTCFullYear() - 2000; // This won't work before year 2000, but that shouldn't matter
            const epochd = this.getDayOfYear_(epoch.getUTCMonth(), epoch.getUTCDate(), epoch.getUTCHours(), epoch.getUTCMinutes(), epoch.getUTCSeconds());
            const epochd2 = parseFloat(epochd) + epoch.getUTCMilliseconds() * MILLISECONDS2DAYS;

            let sccNum = StringPad.pad0(data[2], 5);
            if (sccNum === '00000') {
              sccNum = 'Y' + StringPad.pad0(data[1].slice(-4), 4);
            }

            const tle1 = `1 ${sccNum}U 58001A   ${yy}${StringPad.pad0(epochd2.toFixed(8), 12)} 0.00000000 +00000-0 +00000-0 0 99990`;
            const tle2 = `2 ${sccNum} ${StringPad.pad0(inc.toFixed(4), 8)} ${StringPad.pad0(raan.toFixed(4), 8)} ${ecc.toFixed(7).substr(2, 7)} ${StringPad.pad0(
              argpe.toFixed(4),
              8
            )} ${StringPad.pad0(meana.toFixed(4), 8)} ${StringPad.pad0(meanmo.toFixed(8), 11)}000010`;

            // Make sure no nan values are passed to the catalog
            if (isNaN(inc) || isNaN(raan) || isNaN(ecc) || isNaN(argpe) || isNaN(meana) || isNaN(meanmo)) {
              continue;
            }

            // 1 Planet
            // 3 JSC Vimpel
            // 4 SeeSat-L
            // 7 UCS`
            let source = 'Unknown';
            if (data[0] === '1') source = 'Planet';
            if (data[0] === '3') source = 'JSC Vimpel';
            if (data[0] === '4') source = 'SeeSat-L';
            if (data[0] === '7') source = 'UCS';

            jsCatalog.push({
              source: source,
              altId: data[1],
              NoradId: data[2],
              SCC: sccNum,
              TLE1: tle1,
              TLE2: tle2,
              OrbitType: data[10],
              Name: data[11],
              Country: data[12],
              BirthDate: data[13],
              Operator: data[14],
              Users: data[15],
              Purpose: data[16],
              DetailedPurpose: data[17],
              LaunchMass: data[18],
              DryMass: data[19],
              Power: data[20],
              Lifetime: data[21],
              Contractor: data[22],
              LaunchSite: data[23],
              LaunchVehicle: data[24],
            });
          }
        } catch (e) {
          errorManagerInstance.info(e);
        }
      }

      if (settingsManager.isUseDebrisCatalog) {
        await fetch(`${settingsManager.installDirectory}tle/TLEdebris.json`)
          .then((response) => response.json())
          .then((data) => CatalogLoader.parse(data, extraSats, asciiCatalog, jsCatalog))
          .catch((error) => {
            errorManagerInstance.error(error, 'tleManagerInstance.loadCatalog');
          });
      } else {
        await fetch(`${settingsManager.installDirectory}tle/TLE2.json`)
          .then((response) => response.json())
          .then((data) => CatalogLoader.parse(data, extraSats, asciiCatalog, jsCatalog))
          .catch((error) => {
            errorManagerInstance.error(error, 'tleManagerInstance.loadCatalog');
          });
      }
    } catch {
      console.error('Failed to load TLE catalog!');
    }
  }

  private static getDayOfYear_(mon: number, day: number, hr: number, minute: number, sec: number) {
    return (Math.floor((275 * mon) / 9.0) + day + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0) //  ut in days
      .toFixed(5);
  }

  // Parse the Catalog from catalogManagerInstance.loadCatalog and then return it back -- they are chained together!
  static parse(resp: any, extraSats?: any, asciiCatalog?: any, jsCatalog?: any) {
    const settingsManager: any = window.settingsManager;

    const limitSatsArray = !settingsManager.limitSats ? CatalogLoader.setupGetVariables() : settingsManager.limitSats.split(',');

    // Make sure everyone agrees on what time it is
    keepTrackApi.getTimeManager().synchronize();

    // Filter TLEs
    // SatCruncher will use this when it returns so we need to expose it now
    if (typeof resp === 'string') resp = JSON.parse(resp);
    // Sets catalogManagerInstance.satData internally to reduce memory usage
    CatalogLoader.filterTLEDatabase(resp, limitSatsArray, extraSats, asciiCatalog, jsCatalog);
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    catalogManagerInstance.numSats = catalogManagerInstance.satData.length;

    const satDataString = CatalogLoader.getSatDataString(catalogManagerInstance.satData);

    /** Send satDataString to satCruncher to begin propagation loop */
    catalogManagerInstance.satCruncher.postMessage({
      typ: 'satdata',
      dat: satDataString,
      fieldOfViewSetLength: catalogManagerInstance.fieldOfViewSet.length,
      isLowPerf: settingsManager.lowPerf,
    });
  }

  static getSatDataString(satData: any[]) {
    return JSON.stringify(
      satData.map((sat) => ({
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
      }))
    );
  }

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

  static filterTLEDatabase(resp: SatObject[], limitSatsArray?: string[], extraSats?: any[], asciiCatalog?: any[], jsCatalog?: any[]): void {
    const tempSatData = [];
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

    catalogManagerInstance.sccIndex = <{ [key: string]: number }>{};
    catalogManagerInstance.cosparIndex = <{ [key: string]: number }>{};

    if (typeof limitSatsArray === 'undefined' || limitSatsArray.length == 0 || limitSatsArray[0] == null) {
      // If there are no limits then just process like normal
      settingsManager.limitSats = '';
    }

    let year: string;
    let prefix: string;
    let rest: string;

    let notionalSatNum = 400000; // Start at 400,000 to avoid conflicts with real satellites
    const makeDebris = (notionalDebris: any, meanAnom: number) => {
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
    };

    let i = 0;
    for (i; i < resp.length; i++) {
      resp[i].sccNum = StringPad.pad0(resp[i].TLE1.substr(2, 5).trim(), 5);

      // Check if first digit is a letter
      resp[i].sccNum = CatalogLoader.convertA5to6Digit(resp[i].sccNum);

      if (settingsManager.limitSats === '') {
        // If there are no limits then just process like normal
        year = resp[i].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
        if (year === '') {
          resp[i].intlDes = 'none';
        } else {
          prefix = parseInt(year) > 50 ? '19' : '20';
          year = prefix + year;
          rest = resp[i].TLE1.substr(9, 8).trim().substring(2);
          resp[i].intlDes = year + '-' + rest;
        }
        catalogManagerInstance.sccIndex[`${resp[i].sccNum}`] = i;
        catalogManagerInstance.cosparIndex[`${resp[i].intlDes}`] = i;
        resp[i].active = true;
        if (!settingsManager.isDebrisOnly || (settingsManager.isDebrisOnly && (resp[i].type === 2 || resp[i].type === 3))) {
          resp[i].id = tempSatData.length;
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
            makeDebris(notionalDebris, 15 + Math.random() * 15);
            makeDebris(notionalDebris, -15 - Math.random() * 15);
            makeDebris(notionalDebris, 30 + Math.random() * 15);
            makeDebris(notionalDebris, -30 - Math.random() * 15);
            makeDebris(notionalDebris, 45 + Math.random() * 15);
            makeDebris(notionalDebris, -45 - Math.random() * 15);
            makeDebris(notionalDebris, 60 + Math.random() * 15);
            makeDebris(notionalDebris, -60 - Math.random() * 15);
            makeDebris(notionalDebris, 75 + Math.random() * 15);
            makeDebris(notionalDebris, -75 - Math.random() * 15);
            makeDebris(notionalDebris, 90 + Math.random() * 15);
            makeDebris(notionalDebris, -90 - Math.random() * 15);
            makeDebris(notionalDebris, 105 + Math.random() * 15);
            makeDebris(notionalDebris, -105 - Math.random() * 15);
            makeDebris(notionalDebris, 120 + Math.random() * 15);
            makeDebris(notionalDebris, -120 - Math.random() * 15);
            makeDebris(notionalDebris, 135 + Math.random() * 15);
            makeDebris(notionalDebris, -135 - Math.random() * 15);
            makeDebris(notionalDebris, 150 + Math.random() * 15);
            makeDebris(notionalDebris, -150 - Math.random() * 15);
            makeDebris(notionalDebris, 165 + Math.random() * 15);
            makeDebris(notionalDebris, -165 - Math.random() * 15);
            makeDebris(notionalDebris, 180 + Math.random() * 15);
            makeDebris(notionalDebris, -180 - Math.random() * 15);
          }
        }
      } else {
        // If there are limited satellites
        let newId = 0;
        for (const element of limitSatsArray) {
          if (resp[i].sccNum === element) {
            year = resp[i].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
            if (year === '') {
              resp[i].intlDes = 'none';
            } else {
              prefix = parseInt(year) > 50 ? '19' : '20';
              year = prefix + year;
              rest = resp[i].TLE1.substr(9, 8).trim().substring(2);
              resp[i].intlDes = year + '-' + rest;
            }
            resp[i].id = newId;
            newId++;
            catalogManagerInstance.sccIndex[`${resp[i].sccNum}`] = resp[i].id;
            catalogManagerInstance.cosparIndex[`${resp[i].intlDes}`] = resp[i].id;
            resp[i].active = true;
            tempSatData.push(resp[i]);
          }
        }
      }
    }
    let extrasSatInfo;
    if (typeof extraSats !== 'undefined' && settingsManager.offline) {
      // If extra catalogue
      for (const element of extraSats) {
        if (typeof element.SCC == 'undefined') continue;
        if (typeof element.TLE1 == 'undefined') continue; // Don't Process Bad Satellite Information
        if (typeof element.TLE2 == 'undefined') continue; // Don't Process Bad Satellite Information
        if (typeof catalogManagerInstance.sccIndex[`${element.SCC}`] !== 'undefined') {
          i = catalogManagerInstance.sccIndex[`${element.SCC}`];
          if (typeof tempSatData[i] === 'undefined') continue;
          tempSatData[i].TLE1 = element.TLE1;
          tempSatData[i].TLE2 = element.TLE2;
        } else {
          settingsManager.isExtraSatellitesAdded = true;

          year = element.TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
          prefix = parseInt(year) > 50 ? '19' : '20';
          year = prefix + year;
          rest = element.TLE1.substr(9, 8).trim().substring(2);
          extrasSatInfo = {
            static: false,
            missile: false,
            active: true,
            name: element.ON ? element.ON : 'Unknown',
            type: element.OT ? element.OT : SpaceObjectType.SPECIAL,
            country: 'Unknown',
            rocket: 'Unknown',
            site: 'Unknown',
            sccNum: element.SCC.toString(),
            TLE1: element.TLE1,
            TLE2: element.TLE2,
            source: 'USSF', // ASSUME USSF
            intlDes: year + '-' + rest,
            typ: 'sat',
            id: tempSatData.length,
            vmag: element.vmag,
          };
          catalogManagerInstance.sccIndex[`${element.SCC.toString()}`] = tempSatData.length;
          catalogManagerInstance.cosparIndex[`${year}-${rest}`] = tempSatData.length;
          tempSatData.push(extrasSatInfo);
        }
      }
    }
    let asciiSatInfo;
    if (asciiCatalog?.length > 0 && settingsManager.offline) {
      errorManagerInstance.info('Processing ASCII Catalog');
      // If asciiCatalog catalogue
      for (const element of asciiCatalog) {
        if (typeof element.TLE1 == 'undefined') continue; // Don't Process Bad Satellite Information
        if (typeof element.TLE2 == 'undefined') continue; // Don't Process Bad Satellite Information
        if (typeof catalogManagerInstance.sccIndex[`${element.SCC}`] !== 'undefined') {
          i = catalogManagerInstance.sccIndex[`${element.SCC}`];
          tempSatData[i].TLE1 = element.TLE1;
          tempSatData[i].TLE2 = element.TLE2;
        } else {
          if (typeof element.TLE1 == 'undefined') continue; // Don't Process Bad Satellite Information
          if (typeof element.TLE2 == 'undefined') continue; // Don't Process Bad Satellite Information
          settingsManager.isExtraSatellitesAdded = true;

          if (typeof element.ON == 'undefined') {
            element.ON = 'Unknown';
          }
          if (typeof element.OT == 'undefined') {
            element.OT = SpaceObjectType.SPECIAL;
          }
          year = element.TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
          prefix = parseInt(year) > 50 ? '19' : '20';
          year = prefix + year;
          rest = element.TLE1.substr(9, 8).trim().substring(2);
          asciiSatInfo = {
            static: false,
            missile: false,
            active: true,
            name: element.ON,
            type: element.OT,
            country: 'Unknown',
            rocket: 'Unknown',
            site: 'Unknown',
            sccNum: element.SCC.toString(),
            TLE1: element.TLE1,
            TLE2: element.TLE2,
            source: 'USSF', // ASSUME USSF
            intlDes: year + '-' + rest,
            typ: 'sat',
            id: tempSatData.length,
          };
          catalogManagerInstance.sccIndex[`${element.SCC.toString()}`] = tempSatData.length;
          catalogManagerInstance.cosparIndex[`${year}-${rest}`] = tempSatData.length;
          tempSatData.push(asciiSatInfo);
        }
      }
    }

    let jsSatInfo;
    if (jsCatalog?.length > 0 && settingsManager.isEnableExtendedCatalog) {
      errorManagerInstance.info('Processing js Catalog');
      // If jsCatalog catalogue
      for (const element of jsCatalog) {
        if (typeof element.TLE1 == 'undefined') continue; // Don't Process Bad Satellite Information
        if (typeof element.TLE2 == 'undefined') continue; // Don't Process Bad Satellite Information
        if (typeof catalogManagerInstance.sccIndex[`${element.SCC}`] !== 'undefined') {
          // console.warn('Duplicate Satellite Found in jsCatalog');
          // NOTE: We don't trust the jsCatalog, so we don't update the TLEs
          // i = catalogManagerInstance.sccIndex[`${jsCatalog[s].SCC}`];
          // tempSatData[i].TLE1 = jsCatalog[s].TLE1;
          // tempSatData[i].TLE2 = jsCatalog[s].TLE2;
        } else {
          if (typeof element.TLE1 == 'undefined') continue; // Don't Process Bad Satellite Information
          if (typeof element.TLE2 == 'undefined') continue; // Don't Process Bad Satellite Information
          settingsManager.isExtraSatellitesAdded = true;

          year = element.TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
          prefix = parseInt(year) > 50 ? '19' : '20';
          year = prefix + year;
          rest = element.TLE1.substr(9, 8).trim().substring(2);
          jsSatInfo = {
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
            intlDes: year + '-' + rest,
            id: tempSatData.length,
          };
          catalogManagerInstance.sccIndex[`${element.SCC.toString()}`] = tempSatData.length;
          catalogManagerInstance.cosparIndex[`${year}-${rest}`] = tempSatData.length;
          tempSatData.push(jsSatInfo);

          // let notionalDebris = {
          //   id: 0,
          //   name: `${jsSatInfo.name} (1cm Notional)`,
          //   TLE1: jsSatInfo.TLE1,
          //   TLE2: jsSatInfo.TLE2,
          //   sccNum: '',
          //   type: SpaceObjectType.NOTIONAL,
          //   source: 'Notional',
          //   active: true,
          // };

          // for (let i = 0; i < 6; i++) {
          //   makeDebris(notionalDebris, 15 + Math.random() * 15);
          //   makeDebris(notionalDebris, -15 - Math.random() * 15);
          //   makeDebris(notionalDebris, 30 + Math.random() * 15);
          //   makeDebris(notionalDebris, -30 - Math.random() * 15);
          //   makeDebris(notionalDebris, 45 + Math.random() * 15);
          //   makeDebris(notionalDebris, -45 - Math.random() * 15);
          //   makeDebris(notionalDebris, 60 + Math.random() * 15);
          //   makeDebris(notionalDebris, -60 - Math.random() * 15);
          //   makeDebris(notionalDebris, 75 + Math.random() * 15);
          //   makeDebris(notionalDebris, -75 - Math.random() * 15);
          //   makeDebris(notionalDebris, 90 + Math.random() * 15);
          //   makeDebris(notionalDebris, -90 - Math.random() * 15);
          //   makeDebris(notionalDebris, 105 + Math.random() * 15);
          //   makeDebris(notionalDebris, -105 - Math.random() * 15);
          //   makeDebris(notionalDebris, 120 + Math.random() * 15);
          //   makeDebris(notionalDebris, -120 - Math.random() * 15);
          //   makeDebris(notionalDebris, 135 + Math.random() * 15);
          //   makeDebris(notionalDebris, -135 - Math.random() * 15);
          //   makeDebris(notionalDebris, 150 + Math.random() * 15);
          //   makeDebris(notionalDebris, -150 - Math.random() * 15);
          //   makeDebris(notionalDebris, 165 + Math.random() * 15);
          //   makeDebris(notionalDebris, -165 - Math.random() * 15);
          //   makeDebris(notionalDebris, 180 + Math.random() * 15);
          //   makeDebris(notionalDebris, -180 - Math.random() * 15);
          // }
        }
      }
    }

    if (settingsManager.isExtraSatellitesAdded) {
      try {
        document.querySelector<HTMLElement>('.legend-pink-box').style.display = 'block';
        document.querySelectorAll('.legend-pink-box').forEach((element) => {
          element.parentElement.style.display = 'none';
          element.parentElement.innerHTML = `<div class="Square-Box legend-pink-box"></div>${settingsManager.nameOfSpecialSats}`;
        });
      } catch (e) {
        // Intentionally Blank
      }
    }

    catalogManagerInstance.orbitalSats = tempSatData.length + settingsManager.maxAnalystSats;
    const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
    dotsManagerInstance.starIndex1 = catalogManagerInstance.starIndex1 + catalogManagerInstance.orbitalSats;
    dotsManagerInstance.starIndex2 = catalogManagerInstance.starIndex2 + catalogManagerInstance.orbitalSats;

    for (i = 0; i < catalogManagerInstance.staticSet.length; i++) {
      catalogManagerInstance.staticSet[i].id = tempSatData.length;
      tempSatData.push(catalogManagerInstance.staticSet[i]);
    }
    for (i = 0; i < catalogManagerInstance.analSatSet.length; i++) {
      catalogManagerInstance.analSatSet[i].id = tempSatData.length;
      tempSatData.push(catalogManagerInstance.analSatSet[i]);
    }

    // TODO: Planned feature
    // radarDataManager.satDataStartIndex = tempSatData.length + 1;

    for (i = 0; i < catalogManagerInstance.radarDataSet.length; i++) {
      tempSatData.push(catalogManagerInstance.radarDataSet[i]);
    }

    for (i = 0; i < catalogManagerInstance.missileSet.length; i++) {
      tempSatData.push(catalogManagerInstance.missileSet[i]);
    }

    catalogManagerInstance.missileSats = tempSatData.length; // This is the start of the missiles index

    for (i = 0; i < catalogManagerInstance.fieldOfViewSet.length; i++) {
      catalogManagerInstance.fieldOfViewSet[i].id = tempSatData.length;
      tempSatData.push(catalogManagerInstance.fieldOfViewSet[i]);
    }

    catalogManagerInstance.satData = tempSatData;
  }

  static convert6DigitToA5(sccNum: string): string {
    if (RegExp(/[a-z]/iu, 'u').exec(sccNum[0])) {
      return sccNum;
    } else {
      // Extract the trailing 4 digits
      const rest = sccNum.slice(2, 6);

      // Convert the first two digit numbers into a Letter. Skip I and O as they look too similar to 1 and 0
      // A=10, B=11, C=12, D=13, E=14, F=15, G=16, H=17, J=18, K=19, L=20, M=21, N=22, P=23, Q=24, R=25, S=26, T=27, U=28, V=29, W=30, X=31, Y=32, Z=33
      let first = parseInt(`${sccNum[0]}${sccNum[1]}`);
      const iPlus = first >= 18 ? 1 : 0;
      const tPlus = first >= 24 ? 1 : 0;
      first = first + iPlus + tPlus;

      return `${String.fromCharCode(first + 55)}${rest}`;
    }
  }

  static convertA5to6Digit(sccNum: string): string {
    if (RegExp(/[a-z]/iu, 'u').exec(sccNum[0])) {
      // Extract the trailing 4 digits
      const rest = sccNum.slice(1, 5);

      // Convert the first letter to a two digit number. Skip I and O as they look too similar to 1 and 0
      // A=10, B=11, C=12, D=13, E=14, F=15, G=16, H=17, J=18, K=19, L=20, M=21, N=22, P=23, Q=24, R=25, S=26, T=27, U=28, V=29, W=30, X=31, Y=32, Z=33
      let first = sccNum[0].toUpperCase().charCodeAt(0) - 55;
      const iPlus = first >= 18 ? 1 : 0;
      const tPlus = first >= 24 ? 1 : 0;
      first = first - iPlus - tPlus;

      return `${first}${rest}`;
    } else {
      return sccNum;
    }
  }
}
