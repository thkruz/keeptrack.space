import { mat4, quat, vec2, vec3 } from 'gl-matrix';
import { InputEventType, KeyCode } from '../input/input-types';
import { Camera } from './camera';
import { CameraController, CameraControllerParams } from './camera-controller';

/**
 * Controller for first-person-style camera movement.
 * Allows looking around and moving in 3D space.
 */
export class FpsCameraController extends CameraController {
  /**
   * Current camera rotation angles
   */
  private yaw: number = 0;
  private pitch: number = 0;

  /**
   * Movement flags
   */
  private moveForward: boolean = false;
  private moveBackward: boolean = false;
  private moveLeft: boolean = false;
  private moveRight: boolean = false;
  private moveUp: boolean = false;
  private moveDown: boolean = false;

  /**
   * Current velocity
   */
  private velocity: vec3 = vec3.create();

  /**
   * Camera basis vectors
   */
  private forward: vec3 = vec3.create();
  private right: vec3 = vec3.create();
  private up: vec3 = vec3.create();

  /**
   * Tracking mouse state
   */
  private isDragging: boolean = false;
  private lastMousePosition: vec2 = vec2.create();

  /**
   * Speed multiplier (e.g., for sprint)
   */
  private speedMultiplier: number = 1.0;

  constructor(
    camera: Camera,
    params?: Partial<FpsCameraControllerParams>,
  ) {
    super(camera, params);
    this.updateCameraOrientation();
  }

  /**
   * Sets specific look angles
   */
  setAngles(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
    this.updateCameraOrientation();
  }

  /**
   * Updates camera position and orientation based on input and time
   */
  update(deltaTime: number): void {
    if (!this.isActive || !this.camera.node) {
      return;
    }

    // Convert delta time to seconds
    const deltaSeconds = deltaTime / 1000;

    // Update camera basis vectors
    this.updateBasisVectors();

    // Calculate movement direction based on key states
    const moveDirection = vec3.create();

    if (this.moveForward) {
      vec3.add(moveDirection, moveDirection, this.forward);
    }
    if (this.moveBackward) {
      vec3.subtract(moveDirection, moveDirection, this.forward);
    }
    if (this.moveRight) {
      vec3.add(moveDirection, moveDirection, this.right);
    }
    if (this.moveLeft) {
      vec3.subtract(moveDirection, moveDirection, this.right);
    }
    if (this.moveUp) {
      vec3.add(moveDirection, moveDirection, this.up);
    }
    if (this.moveDown) {
      vec3.subtract(moveDirection, moveDirection, this.up);
    }

    // Normalize if moving in multiple directions
    if (vec3.length(moveDirection) > 0) {
      vec3.normalize(moveDirection, moveDirection);
    }

    // Apply speed and delta time
    vec3.scale(
      moveDirection,
      moveDirection,
      this.params.movementSpeed * this.speedMultiplier * deltaSeconds,
    );

    // Apply movement
    const position = this.camera.node.transform.getPosition();

    vec3.add(position, position, moveDirection);
    this.camera.node.transform.setPosition(position);

    // Apply damping to velocity
    vec3.scale(this.velocity, this.velocity, this.params.dampingFactor ** deltaSeconds);

    this.camera.markDirty();
  }

  /**
   * Updates the camera orientation based on current angles
   */
  private updateCameraOrientation(): void {
    if (!this.camera.node) {
      return;
    }

    // Create rotation quaternion
    const rotation = quat.create();

    // Apply rotations (pitch around X, yaw around Z)
    quat.rotateZ(rotation, rotation, -this.yaw);
    quat.rotateX(rotation, rotation, -this.pitch);

    // Set camera rotation
    this.camera.node.transform.setRotation(rotation);
    this.camera.markDirty();

    // Update camera basis vectors
    this.updateBasisVectors();
  }

  /**
   * Updates forward, right, and up vectors based on camera orientation
   */
  private updateBasisVectors(): void {
    if (!this.camera.node) {
      return;
    }

    // Get the camera's world transform
    const rotation = this.camera.node.transform.getRotation();

    // Calculate basis vectors from rotation
    const rotMatrix = mat4.create();

    mat4.fromQuat(rotMatrix, rotation);

    // Extract basis vectors
    this.forward[0] = -rotMatrix[2]; // -Z axis
    this.forward[1] = -rotMatrix[6];
    this.forward[2] = -rotMatrix[10];

    this.right[0] = rotMatrix[0]; // X axis
    this.right[1] = rotMatrix[4];
    this.right[2] = rotMatrix[8];

    this.up[0] = rotMatrix[1]; // Y axis
    this.up[1] = rotMatrix[5];
    this.up[2] = rotMatrix[9];
  }

  /**
   * Handles input events for camera control
   */
  handleInput(event: InputEvent): boolean {
    if (!this.isActive) {
      return false;
    }

    if (event instanceof MouseEvent) {
      switch (event.type) {
        case InputEventType.MouseUp:
          if (event.button === 0) {
            this.isDragging = false;

            return true;
          }
          break;
        case InputEventType.MouseDown:
          if (event.button === 0) {
            this.isDragging = true;
            this.lastMousePosition[0] = event.x ?? 0;
            this.lastMousePosition[1] = event.y ?? 0;

            return true;
          }
          break;
        case InputEventType.MouseMove:
          if (this.isDragging) {
            const deltaX = (event.x ?? 0) - (this.lastMousePosition[0] ?? 0);
            const deltaY = (event.y ?? 0) - (this.lastMousePosition[1] ?? 0);

            this.yaw -= deltaX * this.params.rotationSpeed;
            this.pitch -= deltaY * this.params.rotationSpeed;

            // Clamp pitch to avoid gimbal lock
            this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));

            this.updateCameraOrientation();

            this.lastMousePosition[0] = event.x ?? 0;
            this.lastMousePosition[1] = event.y ?? 0;

            return true;
          }
          break;
        default:
          // Handle other mouse events if needed
          break;
      }
    } else if (event instanceof KeyboardEvent) {
      switch (event.type) {
        case InputEventType.KeyDown:
          return this.handleKeyDown(event.keyCode as unknown as KeyCode);

        case InputEventType.KeyUp:
          return this.handleKeyUp(event.keyCode as unknown as KeyCode);
        default:
          // Handle other events if needed
          break;
      }
    }

    return false;
  }

  /**
   * Handles key down events
   */
  private handleKeyDown(keyCode: KeyCode): boolean {
    switch (keyCode) {
      case KeyCode.W:
        this.moveForward = true;

        return true;

      case KeyCode.S:
        this.moveBackward = true;

        return true;

      case KeyCode.A:
        this.moveLeft = true;

        return true;

      case KeyCode.D:
        this.moveRight = true;

        return true;

      case KeyCode.Q:
      case KeyCode.Space:
        this.moveUp = true;

        return true;

      case KeyCode.E:
      case KeyCode.ShiftLeft:
      case KeyCode.ControlLeft:
        this.moveDown = true;

        return true;

      case KeyCode.ShiftRight:
        this.speedMultiplier = 3.0; // Sprint

        return true;
      default:
        // Handle other keys if needed
        break;
    }

    return false;
  }

  /**
   * Handles key up events
   */
  private handleKeyUp(keyCode: KeyCode): boolean {
    switch (keyCode) {
      case KeyCode.W:
        this.moveForward = false;

        return true;

      case KeyCode.S:
        this.moveBackward = false;

        return true;

      case KeyCode.A:
        this.moveLeft = false;

        return true;

      case KeyCode.D:
        this.moveRight = false;

        return true;

      case KeyCode.Q:
      case KeyCode.Space:
        this.moveUp = false;

        return true;

      case KeyCode.E:
      case KeyCode.ShiftLeft:
      case KeyCode.ControlLeft:
        this.moveDown = false;

        return true;

      case KeyCode.ShiftRight:
        this.speedMultiplier = 1.0; // Normal speed

        return true;
      default:
        // Handle other keys if needed
        break;
    }

    return false;
  }
}

/**
 * Extended parameters for FPS camera controller
 */
export interface FpsCameraControllerParams extends CameraControllerParams {
  /**
   * Gravity factor (for realistic movement)
   */
  gravity?: number;

  /**
   * Jump force
   */
  jumpForce?: number;
}
