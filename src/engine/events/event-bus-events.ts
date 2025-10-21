/**
 * Enum containing the registrable events used in the KeepTrack API.
 */
export enum EventBusEvent {
  onHelpMenuClick = 'onHelpMenuClick',
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
  drawManagerLoadScene = 'drawManagerLoadScene',
  drawOptionalScenery = 'drawOptionalScenery',
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
  bottomMenuModeChange = 'bottomMenuModeChange',
  saveSettings = 'saveSettings',
  loadSettings = 'loadSettings',
  update = 'update',
  parseGetVariables = 'parseGetVariables',
  rightBtnMenuOpen = 'rightBtnMenuOpen',
  searchUpdated = 'searchUpdated',
  layerUpdated = 'legendUpdated',
  satInfoBoxAddListeners = 'satInfoBoxAddListeners',
  satInfoBoxInit = 'satInfoBoxInit',
  satInfoBoxFinal = 'satInfoBoxFinal',
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
}
