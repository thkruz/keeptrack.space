(function () {
  var settingsManager = {};

  //  Version Control
  settingsManager.versionNumber = 'v0.27.1';
  settingsManager.versionDate = 'November 19, 2017';

  (function _getVersion () {
    var url = window.location.pathname;
    var filename = url.substring(url.lastIndexOf('/') + 1);
    if (filename === 'retro.htm') settingsManager.retro = true;
  })();

  settingsManager.shadersReady = false;
  settingsManager.cruncherReady = false;

  settingsManager.limitSats = '';
  settingsManager.searchLimit = 200;

  settingsManager.mapWidth = 800;
  settingsManager.mapHeight = 600;

  settingsManager.currentColorScheme = null;
  settingsManager.otherSatelliteTransparency = 0.1;

  settingsManager.socratesOnSatCruncher = null;

  settingsManager.isSharperShaders = false;
  settingsManager.isEditTime = false;
  settingsManager.isPropRateChange = false;
  settingsManager.isOnlyFOVChecked = false;
  settingsManager.isBottomIconsEnabled = false;
  settingsManager.isBottomMenuOpen = false;
  settingsManager.isMapMenuOpen = false;

  settingsManager.mapUpdateOverride = false;
  settingsManager.lastMapUpdateTime = 0;

  window.settingsManager = settingsManager;
})();
