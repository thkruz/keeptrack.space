import * as aboutManager from '@app/js/plugins/about-manager/about-manager';
import * as analysis from '@app/js/plugins/analysis/analysis';
import * as astronomy from '@app/js/plugins/astronomy/astronomy';
import * as breakup from '@app/js/plugins/breakup/breakup';
import * as catalogLoader from '@app/js/plugins/catalog-loader/catalog-loader';
import * as classification from '@app/js/plugins/classification/classification';
import * as collisions from '@app/js/plugins/collisions/collisions';
import * as colorsMenu from '@app/js/plugins/colors-menu/colors-menu';
import * as constellations from '@app/js/plugins/constellations/constellations';
import * as countries from '@app/js/plugins/countries/countries';
import * as datetime from '@app/js/plugins/date-time/date-time';
import * as debug from '@app/js/plugins/debug/debug';
import * as dops from '@app/js/plugins/dops/dops';
import * as editSat from '@app/js/plugins/edit-sat/edit-sat';
import * as externalSources from '@app/js/plugins/external-sources/external-sources';
import * as findSat from '@app/js/plugins/find-sat/find-sat';
import * as gamepad from '@app/js/plugins/gamepad/gamepad';
import * as initialOrbit from '@app/js/plugins/initial-orbit/initial-orbit';
import * as launchCalendar from '@app/js/plugins/launch-calendar/launch-calendar';
import * as missile from '@app/js/plugins/missile/missile';
import * as newLaunch from '@app/js/plugins/new-launch/new-launch';
import * as nextLaunch from '@app/js/plugins/next-launch/next-launch';
import * as nightToggle from '@app/js/plugins/night-toggle/night-toggle';
import * as orbitReferences from '@app/js/plugins/orbit-references/orbit-references';
import * as photoManager from '@app/js/plugins/photo-manager/photo-manager';
import * as photo from '@app/js/plugins/photo/photo';
import * as planetarium from '@app/js/plugins/planetarium/planetarium';
import * as plotAnalysis from '@app/js/plugins/plot-analysis/plot-analysis';
import * as recorderManager from '@app/js/plugins/recorder-manager/recorder-manager';
import * as satChanges from '@app/js/plugins/sat-changes/sat-changes';
import * as satelliteFov from '@app/js/plugins/satellite-fov/satellite-fov';
import * as satelliteView from '@app/js/plugins/satellite-view/satellite-view';
import * as scenarioCreator from '@app/js/plugins/scenario-creator/scenario-creator';
import * as satInfoboxCore from '@app/js/plugins/select-sat-manager/satInfoboxCore';
import * as sensorFov from '@app/js/plugins/sensor-fov/sensor-fov';
import * as sensorSurv from '@app/js/plugins/sensor-surv/sensor-surv';
import * as sensor from '@app/js/plugins/sensor/sensor';
import * as settingsMenu from '@app/js/plugins/settings-menu/settings-menu';
import * as shortTermFences from '@app/js/plugins/short-term-fences/short-term-fences';
import * as social from '@app/js/plugins/social/social';
import * as soundManager from '@app/js/plugins/sounds/sounds';
import * as stereoMap from '@app/js/plugins/stereo-map/stereo-map';
import * as timeMachine from '@app/js/plugins/time-machine/time-machine';
import * as topMenu from '@app/js/plugins/top-menu/top-menu';
import * as twitter from '@app/js/plugins/twitter/twitter';
import * as updateSelectBoxCore from '@app/js/plugins/update-select-box/update-select-box';
import * as watchlist from '@app/js/plugins/watchlist/watchlist';
import { getEl } from '../lib/helpers';
import { omManager } from './initial-orbit/om-manager';
import { CanvasRecorder } from './recorder-manager/canvas-recorder/canvas-recorder';
import { isselectedSatNegativeOne, selectSatManager } from './select-sat-manager/select-sat-manager';
import { addCustomSensor, clearCustomSensors, removeLastSensor } from './sensor/sensor';
import { sensorManager } from './sensor/sensorManager';

// Register all core modules
// prettier-ignore
export const loadCorePlugins = async (keepTrackApi: { programs?: any; register?: any }, plugins: any): Promise<void> => {  // NOSONAR
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
    // TODO: Fix astronomy plugin
    // if (plugins.astronomy) astronomy.init();
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
  const bicDom = getEl('bottom-icons-container');
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

  if (getEl('bottom-icons') && getEl('bottom-icons').innerText == '') {
    getEl('nav-footer').style.visibility = 'hidden';
  }

  const bottomContainer = getEl('bottom-icons-container');
  if (bottomContainer) {
    const bottomHeight = bottomContainer.offsetHeight;
    document.documentElement.style.setProperty('--bottom-menu-top', bottomHeight + 'px');
  }

  if (plugins.aboutManager) {
    getEl('versionNumber-text').innerHTML = `${settingsManager.versionNumber} - ${settingsManager.versionDate}`;
  }

  // Only turn on analytics if on keeptrack.space ()
  if (window.location.hostname === 'keeptrack.space' || window.location.hostname === 'www.keeptrack.space') {
    startGoogleAnalytics();
  }

  const wheel = (dom: any, deltaY: number) => {
    const step = 0.15;
    const pos = dom.scrollTop;
    const nextPos = pos + step * deltaY;
    dom.scrollTop = nextPos;
  };

  getEl('bottom-icons-container').addEventListener(
    'mousewheel',
    (event: any) => {
      event.preventDefault();
      wheel(event.currentTarget, event.deltaY);
    },
    { passive: false }
  );
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

// Create common import for all plugins
export {
  classification,
  sensor,
  watchlist,
  nextLaunch,
  findSat,
  shortTermFences,
  orbitReferences,
  collisions,
  breakup,
  editSat,
  newLaunch,
  satChanges,
  initialOrbit,
  missile,
  stereoMap,
  sensorFov,
  sensorSurv,
  satelliteView,
  satelliteFov,
  planetarium,
  astronomy,
  nightToggle,
  dops,
  constellations,
  countries,
  colorsMenu,
  photo,
  launchCalendar,
  timeMachine,
  photoManager,
  recorderManager,
  analysis,
  plotAnalysis,
  twitter,
  externalSources,
  aboutManager,
  settingsMenu,
  soundManager,
  gamepad,
  catalogLoader,
  debug,
  satInfoboxCore,
  updateSelectBoxCore,
  topMenu,
  datetime,
  social,
  scenarioCreator,
  sensorManager,
  isselectedSatNegativeOne,
  selectSatManager,
  omManager,
  CanvasRecorder,
  clearCustomSensors,
  addCustomSensor,
  removeLastSensor,
};
