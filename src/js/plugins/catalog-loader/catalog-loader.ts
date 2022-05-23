import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
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
    if (settingsManager.offline) {
      $.get(`${settingsManager.installDirectory}tle/extra.json`).then((resp) => {
        extraSats = JSON.parse(resp);
      });
    }

    const asciiCatalog: { SCC: string; TLE1: any; TLE2: any }[] = [];
    if (!settingsManager.isDisableAsciiCatalog) {
      $.get(`${settingsManager.installDirectory}tle/TLE.txt`).then((resp) => {
        const content = resp.split('\n');
        for (let i = 0; i < content.length; i = i + 2) {
          asciiCatalog.push({
            SCC: stringPad.pad0(content[i].substr(2, 5).trim(), 5),
            TLE1: content[i],
            TLE2: content[i + 1],
          });
        }
      });
    }

    if (settingsManager.isUseDebrisCatalog) {
      await $.get(`${settingsManager.installDirectory}tle/TLEdebris.json`).then((resp) => parseCatalog(resp, extraSats, asciiCatalog));
    } else {
      await $.get(`${settingsManager.installDirectory}tle/TLE2.json`).then((resp) => parseCatalog(resp, extraSats, asciiCatalog));
    }
  } catch (e) {
    // Intentionally left blank
  }
};

// Parse the Catalog from satSet.loadCatalog and then return it back -- they are chained together!
export const parseCatalog = (resp: any, extraSats?: any, asciiCatalog?: any) => {
  const { satSet, objectManager } = keepTrackApi.programs;
  const settingsManager: any = window.settingsManager;

  const limitSatsArray = setupGetVariables();

  // Filter TLEs
  // SatCruncher will use this when it returns so we need to expose it now
  if (typeof resp === 'string') resp = JSON.parse(resp);
  satSet.satData = filterTLEDatabase(resp, limitSatsArray, extraSats, asciiCatalog);
  satSet.numSats = satSet.satData.length;

  /** Send satDataString to satCruncher to begin propagation loop */
  satSet.satCruncher.postMessage({
    typ: 'satdata',
    dat: JSON.stringify(satSet.satData),
    fieldOfViewSetLength: objectManager.fieldOfViewSet.length,
    isLowPerf: settingsManager.lowPerf,
  });
};

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

export const filterTLEDatabase = (resp: SatObject[], limitSatsArray?: any[], extraSats?: any[], asciiCatalog?: any[]) => {
  // NOSONAR
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

  let i = 0;
  for (i; i < resp.length; i++) {
    resp[i].sccNum = stringPad.pad0(resp[i].TLE1.substr(2, 5).trim(), 5);
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
      resp[i].id = i;
      satSet.sccIndex[`${resp[i].sccNum}`] = resp[i].id;
      satSet.cosparIndex[`${resp[i].intlDes}`] = resp[i].id;
      resp[i].active = true;
      tempSatData.push(resp[i]);
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
        if (typeof extraSats[s].ON != 'undefined') tempSatData[i].ON = extraSats[s].ON;
        if (typeof extraSats[s].OT != 'undefined') tempSatData[i].OT = extraSats[s].OT;
        tempSatData[i].TLE1 = extraSats[s].TLE1;
        tempSatData[i].TLE2 = extraSats[s].TLE2;
      } else {
        if (typeof extraSats[s].TLE1 == 'undefined') continue; // Don't Process Bad Satellite Information
        if (typeof extraSats[s].TLE2 == 'undefined') continue; // Don't Process Bad Satellite Information
        settingsManager.isExtraSatellitesAdded = true;

        if (typeof extraSats[s].ON == 'undefined') {
          extraSats[s].ON = 'Unknown';
        }
        if (typeof extraSats[s].OT == 'undefined') {
          extraSats[s].OT = 4;
        }
        year = extraSats[s].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
        prefix = parseInt(year) > 50 ? '19' : '20';
        year = prefix + year;
        rest = extraSats[s].TLE1.substr(9, 8).trim().substring(2);
        extrasSatInfo = {
          static: false,
          missile: false,
          active: true,
          name: extraSats[s].ON,
          type: extraSats[s].OT,
          country: 'Unknown',
          rocket: 'Unknown',
          site: 'Unknown',
          sccNum: extraSats[s].SCC.toString(),
          TLE1: extraSats[s].TLE1,
          TLE2: extraSats[s].TLE2,
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
          asciiCatalog[s].OT = 4;
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

  satSet.orbitalSats = tempSatData.length;
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

  satSet.missileSats = tempSatData.length;

  for (i = 0; i < objectManager.fieldOfViewSet.length; i++) {
    objectManager.fieldOfViewSet[i].id = tempSatData.length;
    tempSatData.push(objectManager.fieldOfViewSet[i]);
  }

  return tempSatData;
};

export const init = (): void => {
  keepTrackApi.register({
    method: 'loadCatalog',
    cbName: 'catalogLoader',
    cb: catalogLoader,
  });
};
