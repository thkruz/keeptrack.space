import * as $ from 'jquery';

// Side Menu Manager
var sMM = {};

sMM.isSensorListMenuOpen = false;
sMM.isTwitterMenuOpen = false;
sMM.isFindByLooksMenuOpen = false;
sMM.isSensorInfoMenuOpen = false;
sMM.isWatchlistMenuOpen = false;
sMM.isAboutSelected = false;
sMM.isColorSchemeMenuOpen = false;
sMM.isConstellationsMenuOpen = false;
sMM.isCountriesMenuOpen = false;
sMM.isExternalMenuOpen = false;
sMM.isSocratesMenuOpen = false;
sMM.isNextLaunchMenuOpen = false;
sMM.issatChngMenuOpen = false;
sMM.isSettingsMenuOpen = false;
sMM.isObfitMenuOpen = false;
sMM.isLookanglesMenuOpen = false;
sMM.isDOPMenuOpen = false;
sMM.isLookanglesMultiSiteMenuOpen = false;
sMM.isAnalysisMenuOpen = false;
sMM.isEditSatMenuOpen = false;
sMM.setCustomSensorMenuOpen = false;
sMM.isNewLaunchMenuOpen = false;
sMM.isBreakupMenuOpen = false;
sMM.isMissileMenuOpen = false;
sMM.isInfoOverlayMenuOpen = false;
sMM.isLaunchMenuOpen = false;

sMM.hideSideMenus = function () {
  // Close any open colorboxes
  $.colorbox.close();

  // Hide all side menus
  $('#membership-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#sensor-list-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#info-overlay-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#sensor-info-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#watchlist-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#lookangles-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#dops-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#lookanglesmultisite-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#findByLooks-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#twitter-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#map-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#socrates-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#satChng-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#nextLaunch-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#obfit-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#settings-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#editSat-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#newLaunch-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#breakup-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#missile-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#external-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#analysis-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#color-scheme-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#countries-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#constellations-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#about-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);

  // Remove red color from all menu icons
  $('#menu-sensor-list').removeClass('bmenu-item-selected');
  $('#menu-info-overlay').removeClass('bmenu-item-selected');
  $('#menu-sensor-info').removeClass('bmenu-item-selected');
  $('#menu-watchlist').removeClass('bmenu-item-selected');
  $('#menu-lookangles').removeClass('bmenu-item-selected');
  $('#menu-dops').removeClass('bmenu-item-selected');
  $('#menu-lookanglesmultisite').removeClass('bmenu-item-selected');
  $('#menu-launches').removeClass('bmenu-item-selected');
  $('#menu-find-sat').removeClass('bmenu-item-selected');
  $('#menu-twitter').removeClass('bmenu-item-selected');
  $('#menu-map').removeClass('bmenu-item-selected');
  $('#menu-satellite-collision').removeClass('bmenu-item-selected');
  $('#menu-satChng').removeClass('bmenu-item-selected');
  $('#menu-settings').removeClass('bmenu-item-selected');
  $('#menu-editSat').removeClass('bmenu-item-selected');
  $('#menu-newLaunch').removeClass('bmenu-item-selected');
  $('#menu-nextLaunch').removeClass('bmenu-item-selected');
  $('#menu-breakup').removeClass('bmenu-item-selected');
  $('#menu-missile').removeClass('bmenu-item-selected');
  $('#menu-external').removeClass('bmenu-item-selected');
  $('#menu-analysis').removeClass('bmenu-item-selected');
  $('#menu-customSensor').removeClass('bmenu-item-selected');
  $('#menu-color-scheme').removeClass('bmenu-item-selected');
  $('#menu-countries').removeClass('bmenu-item-selected');
  $('#menu-constellations').removeClass('bmenu-item-selected');
  $('#menu-obfit').removeClass('bmenu-item-selected');
  $('#menu-about').removeClass('bmenu-item-selected');

  // Unflag all open menu variables
  sMM.isSensorListMenuOpen = false;
  sMM.isInfoOverlayMenuOpen = false;
  sMM.isSensorInfoMenuOpen = false;
  sMM.isWatchlistMenuOpen = false;
  sMM.isLaunchMenuOpen = false;
  sMM.isTwitterMenuOpen = false;
  sMM.isFindByLooksMenuOpen = false;
  sMM.isMapMenuOpen = false;
  sMM.isLookanglesMenuOpen = false;
  sMM.isDOPMenuOpen = false;
  sMM.isLookanglesMultiSiteMenuOpen = false;
  sMM.isSocratesMenuOpen = false;
  sMM.isNextLaunchMenuOpen = false;
  sMM.issatChngMenuOpen = false;
  sMM.isSettingsMenuOpen = false;
  sMM.isObfitMenuOpen = false;
  sMM.isEditSatMenuOpen = false;
  sMM.isNewLaunchMenuOpen = false;
  sMM.isBreakupMenuOpen = false;
  sMM.isMissileMenuOpen = false;
  sMM.isCustomSensorMenuOpen = false;
  sMM.isColorSchemeMenuOpen = false;
  sMM.isAnalysisMenuOpen = false;
  sMM.isExternalMenuOpen = false;
  sMM.isConstellationsMenuOpen = false;
  sMM.isCountriesMenuOpen = false;
  sMM.isAboutSelected = false;
};

export { sMM };
