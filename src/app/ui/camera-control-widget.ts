import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { Radians } from '@ootk/src/main';
import { mat4, vec3 } from 'gl-matrix';

interface AxisProjection {
  axisName: string;
  screenX: number;
  screenY: number;
  depth: number;
  depthScale: number;
  depthOpacity: number;
  isPositive: boolean;
  isHovered: boolean;
}

export class CameraControlWidget {
  private static instance_: CameraControlWidget;
  private canvas_: HTMLCanvasElement;
  private ctx_: CanvasRenderingContext2D | null;
  private isDragging_ = false;
  private lastMousePosition_ = { x: 0, y: 0 };
  private hoveredAxis_: string | null = null;
  private isMouseOverCanvas_ = false;

  // Sizing
  private readonly size_ = 120;
  private readonly bgRadius_ = 50;
  private readonly axisLength_ = 35;
  private readonly posSphereRadius_ = 12;
  private readonly negSphereRadius_ = 7;
  private readonly hoverGrowth_ = 2;

  // Depth effect parameters
  private readonly minDepthOpacity_ = 0.4;
  private readonly minDepthScale_ = 0.7;

  private center_: { x: number; y: number };

  private readonly axes_: Record<string, vec3> = {
    'X': vec3.fromValues(1, 0, 0),
    '-X': vec3.fromValues(-1, 0, 0),
    'Y': vec3.fromValues(0, 1, 0),
    '-Y': vec3.fromValues(0, -1, 0),
    'Z': vec3.fromValues(0, 0, 1),
    '-Z': vec3.fromValues(0, 0, -1),
  };

  private readonly colors_: Record<string, string> = {
    'X': 'rgb(237, 56, 81)', 'Y': 'rgb(107, 154, 31)', 'Z': 'rgb(47, 132, 226)',
    '-X': 'rgb(160, 37, 54)', '-Y': 'rgb(53, 77, 15)', '-Z': 'rgb(31, 87, 148)',
  };

  private readonly axisLineColors_: Record<string, string> = {
    'X': 'rgba(237, 56, 81, 0.6)',
    'Y': 'rgba(107, 154, 31, 0.6)',
    'Z': 'rgba(47, 132, 226, 0.6)',
  };

  private constructor() {
    // Singleton
  }

  static getInstance(): CameraControlWidget {
    if (!CameraControlWidget.instance_) {
      CameraControlWidget.instance_ = new CameraControlWidget();
    }

    return CameraControlWidget.instance_;
  }

  init() {
    this.initCanvas_();
    this.addEventListeners_();
    this.center_ = { x: this.size_ / 2, y: this.size_ / 2 };
  }

  private initCanvas_() {
    this.canvas_ = document.createElement('canvas');
    this.canvas_.id = 'camera-control-widget';
    this.canvas_.width = this.size_;
    this.canvas_.height = this.size_;
    this.canvas_.style.position = 'fixed';
    this.canvas_.style.top = 'calc(var(--top-menu-height) + 10px)';
    this.canvas_.style.right = '10px';
    this.canvas_.style.zIndex = '100';
    this.canvas_.style.pointerEvents = 'none';
    this.canvas_.style.display = settingsManager.drawCameraWidget ? 'block' : 'none';
    document.getElementById('canvas-holder')?.appendChild(this.canvas_);

    this.ctx_ = this.canvas_.getContext('2d');
  }

  private addEventListeners_() {
    this.canvas_.addEventListener('mousedown', this.onMouseDown_.bind(this));
    document.addEventListener('mousemove', this.onMouseMove_.bind(this));
    document.addEventListener('mouseup', this.onMouseUp_.bind(this));
    this.canvas_.addEventListener('click', this.onClick_.bind(this));

    this.canvas_.addEventListener('mouseenter', () => {
      this.isMouseOverCanvas_ = true;
    });
    this.canvas_.addEventListener('mouseleave', () => {
      this.isMouseOverCanvas_ = false;
      this.hoveredAxis_ = null;
      this.canvas_.style.cursor = 'default';
    });
    this.canvas_.addEventListener('mousemove', this.onCanvasMouseMove_.bind(this));

    EventBus.getInstance().on(EventBusEvent.updateLoop, this.draw_.bind(this));
  }

  private onCanvasMouseMove_(event: MouseEvent) {
    if (this.isDragging_) {
      return;
    }

    const rect = this.canvas_.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.updateHoverState_(x, y);
  }

  private onMouseDown_(event: MouseEvent) {
    const rect = this.canvas_.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.isInsideCircle_(x, y, this.center_.x, this.center_.y, this.bgRadius_)) {
      this.isDragging_ = true;
      this.lastMousePosition_ = { x, y };
      this.canvas_.style.cursor = 'grabbing';
    }
  }

  private onMouseMove_(event: MouseEvent) {
    if (!this.isDragging_) {
      return;
    }

    const rect = this.canvas_.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const dx = x - this.lastMousePosition_.x;
    const dy = y - this.lastMousePosition_.y;

    this.updateCameraRotation_(dx, dy);

    this.lastMousePosition_ = { x, y };
  }

  private onMouseUp_() {
    if (this.isDragging_) {
      this.isDragging_ = false;
      this.canvas_.style.cursor = this.isMouseOverCanvas_ ? 'grab' : 'default';
    }
  }

  private onClick_(event: MouseEvent) {
    const rect = this.canvas_.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clickedAxis = this.checkIfNeedsFlipped_(this.getClickedAxis_(x, y));

    if (clickedAxis) {
      ServiceLocator.getMainCamera().autoRotate(false);
      ServiceLocator.getMainCamera().state.camAngleSnappedOnSat = false;
      ServiceLocator.getMainCamera().state.camZoomSnappedOnSat = false;
      this.alignCameraToAxis_(clickedAxis);
    }
  }

  private checkIfNeedsFlipped_(axis: string | null): string | null {
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

    return axis;
  }

  private isInsideCircle_(x: number, y: number, cx: number, cy: number, radius: number): boolean {
    const distanceSquared = (x - cx) * (x - cx) + (y - cy) * (y - cy);

    return distanceSquared <= radius * radius;
  }

  private updateCameraRotation_(dx: number, dy: number) {
    const camera = ServiceLocator.getMainCamera();
    const rotationSpeed = 0.01;

    camera.state.camYaw = camera.state.camYaw + dx * rotationSpeed as Radians;
    camera.state.camPitch = camera.state.camPitch + dy * rotationSpeed as Radians;
  }

  private getClickedAxis_(x: number, y: number): string | null {
    const camera = ServiceLocator.getMainCamera();
    const rotationMatrix = mat4.create();

    mat4.rotateX(rotationMatrix, rotationMatrix, camera.state.camPitch);
    mat4.rotateZ(rotationMatrix, rotationMatrix, -camera.state.camYaw);

    // Check front-most axes first (sorted by depth ascending = closest first)
    const projected: { name: string; sx: number; sy: number; depth: number; radius: number }[] = [];

    for (const [axisName, axisVector] of Object.entries(this.axes_)) {
      const projectedAxis = vec3.transformMat4(vec3.create(), axisVector, rotationMatrix);
      const screenX = this.center_.x + projectedAxis[0] * this.axisLength_;
      const screenY = this.center_.y - projectedAxis[2] * this.axisLength_;
      const isPositive = !axisName.startsWith('-');
      const radius = isPositive ? this.posSphereRadius_ : this.negSphereRadius_;

      projected.push({ name: axisName, sx: screenX, sy: screenY, depth: projectedAxis[1], radius });
    }

    // Sort closest first so we pick the front-most hit
    projected.sort((a, b) => a.depth - b.depth);

    for (const p of projected) {
      if (this.isInsideCircle_(x, y, p.sx, p.sy, p.radius + 4)) {
        return p.name;
      }
    }

    return null;
  }

  private alignCameraToAxis_(axisName: string) {
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

  // -- Hover state --

  private updateHoverState_(x: number, y: number) {
    const camera = ServiceLocator.getMainCamera();
    const rotationMatrix = mat4.create();

    mat4.rotateX(rotationMatrix, rotationMatrix, camera.state.camPitch);
    mat4.rotateZ(rotationMatrix, rotationMatrix, -camera.state.camYaw);

    // Check front-most axes first
    const projected: { name: string; sx: number; sy: number; depth: number; radius: number }[] = [];

    for (const [axisName, axisVector] of Object.entries(this.axes_)) {
      const projectedAxis = vec3.transformMat4(vec3.create(), axisVector, rotationMatrix);
      const screenX = this.center_.x + projectedAxis[0] * this.axisLength_;
      const screenY = this.center_.y - projectedAxis[2] * this.axisLength_;
      const isPositive = !axisName.startsWith('-');
      const radius = isPositive ? this.posSphereRadius_ : this.negSphereRadius_;

      projected.push({ name: axisName, sx: screenX, sy: screenY, depth: projectedAxis[1], radius });
    }

    projected.sort((a, b) => a.depth - b.depth);

    this.hoveredAxis_ = null;
    for (const p of projected) {
      if (this.isInsideCircle_(x, y, p.sx, p.sy, p.radius + 2)) {
        this.hoveredAxis_ = p.name;
        break;
      }
    }

    if (this.hoveredAxis_) {
      this.canvas_.style.cursor = 'pointer';
    } else if (this.isInsideCircle_(x, y, this.center_.x, this.center_.y, this.bgRadius_)) {
      this.canvas_.style.cursor = 'grab';
    } else {
      this.canvas_.style.cursor = 'default';
    }
  }

  // -- Drawing helpers --

  private computeDepthFactor_(depth: number): { scale: number; opacity: number } {
    const normalized = (depth + 1) / 2; // -1..1 → 0..1

    return {
      scale: this.minDepthScale_ + normalized * (1 - this.minDepthScale_),
      opacity: this.minDepthOpacity_ + normalized * (1 - this.minDepthOpacity_),
    };
  }

  private lightenColor_(rgb: string, amount: number): string {
    const match = rgb.match(/rgb\((?<r>\d+),\s*(?<g>\d+),\s*(?<b>\d+)\)/u);

    if (!match?.groups) {
      return rgb;
    }

    const r = Math.min(255, parseInt(match.groups.r) + amount);
    const g = Math.min(255, parseInt(match.groups.g) + amount);
    const b = Math.min(255, parseInt(match.groups.b) + amount);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private darkenColor_(rgb: string, amount: number): string {
    const match = rgb.match(/rgb\((?<r>\d+),\s*(?<g>\d+),\s*(?<b>\d+)\)/u);

    if (!match?.groups) {
      return rgb;
    }

    const r = Math.max(0, parseInt(match.groups.r) - amount);
    const g = Math.max(0, parseInt(match.groups.g) - amount);
    const b = Math.max(0, parseInt(match.groups.b) - amount);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private drawBackground_() {
    const ctx = this.ctx_!;

    // Semi-transparent dark background circle
    ctx.beginPath();
    ctx.arc(this.center_.x, this.center_.y, this.bgRadius_, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(30, 30, 30, 0.6)';
    ctx.fill();

    // Subtle border ring
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawAxisLines_(axesWithDepth: AxisProjection[]) {
    const ctx = this.ctx_!;

    ctx.lineCap = 'round';

    for (const axis of axesWithDepth) {
      if (!axis.isPositive) {
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(this.center_.x, this.center_.y);
      ctx.lineTo(axis.screenX, axis.screenY);

      // Apply depth-based opacity to line color
      const baseColor = this.axisLineColors_[axis.axisName];
      const match = baseColor.match(/rgba\((?<r>\d+),\s*(?<g>\d+),\s*(?<b>\d+),\s*[\d.]+\)/u);

      if (match?.groups) {
        const alpha = 0.3 + axis.depthOpacity * 0.4;

        ctx.strokeStyle = `rgba(${match.groups.r}, ${match.groups.g}, ${match.groups.b}, ${alpha})`;
      } else {
        ctx.strokeStyle = baseColor;
      }

      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  private drawSphere_(x: number, y: number, radius: number, color: string, opacity: number, isHovered: boolean) {
    const ctx = this.ctx_!;

    ctx.save();
    ctx.globalAlpha = isHovered ? Math.min(1, opacity + 0.2) : opacity;

    // Radial gradient for 3D lit-sphere look (light from top-left)
    const highlightOffsetX = -radius * 0.3;
    const highlightOffsetY = -radius * 0.3;

    const gradient = ctx.createRadialGradient(
      x + highlightOffsetX, y + highlightOffsetY, radius * 0.1,
      x, y, radius,
    );

    gradient.addColorStop(0, this.lightenColor_(color, 50));
    gradient.addColorStop(0.6, color);
    gradient.addColorStop(1, this.darkenColor_(color, 30));

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Hover highlight ring
    if (isHovered) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawLabel_(x: number, y: number, label: string, opacity: number) {
    const ctx = this.ctx_!;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  // -- Main draw loop --

  private draw_() {
    if (!settingsManager.drawCameraWidget || !this.ctx_) {
      this.canvas_.style.display = 'none';
      this.canvas_.style.pointerEvents = 'none';

      return;
    }
    this.canvas_.style.display = 'block';
    this.canvas_.style.pointerEvents = 'auto';
    this.ctx_.clearRect(0, 0, this.canvas_.width, this.canvas_.height);

    const camera = ServiceLocator.getMainCamera();
    const rotationMatrix = mat4.create();

    mat4.rotateX(rotationMatrix, rotationMatrix, camera.state.camPitch);
    mat4.rotateZ(rotationMatrix, rotationMatrix, -camera.state.camYaw);

    // Project all axes
    const axesWithDepth: AxisProjection[] = [];

    for (const [axisName, axisVector] of Object.entries(this.axes_)) {
      const projectedAxis = vec3.transformMat4(vec3.create(), axisVector, rotationMatrix);

      const screenX = this.center_.x + projectedAxis[0] * this.axisLength_;
      const screenY = this.center_.y - projectedAxis[2] * this.axisLength_;
      const depth = projectedAxis[1];
      const { scale, opacity } = this.computeDepthFactor_(depth);
      const isPositive = !axisName.startsWith('-');

      axesWithDepth.push({
        axisName,
        screenX,
        screenY,
        depth,
        depthScale: scale,
        depthOpacity: opacity,
        isPositive,
        isHovered: this.hoveredAxis_ === axisName,
      });
    }

    // Sort farthest first (back-to-front)
    axesWithDepth.sort((a, b) => b.depth - a.depth);

    // 1. Background circle
    this.drawBackground_();

    // 2. Axis lines (center to positive axis endpoints)
    this.drawAxisLines_(axesWithDepth);

    // 3. Axis spheres (back-to-front)
    for (const axis of axesWithDepth) {
      const baseRadius = axis.isPositive ? this.posSphereRadius_ : this.negSphereRadius_;
      const radius = baseRadius * axis.depthScale + (axis.isHovered ? this.hoverGrowth_ : 0);
      const color = this.colors_[axis.axisName];

      this.drawSphere_(axis.screenX, axis.screenY, radius, color, axis.depthOpacity, axis.isHovered);

      // Labels only on positive axes when front-facing enough
      if (axis.isPositive && axis.depthScale > 0.6) {
        const label = axis.axisName;

        this.drawLabel_(axis.screenX, axis.screenY, label, axis.depthOpacity);
      }
    }
  }
}
