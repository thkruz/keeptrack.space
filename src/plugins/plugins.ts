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
import { getEl } from '../lib/get-el';
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
import { DrawLinesPlugin } from './draw-lines/draw-lines';
import { EarthPresetsPlugin } from './earth-presets/earth-presets';
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
import { ViewInfoRmbPlugin } from './view-info-rmb/view-info-rmb';
import { WatchlistPlugin } from './watchlist/watchlist';
import { WatchlistOverlay } from './watchlist/watchlist-overlay';

// Register all core modules
export const loadPlugins = (keepTrackApi: KeepTrackApi, plugins: KeepTrackPluginsConfiguration): void => {
  plugins ??= <KeepTrackPluginsConfiguration>{};
  try {
    const pluginList: { init: () => void, config?: { enabled: boolean } }[] = [
      { init: () => new SelectSatManager().init(), config: { enabled: true } },
      { init: () => new TopMenu().init(), config: plugins.TopMenu },
      {
        init: () => (async () => {
          const proPlugin = await import('../plugins-pro/debug/debug');

          new proPlugin.DebugMenuPlugin().init();
        })(), config: plugins.DebugMenuPlugin,
      },
      { init: () => new SatInfoBox().init(), config: plugins.SatInfoBox },
      { init: () => new DateTimeManager().init(), config: plugins.DateTimeManager },
      { init: () => new SocialMedia().init(), config: plugins.SocialMedia },
      { init: () => new ClassificationBar().init(), config: plugins.ClassificationBar },
      { init: () => new SoundManager().init(), config: plugins.SoundManager },
      { init: () => new SensorListPlugin().init(), config: plugins.SensorListPlugin },
      { init: () => new SensorInfoPlugin().init(), config: plugins.SensorInfoPlugin },
      { init: () => new CustomSensorPlugin().init(), config: plugins.CustomSensorPlugin },
      { init: () => new SensorFov().init(), config: plugins.SensorFov },
      { init: () => new SensorSurvFence().init(), config: plugins.SensorSurvFence },
      { init: () => new ShortTermFences().init(), config: plugins.ShortTermFences },
      { init: () => new LookAnglesPlugin().init(), config: plugins.LookAnglesPlugin },
      { init: () => new MultiSiteLookAnglesPlugin().init(), config: plugins.MultiSiteLookAnglesPlugin },
      { init: () => new SensorTimeline().init(), config: plugins.SensorTimeline },
      { init: () => new SatelliteTimeline().init(), config: plugins.SatelliteTimeline },
      { init: () => new WatchlistPlugin().init(), config: plugins.WatchlistPlugin },
      { init: () => new WatchlistOverlay().init(), config: plugins.WatchlistOverlay },
      { init: () => new ReportsPlugin().init(), config: plugins.ReportsPlugin },
      { init: () => new PolarPlotPlugin().init(), config: plugins.PolarPlotPlugin },
      { init: () => new NextLaunchesPlugin().init(), config: plugins.NextLaunchesPlugin },
      { init: () => new FindSatPlugin().init(), config: plugins.FindSatPlugin },
      { init: () => new ProximityOps().init(), config: plugins.ProximityOps },
      { init: () => new OrbitReferences().init(), config: plugins.OrbitReferences },
      { init: () => new Collisions().init(), config: plugins.Collisions },
      { init: () => new TrackingImpactPredict().init(), config: plugins.TrackingImpactPredict },
      { init: () => new Breakup().init(), config: plugins.Breakup },
      { init: () => new DebrisScreening().init(), config: plugins.DebrisScreening },
      { init: () => new TransponderChannelData().init(), config: plugins.transponderChannelData },
      { init: () => new CreateSat().init(), config: plugins.CreateSat },
      { init: () => new EditSat().init(), config: plugins.EditSat },
      { init: () => new NewLaunch().init(), config: plugins.NewLaunch },
      { init: () => new MissilePlugin().init(), config: plugins.MissilePlugin },
      { init: () => new SatelliteViewPlugin().init(), config: plugins.SatelliteViewPlugin },
      { init: () => new SatelliteFov().init(), config: plugins.SatelliteFov },
      { init: () => new StereoMap().init(), config: plugins.StereoMap },
      {
        init: () => (async () => {
          const proPlugin = await import('../plugins-pro/planetarium/planetarium');

          new proPlugin.Planetarium().init();
        })(), config: plugins.Planetarium,
      },
      {
        init: () => (async () => {
          const proPlugin = await import('../plugins-pro/astronomy/astronomy');

          new proPlugin.Astronomy().init();
        })(), config: plugins.Astronomy,
      },
      { init: () => new NightToggle().init(), config: plugins.NightToggle },
      { init: () => new DopsPlugin().init(), config: plugins.DopsPlugin },
      { init: () => new SatConstellations().init(), config: plugins.SatConstellations },
      { init: () => new CountriesMenu().init(), config: plugins.CountriesMenu },
      { init: () => new ColorMenu().init(), config: plugins.ColorMenu },
      { init: () => new Screenshot().init(), config: plugins.Screenshot },
      { init: () => new LaunchCalendar().init(), config: plugins.LaunchCalendar },
      { init: () => new TimeMachine().init(), config: plugins.TimeMachine },
      { init: () => new SatellitePhotos().init(), config: plugins.SatellitePhotos },
      { init: () => new ScreenRecorder().init(), config: plugins.ScreenRecorder },
      { init: () => new AnalysisMenu().init(), config: plugins.AnalysisMenu },
      {
        init: () => (async () => {
          const proPlugin = await import('../plugins-pro/initial-orbit/initial-orbit');

          new proPlugin.InitialOrbitDeterminationPlugin().init();
        })(), config: plugins.InitialOrbitDeterminationPlugin,
      },
      { init: () => new Calculator().init(), config: plugins.Calculator },
      { init: () => new EciPlot().init(), config: plugins.EciPlot },
      { init: () => new EcfPlot().init(), config: plugins.EcfPlot },
      { init: () => new RicPlot().init(), config: plugins.RicPlot },
      { init: () => new Time2LonPlots().init(), config: plugins.Time2LonPlots },
      { init: () => new Lat2LonPlots().init(), config: plugins.Lat2LonPlots },
      { init: () => new Inc2AltPlots().init(), config: plugins.Inc2AltPlots },
      { init: () => new Inc2LonPlots().init(), config: plugins.Inc2LonPlots },
      { init: () => new FilterMenuPlugin().init(), config: plugins.FilterMenuPlugin },
      { init: () => new SettingsMenuPlugin().init(), config: plugins.SettingsMenuPlugin },
      {
        init: () => (async () => {
          const proPlugin = await import('../plugins-pro/graphics-menu/graphics-menu');

          new proPlugin.GraphicsMenuPlugin().init();
        })(), config: plugins.GraphicsMenuPlugin,
      },
      { init: () => new GamepadPlugin().init(), config: plugins.GamepadPlugin },
      { init: () => new VideoDirectorPlugin().init(), config: plugins.VideoDirectorPlugin },
      {
        init: () => (async () => {
          const proPlugin = await import('../plugins-pro/about-menu/about-menu');

          new proPlugin.AboutMenuPlugin().init();
        })(), config: plugins.AboutMenuPlugin,
      },
      { init: () => new EarthPresetsPlugin().init(), config: plugins.EarthPresetsPlugin },
      { init: () => new DrawLinesPlugin().init(), config: plugins.DrawLinesPlugin },
      { init: () => new ViewInfoRmbPlugin().init(), config: plugins.ViewInfoRmbPlugin },
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

    if (!plugins.TopMenu) {
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
};


// Create common import for all plugins
export { StreamManager as CanvasRecorder, catalogLoader };

