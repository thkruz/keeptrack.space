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
    },
    UserAccountPlugin: {
      enabled: false,
    },
    SensorListPlugin: {
      enabled: false,
    },
    SensorInfoPlugin: {
      enabled: false,
    },
    CustomSensorPlugin: {
      enabled: false,
    },
    SensorFov: {
      enabled: false,
    },
    SensorSurvFence: {
      enabled: false,
    },
    ShortTermFences: {
      enabled: false,
    },
    LookAnglesPlugin: {
      enabled: false,
    },
    MultiSensorLookAnglesPlugin: {
      enabled: false,
    },
    SensorTimeline: {
      enabled: false,
    },
    SatelliteTimeline: {
      enabled: false,
    },
    WatchlistPlugin: {
      enabled: false,
    },
    WatchlistFilterPlugin: {
      enabled: false,
    },
    WatchlistOverlay: {
      enabled: false,
    },
    ReportsPlugin: {
      enabled: false,
    },
    PolarPlotPlugin: {
      enabled: false,
    },
    CreateSat: {
      enabled: false,
    },
    EditSat: {
      enabled: false,
    },
    OemReaderPlugin: {
      enabled: false,
    },
    NewLaunch: {
      enabled: false,
    },
    Breakup: {
      enabled: false,
    },
    BreakupAnalysis: {
      enabled: false,
    },
    MissilePlugin: {
      enabled: false,
    },
    SatelliteFov: {
      enabled: false,
    },
    FindSatPlugin: {
      enabled: false,
    },
    ProximityOps: {
      enabled: false,
    },
    Collisions: {
      enabled: false,
    },
    Reentries: {
      enabled: false,
    },
    StereoMap: {
      enabled: false,
    },
    SatelliteViewPlugin: {
      enabled: false,
    },
    Planetarium: {
      enabled: false,
    },
    Astronomy: {
      enabled: false,
    },
    SatConstellations: {
      enabled: false,
    },
    CountriesMenu: {
      enabled: false,
    },
    ColorMenu: {
      enabled: false,
    },
    PlanetsMenuPlugin: {
      enabled: false,
    },
    SatellitePhotos: {
      enabled: false,
      order: 240,
    },
    TimeMachine: {
      enabled: false,
    },
    EciPlot: {
      enabled: false,
    },
    EcfPlot: {
      enabled: false,
    },
    RicPlot: {
      enabled: false,
    },
    Time2LonPlots: {
      enabled: false,
    },
    Lat2LonPlots: {
      enabled: false,
    },
    Inc2AltPlots: {
      enabled: false,
    },
    Inc2LonPlots: {
      enabled: false,
    },
    NightToggle: {
      enabled: true,
    },
    DebrisScreening: {
      enabled: false,
    },
    transponderChannelData: {
      enabled: false,
    },
    NextLaunchesPlugin: {
      enabled: false,
    },
    LaunchCalendar: {
      enabled: false,
    },
    Calculator: {
      enabled: false,
    },
    ManeuverPlugin: {
      enabled: false,
    },
    InitialOrbitDeterminationPlugin: {
      enabled: false,
    },
    DataExportPlugin: {
      enabled: false,
    },
    CloseObjectsPlugin: {
      enabled: false,
    },
    Screenshot: {
      enabled: true,
      hideBottomIcon: true,
    },
    ScreenRecorder: {
      enabled: false,
    },
    DopsPlugin: {
      enabled: false,
    },
    SatChangesPlugin: {
      enabled: false,
    },
    VideoDirectorPlugin: {
      enabled: false,
    },
    SettingsMenuPlugin: {
      enabled: false,
    },
    GraphicsMenuPlugin: {
      enabled: false,
    },
    FilterMenuPlugin: {
      enabled: false,
    },
    AboutMenuPlugin: {
      enabled: false,
    },
    VcrPlugin: {
      enabled: true,
    },
    // Plugins not in original override — explicitly disabled to prevent
    // manifest defaults from adding unwanted UI to the CelesTrak deployment.
    OverflightPlugin: {
      enabled: false,
    },
    SeismicActivityPlugin: {
      enabled: false,
    },
    AuroraPlugin: {
      enabled: false,
    },
    NaturalEventsPlugin: {
      enabled: false,
    },
    NeighborhoodHistoryPlugin: {
      enabled: false,
    },
    SatelliteEciView: {
      enabled: true,
    },
    SatelliteFixedView: {
      enabled: true,
    },
    FpsView: {
      enabled: false,
    },
    SkipInterpolationToggle: {
      enabled: false,
    },
    SearchSettingsPlugin: {
      enabled: false,
    },
    FavoritesMenuPlugin: {
      enabled: false,
    },
    CommandPalettePlugin: {
      enabled: false,
    },
    CovariancePlugin: {
      enabled: false,
    },
    CovarianceStatsPlugin: {
      enabled: false,
    },
    KeyboardShortcutsPlugin: {
      enabled: false,
    },
    PolarView: {
      enabled: false,
    },
    // Educational visualization toggles — explicitly enabled
    GraticuleToggle: {
      enabled: false,
    },
    PoliticalMapToggle: {
      enabled: true,
    },
    CloudsToggle: {
      enabled: true,
    },
    HideOtherSatellitesPlugin: {
      enabled: false,
    },
    EarthAtmosphere: {
      enabled: true,
    },
    FovFadePlugin: {
      enabled: false,
    },
    // Non-Menu plugins
    SatInfoBoxCore: {
      enabled: true,
    },
    SatInfoBoxActions: {
      enabled: false,
    },
    SatInfoBoxLinks: {
      enabled: false,
    },
    SatInfoBoxObject: {
      enabled: true,
      isShowStdMag: false,
      isEstimateRcs: false,
      isShowConfiguration: false,
      isShowLaunchVehicle: false,
      isShowAltName: false,
    },
    SatInfoBoxMission: {
      enabled: false,
    },
    SatInfoBoxOrbital: {
      enabled: true,
      isShowCovariance: false,
    },
    SatInfoBoxSponsor: {
      enabled: false,
    },
    SatInfoBoxDoppler: {
      enabled: false,
    },
    SatInfoBoxSensor: {
      enabled: false,
    },
    TopMenu: {
      enabled: true,
    },
    GithubLinkPlugin: {
      enabled: false,
    },
    DateTimeManager: {
      enabled: true,
    },
    ClassificationBar: {
      enabled: false,
    },
    OrbitReferences: {
      enabled: false,
    },
    SoundToggle: {
      enabled: true,
    },
    GamepadPlugin: {
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
    StarsPlugin: {
      enabled: false,
    },
    CatalogBrowserPlugin: {
      enabled: false,
      order: 10,
      hideKeepTrackCatalogs: true,
    },
    SymbologyPlugin: {
      enabled: false,
    },
    CatalogManagementPlugin: {
      enabled: false,
    },
    ObservationReaderPlugin: {
      enabled: false,
    },
    EclipseSolarAnalysis: {
      enabled: false,
    },
    OpticalSimulation: {
      enabled: false,
    },
    NeighborhoodWatch: {
      enabled: false,
    },
    TocaPocaPlugin: {
      enabled: false,
    },
    ColorSchemeEditorPlugin: {
      enabled: false,
    },
    BestPassPlugin: {
      enabled: false,
    },
    ScenarioManagementMenu: {
      enabled: false,
    },
  },
  dataSources: {
    tle: 'https://api.keeptrack.space/v4/sats/celestrak',
    externalTLEsOnly: false,
    tleDebris: 'https://app.keeptrack.space/tle/TLEdebris.json',
    vimpel: 'https://r2.keeptrack.space/vimpel.json',
    /** This determines if tle source is loaded to supplement externalTLEs  */
    isSupplementExternal: false,
  },
  isDisableLoginGate: true,
  isBlockPersistence: true,
  // Treat the plugins map above as an exhaustive allowlist — any plugin not
  // listed (including new ones added to the manifest later) is forced disabled.
  isStrictPluginList: true,
  isShowSecondaryLogo: true,
  isUseJdayOnTopMenu: false,
  isJdayToggleable: false,
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
  isDisableSensors: true,
  isDisableLaunchSites: true,
  isDisablePlanets: true,
  isDisableClearLinesRmb: true,

  colorSchemeInstances: {
    MissionColorScheme: {
      enabled: false,
    },
    ConfidenceColorScheme: {
      enabled: false,
    },
    OrbitalPlaneDensityColorScheme: {
      enabled: false,
    },
    SpatialDensityColorScheme: {
      enabled: false,
    },
    SourceColorScheme: {
      enabled: false,
    },
  },
};

// Expose these to the console
window.settingsOverride = settingsOverride;
