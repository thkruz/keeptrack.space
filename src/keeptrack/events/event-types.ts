
/**
 * Enum containing the registrable events used in the KeepTrack API.
 */

import { MissileObject } from '@app/singletons/catalog-manager/MissileObject';
import type { LineManager } from '@app/singletons/draw-manager/line-manager';
import { PanTouchEvent, TapTouchEvent } from '@app/singletons/input-manager/touch-input';
import { BaseObject, DetailedSatellite, DetailedSensor } from 'ootk';

export enum KeepTrackApiEvents {
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
  HtmlInitialize = 'uiManagerInit',
  BeforeHtmlInitialize = 'uiManagerOnReady',
  bottomMenuClick = 'bottomMenuClick',
  hideSideMenus = 'hideSideMenus',
  nightToggle = 'nightToggle',
  orbitManagerInit = 'orbitManagerInit',
  /**
   * Run as the default case in the rmbMenuActions event with parameters (targetId: string, clickedSat: number)
   */
  rmbMenuActions = 'rmbMenuActions',
  /**
   * Runs during inputManager.init immediately before adding the clear lines and clear screen buttons
   */
  rightBtnMenuAdd = 'rightBtnMenuAdd',
  updateDateTime = 'updateDateTime',
  updatePropRate = 'updatePropRate',
  AfterHtmlInitialize = 'uiManagerFinal',
  resetSensor = 'resetSensor',
  /**
   * Run in the setSensor method of SensorManager instance with parameters (sensor: DetailedSensor | string, staticId: number)
   */
  setSensor = 'setSensor',
  /**
   * Run in the updateWatchlist method of CatalogManager instance with parameters (watchlist: number[])
   */
  onWatchlistUpdated = 'onWatchlistUpdated',
  /**
   * Run in the staticOffset setter of TimeManager instance with parameters (staticOffset: number)
   */
  staticOffsetChange = 'staticOffsetChange',
  /**
   * Runs when a line is added to the line manager
   */
  onLineChange = 'onLineAdded',
  /**
   * Runs when a sensor dot is selected but not when a sensor is selected from the sensor menu
   */
  sensorDotSelected = 'sensorDotSelected',
  canvasMouseDown = 'canvasMouseDown',
  canvasMouseUp = 'canvasMouseUp',
  touchStart = 'touchStart',
  ConeMeshUpdate = 'ConeMeshUpdate',
  bottomMenuModeChange = 'bottomMenuModeChange',
  saveSettings = 'saveSettings',
  loadSettings = 'loadSettings',
  onPrimarySatelliteUpdate = 'onPrimarySatelliteUpdate',
  onPrimarySatelliteChange = 'onPrimarySatelliteChange',
  onSecondarySatelliteUpdate = 'onSecondarySatelliteUpdate',
  onSecondarySatelliteChange = 'onSecondarySatelliteChange',
  enableAutoRotate = 'enableAutoRotate'
}

declare module '@app/doris/events/event-types' {
  export interface ApplicationEventMap {
    [KeepTrackApiEvents.bottomMenuClick]: [string];
    [KeepTrackApiEvents.hideSideMenus]: [];
    [KeepTrackApiEvents.nightToggle]: [WebGL2RenderingContext, WebGLTexture, WebGLTexture];
    [KeepTrackApiEvents.orbitManagerInit]: [];
    [KeepTrackApiEvents.rmbMenuActions]: [string, number];
    [KeepTrackApiEvents.rightBtnMenuAdd]: [];
    [KeepTrackApiEvents.updateDateTime]: [Date];
    [KeepTrackApiEvents.updatePropRate]: [number];
    [KeepTrackApiEvents.AfterHtmlInitialize]: [];
    [KeepTrackApiEvents.resetSensor]: [];
    [KeepTrackApiEvents.setSensor]: [DetailedSensor | string | null, number | null];
    [KeepTrackApiEvents.onWatchlistUpdated]: [{ id: number; inView: boolean; }[]];
    [KeepTrackApiEvents.staticOffsetChange]: [number];
    [KeepTrackApiEvents.onLineChange]: [LineManager];
    [KeepTrackApiEvents.sensorDotSelected]: [DetailedSensor];
    [KeepTrackApiEvents.canvasMouseDown]: [MouseEvent];
    [KeepTrackApiEvents.canvasMouseUp]: [MouseEvent];
    [KeepTrackApiEvents.touchStart]: [TapTouchEvent | PanTouchEvent];
    [KeepTrackApiEvents.onCruncherMessage]: [];
    [KeepTrackApiEvents.onCruncherReady]: [];
    [KeepTrackApiEvents.onHelpMenuClick]: [];
    [KeepTrackApiEvents.onKeepTrackReady]: [];
    [KeepTrackApiEvents.selectSatData]: [DetailedSatellite | MissileObject | BaseObject, number];
    [KeepTrackApiEvents.setSecondarySat]: [DetailedSatellite | null, number];
    [KeepTrackApiEvents.HtmlInitialize]: [];
    [KeepTrackApiEvents.BeforeHtmlInitialize]: [];
    [KeepTrackApiEvents.updateSelectBox]: [DetailedSatellite | MissileObject];
    [KeepTrackApiEvents.ConeMeshUpdate]: [];
    [KeepTrackApiEvents.bottomMenuModeChange]: [];
    [KeepTrackApiEvents.saveSettings]: [];
    [KeepTrackApiEvents.loadSettings]: [];
    [KeepTrackApiEvents.onPrimarySatelliteUpdate]: [BaseObject | null, number];
    [KeepTrackApiEvents.onPrimarySatelliteChange]: [BaseObject | null, number];
    [KeepTrackApiEvents.onSecondarySatelliteUpdate]: [BaseObject | null, number];
    [KeepTrackApiEvents.onSecondarySatelliteChange]: [BaseObject | null, number];
    [KeepTrackApiEvents.enableAutoRotate]: [boolean?];
  }
}

