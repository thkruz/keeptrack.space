// Deprecated
// ------------------------
// Plan is to remove this functionality

import $ from 'jquery';
let M = window.M;

var uiLimited = {};
var satSet, orbitManager, groupsManager, ColorScheme;
/* istanbul ignore next */
uiLimited.init = async (satSetRef, orbitManagerRef, groupsManagerRef, ColorSchemeRef) => {
  satSet = satSetRef;
  orbitManager = orbitManagerRef;
  groupsManager = groupsManagerRef;
  ColorScheme = ColorSchemeRef;

  if (document.getElementById('keeptrack-canvas').tagName !== 'CANVAS') {
    console.warn('There is no canvas with id "keeptrack-canvas!!!"');
    console.log('Here is a list of canvas found:');
    console.log(document.getElementsByTagName('canvas'));
    if (document.getElementById('keeptrack-canvas').tagName == 'DIV') {
      console.warn('There IS a div with id "keeptrack-canvas"!!!');
    }
  } else {
    console.log('Found the keeptrack canvas:');
    console.log(document.getElementById('keeptrack-canvas'));
  }

  // Add Required DOMs
  document.getElementById('keeptrack-canvas').parentElement.innerHTML += `
  <div id="countries-btn">
  </div>
  <div id="orbit-btn">
  </div>
  <div id="time-machine-btn">
  </div>`;
  $(document).ready(function () {
    M.AutoInit();
    var countriesBtnDOM = $('#countries-btn');
    countriesBtnDOM.on('click', function () {
      if (settingsManager.currentColorScheme == ColorScheme.countries) {
        satSet.setColorScheme(ColorScheme.default);
      } else {
        satSet.setColorScheme(ColorScheme.countries);
      }
    });
    var orbitBtnDOM = $('#orbit-btn');
    settingsManager.isOrbitOverlayVisible = false;
    orbitBtnDOM.on('click', function () {
      if (!settingsManager.isOrbitOverlayVisible) {
        orbitManager.isTimeMachineVisible = false;
        isTimeMachine = false;
        groupsManager.debris = groupsManager.createGroup('all', '');
        groupsManager.selectGroup(groupsManager.debris, orbitManager);
        // satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
        // groupsManager.debris.updateOrbits(orbitManager);
        settingsManager.isOrbitOverlayVisible = true;
      } else {
        orbitManager.isTimeMachineVisible = false;
        isTimeMachine = false;
        groupsManager.clearSelect();
        orbitManager.clearHoverOrbit();
        satSet.setColorScheme(ColorScheme.default, true);
        settingsManager.isOrbitOverlayVisible = false;
      }
    });
    var timeMachineDOM = $('#time-machine-btn');
    var isTimeMachine = false;
    timeMachineDOM.on('click', function () {
      if (isTimeMachine) {
        isTimeMachine = false;
        // Merge to one variable?
        orbitManager.isTimeMachineRunning = false;
        orbitManager.isTimeMachineVisible = false;

        settingsManager.colors.transparent = orbitManager.tempTransColor;
        groupsManager.clearSelect();
        satSet.setColorScheme(ColorScheme.default, true); // force color recalc

        $('#menu-time-machine').removeClass('bmenu-item-selected');
      } else {
        // Merge to one variable?
        orbitManager.isTimeMachineRunning = true;
        orbitManager.isTimeMachineVisible = true;
        $('#menu-time-machine').addClass('bmenu-item-selected');
        orbitManager.historyOfSatellitesPlay();
        isTimeMachine = true;
      }
    });
  });
};

export { uiLimited };
