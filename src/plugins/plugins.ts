import { CountriesMenu } from '@app/plugins/countries/countries';
import { FindSatPlugin } from '@app/plugins/find-sat/find-sat';
import { SatelliteViewPlugin } from '@app/plugins/satellite-view/satellite-view';
import { SoundManager } from '@app/plugins/sounds/sound-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';

import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { KeepTrackPlugin } from '../engine/plugins/base-plugin';
import { errorManagerInstance } from '../engine/utils/errorManager';
import { getEl } from '../engine/utils/get-el';
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
import { GithubLinkPlugin } from './github-link/github-link';
import { KeepTrackPluginsConfiguration } from './keeptrack-plugins-configuration';
import { LaunchCalendar } from './launch-calendar/launch-calendar';
import { LinkedInLinkPlugin } from './linkedin-link/linkedin-link';
import { MissilePlugin } from './missile/missile-plugin';
import { NewLaunch } from './new-launch/new-launch';
import { NextLaunchesPlugin } from './next-launches/next-launches';
import { NightToggle } from './night-toggle/night-toggle';
import { OrbitGuardMenuPlugin } from './orbit-guard-menu/orbit-guard-menu';
import { OrbitReferences } from './orbit-references/orbit-references';
import { PlanetsMenuPlugin } from './planets-menu/planets-menu';
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
import { SatInfoBoxObject } from './sat-info-box-object/sat-info-box-object';
import { SatInfoBoxOrbitGuard } from './sat-info-box-orbit-guard/sat-info-box-orbit-guard';
import { SatInfoBoxOrbital } from './sat-info-box-orbital/sat-info-box-orbital';
import { SatInfoBoxSensor } from './sat-info-box-sensor/sat-info-box-sensor';
import { SatInfoBox } from './sat-info-box/sat-info-box';
import { SatelliteFov } from './satellite-fov/satellite-fov';
import { SatellitePhotos } from './satellite-photos/satellite-photos';
import { ScenarioManagementPlugin } from './scenario-management/scenario-management';
import { ScreenRecorder } from './screen-recorder/screen-recorder';
import { Screenshot } from './screenshot/screenshot';
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
import { StereoMap } from './stereo-map/stereo-map';
import { TimeMachine } from './time-machine/time-machine';
import { TimeSlider } from './time-slider/time-slider';
import { SatelliteTimeline } from './timeline-satellite/satellite-timeline';
import { SensorTimeline } from './timeline-sensor/sensor-timeline';
import { TooltipsPlugin } from './tooltips/tooltips';
import { TrackingImpactPredict } from './tracking-impact-predict/tracking-impact-predict';
import { TransponderChannelData } from './transponder-channel-data/transponder-channel-data';
import { VcrPlugin } from './vcr/vcr';
import { VideoDirectorPlugin } from './video-director/video-director';
import { ViewInfoRmbPlugin } from './view-info-rmb/view-info-rmb';
import { WatchlistPlugin } from './watchlist/watchlist';
import { WatchlistOverlay } from './watchlist/watchlist-overlay';

export class PluginManager {
  // Register all core modules
  async loadPlugins(plugins: KeepTrackPluginsConfiguration): Promise<void> {
    if (isThisNode()) {
      // Don't load plugins when running Jest in Node environment
      return;
    }

    plugins ??= <KeepTrackPluginsConfiguration>{};
    try {
      const pluginList: { init: () => void | Promise<void>, config?: { enabled: boolean } }[] = [
        {
          init: async () => {
            const proPlugin = await import('../plugins/telemetry/telemetry');

            PluginRegistry.addPlugin(new proPlugin.Telemetry() as unknown as KeepTrackPlugin);
          }, config: {
            enabled: true,
          },
        },
        { init: () => new SelectSatManager().init(), config: { enabled: true } },
        { init: () => new ScenarioManagementPlugin().init(), config: plugins.ScenarioManagementPlugin },
        { init: () => new TopMenu().init(), config: plugins.TopMenu },
        { init: () => new TimeSlider().init(), config: plugins.TimeSlider },
        { init: () => new TooltipsPlugin().init(), config: plugins.TooltipsPlugin },
        {
          init: async () => {
            const proPlugin = await import('../plugins/user-account/user-account');

            new proPlugin.UserAccountPlugin().init();
          }, config: plugins.UserAccountPlugin,
        },
        {
          init: async () => {
            const proPlugin = await import('../plugins/debug/debug');

            new proPlugin.DebugMenuPlugin().init();
          }, config: plugins.DebugMenuPlugin,
        },
        { init: () => new SatInfoBox().init(), config: plugins.SatInfoBoxCore },
        {
          init: async () => {
            const proPlugin = await import('../plugins/sat-info-box-actions/sat-info-box-actions');

            new proPlugin.SatInfoBoxActions().init();
          }, config: plugins.SatInfoBoxActions,
        },
        {
          init: async () => {
            const proPlugin = await import('../plugins/sat-info-box-links/sat-info-box-links');

            new proPlugin.SatInfoBoxLinks().init();
          }, config: plugins.SatInfoBoxLinks,
        },
        { init: () => new SatInfoBoxOrbital().init(), config: plugins.SatInfoBoxOrbital },
        { init: () => new SatInfoBoxOrbitGuard().init(), config: plugins.SatInfoBoxManeuver },
        { init: () => new SatInfoBoxObject().init(), config: plugins.SatInfoBoxObject },
        {
          init: async () => {
            const proPlugin = await import('../plugins/sat-info-box-mission/sat-info-box-mission');

            new proPlugin.SatInfoBoxMission().init();
          }, config: plugins.SatInfoBoxMission,
        },
        { init: () => new SatInfoBoxSensor().init(), config: plugins.SatInfoBoxSensor },
        { init: () => new DateTimeManager().init(), config: plugins.DateTimeManager },

        /*
         * Top Menu Plugins are loaded right to left.
         * TODO: This should be based on an "order" property in the configuration
         */
        { init: () => new GithubLinkPlugin().init(), config: plugins.GithubLinkPlugin },
        { init: () => new LinkedInLinkPlugin().init(), config: plugins.LinkedInLinkPlugin },

        { init: () => new ClassificationBar().init(), config: plugins.ClassificationBar },
        { init: () => new SoundManager().init(), config: plugins.SoundManager },

        {
          init: async () => {
            const proPlugin = await import('../plugins/earth-atmosphere/earth-atmosphere');

            new proPlugin.EarthAtmosphere().init();
          }, config: plugins.EarthAtmosphere,
        },

        // Bottom Menu Plugins
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
        { init: () => new OrbitGuardMenuPlugin().init(), config: plugins.OrbitGuardMenuPlugin },
        { init: () => new TrackingImpactPredict().init(), config: plugins.TrackingImpactPredict },
        { init: () => new Breakup().init(), config: plugins.Breakup },
        { init: () => new DebrisScreening().init(), config: plugins.DebrisScreening },
        { init: () => new TransponderChannelData().init(), config: plugins.transponderChannelData },
        { init: () => new CreateSat().init(), config: plugins.CreateSat },
        {
          init: async () => {
            const proPlugin = await import('../plugins/oem-reader/oem-reader');

            new proPlugin.OemReaderPlugin().init();
          }, config: plugins.OemReaderPlugin,
        },
        { init: () => new EditSat().init(), config: plugins.EditSat },
        { init: () => new NewLaunch().init(), config: plugins.NewLaunch },
        { init: () => new MissilePlugin().init(), config: plugins.MissilePlugin },
        { init: () => new SatelliteViewPlugin().init(), config: plugins.SatelliteViewPlugin },
        { init: () => new SatelliteFov().init(), config: plugins.SatelliteFov },
        { init: () => new StereoMap().init(), config: plugins.StereoMap },
        {
          init: async () => {
            const proPlugin = await import('../plugins/planetarium/planetarium');

            new proPlugin.Planetarium().init();
          }, config: plugins.Planetarium,
        },
        {
          init: async () => {
            const proPlugin = await import('../plugins/astronomy/astronomy');

            new proPlugin.Astronomy().init();
          }, config: plugins.Astronomy,
        },
        { init: () => new NightToggle().init(), config: plugins.NightToggle },
        { init: () => new DopsPlugin().init(), config: plugins.DopsPlugin },
        { init: () => new SatConstellations().init(), config: plugins.SatConstellations },
        { init: () => new CountriesMenu().init(), config: plugins.CountriesMenu },
        { init: () => new ColorMenu().init(), config: plugins.ColorMenu },
        { init: () => new PlanetsMenuPlugin().init(), config: plugins.PlanetsMenuPlugin },
        { init: () => new Screenshot().init(), config: plugins.Screenshot },
        { init: () => new LaunchCalendar().init(), config: plugins.LaunchCalendar },
        { init: () => new TimeMachine().init(), config: plugins.TimeMachine },
        { init: () => new SatellitePhotos().init(), config: plugins.SatellitePhotos },
        { init: () => new ScreenRecorder().init(), config: plugins.ScreenRecorder },
        { init: () => new AnalysisMenu().init(), config: plugins.AnalysisMenu },
        {
          init: async () => {
            const proPlugin = await import('../plugins/maneuver/maneuver');

            new proPlugin.ManeuverPlugin().init();
          }, config: plugins.ManeuverPlugin,
        },
        {
          init: async () => {
            const proPlugin = await import('../plugins/initial-orbit/initial-orbit');

            new proPlugin.InitialOrbitDeterminationPlugin().init();
          }, config: plugins.InitialOrbitDeterminationPlugin,
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
          init: async () => {
            const proPlugin = await import('../plugins/graphics-menu/graphics-menu');

            new proPlugin.GraphicsMenuPlugin().init();
          }, config: plugins.GraphicsMenuPlugin,
        },
        { init: () => new GamepadPlugin().init(), config: plugins.GamepadPlugin },
        { init: () => new VideoDirectorPlugin().init(), config: plugins.VideoDirectorPlugin },
        {
          init: async () => {
            const proPlugin = await import('../plugins/about-menu/about-menu');

            new proPlugin.AboutMenuPlugin().init();
          }, config: plugins.AboutMenuPlugin,
        },
        { init: () => new EarthPresetsPlugin().init(), config: plugins.EarthPresetsPlugin },
        { init: () => new DrawLinesPlugin().init(), config: plugins.DrawLinesPlugin },
        { init: () => new ViewInfoRmbPlugin().init(), config: plugins.ViewInfoRmbPlugin },
        { init: () => new VcrPlugin().init(), config: plugins.VcrPlugin },
      ];

      for (const { init, config } of pluginList) {
        if (config?.enabled) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await init();
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
      EventBus.getInstance().emit(EventBusEvent.loadSettings);

      EventBus.getInstance().on(
        EventBusEvent.uiManagerFinal,
        () => {
          this.uiManagerFinal_();
          KeepTrackPlugin.hideUnusedMenuModes();
        },
      );
    } catch (e) {
      errorManagerInstance.info(`Error loading core plugins:${e.message}`);
    }
  }

  private uiManagerFinal_(): void {
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
  }
}
