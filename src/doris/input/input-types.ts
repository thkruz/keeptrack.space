/**
 * Types of input events
 */
export enum InputEventType {
  KeyPress = 'keypress',
  KeyDown = 'keydown',
  KeyUp = 'keyup',
  MouseDown = 'mousedown',
  MouseUp = 'mouseup',
  MouseMove = 'mousemove',
  MouseEnter = 'mouseenter',
  MouseLeave = 'mouseleave',
  MouseWheel = 'mousewheel',
  ContextMenu = 'contextmenu',
  TouchStart = 'touchstart',
  TouchMove = 'touchmove',
  TouchEnd = 'touchend',
  TouchCancel = 'touchcancel',
  GamepadConnected = 'gamepadconnected',
  GamepadDisconnected = 'gamepaddisconnected',
  GamepadButtonDown = 'gamepadbuttondown',
  GamepadButtonUp = 'gamepadbuttonup',
  GamepadAxisMove = 'gamepadaxismove',
  Pinch = 'pinch',
  PinchStart = 'pinchstart',
  PinchEnd = 'pinchend',
  MouseDragStart = 'mousedragstart',
  MouseDrag = 'mousedrag',
  MouseDragEnd = 'mousedragend',
  // Add more event types as needed
}

/**
 * Mouse button identifiers
 */
export enum MouseButton {
  Left = 0,
  Middle = 1,
  Right = 2
}

/**
 * Key codes for keyboard events
 */
export enum KeyCode {
  W = 'KeyW',
  A = 'KeyA',
  S = 'KeyS',
  D = 'KeyD',
  Q = 'KeyQ',
  E = 'KeyE',
  R = 'KeyR',
  F = 'KeyF',
  Space = 'Space',
  ShiftLeft = 'ShiftLeft',
  ShiftRight = 'ShiftRight',
  ControlLeft = 'ControlLeft',
  ControlRight = 'ControlRight',
  ArrowUp = 'ArrowUp',
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  // Add more as needed
}

/**
 * Combined input event type
 */
export type CombinedInputEvent = KeyboardEvent | MouseEvent | WheelEvent | TouchEvent;

/**
 * Input event handler function type
 */
export type InputEventHandler = (event: CombinedInputEvent) => void;

/**
 * Input event handler map
 */
export interface InputEventHandlerMap {
  [eventType: string]: InputEventHandler[];
}

/**
 * Input event handler registration options
 */
export interface InputEventHandlerOptions {
  once?: boolean; // If true, the handler will be removed after being called once
  passive?: boolean; // If true, the handler will not call preventDefault()
  capture?: boolean; // If true, the handler will be called during the capture phase
  priority?: number; // Priority of the handler (lower numbers are called first)
  target?: EventTarget; // The target to which the handler is bound
  useCapture?: boolean; // If true, the handler will be called during the capture phase
  usePassive?: boolean; // If true, the handler will not call preventDefault()
}
