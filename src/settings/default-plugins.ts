// Ensure imports are type only to avoid circular dependencies
import type { KeepTrackPluginsConfiguration } from '@app/plugins/keeptrack-plugins-configuration';
// These imports can be direct only because they have no dependencies
import { satInfoBoxOrbitalConfigurationDefaults } from '@app/plugins/sat-info-box-orbital/sat-info-box-orbital-settings';

export const defaultPlugins = <KeepTrackPluginsConfiguration>{
  DebugMenuPlugin: {
    enabled: true,
    order: 0,
  },
  ScenarioManagementPlugin: {
    enabled: true,
    order: 1,
  },
  UserAccountPlugin: {
    enabled: true,
    order: 2,
  },
  SensorListPlugin: {
    enabled: true,
    order: 10,
  },
  SensorInfoPlugin: {
    enabled: true,
    order: 11,
  },
  CustomSensorPlugin: {
    enabled: true,
    order: 12,
  },
  SensorFov: {
    enabled: true,
    order: 13,
  },
  SensorSurvFence: {
    enabled: true,
    order: 14,
  },
  ShortTermFences: {
    enabled: true,
    order: 15,
  },
  LookAnglesPlugin: {
    enabled: true,
    order: 20,
  },
  MultiSiteLookAnglesPlugin: {
    enabled: true,
    order: 21,
  },
  SensorTimeline: {
    enabled: true,
    order: 30,
  },
  SatelliteTimeline: {
    enabled: true,
    order: 31,
  },
  WatchlistPlugin: {
    enabled: true,
    order: 40,
  },
  WatchlistOverlay: {
    enabled: true,
    order: 41,
  },
  ReportsPlugin: {
    enabled: true,
    order: 50,
  },
  PolarPlotPlugin: {
    enabled: true,
    order: 60,
  },
  CreateSat: {
    enabled: true,
    order: 70,
  },
  EditSat: {
    enabled: true,
    order: 71,
  },
  OemReaderPlugin: {
    enabled: true,
    order: 71.5,
  },
  NewLaunch: {
    enabled: true,
    order: 72,
  },
  Breakup: {
    enabled: true,
    order: 73,
  },
  MissilePlugin: {
    enabled: true,
    order: 74,
  },
  SatelliteFov: {
    enabled: true,
    order: 75,
  },
  FindSatPlugin: {
    enabled: true,
    order: 80,
  },
  ProximityOps: {
    enabled: true,
    order: 81,
  },
  Collisions: {
    enabled: true,
    order: 90,
  },
  OrbitGuardMenuPlugin: {
    enabled: false,
    order: 91,
  },
  TrackingImpactPredict: {
    enabled: true,
    order: 92,
  },
  StereoMap: {
    enabled: true,
    order: 150,
  },
  SatelliteViewPlugin: {
    enabled: true,
    order: 151,
  },
  Planetarium: {
    enabled: true,
    order: 155,
  },
  Astronomy: {
    enabled: true,
    order: 156,
  },
  SatConstellations: {
    enabled: true,
    order: 230,
  },
  CountriesMenu: {
    enabled: true,
    order: 231,
  },
  ColorMenu: {
    enabled: true,
    order: 232,
  },
  PlanetsMenuPlugin: {
    enabled: true,
    order: 233,
  },
  SatellitePhotos: {
    enabled: true,
    order: 240,
  },
  TimeMachine: {
    enabled: true,
    order: 250,
  },
  EciPlot: {
    enabled: true,
    order: 260,
  },
  EcfPlot: {
    enabled: true,
    order: 261,
  },
  RicPlot: {
    enabled: true,
    order: 262,
  },
  Time2LonPlots: {
    enabled: true,
    order: 263,
  },
  Lat2LonPlots: {
    enabled: true,
    order: 264,
  },
  Inc2AltPlots: {
    enabled: true,
    order: 265,
  },
  Inc2LonPlots: {
    enabled: true,
    order: 266,
  },
  NightToggle: {
    enabled: true,
    order: 310,
  },
  DebrisScreening: {
    enabled: true,
    order: 280,
  },
  transponderChannelData: {
    enabled: true,
  },
  NextLaunchesPlugin: {
    enabled: true,
    order: 350,
  },
  LaunchCalendar: {
    enabled: true,
    order: 351,
  },
  Calculator: {
    enabled: true,
    order: 400,
  },
  ManeuverPlugin: {
    enabled: false,
    order: 409,
  },
  InitialOrbitDeterminationPlugin: {
    enabled: false,
    order: 410,
  },
  AnalysisMenu: {
    enabled: true,
    order: 420,
  },
  Screenshot: {
    enabled: true,
    order: 450,
  },
  ScreenRecorder: {
    enabled: true,
    order: 451,
  },
  DopsPlugin: {
    enabled: true,
    order: 500,
  },
  SatChangesPlugin: {
    enabled: false, // Backend no longer supports this
    order: 501, // TODO: Update when backend is ready
  },
  VideoDirectorPlugin: {
    enabled: true,
    order: 510,
  },
  SettingsMenuPlugin: {
    enabled: true,
    order: 590,
  },
  GraphicsMenuPlugin: {
    enabled: true,
    order: 591,
  },
  FilterMenuPlugin: {
    enabled: true,
    order: 592,
  },
  AboutMenuPlugin: {
    enabled: false,
    order: 601,
  },
  VcrPlugin: {
    enabled: true, // Disabled by default
    order: 1000,
  },
  TimeSlider: {
    enabled: true,
    order: 1001,
  },
  // Non-Menu plugins
  TooltipsPlugin: {
    enabled: true,
  },
  SatInfoBoxCore: {
    enabled: true,
  },
  SatInfoBoxActions: {
    enabled: true,
  },
  SatInfoBoxLinks: {
    enabled: true,
  },
  SatInfoBoxObject: {
    enabled: true,
  },
  SatInfoBoxMission: {
    enabled: true,
  },
  SatInfoBoxManeuver: {
    enabled: false,
  },
  SatInfoBoxOrbital: satInfoBoxOrbitalConfigurationDefaults,
  SatInfoBoxSensor: {
    enabled: true,
  },
  TopMenu: {
    enabled: true,
  },
  GithubLinkPlugin: {
    enabled: true,
  },
  LinkedInLinkPlugin: {
    enabled: false,
  },
  DateTimeManager: {
    enabled: true,
  },
  ClassificationBar: {
    enabled: true,
  },
  OrbitReferences: {
    enabled: true,
  },
  SoundManager: {
    enabled: true,
  },
  GamepadPlugin: {
    enabled: true,
  },
  // Scene plugins
  EarthAtmosphere: {
    enabled: true,
  },
  // RMB plugins
  EarthPresetsPlugin: {
    enabled: true,
  },
  DrawLinesPlugin: {
    enabled: true,
  },
  ViewInfoRmbPlugin: {
    enabled: true,
  },
};
