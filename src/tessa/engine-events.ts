import { Milliseconds } from 'ootk';

/**
 * Enumerates the various events emitted by the engine.
 *
 * These events cover the engine lifecycle, rendering, updating, resizing, and user input interactions.
 */

export enum EngineEvents {
  /** Emitted after the engine has been initialized */
  onEngineInitialized = 'onEngineInitialized',
  /** Emitted when all assets have been loaded */
  onAssetsLoaded = 'onAssetsLoaded',
  /**
   * Emitted once after the game loop has been started.
   *
   * Use this for initialization that should occur after the game loop begins.
   */
  onGameLoopStarted = 'onGameLoopStarted',
  /**
   * Emitted at the start of an update cycle
   *
   * Events that ARE time sensitive should be handled here.
   * This is the first event that is emitted after the update frame starts.
   */
  onUpdateStart = 'onUpdateStart',
  /**
   * Emitted during the update cycle
   *
   * Events that ARE NOT time sensitive should be handled here.
   * This is the second event that is emitted after the update frame starts.
   */
  onUpdate = 'onUpdate',
  /**
   * Emitted at the end of an update cycle
   *
   * Events that ARE time sensitive should be handled here.
   * This is the last event that is emitted before the render frame starts.
   */
  onUpdateEnd = 'onUpdateEnd',
  /** Emitted at the start of a render frame */
  onRenderFrameStart = 'onRenderFrameStart',
  /** Emitted during the render frame */
  onRenderFrame = 'onRenderFrame',
  /** Emitted at the end of a render frame */
  onRenderFrameEnd = 'onRenderFrameEnd',
  /** Emitted when the engine or viewport is resized */
  onResize = 'onResize',
  /** Emitted when a mouse button is pressed */
  onMouseDown = 'onMouseDown',
  /** Emitted when a mouse button is released */
  onMouseUp = 'onMouseUp',
  /** Emitted when the mouse is moved */
  onMouseMove = 'onMouseMove',
  /** Emitted when the mouse wheel is used */
  onMouseWheel = 'onMouseWheel',
  /** Emitted when a touch starts */
  onTouchStart = 'onTouchStart',
  /** Emitted when a touch ends */
  onTouchEnd = 'onTouchEnd',
  /** Emitted when a touch moves */
  onTouchMove = 'onTouchMove',
  /** Emitted when a key is pressed down */
  onKeyDown = 'onKeyDown',
  /** Emitted when a key is released */
  onKeyUp = 'onKeyUp',
  /** Emitted when a key is pressed */
  onKeyPress = 'onKeyPress'
}

/**
 * Type definition for the arguments of each event in the EngineEvents enum.
 *
 * Each event is associated with an array of arguments that are passed to the event handler.
 */
export type EngineEventArguments = {
  [EngineEvents.onEngineInitialized]: [];
  [EngineEvents.onAssetsLoaded]: [];
  [EngineEvents.onGameLoopStarted]: [];
  [EngineEvents.onUpdateStart]: [Milliseconds];
  [EngineEvents.onUpdate]: [Milliseconds];
  [EngineEvents.onUpdateEnd]: [Milliseconds];
  [EngineEvents.onRenderFrameStart]: [];
  [EngineEvents.onRenderFrame]: [];
  [EngineEvents.onRenderFrameEnd]: [];
  [EngineEvents.onResize]: [];
  [EngineEvents.onMouseDown]: [];
  [EngineEvents.onMouseUp]: [];
  [EngineEvents.onMouseMove]: [];
  [EngineEvents.onMouseWheel]: [];
  [EngineEvents.onTouchStart]: [];
  [EngineEvents.onTouchEnd]: [];
  [EngineEvents.onTouchMove]: [];
  [EngineEvents.onKeyDown]: [];
  [EngineEvents.onKeyUp]: [];
  [EngineEvents.onKeyPress]: [];
};
