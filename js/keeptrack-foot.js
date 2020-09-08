// Start Catalog Loading
// Set Default TLE
if (typeof settingsManager.tleSource == 'undefined') {
    settingsManager.tleSource = 'tle/TLE.json';
}
try {
    var tleSource = settingsManager.tleSource;
    // $.get('' + tleSource + '?v=' + settingsManager.versionNumber)
    $.get({
          url: '' + tleSource,
          cache: false
        }).done(function (resp) {
            // if the .json loads then use it
            satSet.loadTLEs(resp);
        })
        .fail(function () {
            // Sometimes network firewall's hate .json so use a .js
            $.getScript('/offline/tle.js', function () {
                satSet.loadTLEs(jsTLEfile);
            });
        });
    jsTLEfile = null;
} catch (e) {
    satSet.loadTLEs(jsTLEfile);
    jsTLEfile = null;
}

// Load Full Version For Debugging
if (db.enabled) {
  // Load Dependencies
  if (!settingsManager.disableUI) {
    document.write(`
      <script src="${settingsManager.installDirectory}js/lib/colorPick.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/webgl-obj-loader.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/mapManager.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}license/license.js?v=${settingsManager.versionNumber}"\><\/script>
      `);
  }
  document.write(`
    <script src="${settingsManager.installDirectory}js/lib/materialize.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lib/gl-matrix-min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lib/satellite.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lib/suncalc.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/shaders.js?v=${settingsManager.versionNumber}"\><\/script>
    `);

  // Addon Modules
  if (!settingsManager.disableUI) {
      document.write(`
      <script src="${settingsManager.installDirectory}modules/meshManager.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/sensorManager.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/controlSiteManager.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/launchSiteManager.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/nextLaunchManager.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/starManager.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/starManager-constellations.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/satCommManager.js?v=${settingsManager.versionNumber}"\><\/script>

      <script src="${settingsManager.installDirectory}js/lib/CanvasRecorder.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/satVmagManager.js?v=${settingsManager.versionNumber}"\><\/script>
    `);
  }

  // Offline Only
  // if(settingsManager.offline){document.write('<script src="' + settingsManager.installDirectory + 'offline/extra.js?v=' + settingsManager.versionNumber + '"\><\/script>');}
  // if(settingsManager.offline){document.write('<script src="' + settingsManager.installDirectory + 'offline/satInfo.js?v=' + settingsManager.versionNumber + '"\><\/script>');}
  // if(settingsManager.offline){document.write('<script src="' + settingsManager.installDirectory + 'offline/tle.js?v=' + settingsManager.versionNumber + '"\><\/script>');}

  // Other Required Files
  document.write(`
    <script src="${settingsManager.installDirectory}js/sceneManager.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/timeManager.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lib/meuusjs.1.0.3.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lib/starcalc.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/groups.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lookangles.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/satSet.js?v=${settingsManager.versionNumber}"\><\/script>

    <script src="${settingsManager.installDirectory}js/objectManager.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lib/file-saver.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/color-scheme.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/mobile.js?v=${settingsManager.versionNumber}"\><\/script>
  `);
  if (!settingsManager.disableUI) {
      document.write(`
        <script src="${settingsManager.installDirectory}modules/missileManager.js?v=${settingsManager.versionNumber}"\><\/script>
        <script src="${settingsManager.installDirectory}js/ui.js?v=${settingsManager.versionNumber}"\><\/script>
      `);
  }

  document.write(`
    <script src="${settingsManager.installDirectory}js/main.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/orbitManager.js?v=${settingsManager.versionNumber}"\><\/script>
  `);

  if (!settingsManager.disableUI) {
      document.write(`
      <script src="${settingsManager.installDirectory}js/drawLoop-shapes.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/search-box.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/vector-to-kepler.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/jquery-ui.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/jquery-ui-slideraccess.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/jquery-ui-timepicker.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/perfect-scrollbar.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/jquery.colorbox.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/advice-module.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/numeric.js?v=${settingsManager.versionNumber}"\><\/script>
    `);
  }
// Load Minified Versions Normally
} else {
  // Load Dependencies
  if (!settingsManager.disableUI) {
    document.write(`
      <script src="${settingsManager.installDirectory}js/lib/colorPick.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/webgl-obj-loader.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/mapManager.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}license/license.min.js?v=${settingsManager.versionNumber}"\><\/script>
      `);
  }
  document.write(`
    <script src="${settingsManager.installDirectory}js/lib/materialize.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lib/gl-matrix-min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lib/satellite.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lib/suncalc.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/shaders.js?v=${settingsManager.versionNumber}"\><\/script>
    `);

  // Addon Modules
  if (!settingsManager.disableUI) {
      document.write(`
      <script src="${settingsManager.installDirectory}modules/meshManager.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/sensorManager.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/controlSiteManager.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/launchSiteManager.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/nextLaunchManager.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/starManager.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/starManager-constellations.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/satCommManager.min.js?v=${settingsManager.versionNumber}"\><\/script>

      <script src="${settingsManager.installDirectory}js/lib/CanvasRecorder.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}modules/satVmagManager.js?v=${settingsManager.versionNumber}"\><\/script>
    `);
  }

  // Offline Only
  // if(settingsManager.offline){document.write('<script src="' + settingsManager.installDirectory + 'offline/extra.js?v=' + settingsManager.versionNumber + '"\><\/script>');}
  // if(settingsManager.offline){document.write('<script src="' + settingsManager.installDirectory + 'offline/satInfo.js?v=' + settingsManager.versionNumber + '"\><\/script>');}
  // if(settingsManager.offline){document.write('<script src="' + settingsManager.installDirectory + 'offline/tle.js?v=' + settingsManager.versionNumber + '"\><\/script>');}

  // Other Required Files
  document.write(`
    <script src="${settingsManager.installDirectory}js/sceneManager.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/timeManager.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lib/meuusjs.1.0.3.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lib/starcalc.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/groups.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lookangles.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/satSet.min.js?v=${settingsManager.versionNumber}"\><\/script>

    <script src="${settingsManager.installDirectory}js/objectManager.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/lib/file-saver.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/color-scheme.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/mobile.min.js?v=${settingsManager.versionNumber}"\><\/script>
  `);
  if (!settingsManager.disableUI) {
      document.write(`
        <script src="${settingsManager.installDirectory}modules/missileManager.min.js?v=${settingsManager.versionNumber}"\><\/script>
        <script src="${settingsManager.installDirectory}js/ui.min.js?v=${settingsManager.versionNumber}"\><\/script>
      `);
  }

  document.write(`
    <script src="${settingsManager.installDirectory}js/main.min.js?v=${settingsManager.versionNumber}"\><\/script>
    <script src="${settingsManager.installDirectory}js/orbitManager.min.js?v=${settingsManager.versionNumber}"\><\/script>
  `);

  if (!settingsManager.disableUI) {
      document.write(`
      <script src="${settingsManager.installDirectory}js/drawLoop-shapes.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/search-box.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/vector-to-kepler.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/jquery-ui.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/jquery-ui-slideraccess.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/jquery-ui-timepicker.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/perfect-scrollbar.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/jquery.colorbox.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/advice-module.min.js?v=${settingsManager.versionNumber}"\><\/script>
      <script src="${settingsManager.installDirectory}js/lib/numeric.min.js?v=${settingsManager.versionNumber}"\><\/script>
    `);
  }
}


// Enable Satbox Overlay
if (settingsManager.enableHoverOverlay) {
    document.getElementById('keeptrack-canvas').parentElement.innerHTML += `
  <div id="sat-hoverbox">
    <span id="sat-hoverbox1"></span>
    <br/>
    <span id="sat-hoverbox2"></span>
    <br/>
    <span id="sat-hoverbox3"></span>
  </div>`;
}

// Enable the Limited UI
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
                groups.debris = new groups.SatGroup('all', '');
                groups.selectGroup(groups.debris);
                // satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
                // groups.debris.updateOrbits();
                settingsManager.isOrbitOverlayVisible = true;
            } else {
                orbitManager.isTimeMachineVisible = false;
                isTimeMachine = false;
                groups.clearSelect();
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

                settingsManager.colors.transparent =
                    orbitManager.tempTransColor;
                groups.clearSelect();
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
}

// Load Bottom icons
if (!settingsManager.disableUI) {
    $(document).ready(function () {
        (function loadBottomIcons() {
            let numOfIcons = 0;
            bottomIconsDivDOM = $('#bottom-icons');

            if (objectManager.isSensorManagerLoaded) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-sensor-list" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/radar.png">
          <span class="bmenu-title">Sensors</span>
          <div class="status-icon"></div>
        </div>
      `);
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-info-overlay" class="bmenu-item bmenu-item-disabled">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/info.png">
          <span class="bmenu-title">Overlay</span>
          <div class="status-icon"></div>
        </div>
      `);
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-sensor-info" class="bmenu-item bmenu-item-disabled">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/radio-tower.png">
          <span class="bmenu-title">Sensor Info</span>
          <div class="status-icon"></div>
        </div>
      `);
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-watchlist" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/watchlist.png">
          <span class="bmenu-title">Watchlist</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            if (objectManager.isSensorManagerLoaded) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-lookangles" class="bmenu-item bmenu-item-disabled">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/lookangles.png">
          <span class="bmenu-title">Look Angles</span>
          <div class="status-icon"></div>
        </div>
      `);
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-lookanglesmultisite" class="bmenu-item bmenu-item-disabled">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/multi-site.png">
          <span class="bmenu-title">Multi-Site Looks</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-find-sat" class="bmenu-item">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/find2.png">
        <span class="bmenu-title">Find Satellite</span>
        <div class="status-icon"></div>
      </div>
    `);
            // numOfIcons++;
            // bottomIconsDivDOM.append(`
            //   <div id="menu-space-stations" class="bmenu-item">
            //     <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/blue-sat.png">
            //     <span class="bmenu-title">a</span>
            //   </div>
            // `);
            if (!settingsManager.offline) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-satellite-collision" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/socrates.png">
          <span class="bmenu-title">Collisions</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-satellite-editSat" class="bmenu-item bmenu-item-disabled">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/edit.png">
        <span class="bmenu-title">Edit Satellite</span>
        <div class="status-icon"></div>
      </div>
    `);
            if (objectManager.isLaunchSiteManagerLoaded) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-newLaunch" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/rocket.png">
          <span class="bmenu-title">New Launch</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            if (objectManager.isSensorManagerLoaded) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-breakup" class="bmenu-item bmenu-item-disabled">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/breakup.png">
          <span class="bmenu-title">Breakup</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            if (objectManager.isMissileManagerLoaded) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-missile" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/missile.png">
          <span class="bmenu-title">Missile</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            if (objectManager.isSatCommManagerLoaded) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-satcom" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/satcom.png">
          <span class="bmenu-title">SATCOM</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            if (!settingsManager.offline) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-dops" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/gps.png">
          <span class="bmenu-title">DOPs</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            if (objectManager.isSensorManagerLoaded) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-customSensor" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/custom.png">
          <span class="bmenu-title">Custom Sensor</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-sat-fov" class="bmenu-item bmenu-item-disabled">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/sat2.png">
        <span class="bmenu-title">Satellite FOV</span>
        <div class="status-icon"></div>
      </div>
    `);
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-day-night" class="bmenu-item">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/day-night.png">
        <span class="bmenu-title">Night Toggle</span>
        <div class="status-icon"></div>
      </div>
    `);
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-color-scheme" class="bmenu-item">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/colors.png">
        <span class="bmenu-title">Color Schemes</span>
        <div class="status-icon"></div>
      </div>
    `);
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-constellations" class="bmenu-item">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/constellation.png">
        <span class="bmenu-title">Constellations</span>
        <div class="status-icon"></div>
      </div>
    `);
            if (!settingsManager.offline) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-satChng" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/satchng.png">
          <span class="bmenu-title">Satellite Changes</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-countries" class="bmenu-item">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/flag.png">
        <span class="bmenu-title">Countries</span>
        <div class="status-icon"></div>
      </div>
    `);
            if (objectManager.isSensorManagerLoaded) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-planetarium" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/planetarium.png">
          <span class="bmenu-title">Planetarium View</span>
          <div class="status-icon"></div>
        </div>
      `);
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-astronomy" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/telescope.png">
          <span class="bmenu-title">Astronomy View</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-map" class="bmenu-item bmenu-item-disabled">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/map.png">
        <span class="bmenu-title">Stereographic Map</span>
        <div class="status-icon"></div>
      </div>
    `);
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-satview" class="bmenu-item bmenu-item-disabled">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/sat3.png">
        <span class="bmenu-title">Satellite View</span>
        <div class="status-icon"></div>
      </div>
    `);
            if (objectManager.isSensorManagerLoaded) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-fov-bubble" class="bmenu-item bmenu-item-disabled">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/fov.png">
          <span class="bmenu-title">Sensor FOV</span>
          <div class="status-icon"></div>
        </div>
      `);
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-surveillance" class="bmenu-item bmenu-item-disabled">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/fence.png">
          <span class="bmenu-title">Sesnor Fence</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            if (!settingsManager.offline) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-analysis" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/analysis.png">
          <span class="bmenu-title">Analysis</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-time-machine" class="bmenu-item">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/time-machine.png">
        <span class="bmenu-title">Time Machine</span>
        <div class="status-icon"></div>
      </div>
    `);
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-photo" class="bmenu-item">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/camera.png">
        <span class="bmenu-title">Take Photo</span>
        <div class="status-icon"></div>
      </div>
    `);
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-record" class="bmenu-item">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/video.png">
        <span class="bmenu-title">Record Video</span>
        <div class="status-icon"></div>
      </div>
    `);
            if (objectManager.isLaunchSiteManagerLoaded) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-nextLaunch" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/calendar.png">
          <span class="bmenu-title">Next Launches</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            if (!settingsManager.offline) {
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-launches" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/calendar2.png">
          <span class="bmenu-title">Launch Calendar</span>
          <div class="status-icon"></div>
        </div>
      `);
                numOfIcons++;
                bottomIconsDivDOM.append(`
        <div id="menu-twitter" class="bmenu-item">
          <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/twitter.png">
          <span class="bmenu-title">Twitter</span>
          <div class="status-icon"></div>
        </div>
      `);
            }
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-settings" class="bmenu-item">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/settings.png">
        <span class="bmenu-title">Settings</span>
        <div class="status-icon"></div>
      </div>
    `);
            numOfIcons++;
            bottomIconsDivDOM.append(`
      <div id="menu-about" class="bmenu-item">
        <img src="" delayedsrc="${settingsManager.installDirectory}images/icons/about.png">
        <span class="bmenu-title">About</span>
        <div class="status-icon"></div>
      </div>
    `);
        })();
    });
}
