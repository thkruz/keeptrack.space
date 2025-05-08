import { Camera } from '@app/doris/camera/camera';
import { CameraController } from '@app/doris/camera/controllers/camera-controller';
import { EventBus } from '@app/doris/events/event-bus';
import { InputEvents } from '@app/doris/events/event-types';
import { mat4 } from 'gl-matrix';
import { DEG2RAD } from 'ootk';
import { KeepTrackMainCamera } from '../legacy-camera';

/* eslint-disable @typescript-eslint/no-unused-vars */
export class FirstPersonCameraController extends CameraController {
  // Camera state
  private fpsYaw: number = 0;
  private fpsPitch: number = 0;
  private moveForward: boolean = false;
  private moveBackward: boolean = false;
  private moveLeft: boolean = false;
  private moveRight: boolean = false;
  private moveUp: boolean = false;
  private moveDown: boolean = false;
  private speedMultiplier: number = 1;

  constructor(camera: Camera, eventBus: EventBus) {
    super(camera, eventBus);
  }

  protected updateInternal(): void {
    /*
     * Update camera position based on movement inputs
     * Adapted from LegacyCamera.updateFpsMovement_
     */
  }

  protected renderInternal(camera: KeepTrackMainCamera): void {
    const viewMatrix = camera.getViewMatrix();

    // Rotate the camera
    mat4.rotate(viewMatrix, viewMatrix, -camera.fpsPitch * DEG2RAD, [1, 0, 0]);
    mat4.rotate(viewMatrix, viewMatrix, camera.fpsYaw * DEG2RAD, [0, 0, 1]);
    // Move the camera to the FPS position
    mat4.translate(viewMatrix, viewMatrix, [camera.fpsPos[0], camera.fpsPos[1], -camera.fpsPos[2]]);
  }

  protected registerInputEvents(): void {
    this.eventBus.on(InputEvents.MouseDown, this.handleMouseDown.bind(this));
    this.eventBus.on(InputEvents.MouseMove, this.handleMouseMove.bind(this));
    this.eventBus.on(InputEvents.MouseUp, this.handleMouseUp.bind(this));
    this.eventBus.on(InputEvents.KeyDown, this.handleKeyDown.bind(this));
    this.eventBus.on(InputEvents.KeyUp, this.handleKeyUp.bind(this));
  }

  protected unregisterInputEvents(): void {
    this.eventBus.removeListener(InputEvents.MouseDown, this.handleMouseDown.bind(this));
    this.eventBus.removeListener(InputEvents.MouseMove, this.handleMouseMove.bind(this));
    this.eventBus.removeListener(InputEvents.MouseUp, this.handleMouseUp.bind(this));
    this.eventBus.removeListener(InputEvents.KeyDown, this.handleKeyDown.bind(this));
    this.eventBus.removeListener(InputEvents.KeyUp, this.handleKeyUp.bind(this));
  }

  // Implement handlers similar to EarthCenteredCameraController but for first-person movement
  protected handleMouseDown(event: MouseEvent, x: number, y: number, button: number): void {
    // Handle mouse down events for FPS camera
  }
  protected handleMouseMove(event: MouseEvent, x: number, y: number, deltaX: number, deltaY: number): void {
    // Handle mouse move events for FPS camera
  }
  protected handleMouseUp(event: MouseEvent, x: number, y: number, button: number): void {
    // Handle mouse up events for FPS camera
  }
  protected handleKeyDown(event: KeyboardEvent): void {
    // Handle key down events for FPS camera
  }
  protected handleKeyUp(event: KeyboardEvent): void {
    // Handle key up events for FPS camera
  }
}
