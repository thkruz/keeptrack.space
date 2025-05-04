import { Camera } from '../camera/camera';
import { Plugin } from '../plugins/plugin';

/**
 * Core engine events for the main engine lifecycle
 */
export enum CoreEngineEvents {
  // Engine lifecycle events
  BeforeInitialize = 'engine:beforeInitialize',
  Initialize = 'engine:initialize',
  Start = 'engine:start',
  Stop = 'engine:stop',
  Pause = 'engine:pause',
  Resume = 'engine:resume',
  Destroy = 'engine:destroy',

  // Main loop events
  BeforeUpdate = 'engine:beforeUpdate',
  Update = 'engine:update',
  AfterUpdate = 'engine:afterUpdate',

  // Rendering events
  BeforeRender = 'engine:beforeRender',
  Render = 'engine:render',
  AfterRender = 'engine:afterRender',

  // Window/canvas events
  Resize = 'engine:resize',
  FullscreenChange = 'engine:fullscreenChange',
  VisibilityChange = 'engine:visibilityChange',

  // Resource events
  ResourceLoading = 'engine:resourceLoading',
  ResourceLoaded = 'engine:resourceLoaded',
  ResourceError = 'engine:resourceError',

  // Asset events
  AssetLoadStart = 'engine:assetLoadStart',
  AssetLoadProgress = 'engine:assetLoadProgress',
  AssetLoadComplete = 'engine:assetLoadComplete',
  AssetLoadError = 'engine:assetLoadError'
}

/**
 * Scene-related events
 */
export enum SceneEvents {
  Create = 'scene:create',
  Destroy = 'scene:destroy',
  Activate = 'scene:activate',
  Deactivate = 'scene:deactivate',
  NodeAdded = 'scene:nodeAdded',
  NodeRemoved = 'scene:nodeRemoved',
  ComponentAdded = 'scene:componentAdded',
  ComponentRemoved = 'scene:componentRemoved',
  CameraChanged = 'scene:cameraChanged'
}

/**
 * Input-related events
 */
export enum InputEvents {
  // Mouse events
  MouseDown = 'input:mouseDown',
  MouseUp = 'input:mouseUp',
  MouseMove = 'input:mouseMove',
  MouseEnter = 'input:mouseEnter',
  MouseLeave = 'input:mouseLeave',
  MouseWheel = 'input:mouseWheel',
  MouseDragStart = 'input:mouseDragStart',
  MouseDrag = 'input:mouseDrag',
  MouseDragEnd = 'input:mouseDragEnd',
  ContextMenu = 'input:contextMenu',

  // Touch events
  TouchStart = 'input:touchStart',
  TouchMove = 'input:touchMove',
  TouchEnd = 'input:touchEnd',
  TouchCancel = 'input:touchCancel',
  Pinch = 'input:pinch',
  PinchStart = 'input:pinchStart',
  PinchEnd = 'input:pinchEnd',

  // Keyboard events
  KeyDown = 'input:keyDown',
  KeyUp = 'input:keyUp',
  KeyPress = 'input:keyPress',

  // Gamepad events
  GamepadConnected = 'input:gamepadConnected',
  GamepadDisconnected = 'input:gamepadDisconnected',
  GamepadButtonDown = 'input:gamepadButtonDown',
  GamepadButtonUp = 'input:gamepadButtonUp',
  GamepadAxisMove = 'input:gamepadAxisMove'
}

/**
 * Plugin system events
 */
export enum PluginEvents {
  Register = 'plugin:register',
  Unregister = 'plugin:unregister',
  Initialize = 'plugin:initialize',
  Start = 'plugin:start',
  Stop = 'plugin:stop'
}

/**
 * Type definitions for event arguments
 * This enforces correct argument types for each event
 */
export interface EngineEventMap {
  // Engine lifecycle
  [CoreEngineEvents.BeforeInitialize]: [];
  [CoreEngineEvents.Initialize]: [];
  [CoreEngineEvents.Start]: [];
  [CoreEngineEvents.Stop]: [];
  [CoreEngineEvents.Pause]: [];
  [CoreEngineEvents.Resume]: [];
  [CoreEngineEvents.Destroy]: [];

  // Main loop
  [CoreEngineEvents.BeforeUpdate]: [number]; // deltaTime
  [CoreEngineEvents.Update]: [number]; // deltaTime
  [CoreEngineEvents.AfterUpdate]: [number]; // deltaTime

  // Rendering
  [CoreEngineEvents.BeforeRender]: [];
  [CoreEngineEvents.Render]: [];
  [CoreEngineEvents.AfterRender]: [];

  // Window/canvas
  [CoreEngineEvents.Resize]: [number, number]; // width, height
  [CoreEngineEvents.FullscreenChange]: [boolean]; // isFullscreen
  [CoreEngineEvents.VisibilityChange]: [boolean]; // isVisible

  // Resource events
  [CoreEngineEvents.ResourceLoading]: [string, string]; // id, type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [CoreEngineEvents.ResourceLoaded]: [string, string, any]; // id, type, resource
  [CoreEngineEvents.ResourceError]: [string, string, Error]; // id, type, error

  // Asset events
  [CoreEngineEvents.AssetLoadStart]: [];
  [CoreEngineEvents.AssetLoadProgress]: [number, number]; // loaded, total
  [CoreEngineEvents.AssetLoadComplete]: [];
  [CoreEngineEvents.AssetLoadError]: [Error]; // error
}

/**
 * Type definitions for scene event arguments
 */
export interface SceneEventMap {
  [SceneEvents.Create]: [string]; // sceneId
  [SceneEvents.Destroy]: [string]; // sceneId
  [SceneEvents.Activate]: [string]; // sceneId
  [SceneEvents.Deactivate]: [string]; // sceneId
  [SceneEvents.NodeAdded]: [string, string, string?]; // sceneId, nodeId, parentId
  [SceneEvents.NodeRemoved]: [string, string, string?]; // sceneId, nodeId, parentId
  [SceneEvents.ComponentAdded]: [string, string, string]; // sceneId, nodeId, componentType
  [SceneEvents.ComponentRemoved]: [string, string, string]; // sceneId, nodeId, componentType
  [SceneEvents.CameraChanged]: [string, Camera]; // sceneId, camera
}

/**
 * Type definitions for input event arguments
 */
export interface InputEventMap {
  // Mouse events
  [InputEvents.MouseDown]: [MouseEvent, number, number, number]; // event, x, y, button
  [InputEvents.MouseUp]: [MouseEvent, number, number, number]; // event, x, y, button
  [InputEvents.MouseMove]: [MouseEvent, number, number, number, number]; // event, x, y, deltaX, deltaY
  [InputEvents.MouseEnter]: [MouseEvent, number, number]; // event, x, y
  [InputEvents.MouseLeave]: [MouseEvent, number, number]; // event, x, y
  [InputEvents.MouseWheel]: [WheelEvent, number, number, number]; // event, x, y, delta
  [InputEvents.MouseDragStart]: [MouseEvent, number, number, number]; // event, x, y, button
  [InputEvents.MouseDrag]: [MouseEvent, number, number, number, number, number]; // event, x, y, deltaX, deltaY, button
  [InputEvents.MouseDragEnd]: [MouseEvent, number, number, number]; // event, x, y, button
  [InputEvents.ContextMenu]: [MouseEvent, number, number]; // event, x, y

  // Touch events
  [InputEvents.TouchStart]: [TouchEvent, TouchList]; // event, touches
  [InputEvents.TouchMove]: [TouchEvent, TouchList]; // event, touches
  [InputEvents.TouchEnd]: [TouchEvent, TouchList]; // event, touches
  [InputEvents.TouchCancel]: [TouchEvent, TouchList]; // event, touches
  [InputEvents.Pinch]: [TouchEvent, number, number, number]; // event, centerX, centerY, scale
  [InputEvents.PinchStart]: [TouchEvent, number, number]; // event, centerX, centerY
  [InputEvents.PinchEnd]: [TouchEvent, number, number]; // event, centerX, centerY

  // Keyboard events
  [InputEvents.KeyDown]: [KeyboardEvent, string, boolean, boolean, boolean]; // event, key, repeat, ctrl, shift
  [InputEvents.KeyUp]: [KeyboardEvent, string, boolean, boolean]; // event, key, ctrl, shift
  [InputEvents.KeyPress]: [KeyboardEvent, string]; // event, key

  // Gamepad events
  [InputEvents.GamepadConnected]: [Gamepad]; // gamepad
  [InputEvents.GamepadDisconnected]: [Gamepad]; // gamepad
  [InputEvents.GamepadButtonDown]: [Gamepad, number, number]; // gamepad, buttonIndex, value
  [InputEvents.GamepadButtonUp]: [Gamepad, number]; // gamepad, buttonIndex
  [InputEvents.GamepadAxisMove]: [Gamepad, number, number]; // gamepad, axisIndex, value
}

/**
 * Type definitions for plugin event arguments
 */
export interface PluginEventMap {
  [PluginEvents.Register]: [string, Plugin]; // pluginId, plugin
  [PluginEvents.Unregister]: [string, Plugin]; // pluginId, plugin
  [PluginEvents.Initialize]: [string]; // pluginId
  [PluginEvents.Start]: [string]; // pluginId
  [PluginEvents.Stop]: [string]; // pluginId
}

/**
 * Combined event map for all engine events
 * This is used by the TypedEventBus to ensure type safety
 */
export interface EventMap extends
  EngineEventMap,
  SceneEventMap,
  InputEventMap,
  PluginEventMap { }
