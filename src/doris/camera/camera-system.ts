// app/doris/camera/camera-system.ts
import { CoreEngineEvents } from '@app/doris/events/event-types';
import { System } from '@app/doris/system/system';
import { vec3 } from 'gl-matrix';
import { EventBus } from '../events/event-bus';
import { Camera } from './camera';
import { CameraController } from './controllers/camera-controller';

export enum CameraNames {
  MAIN = 'main',
  PIP = 'pictureInPicture',
}

export class CameraSystem extends System {
  // Map of cameras by ID
  private readonly cameras: Map<string, Camera> = new Map();

  // Map of controllers by camera ID and controller type
  private readonly controllers: Map<string, Map<number, CameraController>> = new Map();

  // Currently active camera/controller pairs
  private readonly activeCameras: Map<string, number> = new Map();

  // TODO: Information that belongs in the node
  cameraOrigin: vec3 = vec3.create();

  constructor(eventBus: EventBus) {
    super();

    this.eventBus = eventBus;
    this.eventBus.on(CoreEngineEvents.Update, (deltaTime) => {
      this.update(deltaTime);
    });
  }

  // Update all active cameras and controllers
  update(deltaTime: number): void {
    // Update each active camera's controller
    this.activeCameras.forEach((controllerType, cameraId) => {
      const camera = this.cameras.get(cameraId);
      const controllerMap = this.controllers.get(cameraId);

      if (camera && controllerMap) {
        const controller = controllerMap.get(controllerType);

        if (controller) {
          controller.update(deltaTime);
        }

        // Update the camera itself
        camera.update(deltaTime);
      }
    });
  }

  render(): void {
    // Render each active camera's controller
    this.activeCameras.forEach((controllerType, cameraId) => {
      const camera = this.cameras.get(cameraId);
      const controllerMap = this.controllers.get(cameraId);

      if (camera && controllerMap) {
        const controller = controllerMap.get(controllerType);

        if (controller) {
          controller.render(camera);
        }
      }
    });
  }

  renderCamera(cameraId: string): void {
    // Render a specific camera's controller
    const camera = this.cameras.get(cameraId);
    const controllerMap = this.controllers.get(cameraId);
    const controllerType = this.activeCameras.get(cameraId);

    if (camera && controllerMap && controllerType) {
      const controller = controllerMap.get(controllerType);

      if (controller) {
        controller.render(camera);
      }
    }
  }

  getCamera(id?: string): Camera | undefined {
    if (!id) {
      // If no ID is provided, return the first camera
      return this.cameras.values().next().value;
    }

    // If an ID is provided, return the camera with that ID
    return this.cameras.get(id);
  }

  getControllerType(cameraId: string): number | undefined {
    // Get the active controller type for the specified camera
    return this.activeCameras.get(cameraId);
  }

  // Set active controller for a camera
  setCameraController(controllerId: string, type: number): boolean {
    // Get the camera's controller map
    const controllerMap = this.controllers.get(controllerId);

    if (!controllerMap) {
      return false;
    }

    // Get the previous controller type for this camera
    const prevType = this.activeCameras.get(controllerId);

    // If there was a previous controller, deactivate it
    if (prevType) {
      const prevController = controllerMap.get(prevType);

      if (prevController) {
        prevController.deactivate();
      }
    }

    // Activate the new controller
    const newController = controllerMap.get(type);

    if (newController) {
      newController.activate();
      this.activeCameras.set(controllerId, type);

      return true;
    }

    return false;
  }

  addController(id: string, type: number, controller: CameraController): boolean {
    // Get the camera's controller map
    const controllerMap = this.controllers.get(id);

    if (!controllerMap) {
      return false;
    }
    // Add the controller to the map
    controllerMap.set(type, controller);
    // If this is the first controller, set it as the active controller
    if (controllerMap.size === 1) {
      this.setCameraController(id, type);
    }

    return true;
  }

  // Add a camera to the manager with controllers
  addCamera(id: string, camera: Camera, controllers: Map<number, CameraController>, defaultControllerType?: number): void {
    this.cameras.set(id, camera);

    // Store the controllers
    this.controllers.set(id, controllers);

    // Set the default camera controller if provided
    if (defaultControllerType && controllers.has(defaultControllerType)) {
      this.setCameraController(id, defaultControllerType);
    } else if (controllers.size > 0) {
      // Otherwise set the first available controller as default
      const firstControllerType = controllers.keys().next().value;

      this.setCameraController(id, firstControllerType);
    }
  }

  // Remove a camera from the manager
  removeCamera(id: string): boolean {
    // Deactivate any active controller for this camera
    const controllerType = this.activeCameras.get(id);

    if (controllerType) {
      const controllerMap = this.controllers.get(id);

      if (controllerMap) {
        const controller = controllerMap.get(controllerType);

        if (controller) {
          controller.deactivate();
        }
      }

      this.activeCameras.delete(id);
    }

    // Remove controller map
    this.controllers.delete(id);

    // Remove camera
    return this.cameras.delete(id);
  }
}
