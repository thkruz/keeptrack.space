import { mat4, quat, vec3 } from 'gl-matrix';

/**
 * A followed object whose live ECI position (km) the transition can read each frame.
 * Satellites and missiles satisfy this structurally, so the transition module stays
 * decoupled from the catalog classes.
 */
export interface TransitionAnchor {
  readonly position: { x: number; y: number; z: number };
}

/**
 * Handles smooth blending between camera states during satellite selection changes.
 *
 * Blends the COMPOSED transform (viewMatrix * translate(worldShift)) rather than
 * blending view matrix and worldShift independently. This is correct because:
 * - In satellite-centered modes, worldShift is baked into the view matrix eye position
 * - In earth-centered mode, worldShift is only applied in shaders
 * - Blending the composed transform captures the full visual pipeline consistently
 *
 * Camera positions are interpolated along a spherical arc around the Earth center
 * (slerp direction + lerp distance) to prevent the camera from dipping toward Earth
 * during transitions between widely-separated targets.
 *
 * When the transition starts from a satellite-focused mode, the "from" endpoint is
 * frozen in ECI space but the followed object keeps moving (~7.5 km/s in LEO). Left
 * uncorrected, the blend interpolates from "where the object was" toward its live
 * position while the mesh is drawn where it IS now, so a close/small target visibly
 * shakes for the length of the position blend. Passing a {@link TransitionAnchor} to
 * {@link begin} makes the frozen endpoint travel with its object: each frame the saved
 * camera position is shifted by the anchor's displacement since the transition started.
 *
 * After blending, the current frame's worldShift is "undone" from the composed result
 * to produce the effective view matrix that, combined with the shader's worldShift
 * application, produces the correct blended visual.
 *
 * All buffers are pre-allocated to avoid GC pressure during transitions.
 */
export class CameraTransition {
  /** Position finishes at this fraction of the total duration (rotation uses full duration). */
  private static readonly POSITION_TIME_RATIO_ = 0.6;

  private isActive_ = false;
  private startTime_ = 0;
  private duration_ = 500;

  // Composed "from" state: viewMatrix * translate(worldShift)
  private fromComposed_ = mat4.create();

  // Temp buffer for composing current frame's transform
  private toComposed_ = mat4.create();

  // Decomposition buffers
  private fromRotation_ = quat.create();
  private fromTranslation_ = vec3.create();
  private toRotation_ = quat.create();
  private toTranslation_ = vec3.create();

  // Camera world positions (for spherical arc interpolation)
  private fromCamPos_ = vec3.create();
  private toCamPos_ = vec3.create();
  private blendedCamPos_ = vec3.create();

  // Direction buffers for spherical arc
  private fromDir_ = vec3.create();
  private toDir_ = vec3.create();
  private blendedDir_ = vec3.create();

  // Blending output buffers
  private blendedRotation_ = quat.create();
  private blendedTranslation_ = vec3.create();
  private blendedComposed_ = mat4.create();
  private effectiveViewMatrix_ = mat4.create();

  // Temp 3x3 rotation matrices for quat.fromMat3
  private rotMat3From_ = new Float32Array(9);
  private rotMat3To_ = new Float32Array(9);

  // Temp vec3 for worldShift translation
  private wsVec3_ = vec3.create();

  // Temp quat for conjugate operations
  private tempQuat_ = quat.create();

  // Followed object for the "from" endpoint (satellite-focused starts), so the frozen
  // camera position travels with its object instead of lagging behind a moving target.
  private fromAnchor_: TransitionAnchor | null = null;
  private hasFromAnchor_ = false;

  // Target-centered look-at blend buffers. When both endpoints follow a real object, the blend
  // runs in the worldShift-ed frame (object near the origin, small coordinates) and interpolates
  // the camera's offset FROM the object rather than its absolute ECI position. This keeps the
  // object pinned to screen center and avoids the float32 precision loss of subtracting two
  // ~7000 km ECI vectors to recover a metres-scale standoff (the residual jitter otherwise).
  // The "from" offset/up are captured at begin() (the outgoing orientation is frozen).
  private readonly fromOffset_ = vec3.create(); // camera position relative to the old target
  private readonly fromUp_ = vec3.create();
  private readonly toOffset_ = vec3.create();
  private readonly toUp_ = vec3.create();
  private readonly blendedOffset_ = vec3.create();
  private readonly blendedUp_ = vec3.create();
  private readonly tgtShiftedFrom_ = vec3.create();
  private readonly tgtShiftedTo_ = vec3.create();
  private readonly tgtShiftedBlend_ = vec3.create();
  private readonly eyeShifted_ = vec3.create();
  private readonly lookFwd_ = vec3.create();
  private readonly lookRight_ = vec3.create();
  private readonly lookUp_ = vec3.create();

  get isActive(): boolean {
    return this.isActive_;
  }

  get duration(): number {
    return this.duration_;
  }

  set duration(ms: number) {
    this.duration_ = Math.max(100, Math.min(2000, ms));
  }

  /**
   * Start a new transition from the current visual state.
   * Saves the composed transform: viewMatrix * translate(worldShift).
   * If a transition is already active, the current blended state
   * (already written to matrixWorldInverse by draw()) becomes the new start.
   */
  begin(currentViewMatrix: mat4, currentWorldShift: number[], fromAnchor?: TransitionAnchor | null): void {
    // Compose: viewMatrix * translate(worldShift)
    mat4.copy(this.fromComposed_, currentViewMatrix);
    vec3.set(this.wsVec3_, currentWorldShift[0], currentWorldShift[1], currentWorldShift[2]);
    mat4.translate(this.fromComposed_, this.fromComposed_, this.wsVec3_);

    // Track the followed object so the blend can stay centered on it. Capture the outgoing
    // camera offset (relative to the old target, in the shifted frame) and up vector; these are
    // frozen for the "from" endpoint. Skip for a decayed/absent object (fixed-endpoint fallback).
    const pos = fromAnchor?.position;

    if (pos && (pos.x !== 0 || pos.y !== 0 || pos.z !== 0)) {
      this.fromAnchor_ = fromAnchor;

      // Camera position in the begin() shifted frame, minus the old target's shifted position,
      // gives the (small) offset of the camera from the object.
      this.extractEyeFromView_(currentViewMatrix, this.fromOffset_);
      this.fromOffset_[0] -= pos.x + currentWorldShift[0];
      this.fromOffset_[1] -= pos.y + currentWorldShift[1];
      this.fromOffset_[2] -= pos.z + currentWorldShift[2];

      // Up basis = row 2 of the view matrix (worldShift is a pure translation, so up is the
      // same in the shifted and ECI frames).
      vec3.set(this.fromUp_, currentViewMatrix[2], currentViewMatrix[6], currentViewMatrix[10]);
      this.hasFromAnchor_ = true;
    } else {
      this.fromAnchor_ = null;
      this.hasFromAnchor_ = false;
    }

    this.startTime_ = performance.now();
    this.isActive_ = true;
  }

  /** Immediately end the transition. The current (new) values are used as-is. */
  cancel(): void {
    this.isActive_ = false;
    this.fromAnchor_ = null;
    this.hasFromAnchor_ = false;
  }

  /**
   * Compute the effective view matrix for the current frame by blending
   * the saved composed transform toward the current composed transform,
   * then undoing the current worldShift.
   *
   * Camera positions are interpolated along a spherical arc around the origin
   * (great-circle path for direction, linear for distance) to prevent the camera
   * from dipping toward Earth during transitions.
   *
   * Returns the effective view matrix, or null when the transition is complete/inactive.
   * Does NOT modify worldShift — let it stay at whatever the pipeline set.
   *
   * When both the "from" anchor (see {@link begin}) and a live `toAnchor` are supplied, the
   * blend keeps the focused object centered: it interpolates the camera position but derives
   * orientation by looking at the interpolated target each frame. Without this, orientation is
   * slerped independently of position, so a large orientation change (e.g. ECI <-> LVLH on the
   * same satellite) swings the target off-screen mid-blend — the mode-switch shake, worst at the
   * tiny standoff used for small/close debris. Falls back to the rotation-slerp blend when either
   * endpoint is not a focused target (e.g. Earth-centered starts/ends).
   */
  apply(currentViewMatrix: mat4, currentWorldShift: number[], toAnchor?: TransitionAnchor | null): mat4 | null {
    if (!this.isActive_) {
      return null;
    }

    const elapsed = performance.now() - this.startTime_;
    const rawT = Math.min(elapsed / this.duration_, 1);

    if (rawT >= 1) {
      this.isActive_ = false;
      this.fromAnchor_ = null;
      this.hasFromAnchor_ = false;

      return null;
    }

    // Position completes at 60% of the total duration, rotation uses the full duration.
    // This makes the camera arrive at its destination first, then finish rotating.
    const posRawT = Math.min(rawT / CameraTransition.POSITION_TIME_RATIO_, 1);

    // Hermite smoothstep: zero derivative at both endpoints
    const tRot = rawT * rawT * (3 - 2 * rawT);
    const tPos = posRawT * posRawT * (3 - 2 * posRawT);

    // Target-centered blend first: when both endpoints follow a real object, keep it centered.
    const toPos = toAnchor?.position;

    if (this.hasFromAnchor_ && this.fromAnchor_ && toPos && (toPos.x !== 0 || toPos.y !== 0 || toPos.z !== 0)) {
      const eff = this.applyTargetCentered_(currentViewMatrix, currentWorldShift, toPos, tPos, tRot);

      if (eff) {
        return eff;
      }
    }

    // Fallback: blend the composed ECI transforms with an independent rotation slerp. Used for
    // Earth-centered starts/ends (no focused target to keep centered) and degenerate look-at cases.
    mat4.copy(this.toComposed_, currentViewMatrix);
    vec3.set(this.wsVec3_, currentWorldShift[0], currentWorldShift[1], currentWorldShift[2]);
    mat4.translate(this.toComposed_, this.toComposed_, this.wsVec3_);

    this.decomposeViewMatrix_(this.fromComposed_, this.rotMat3From_, this.fromRotation_, this.fromTranslation_);
    this.decomposeViewMatrix_(this.toComposed_, this.rotMat3To_, this.toRotation_, this.toTranslation_);

    quat.slerp(this.blendedRotation_, this.fromRotation_, this.toRotation_, tRot);

    this.extractCameraWorldPos_(this.fromRotation_, this.fromTranslation_, this.fromCamPos_);
    this.extractCameraWorldPos_(this.toRotation_, this.toTranslation_, this.toCamPos_);

    this.sphericalArcLerp_(this.fromCamPos_, this.toCamPos_, tPos, this.blendedCamPos_);

    this.computeViewTranslation_(this.blendedRotation_, this.blendedCamPos_, this.blendedTranslation_);
    mat4.fromQuat(this.blendedComposed_, this.blendedRotation_);
    this.blendedComposed_[12] = this.blendedTranslation_[0];
    this.blendedComposed_[13] = this.blendedTranslation_[1];
    this.blendedComposed_[14] = this.blendedTranslation_[2];

    // Undo current worldShift: effectiveView = blendedComposed * translate(-currentWS)
    vec3.set(this.wsVec3_, -currentWorldShift[0], -currentWorldShift[1], -currentWorldShift[2]);
    mat4.translate(this.effectiveViewMatrix_, this.blendedComposed_, this.wsVec3_);

    return this.effectiveViewMatrix_;
  }

  /**
   * Target-centered blend, computed entirely in the current worldShift-ed frame (object near the
   * origin) so coordinates stay small and the object projects to a stable centre. Interpolates the
   * camera's offset FROM the object and the object's shifted position separately, then orients the
   * camera down the (negated) offset so it looks straight at the object every frame.
   *
   * Returns the effective view matrix (already in the shifted frame the shaders draw in, so no
   * worldShift undo is needed), or null for a degenerate configuration (camera on the object, or a
   * forward/up that can't form a basis) so the caller can fall back to the rotation-slerp blend.
   */
  private applyTargetCentered_(currentViewMatrix: mat4, currentWorldShift: number[], toPos: { x: number; y: number; z: number }, tPos: number, tRot: number): mat4 | null {
    // "To" camera offset = its shifted eye minus the object's shifted position (both small).
    this.extractEyeFromView_(currentViewMatrix, this.toOffset_);
    this.tgtShiftedTo_[0] = toPos.x + currentWorldShift[0];
    this.tgtShiftedTo_[1] = toPos.y + currentWorldShift[1];
    this.tgtShiftedTo_[2] = toPos.z + currentWorldShift[2];
    vec3.subtract(this.toOffset_, this.toOffset_, this.tgtShiftedTo_);
    vec3.set(this.toUp_, currentViewMatrix[2], currentViewMatrix[6], currentViewMatrix[10]);

    // Old target's position in the CURRENT shifted frame (equals tgtShiftedTo_ for a same-object
    // switch such as ECI <-> LVLH; differs for a primary <-> secondary switch, giving a sweep).
    const fromPos = this.fromAnchor_!.position;

    this.tgtShiftedFrom_[0] = fromPos.x + currentWorldShift[0];
    this.tgtShiftedFrom_[1] = fromPos.y + currentWorldShift[1];
    this.tgtShiftedFrom_[2] = fromPos.z + currentWorldShift[2];

    // Blend target position (position timeline) and camera offset (arc, so the standoff distance
    // is preserved as the camera swings around the object rather than dipping toward it).
    vec3.lerp(this.tgtShiftedBlend_, this.tgtShiftedFrom_, this.tgtShiftedTo_, tPos);
    this.sphericalArcLerp_(this.fromOffset_, this.toOffset_, tPos, this.blendedOffset_);
    vec3.add(this.eyeShifted_, this.tgtShiftedBlend_, this.blendedOffset_);

    // Look straight at the object: forward = -normalize(offset). Precise because the offset is a
    // small vector, not the difference of two ~7000 km positions.
    if (vec3.length(this.blendedOffset_) < 1e-9) {
      return null;
    }
    vec3.negate(this.lookFwd_, this.blendedOffset_);
    vec3.normalize(this.lookFwd_, this.lookFwd_);

    vec3.lerp(this.blendedUp_, this.fromUp_, this.toUp_, tRot);
    if (vec3.length(this.blendedUp_) < 1e-9) {
      return null;
    }

    vec3.cross(this.lookRight_, this.lookFwd_, this.blendedUp_);
    if (vec3.length(this.lookRight_) < 1e-9) {
      return null;
    }
    vec3.normalize(this.lookRight_, this.lookRight_);
    vec3.cross(this.lookUp_, this.lookRight_, this.lookFwd_);
    vec3.normalize(this.lookUp_, this.lookUp_);

    this.writeViewMatrix_(this.lookRight_, this.lookFwd_, this.lookUp_, this.eyeShifted_, this.effectiveViewMatrix_);

    return this.effectiveViewMatrix_;
  }

  /**
   * Camera position (eye) in a view matrix's own input space: p = -R^T * t, expanded inline so it
   * works on a plain mat4 (rows right/forward/up, translation in column 3).
   */
  private extractEyeFromView_(m: mat4, out: vec3): void {
    const tx = m[12];
    const ty = m[13];
    const tz = m[14];

    out[0] = -(m[0] * tx + m[1] * ty + m[2] * tz);
    out[1] = -(m[4] * tx + m[5] * ty + m[6] * tz);
    out[2] = -(m[8] * tx + m[9] * ty + m[10] * tz);
  }

  /**
   * Write an app-convention view matrix (rows: right, forward, up; translation = -basis . eye).
   */
  private writeViewMatrix_(right: vec3, forward: vec3, up: vec3, eye: vec3, out: mat4): void {
    out[0] = right[0];
    out[1] = forward[0];
    out[2] = up[0];
    out[3] = 0;
    out[4] = right[1];
    out[5] = forward[1];
    out[6] = up[1];
    out[7] = 0;
    out[8] = right[2];
    out[9] = forward[2];
    out[10] = up[2];
    out[11] = 0;
    out[12] = -(right[0] * eye[0] + right[1] * eye[1] + right[2] * eye[2]);
    out[13] = -(forward[0] * eye[0] + forward[1] * eye[1] + forward[2] * eye[2]);
    out[14] = -(up[0] * eye[0] + up[1] * eye[1] + up[2] * eye[2]);
    out[15] = 1;
  }

  /**
   * Extract camera world position from rotation quat and translation vec3.
   * For a view matrix V = [R | t], camera world pos p = -R^T * t.
   */
  private extractCameraWorldPos_(rotation: quat, translation: vec3, out: vec3): void {
    // out = -t
    vec3.set(out, -translation[0], -translation[1], -translation[2]);
    // Apply inverse rotation: R^T * (-t) = conjugate(q) applied to (-t)
    quat.conjugate(this.tempQuat_, rotation);
    vec3.transformQuat(out, out, this.tempQuat_);
  }

  /**
   * Compute view matrix translation from rotation quat and camera world position.
   * t = -R * p, which is q applied to (-p).
   */
  private computeViewTranslation_(rotation: quat, camPos: vec3, out: vec3): void {
    vec3.set(out, -camPos[0], -camPos[1], -camPos[2]);
    vec3.transformQuat(out, out, rotation);
  }

  /**
   * Interpolate between two 3D positions along a spherical arc around the origin.
   * Direction is slerped (great-circle arc), distance is linearly interpolated.
   * Falls back to linear lerp when positions are near the origin or nearly parallel.
   */
  private sphericalArcLerp_(from: vec3, to: vec3, t: number, out: vec3): void {
    const distFrom = vec3.length(from);
    const distTo = vec3.length(to);

    // Fall back to linear lerp if either position is at the origin
    if (distFrom < 1e-6 || distTo < 1e-6) {
      vec3.lerp(out, from, to, t);

      return;
    }

    // Normalize directions
    vec3.scale(this.fromDir_, from, 1 / distFrom);
    vec3.scale(this.toDir_, to, 1 / distTo);

    // Slerp direction on great circle
    const cosOmega = Math.max(-1, Math.min(1, vec3.dot(this.fromDir_, this.toDir_)));

    if (cosOmega > 0.9999) {
      // Nearly parallel — linear lerp is fine
      vec3.lerp(out, from, to, t);

      return;
    }

    const omega = Math.acos(cosOmega);
    const sinOmega = Math.sin(omega);
    const sa = Math.sin((1 - t) * omega) / sinOmega;
    const sb = Math.sin(t * omega) / sinOmega;

    this.blendedDir_[0] = sa * this.fromDir_[0] + sb * this.toDir_[0];
    this.blendedDir_[1] = sa * this.fromDir_[1] + sb * this.toDir_[1];
    this.blendedDir_[2] = sa * this.fromDir_[2] + sb * this.toDir_[2];

    // Lerp distance
    const dist = distFrom + (distTo - distFrom) * t;

    // Scale direction by distance
    vec3.scale(out, this.blendedDir_, dist);
  }

  /**
   * Extract rotation quaternion and translation from an orthonormal view matrix.
   * Column-major 4x4 → column-major 3x3 extraction for the rotation part.
   */
  private decomposeViewMatrix_(m: mat4, rotMat3: Float32Array, outRotation: quat, outTranslation: vec3): void {
    outTranslation[0] = m[12];
    outTranslation[1] = m[13];
    outTranslation[2] = m[14];

    // Extract upper-left 3x3 (column-major)
    rotMat3[0] = m[0];
    rotMat3[1] = m[1];
    rotMat3[2] = m[2];
    rotMat3[3] = m[4];
    rotMat3[4] = m[5];
    rotMat3[5] = m[6];
    rotMat3[6] = m[8];
    rotMat3[7] = m[9];
    rotMat3[8] = m[10];

    quat.fromMat3(outRotation, rotMat3);
    quat.normalize(outRotation, outRotation);
  }
}
