import { countriesMenuPlugin } from '@app/js/plugins/countries/countries';
import * as initialOrbit from '@app/js/plugins/initial-orbit/initial-orbit';
import * as missile from '@app/js/plugins/missile/missilePlugin';
import { satelliteViewPlugin } from '@app/js/plugins/satellite-view/satellite-view';
import { soundManagerPlugin } from '@app/js/plugins/sounds/sound-manager';
import { topMenuPlugin } from '@app/js/plugins/top-menu/top-menu';
import * as catalogLoader from '@app/js/static/catalog-loader';

import { Singletons } from '@app/js/interfaces';
import { keepTrackContainer } from '../container';
import { KeepTrackApiEvents, KeepTrackApiRegisterParams } from '../keepTrackApi';
import { getEl } from '../lib/get-el';
import { errorManagerInstance } from '../singletons/errorManager';
import { aboutMenuPlugin } from './about-menu/about-menu';
import { analysisMenuPlugin } from './analysis/analysis';
import { astronomyPlugin } from './astronomy/astronomy';
import { breakupPlugin } from './breakup/breakup';
import { classificationBarPlugin } from './classification-bar/classification-bar';
import { collissionsPlugin } from './collisions/collisions';
import { colorMenuPlugin } from './colors-menu/colors-menu';
import { dateTimeManagerPlugin } from './date-time-manager/date-time-manager';
import { debrisScreeningPlugin } from './debris-screening/debris-screening';
import { debugMenuPlugin } from './debug/debug';
import { dopsPlugin } from './dops/dops';
import { editSatPlugin } from './edit-sat/edit-sat';
import { findSatPlugin } from './find-sat/find-sat';
import { gamepadPluginInstance } from './gamepad/gamepad';
import { omManager } from './initial-orbit/om-manager';
import { launchCalendarPlugin } from './launch-calendar/launch-calendar';
import { newLaunchPlugin } from './new-launch/new-launch';
import { nextLaunchesPlugin } from './next-launches/next-launches';
import { nightTogglePlugin } from './night-toggle/night-toggle';
import { orbitReferencesPlugin } from './orbit-references/orbit-references';
import { planetariumPlugin } from './planetarium/planetarium';
import { ecfPlotsPlugin } from './plot-analysis/ecf-plots';
import { eciPlotsPlugin } from './plot-analysis/eci-plots';
import { inc2AltPlotPlugin } from './plot-analysis/inc2alt';
import { inc2LonPlotPlugin } from './plot-analysis/inc2lon';
import { ricPlotPlugin } from './plot-analysis/ric-plots';
import { time2LonPlotsPlugin } from './plot-analysis/time2lon';
import { satConstellationsPlugin } from './sat-constellations/sat-constellations';
import { satelliteFovPlugin } from './satellite-fov/satellite-fov';
import { satellitePhotosPlugin } from './satellite-photos/satellite-photos';
import { screenRecorderPlugin } from './screen-recorder/screen-recorder';
import { StreamManager } from './screen-recorder/stream-manager';
import { screenshotPlugin } from './screenshot/screenshot';
import { satInfoBoxCorePlugin } from './select-sat-manager/satInfoboxCore';
import { SelectSatManager } from './select-sat-manager/select-sat-manager';
import { sensorFovPlugin } from './sensor-fov/sensor-fov';
import { sensorSurvFencePlugin } from './sensor-surv/sensor-surv-fence';
import { sensorCustomPlugin } from './sensor/custom-sensor-plugin';
import { lookAnglesPlugin } from './sensor/look-angles-plugin';
import { multiSiteLookAnglesPlugin } from './sensor/multi-site-look-angles-plugin';
import { sensorInfoPlugin } from './sensor/sensor-info-plugin';
import { sensorListPlugin } from './sensor/sensor-list-plugin';
import { settingsMenuPlugin } from './settings-menu/settings-menu';
import { shortTermFencesPlugin } from './short-term-fences/short-term-fences';
import { socialMediaPlugin } from './social/social';
import { stereoMapPlugin } from './stereo-map/stereo-map';
import { timeMachinePlugin } from './time-machine/time-machine';
import { updateSatManagerPlugin } from './update-select-box/update-select-box';
import { videoDirectorPlugin } from './video-director/video-director';
import { watchlistPlugin } from './watchlist/watchlist';
import { watchlistOverlayPlugin } from './watchlist/watchlist-overlay';

export type KeepTrackPlugins = {
  videoDirector?: boolean;
  debrisScreening?: boolean;
  satInfoboxCore?: boolean;
  updateSelectBoxCore?: boolean;
  findSat?: boolean;
  collisions?: boolean;
  satelliteFov?: boolean;
  nightToggle?: boolean;
  countries?: boolean;
  screenRecorder?: boolean;
  aboutManager?: boolean;
  settingsMenu?: boolean;
  soundManager?: boolean;
  analysis?: boolean;
  astronomy?: boolean;
  breakup?: boolean;
  catalogLoader?: boolean;
  classificationBar?: boolean;
  collissions?: boolean;
  colorsMenu?: boolean;
  constellations?: boolean;
  countriesMenu?: boolean;
  datetime?: boolean;
  debug?: boolean;
  dops?: boolean;
  editSat?: boolean;
  externalSources?: boolean;
  gamepad?: boolean;
  initialOrbit?: boolean;
  launchCalendar?: boolean;
  missile?: boolean;
  newLaunch?: boolean;
  nextLaunch?: boolean;
  orbitReferences?: boolean;
  photoManager?: boolean;
  planetarium?: boolean;
  plotAnalysis?: boolean;
  satChanges?: boolean;
  satelliteView?: boolean;
  scenarioCreator?: boolean;
  screenshot?: boolean;
  sensor?: boolean;
  sensorFov?: boolean;
  sensorSurv?: boolean;
  shortTermFences?: boolean;
  social?: boolean;
  sounds?: boolean;
  stereoMap?: boolean;
  timeMachine?: boolean;
  topMenu?: boolean;
  updateSelectBox?: boolean;
  watchlist?: boolean;
};

// Register all core modules
export const loadCorePlugins = async (keepTrackApi: { register?: (params: KeepTrackApiRegisterParams) => void }, plugins: KeepTrackPlugins): Promise<void> => {
  plugins ??= {};
  try {
    // Register Catalog Loader
    // catalogLoader.init();

    // Load Debug Plugins
    if (plugins.debug) debugMenuPlugin.init();

    // Register selectSatData
    const selectSatManagerInstance = new SelectSatManager();
    selectSatManagerInstance.init();
    keepTrackContainer.registerSingleton<SelectSatManager>(Singletons.SelectSatManager, selectSatManagerInstance);

    if (plugins.topMenu) topMenuPlugin.init();
    if (plugins.satInfoboxCore) satInfoBoxCorePlugin.init();

    // Core Features
    if (plugins.updateSelectBoxCore) updateSatManagerPlugin.init();
    if (plugins.datetime) dateTimeManagerPlugin.init();
    if (plugins.social) socialMediaPlugin.init();

    // UI Menu
    if (plugins.classificationBar) classificationBarPlugin.init();
    if (plugins.sensor) {
      sensorListPlugin.init();
      sensorInfoPlugin.init();
      sensorCustomPlugin.init();
      lookAnglesPlugin.init();
      multiSiteLookAnglesPlugin.init();
    }
    if (plugins.watchlist) {
      watchlistPlugin.init();
      watchlistOverlayPlugin.init();
    }
    if (plugins.nextLaunch) nextLaunchesPlugin.init();
    if (plugins.findSat) findSatPlugin.init();
    if (plugins.shortTermFences) shortTermFencesPlugin.init();
    if (plugins.orbitReferences) orbitReferencesPlugin.init();
    if (plugins.collisions) collissionsPlugin.init();
    if (plugins.breakup) breakupPlugin.init();
    if (plugins.debrisScreening) debrisScreeningPlugin.init();
    if (plugins.editSat) editSatPlugin.init();
    if (plugins.newLaunch) newLaunchPlugin.init();
    // if (plugins.satChanges) satChanges.init();
    if (plugins.initialOrbit) initialOrbit.init();
    if (plugins.missile) missile.init();
    if (plugins.stereoMap) stereoMapPlugin.init();
    if (plugins.sensorFov) sensorFovPlugin.init();
    if (plugins.sensorSurv) sensorSurvFencePlugin.init();
    if (plugins.satelliteView) satelliteViewPlugin.init();
    if (plugins.satelliteFov) satelliteFovPlugin.init();
    if (plugins.planetarium) planetariumPlugin.init();
    // TODO: Fix astronomy plugin
    if (plugins.astronomy) astronomyPlugin.init();
    if (plugins.nightToggle) nightTogglePlugin.init();
    if (plugins.dops) dopsPlugin.init();
    if (plugins.constellations) satConstellationsPlugin.init();
    if (plugins.countries) countriesMenuPlugin.init();
    if (plugins.colorsMenu) colorMenuPlugin.init();
    if (plugins.screenshot) screenshotPlugin.init();
    if (plugins.launchCalendar) launchCalendarPlugin.init();
    if (plugins.timeMachine) timeMachinePlugin.init();
    if (plugins.photoManager) satellitePhotosPlugin.init();
    if (plugins.screenRecorder) screenRecorderPlugin.init();
    if (plugins.analysis) analysisMenuPlugin.init();
    if (plugins.plotAnalysis) eciPlotsPlugin.init();
    if (plugins.plotAnalysis) ecfPlotsPlugin.init();
    if (plugins.plotAnalysis) ricPlotPlugin.init();
    if (plugins.plotAnalysis) time2LonPlotsPlugin.init();
    if (plugins.plotAnalysis) inc2AltPlotPlugin.init();
    if (plugins.plotAnalysis) inc2LonPlotPlugin.init();
    // if (plugins.externalSources) externalSources.init();
    if (plugins.aboutManager) aboutMenuPlugin.init();
    if (plugins.settingsMenu) settingsMenuPlugin.init();
    // if (plugins.debug) debug.initMenu();
    if (plugins.soundManager) soundManagerPlugin.init();
    if (plugins.gamepad) gamepadPluginInstance.init();
    if (plugins.videoDirector) videoDirectorPlugin.init();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: 'core',
      cb: () => {
        uiManagerFinal(plugins);
      },
    });
  } catch (e) {
    errorManagerInstance.info('Error loading core plugins:' + e.message);
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
    if (settingsManager.isMobileModeEnabled) {
      document.documentElement.style.setProperty('--top-menu-height', topMenuHeight + 17 + 'px');
    } else {
      document.documentElement.style.setProperty('--top-menu-height', topMenuHeight + 22 + 'px');
    }
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
export { StreamManager as CanvasRecorder, catalogLoader, initialOrbit, missile, omManager };
