import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatCruncherMessage } from '@app/js/api/keepTrackTypes';
import { getEl } from '@app/js/lib/helpers';

export const cruncherExtraData = (m: SatCruncherMessage) => {
  if (!m.data?.extraData) throw new Error('extraData required!');
  const { satSet } = keepTrackApi.programs;

  const satExtraData = JSON.parse(m.data.extraData);

  for (let satCrunchIndex = 0; satCrunchIndex < satSet.numSats; satCrunchIndex++) {
    if (typeof satSet.satData === 'undefined') throw new Error('No sat data');
    if (typeof satExtraData === 'undefined') throw new Error('No extra data');
    if (typeof satExtraData[satCrunchIndex] === 'undefined') throw new Error('No extra data for sat ' + satCrunchIndex);
    if (typeof satSet.satData[satCrunchIndex] === 'undefined') throw new Error('No data for sat ' + satCrunchIndex);

    try {
      satSet.satData[satCrunchIndex].inclination = satExtraData[satCrunchIndex].inclination;
      satSet.satData[satCrunchIndex].eccentricity = satExtraData[satCrunchIndex].eccentricity;
      satSet.satData[satCrunchIndex].raan = satExtraData[satCrunchIndex].raan;
      satSet.satData[satCrunchIndex].argPe = satExtraData[satCrunchIndex].argPe;
      satSet.satData[satCrunchIndex].meanMotion = satExtraData[satCrunchIndex].meanMotion;

      satSet.satData[satCrunchIndex].semiMajorAxis = satExtraData[satCrunchIndex].semiMajorAxis;
      satSet.satData[satCrunchIndex].semiMinorAxis = satExtraData[satCrunchIndex].semiMinorAxis;
      satSet.satData[satCrunchIndex].apogee = satExtraData[satCrunchIndex].apogee;
      satSet.satData[satCrunchIndex].perigee = satExtraData[satCrunchIndex].perigee;
      satSet.satData[satCrunchIndex].period = satExtraData[satCrunchIndex].period;
      satSet.satData[satCrunchIndex].velocity = { total: 0, x: 0, y: 0, z: 0 };
    } catch (error) {
      // Intentionally left blank
    }
  }

  satSet.gotExtraData = true;
};
export const cruncherExtraUpdate = (m: SatCruncherMessage) => {
  if (!m.data?.extraUpdate) throw new Error('extraUpdate required!');
  const { satSet } = keepTrackApi.programs;
  const satExtraData = JSON.parse(m.data.extraData);
  const satCrunchIndex = m.data.satId;

  satSet.satData[satCrunchIndex].inclination = satExtraData[0].inclination;
  satSet.satData[satCrunchIndex].eccentricity = satExtraData[0].eccentricity;
  satSet.satData[satCrunchIndex].raan = satExtraData[0].raan;
  satSet.satData[satCrunchIndex].argPe = satExtraData[0].argPe;
  satSet.satData[satCrunchIndex].meanMotion = satExtraData[0].meanMotion;

  satSet.satData[satCrunchIndex].semiMajorAxis = satExtraData[0].semiMajorAxis;
  satSet.satData[satCrunchIndex].semiMinorAxis = satExtraData[0].semiMinorAxis;
  satSet.satData[satCrunchIndex].apogee = satExtraData[0].apogee;
  satSet.satData[satCrunchIndex].perigee = satExtraData[0].perigee;
  satSet.satData[satCrunchIndex].period = satExtraData[0].period;
  satSet.satData[satCrunchIndex].TLE1 = satExtraData[0].TLE1;
  satSet.satData[satCrunchIndex].TLE2 = satExtraData[0].TLE2;
};

// prettier-ignore
export const cruncherDotsManagerInteraction = (m: SatCruncherMessage) => { // NOSONAR
  const { dotsManager, satSet } = keepTrackApi.programs;
  if (typeof dotsManager.positionData == 'undefined') {
    dotsManager.positionData = new Float32Array(m.data.satPos);
  } else {
    dotsManager.positionData.set(m.data.satPos, 0);
  }

  if (typeof dotsManager.velocityData == 'undefined') {
    dotsManager.velocityData = new Float32Array(m.data.satVel);
  } else {
    dotsManager.velocityData.set(m.data.satVel, 0);
  }

  if (typeof m.data?.satInView != 'undefined' && m.data?.satInView.length > 0) {
    if (typeof dotsManager.inViewData == 'undefined' || dotsManager.inViewData.length !== m.data.satInView.length) {
      dotsManager.inViewData = new Int8Array(m.data.satInView);
    } else {
      dotsManager.inViewData.set(m.data.satInView, 0);
    }
  }

  if (typeof m.data?.satInSun != 'undefined' && m.data?.satInSun.length > 0) {
    if (typeof dotsManager.inSunData == 'undefined' || dotsManager.inSunData.length !== m.data.satInSun.length) {
      dotsManager.inSunData = new Int8Array(m.data.satInSun);
    } else {
      dotsManager.inSunData.set(m.data.satInSun, 0);
    }
  }

  if (typeof m.data?.sensorMarkerArray != 'undefined' && m.data?.sensorMarkerArray?.length !== 0) {
    satSet.satSensorMarkerArray = m.data.sensorMarkerArray;
  }

  const highestMarkerNumber = satSet.satSensorMarkerArray?.[satSet.satSensorMarkerArray?.length - 1] || 0;
  settingsManager.dotsOnScreen = Math.max(satSet.numSats - settingsManager.maxFieldOfViewMarkers, highestMarkerNumber);
};
export const getVariableSearch = (params: string[]) => {
  const { uiManager, searchBox } = keepTrackApi.programs;
  for (let i = 0; i < params.length; i++) {
    const key = params[i].split('=')[0];
    const val = params[i].split('=')[1];
    if (key == 'search') {
      if (!settingsManager.disableUI) {
        uiManager.doSearch(val);
        if (settingsManager.lastSearchResults.length == 0) {
          uiManager.toast(`Search for "${val}" found nothing!`, 'caution', true);
          searchBox.hideResults();
        }
      }
    }
  }
};
export const getVariableActions = (params: string[]) => {
  // NOSONAR
  const { timeManager, objectManager, uiManager, satSet } = keepTrackApi.programs;
  for (let i = 0; i < params.length; i++) {
    const key = params[i].split('=')[0];
    let val = params[i].split('=')[1];
    let urlSatId: number;
    switch (key) {
      case 'intldes':
        urlSatId = satSet.getIdFromIntlDes(val.toUpperCase());
        if (urlSatId !== null) {
          objectManager.setSelectedSat(urlSatId);
        } else {
          uiManager.toast(`International Designator "${val.toUpperCase()}" was not found!`, 'caution', true);
        }
        break;
      case 'sat':
        urlSatId = satSet.getIdFromObjNum(parseInt(val));
        if (urlSatId !== null) {
          objectManager.setSelectedSat(urlSatId);
        } else {
          uiManager.toast(`Satellite "${val.toUpperCase()}" was not found!`, 'caution', true);
        }
        break;
      case 'misl':
        var subVal = val.split(',');
        (<HTMLSelectElement>getEl('ms-type')).value = subVal[0].toString();
        (<HTMLSelectElement>getEl('ms-attacker')).value = subVal[1].toString();
        (<HTMLSelectElement>getEl('ms-target')).value = subVal[2].toString();
        (<HTMLButtonElement>getEl('missile')).click();
        break;
      case 'date':
        if (isNaN(parseInt(val))) {
          uiManager.toast(`Date value of "${val}" is not a proper unix timestamp!`, 'caution', true);
          break;
        }
        timeManager.changeStaticOffset(Number(val) - Date.now());
        break;
      case 'rate':
        var rate = parseFloat(val);
        if (isNaN(rate)) {
          uiManager.toast(`Propagation rate of "${rate}" is not a valid float!`, 'caution', true);
          break;
        }
        rate = Math.min(rate, 1000);
        // could run time backwards, but let's not!
        rate = Math.max(rate, 0.0);
        timeManager.changePropRate(Number(rate));
        break;
    }
  }
};
export const parseGetVariables = (): void => {
  const { satSet } = keepTrackApi.programs;
  // do querystring stuff
  const params = satSet.queryStr.split('&');

  // Do Searches First
  getVariableSearch(params);

  // Then Do Other Stuff
  getVariableActions(params);
};
export const satCruncherOnMessage = (m: SatCruncherMessage) => {
  const { mainCamera, sensorManager, objectManager, uiManager, satSet } = keepTrackApi.programs;
  // store extra data that comes from crunching
  // Only do this once
  if (!satSet.gotExtraData && m.data?.extraData) {
    cruncherExtraData(m);
    return;
  }

  if (m.data?.extraUpdate) {
    cruncherExtraUpdate(m);
    return;
  }

  cruncherDotsManagerInteraction(m);

  // Run any callbacks for a normal position cruncher message
  keepTrackApi.methods.onCruncherMessage();

  // Don't force color recalc if default colors and no sensor for inview color
  if ((objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].lat != null) || settingsManager.isForceColorScheme) {
    // Don't change colors while dragging
    if (!mainCamera.isDragging) {
      // TODO: SLOW!
      satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
    }
  }

  // Only do this once after satSet.satData is ready
  if (!settingsManager.cruncherReady && typeof satSet.satData !== 'undefined') {
    satSet.onCruncherReady();
    if (!settingsManager.disableUI) {
      uiManager.reloadLastSensor();
    }

    parseGetVariables();

    // Run any functions registered with the API
    keepTrackApi.methods.onCruncherReady();

    settingsManager.cruncherReady = true;
  }
};
export const onCruncherReady = () => {
  const { uiManager, satSet } = keepTrackApi.programs;
  satSet.queryStr = window.location?.search?.substring(1) || '';
  uiManager.hideLoadingScreen();
};
