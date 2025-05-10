import { EventBus } from '@app/doris/events/event-bus';
import { CameraSystemEvents } from '@app/doris/events/event-types';
import { Camera } from '../camera';

export abstract class CameraController {
  protected camera: Camera;
  protected eventBus: EventBus;
  protected isActive: boolean = true;

  constructor(camera: Camera, eventBus: EventBus) {
    this.camera = camera;
    this.eventBus = eventBus;

    this.eventBus.on(CameraSystemEvents.Reset, this.reset.bind(this));
  }

  /**
   * Activates the camera controller.
   *
   * Sets the controller as active, registers input events if available,
   * and triggers the activation callback if defined.
   */
  activate(): void {
    this.isActive = true;
    this.registerInputEvents?.();
    this.onActivate?.();
  }

  /**
   * Deactivates the camera controller.
   *
   * This method sets the controller's active state to false, unregisters any input events,
   * resets the controller to its initial state, and invokes the optional deactivation callback.
   *
   * @remarks
   * - Calls `unregisterInputEvents` if it is defined to remove any registered input listeners.
   * - Calls `reset` to restore the controller's default state.
   * - Calls `onDeactivate` if it is defined to perform any additional cleanup or notification.
   */
  deactivate(): void {
    this.isActive = false;
    this.unregisterInputEvents?.();
    this.reset();
    this.onDeactivate?.();
  }

  /**
   * Validates the current state using the optional `onValidate` callback.
   * If `onValidate` is defined, its result is returned; otherwise, returns `true` by default.
   *
   * @returns {boolean} The result of the `onValidate` callback if present, or `true` if not.
   */
  validate(): boolean {
    return this.onValidate?.() ?? true;
  }

  /**
   * Updates the camera controller state for the current frame.
   *
   * @param deltaTime - The elapsed time in seconds since the last update.
   * If the controller is not active, the update is skipped.
   */
  update(deltaTime: number): void {
    if (!this.isActive) {
      return;
    }
    this.updateInternal?.(deltaTime);
  }

  /**
   * Renders the camera view if the controller is active.
   *
   * @param camera - The camera instance to render with.
   */
  render(camera: Camera): void {
    if (!this.isActive) {
      return;
    }
    this.renderInternal?.(camera);
  }

  /**
   * Resets the camera controller to its initial state.
   * Invokes the internal reset logic if available.
   */
  reset(): void {
    this.resetInternal?.();
  }

  protected updateInternal?(deltaTime: number): void;
  protected renderInternal?(camera: Camera): void;
  protected resetInternal?(): void;
  protected registerInputEvents?(): void;
  protected unregisterInputEvents?(): void;
  protected onActivate?(): void;
  protected onValidate?(): boolean;
  protected onDeactivate?(): void;
  protected handleKeyDown?(event?: KeyboardEvent, key?: string, isRepeat?: boolean): void;
  protected handleKeyUp?(event?: KeyboardEvent, key?: string): void;
}
