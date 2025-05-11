import { mat4, quat, vec3 } from 'gl-matrix';
import { SceneNode } from '../scene/scene-node';

export class Transform {
  // Local transform properties
  private readonly _position: vec3 = vec3.create();
  private readonly _rotation: quat = quat.create();
  private readonly _scale: vec3 = vec3.fromValues(1, 1, 1);

  // Cached matrices
  private readonly _localMatrix: mat4 = mat4.create();
  private readonly _worldMatrix: mat4 = mat4.create();

  // Cached world transform properties
  private readonly _worldPosition: vec3 = vec3.create();
  private readonly _worldRotation: quat = quat.create();
  private readonly _worldScale: vec3 = vec3.create();

  // Flags for matrix recalculation
  private _localMatrixNeedsUpdate: boolean = true;
  private _worldMatrixNeedsUpdate: boolean = true;
  node_: SceneNode | null;

  constructor(node: SceneNode | null = null) {
    // Initialize to identity
    quat.identity(this._rotation);
    this.node_ = node;
  }

  // Position
  get position(): vec3 {
    return vec3.clone(this._position);
  }

  set position(value: vec3) {
    vec3.copy(this._position, value);
    this._localMatrixNeedsUpdate = true;
    this._worldMatrixNeedsUpdate = true;
  }

  getPosition(): vec3 {
    return vec3.clone(this._position);
  }

  setPosition(position: vec3): void {
    vec3.copy(this._position, position);
    this._localMatrixNeedsUpdate = true;
    this._worldMatrixNeedsUpdate = true;
  }

  // Rotation
  get rotation(): quat {
    return quat.clone(this._rotation);
  }

  set rotation(value: quat) {
    this.setRotation(value);
  }

  getRotation(): quat {
    return quat.clone(this._rotation);
  }

  setRotationFromEuler(x: number, y: number, z: number): void {
    quat.fromEuler(this._rotation, x, y, z);
    this._localMatrixNeedsUpdate = true;
    this._worldMatrixNeedsUpdate = true;
  }

  setRotation(value: quat): void {
    quat.copy(this._rotation, value);
    this._localMatrixNeedsUpdate = true;
    this._worldMatrixNeedsUpdate = true;
  }

  // Scale
  get scale(): vec3 {
    return vec3.clone(this._scale);
  }

  set scale(value: vec3) {
    vec3.copy(this._scale, value);
    this._localMatrixNeedsUpdate = true;
    this._worldMatrixNeedsUpdate = true;
  }

  setScale(x: number, y: number, z: number): void {
    vec3.set(this._scale, x, y, z);
    this._localMatrixNeedsUpdate = true;
    this._worldMatrixNeedsUpdate = true;
  }

  /**
   * Retrieves the local transformation matrix of the object.
   * If the local matrix is marked as needing an update, it triggers
   * the update process before returning the matrix.
   *
   * @returns {mat4} The local transformation matrix.
   */
  get localMatrix(): mat4 {
    if (this._localMatrixNeedsUpdate) {
      this.updateLocalMatrix();
    }

    return this._localMatrix;
  }

  private updateLocalMatrix(): void {
    mat4.fromRotationTranslationScale(
      this._localMatrix,
      this._rotation,
      this._position,
      this._scale,
    );
    this._localMatrixNeedsUpdate = false;
  }

  /**
   * Retrieves the world transformation matrix of the current object.
   * If the matrix needs to be updated, it calculates the world matrix
   * by copying the parent's world matrix (if available) or the local matrix.
   * The method also decomposes the world matrix to extract position, rotation,
   * and scale components.
   *
   * TODO:
   * This appears to be synonymous with the modelView matrix when orbiting 0,0,0.
   * It is unclear how the viewMatrix comes into play when not orbiting 0,0,0.
   *
   * @returns {mat4} The 4x4 world transformation matrix.
   */
  get worldMatrix(): mat4 {
    if (this._worldMatrixNeedsUpdate) {
      mat4.copy(this._worldMatrix, this.node_?.parent?.transform?.worldMatrix ?? this.localMatrix);
      this._worldMatrixNeedsUpdate = false;

      // Extract world position, rotation, and scale
      this.decomposeWorldMatrix();
    }

    return this._worldMatrix;
  }

  validateWorldMatrix(): void {
    if (this._worldMatrixNeedsUpdate) {
      this.updateWorldMatrix();
    }
  }

  // Update world matrix based on parent (called by SceneNode)
  updateWorldMatrix(parentWorldMatrix?: mat4): void {
    if (this._localMatrixNeedsUpdate) {
      this.updateLocalMatrix();
    }

    if (parentWorldMatrix) {
      mat4.multiply(this._worldMatrix, parentWorldMatrix, this._localMatrix);
    } else {
      mat4.copy(this._worldMatrix, this._localMatrix);
    }

    this._worldMatrixNeedsUpdate = false;
    this.decomposeWorldMatrix();

    // Notify children to update their world matrices
    if (this.node_?.children) {
      for (const child of this.node_.children) {
        child.transform.updateWorldMatrix(this._worldMatrix);
      }
    }
  }

  private decomposeWorldMatrix(): void {
    // Extract position, rotation, and scale from world matrix
    mat4.getTranslation(this._worldPosition, this._worldMatrix);
    mat4.getRotation(this._worldRotation, this._worldMatrix);

    // Extract scale (this is an approximation)
    const sx = vec3.length(vec3.fromValues(
      this._worldMatrix[0], this._worldMatrix[1], this._worldMatrix[2],
    ));
    const sy = vec3.length(vec3.fromValues(
      this._worldMatrix[4], this._worldMatrix[5], this._worldMatrix[6],
    ));
    const sz = vec3.length(vec3.fromValues(
      this._worldMatrix[8], this._worldMatrix[9], this._worldMatrix[10],
    ));

    vec3.set(this._worldScale, sx, sy, sz);
  }

  get worldPosition(): vec3 {
    return vec3.clone(this._worldPosition);
  }

  get worldRotation(): quat {
    return quat.clone(this._worldRotation);
  }

  get worldScale(): vec3 {
    return vec3.clone(this._worldScale);
  }

  // Utility methods for common operations

  lookAt(target: vec3, up: vec3 = vec3.fromValues(0, 1, 0)): void {
    const matrix = mat4.create();

    mat4.targetTo(matrix, this._position, target, up);

    // Extract rotation from the matrix
    mat4.getRotation(this._rotation, matrix);

    this._localMatrixNeedsUpdate = true;
    this._worldMatrixNeedsUpdate = true;
  }

  translate(offset: vec3): void {
    vec3.add(this._position, this._position, offset);
    this._localMatrixNeedsUpdate = true;
    this._worldMatrixNeedsUpdate = true;
  }

  rotate(axis: vec3, angle: number): void {
    const rotation = quat.create();

    quat.setAxisAngle(rotation, axis, angle);
    quat.multiply(this._rotation, this._rotation, rotation);
    quat.normalize(this._rotation, this._rotation);

    this._localMatrixNeedsUpdate = true;
    this._worldMatrixNeedsUpdate = true;
  }

  // Copy transform properties from another transform
  copy(source: Transform): this {
    vec3.copy(this._position, source._position);
    quat.copy(this._rotation, source._rotation);
    vec3.copy(this._scale, source._scale);

    this._localMatrixNeedsUpdate = true;
    this._worldMatrixNeedsUpdate = true;

    return this;
  }

  // Create a new transform with the same properties
  clone(): Transform {
    const transform = new Transform();


    return transform.copy(this);
  }

  // Reset transform to default values
  identity(): void {
    vec3.set(this._position, 0, 0, 0);
    quat.identity(this._rotation);
    vec3.set(this._scale, 1, 1, 1);

    this._localMatrixNeedsUpdate = true;
    this._worldMatrixNeedsUpdate = true;
  }
}
