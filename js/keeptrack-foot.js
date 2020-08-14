if (settingsManager.disableUI && settingsManager.enableLimitedUI) {
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
  document.getElementById('keeptrack-canvas').parentElement.innerHTML +=`
  <div id="countries-btn">
  </div>
  <div id="orbit-btn">
  </div>
  <div id="time-machine-btn">
  </div>
  <div id="sat-hoverbox">
    <span id="sat-hoverbox1"></span>
    <br/>
    <span id="sat-hoverbox2"></span>
    <br/>
    <span id="sat-hoverbox3"></span>
  </div>`;
  $(document).ready(function () {
    var countriesBtnDOM = $('#countries-btn');
    countriesBtnDOM.on('click', function(){
      if (settingsManager.currentColorScheme == ColorScheme.countries) {
        satSet.setColorScheme(ColorScheme.default);
      } else {
        satSet.setColorScheme(ColorScheme.countries);
      }
    });
    var orbitBtnDOM = $('#orbit-btn');
    var isOrbitOverlay = false;
    orbitBtnDOM.on('click', function(){
      if (!isOrbitOverlay) {
        orbitManager.isTimeMachineVisible = false;
        isTimeMachine = false;
        groups.debris = new groups.SatGroup('all', '');
        groups.selectGroup(groups.debris);
        satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
        groups.debris.updateOrbits();
        isOrbitOverlay = true;
      } else {
        orbitManager.isTimeMachineVisible = false;
        isTimeMachine = false;
        groups.clearSelect();
        orbitManager.clearHoverOrbit();
        satSet.setColorScheme(ColorScheme.default, true);
        isOrbitOverlay = false;
      }
    });
    var timeMachineDOM = $('#time-machine-btn');
    var isTimeMachine = false;
    timeMachineDOM.on('click', function(){
      if (!isTimeMachine) {
        isTimeMachine = true;
        orbitManager.isTimeMachineVisible = true;
        if (!orbitManager.isTimeMachineRunning) {
          orbitManager.historyOfSatellitesPlay();
        }
      } else {
        groups.clearSelect();
        orbitManager.clearHoverOrbit();
        satSet.setColorScheme(ColorScheme.default, true);
        orbitManager.isTimeMachineVisible = false;
        isTimeMachine = false;
      }
    });

    if (settingsManager.startWithOrbitsDisplayed) {
      setTimeout(function () {
        // Time Machine
        orbitManager.historyOfSatellitesPlay();

        // All Orbits
        // groups.debris = new groups.SatGroup('all', '');
        // groups.selectGroup(groups.debris);
        // satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
        // groups.debris.updateOrbits();
        // isOrbitOverlay = true;
      }, 5000);
    }
  });
}

// Load Satellite Dependencies
document.write('<script src="' + settingsManager.installDirectory + 'js/lib/colorPick.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/lib/materialize.min.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/lib/gl-matrix-min.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/lib/satellite.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/lib/suncalc.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/shaders.js?v=' + settingsManager.versionNumber + '"\><\/script>');
// Load Map Projection Code
document.write('<script src="' + settingsManager.installDirectory + 'js/mapManager.js?v=' + settingsManager.versionNumber + '"\><\/script>');
// Load License Scripts
document.write('<script src="' + settingsManager.installDirectory + 'license/license.js?v=' + settingsManager.versionNumber + '"\><\/script>');
// Offline Only
// if(settingsManager.offline){document.write('<script src="' + settingsManager.installDirectory + 'offline/extra.js?v=' + settingsManager.versionNumber + '"\><\/script>');}
// if(settingsManager.offline){document.write('<script src="' + settingsManager.installDirectory + 'offline/satInfo.js?v=' + settingsManager.versionNumber + '"\><\/script>');}
// if(settingsManager.offline){document.write('<script src="' + settingsManager.installDirectory + 'offline/tle.js?v=' + settingsManager.versionNumber + '"\><\/script>');}

// Addon Modules
if (!settingsManager.disableUI) {
  document.write('<script src="' + settingsManager.installDirectory + 'modules/sensorManager.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  document.write('<script src="' + settingsManager.installDirectory + 'modules/controlSiteManager.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  document.write('<script src="' + settingsManager.installDirectory + 'modules/launchSiteManager.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  document.write('<script src="' + settingsManager.installDirectory + 'modules/nextLaunchManager.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  document.write('<script src="' + settingsManager.installDirectory + 'modules/starManager.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  document.write('<script src="' + settingsManager.installDirectory + 'modules/satCommManager.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  document.write('<script src="' + settingsManager.installDirectory + 'modules/starManager-constellations.js?v=' + settingsManager.versionNumber + '"\><\/script>');
}
// Other Required Files
document.write('<script src="' + settingsManager.installDirectory + 'js/time-manager.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/sun.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/lib/meuusjs.1.0.3.min.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/lib/starcalc.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/earth.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/groups.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/lookangles.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/satSet.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'modules/satVmagManager.js?v=' + settingsManager.versionNumber + '"\><\/script>');
// Load Extra Variables
document.write('<script src="' + settingsManager.installDirectory + 'js/objectManager.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/lib/file-saver.min.js?v=' + settingsManager.versionNumber + '"\><\/script>');
// Load Ballistic Missile Functions
document.write('<script src="' + settingsManager.installDirectory + 'modules/missileManager.js?v=' + settingsManager.versionNumber + '"\><\/script>');
// Load Main JavaScript Code
document.write('<script src="' + settingsManager.installDirectory + 'js/color-scheme.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/mobile.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/lib/CanvasRecorder.min.js?v=' + settingsManager.versionNumber + '"\><\/script>');
if (!settingsManager.disableUI) {
  document.write('<script src="' + settingsManager.installDirectory + 'js/ui.js?v=' + settingsManager.versionNumber + '"\><\/script>');
}
document.write('<script src="' + settingsManager.installDirectory + 'js/main.js?v=' + settingsManager.versionNumber + '"\><\/script>');
document.write('<script src="' + settingsManager.installDirectory + 'js/orbitManager.js?v=' + settingsManager.versionNumber + '"\><\/script>');
if (!settingsManager.disableUI) {
  document.write('<script src="' + settingsManager.installDirectory + 'js/drawLoop-shapes.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  document.write('<script src="' + settingsManager.installDirectory + 'js/search-box.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  document.write('<script defer src="' + settingsManager.installDirectory + 'js/vector-to-kepler.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  // Load UI Dependencies
  document.write('<script defer src="' + settingsManager.installDirectory + 'js/lib/jquery-ui.min.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  document.write('<script defer src="' + settingsManager.installDirectory + 'js/lib/jquery-ui-slideraccess.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  document.write('<script defer src="' + settingsManager.installDirectory + 'js/lib/jquery-ui-timepicker.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  document.write('<script defer src="' + settingsManager.installDirectory + 'js/lib/perfect-scrollbar.min.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  // Load Extras Last to Speed Loading
  document.write('<script defer src="' + settingsManager.installDirectory + 'js/lib/jquery.colorbox.min.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  document.write('<script src="' + settingsManager.installDirectory + 'js/advice-module.js?v=' + settingsManager.versionNumber + '"\><\/script>');
  document.write('<script defer src="' + settingsManager.installDirectory + 'js/lib/numeric.js?v=' + settingsManager.versionNumber + '"\><\/script>');
}

// Load Bottom icons
if (!settingsManager.disableUI) {
  $(document).ready(function() {
  (function loadBottomIcons () {
    let numOfIcons = 0;
    bottomIconsDivDOM = $('#bottom-icons');

    if (objectManager.isSensorManagerLoaded) {
      numOfIcons++;
      bottomIconsDivDOM.append('<img id="menu-sensor-list" src="" delayedsrc="' + settingsManager.installDirectory + 'images/space-station-2.png" class="bmenu-item tooltipped" alt="Sensor List" data-position="top" data-delay="50" data-tooltip="Sensor List">');
      numOfIcons++;
      bottomIconsDivDOM.append('<img id="menu-info-overlay" src="" delayedsrc="' + settingsManager.installDirectory + 'images/info.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="Information Overlay" data-position="top" data-delay="50" data-tooltip="Information Overlay">');
      numOfIcons++;
      bottomIconsDivDOM.append('<img id="menu-sensor-info" src="" delayedsrc="' + settingsManager.installDirectory + 'images/radar.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="Sensor Information" data-position="top" data-delay="50" data-tooltip="Sensor Information">');
      numOfIcons++;
      bottomIconsDivDOM.append('<img id="menu-watchlist" src="" delayedsrc="' + settingsManager.installDirectory + 'images/star.png" class="bmenu-item tooltipped" alt="Satellite Watchlist" data-position="top" data-delay="50" data-tooltip="Satellite Watchlist">');
    }
    if (objectManager.isSensorManagerLoaded) {
      bottomIconsDivDOM.append('<img id="menu-lookangles" src="" delayedsrc="' + settingsManager.installDirectory + 'images/telescope.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="Look Angles" data-position="top" data-delay="50" data-tooltip="Look Angles">');
      bottomIconsDivDOM.append('<img id="menu-lookanglesmultisite" src="" delayedsrc="' + settingsManager.installDirectory + 'images/worldwide.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="SSN Lookangles" data-position="top" data-delay="50" data-tooltip="SSN Lookangles">');
    }
    bottomIconsDivDOM.append('<img id="menu-find-sat" src="" delayedsrc="' + settingsManager.installDirectory + 'images/findOrbit.png" class="bmenu-item tooltipped" alt="Search Orbit" data-position="top" data-delay="50" data-tooltip="Search Orbit">');
    bottomIconsDivDOM.append('<!-- <img id="menu-space-stations" src="" delayedsrc="' + settingsManager.installDirectory + 'images/space-station-1.png" class="bmenu-item tooltipped" alt="Union of Concerned Scientists Watchlist" data-position="top" data-delay="50" data-tooltip="Union of Concerned Scientists Watchlist"> -->');
    if (!settingsManager.offline) {
      bottomIconsDivDOM.append('<img id="menu-satellite-collision" src="" delayedsrc="' + settingsManager.installDirectory + 'images/satellite-collision.png" class="bmenu-item tooltipped" alt="SOCRATES Prediction of Near Conjunctions" data-position="top" data-delay="50" data-tooltip="SOCRATES Prediction of Near Conjunctions">');
    }
    bottomIconsDivDOM.append('<img id="menu-editSat" src="" delayedsrc="' + settingsManager.installDirectory + 'images/editPencil.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="Edit Satellites" data-position="top" data-delay="50" data-tooltip="Edit Satellites">');
    if (objectManager.isLaunchSiteManagerLoaded) {
      numOfIcons++;
      bottomIconsDivDOM.append('<img id="menu-newLaunch" src="" delayedsrc="' + settingsManager.installDirectory + 'images/rocket-ship.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="Create Launch Nominal" data-position="top" data-delay="50" data-tooltip="Create Launch Nominal">');
    }
    if (objectManager.isSensorManagerLoaded) {
      bottomIconsDivDOM.append('<img id="menu-breakup" src="" delayedsrc="' + settingsManager.installDirectory + 'images/breakup.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="Create Breakup" data-position="top" data-delay="50" data-tooltip="Create Breakup">');
    }
    if (objectManager.isMissileManagerLoaded) {
      numOfIcons++;
      bottomIconsDivDOM.append('<img id="menu-missile" src="" delayedsrc="' + settingsManager.installDirectory + 'images/rocket-ship-2.png" class="bmenu-item tooltipped" alt="Create Missile Attack" data-position="top" data-delay="50" data-tooltip="Create Missile Attack">');
    }
    if (objectManager.isSatCommManagerLoaded) {
      numOfIcons++;
      bottomIconsDivDOM.append('<img id="menu-satcom" src="" delayedsrc="' + settingsManager.installDirectory + 'images/satcom.png" class="bmenu-item tooltipped" alt="Custom Sensor" data-position="top" data-delay="50" data-tooltip="Satellite Communication">');
    }
    if (!settingsManager.offline) {
      bottomIconsDivDOM.append('<img id="menu-dops" src="" delayedsrc="' + settingsManager.installDirectory + 'images/antenna.png" class="bmenu-item tooltipped" alt="GPS DOP" data-position="top" data-delay="50" data-tooltip="GPS DOP Over Time">');
    }
    if (objectManager.isSensorManagerLoaded) {
      bottomIconsDivDOM.append('<img id="menu-customSensor" src="" delayedsrc="' + settingsManager.installDirectory + 'images/observatory.png" class="bmenu-item tooltipped" alt="Custom Sensor" data-position="top" data-delay="50" data-tooltip="Custom Sensor">');
    }
    bottomIconsDivDOM.append('<img id="menu-sat-fov" src="" delayedsrc="' + settingsManager.installDirectory + 'images/satellite-map.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="Satellite Field of View" data-position="top" data-delay="50" data-tooltip="Satellite Field of View">');
    bottomIconsDivDOM.append('<img id="menu-day-night" src="" delayedsrc="' + settingsManager.installDirectory + 'images/orbit.png" class="bmenu-item tooltipped" alt="Day Night Toggle" data-position="top" data-delay="50" data-tooltip="Day Night Toggle">');
    bottomIconsDivDOM.append('<img id="menu-color-scheme" src="" delayedsrc="' + settingsManager.installDirectory + 'images/brush.png" class="bmenu-item tooltipped" alt="Color Schemes" data-position="top" data-delay="50" data-tooltip="Color Schemes">');
    bottomIconsDivDOM.append('<img id="menu-constellations" src="" delayedsrc="' + settingsManager.installDirectory + 'images/orbit2.png" class="bmenu-item tooltipped" alt="Constellations" data-position="top" data-delay="50" data-tooltip="Constellations">');
    if (!settingsManager.offline) {
      bottomIconsDivDOM.append('<img id="menu-satChng" src="" delayedsrc="' + settingsManager.installDirectory + 'images/satChng.png" class="bmenu-item tooltipped" alt="Catalog Changes" data-position="top" data-delay="50" data-tooltip="Catalog Changes">');
    }
    bottomIconsDivDOM.append('<img id="menu-countries" src="" delayedsrc="' + settingsManager.installDirectory + 'images/united-states.png" class="bmenu-item tooltipped" alt="Countries" data-position="top" data-delay="50" data-tooltip="Countries">');
    if (objectManager.isSensorManagerLoaded) {
      bottomIconsDivDOM.append('<img id="menu-planetarium" src="" delayedsrc="' + settingsManager.installDirectory + 'images/astronaut.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="Planetarium View" data-position="top" data-delay="50" data-tooltip="Planetarium View">');
      bottomIconsDivDOM.append('<img id="menu-astronomy" src="" delayedsrc="' + settingsManager.installDirectory + 'images/ursa-major.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="Astronomy View" data-position="top" data-delay="50" data-tooltip="Astronomy View">');
    }
    bottomIconsDivDOM.append('<img id="menu-map" src="" delayedsrc="' + settingsManager.installDirectory + 'images/map.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="Stereographic Map" data-position="top" data-delay="50" data-tooltip="Stereographic Map">');
    bottomIconsDivDOM.append('<img id="menu-satview" src="" delayedsrc="' + settingsManager.installDirectory + 'images/satellite.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="Satellite View" data-position="top" data-delay="50" data-tooltip="Satellite View">');
    if (objectManager.isSensorManagerLoaded) {
      numOfIcons++;
      bottomIconsDivDOM.append('<img id="menu-fov-bubble" src="" delayedsrc="' + settingsManager.installDirectory + 'images/fieldofview.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="Show/Hide Field of View Bubble" data-position="top" data-delay="50" data-tooltip="Show/Hide Field of View Bubble">');
      numOfIcons++;
      bottomIconsDivDOM.append('<img id="menu-surveillance" src="" delayedsrc="' + settingsManager.installDirectory + 'images/surveillance.png" class="bmenu-item-disabled bmenu-item tooltipped" alt="Show/Hide Surveillance Fence" data-position="top" data-delay="50" data-tooltip="Show/Hide Surveillance Fence">');
    }
    if (!settingsManager.offline) {
      numOfIcons++;
      bottomIconsDivDOM.append('<img id="menu-analysis" src="" delayedsrc="' + settingsManager.installDirectory + 'images/analysis.png" class="bmenu-item tooltipped" alt="Custom Sensor" data-position="top" data-delay="50" data-tooltip="Analysis">');
    }
    bottomIconsDivDOM.append('<img id="menu-time-machine" src="" delayedsrc="' + settingsManager.installDirectory + 'images/time.png" class="bmenu-item tooltipped" alt="Time Machine" data-position="top" data-delay="50" data-tooltip="Time Machine">');
    bottomIconsDivDOM.append('<img id="menu-photo" src="" delayedsrc="' + settingsManager.installDirectory + 'images/camera.png" class="bmenu-item tooltipped" alt="Take HiRes Photo" data-position="top" data-delay="50" data-tooltip="Take HiRes Photo">');
    bottomIconsDivDOM.append('<img id="menu-record" src="" delayedsrc="' + settingsManager.installDirectory + 'images/screen-capture.jpg" class="bmenu-item tooltipped" alt="Screen Capture" data-position="top" data-delay="50" data-tooltip="Screen Capture">');
    if (objectManager.isLaunchSiteManagerLoaded) {
      numOfIcons++;
      bottomIconsDivDOM.append('<img id="menu-nextLaunch" src="" delayedsrc="' + settingsManager.installDirectory + 'images/calendar.png" class="bmenu-item tooltipped" alt="Next Launches" data-position="top" data-delay="50" data-tooltip="Next Launches">');
    }
    if (!settingsManager.offline) {
      bottomIconsDivDOM.append('<img id="menu-launches" src="" delayedsrc="' + settingsManager.installDirectory + 'images/rocket-ship-1.png" class="bmenu-item tooltipped" alt="Launch Schedule" data-position="top" data-delay="50" data-tooltip="Launch Schedule">');
      bottomIconsDivDOM.append('<img id="menu-twitter" src="" delayedsrc="' + settingsManager.installDirectory + 'images/twitter.png" class="bmenu-item tooltipped" alt="Space News on Twitter" data-position="top" data-delay="50" data-tooltip="Space News on Twitter">');
    }
    bottomIconsDivDOM.append('<img id="menu-settings" src="" delayedsrc="' + settingsManager.installDirectory + 'images/gear-icon.png" class="bmenu-item tooltipped" alt="Settings" data-position="top" data-delay="50" data-tooltip="Settings">');
    bottomIconsDivDOM.append('<img id="menu-about" src="" delayedsrc="' + settingsManager.installDirectory + 'images/about.png" class="bmenu-item tooltipped" alt="Author Information" data-position="top" data-delay="50" data-tooltip="Author Information">');
  })();
})
}
