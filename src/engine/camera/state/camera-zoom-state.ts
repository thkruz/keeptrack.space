import { Kilometers } from 'ootk';

export class CameraZoomState {
  private zoomLevel_ = 0.6925;
  /** Percentage of the distance to maxZoomDistance from the minZoomDistance */
  private zoomTarget_ = 0.6925;
  camDistBuffer: Kilometers = 0 as Kilometers;
  earthCenteredLastZoom = 0.6925;
  isZoomIn = false;
  camZoomSnappedOnSat = false;

  get zoomLevel(): number {
    return this.zoomLevel_;
  }

  set zoomLevel(val: number) {
    this.zoomLevel_ = Math.max(0.0001, Math.min(1, val));
  }

  get zoomTarget(): number {
    return this.zoomTarget_;
  }

  set zoomTarget(val: number) {
    this.zoomTarget_ = Math.max(0.01, Math.min(1, val));
  }

  reset(isHardReset: boolean): void {
    if (isHardReset) {
      this.zoomLevel_ = 0.6925;
    }
    this.zoomTarget_ = 0.6925;
    this.isZoomIn = false;
    this.camZoomSnappedOnSat = false;
    this.camDistBuffer = 0 as Kilometers;
  }
}
