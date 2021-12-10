import { SatObject } from '@app/js/api/keepTrack';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { stringPad } from '@app/js/lib/helpers';

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
export const catalogLoader = async (): Promise<any> => {
  const settingsManager: any = window.settingsManager;
  // let extraSats: any;

  // See if we are running jest right now for testing
  // if (typeof process !== 'undefined') {
  //   try {
  //     await import('@app/offline/extra.js').then((resp) => {
  //       extraSats = resp.satelliteList;
  //     });
  //     const satData = await import('@app/offline/tle.js').then((resp) => {
  //       parseCatalog(resp.jsTLEfile, extraSats);
  //     });
  //     return satData;
  //   } catch (error) {
  //     console.debug(error);
  //   }
  // }

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
    // console.debug(e);
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
  resp = null; // Force Garbage Collection

  /** Send satDataString to satCruncher to begin propagation loop */
  satSet.satCruncher.postMessage({
    typ: 'satdata',
    dat: JSON.stringify(satSet.satData),
    fieldOfViewSetLength: objectManager.fieldOfViewSet.length,
    isLowPerf: settingsManager.lowPerf,
  });
};

export const setupGetVariables = () => {
  const { satSet, timeManager } = keepTrackApi.programs;
  let obslatitude;
  let obslongitude;
  let obsheight;
  let obsminaz;
  let obsmaxaz;
  let obsminel;
  let obsmaxel;
  let obsminrange;
  let obsmaxrange;
  let limitSatsArray: string[] = [];
  /** Parses GET variables for SatCruncher initialization */
  // This should be somewhere else!!
  const queryStr = window.location.search.substring(1);
  const params = queryStr.split('&');
  for (let i = 0; i < params.length; i++) {
    const key = params[i].split('=')[0];
    const val = params[i].split('=')[1];
    switch (key) {
      case 'limitSats':
        (<any>settingsManager).limitSats = val;
        $('#limitSats').val(val);
        // document.getElementById('settings-limitSats-enabled').checked = true;
        $('#limitSats-Label').addClass('active');
        limitSatsArray = val.split(',');
        break;
    }
  }

  // Make sure everyone agrees on what time it is
  timeManager.synchronize();

  satSet.satCruncher.postMessage({
    setlatlong: true,
    lat: obslatitude,
    lon: obslongitude,
    alt: obsheight,
    obsminaz: obsminaz,
    obsmaxaz: obsmaxaz,
    obsminel: obsminel,
    obsmaxel: obsmaxel,
    obsminrange: obsminrange,
    obsmaxrange: obsmaxrange,
  });

  return limitSatsArray;
};

export const filterTLEDatabase = (resp: SatObject[], limitSatsArray?: string | any[], extraSats?: string | any[], asciiCatalog?: string | any[]) => {
  const { dotsManager, objectManager, satSet } = keepTrackApi.programs;

  const tempSatData = [];

  satSet.sccIndex = <{ [key: string]: number }>{};
  satSet.cosparIndex = <{ [key: string]: number }>{};

  if (typeof limitSatsArray === 'undefined' || limitSatsArray.length == 0 || limitSatsArray[0] == null) {
    // If there are no limits then just process like normal
    (<any>settingsManager).limitSats = '';
  }

  let year;
  let prefix;
  let rest;

  let i = 0;
  for (i = 0; i < resp.length; i++) {
    resp[i].SCC_NUM = stringPad.pad0(resp[i].TLE1.substr(2, 5).trim(), 5);
    if ((<any>settingsManager).limitSats === '') {
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
      satSet.sccIndex[`${resp[i].SCC_NUM}`] = resp[i].id;
      satSet.cosparIndex[`${resp[i].intlDes}`] = resp[i].id;
      resp[i].active = true;
      tempSatData.push(resp[i]);
      continue;
    } else {
      // If there are limited satellites
      for (let x = 0; x < limitSatsArray.length; x++) {
        if (resp[i].SCC_NUM === limitSatsArray[x].SCC_NUM) {
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
          satSet.sccIndex[`${resp[i].SCC_NUM}`] = resp[i].id;
          satSet.cosparIndex[`${resp[i].intlDes}`] = resp[i].id;
          resp[i].active = true;
          tempSatData.push(resp[i]);
        }
      }
    }
  }
  let extrasSatInfo;
  if (typeof extraSats !== 'undefined' && (<any>settingsManager).offline) {
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
        (<any>settingsManager).isExtraSatellitesAdded = true;

        if (typeof extraSats[s].ON == 'undefined') {
          extraSats[s].ON = 'Unknown';
        }
        if (typeof extraSats[s].OT == 'undefined') {
          extraSats[s].OT = 4;
        }
        year = extraSats[s].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
        prefix = year > 50 ? '19' : '20';
        year = prefix + year;
        rest = extraSats[s].TLE1.substr(9, 8).trim().substring(2);
        extrasSatInfo = {
          static: false,
          missile: false,
          active: true,
          ON: extraSats[s].ON,
          OT: extraSats[s].OT,
          C: 'Unknown',
          LV: 'Unknown',
          LS: 'Unknown',
          SCC_NUM: extraSats[s].SCC.toString(),
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
    extraSats = null;
  }
  let asciiSatInfo;
  if (typeof asciiCatalog !== 'undefined' && (<any>settingsManager).offline) {
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
        (<any>settingsManager).isExtraSatellitesAdded = true;

        if (typeof asciiCatalog[s].ON == 'undefined') {
          asciiCatalog[s].ON = 'Unknown';
        }
        if (typeof asciiCatalog[s].OT == 'undefined') {
          asciiCatalog[s].OT = 4;
        }
        year = asciiCatalog[s].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
        prefix = year > 50 ? '19' : '20';
        year = prefix + year;
        rest = asciiCatalog[s].TLE1.substr(9, 8).trim().substring(2);
        asciiSatInfo = {
          static: false,
          missile: false,
          active: true,
          ON: asciiCatalog[s].ON,
          OT: asciiCatalog[s].OT,
          C: 'Unknown',
          LV: 'Unknown',
          LS: 'Unknown',
          SCC_NUM: asciiCatalog[s].SCC.toString(),
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
    asciiCatalog = null;
  }

  if ((<any>settingsManager).isExtraSatellitesAdded) {
    $('.legend-pink-box').show();
    try {
      $('.legend-trusat-box')[1].parentElement.style.display = '';
      $('.legend-trusat-box')[2].parentElement.style.display = '';
      $('.legend-trusat-box')[3].parentElement.style.display = '';
      $('.legend-trusat-box')[1].parentElement.innerHTML = `<div class="Square-Box legend-trusat-box"></div>${(<any>settingsManager).nameOfSpecialSats}`;
      $('.legend-trusat-box')[2].parentElement.innerHTML = `<div class="Square-Box legend-trusat-box"></div>${(<any>settingsManager).nameOfSpecialSats}`;
      $('.legend-trusat-box')[3].parentElement.innerHTML = `<div class="Square-Box legend-trusat-box"></div>${(<any>settingsManager).nameOfSpecialSats}`;
    } catch (e) {
      // Intentionally Blank
    }
  }

  satSet.orbitalSats = tempSatData.length;
  dotsManager.starIndex1 = objectManager.starIndex1 + satSet.orbitalSats;
  dotsManager.starIndex2 = objectManager.starIndex2 + satSet.orbitalSats;

  if ((<any>settingsManager).isEnableGsCatalog) satSet.initGsData();

  for (i = 0; i < objectManager.staticSet.length; i++) {
    objectManager.staticSet[i].id = tempSatData.length;
    tempSatData.push(objectManager.staticSet[i]);
  }
  for (i = 0; i < objectManager.analSatSet.length; i++) {
    objectManager.analSatSet[i].id = tempSatData.length;
    tempSatData.push(objectManager.analSatSet[i]);
  }

  // radarDataManager.satDataStartIndex = tempSatData.length + 1;

  for (let i = 0; i < objectManager.radarDataSet.length; i++) {
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
  // console.log(tempSatData.length);
  return tempSatData;
};

export const init = (): void => {
  keepTrackApi.register({
    method: 'loadCatalog',
    cbName: 'catalogLoader',
    cb: catalogLoader,
  });
};
