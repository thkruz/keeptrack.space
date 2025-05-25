import { MenuMode } from '@app/interfaces';
import { KeepTrackPluginsConfiguration } from '@app/plugins/keeptrack-plugins-configuration';

export const defaultPlugins = <KeepTrackPluginsConfiguration>{
  DebugMenuPlugin: {
    enabled: true,
    order: 0,
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
  TrackingImpactPredict: {
    enabled: true,
    order: 91,
  },
  satInfoboxCore: {
    enabled: true,
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
  AboutMenuPlugin: {
    enabled: false,
    order: 301,
  },
  DopsPlugin: {
    enabled: true,
    menuMode: [MenuMode.ANALYSIS],
  },
  launchCalendar: {
    enabled: true,
  },
  nextLaunch: {
    enabled: true,
  },
  nightToggle: {
    enabled: true,
  },
  photoManager: {
    enabled: true,
  },
  screenRecorder: {
    enabled: true,
  },
  satChanges: {
    enabled: false,
  },
  timeMachine: {
    enabled: true,
  },
  initialOrbit: {
    enabled: false,
  },
  orbitReferences: {
    enabled: true,
  },
  analysis: {
    enabled: true,
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
  satelliteFov: {
    enabled: true,
  },
  screenshot: {
    enabled: true,
  },
  sensor: {
    enabled: true,
  },
  settingsMenu: {
    enabled: true,
  },
  graphicsMenu: {
    enabled: true,
  },
  datetime: {
    enabled: true,
  },
  social: {
    enabled: true,
  },
  topMenu: {
    enabled: true,
  },
  classificationBar: {
    enabled: true,
  },
  soundManager: {
    enabled: true,
  },
  gamepad: {
    enabled: true,
  },
  debrisScreening: {
    enabled: true,
  },
  videoDirector: {
    enabled: true,
  },
  transponderChannelData: {
    enabled: true,
  },
  calculator: {
    enabled: true,
  },
  filterMenu: {
    enabled: true,
  },
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
