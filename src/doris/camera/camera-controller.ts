import { Camera } from './camera';

/**
 * Base class for all camera controllers.
 * Camera controllers handle input and movement logic for cameras.
 */
export abstract class CameraController {
  /**
   * The camera being controlled
   */
  protected camera: Camera;

  /**
   * Indicates if this controller is currently active
   */
  protected isActive: boolean = false;

  /**
   * Parameters that control camera movement behavior
   */
  protected params: CameraControllerParams = {
    movementSpeed: 1.0,
    rotationSpeed: 0.005,
    zoomSpeed: 0.1,
    dampingFactor: 0.9,
  };

  constructor(camera: Camera, params?: Partial<CameraControllerParams>) {
    this.camera = camera;

    if (params) {
      this.params = { ...this.params, ...params };
    }
  }

  /**
   * Activates this controller
   */
  activate(): void {
    this.isActive = true;
  }

  /**
   * Deactivates this controller
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * Updates camera position and orientation based on input and elapsed time
   * @param deltaTime Time elapsed since last update in milliseconds
   */
  abstract update(deltaTime: number): void;

  /**
   * Processes an input event and updates controller state
   * @param event Input event from mouse, keyboard, touch, etc.
   * @returns True if the event was handled, false otherwise
   */
  abstract handleInput(event: InputEvent): boolean;

  /**
   * Sets controller parameters
   */
  setParams(params: Partial<CameraControllerParams>): void {
    this.params = { ...this.params, ...params };
  }
}

/**
 * Parameters for camera controllers
 */
export interface CameraControllerParams {
  /**
   * Base movement speed (units per second)
   */
  movementSpeed: number;

  /**
   * Base rotation speed (radians per pixel)
   */
  rotationSpeed: number;

  /**
   * Zoom speed factor
   */
  zoomSpeed: number;

  /**
   * Damping factor for smooth camera movement (0-1)
   * Higher values = more dampening (less momentum)
   */
  dampingFactor: number;
}
