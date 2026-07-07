import { Camera, CameraViewportRect } from '../camera/camera';

export enum ViewportLayout {
  SINGLE = 'single',
  SPLIT_HORIZONTAL = 'split-h',
  PIP = 'pip',
}

/**
 * Screen regions occluded by chrome UI (canvas px). The multi-view layout is
 * computed inside the remaining usable area so panes are not hidden behind the
 * drawer rail or the sat-info-box.
 */
export interface LayoutInsets {
  left: number;
  right: number;
  bottom: number;
  top: number;
}

export class Viewport {
  readonly id: string;
  readonly camera: Camera;
  /** Resolved rect in canvas px (y from bottom, GL convention). */
  rect: CameraViewportRect = { x: 0, y: 0, width: 1, height: 1 };
  isVisible = true;

  constructor(id: string, camera: Camera) {
    this.id = id;
    this.camera = camera;
  }
}
