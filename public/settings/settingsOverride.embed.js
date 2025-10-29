/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

// Settings Manager Overrides
const settingsOverride = {
  /*
   * These are the overrides for the embedded version.
   */
  plugins: {
    DebugMenuPlugin: {
      enabled: false,
      order: 0,
    },
    ScenarioManagementPlugin: {
      enabled: false,
      order: 1,
    },
    UserAccountPlugin: {
      enabled: false,
      order: 2,
    },
    SensorListPlugin: {
      enabled: false,
      order: 10,
    },
    SensorInfoPlugin: {
      enabled: false,
      order: 11,
    },
    CustomSensorPlugin: {
      enabled: false,
      order: 12,
    },
    SensorFov: {
      enabled: false,
      order: 13,
    },
    SensorSurvFence: {
      enabled: false,
      order: 14,
    },
    ShortTermFences: {
      enabled: false,
      order: 15,
    },
    LookAnglesPlugin: {
      enabled: false,
      order: 20,
    },
    MultiSiteLookAnglesPlugin: {
      enabled: false,
      order: 21,
    },
    SensorTimeline: {
      enabled: false,
      order: 30,
    },
    SatelliteTimeline: {
      enabled: false,
      order: 31,
    },
    WatchlistPlugin: {
      enabled: false,
      order: 40,
    },
    WatchlistOverlay: {
      enabled: false,
      order: 41,
    },
    ReportsPlugin: {
      enabled: false,
      order: 50,
    },
    PolarPlotPlugin: {
      enabled: false,
      order: 60,
    },
    CreateSat: {
      enabled: false,
      order: 70,
    },
    EditSat: {
      enabled: false,
      order: 71,
    },
    OemReaderPlugin: {
      enabled: false,
      order: 71.5,
    },
    NewLaunch: {
      enabled: false,
      order: 72,
    },
    Breakup: {
      enabled: false,
      order: 73,
    },
    MissilePlugin: {
      enabled: false,
      order: 74,
    },
    SatelliteFov: {
      enabled: false,
      order: 75,
    },
    FindSatPlugin: {
      enabled: false,
      order: 80,
    },
    ProximityOps: {
      enabled: false,
      order: 81,
    },
    Collisions: {
      enabled: false,
      order: 90,
    },
    OrbitGuardMenuPlugin: {
      enabled: false,
      order: 91,
    },
    TrackingImpactPredict: {
      enabled: false,
      order: 92,
    },
    StereoMap: {
      enabled: false,
      order: 150,
    },
    SatelliteViewPlugin: {
      enabled: false,
      order: 151,
    },
    Planetarium: {
      enabled: false,
      order: 155,
    },
    Astronomy: {
      enabled: false,
      order: 156,
    },
    SatConstellations: {
      enabled: false,
      order: 230,
    },
    CountriesMenu: {
      enabled: false,
      order: 231,
    },
    ColorMenu: {
      enabled: false,
      order: 232,
    },
    PlanetsMenuPlugin: {
      enabled: false,
      order: 233,
    },
    SatellitePhotos: {
      enabled: false,
      order: 240,
    },
    TimeMachine: {
      enabled: false,
      order: 250,
    },
    EciPlot: {
      enabled: false,
      order: 260,
    },
    EcfPlot: {
      enabled: false,
      order: 261,
    },
    RicPlot: {
      enabled: false,
      order: 262,
    },
    Time2LonPlots: {
      enabled: false,
      order: 263,
    },
    Lat2LonPlots: {
      enabled: false,
      order: 264,
    },
    Inc2AltPlots: {
      enabled: false,
      order: 265,
    },
    Inc2LonPlots: {
      enabled: false,
      order: 266,
    },
    NightToggle: {
      enabled: false,
      order: 310,
    },
    DebrisScreening: {
      enabled: false,
      order: 280,
    },
    transponderChannelData: {
      enabled: false,
    },
    NextLaunchesPlugin: {
      enabled: false,
      order: 350,
    },
    LaunchCalendar: {
      enabled: false,
      order: 351,
    },
    Calculator: {
      enabled: false,
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
      enabled: false,
      order: 420,
    },
    Screenshot: {
      enabled: false,
      order: 450,
    },
    ScreenRecorder: {
      enabled: false,
      order: 451,
    },
    DopsPlugin: {
      enabled: false,
      order: 500,
    },
    SatChangesPlugin: {
      enabled: false, // Backend no longer supports this
      order: 501, // TODO: Update when backend is ready
    },
    VideoDirectorPlugin: {
      enabled: false,
      order: 510,
    },
    SettingsMenuPlugin: {
      enabled: false,
      order: 590,
    },
    GraphicsMenuPlugin: {
      enabled: false,
      order: 591,
    },
    FilterMenuPlugin: {
      enabled: false,
      order: 592,
    },
    AboutMenuPlugin: {
      enabled: false,
      order: 601,
    },
    VcrPlugin: {
      enabled: false, // Disabled by default
      order: 1000,
    },
    TimeSlider: {
      enabled: false,
      order: 1001,
    },
    // Non-Menu plugins
    TooltipsPlugin: {
      enabled: false,
    },
    SatInfoBoxCore: {
      enabled: false,
    },
    SatInfoBoxActions: {
      enabled: false,
    },
    SatInfoBoxLinks: {
      enabled: false,
    },
    SatInfoBoxObject: {
      enabled: false,
    },
    SatInfoBoxMission: {
      enabled: false,
    },
    SatInfoBoxManeuver: {
      enabled: false,
    },
    SatInfoBoxOrbital: {
      enabled: false,
    },
    SatInfoBoxSensor: {
      enabled: false,
    },
    TopMenu: {
      enabled: false,
    },
    GithubLinkPlugin: {
      enabled: false,
    },
    LinkedInLinkPlugin: {
      enabled: false,
    },
    DateTimeManager: {
      enabled: false,
    },
    ClassificationBar: {
      enabled: false,
    },
    OrbitReferences: {
      enabled: false,
    },
    SoundManager: {
      enabled: false,
    },
    GamepadPlugin: {
      enabled: false,
    },
    // Scene plugins
    EarthAtmosphere: {
      enabled: false,
    },
    // RMB plugins
    EarthPresetsPlugin: {
      enabled: false,
    },
    DrawLinesPlugin: {
      enabled: false,
    },
    ViewInfoRmbPlugin: {
      enabled: false,
    },
  },
  dataSources: {
    tle: 'https://api.keeptrack.space/v3/sats',
    externalTLEsOnly: false,
    tleDebris: 'https://app.keeptrack.space/tle/TLEdebris.json',
    vimpel: 'https://r2.keeptrack.space/vimpel.json',
    /** This determines if tle source is loaded to supplement externalTLEs  */
    isSupplementExternal: false,
  },
  isShowSecondaryLogo: false,
  isEnableJscCatalog: true,
  noMeshManager: true,
  isShowSplashScreen: false,
  isDisableSensors: true,
  isDisableSelectSat: true,
  isDisableLaunchSites: true,
  isDisableKeyboard: true,
  isAllowRightClick: false,
  isShowLoadingHints: false,
  isBlockPersistence: true,
  isDisableBottomMenu: true,
  isDrawSun: false,
  isDrawMilkyWay: false,
  isDisableGodrays: true,
  godraysSamples: -1,
  isDisableMoon: true,
  earthDayTextureQuality: '2k',
  earthNightTextureQuality: '2k',
  isDrawNightAsDay: false,
  earthSpecTextureQuality: 'off',
  isDrawSpecMap: false,
  earthBumpTextureQuality: 'off',
  isDrawBumpMap: false,
  earthCloudTextureQuality: 'off',
  isDrawCloudsMap: false,
  earthPoliticalTextureQuality: 'off',
  isDrawPoliticalMap: false,
  earthTextureStyle: 'earthmap', // 'earthmap' or 'flat'
  isEmbedMode: true,
  isDisableToasts: true,
  isAutoStart: true,

  isDisableSkybox: true,
  isDisablePlanets: true,

  maxZoomDistance: 170_000,
};

// Expose these to the console
window.settingsOverride = settingsOverride;
