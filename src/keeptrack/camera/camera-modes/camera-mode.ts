import { LegacyCamera } from '../legacy-camera';

/**
 * Base class for all KeepTrack camera modes.
 * Implements the strategy pattern for different camera behaviors.
 */
export abstract class CameraMode {
  /**
   * Reference to the camera being controlled
   */
  protected camera: LegacyCamera;

  /**
   * Whether this mode is currently initialized
   */
  protected isInitialized: boolean = false;

  /**
   * Whether this mode is currently active
   */
  protected isActive: boolean = false;

  constructor(camera: LegacyCamera) {
    this.camera = camera;
  }

  /**
   * Activates this camera mode
   */
  activate(): void {
    if (!this.isInitialized) {
      this.initialize();
    }

    this.isActive = true;
    this.onActivate();
  }

  /**
   * Deactivates this camera mode
   */
  deactivate(): void {
    this.isActive = false;
    this.onDeactivate();
  }

  /**
   * Initializes this mode (called once)
   */
  protected initialize(): void {
    this.isInitialized = true;
  }

  /**
   * Called when the mode is activated
   */
  protected onActivate(): void {
    // Override in subclasses
  }

  /**
   * Called when the mode is deactivated
   */
  protected onDeactivate(): void {
    // Override in subclasses
  }

  /**
   * Updates the camera based on this mode's behavior
   */
  abstract update(deltaTime: number): void;

  /**
   * Renders the camera for this mode
   */
  abstract render(): void;
}
