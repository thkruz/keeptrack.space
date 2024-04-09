import { countriesMenuPlugin } from '@app/plugins/countries/countries';
import { FindSatPlugin } from '@app/plugins/find-sat/find-sat';
import * as missile from '@app/plugins/missile/missilePlugin';
import { SatelliteViewPlugin } from '@app/plugins/satellite-view/satellite-view';
import { soundManagerPlugin } from '@app/plugins/sounds/sound-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import * as catalogLoader from '@app/static/catalog-loader';

import { KeepTrackApiEvents } from '@app/interfaces';
import { KeepTrackApi } from '../keepTrackApi';
import { getEl, hideEl, showEl } from '../lib/get-el';
import { errorManagerInstance } from '../singletons/errorManager';
// import { aboutMenuPlugin } from './about-menu/about-menu';
import { analysisMenuPlugin } from './analysis/analysis';
import { Astronomy } from './astronomy/astronomy';
import { Breakup } from './breakup/breakup';
import { ClassificationBar } from './classification-bar/classification-bar';
import { Collissions } from './collisions/collisions';
import { colorMenuPlugin } from './colors-menu/colors-menu';
import { DateTimeManager } from './date-time-manager/date-time-manager';
import { DebrisScreening } from './debris-screening/debris-screening';
import { DebugMenuPlugin } from './debug/debug';
import { dopsPlugin } from './dops/dops';
import { EditSat } from './edit-sat/edit-sat';
import { gamepadPluginInstance } from './gamepad/gamepad';
import { launchCalendarPlugin } from './launch-calendar/launch-calendar';
import { NewLaunch } from './new-launch/new-launch';
import { NextLaunchesPlugin } from './next-launches/next-launches';
import { NightToggle } from './night-toggle/night-toggle';
import { OrbitReferences } from './orbit-references/orbit-references';
import { Planetarium } from './planetarium/planetarium';
/*
 * import { ecfPlotsPlugin } from './plot-analysis/ecf-plots';
 * import { eciPlotsPlugin } from './plot-analysis/eci-plots';
 * import { inc2AltPlotPlugin } from './plot-analysis/inc2alt';
 * import { inc2LonPlotPlugin } from './plot-analysis/inc2lon';
 * import { ricPlotPlugin } from './plot-analysis/ric-plots';
 * import { time2LonPlotsPlugin } from './plot-analysis/time2lon';
 */
import { satConstellationsPlugin } from './sat-constellations/sat-constellations';
import { SatelliteFov } from './satellite-fov/satellite-fov';
import { satellitePhotosPlugin } from './satellite-photos/satellite-photos';
import { screenRecorderPlugin } from './screen-recorder/screen-recorder';
import { StreamManager } from './screen-recorder/stream-manager';
import { screenshotPlugin } from './screenshot/screenshot';
import { SatInfoBox } from './select-sat-manager/sat-info-box';
import { SelectSatManager } from './select-sat-manager/select-sat-manager';
import { SensorFov } from './sensor-fov/sensor-fov';
import { SensorListPlugin } from './sensor-list/sensor-list';
import { SensorSurvFence } from './sensor-surv/sensor-surv-fence';
import { CustomSensorPlugin } from './sensor/custom-sensor-plugin';
import { LookAnglesPlugin } from './sensor/look-angles-plugin';
import { MultiSiteLookAnglesPlugin } from './sensor/multi-site-look-angles-plugin';
import { SensorInfoPlugin } from './sensor/sensor-info-plugin';
import { settingsMenuPlugin } from './settings-menu/settings-menu';
import { ShortTermFences } from './short-term-fences/short-term-fences';
import { SocialMedia } from './social/social';
import { StereoMap } from './stereo-map/stereo-map';
import { timeMachinePlugin } from './time-machine/time-machine';
import { videoDirectorPlugin } from './video-director/video-director';
import { WatchlistPlugin } from './watchlist/watchlist';
import { WatchlistOverlay } from './watchlist/watchlist-overlay';

export type KeepTrackPlugins = {
  videoDirector?: boolean;
  debrisScreening?: boolean;
  satInfoboxCore?: boolean;
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
export const loadPlugins = async (keepTrackApi: KeepTrackApi, plugins: KeepTrackPlugins): Promise<void> => {
  plugins ??= {};
  try {
    loadCorePlugins_(plugins);

    if (plugins.classificationBar) {
      new ClassificationBar().init();
    }
    if (plugins.sensor) {
      new SensorListPlugin().init();
      new SensorInfoPlugin().init();
      new CustomSensorPlugin().init();
      new LookAnglesPlugin().init();
      new MultiSiteLookAnglesPlugin().init();
    }
    if (plugins.watchlist) {
      new WatchlistPlugin().init();
      new WatchlistOverlay().init();
    }
    if (plugins.nextLaunch) {
      new NextLaunchesPlugin().init();
    }
    if (plugins.findSat) {
      new FindSatPlugin().init();
    }
    if (plugins.shortTermFences) {
      new ShortTermFences().init();
    }
    if (plugins.orbitReferences) {
      new OrbitReferences().init();
    }
    if (plugins.collisions) {
      new Collissions().init();
    }
    if (plugins.breakup) {
      new Breakup().init();
    }
    if (plugins.debrisScreening) {
      new DebrisScreening().init();
    }
    if (plugins.editSat) {
      new EditSat().init();
    }
    if (plugins.newLaunch) {
      new NewLaunch().init();
    }
    if (plugins.missile) {
      missile.init();
    }
    if (plugins.stereoMap) {
      new StereoMap().init();
    }
    if (plugins.sensorFov) {
      new SensorFov().init();
    }
    if (plugins.sensorSurv) {
      new SensorSurvFence().init();
    }
    if (plugins.satelliteView) {
      new SatelliteViewPlugin().init();
    }
    if (plugins.satelliteFov) {
      new SatelliteFov().init();
    }
    if (plugins.planetarium) {
      new Planetarium().init();
    }
    // TODO: Fix astronomy plugin
    if (plugins.astronomy) {
      new Astronomy().init();
    }
    if (plugins.nightToggle) {
      new NightToggle().init();
    }
    if (plugins.dops) {
      dopsPlugin.init();
    }
    if (plugins.constellations) {
      satConstellationsPlugin.init();
    }
    if (plugins.countries) {
      countriesMenuPlugin.init();
    }
    if (plugins.colorsMenu) {
      colorMenuPlugin.init();
    }
    if (plugins.screenshot) {
      screenshotPlugin.init();
    }
    if (plugins.launchCalendar) {
      launchCalendarPlugin.init();
    }
    if (plugins.timeMachine) {
      timeMachinePlugin.init();
    }
    if (plugins.photoManager) {
      satellitePhotosPlugin.init();
    }
    if (plugins.screenRecorder) {
      screenRecorderPlugin.init();
    }
    if (plugins.analysis) {
      analysisMenuPlugin.init();
    }
    /*
     * if (plugins.plotAnalysis) eciPlotsPlugin.init();
     * if (plugins.plotAnalysis) ecfPlotsPlugin.init();
     * if (plugins.plotAnalysis) ricPlotPlugin.init();
     * if (plugins.plotAnalysis) time2LonPlotsPlugin.init();
     * if (plugins.plotAnalysis) inc2AltPlotPlugin.init();
     * if (plugins.plotAnalysis) inc2LonPlotPlugin.init();
     * if (plugins.aboutManager) aboutMenuPlugin.init();
     */
    if (plugins.settingsMenu) {
      settingsMenuPlugin.init();
    }
    if (plugins.soundManager) {
      soundManagerPlugin.init();
    }
    if (plugins.gamepad) {
      gamepadPluginInstance.init();
    }
    if (plugins.videoDirector) {
      videoDirectorPlugin.init();
    }

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: 'core',
      cb: () => {
        uiManagerFinal(plugins);
      },
    });
  } catch (e) {
    errorManagerInstance.info(`Error loading core plugins:${e.message}`);
  }
};

const loadCorePlugins_ = (plugins: KeepTrackPlugins) => {
  if (plugins.debug) {
    new DebugMenuPlugin().init();
  }
  new SelectSatManager().init();

  if (plugins.topMenu) {
    new TopMenu().init();
  }
  if (plugins.satInfoboxCore) {
    new SatInfoBox().init();
  }
  if (plugins.datetime) {
    new DateTimeManager().init();
  }
  if (plugins.social) {
    new SocialMedia().init();
  }
};

export const uiManagerFinal = (plugins: any): void => {
  const bicDom = getEl('bottom-icons-container');

  if (bicDom) {
    const bottomHeight = bicDom.offsetHeight;

    document.documentElement.style.setProperty('--bottom-menu-height', `${bottomHeight}px`);
  } else {
    document.documentElement.style.setProperty('--bottom-menu-height', '0px');
  }

  if (plugins.topMenu) {
    let topMenuHeight = parseInt(document.documentElement.style.getPropertyValue('--nav-bar-height').replace('px', ''));

    if (isNaN(topMenuHeight)) {
      topMenuHeight = 0;
    }
    document.documentElement.style.setProperty('--nav-bar-height', `${topMenuHeight + 50}px`);
  }

  if (getEl('bottom-icons') && getEl('bottom-icons').innerText == '') {
    getEl('nav-footer').style.visibility = 'hidden';
    hideEl('nav-footer');
  } else {
    showEl('nav-footer');
  }

  const bottomContainer = getEl('bottom-icons-container');

  if (bottomContainer) {
    const bottomHeight = bottomContainer.offsetHeight;

    document.documentElement.style.setProperty('--bottom-menu-top', `${bottomHeight}px`);
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
    { passive: false },
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
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const gtag = function (_a?: string, _b?: any): void {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };

  gtag('js', new Date());
  gtag('config', 'G-ENHWK6L0X7');
};

// Create common import for all plugins
export { StreamManager as CanvasRecorder, catalogLoader, missile };
