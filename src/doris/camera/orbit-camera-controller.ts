import { mat4, quat, vec2, vec3 } from 'gl-matrix';
import { InputEventType } from '../input/input-types';
import { Camera } from './camera';
import { CameraController, CameraControllerParams } from './camera-controller';

/**
 * Controller for orbit-style camera movement.
 * Allows rotating around a target point, zooming in/out, and panning.
 */
export class OrbitCameraController extends CameraController {
  /**
   * The point being orbited around
   */
  private target: vec3 = vec3.create();

  /**
   * Distance from the target
   */
  private distance: number = 10;

  /**
   * Current horizontal rotation angle (radians)
   */
  private yaw: number = 0;

  /**
   * Current vertical rotation angle (radians)
   */
  private pitch: number = 0;

  /**
   * Target yaw (for smooth rotation)
   */
  private targetYaw: number = 0;

  /**
   * Target pitch (for smooth rotation)
   */
  private targetPitch: number = 0;

  /**
   * Current panning offset
   */
  private panOffset: vec3 = vec3.create();

  /**
   * Flags for tracking user input
   */
  private isDragging: boolean = false;
  private isRightDragging: boolean = false;
  private lastMousePosition: vec2 = vec2.create();

  /**
   * Creates a new orbit camera controller
   */
  constructor(
    camera: Camera,
    params?: Partial<OrbitCameraControllerParams>,
  ) {
    super(camera, params);

    // Set initial camera position
    this.updateCameraPosition();
  }

  /**
   * Sets a new target point to orbit around
   */
  setTarget(target: vec3): void {
    vec3.copy(this.target, target);
    this.updateCameraPosition();
  }

  /**
   * Sets the orbital distance
   */
  setDistance(distance: number): void {
    this.distance = Math.max(0.1, distance);
    this.updateCameraPosition();
  }

  /**
   * Sets specific orbital angles
   */
  setAngles(yaw: number, pitch: number): void {
    this.targetYaw = yaw;
    this.targetPitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
    this.updateCameraPosition();
  }

  /**
   * Updates camera position and orientation based on controller state
   */
  update(deltaTime: number): void {
    if (!this.isActive) {
      return;
    }

    // Smooth camera movement
    const dampFactor = this.params.dampingFactor ** (deltaTime / 16.7); // Normalize to 60fps

    // Smoothly interpolate angles
    this.yaw += (this.targetYaw - this.yaw) * (1 - dampFactor);
    this.pitch += (this.targetPitch - this.pitch) * (1 - dampFactor);

    this.updateCameraPosition();
  }

  /**
   * Calculates and sets the camera position based on orbital parameters
   */
  private updateCameraPosition(): void {
    if (!this.camera.node) {
      return;
    }

    // Calculate position based on spherical coordinates
    const position = vec3.create();

    // Convert spherical coordinates to cartesian
    position[0] = Math.sin(this.yaw) * Math.cos(this.pitch);
    position[1] = Math.cos(this.yaw) * Math.cos(this.pitch);
    position[2] = Math.sin(this.pitch);

    // Scale by distance
    vec3.scale(position, position, this.distance);

    // Add target position and panning offset
    vec3.add(position, position, this.target);
    vec3.add(position, position, this.panOffset);

    // Update camera transform
    this.camera.node.transform.setPosition(position);

    // Calculate rotation to look at target
    const direction = vec3.create();

    vec3.subtract(direction, this.target, position);
    vec3.normalize(direction, direction);

    const up = vec3.fromValues(0, 0, 1);
    const rotation = quat.create();

    // Use lookAt to derive rotation quaternion
    const lookAtMatrix = mat4.create();

    mat4.lookAt(lookAtMatrix, position, this.target, up);
    mat4.getRotation(rotation, lookAtMatrix);

    this.camera.node.transform.setRotation(rotation);
    this.camera.markDirty();
  }

  /**
   * Processes input events for camera control
   */
  handleInput(event: InputEvent): boolean {
    if (!this.isActive) {
      return false;
    }

    // Only handle mouse events
    if (!(event instanceof MouseEvent) && !(event instanceof WheelEvent)) {
      return false;
    }

    switch (event.type) {
      case InputEventType.MouseDown:
        if (event.button === 0) { // Left mouse button
          this.isDragging = true;
          this.lastMousePosition[0] = event.x ?? 0;
          this.lastMousePosition[1] = event.y ?? 0;

          return true;
        } else if (event.button === 2) { // Right mouse button
          this.isRightDragging = true;
          this.lastMousePosition[0] = event.x ?? 0;
          this.lastMousePosition[1] = event.y ?? 0;

          return true;
        }
        break;

      case InputEventType.MouseUp:
        if (event.button === 0) {
          this.isDragging = false;

          return true;
        } else if (event.button === 2) {
          this.isRightDragging = false;

          return true;
        }
        break;

      case InputEventType.MouseMove:
        if (this.isDragging) {
          const deltaX = (event.x ?? 0) - this.lastMousePosition[0];
          const deltaY = (event.y ?? 0) - this.lastMousePosition[1];

          this.targetYaw -= deltaX * this.params.rotationSpeed;
          this.targetPitch += deltaY * this.params.rotationSpeed;

          // Clamp pitch to avoid gimbal lock
          this.targetPitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.targetPitch));

          this.lastMousePosition[0] = event.x ?? 0;
          this.lastMousePosition[1] = event.y ?? 0;

          return true;
        } else if (this.isRightDragging) {
          const deltaX = (event.x ?? 0) - this.lastMousePosition[0];
          const deltaY = (event.y ?? 0) - this.lastMousePosition[1];

          // Calculate pan direction in camera space
          const right = vec3.fromValues(
            Math.cos(this.yaw),
            -Math.sin(this.yaw),
            0,
          );

          const up = vec3.fromValues(
            Math.sin(this.yaw) * Math.sin(this.pitch),
            Math.cos(this.yaw) * Math.sin(this.pitch),
            Math.cos(this.pitch),
          );

          // Scale panning by distance to make it feel consistent at any zoom level
          const panScale = this.distance * 0.001;

          // Apply panning
          vec3.scaleAndAdd(this.panOffset, this.panOffset, right, -deltaX * panScale);
          vec3.scaleAndAdd(this.panOffset, this.panOffset, up, -deltaY * panScale);

          this.lastMousePosition[0] = event.x ?? 0;
          this.lastMousePosition[1] = event.y ?? 0;

          return true;
        }
        break;

      case InputEventType.MouseWheel:
        // Zoom in/out
        {
          // TODO: Figure out why WheelEvent is not being recognized
          const zoomDelta = ((event as unknown as WheelEvent).deltaY ?? 0) * this.params.zoomSpeed * (this.distance * 0.01);

          this.setDistance(this.distance + zoomDelta);
        }

        return true;
      default:
        break;
    }

    return false;
  }
}

/**
 * Extended parameters for orbit camera controller
 */
export interface OrbitCameraControllerParams extends CameraControllerParams {
  /**
   * Minimum allowed distance
   */
  minDistance?: number;

  /**
   * Maximum allowed distance
   */
  maxDistance?: number;

  /**
   * Minimum allowed pitch angle (radians)
   */
  minPitch?: number;

  /**
   * Maximum allowed pitch angle (radians)
   */
  maxPitch?: number;
}
