import { PluginManager } from '@app/plugins/plugins';

describe('plugins', () => {
  it('should be able to initialize all plugins', () => {
    const pluginManager = new PluginManager();

    pluginManager.loadPlugins({
      DebugMenuPlugin: {
        enabled: true,
      },
      SatInfoBoxCore: {
        enabled: true,
      },
      AboutMenuPlugin: {
        enabled: true,
      },
      Collisions: {
        enabled: true,
      },
      DopsPlugin: {
        enabled: true,
      },
      FindSatPlugin: {
        enabled: true,
      },
      LaunchCalendar: {
        enabled: true,
      },
      NewLaunch: {
        enabled: true,
      },
      NextLaunchesPlugin: {
        enabled: true,
      },
      NightToggle: {
        enabled: true,
      },
      SatellitePhotos: {
        enabled: true,
      },
      ScreenRecorder: {
        enabled: true,
      },
      SatChangesPlugin: {
        enabled: true,
      },
      StereoMap: {
        enabled: true,
      },
      TimeMachine: {
        enabled: true,
      },
      InitialOrbitDeterminationPlugin: {
        enabled: true,
      },
      MissilePlugin: {
        enabled: true,
      },
      Breakup: {
        enabled: true,
      },
      EditSat: {
        enabled: true,
      },
      SatConstellations: {
        enabled: true,
      },
      CountriesMenu: {
        enabled: true,
      },
      ColorMenu: {
        enabled: true,
      },
      ShortTermFences: {
        enabled: true,
      },
      OrbitReferences: {
        enabled: true,
      },
      AnalysisMenu: {
        enabled: true,
      },
      SensorFov: {
        enabled: true,
      },
      SensorSurvFence: {
        enabled: true,
      },
      SatelliteFov: {
        enabled: true,
      },
      SatelliteViewPlugin: {
        enabled: true,
      },
      Planetarium: {
        enabled: true,
      },
      Astronomy: {
        enabled: true,
      },
      Screenshot: {
        enabled: true,
      },
      WatchlistPlugin: {
        enabled: true,
      },
      SettingsMenuPlugin: {
        enabled: true,
      },
      DateTimeManager: {
        enabled: true,
      },
      GithubLinkPlugin: {
        enabled: true,
      },
      TopMenu: {
        enabled: true,
      },
      ClassificationBar: {
        enabled: true,
      },
      SoundManager: {
        enabled: true,
      },
      GamepadPlugin: {
        enabled: true,
      },
    });
  });
});
