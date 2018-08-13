/* globals
  $
*/
(function () {
  var settingsManager = {};

  //  Version Control
  settingsManager.versionNumber = 'v0.35.4';
  settingsManager.versionDate = 'August 13, 2018';

  // Offline management
  settingsManager.offlineLocation = '';

  (function _getVersion () {
    // NOTE: This is for backwards compatibility but will be phased out.
    var url = window.location.pathname;
    var filename = url.substring(url.lastIndexOf('/') + 1);
    if (filename === 'retro.htm') {
      settingsManager.retro = true;
      settingsManager.tleSource = 'TLERetro.json';
    }
    if (filename === 'mw.htm') {
      settingsManager.tleSource = 'mw.json';
    }
    if (filename === 'offline.htm') settingsManager.offline = true;
    if (filename === 'vec.htm') settingsManager.vectorImages = true;
    if (filename === 'offlineVec.htm') {
      settingsManager.offline = true;
      settingsManager.vectorImages = true;
    }
  })();

  settingsManager.themes = {};
  settingsManager.themes.currentTheme = 'Blue';
  settingsManager.themes.retheme = function () {
    if (settingsManager.themes.currentTheme === 'Blue') settingsManager.themes.blueTheme(true);
    if (settingsManager.themes.currentTheme === 'Red') settingsManager.themes.redTheme(true);
  };
  settingsManager.themes.redTheme = function (isForce) {
    if (settingsManager.retro) return;
    if (settingsManager.themes.currentTheme === 'Red' && !isForce) return;
      document.getElementById('nav-wrapper').classList.remove('light-blue');
      document.getElementById('nav-wrapper').classList.add('red');
      document.getElementById('nav-footer').classList.add('red');
      document.getElementById('nav-footer').classList.add('darken-3');
      $('#bottom-menu').css('background', 'rgb(165, 0, 0)');
      $('.bmenu-item img').css('border-right-color', 'orangered');
      $('#menu-info-overlay img ').css('border-left-color', 'orangered');
      $('.side-menu').css('background', 'LightCoral');
      $('#sat-infobox').css('background', 'LightCoral');
      $('#sat-infobox').css('border-top-color', 'DarkRed');
      $('#search-results').css('background', 'LightCoral');
      $('#search-result:hover').css('background', 'DarkRed');
      $('.search-hilight').css('color', 'DarkRed');
      $('.btn').css('background-color', 'red');
      settingsManager.themes.currentTheme = 'Red';
    };
  settingsManager.themes.redThemeSearch = function (isForce) {
    if (settingsManager.retro) return;
    if (settingsManager.themes.currentTheme !== 'Red' && !isForce) return;
    $('#search-results').css('background', 'LightCoral');
    $('#search-result:hover').css('background', 'DarkRed');
    $('.search-hilight').css('color', 'DarkRed');
  };
  settingsManager.themes.blueTheme = function (isForce) {
    if (settingsManager.retro) return;
    if (settingsManager.themes.currentTheme === 'Blue' && !isForce) return;
    document.getElementById('nav-wrapper').classList.remove('red');
    document.getElementById('nav-footer').classList.remove('red');
    document.getElementById('nav-footer').classList.remove('darken-3');
    document.getElementById('nav-wrapper').classList.add('light-blue');
    $('#nav-footer').css('background-color', '#0277bd');
    $('#bottom-menu').css('background', 'rgb(0,105,165)');
    $('.bmenu-item img').css('border-right-color', 'steelblue');
    $('#menu-info-overlay img ').css('border-left-color', 'steelblue');
    $('.side-menu').css('background', '#0a97d6');
    $('#sat-infobox').css('background', '#0a97d6');
    $('#sat-infobox').css('border-top-color', '#0277bd');
    $('#search-results').css('background', '#0a97d6');
    $('#search-results:hover').css('background', '#0277bd');
    $('.search-hilight').css('color', '#01579b');
    $('.btn').css('background-color', '#0091ea');
    settingsManager.themes.currentTheme = 'Blue';
  };

  settingsManager.hiresImages = false; // USE OFFLINE ONLY

  settingsManager.shadersReady = false;
  settingsManager.cruncherReady = false;

  settingsManager.lkVerify = Date.now();

  settingsManager.redTheme = false;

  settingsManager.limitSats = '';
  settingsManager.searchLimit = 400;

  settingsManager.fieldOfView = 1.01;

  settingsManager.geolocation = {};
  settingsManager.geolocationUsed = false;

  settingsManager.mapWidth = 800;
  settingsManager.mapHeight = 600;

  settingsManager.hoverColor = [0.1, 1.0, 0.0, 1.0]; // Green
  settingsManager.selectedColor = [1.0, 0.0, 0.0, 1.0]; // Red

  settingsManager.minimumSearchCharacters = 2;

  settingsManager.currentColorScheme = null;
  settingsManager.otherSatelliteTransparency = 0.1;

  settingsManager.socratesOnSatCruncher = null;

  settingsManager.vertShadersSize = 12;
  settingsManager.isEditTime = false;
  settingsManager.isPropRateChange = false;
  settingsManager.isOnlyFOVChecked = false;
  settingsManager.isBottomIconsEnabled = false;
  settingsManager.isBottomMenuOpen = false;
  settingsManager.isMapMenuOpen = false;
  settingsManager.isForceColorScheme = false;

  settingsManager.isMapUpdateOverride = false;
  settingsManager.lastMapUpdateTime = 0;

  settingsManager.cameraMovementSpeed = 0.004;

  // /////////////////
  // Mobile settings
  // /////////////////
  settingsManager.desktopMinimumWidth = 1000;
  settingsManager.isMobileModeEnabled = false;

  window.settingsManager = settingsManager;
})();
