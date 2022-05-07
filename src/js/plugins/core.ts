import * as classification from '@app/js/plugins/classification/classification';
import * as sensor from '@app/js/plugins/sensor/sensor';
import * as watchlist from '@app/js/plugins/watchlist/watchlist';
import * as nextLaunch from '@app/js/plugins/nextLaunch/nextLaunch';
import * as findSat from '@app/js/plugins/findSat/findSat';
import * as shortTermFences from '@app/js/plugins/shortTermFences/shortTermFences';
import * as orbitReferences from '@app/js/plugins/orbitReferences/orbitReferences';
import * as collisions from '@app/js/plugins/collisions/collisions';
import * as breakup from '@app/js/plugins/breakup/breakup';
import * as editSat from '@app/js/plugins/editSat/editSat';
import * as newLaunch from '@app/js/plugins/newLaunch/newLaunch';
import * as satChanges from '@app/js/plugins/satChanges/satChanges';
import * as initialOrbit from '@app/js/plugins/initialOrbit/initialOrbit';
import * as missile from '@app/js/plugins/missile/missile';
import * as stereoMap from '@app/js/plugins/stereoMap/stereoMap';
import * as sensorFov from '@app/js/plugins/sensorFov/sensorFov';
import * as sensorSurv from '@app/js/plugins/sensorSurv/sensorSurv';
import * as satelliteView from '@app/js/plugins/satelliteView/satelliteView';
import * as satelliteFov from '@app/js/plugins/satelliteFov/satelliteFov';
import * as planetarium from '@app/js/plugins/planetarium/planetarium';
import * as astronomy from '@app/js/plugins/astronomy/astronomy';
import * as nightToggle from '@app/js/plugins/nightToggle/nightToggle';
import * as dops from '@app/js/plugins/dops/dops';
import * as constellations from '@app/js/plugins/constellations/constellations';
import * as countries from '@app/js/plugins/countries/countries';
import * as colorsMenu from '@app/js/plugins/colorsMenu/colorsMenu';
import * as photo from '@app/js/plugins/photo/photo';
import * as launchCalendar from '@app/js/plugins/launchCalendar/launchCalendar';
import * as timeMachine from '@app/js/plugins/timeMachine/timeMachine';
import * as photoManager from '@app/js/plugins/photoManager/photoManager';
import * as recorderManager from '@app/js/plugins/recorderManager/recorderManager';
import * as analysis from '@app/js/plugins/analysis/analysis';
import * as plotAnalysis from '@app/js/plugins/plotAnalysis/plotAnalysis';
import * as twitter from '@app/js/plugins/twitter/twitter';
import * as externalSources from '@app/js/plugins/externalSources/externalSources';
import * as aboutManager from '@app/js/plugins/aboutManager/aboutManager';
import * as settingsMenu from '@app/js/plugins/settingsMenu/settingsMenu';
import * as soundManager from '@app/js/plugins/sounds/sounds';
import * as gamepad from '@app/js/plugins/gamepad/gamepad';
import * as catalogLoader from '@app/js/plugins/catalogLoader/catalogLoader';
import * as debug from '@app/js/plugins/debug/debug';
import * as satInfoboxCore from '@app/js/plugins/selectSatManager/satInfoboxCore';
import * as updateSelectBoxCore from '@app/js/plugins/updateSelectBox/updateSelectBoxCore';
import * as topMenu from '@app/js/plugins/topMenu/topMenu';
import * as datetime from '@app/js/plugins/datetime/datetime';
import * as social from '@app/js/plugins/social/social';
import * as scenarioCreator from '@app/js/plugins/scenarioCreator/scenario-creator';


// Register all core modules
export const loadCorePlugins = async (keepTrackApi: { programs?: any; register?: any }, plugins: any): Promise<void> => { // NOSONAR
  plugins ??= {};
  try {
    // Register Catalog Loader
    catalogLoader.init();

    // Load Debug Plugins
    if (plugins.debug) debug.init();

    // Register selectSatData
    if (plugins.satInfoboxCore) satInfoboxCore.init();

    // Core Features
    if (plugins.updateSelectBoxCore) updateSelectBoxCore.init();
    if (plugins.topMenu) topMenu.init();
    if (plugins.datetime) datetime.init();
    if (plugins.social) social.init();

    // UI Menu
    if (plugins.classification) classification.init();
    if (plugins.sensor) sensor.init();
    if (plugins.watchlist) watchlist.init();
    if (plugins.nextLaunch) nextLaunch.init();
    if (plugins.findSat) findSat.init();
    if (plugins.shortTermFences) shortTermFences.init();
    if (plugins.orbitReferences) orbitReferences.init();
    if (plugins.collisions) collisions.init();
    if (plugins.breakup) breakup.init();
    if (plugins.editSat) editSat.init();
    if (plugins.newLaunch) newLaunch.init();
    if (plugins.satChanges) satChanges.init();
    if (plugins.initialOrbit) initialOrbit.init();
    if (plugins.missile) missile.init();
    if (plugins.stereoMap) stereoMap.init();
    if (plugins.sensorFov) sensorFov.init();
    if (plugins.sensorSurv) sensorSurv.init();
    if (plugins.satelliteView) satelliteView.init();
    if (plugins.satelliteFov) satelliteFov.init();
    if (plugins.planetarium) planetarium.init();
    if (plugins.astronomy) astronomy.init();
    if (plugins.nightToggle) nightToggle.init();
    if (plugins.dops) dops.init();
    if (plugins.constellations) constellations.init();
    if (plugins.countries) countries.init();
    if (plugins.colorsMenu) colorsMenu.init();
    if (plugins.photo) photo.init();
    if (plugins.launchCalendar) launchCalendar.init();
    if (plugins.timeMachine) timeMachine.init();
    if (plugins.photoManager) photoManager.init();
    if (plugins.recorderManager) recorderManager.init();
    if (plugins.analysis) analysis.init();
    if (plugins.scenarioCreator) scenarioCreator.init();
    if (plugins.plotAnalysis) plotAnalysis.init();
    if (plugins.twitter) twitter.init();
    if (plugins.externalSources) externalSources.init();
    if (plugins.aboutManager) aboutManager.init();
    if (plugins.settingsMenu) settingsMenu.init();
    if (plugins.soundManager) soundManager.init();
    if (plugins.gamepad) gamepad.init();

    keepTrackApi.register({
      method: 'uiManagerFinal',
      cbName: 'core',
      cb: function () {
        uiManagerFinal(plugins);
      },
    });
  } catch (e) {
    console.debug(e);
  }
};
export const uiManagerFinal = (plugins: any): void => {
  const bicDom = document.getElementById('bottom-icons-container');
  if (bicDom) {
    const bottomHeight = bicDom.offsetHeight;
    document.documentElement.style.setProperty('--bottom-menu-height', bottomHeight + 'px');
  } else {
    document.documentElement.style.setProperty('--bottom-menu-height', '0px');
  }

  if (plugins.topMenu) {
    let topMenuHeight = parseInt(document.documentElement.style.getPropertyValue('--top-menu-height').replace('px', ''));
    if (isNaN(topMenuHeight)) topMenuHeight = 0;
    document.documentElement.style.setProperty('--top-menu-height', topMenuHeight + 22 + 'px');
  }

  if (document.getElementById('bottom-icons') && document.getElementById('bottom-icons').innerText == '') {
    document.getElementById('nav-footer').style.visibility = 'hidden';
  }

  const bottomContainer = document.getElementById('bottom-icons-container');
  if (bottomContainer) {
    const bottomHeight = bottomContainer.offsetHeight;
    document.documentElement.style.setProperty('--bottom-menu-top', bottomHeight + 'px');
  }

  $('#versionNumber-text').html(`${settingsManager.versionNumber} - ${settingsManager.versionDate}`);

  // Only turn on analytics if on keeptrack.space ()
  if (window.location.hostname === 'keeptrack.space' || window.location.hostname === 'www.keeptrack.space') {
    startGoogleAnalytics();
  }

  const wheel = (dom: HTMLDivElement, deltaY: number) => {
    const step = 0.15;
    const pos = dom.scrollTop();
    const nextPos = pos + step * deltaY;
    dom.scrollTop(nextPos);
  };

  $('#bottom-icons-container').bind('mousewheel', function (event: any) {
    wheel($(this), event.originalEvent.deltaY);
    event.preventDefault();
  });
};

/* istanbul ignore next */
export const startGoogleAnalytics = (): void => {
  const newScript = document.createElement('script');
  newScript.type = 'text/javascript';
  newScript.setAttribute('async', 'true');
  newScript.setAttribute('src', 'https://www.googletagmanager.com/gtag/js?id=G-ENHWK6L0X7');
  document.documentElement.firstChild.appendChild(newScript);
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line no-unused-vars
  const gtag = function (_a?: string, _b?: any): void {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  gtag('js', new Date());
  gtag('config', 'G-ENHWK6L0X7');
};
