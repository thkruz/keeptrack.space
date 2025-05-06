import { System } from '../system/system';
import { Camera } from './camera';
import { CameraController } from './camera-controller';

/**
 * Manages multiple cameras in a scene and camera controllers.
 */
export class CameraSystem extends System {
  /**
   * All registered cameras
   */
  private cameras: Map<string, Camera> = new Map();

  /**
   * All registered camera controllers
   */
  private controllers: Map<string, CameraController> = new Map();

  /**
   * Currently active camera
   */
  private activeCamera: Camera | null = null;

  /**
   * Currently active controller
   */
  private activeController: CameraController | null = null;

  constructor() {
    super();
  }

  /**
   * Registers a camera with the system
   */
  registerCamera(id: string, camera: Camera): void {
    this.cameras.set(id, camera);

    // If this is the first camera, make it active
    if (this.cameras.size === 1) {
      this.setActiveCamera(id);
    }
  }

  /**
   * Registers a camera controller with the system
   */
  registerController(id: string, controller: CameraController): void {
    this.controllers.set(id, controller);
  }

  /**
   * Sets the active camera
   */
  setActiveCamera(id: string): boolean {
    const camera = this.cameras.get(id);

    if (!camera) {
      console.warn(`Camera with id "${id}" not found`);

      return false;
    }

    this.activeCamera = camera;

    return true;
  }

  /**
   * Sets the active camera controller
   */
  setActiveController(id: string): boolean {
    const controller = this.controllers.get(id);

    if (!controller) {
      console.warn(`Camera controller with id "${id}" not found`);

      return false;
    }

    // Deactivate current controller
    if (this.activeController) {
      this.activeController.deactivate();
    }

    // Activate new controller
    this.activeController = controller;
    this.activeController.activate();

    return true;
  }

  /**
   * Gets the active camera
   */
  getActiveCamera(): Camera | null {
    return this.activeCamera;
  }

  /**
   * Gets the active controller
   */
  getActiveController(): CameraController | null {
    return this.activeController;
  }

  /**
   * Gets a camera by ID
   */
  getCamera(id: string): Camera | undefined {
    return this.cameras.get(id);
  }

  /**
   * Gets a controller by ID
   */
  getController(id: string): CameraController | undefined {
    return this.controllers.get(id);
  }

  /**
   * Removes a camera from the system
   */
  removeCamera(id: string): boolean {
    if (!this.cameras.has(id)) {
      return false;
    }

    if (this.activeCamera === this.cameras.get(id)) {
      this.activeCamera = null;
    }

    return this.cameras.delete(id);
  }

  /**
   * Removes a controller from the system
   */
  removeController(id: string): boolean {
    if (!this.controllers.has(id)) {
      return false;
    }

    if (this.activeController === this.controllers.get(id)) {
      this.activeController = null;
    }

    return this.controllers.delete(id);
  }

  /**
   * Updates all cameras and active controller
   */
  update(deltaTime: number): void {
    // Update active controller
    if (this.activeController) {
      this.activeController.update(deltaTime);
    }

    // Update all cameras
    this.cameras.forEach((camera) => {
      camera.update();
    });
  }
}
