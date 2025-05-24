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
import { Breakup } from './breakup/breakup';
import { Calculator } from './calculator/calculator';
import { ClassificationBar } from './classification-bar/classification-bar';
import { Collisions } from './collisions/collisions';
import { ColorMenu } from './colors-menu/colors-menu';
import { CreateSat } from './create-sat/create-sat';
import { DateTimeManager } from './date-time-manager/date-time-manager';
import { DebrisScreening } from './debris-screening/debris-screening';
import { DopsPlugin } from './dops/dops';
import { EditSat } from './edit-sat/edit-sat';
import { FilterMenuPlugin } from './filter-menu/filter-menu';
import { GamepadPlugin } from './gamepad/gamepad';
import { KeepTrackPluginsConfiguration } from './keeptrack-plugins-configuration';
import { KeepTrackPlugin } from './KeepTrackPlugin';
import { LaunchCalendar } from './launch-calendar/launch-calendar';
import { MissilePlugin } from './missile/missile-plugin';
import { NewLaunch } from './new-launch/new-launch';
import { NextLaunchesPlugin } from './next-launches/next-launches';
import { NightToggle } from './night-toggle/night-toggle';
import { OrbitReferences } from './orbit-references/orbit-references';
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

// Register all core modules
export const loadPlugins = (keepTrackApi: KeepTrackApi, plugins: KeepTrackPluginsConfiguration): void => {
  plugins ??= <KeepTrackPluginsConfiguration>{};
  try {
    const pluginList: { init: () => void, config?: { enabled: boolean } }[] = [
      { init: () => new SelectSatManager().init(), config: { enabled: true } },
      { init: () => new TopMenu().init(), config: plugins.topMenu },
      {
        init: () => (async () => {
          const proPlugin = await import('../plugins/debug/debug');

          new proPlugin.DebugMenuPlugin().init();
        })(), config: plugins.debug,
      },
      { init: () => new SatInfoBox().init(), config: plugins.satInfoboxCore },
      { init: () => new DateTimeManager().init(), config: plugins.datetime },
      { init: () => new SocialMedia().init(), config: plugins.social },
      { init: () => new ClassificationBar().init(), config: plugins.classificationBar },
      { init: () => new SoundManager().init(), config: plugins.soundManager },
      { init: () => new SensorListPlugin().init(), config: plugins.sensor },
      { init: () => new SensorInfoPlugin().init(), config: plugins.sensor },
      { init: () => new CustomSensorPlugin().init(), config: plugins.sensor },
      { init: () => new LookAnglesPlugin().init(), config: plugins.sensor },
      { init: () => new MultiSiteLookAnglesPlugin().init(), config: plugins.sensor },
      { init: () => new SensorTimeline().init(), config: plugins.timeline },
      { init: () => new SatelliteTimeline().init(), config: plugins.timelineAlt },
      { init: () => new WatchlistPlugin().init(), config: plugins.watchlist },
      { init: () => new WatchlistOverlay().init(), config: plugins.watchlist },
      { init: () => new ReportsPlugin().init(), config: plugins.reports },
      { init: () => new PolarPlotPlugin().init(), config: plugins.polarPlot },
      { init: () => new NextLaunchesPlugin().init(), config: plugins.nextLaunch },
      { init: () => new FindSatPlugin().init(), config: plugins.findSat },
      { init: () => new ProximityOps().init(), config: plugins.RPOCalculator },
      { init: () => new ShortTermFences().init(), config: plugins.shortTermFences },
      { init: () => new OrbitReferences().init(), config: plugins.orbitReferences },
      { init: () => new Collisions().init(), config: plugins.collisions },
      { init: () => new TrackingImpactPredict().init(), config: plugins.trackingImpactPredict },
      { init: () => new Breakup().init(), config: plugins.breakup },
      { init: () => new DebrisScreening().init(), config: plugins.debrisScreening },
      { init: () => new TransponderChannelData().init(), config: plugins.transponderChannelData },
      { init: () => new CreateSat().init(), config: plugins.createSat },
      { init: () => new EditSat().init(), config: plugins.editSat },
      { init: () => new NewLaunch().init(), config: plugins.newLaunch },
      { init: () => new MissilePlugin().init(), config: plugins.missile },
      { init: () => new StereoMap().init(), config: plugins.stereoMap },
      { init: () => new SensorFov().init(), config: plugins.sensorFov },
      { init: () => new SensorSurvFence().init(), config: plugins.sensorSurv },
      { init: () => new SatelliteViewPlugin().init(), config: plugins.satelliteView },
      { init: () => new SatelliteFov().init(), config: plugins.satelliteFov },
      {
        init: () => (async () => {
          const proPlugin = await import('../plugins/planetarium/planetarium');

          new proPlugin.Planetarium().init();
        })(), config: plugins.planetarium,
      },
      {
        init: () => (async () => {
          const proPlugin = await import('../plugins/astronomy/astronomy');

          new proPlugin.Astronomy().init();
        })(), config: plugins.astronomy,
      },
      { init: () => new NightToggle().init(), config: plugins.nightToggle },
      { init: () => new DopsPlugin().init(), config: plugins.DopsPlugin },
      { init: () => new SatConstellations().init(), config: plugins.constellations },
      { init: () => new CountriesMenu().init(), config: plugins.countries },
      { init: () => new ColorMenu().init(), config: plugins.colorsMenu },
      { init: () => new Screenshot().init(), config: plugins.screenshot },
      { init: () => new LaunchCalendar().init(), config: plugins.launchCalendar },
      { init: () => new TimeMachine().init(), config: plugins.timeMachine },
      { init: () => new SatellitePhotos().init(), config: plugins.photoManager },
      { init: () => new ScreenRecorder().init(), config: plugins.screenRecorder },
      { init: () => new AnalysisMenu().init(), config: plugins.analysis },
      {
        init: () => (async () => {
          const proPlugin = await import('../plugins/initial-orbit/initial-orbit');

          new proPlugin.InitialOrbitDeterminationPlugin().init();
        })(), config: plugins.initialOrbit,
      },
      { init: () => new Calculator().init(), config: plugins.calculator },
      { init: () => new EciPlot().init(), config: plugins.plotAnalysis },
      { init: () => new EcfPlot().init(), config: plugins.plotAnalysis },
      { init: () => new RicPlot().init(), config: plugins.plotAnalysis },
      { init: () => new Time2LonPlots().init(), config: plugins.plotAnalysis },
      { init: () => new Lat2LonPlots().init(), config: plugins.plotAnalysis },
      { init: () => new Inc2AltPlots().init(), config: plugins.plotAnalysis },
      { init: () => new Inc2LonPlots().init(), config: plugins.plotAnalysis },
      { init: () => new FilterMenuPlugin().init(), config: plugins.filterMenu },
      { init: () => new SettingsMenuPlugin().init(), config: plugins.settingsMenu },
      {
        init: () => (async () => {
          const proPlugin = await import('../plugins/graphics-menu/graphics-menu');

          new proPlugin.GraphicsMenuPlugin().init();
        })(), config: plugins.graphicsMenu,
      },
      { init: () => new GamepadPlugin().init(), config: plugins.gamepad },
      { init: () => new VideoDirectorPlugin().init(), config: plugins.videoDirector },
      {
        init: () => (async () => {
          const proPlugin = await import('../plugins/about-menu/about-menu');

          new proPlugin.AboutMenu().init();
        })(), config: plugins.aboutManager,
      },
    ];

    for (const { init, config } of pluginList) {
      if (config?.enabled) {
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
    keepTrackApi.emit(KeepTrackApiEvents.loadSettings);

    keepTrackApi.on(
      KeepTrackApiEvents.uiManagerFinal,
      () => {
        uiManagerFinal();
        KeepTrackPlugin.hideUnusedMenuModes();
      },
    );
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

