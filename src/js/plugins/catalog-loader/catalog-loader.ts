import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { MILLISECONDS_PER_DAY, RAD2DEG } from '@app/js/lib/constants';
import { getEl, stringPad } from '@app/js/lib/helpers';
import $ from 'jquery';

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
export const catalogLoader = async (): Promise<void> => {
  const settingsManager: any = window.settingsManager;

  try {
    let extraSats: any = [];
    if (settingsManager.offline && !settingsManager.isDisableExtraCatalog) {
      fetch(`${settingsManager.installDirectory}tle/extra.json`).then((resp) => {
        if (resp.ok) {
          resp.json().then((data) => {
            extraSats = data;
          });
        } else {
          console.log('Error loading extra.json');
        }
      });
    }

    const asciiCatalog: { SCC: string; TLE1: any; TLE2: any }[] = [];
    if (!settingsManager.isDisableAsciiCatalog) {
      const resp = await (await fetch(`${settingsManager.installDirectory}tle/TLE.txt`)).text();
      const content = resp.split('\n');
      for (let i = 0; i < content.length; i = i + 2) {
        asciiCatalog.push({
          SCC: stringPad.pad0(content[i].substr(2, 5).trim(), 5),
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
    // eslint-disable-next-line no-constant-condition
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
          // const PlusMinus = a * ecc;
          // let periapsis = a - PlusMinus - RADIUS_OF_EARTH;
          // let apoapsis = a + PlusMinus - RADIUS_OF_EARTH;
          let period = TAU * Math.sqrt((a * a * a) / (G * (1 + massEarth)));
          period = period / 60; // Convert to minutes

          let epoch = new Date(data[3]);
          const meanmo = 1440 / period;
          const yy = epoch.getUTCFullYear() - 2000; // This won't work before year 2000, but that shouldn't matter
          const epochd = _dayOfYear(epoch.getUTCMonth(), epoch.getUTCDate(), epoch.getUTCHours(), epoch.getUTCMinutes(), epoch.getUTCSeconds());
          const epochd2 = parseFloat(epochd) + epoch.getUTCMilliseconds() * MILLISECONDS_PER_DAY;

          let sccNum = stringPad.pad0(data[2], 5);
          if (sccNum === '00000') {
            sccNum = 'Y' + stringPad.pad0(data[1].slice(-4), 4);
          }

          const tle1 = `1 ${sccNum}U 58001A   ${yy}${stringPad.pad0(epochd2.toFixed(8), 12)} 0.00000000 +00000-0 +00000-0 0 99990`;
          const tle2 = `2 ${sccNum} ${stringPad.pad0(inc.toFixed(4), 8)} ${stringPad.pad0(raan.toFixed(4), 8)} ${ecc.toFixed(7).substr(2, 7)} ${stringPad.pad0(
            argpe.toFixed(4),
            8
          )} ${stringPad.pad0(meana.toFixed(4), 8)} ${stringPad.pad0(meanmo.toFixed(8), 11)}000010`;

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
        console.log(e);
      }
    }

    if (settingsManager.isUseDebrisCatalog) {
      await $.get(`${settingsManager.installDirectory}tle/TLEdebris.json`).then((resp) => parseCatalog(resp, extraSats, asciiCatalog, jsCatalog));
    } else {
      await $.get(`${settingsManager.installDirectory}tle/TLE2.json`).then((resp) => parseCatalog(resp, extraSats, asciiCatalog, jsCatalog));
    }
  } catch (e) {
    // Intentionally left blank
  }
};

export const _dayOfYear = (mon: number, day: number, hr: number, minute: number, sec: number) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  (Math.floor((275 * mon) / 9.0) + day + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0) //  ut in days
    .toFixed(5);

// Parse the Catalog from satSet.loadCatalog and then return it back -- they are chained together!
export const parseCatalog = (resp: any, extraSats?: any, asciiCatalog?: any, jsCatalog?: any) => {
  const { satSet, objectManager } = keepTrackApi.programs;
  const settingsManager: any = window.settingsManager;

  const limitSatsArray = setupGetVariables();

  // Filter TLEs
  // SatCruncher will use this when it returns so we need to expose it now
  if (typeof resp === 'string') resp = JSON.parse(resp);
  // Sets satSet.satData internally to reduce memory usage
  filterTLEDatabase(resp, limitSatsArray, extraSats, asciiCatalog, jsCatalog);
  satSet.numSats = satSet.satData.length;

  const satDataString = getSatDataString(satSet.satData);

  /** Send satDataString to satCruncher to begin propagation loop */
  satSet.satCruncher.postMessage({
    typ: 'satdata',
    dat: satDataString,
    fieldOfViewSetLength: objectManager.fieldOfViewSet.length,
    isLowPerf: settingsManager.lowPerf,
  });
};

export const getSatDataString = (satData: SatObject[]) =>
  JSON.stringify(
    satData.map((sat) => ({
      static: sat.static,
      missile: sat.missile,
      isRadarData: sat.isRadarData,
      TLE1: sat.TLE1,
      TLE2: sat.TLE2,
    }))
  );

export const setupGetVariables = () => {
  const { timeManager } = keepTrackApi.programs;
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
        (<HTMLElement>getEl('limitSats-Label')).classList.add('active');
        limitSatsArray = val.split(',');
        break;
      case 'future use':
      default:
    }
  }

  // Make sure everyone agrees on what time it is
  timeManager.synchronize();

  return limitSatsArray;
};

// prettier-ignore
export const filterTLEDatabase = (resp: SatObject[], limitSatsArray?: any[], extraSats?: any[], asciiCatalog?: any[], jsCatalog?: any[]): void => { // NOSONAR
  const { dotsManager, objectManager, satSet } = keepTrackApi.programs;

  const tempSatData = [];

  satSet.sccIndex = <{ [key: string]: number }>{};
  satSet.cosparIndex = <{ [key: string]: number }>{};

  if (typeof limitSatsArray === 'undefined' || limitSatsArray.length == 0 || limitSatsArray[0] == null) {
    // If there are no limits then just process like normal
    settingsManager.limitSats = '';
  }

  let year: string;
  let prefix: string;
  let rest: string;

  let notionalSatNum = 400000;
  const makeDebris = (notionalDebris: any, meanAnom: number) => {
    const debris = {...notionalDebris};
    debris.id = tempSatData.length;
    debris.sccNum = notionalSatNum.toString();

    if (notionalSatNum < 1300000) {
      // Random number between 0.01 and 0.1
      debris.rcs = 0.01 + Math.random() * 0.09;
    } else {
      // Random number between 0.001 and 0.01
      debris.rcs = 0.001 + Math.random() * 0.009;
    }

    notionalSatNum++;

    meanAnom = parseFloat(debris.TLE2.substr(43, 51)) + meanAnom;
    if (meanAnom > 360) meanAnom -= 360;
    if (meanAnom < 0) meanAnom += 360;

    debris.TLE2 = debris.TLE2.substr(0, 17) + // Columns 1-18
      stringPad.pad0((Math.random() * 360).toFixed(4), 8) + // New RAAN
      debris.TLE2.substr(25, 18) + // Columns 25-44
      stringPad.pad0(meanAnom.toFixed(4), 8) + // New Mean Anomaly
      debris.TLE2.substr(51); // Columns 51-69
    tempSatData.push(debris);
  };

  let i = 0;
  for (i; i < resp.length; i++) {
    resp[i].sccNum = stringPad.pad0(resp[i].TLE1.substr(2, 5).trim(), 5);

    // Check if first digit is a letter
    resp[i].sccNum = convertA5to6Digit(resp[i].sccNum);

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
      satSet.sccIndex[`${resp[i].sccNum}`] = i;
      satSet.cosparIndex[`${resp[i].intlDes}`] = i;
      resp[i].active = true;
      if (!settingsManager.isDebrisOnly || (settingsManager.isDebrisOnly && (resp[i].type === 2 || resp[i].type === 3))) {
        resp[i].id = tempSatData.length;        
        tempSatData.push(resp[i]);
      }

      if (settingsManager.isNotionalDebris && (settingsManager.isUseExtendedCatalog && resp[i].type === 3)) {
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
          if (tempSatData.length > 100000) break; // Max 1 million satellites
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
      for (let x = 0; x < limitSatsArray.length; x++) {
        if (resp[i].sccNum === limitSatsArray[x].sccNum) {
          year = resp[i].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
          if (year === '') {
            resp[i].intlDes = 'none';
          } else {
            prefix = parseInt(year) > 50 ? '19' : '20';
            year = prefix + year;
            rest = resp[i].TLE1.substr(9, 8).trim().substring(2);
            resp[i].intlDes = year + '-' + rest;
          }
          resp[i].id = i;
          satSet.sccIndex[`${resp[i].sccNum}`] = resp[i].id;
          satSet.cosparIndex[`${resp[i].intlDes}`] = resp[i].id;
          resp[i].active = true;
          tempSatData.push(resp[i]);
        }
      }
    }
  }
  let extrasSatInfo;
  if (typeof extraSats !== 'undefined' && settingsManager.offline) {
    // If extra catalogue
    for (let s = 0; s < extraSats.length; s++) {
      if (typeof extraSats[s].SCC == 'undefined') continue;
      if (typeof extraSats[s].TLE1 == 'undefined') continue; // Don't Process Bad Satellite Information
      if (typeof extraSats[s].TLE2 == 'undefined') continue; // Don't Process Bad Satellite Information
      if (typeof satSet.sccIndex[`${extraSats[s].SCC}`] !== 'undefined') {
        i = satSet.sccIndex[`${extraSats[s].SCC}`];
        if (typeof tempSatData[i] === 'undefined') continue;
        tempSatData[i].TLE1 = extraSats[s].TLE1;
        tempSatData[i].TLE2 = extraSats[s].TLE2;
      } else {
        settingsManager.isExtraSatellitesAdded = true;

        year = extraSats[s].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
        prefix = parseInt(year) > 50 ? '19' : '20';
        year = prefix + year;
        rest = extraSats[s].TLE1.substr(9, 8).trim().substring(2);
        extrasSatInfo = {
          static: false,
          missile: false,
          active: true,
          name: extraSats[s].ON ? extraSats[s].ON : 'Unknown',
          type: extraSats[s].OT ? extraSats[s].OT : SpaceObjectType.SPECIAL,
          country: 'Unknown',
          rocket: 'Unknown',
          site: 'Unknown',
          sccNum: extraSats[s].SCC.toString(),
          TLE1: extraSats[s].TLE1,
          TLE2: extraSats[s].TLE2,
          source: 'USSF', // ASSUME USSF
          intlDes: year + '-' + rest,
          typ: 'sat',
          id: tempSatData.length,
          vmag: extraSats[s].vmag,
        };
        satSet.sccIndex[`${extraSats[s].SCC.toString()}`] = tempSatData.length;
        satSet.cosparIndex[`${year}-${rest}`] = tempSatData.length;
        tempSatData.push(extrasSatInfo);
      }
    }
  }
  let asciiSatInfo;
  if (asciiCatalog?.length > 0 && settingsManager.offline) {
    console.debug('Processing ASCII Catalog');
    // If asciiCatalog catalogue
    for (let s = 0; s < asciiCatalog.length; s++) {
      if (typeof asciiCatalog[s].TLE1 == 'undefined') continue; // Don't Process Bad Satellite Information
      if (typeof asciiCatalog[s].TLE2 == 'undefined') continue; // Don't Process Bad Satellite Information
      if (typeof satSet.sccIndex[`${asciiCatalog[s].SCC}`] !== 'undefined') {
        i = satSet.sccIndex[`${asciiCatalog[s].SCC}`];
        tempSatData[i].TLE1 = asciiCatalog[s].TLE1;
        tempSatData[i].TLE2 = asciiCatalog[s].TLE2;
      } else {
        if (typeof asciiCatalog[s].TLE1 == 'undefined') continue; // Don't Process Bad Satellite Information
        if (typeof asciiCatalog[s].TLE2 == 'undefined') continue; // Don't Process Bad Satellite Information
        settingsManager.isExtraSatellitesAdded = true;

        if (typeof asciiCatalog[s].ON == 'undefined') {
          asciiCatalog[s].ON = 'Unknown';
        }
        if (typeof asciiCatalog[s].OT == 'undefined') {
          asciiCatalog[s].OT = SpaceObjectType.SPECIAL;
        }
        year = asciiCatalog[s].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
        prefix = parseInt(year) > 50 ? '19' : '20';
        year = prefix + year;
        rest = asciiCatalog[s].TLE1.substr(9, 8).trim().substring(2);
        asciiSatInfo = {
          static: false,
          missile: false,
          active: true,
          name: asciiCatalog[s].ON,
          type: asciiCatalog[s].OT,
          country: 'Unknown',
          rocket: 'Unknown',
          site: 'Unknown',
          sccNum: asciiCatalog[s].SCC.toString(),
          TLE1: asciiCatalog[s].TLE1,
          TLE2: asciiCatalog[s].TLE2,
          source: 'USSF', // ASSUME USSF
          intlDes: year + '-' + rest,
          typ: 'sat',
          id: tempSatData.length,
        };
        satSet.sccIndex[`${asciiCatalog[s].SCC.toString()}`] = tempSatData.length;
        satSet.cosparIndex[`${year}-${rest}`] = tempSatData.length;
        tempSatData.push(asciiSatInfo);
      }
    }
  }

  let jsSatInfo;
  if (jsCatalog?.length > 0 && settingsManager.isUseExtendedCatalog) {
    console.debug('Processing js Catalog');
    // If jsCatalog catalogue
    for (let s = 0; s < jsCatalog.length; s++) {
      if (typeof jsCatalog[s].TLE1 == 'undefined') continue; // Don't Process Bad Satellite Information
      if (typeof jsCatalog[s].TLE2 == 'undefined') continue; // Don't Process Bad Satellite Information
      if (typeof satSet.sccIndex[`${jsCatalog[s].SCC}`] !== 'undefined') {
        // console.warn('Duplicate Satellite Found in jsCatalog');
        // NOTE: We don't trust the jsCatalog, so we don't update the TLEs

        // i = satSet.sccIndex[`${jsCatalog[s].SCC}`];
        // tempSatData[i].TLE1 = jsCatalog[s].TLE1;
        // tempSatData[i].TLE2 = jsCatalog[s].TLE2;
      } else {
        if (typeof jsCatalog[s].TLE1 == 'undefined') continue; // Don't Process Bad Satellite Information
        if (typeof jsCatalog[s].TLE2 == 'undefined') continue; // Don't Process Bad Satellite Information
        settingsManager.isExtraSatellitesAdded = true;

        year = jsCatalog[s].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
        prefix = parseInt(year) > 50 ? '19' : '20';
        year = prefix + year;
        rest = jsCatalog[s].TLE1.substr(9, 8).trim().substring(2);
        jsSatInfo = {
          static: false,
          missile: false,
          active: true,
          name: `${jsCatalog[s].source} ${jsCatalog[s].altId}`,
          type: SpaceObjectType.DEBRIS,
          country: 'Unknown',
          rocket: 'Unknown',
          site: 'Unknown',
          sccNum: jsCatalog[s].SCC.toString(),
          TLE1: jsCatalog[s].TLE1,
          TLE2: jsCatalog[s].TLE2,
          source: jsCatalog[s].source,
          altId: jsCatalog[s].altId,
          intlDes: year + '-' + rest,
          id: tempSatData.length,
        };
        satSet.sccIndex[`${jsCatalog[s].SCC.toString()}`] = tempSatData.length;
        satSet.cosparIndex[`${year}-${rest}`] = tempSatData.length;
        tempSatData.push(jsSatInfo);

        let notionalDebris = {
          id: 0,
          name: `${jsSatInfo.name} (1cm Notional)`,
          TLE1: jsSatInfo.TLE1,
          TLE2: jsSatInfo.TLE2,
          sccNum: '',
          type: SpaceObjectType.NOTIONAL,
          source: 'Notional',
          active: true,
        };  

        for (let i = 0; i < 6; i++) {
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
    }
  }

  if (settingsManager.isExtraSatellitesAdded) {
    try {
      (<HTMLElement>document.querySelector('.legend-pink-box')).style.display = 'block';
      document.querySelectorAll('.legend-pink-box').forEach((element) => {
        element.parentElement.style.display = 'none';
        element.parentElement.innerHTML = `<div class="Square-Box legend-pink-box"></div>${settingsManager.nameOfSpecialSats}`;
      });
    } catch (e) {
      // Intentionally Blank
    }
  }

  satSet.orbitalSats = tempSatData.length + settingsManager.maxAnalystSats;
  dotsManager.starIndex1 = objectManager.starIndex1 + satSet.orbitalSats;
  dotsManager.starIndex2 = objectManager.starIndex2 + satSet.orbitalSats;

  for (i = 0; i < objectManager.staticSet.length; i++) {
    objectManager.staticSet[i].id = tempSatData.length;
    tempSatData.push(objectManager.staticSet[i]);
  }
  for (i = 0; i < objectManager.analSatSet.length; i++) {
    objectManager.analSatSet[i].id = tempSatData.length;
    tempSatData.push(objectManager.analSatSet[i]);
  }

  // TODO: Planned feature
  // radarDataManager.satDataStartIndex = tempSatData.length + 1;

  for (i = 0; i < objectManager.radarDataSet.length; i++) {
    tempSatData.push(objectManager.radarDataSet[i]);
  }

  for (i = 0; i < objectManager.missileSet.length; i++) {
    tempSatData.push(objectManager.missileSet[i]);
  }

  satSet.missileSats = tempSatData.length; // This is the start of the missiles index

  for (i = 0; i < objectManager.fieldOfViewSet.length; i++) {
    objectManager.fieldOfViewSet[i].id = tempSatData.length;
    tempSatData.push(objectManager.fieldOfViewSet[i]);
  }

  satSet.satData = tempSatData;  
};

export const convertA5to6Digit = (sccNum: string): string => {
  if (sccNum[0].match(/[a-z]/iu)) {
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
};

export const init = (): void => {
  keepTrackApi.register({
    method: 'loadCatalog',
    cbName: 'catalogLoader',
    cb: catalogLoader,
  });
};
