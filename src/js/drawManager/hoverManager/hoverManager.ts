import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { getEl } from '@app/js/lib/helpers';
import { SatObject } from '../../api/keepTrackTypes';
import { SpaceObjectType } from '../../api/SpaceObjectType';
import { spaceObjType2Str } from '../../lib/spaceObjType2Str';

let satHoverBoxNode1: HTMLDivElement;
let satHoverBoxNode2: HTMLDivElement;
let satHoverBoxNode3: HTMLDivElement;
let satHoverBoxDOM: HTMLDivElement;

let currentSearchSats;
let updateHoverDelay = 0;
let updateHoverDelayLimit = 3;
let updateHoverSatId: number;

export const init = () => {
  // NOTE: Reusing these cached value causes the hover menu to get stuck on or off
  // when the user clicks on a satellite. You need to getElementById every time.
  satHoverBoxNode1 = <HTMLDivElement>(<unknown>getEl('sat-hoverbox1'));
  satHoverBoxNode2 = <HTMLDivElement>(<unknown>getEl('sat-hoverbox2'));
  satHoverBoxNode3 = <HTMLDivElement>(<unknown>getEl('sat-hoverbox3'));
  satHoverBoxDOM = <HTMLDivElement>(<unknown>getEl('sat-hoverbox'));
};
export const hoverOverNothing = () => {
  const { drawManager } = keepTrackApi.programs;
  satHoverBoxDOM = <HTMLDivElement>(<unknown>getEl('sat-hoverbox'));
  if (satHoverBoxDOM.style.display === 'none' || !settingsManager.enableHoverOverlay) return false;
  const { objectManager, starManager } = keepTrackApi.programs;
  if (objectManager.isStarManagerLoaded) {
    if (starManager.isConstellationVisible === true && !starManager.isAllConstellationVisible) starManager.clearConstellations();
  }

  satHoverBoxDOM.style.display = 'none';
  drawManager.canvas.style.cursor = 'default';
  drawManager.isHoverBoxVisible = false;
  return true;
};
export const hoverOverSomething = (satId: number, satX: number, satY: number) => {
  const { drawManager, mainCamera, satSet } = keepTrackApi.programs;
  if (!mainCamera.isDragging && settingsManager.enableHoverOverlay) {
    // NOTE: The radar mesurement logic breaks if you call it a SatObject

    const sat = <any>satSet.getSat(satId);
    drawManager.isHoverBoxVisible = true;    

    init();    

    if (sat.static || sat.isRadarData) {
      staticObj(sat);
    } else if (sat.missile) {
      missile(sat);
    } else if (sat.sccNum > 0) {
      satObj(sat);
    } else {
      staticObj(sat);
    }

    const style = {
      display: 'block',
      left: `${satX + 20}px`,
      top: `${satY - 10}px`,
    };
    Object.assign(satHoverBoxDOM.style, style);

    drawManager.canvas.style.cursor = 'pointer';
  }
};
export const staticObj = (sat: any) => {
  if (sat.type === SpaceObjectType.LAUNCH_FACILITY) {
    launchFacility(sat);
  } else if (sat.isRadarData) {
    // TODO: This is a broken mess but only used offline
    radarData(sat);
  } else if (sat.type === SpaceObjectType.CONTROL_FACILITY) {
    controlFacility(sat);
  } else if (sat.type === SpaceObjectType.STAR) {
    star(sat);
  } else {
    const { objectManager, satellite, satSet } = keepTrackApi.programs;
    satHoverBoxNode1.textContent = sat.name;
    satHoverBoxNode2.innerHTML = spaceObjType2Str(sat.type) + satellite.distance(sat, satSet.getSat(objectManager.selectedSat)) + '';
    satHoverBoxNode3.textContent = '';
  }
};
export const missile = (sat: SatObject) => {
  satHoverBoxNode1.innerHTML = sat.name + '<br >' + sat.desc + '';
  satHoverBoxNode2.textContent = '';
  satHoverBoxNode3.textContent = '';
};
export const satObj = (sat: SatObject) => {
  if (!settingsManager.enableHoverOverlay) return;
  const { drawManager, objectManager, satellite, sensorManager, satSet } = keepTrackApi.programs;
  // Use this as a default if no UI
  if (settingsManager.disableUI) {
    satHoverBoxNode1.textContent = sat.name;
    satHoverBoxNode2.textContent = sat.sccNum;
    satHoverBoxNode3.textContent = objectManager.extractCountry(sat.country);
  } else {
    if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].lat != null && settingsManager.isShowNextPass && drawManager.isShowDistance) {
      satHoverBoxNode1.textContent = sat.name;
      satHoverBoxNode2.textContent = sat.sccNum;
      satHoverBoxNode3.innerHTML = satellite.nextpass(sat) + satellite.distance(sat, satSet.getSat(objectManager.selectedSat)) + '';
    } else if (drawManager.isShowDistance) {
      satHoverBoxNode1.textContent = sat.name;
      drawManager.sat2 = satSet.getSat(objectManager.selectedSat);
      if (typeof drawManager.sat2 !== 'undefined' && drawManager.sat2 !== null && sat !== drawManager.sat2) {
        const ric = satellite.sat2ric(sat, drawManager.sat2);
        satHoverBoxNode2.innerHTML = `${sat.sccNum}`;
        satHoverBoxNode3.innerHTML =
          `R: ${ric.position[0].toFixed(2)}km I: ${ric.position[1].toFixed(2)}km C: ${ric.position[2].toFixed(2)}km</br>` +
          `ΔR: ${ric.velocity[0].toFixed(2)}km/s ΔI: ${ric.velocity[1].toFixed(2)}km/s ΔC: ${ric.velocity[2].toFixed(2)}km/s</br>`;
      } else {
        satHoverBoxNode2.innerHTML = `${sat.sccNum}${satellite.distance(sat, drawManager.sat2)}`;
        if (settingsManager.isEciOnHover) {
        satHoverBoxNode3.innerHTML =
          'X: ' +
          sat.position.x.toFixed(2) +
          ' km' +
          ' Y: ' +
          sat.position.y.toFixed(2) +
          ' km' +
          ' Z: ' +
          sat.position.z.toFixed(2) +
          ' km' +
          '</br>' +
          'XDot: ' +
          sat.velocity.x.toFixed(2) +
          ' km/s' +
          ' YDot: ' +
          sat.velocity.y.toFixed(2) +
          ' km/s' +
          ' ZDot: ' +
          sat.velocity.z.toFixed(2) +
          ' km/s';
        } else {
          satHoverBoxNode3.innerHTML = '';
        }
      }
    } else if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].lat != null && settingsManager.isShowNextPass) {
      satHoverBoxNode1.textContent = sat.name;
      satHoverBoxNode2.textContent = sat.sccNum;
      satHoverBoxNode3.textContent = satellite.nextpass(sat);
    } else {
      satHoverBoxNode1.textContent = sat.name;
      satHoverBoxNode2.textContent = sat.sccNum;
      if (settingsManager.isEciOnHover) {
        satHoverBoxNode3.innerHTML =
        'X: ' +
        sat.position.x.toFixed(2) +
        ' Y: ' +
        sat.position.y.toFixed(2) +
        ' Z: ' +
        sat.position.z.toFixed(2) +
        '</br>X: ' +
        sat.velocity.x.toFixed(2) +
        ' Y: ' +
        sat.velocity.y.toFixed(2) +
        ' Z: ' +
        sat.velocity.z.toFixed(2);
      } else {
        satHoverBoxNode3.innerHTML = '';
      }
    }
  }
};
export const radarData = (sat: any) => {
  const { satellite, sensorManager, timeManager } = keepTrackApi.programs;

  satHoverBoxNode1.innerHTML = 'Measurement: ' + sat.mId + '</br>Track: ' + sat.trackId + '</br>Object: ' + sat.objectId;
  if (sat.missileComplex !== -1) {
    satHoverBoxNode1.insertAdjacentHTML('beforeend', '</br>Missile Complex: ' + sat.missileComplex);
    satHoverBoxNode1.insertAdjacentHTML('beforeend', '</br>Missile Object: ' + sat.missileObject);
  }
  if (parseInt(sat.sccNum) !== -1) satHoverBoxNode1.insertAdjacentHTML('beforeend', '</br>Satellite: ' + sat.sccNum);
  if (typeof sat.rae == 'undefined' && sensorManager.currentSensor !== sensorManager.defaultSensor) {
    sat.rae = satellite.eci2Rae(sat.t, sat.position, sensorManager.currentSensor[0]);
    sat.setRAE(sat.rae);
  }
  if (sensorManager.currentSensor !== sensorManager.defaultSensor) {
    let measurementDate = new Date(sat.t);
    satHoverBoxNode2.innerHTML =
      `JDAY: ${timeManager.getDayOfYear(measurementDate)} - ${measurementDate.toLocaleString('en-GB', { timeZone: 'UTC' }).slice(-8)}` +
      '</br>' +
      'R: ' +
      sat.rae.range.toFixed(2) +
      ' A: ' +
      sat.rae.az.toFixed(2) +
      ' E: ' +
      sat.rae.el.toFixed(2);
  } else {
    let measurementDate = new Date(sat.t);
    satHoverBoxNode2.innerHTML = `JDAY: ${timeManager.getDayOfYear(measurementDate)} - ${measurementDate.toLocaleString('en-GB', { timeZone: 'UTC' }).slice(-8)}`;
  }
  satHoverBoxNode3.innerHTML =
    'RCS: ' +
    parseFloat(sat.rcs).toFixed(2) +
    ' m^2 (' +
    (10 ** (parseFloat(sat.rcs) / 10)).toFixed(2) +
    ' dBsm)</br>Az Error: ' +
    sat.azError.toFixed(2) +
    '° El Error: ' +
    sat.elError.toFixed(2) +
    '°';
};
export const launchFacility = (sat: SatObject) => {
  const { objectManager, satellite, satSet } = keepTrackApi.programs;
  let launchSite = objectManager.extractLaunchSite(sat.name);
  satHoverBoxNode1.textContent = launchSite.site + ', ' + launchSite.sitec;
  satHoverBoxNode2.innerHTML = spaceObjType2Str(sat.type) + satellite.distance(sat, satSet.getSat(objectManager.selectedSat)) + '';
  satHoverBoxNode3.textContent = '';
};
export const controlFacility = (sat: SatObject) => {
  const { objectManager, satellite, satSet } = keepTrackApi.programs;
  satHoverBoxNode1.textContent = sat.name;
  satHoverBoxNode2.innerHTML = sat.country + satellite.distance(sat, satSet.getSat(objectManager.selectedSat)) + '';
  satHoverBoxNode3.textContent = '';
};
export const star = (sat: SatObject) => {
  const { starManager, objectManager } = keepTrackApi.programs;
  const constellationName = starManager.findStarsConstellation(sat.name);
  if (constellationName !== null) {
    satHoverBoxNode1.innerHTML = sat.name + '</br>' + constellationName;
  } else {
    satHoverBoxNode1.textContent = sat.name;
  }
  satHoverBoxNode2.innerHTML = 'Star';
  satHoverBoxNode3.innerHTML = 'RA: ' + sat.ra.toFixed(3) + ' deg </br> DEC: ' + sat.dec.toFixed(3) + ' deg';
  if (objectManager.lasthoveringSat !== sat.id && typeof sat !== 'undefined' && constellationName !== null) {
    starManager.drawConstellations(constellationName);
  }
};
export const planetariumView = (satId: number) => {
  const { drawManager, mainCamera } = keepTrackApi.programs;
  if (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && !settingsManager.isDemoModeOn) {
    satHoverBoxDOM.style.display = 'none';
    drawManager.canvas.style.cursor = satId === -1 ? 'default' : 'pointer';
    return true;
  }
  return false;
};
export const hoverBoxOnSat = (satId: number, satX: number, satY: number) => {  
  if (typeof satHoverBoxDOM === 'undefined' || satHoverBoxDOM === null) return;

  if (planetariumView(satId)) return;

  if (satId === -1) {
    hoverOverNothing();
  } else {
    hoverOverSomething(satId, satX, satY);
  }
};
// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
export const updateHover = () => { // NOSONAR
  const { drawManager, mainCamera, orbitManager, uiManager, searchBox, satSet, timeManager } = keepTrackApi.programs;  

  if (searchBox.isResultBoxOpen() && !settingsManager.disableUI && !settingsManager.lowPerf) {
    currentSearchSats = searchBox.getLastResultGroup();
    if (typeof currentSearchSats !== 'undefined') {
      currentSearchSats = currentSearchSats['sats'];
      if (drawManager.updateHoverI >= currentSearchSats.length) drawManager.updateHoverI = 0;
      for (let i = 0; drawManager.updateHoverI < currentSearchSats.length && i < 5; drawManager.updateHoverI++, i++) {
        orbitManager.updateOrbitBuffer(currentSearchSats[drawManager.updateHoverI].satId);
      }
    }
  }
  if (!settingsManager.disableUI && searchBox.isHovering()) {
    updateHoverSatId = uiManager.searchBox.getHoverSat();
    const satScreenPositionArray = satSet.getScreenCoords(updateHoverSatId, drawManager.pMatrix, mainCamera.camMatrix);
    try {
      hoverBoxOnSat(updateHoverSatId, satScreenPositionArray.x, satScreenPositionArray.y);
    } catch (e) {
      // Intentionally Empty
    }
  } else {
    // gl.readPixels in uiInput.getSatIdFromCoord creates a lot of jank
    // Earlier in the loop we decided how much to throttle updateHover
    // if we skip it this loop, we want to still draw the last thing
    // it was looking at

    if (1000 / timeManager.dt < 15) {
      updateHoverDelayLimit = settingsManager.updateHoverDelayLimitBig;
    } else if (1000 / timeManager.dt < 30) {
      updateHoverDelayLimit = settingsManager.updateHoverDelayLimitSmall;
    } else {
      if (updateHoverDelayLimit > 0) --updateHoverDelayLimit;
    }

    if (mainCamera.isDragging || settingsManager.isMobileModeEnabled) return;

    if (++updateHoverDelay >= updateHoverDelayLimit) {
      updateHoverDelay = 0;
      uiManager.uiInput.mouseSat = uiManager.uiInput.getSatIdFromCoord(mainCamera.mouseX, mainCamera.mouseY);
    }

    if (settingsManager.enableHoverOrbits) {
      if (uiManager.uiInput.mouseSat !== -1 && keepTrackApi.programs.satSet.satData[uiManager.uiInput.mouseSat].type !== SpaceObjectType.STAR) {
        orbitManager.setHoverOrbit(uiManager.uiInput.mouseSat);
      } else {
        orbitManager.clearHoverOrbit();
      }
      satSet.setHover(uiManager.uiInput.mouseSat);
    }
    if (settingsManager.enableHoverOverlay) {
      hoverBoxOnSat(uiManager.uiInput.mouseSat, mainCamera.mouseX, mainCamera.mouseY);
    }
  }
};

export const hoverManager = {
  init,
  updateHover,
};
