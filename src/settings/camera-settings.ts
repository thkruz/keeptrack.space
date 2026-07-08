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

import { Kilometers, Radians } from '@app/engine/ootk/src/main';
import { RADIUS_OF_EARTH } from '../engine/utils/constants';

/**
 * Camera movement, zoom, and field of view settings
 */
export class CameraSettings {
  // Field of View
  /**
   * The initial field of view settings for FPS, Planetarium, Astronomy, and Satellite View
   */
  fieldOfView = 0.6 as Radians;
  /**
   * @deprecated
   * The maximum value for the field of view setting.
   *
   * TODO: Implement this for FPS, Planetarium, Astronomy, and Satellite View
   */
  fieldOfViewMax = 1.75 as Radians;
  /**
   * @deprecated
   * The minimum value for the field of view setting.
   *
   * * TODO: Implement this for FPS, Planetarium, Astronomy, and Satellite View
   */
  fieldOfViewMin = 0.04 as Radians;
  /**
   * The field of view when in satellite-focused camera modes (ECI, LVLH, first-person).
   * Narrower than default to create telephoto compression (~50mm equivalent).
   */
  fieldOfViewSatellite = 0.34 as Radians;
  /**
   * Speed of FOV transitions between camera modes.
   * Higher = faster transition. Used with exponential lerp.
   */
  fieldOfViewLerpSpeed = 3;

  // Camera Movement
  /**
   * The speed at which the camera decays.
   *
   * Reduce this to give momentum to camera changes
   */
  cameraDecayFactor = 5;
  /**
   * The speed at which the camera moves.
   *
   * TODO: This needs to be made read-only and a separate internal camera variable should be used to handle
   * the logic when shift is pressed
   */
  cameraMovementSpeed = 0.003;
  /**
   * The minimum speed at which the camera moves.
   *
   * TODO: This needs to be made read-only and a separate internal camera variable should be used to handle
   * the logic when shift is pressed
   */
  cameraMovementSpeedMin = 0.005;

  // Auto Camera Movement
  /**
   * Adjust to change camera speed of auto pan around earth
   */
  autoPanSpeed = 1;
  /**
   * Adjust to change camera speed of auto rotate around earth
   */
  autoRotateSpeed = 0.000075;
  isAutoRotateL = true;
  isAutoRotateR = false;
  isAutoRotateU = false;
  isAutoRotateD = false;
  isAutoPanL = false;
  isAutoPanR = false;
  isAutoPanU = false;
  isAutoPanD = false;

  // Zoom Settings
  /**
   * The speed at which the zoom level changes when the user zooms in or out.
   */
  zoomSpeed = 0.005;
  /**
   * The maximum zoom distance from the Earth's surface in kilometers.
   *
   * Used for zooming in and out in default and offset camera modes.
   */
  maxZoomDistance = <Kilometers>1.2e6; // 1.2 million km
  /**
   * The minimum zoom distance from 0,0,0 in kilometers.
   *
   * Used for zooming in and out in default and offset camera modes.
   */
  minZoomDistance = <Kilometers>(RADIUS_OF_EARTH + 50);
  /**
   * Distance from satellite when we switch to close camera mode.
   * This is used to slow down the dolly effect when zooming in on a satellite.
   */
  nearZoomLevel = 25 as Kilometers;
  /**
   * Minimum distance from satellite when we switch to close camera mode
   * The camera will not be able to get closer than this distance
   */
  minDistanceFromSatellite = 0.75 as Kilometers;
  /**
   * Determines whether zooming stops auto rotation in the application.
   */
  isZoomStopsRotation = true;
  /**
   * Changing the zoom with the mouse wheel will stop the camera from following the satellite.
   */
  isZoomStopsSnappedOnSat = false;
  isAutoZoomIn = false;
  isAutoZoomOut = false;
  autoZoomSpeed = 0.00002;
  /**
   * The initial zoom level for the camera.
   * 0 = earth and 1 = max distance from earth
   */
  initZoomLevel: number;

  // Touch-specific settings
  /**
   * @deprecated Use momentumDamping / touchMomentumDamping instead.
   */
  touchCameraDecayFactor = 2;
  /**
   * Base speed for touch camera rotation. Higher than mouse because
   * touch movements are coarser.
   */
  touchCameraMovementSpeed = 0.005;
  /**
   * Pinch-zoom sensitivity for touch (mobile). The raw finger-spread ratio is dampened toward 1.0
   * by this factor before it is applied to the camera distance: 1 = full sensitivity, 0 = no zoom.
   * Lower values give a smoother, less twitchy pinch. Only used by the touch pinch handler.
   */
  touchPinchSensitivity = 0.5;
  /**
   * Minimum camera standoff (km) from a selected object on mobile. Pinch gestures are coarser than
   * a mouse wheel, so the per-object standoff is floored to this value so the camera never lands on
   * top of (or inside) the 3D mesh. The initial framing distance is floored to twice this value.
   * Mobile only - desktop uses the size-scaled targetStandoffDistanceKm without this floor.
   */
  touchMinSatDistance = 0.15 as Kilometers;

  // Frame-rate independent momentum damping
  /**
   * Per-millisecond damping base for desktop momentum decay.
   * Applied as `speed *= Math.pow(momentumDamping, dt)`.
   * Range (0, 1). Closer to 1 = longer coast.
   * 0.983 matches the prior 60fps desktop feel (~40ms half-life).
   */
  momentumDamping = 0.983;
  /**
   * Per-millisecond damping base for touch momentum decay.
   * 0.996 gives ~173ms half-life — between current touch feel and three.js OrbitControls.
   * Tune: 0.989 = short coast, 0.996 = medium, 0.9969 = three.js default.
   */
  touchMomentumDamping = 0.996;

  // Camera Controls
  /**
   * Currently only disables panning.
   *
   * TODO: Disable all camera movement
   */
  disableCameraControls = false;
  /**
   * Global flag for determining if the user is dragging the globe
   */
  isDragging = false;

  // Camera Focus
  /** Center on a satellite when it is selected. */
  isFocusOnSatelliteWhenSelected = true;
  /** Enable smooth camera transitions when selecting/deselecting satellites. */
  isSmoothCameraTransitions = true;
  /** Duration of camera transition animations in milliseconds (100-2000). */
  cameraTransitionDuration = 1500;

  // Offset Camera Mode
  /**
   * The offset in the x direction for the offset camera mode.
   */
  offsetCameraModeX = 15000;
  /**
   * The offset in the z direction for the offset camera mode.
   */
  offsetCameraModeZ = -6000;

  // FPS Mode Settings
  /**
   * Speed at which the camera moves in the Z direction when in FPS mode.
   */
  fpsForwardSpeed = 3;
  /**
   * Speed the camera pitches up and down when in FPS mode.
   */
  fpsPitchRate = 0.02;
  /**
   * Speed at which the camera rotates when in FPS mode.
   */
  fpsRotateRate = 0.02;
  /**
   * Speed at which the camera moves in the X direction when in FPS mode.
   */
  fpsSideSpeed = 3;
  /**
   * Speed at which the camera moves in the Y direction when in FPS mode.
   */
  fpsVertSpeed = 3;
  /**
   * Speed at which the camera twists (yaws) when in FPS mode.
   */
  fpsYawRate = 0.02;

  /** Allows local rotation of the camera (roll, yaw, pitch) when in satellite view. */
  isLocalRotateEnabled = true;

  /** Enables the camera widget */
  drawCameraWidget = false;

  /** Compensate for Earth rotation so the camera stays fixed to geographic coordinates */
  isCompensateForEarthRotation = true;
}

export const defaultCameraSettings = new CameraSettings();
