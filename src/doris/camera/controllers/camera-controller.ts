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

  activate(): void {
    this.isActive = true;
    this.registerInputEvents?.();
    this.onActivate?.();
  }

  deactivate(): void {
    this.isActive = false;
    this.unregisterInputEvents?.();
    this.reset();
    this.onDeactivate?.();
  }

  update(deltaTime: number): void {
    if (!this.isActive) {
      return;
    }
    this.updateInternal?.(deltaTime);
  }

  render(camera: Camera): void {
    if (!this.isActive) {
      return;
    }
    this.renderInternal?.(camera);
  }

  reset(): void {
    this.resetInternal?.();
  }

  protected updateInternal?(deltaTime: number): void;
  protected renderInternal?(camera: Camera): void;
  protected resetInternal?(): void;
  protected registerInputEvents?(): void;
  protected unregisterInputEvents?(): void;
  protected onActivate?(): void;
  protected onDeactivate?(): void;
  protected handleKeyDown?(event?: KeyboardEvent, key?: string, isRepeat?: boolean): void;
  protected handleKeyUp?(event?: KeyboardEvent, key?: string): void;
}
