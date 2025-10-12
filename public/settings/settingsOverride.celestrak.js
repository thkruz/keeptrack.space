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
   * This is an example of available settings that can be overridden.
   * Uncomment any options you wish to change.
   *
   */
  plugins: {
    DebugMenuPlugin: {
      enabled: false,
      order: 0,
    },
    TooltipsPlugin: {
      enabled: false,
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
      enabled: false,
      order: 12,
    },
    SensorFov: {
      enabled: true,
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
      enabled: true,
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
      enabled: true,
      order: 40,
    },
    WatchlistOverlay: {
      enabled: true,
      order: 41,
    },
    ReportsPlugin: {
      enabled: true,
      menuMode: [1],
      order: 50,
    },
    PolarPlotPlugin: {
      enabled: true,
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
      enabled: true,
      order: 80,
    },
    ProximityOps: {
      enabled: false,
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
    StereoMap: {
      enabled: true,
      order: 150,
    },
    SatelliteViewPlugin: {
      enabled: false,
      order: 151,
    },
    Planetarium: {
      enabled: true,
      order: 155,
    },
    Astronomy: {
      enabled: false,
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
    SatellitePhotos: {
      enabled: true,
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
      enabled: true,
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
    InitialOrbitDeterminationPlugin: {
      enabled: false,
      order: 410,
    },
    AnalysisMenu: {
      enabled: false,
      order: 420,
    },
    Screenshot: {
      enabled: true,
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
    // Non-Menu plugins
    SatInfoBox: {
      enabled: true,
    },
    TopMenu: {
      enabled: true,
    },
    GithubLinkPlugin: {
      enabled: true,
    },
    DateTimeManager: {
      enabled: true,
    },
    ClassificationBar: {
      enabled: true,
    },
    OrbitReferences: {
      enabled: false,
    },
    SoundManager: {
      enabled: true,
    },
    GamepadPlugin: {
      enabled: false,
    },
    // RMB plugins
    EarthPresetsPlugin: {
      enabled: true,
    },
    DrawLinesPlugin: {
      enabled: false,
    },
    ViewInfoRmbPlugin: {
      enabled: true,
    },
  },
  dataSources: {
    tle: 'https://api.keeptrack.space/v2/sats/celestrak',
    externalTLEsOnly: false,
    tleDebris: 'https://app.keeptrack.space/tle/TLEdebris.json',
    vimpel: 'https://r2.keeptrack.space/vimpel.json',
    /** This determines if tle source is loaded to supplement externalTLEs  */
    isSupplementExternal: false,
  },
  isBlockPersistence: true,
  isShowSecondaryLogo: true,
  isUseJdayOnTopMenu: false,
  satShader: {
    /**
     * The minimum zoom level at which large objects are displayed.
     */
    largeObjectMinZoom: 0.37,
    /**
     * The maximum zoom level at which large objects are displayed.
     */
    largeObjectMaxZoom: 0.58,
    /**
     * The minimum size of objects in the shader.
     */
    minSize: 5.5,
    /**
     * The minimum size of objects in the shader when in planetarium mode.
     */
    minSizePlanetarium: 20.0,
    /**
     * The maximum size of objects in the shader when in planetarium mode.
     */
    maxSizePlanetarium: 20.0,
    /**
     * The maximum allowed size of objects in the shader.
     * This value is dynamically changed based on zoom level.
     */
    maxAllowedSize: 35.0,
    /**
     * Whether or not to use dynamic sizing for objects in the shader.
     */
    isUseDynamicSizing: false,
    /**
     * The scalar value used for dynamic sizing of objects in the shader.
     */
    dynamicSizeScalar: 1.0,
    /**
     * The size of stars and searched objects in the shader.
     */
    starSize: '20.0',
    /**
     * The distance at which objects start to grow in kilometers.
     * Must be a float as a string for the GPU to read.
     * This makes stars bigger than satellites.
     */
    distanceBeforeGrow: '14000.0',
    /**
     * The blur radius factor used for satellites.
     */
    blurFactor1: '0.76',
    /**
     * The blur alpha factor used for satellites.
     */
    blurFactor2: '0.4',
    /**
     * The blur radius factor used for stars.
     */
    blurFactor3: '0.43',
    /**
     * The blur alpha factor used for stars.
     */
    blurFactor4: '0.25',
    /**
     * The maximum size of objects in the shader.
     */
    maxSize: 70.0,
  },
  isEnableJscCatalog: false,
  isAutoStart: true,
};

// Expose these to the console
window.settingsOverride = settingsOverride;
