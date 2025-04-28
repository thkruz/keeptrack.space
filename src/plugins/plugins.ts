import { keepTrackApi } from '@app/keepTrackApi';
import { CountriesMenu } from '@app/plugins/countries/countries';
import { FindSatPlugin } from '@app/plugins/find-sat/find-sat';
import { SatelliteViewPlugin } from '@app/plugins/satellite-view/satellite-view';
import { SoundManager } from '@app/plugins/sounds/sound-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import * as catalogLoader from '@app/static/catalog-loader';

import googleAnalytics from '@analytics/google-analytics';
import { KeepTrackApiEvents } from '@app/interfaces';
import createAnalytics from 'analytics';
import { KeepTrackApi } from '../keepTrackApi';
import { getEl, hideEl, showEl } from '../lib/get-el';
import { errorManagerInstance } from '../singletons/errorManager';
import { AnalysisMenu } from './analysis/analysis';
import { Astronomy } from './astronomy/astronomy';
import { Breakup } from './breakup/breakup';
import { Calculator } from './calculator/calculator';
import { ClassificationBar } from './classification-bar/classification-bar';
import { Collisions } from './collisions/collisions';
import { ColorMenu } from './colors-menu/colors-menu';
import { CreateSat } from './create-sat/create-sat';
import { DateTimeManager } from './date-time-manager/date-time-manager';
import { DebrisScreening } from './debris-screening/debris-screening';
import { DebugMenuPlugin } from './debug/debug';
import { DopsPlugin } from './dops/dops';
import { EditSat } from './edit-sat/edit-sat';
import { FilterMenuPlugin } from './filter-menu/filter-menu';
import { GamepadPlugin } from './gamepad/gamepad';
import { GraphicsMenuPlugin } from './graphics-menu/graphics-menu';
import { KeepTrackPlugin } from './KeepTrackPlugin';
import { LaunchCalendar } from './launch-calendar/launch-calendar';
import { MissilePlugin } from './missile/missile-plugin';
import { NewLaunch } from './new-launch/new-launch';
import { NextLaunchesPlugin } from './next-launches/next-launches';
import { NightToggle } from './night-toggle/night-toggle';
import { OrbitReferences } from './orbit-references/orbit-references';
import { Planetarium } from './planetarium/planetarium';
import { EcfPlot } from './plot-analysis/ecf-plots';
import { EciPlot } from './plot-analysis/eci-plots';
import { Inc2AltPlots } from './plot-analysis/inc2alt';
import { Inc2LonPlots } from './plot-analysis/inc2lon';
import { Lat2LonPlots } from './plot-analysis/lat2lon';
import { RicPlot } from './plot-analysis/ric-plots';
import { Time2LonPlots } from './plot-analysis/time2lon';
import { PolarPlotPlugin } from './polar-plot/polar-plot';
import { ProximityOps } from './proximity-ops/proximity-ops';
import { ReportsPlugin } from './reports/reports';
import { SatConstellations } from './sat-constellations/sat-constellations';
import { SatelliteFov } from './satellite-fov/satellite-fov';
import { SatellitePhotos } from './satellite-photos/satellite-photos';
import { ScreenRecorder } from './screen-recorder/screen-recorder';
import { StreamManager } from './screen-recorder/stream-manager';
import { Screenshot } from './screenshot/screenshot';
import { SatInfoBox } from './select-sat-manager/sat-info-box';
import { SelectSatManager } from './select-sat-manager/select-sat-manager';
import { SensorFov } from './sensor-fov/sensor-fov';
import { SensorListPlugin } from './sensor-list/sensor-list';
import { SensorSurvFence } from './sensor-surv/sensor-surv-fence';
import { CustomSensorPlugin } from './sensor/custom-sensor-plugin';
import { LookAnglesPlugin } from './sensor/look-angles-plugin';
import { MultiSiteLookAnglesPlugin } from './sensor/multi-site-look-angles-plugin';
import { SensorInfoPlugin } from './sensor/sensor-info-plugin';
import { SettingsMenuPlugin } from './settings-menu/settings-menu';
import { ShortTermFences } from './short-term-fences/short-term-fences';
import { SocialMedia } from './social/social';
import { StereoMap } from './stereo-map/stereo-map';
import { TimeMachine } from './time-machine/time-machine';
import { SatelliteTimeline } from './timeline-satellite/satellite-timeline';
import { SensorTimeline } from './timeline-sensor/sensor-timeline';
import { TrackingImpactPredict } from './tracking-impact-predict/tracking-impact-predict';
import { TransponderChannelData } from './transponder-channel-data/transponder-channel-data';
import { VideoDirectorPlugin } from './video-director/video-director';
import { WatchlistPlugin } from './watchlist/watchlist';
import { WatchlistOverlay } from './watchlist/watchlist-overlay';

export type KeepTrackPlugins = {
  filterMenu?: boolean;
  transponderChannelData?: boolean;
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
  Collisions?: boolean;
  trackingImpactPredict?: boolean;
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
  graphicsMenu?: boolean;
  timeline?: boolean;
  timelineAlt?: boolean;
  calculator?: boolean;
  createSat?: boolean;
  RPOCalculator?: boolean;
};

// Register all core modules
export const loadPlugins = (keepTrackApi: KeepTrackApi, plugins: KeepTrackPlugins): void => {
  plugins ??= <KeepTrackPlugins>{};
  try {
    const pluginList = [
      { init: () => new SelectSatManager().init(), enabled: true },
      { init: () => new TopMenu().init(), enabled: plugins.topMenu },
      { init: () => new DebugMenuPlugin().init(), enabled: plugins.debug },
      { init: () => new SatInfoBox().init(), enabled: plugins.satInfoboxCore },
      { init: () => new DateTimeManager().init(), enabled: plugins.datetime },
      { init: () => new SocialMedia().init(), enabled: plugins.social },
      { init: () => new ClassificationBar().init(), enabled: plugins.classificationBar },
      { init: () => new SoundManager().init(), enabled: plugins.soundManager },
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
      { init: () => new ProximityOps().init(), enabled: plugins.RPOCalculator },
      { init: () => new ShortTermFences().init(), enabled: plugins.shortTermFences },
      { init: () => new OrbitReferences().init(), enabled: plugins.orbitReferences },
      { init: () => new Collisions().init(), enabled: plugins.collisions },
      { init: () => new TrackingImpactPredict().init(), enabled: plugins.trackingImpactPredict },
      { init: () => new Breakup().init(), enabled: plugins.breakup },
      { init: () => new DebrisScreening().init(), enabled: plugins.debrisScreening },
      { init: () => new TransponderChannelData().init(), enabled: plugins.transponderChannelData },
      { init: () => new CreateSat().init(), enabled: plugins.createSat },
      { init: () => new EditSat().init(), enabled: plugins.editSat },
      { init: () => new NewLaunch().init(), enabled: plugins.newLaunch },
      { init: () => new MissilePlugin().init(), enabled: plugins.missile },
      { init: () => new StereoMap().init(), enabled: plugins.stereoMap },
      { init: () => new SensorFov().init(), enabled: plugins.sensorFov },
      { init: () => new SensorSurvFence().init(), enabled: plugins.sensorSurv },
      { init: () => new SatelliteViewPlugin().init(), enabled: plugins.satelliteView },
      { init: () => new SatelliteFov().init(), enabled: plugins.satelliteFov },
      { init: () => new Planetarium().init(), enabled: plugins.planetarium },
      { init: () => new Astronomy().init(), enabled: plugins.astronomy },
      { init: () => new NightToggle().init(), enabled: plugins.nightToggle },
      { init: () => new DopsPlugin().init(), enabled: plugins.dops },
      { init: () => new SatConstellations().init(), enabled: plugins.constellations },
      { init: () => new CountriesMenu().init(), enabled: plugins.countries },
      { init: () => new ColorMenu().init(), enabled: plugins.colorsMenu },
      { init: () => new Screenshot().init(), enabled: plugins.screenshot },
      { init: () => new LaunchCalendar().init(), enabled: plugins.launchCalendar },
      { init: () => new TimeMachine().init(), enabled: plugins.timeMachine },
      { init: () => new SatellitePhotos().init(), enabled: plugins.photoManager },
      { init: () => new ScreenRecorder().init(), enabled: plugins.screenRecorder },
      { init: () => new AnalysisMenu().init(), enabled: plugins.analysis },
      { init: () => new Calculator().init(), enabled: plugins.calculator },
      { init: () => new EciPlot().init(), enabled: plugins.plotAnalysis },
      { init: () => new EcfPlot().init(), enabled: plugins.plotAnalysis },
      { init: () => new RicPlot().init(), enabled: plugins.plotAnalysis },
      { init: () => new Time2LonPlots().init(), enabled: plugins.plotAnalysis },
      { init: () => new Lat2LonPlots().init(), enabled: plugins.plotAnalysis },
      { init: () => new Inc2AltPlots().init(), enabled: plugins.plotAnalysis },
      { init: () => new Inc2LonPlots().init(), enabled: plugins.plotAnalysis },
      { init: () => new FilterMenuPlugin().init(), enabled: plugins.filterMenu },
      { init: () => new SettingsMenuPlugin().init(), enabled: plugins.settingsMenu },
      { init: () => new GraphicsMenuPlugin().init(), enabled: plugins.graphicsMenu },
      { init: () => new GamepadPlugin().init(), enabled: plugins.gamepad },
      { init: () => new VideoDirectorPlugin().init(), enabled: plugins.videoDirector },
    ];

    for (const { init, enabled } of pluginList) {
      if (enabled) {
        try {
          init();
        } catch (e) {
          errorManagerInstance.warn(`Error loading plugin:${e.message}`);
        }
      }
    }

    if (!plugins.topMenu) {
      // Set --nav-bar-height of :root to 0px if topMenu is not enabled and ensure it overrides any other value
      document.documentElement.style.setProperty('--nav-bar-height', '0px');
    }

    // Load any settings from local storage after all plugins are loaded
    keepTrackApi.runEvent(KeepTrackApiEvents.loadSettings);

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: 'core',
      cb: () => {
        uiManagerFinal();
        KeepTrackPlugin.hideUnusedMenuModes();
      },
    });
  } catch (e) {
    errorManagerInstance.info(`Error loading core plugins:${e.message}`);
  }
};

export const uiManagerFinal = (): void => {
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

  if (getEl('bottom-icons') && getEl('bottom-icons')!.innerText === '') {
    getEl('nav-footer')!.style.visibility = 'hidden';
    hideEl('nav-footer');
  } else {
    showEl('nav-footer');
  }

  const bottomContainer = getEl('bottom-icons-container');

  if (bottomContainer) {
    const bottomHeight = bottomContainer.offsetHeight;

    document.documentElement.style.setProperty('--bottom-menu-top', `${bottomHeight}px`);
  }

  // Only turn on analytics if on keeptrack.space ()
  if (window.location.hostname === 'keeptrack.space' || window.location.hostname === 'www.keeptrack.space') {
    const analytics = createAnalytics({
      app: 'KeepTrack',
      version: 100,
      plugins: [
        googleAnalytics({
          measurementIds: 'G-ENHWK6L0X7',
        }),
      ],
    });

    if (analytics) {
      keepTrackApi.analytics = analytics;
      keepTrackApi.analytics.page();
    }
  }

  const wheel = (dom: EventTarget, deltaY: number) => {
    const domEl = dom as HTMLElement;
    const step = 0.15;
    const pos = domEl.scrollTop;
    const nextPos = pos + step * deltaY;

    domEl.scrollTop = nextPos;
  };

  ['bottom-icons', 'bottom-icons-filter'].forEach((divIdWithScroll) => {

    getEl(divIdWithScroll)!.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        event.preventDefault(); // Prevent default scroll behavior
        if (event.currentTarget) {
          wheel(event.currentTarget, event.deltaY);
        }
      },
      { passive: false }, // Must be false to allow preventDefault()
    );
  });
};


// Create common import for all plugins
export { StreamManager as CanvasRecorder, catalogLoader };
