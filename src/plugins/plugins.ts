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
import { PolarPlotPlugin } from './polar-plot/polar-plot';
import { ReportsPlugin } from './reports/reports';
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
import { SatelliteTimeline } from './timeline-satellite/satellite-timeline';
import { SensorTimeline } from './timeline-sensor/sensor-timeline';
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
  reports?: boolean;
  polarPlot?: boolean;
  timeline?: boolean;
  timelineAlt?: boolean;
};

// Register all core modules
export const loadPlugins = (keepTrackApi: KeepTrackApi, plugins: KeepTrackPlugins): void => {
  plugins ??= {};
  try {
    const pluginList = [
      { init: () => new DebugMenuPlugin().init(), enabled: plugins.debug },
      { init: () => new SelectSatManager().init(), enabled: true },
      { init: () => new TopMenu().init(), enabled: plugins.topMenu },
      { init: () => new SatInfoBox().init(), enabled: plugins.satInfoboxCore },
      { init: () => new DateTimeManager().init(), enabled: plugins.datetime },
      { init: () => new SocialMedia().init(), enabled: plugins.social },
      { init: () => new ClassificationBar().init(), enabled: plugins.classificationBar },
      { init: () => new SensorListPlugin().init(), enabled: plugins.sensor },
      { init: () => new SensorInfoPlugin().init(), enabled: plugins.sensor },
      { init: () => new CustomSensorPlugin().init(), enabled: plugins.sensor },
      { init: () => new LookAnglesPlugin().init(), enabled: plugins.sensor },
      { init: () => new MultiSiteLookAnglesPlugin().init(), enabled: plugins.sensor },
      { init: () => new SensorTimeline().init(), enabled: plugins.timeline },
      { init: () => new SatelliteTimeline().init(), enabled: plugins.timelineAlt },
      { init: () => new WatchlistPlugin().init(), enabled: plugins.watchlist },
      { init: () => new WatchlistOverlay().init(), enabled: plugins.watchlist },
      { init: () => new ReportsPlugin().init(), enabled: plugins.reports },
      { init: () => new PolarPlotPlugin().init(), enabled: plugins.polarPlot },
      { init: () => new NextLaunchesPlugin().init(), enabled: plugins.nextLaunch },
      { init: () => new FindSatPlugin().init(), enabled: plugins.findSat },
      { init: () => new ShortTermFences().init(), enabled: plugins.shortTermFences },
      { init: () => new OrbitReferences().init(), enabled: plugins.orbitReferences },
      { init: () => new Collissions().init(), enabled: plugins.collisions },
      { init: () => new Breakup().init(), enabled: plugins.breakup },
      { init: () => new DebrisScreening().init(), enabled: plugins.debrisScreening },
      { init: () => new EditSat().init(), enabled: plugins.editSat },
      { init: () => new NewLaunch().init(), enabled: plugins.newLaunch },
      { init: () => missile.init(), enabled: plugins.missile },
      { init: () => new StereoMap().init(), enabled: plugins.stereoMap },
      { init: () => new SensorFov().init(), enabled: plugins.sensorFov },
      { init: () => new SensorSurvFence().init(), enabled: plugins.sensorSurv },
      { init: () => new SatelliteViewPlugin().init(), enabled: plugins.satelliteView },
      { init: () => new SatelliteFov().init(), enabled: plugins.satelliteFov },
      { init: () => new Planetarium().init(), enabled: plugins.planetarium },
      { init: () => new Astronomy().init(), enabled: plugins.astronomy },
      { init: () => new NightToggle().init(), enabled: plugins.nightToggle },
      { init: () => dopsPlugin.init(), enabled: plugins.dops },
      { init: () => satConstellationsPlugin.init(), enabled: plugins.constellations },
      { init: () => countriesMenuPlugin.init(), enabled: plugins.countries },
      { init: () => colorMenuPlugin.init(), enabled: plugins.colorsMenu },
      { init: () => screenshotPlugin.init(), enabled: plugins.screenshot },
      { init: () => launchCalendarPlugin.init(), enabled: plugins.launchCalendar },
      { init: () => timeMachinePlugin.init(), enabled: plugins.timeMachine },
      { init: () => satellitePhotosPlugin.init(), enabled: plugins.photoManager },
      { init: () => screenRecorderPlugin.init(), enabled: plugins.screenRecorder },
      { init: () => analysisMenuPlugin.init(), enabled: plugins.analysis },
      /*
       * { plugin: eciPlotsPlugin, enabled: plugins.plotAnalysis },
       * { plugin: ecfPlotsPlugin, enabled: plugins.plotAnalysis },
       * { plugin: ricPlotPlugin, enabled: plugins.plotAnalysis },
       * { plugin: time2LonPlotsPlugin, enabled: plugins.plotAnalysis },
       * { plugin: inc2AltPlotPlugin, enabled: plugins.plotAnalysis },
       * { plugin: inc2LonPlotPlugin, enabled: plugins.plotAnalysis },
       * { plugin: aboutMenuPlugin, enabled: plugins.aboutManager },
       */
      { init: () => settingsMenuPlugin.init(), enabled: plugins.settingsMenu },
      { init: () => soundManagerPlugin.init(), enabled: plugins.soundManager },
      { init: () => gamepadPluginInstance.init(), enabled: plugins.gamepad },
      { init: () => videoDirectorPlugin.init(), enabled: plugins.videoDirector },
    ];

    for (const { init, enabled } of pluginList) {
      if (enabled) {
        init();
      }
    }

    if (!plugins.topMenu) {
      // Set --nav-bar-height of :root to 0px if topMenu is not enabled and ensure it overrides any other value
      document.documentElement.style.setProperty('--nav-bar-height', '0px');
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

export const uiManagerFinal = (plugins: any): void => {
  const bicDom = getEl('bottom-icons-container');

  if (bicDom) {
    const bottomHeight = bicDom.offsetHeight;

    document.documentElement.style.setProperty('--bottom-menu-height', `${bottomHeight}px`);
  } else {
    document.documentElement.style.setProperty('--bottom-menu-height', '0px');
  }

  /*
   * if (plugins.topMenu) {
   *   let topMenuHeight = parseInt(document.documentElement.style.getPropertyValue('--nav-bar-height').replace('px', ''));
   */

  /*
   *   if (isNaN(topMenuHeight)) {
   *     topMenuHeight = 0;
   *   }
   *   document.documentElement.style.setProperty('--nav-bar-height', `${topMenuHeight + 50}px`);
   * }
   */

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
