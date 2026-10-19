/**
 * Enum containing the registrable events used in the KeepTrack API.
 */
export enum EventBusEvent {
  onHelpMenuClick = 'onHelpMenuClick',
  /** Emitted with the owning plugin id when a plugin's help content is shown */
  helpMenuShown = 'helpMenuShown',
  /**
   * Run at the end of SelectSatManager.selectSat with parameters (sat: SatObject, satId: number)
   */
  selectSatData = 'selectSatData',
  /**
   * Run at the end of catalogManager.setSecondarySat with parameters (sat: SatObject, satId: number)
   */
  setSecondarySat = 'setSecondarySat',
  onKeepTrackReady = 'onKeepTrackReady',
  updateSelectBox = 'updateSelectBox',
  onCruncherReady = 'onCruncherReady',
  onCruncherMessage = 'onCruncherMessage',
  uiManagerInit = 'uiManagerInit',
  uiManagerOnReady = 'uiManagerOnReady',
  bottomMenuClick = 'bottomMenuClick',
  hideSideMenus = 'hideSideMenus',
  orbitManagerInit = 'orbitManagerInit',
  /**
   * Emitted when the orbit cruncher's path for one object reaches the GPU. Args: satId, the
   * anchor-relative points (x, y, z, alpha), the float64 anchor, the Julian date of sample 0 and
   * the minutes between samples (TLE satellites only, else undefined), and whether the points are
   * Earth-fixed. The points array is reused by the next response; copy what you keep.
   */
  orbitPathUpdated = 'orbitPathUpdated',
  drawManagerLoadScene = 'drawManagerLoadScene',
  drawOptionalScenery = 'drawOptionalScenery',
  /**
   * Emitted after renderOpaque() completes. Use for transparent overlays that must draw on top of the Earth surface.
   */
  drawOverlay = 'drawOverlay',
  updateLoop = 'updateLoop',
  /**
   * Run as the default case in the rmbMenuActions event with parameters (targetId: string, clickedSat: number)
   */
  rmbMenuActions = 'rmbMenuActions',
  /**
   * Runs during inputManager.init immediately before adding the clear lines and clear screen buttons
   */
  rightBtnMenuAdd = 'rightBtnMenuAdd',
  updateDateTime = 'updateDateTime',
  propRateChanged = 'propRateChanged',
  uiManagerFinal = 'uiManagerFinal',
  resetSensor = 'resetSensor',
  /**
   * Run in the setSensor method of SensorManager instance with parameters (sensor: DetailedSensor | string, staticId: number)
   */
  setSensor = 'setSensor',
  changeSensorMarkers = 'changeSensorMarkers',
  resize = 'resize',
  altCanvasResize = 'altCanvasResize',
  endOfDraw = 'endOfDraw',
  /**
   * Emitted when a multi-frame offscreen capture begins (renderer.isCapturing is true).
   * Systems that mutate camera, time, or position buffers should stand down until captureEnd.
   */
  captureStart = 'captureStart',
  /**
   * Emitted after a multi-frame offscreen capture finishes and renderer state is restored
   * (renderer.isCapturing is false again).
   */
  captureEnd = 'captureEnd',
  /**
   * Run in the updateWatchlist method of CatalogManager instance with parameters (watchlist: number[])
   */
  onWatchlistUpdated = 'onWatchlistUpdated',
  onWatchlistAdd = 'onWatchlistAdd',
  onWatchlistRemove = 'onWatchlistRemove',
  /**
   * Run in the staticOffset setter of TimeManager instance with parameters (staticOffset: number)
   */
  staticOffsetChange = 'staticOffsetChange',
  /**
   * Runs when a line is added to the line manager
   */
  onLineAdded = 'onLineAdded',
  /**
   * Runs when a sensor dot is selected but not when a sensor is selected from the sensor menu
   */
  sensorDotSelected = 'sensorDotSelected',
  canvasMouseDown = 'canvasMouseDown',
  touchStart = 'touchStart',
  ConeMeshUpdate = 'ConeMeshUpdate',
  FrustumMeshUpdate = 'FrustumMeshUpdate',
  bottomMenuModeChange = 'bottomMenuModeChange',
  saveSettings = 'saveSettings',
  /**
   * Emitted after an account sync applied cloud-newer values to local
   * persistence. Payload: the StorageKeys whose local value changed. Plugins
   * that hold live copies of synced state re-read those keys.
   */
  remoteSettingsApplied = 'remoteSettingsApplied',
  /**
   * Emitted when filter menu toggles change. ColorSchemeManager listens to
   * forward the updated filter state to the color worker.
   */
  filterChanged = 'filterChanged',
  loadSettings = 'loadSettings',
  update = 'update',
  parseGetVariables = 'parseGetVariables',
  rightBtnMenuOpen = 'rightBtnMenuOpen',
  searchUpdated = 'searchUpdated',
  layerUpdated = 'legendUpdated',
  satInfoBoxAddListeners = 'satInfoBoxAddListeners',
  satInfoBoxInit = 'satInfoBoxInit',
  satInfoBoxFinal = 'satInfoBoxFinal',
  /**
   * Emitted from SatInfoBox.show() after the panel has been switched to display: block.
   * Listeners can rely on the container having a non-zero clientWidth on the next frame.
   */
  satInfoBoxShown = 'satInfoBoxShown',
  error = 'error',
  userAccountChange = 'userAccountChange',
  userLogin = 'userSignedIn',
  userLogout = 'userLogout',
  KeyUp = 'inputEvent:keyup',
  KeyDown = 'inputEvent:keydown',
  KeyPress = 'inputEvent:keypress',
  SceneReady = 'SceneReady',
  highPerformanceRender = 'highPerformanceRender',
  onLinesCleared = 'onLinesCleared',
  selectedDateChange = 'selectedDateChange',
  calculateSimulationTime = 'calculateSimulationTime',
  soundMuteChanged = 'audio:muteChanged',
  /**
   * Emitted before default 3D background rendering. Subscribers render custom backgrounds
   * (e.g. 2D flat map). Return true from the handler to skip default 3D background.
   */
  renderCustomBackground = 'renderCustomBackground',
  /**
   * Methods-pattern event. Return true to skip Earth mesh rendering in renderOpaque.
   */
  shouldSkipEarthDraw = 'shouldSkipEarthDraw',
  /**
   * Methods-pattern event. Return true to skip 3D satellite model rendering.
   */
  shouldSkipSatelliteModels = 'shouldSkipSatelliteModels',
  /**
   * Methods-pattern event. Return true to skip transparent object rendering (search box, covariance ellipsoids).
   */
  shouldSkipTransparentObjects = 'shouldSkipTransparentObjects',
  /**
   * Emitted during screenshot compositing. Subscribers draw overlays onto the 2D canvas context.
   * Parameters: (ctx: CanvasRenderingContext2D, width: number, height: number)
   */
  screenshotComposite = 'screenshotComposite',
  /**
   * Methods-pattern event. Return true to crop screenshot to a 1:1 square.
   */
  screenshotShouldCropSquare = 'screenshotShouldCropSquare',
  /**
   * Emitted after a catalog has been reloaded via drag-and-drop or programmatic swap.
   * Plugins should use this to clear stale caches and refresh UI.
   */
  catalogReloaded = 'catalogReloaded',
  /**
   * Emitted from CatalogLoader.parse(...) after time sync and before
   * filterTLEDatabase. Pro plugins (e.g. StarsPlugin) use this hook to inject
   * static catalog objects before the TLE filter pass runs.
   *
   * Dispatched via emitAsync — listeners may be async and are awaited (fail-fast:
   * the first rejection rejects emitAsync, but every listener is still scheduled).
   *
   * Idempotency contract: parse(...) can be invoked multiple times in a single
   * session (e.g. drag-and-drop catalog swap), so listeners MUST be idempotent
   * across reloads. If a listener appends to CatalogManager.staticSet, it must
   * first strip its own prior entries — otherwise duplicates accumulate. See
   * StarsPlugin for the canonical pattern.
   */
  beforeFilterTLEDatabase = 'beforeFilterTLEDatabase',
  /**
   * Emitted when browser internet connectivity changes.
   * Parameters: (isOnline: boolean)
   */
  connectivityChange = 'connectivityChange',
  /**
   * Emitted when the login gate state changes (user logs in/out or token rotates).
   * Parameters: (isAuthenticated: boolean)
   */
  loginGateStateChange = 'loginGateStateChange',
  /**
   * Emitted when the active color scheme changes via setColorScheme().
   * Parameters: (scheme: ColorScheme)
   */
  colorSchemeChanged = 'colorSchemeChanged',
  /**
   * Emitted when scenario start/end time bounds change via updateScenario().
   * Parameters: (scenario: ScenarioData)
   */
  scenarioBoundsChanged = 'scenarioBoundsChanged',
  /**
   * Emitted after any successful updateScenario() call (name, description, or time changes).
   * Parameters: (scenario: ScenarioData)
   */
  scenarioUpdated = 'scenarioUpdated',
  /**
   * Emitted when the camera type changes via changeCameraType().
   * Parameters: (cameraTypeName: string)
   */
  cameraTypeChanged = 'cameraTypeChanged',
  /**
   * Emitted when the multi-view viewport layout changes (single, split, PIP).
   * Parameters: (layout: ViewportLayout)
   */
  viewportLayoutChanged = 'viewportLayoutChanged',
  /**
   * Emitted when the color worker has new color/pickable buffers ready.
   * ColorSchemeManager consumes the data and uploads to GPU.
   */
  onColorBufferReady = 'onColorBufferReady',
  /**
   * Emitted when the FOV prediction worker has new results ready.
   * FovFadePlugin consumes the data and updates the alpha overlay.
   */
  onFovPredictionReady = 'onFovPredictionReady',
  /**
   * Emitted by GlUtils.initTexture on each state transition (loading, retrying, loaded, failed).
   * Parameters: (status: TextureStatus)
   */
  textureStatusChanged = 'textureStatusChanged',
  /**
   * Emitted when a plugin's settings contributions change (e.g., a control's
   * isAvailable predicate flips, or a contribution is added/removed at runtime).
   * SettingsMenuPlugin re-collects ISettingsContributor.getSettingsContribution()
   * from every plugin in response. Most plugins never need to emit this — controls
   * are collected automatically the first time the settings menu opens.
   */
  settingsMenuRefresh = 'settingsMenuRefresh',
  /**
   * Emitted when the loading/splash screen has actually been dismissed and the
   * globe is visible (start button clicked or auto-start). Unlike onKeepTrackReady,
   * this is the reliable "the user can see the app" signal.
   */
  splashScreenHidden = 'splashScreenHidden',
  /**
   * Emitted when a plugin keyboard shortcut fires (after any login gate approves).
   * Parameters: (pluginId: string, key: string)
   */
  keyboardShortcutUsed = 'keyboardShortcutUsed',
  /**
   * Emitted when a plugin's auto-wired side-menu form is submitted — the "user
   * actually ran the tool" signal, as opposed to merely opening the menu.
   * Parameters: (pluginId: string)
   */
  pluginFormSubmitted = 'pluginFormSubmitted',
  /**
   * Emitted when a command palette command executes (excluding palette-internal
   * navigation like "Browse all commands").
   * Parameters: (commandId: string)
   */
  commandPaletteAction = 'commandPaletteAction',
  /**
   * Emitted each time the performance downgrade cascade disables one visual feature.
   * Parameters: (disabledFeature: string)
   */
  performanceDowngrade = 'performanceDowngrade',
  /**
   * Emitted when the user selects a celestial body to focus (planets menu row,
   * keyboard shortcut, or deep-space probe focus).
   * Parameters: (bodyName: string)
   */
  celestialBodySelected = 'celestialBodySelected',
  /**
   * Emitted when the UI language is changed at runtime.
   * Parameters: (language: string)
   */
  languageChanged = 'languageChanged',
  /**
   * Emitted when the user shares the app state from the Share menu.
   * Parameters: (method: string) — 'copy' or 'native'
   */
  shareAction = 'shareAction',
  /**
   * Emitted when the user changes a settings-menu control (immediate-apply).
   * Parameters: (controlId: string) — the DOM id without the 'setting-' prefix
   */
  settingsChanged = 'settingsChanged',
}
