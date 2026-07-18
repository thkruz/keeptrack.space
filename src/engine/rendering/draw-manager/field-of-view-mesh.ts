/* eslint-disable camelcase */
import { Degrees, FieldOfView, Kilometers, Radians, rae2eci } from '@ootk/src/main';

import { SensorFovMesh } from './sensor-fov-mesh';

const RAD2DEG = 180 / Math.PI;
const TAU = 2 * Math.PI;

/**
 * Renders a sensor volume directly from an ootk boresight-centric FieldOfView
 * (elliptical cone) instead of the legacy min/max az/el box.
 *
 * All geometry is generated from direction vectors sampled in the boresight
 * frame, so FOVs that cross zenith (e.g., Space Fence's 2°-wide fan running
 * from 10° elevation through zenith to 10° elevation on the opposite azimuth)
 * render as a smooth volume with no azimuth-flip seams.
 *
 * The volume is closed by three surfaces:
 * 1. Outer spherical cap at maxRange
 * 2. Inner spherical cap at minRange
 * 3. Side wall along the cone boundary between the two caps
 *
 * This is the rendering primitive for attachable sensors: it only consumes the
 * parent's position (via rae2eci) and a FieldOfView, so it can later serve
 * body-frame sensors hosted on satellites once ootk supports them.
 */
export class FieldOfViewMesh extends SensorFovMesh {
  /** Segments along the parametric ellipse angle (the long way around the fan) */
  private readonly tSegments_ = 128;
  /** Segments from boresight to boundary on the spherical caps */
  private readonly radialSegments_ = 16;
  /** Segments from minRange to maxRange on the side wall */
  private readonly rangeSegments_ = 8;

  override initGeometry_(): void {
    // Multi-face sensors (crossed fences like LeoLabs CRSR) render every face
    const fovs = this.sensor.getFaceFovs() ?? [];

    if (fovs.length === 0) {
      // No explicit FOV available - fall back to the legacy box geometry
      super.initGeometry_();

      return;
    }

    for (const fov of fovs) {
      // 1. Outer spherical cap at maxRange
      this.addCapSurface_(fov, fov.maxRange, false);

      // 2. Inner spherical cap at minRange
      this.addCapSurface_(fov, fov.minRange, true);

      // 3. Side wall along the cone boundary
      this.addWallSurface_(fov);
    }

    this.vertices_ = new Float32Array(this.verticesTmp_);
    this.indices_ = new Uint16Array(this.indicesTmp_);
    /*
     * Explicit-FOV sensors have no meaningful "bottom sheet" (that concept is
     * tied to the legacy min-elevation box), so the surveillance-fence view
     * draws the full volume.
     */
    this.indiciesBottom_ = new Uint16Array(this.indicesTmp_);
  }

  /**
   * Adds a spherical cap surface at a fixed range: a grid over the parametric
   * ellipse angle t and the radial fraction from boresight (0) to boundary (1).
   * The innermost ring collapses onto the boresight, closing the cap.
   */
  private addCapSurface_(fov: FieldOfView, rng: Kilometers, reverse: boolean): void {
    const startIndex = this.vertexCount_;

    for (let i = 0; i <= this.tSegments_; i++) {
      const t = ((i / this.tSegments_) * TAU) as Radians;

      for (let j = 0; j <= this.radialSegments_; j++) {
        this.pushDirectionVertex_(fov, t, j / this.radialSegments_, rng);
      }
    }

    this.addGridIndices_(startIndex, this.tSegments_, this.radialSegments_, reverse);
  }

  /**
   * Adds the side wall: a grid over the parametric ellipse angle t (at the
   * cone boundary) and range from minRange to maxRange.
   */
  private addWallSurface_(fov: FieldOfView): void {
    const startIndex = this.vertexCount_;
    const rangeSpan = fov.maxRange - fov.minRange;

    for (let i = 0; i <= this.tSegments_; i++) {
      const t = ((i / this.tSegments_) * TAU) as Radians;

      for (let j = 0; j <= this.rangeSegments_; j++) {
        const rng = (fov.minRange + (j / this.rangeSegments_) * rangeSpan) as Kilometers;

        this.pushDirectionVertex_(fov, t, 1, rng);
      }
    }

    this.addGridIndices_(startIndex, this.tSegments_, this.rangeSegments_, false);
  }

  /**
   * Samples the FOV direction at (t, radialFraction), converts it to az/el
   * (clamped to the FOV's minimum elevation), and pushes the ECI vertex at the
   * given range.
   */
  private pushDirectionVertex_(fov: FieldOfView, t: Radians, radialFraction: number, rng: Kilometers): void {
    const dir = fov.directionAt(t, radialFraction);

    let az = Math.atan2(dir.x, dir.y) * RAD2DEG;

    if (az < 0) {
      az += 360;
    }

    const elRaw = Math.asin(Math.max(-1, Math.min(1, dir.z))) * RAD2DEG;
    const el = Math.max(elRaw, fov.minElevation);

    const eci = rae2eci({ az: az as Degrees, el: el as Degrees, rng }, this.sensor, 0);

    this.verticesTmp_.push(eci.x, eci.y, eci.z);
    this.vertexCount_++;
  }

  /**
   * Emits triangle indices for a (rows x cols) quad grid whose vertices were
   * pushed row-major with (cols + 1) vertices per row.
   */
  private addGridIndices_(startIndex: number, rows: number, cols: number, reverse: boolean): void {
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = startIndex + i * (cols + 1) + j;
        const b = a + cols + 1;

        if (reverse) {
          this.indicesTmp_.push(a, a + 1, b, b, a + 1, b + 1);
        } else {
          this.indicesTmp_.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
  }
}
