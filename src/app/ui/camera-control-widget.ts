import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { Radians } from '@ootk/src/main';
import { mat4, vec3 } from 'gl-matrix';

export class CameraControlWidget {
  private static instance: CameraControlWidget;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private isDragging: boolean = false;
  private lastMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private readonly size: number = 120;
  private readonly pointSize = 15;
  private center: { x: number; y: number };
  private readonly axes: { [key: string]: vec3 } = {
    'X': vec3.fromValues(1, 0, 0),
    '-X': vec3.fromValues(-1, 0, 0),
    'Y': vec3.fromValues(0, 1, 0),
    '-Y': vec3.fromValues(0, -1, 0),
    'Z': vec3.fromValues(0, 0, 1),
    '-Z': vec3.fromValues(0, 0, -1),
  };
  private readonly colors: { [key: string]: string } = {
    'X': 'rgb(237, 56, 81)', 'Y': 'rgb(107, 154, 31)', 'Z': 'rgb(47, 132, 226)',
    '-X': 'rgb(160, 37, 54)', '-Y': 'rgb(53, 77, 15)', '-Z': 'rgb(31, 87, 148)',
  };

  private constructor() {
    // Singleton
  }

  static getInstance(): CameraControlWidget {
    if (!CameraControlWidget.instance) {
      CameraControlWidget.instance = new CameraControlWidget();
    }

    return CameraControlWidget.instance;
  }

  init() {
    this.initCanvas();
    this.addEventListeners();
    this.center = { x: this.size / 2, y: this.size / 2 };
  }

  private initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'camera-control-widget';
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = 'calc(var(--top-menu-height) + 10px)';
    this.canvas.style.right = '10px';
    this.canvas.style.zIndex = '-1';
    // append to canvas-holder
    document.getElementById('canvas-holder')?.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
  }

  private addEventListeners() {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('click', this.onClick.bind(this));

    EventBus.getInstance().on(EventBusEvent.updateLoop, this.draw.bind(this));
  }

  private onMouseDown(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.isInsideCircle(x, y, this.center.x, this.center.y, this.size / 2)) {
      this.isDragging = true;
      this.lastMousePosition = { x, y };
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.isDragging) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const dx = x - this.lastMousePosition.x;
    const dy = y - this.lastMousePosition.y;

    this.updateCameraRotation(dx, dy);

    this.lastMousePosition = { x, y };
  }

  private onMouseUp() {
    this.isDragging = false;
  }

  private onClick(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clickedAxis = this.checkIfNeedsFlipped(this.getClickedAxis(x, y));

    if (clickedAxis) {
      ServiceLocator.getMainCamera().autoRotate(false);
      ServiceLocator.getMainCamera().state.camAngleSnappedOnSat = false;
      ServiceLocator.getMainCamera().state.camZoomSnappedOnSat = false;
      this.alignCameraToAxis(clickedAxis);
    }
  }

  private checkIfNeedsFlipped(axis: string | null): string | null {
    if (axis) {
      const camera = ServiceLocator.getMainCamera();

      if (axis === 'X' && camera.state.camYawTarget === Math.PI / 2 as Radians) {
        return '-X';
      } else if (axis === '-X' && camera.state.camYawTarget === -Math.PI / 2 as Radians) {
        return 'X';
      } else if (axis === 'Y' && camera.state.camYawTarget === Math.PI as Radians) {
        return '-Y';
      } else if (axis === '-Y' && camera.state.camYawTarget === 0 as Radians) {
        return 'Y';
      } else if (axis === 'Z' && camera.state.camPitchTarget === Math.PI / 2 as Radians) {
        return '-Z';
      } else if (axis === '-Z' && camera.state.camPitchTarget === -Math.PI / 2 as Radians) {
        return 'Z';
      }
    }

    return null;
  }

  private isInsideCircle(x: number, y: number, cx: number, cy: number, radius: number): boolean {
    const distanceSquared = (x - cx) * (x - cx) + (y - cy) * (y - cy);


    return distanceSquared <= radius * radius;
  }

  private updateCameraRotation(dx: number, dy: number) {
    const camera = ServiceLocator.getMainCamera();
    const rotationSpeed = 0.01;

    camera.state.camYaw = camera.state.camYaw + dx * rotationSpeed as Radians;
    camera.state.camPitch = camera.state.camPitch + dy * rotationSpeed as Radians;
  }

  private getClickedAxis(x: number, y: number): string | null {
    const camera = ServiceLocator.getMainCamera();
    const rotationMatrix = mat4.create();

    mat4.rotateX(rotationMatrix, rotationMatrix, camera.state.camPitch);
    mat4.rotateZ(rotationMatrix, rotationMatrix, -camera.state.camYaw);

    for (const [axisName, axisVector] of Object.entries(this.axes)) {
      const projectedAxis = vec3.transformMat4(vec3.create(), axisVector, rotationMatrix);
      const screenX = this.center.x + projectedAxis[0] * this.size / 3;
      const screenY = this.center.y - projectedAxis[2] * this.size / 3;

      if (this.isInsideCircle(x, y, screenX, screenY, 20)) {
        return axisName;
      }
    }

    return null;
  }

  private alignCameraToAxis(axisName: string) {
    const camera = ServiceLocator.getMainCamera();

    camera.state.isAutoPitchYawToTarget = true;
    switch (axisName) {
      case 'X':
        camera.state.camYawTarget = Math.PI / 2 as Radians;
        camera.state.camPitchTarget = 0 as Radians;
        break;
      case '-X':
        camera.state.camYawTarget = -Math.PI / 2 as Radians;
        camera.state.camPitchTarget = 0 as Radians;
        break;
      case 'Y':
        camera.state.camYawTarget = Math.PI as Radians;
        camera.state.camPitchTarget = 0 as Radians;
        break;
      case '-Y':
        camera.state.camYawTarget = 0 as Radians;
        camera.state.camPitchTarget = 0 as Radians;
        break;
      case 'Z':
        camera.state.camPitchTarget = Math.PI / 2 as Radians;
        break;
      case '-Z':
        camera.state.camPitchTarget = -Math.PI / 2 as Radians;
        break;
      default:
    }
  }

  private draw() {
    if (!settingsManager.drawCameraWidget || !this.ctx) {
      return;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const camera = ServiceLocator.getMainCamera();
    const rotationMatrix = mat4.create();

    // Apply pitch rotation first
    mat4.rotateX(rotationMatrix, rotationMatrix, camera.state.camPitch);
    // Then apply yaw rotation
    mat4.rotateZ(rotationMatrix, rotationMatrix, -camera.state.camYaw);

    // Create an array to store the axes with their projected coordinates and depths
    const axesWithDepth = [] as { axisName: string; screenX: number; screenY: number; depth: number }[];

    // Calculate the projected coordinates and depths for each axis
    for (const [axisName, axisVector] of Object.entries(this.axes)) {
      const projectedAxis = vec3.transformMat4(vec3.create(), axisVector, rotationMatrix);

      const screenX = this.center.x + projectedAxis[0] * this.size / 3;
      const screenY = this.center.y - projectedAxis[2] * this.size / 3;
      const depth = projectedAxis[1]; // Use the Y component as the depth

      axesWithDepth.push({ axisName, screenX, screenY, depth });
    }

    // Sort the axes by depth (farther away first)
    axesWithDepth.sort((a, b) => b.depth - a.depth);

    // Draw the axes
    for (const { axisName, screenX, screenY } of axesWithDepth) {
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, this.pointSize, 0, 2 * Math.PI);
      this.ctx.fillStyle = this.colors[axisName];
      this.ctx.fill();
      if (axisName.startsWith('-')) {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(axisName, screenX, screenY);
      } else {
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(axisName, screenX, screenY);
      }
    }
  }
}
