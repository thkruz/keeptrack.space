(function () {
  var settingsManager = {};

  //  Version Control
  settingsManager.versionNumber = 'v0.26.0';
  settingsManager.versionDate = 'October 12, 2017';

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
