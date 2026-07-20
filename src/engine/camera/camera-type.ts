/**
 * Represents the different types of cameras available.
 *
 * TODO: This should be replaced with different camera classes
 */

export enum CameraType {
  CURRENT = 0,
  FIXED_TO_EARTH = 1,
  FLAT_MAP = 2,
  FIXED_TO_SAT_ECI = 3,
  FIXED_TO_SAT_LVLH = 4,
  POLAR_VIEW = 5,
  SATELLITE_FIRST_PERSON = 6,
  PLANETARIUM = 7,
  ASTRONOMY = 8,
  FPS = 9,
  MAX_CAMERA_TYPES = 10,
}

/**
 * Camera modes that take over the keyboard for free-look / fly movement:
 * WASD/QE translate (and change altitude/roll) while arrows and the numeric
 * keypad pitch and yaw. While one of these modes is active, those keys belong
 * to the camera and must NOT also trigger plugin keyboard shortcuts, or flying
 * the camera would toggle menus open and closed.
 */
export const KEYBOARD_DRIVEN_CAMERA_TYPES: ReadonlySet<CameraType> = new Set<CameraType>([
  CameraType.FPS,
  CameraType.SATELLITE_FIRST_PERSON,
  CameraType.ASTRONOMY,
  CameraType.PLANETARIUM,
]);

/**
 * `KeyboardEvent.key` values the camera reserves for movement/rotation in the
 * modes listed in {@link KEYBOARD_DRIVEN_CAMERA_TYPES}. Both letter cases are
 * included because holding Shift maps `w` -> `W`, etc.
 */
const CAMERA_MOVEMENT_KEYS: ReadonlySet<string> = new Set<string>(['w', 'a', 's', 'd', 'q', 'e', 'W', 'A', 'S', 'D', 'Q', 'E', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/**
 * `KeyboardEvent.code` values the camera reserves for movement/rotation
 * (numeric-keypad pitch/yaw and zoom).
 */
const CAMERA_MOVEMENT_CODES: ReadonlySet<string> = new Set<string>(['Numpad8', 'Numpad2', 'Numpad4', 'Numpad6', 'NumpadAdd', 'NumpadSubtract']);

/**
 * True when the given key/code is one the camera consumes for movement or
 * rotation while a keyboard-driven camera mode is active.
 */
export const isCameraMovementKey = (key: string, code: string): boolean => CAMERA_MOVEMENT_KEYS.has(key) || CAMERA_MOVEMENT_CODES.has(code);
