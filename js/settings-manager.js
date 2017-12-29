/* globals
  $
*/
(function () {
  var settingsManager = {};

  //  Version Control
  settingsManager.versionNumber = 'v0.29.3';
  settingsManager.versionDate = 'December 29, 2017';

  (function _getVersion () {
    var url = window.location.pathname;
    var filename = url.substring(url.lastIndexOf('/') + 1);
    if (filename === 'retro.htm') settingsManager.retro = true;
    if (filename === 'offline.htm') settingsManager.offline = true;
  })();

  settingsManager.themeChange = function (isRedTheme) {
    if (isRedTheme) {
      document.getElementById('nav-wrapper').classList.remove('light-blue');
      document.getElementById('nav-wrapper').classList.add('red');
      document.getElementById('nav-footer').classList.add('red');
      document.getElementById('nav-footer').classList.add('darken-3');
      $('#bottom-menu').css('background', 'rgb(165, 0, 0)');
      $('.bmenu-item img').css('border-right-color', 'orangered');
      $('#menu-sensor-info img ').css('border-left-color', 'orangered');
      $('.side-menu').css('background', 'LightCoral');
      $('#sat-infobox').css('background', 'LightCoral');
      $('#sat-infobox').css('border-top-color', 'DarkRed');
      $('#search-results').css('background', 'LightCoral');
      $('#search-result:hover').css('background', 'DarkRed');
      $('.search-hilight').css('color', 'DarkRed');
      $('.btn').css('background-color', 'red');
    } else {
      document.getElementById('nav-wrapper').classList.remove('red');
      document.getElementById('nav-footer').classList.remove('red');
      document.getElementById('nav-footer').classList.remove('darken-3');
      document.getElementById('nav-wrapper').classList.add('light-blue');
      $('#nav-footer').css('background-color', '#0277bd');
      $('#bottom-menu').css('background', 'rgb(0,105,165)');
      $('.bmenu-item img').css('border-right-color', 'steelblue');
      $('#menu-sensor-info img ').css('border-left-color', 'steelblue');
      $('.side-menu').css('background', '#0a97d6');
      $('#sat-infobox').css('background', '#0a97d6');
      $('#sat-infobox').css('border-top-color', '#0277bd');
      $('#search-results').css('background', '#0a97d6');
      $('#search-results:hover').css('background', '#0277bd');
      $('.search-hilight').css('color', '#01579b');
      $('.btn').css('background-color', '#0091ea');
    }
  };

  settingsManager.shadersReady = false;
  settingsManager.cruncherReady = false;

  settingsManager.redTheme = false;

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
  settingsManager.forceColorScheme = false;

  settingsManager.watchlistPopups = true;

  settingsManager.mapUpdateOverride = false;
  settingsManager.lastMapUpdateTime = 0;

  window.settingsManager = settingsManager;
})();
