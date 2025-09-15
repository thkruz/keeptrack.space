import { vec3 } from 'gl-matrix';
import { BufferAttribute } from './buffer-attribute';
import { BufferGeometry, GeometryParams } from './buffer-geometry';

interface SphereGeometryParams extends GeometryParams {
  radius: number;
  widthSegments: number;
  heightSegments: number;
  isSkipTexture?: boolean;
  phiStart?: number;
  phiLength?: number;
  thetaStart?: number;
  thetaLength?: number;
}

export class SphereGeometry extends BufferGeometry {
  /**
   * Sphere radius. Expects a `Float`. Default `1`
   */
  radius: number;
  /**
   * widthSegments Number of horizontal segments. Minimum value is 3, and the Expects a `Integer`. Default `32`
   */
  widthSegments: number;
  /**
   * heightSegments Number of vertical segments. Minimum value is 2, and the Expects a `Integer`. Default `16`
   */
  heightSegments: number;
  /**
   * Some objects don't need texture mapping
   */
  isSkipTexture: boolean;
  /**
   * phiStart Specify horizontal starting angle. Expects a `Float`. Default `0`
   */
  phiStart: number;
  /**
   * phiLength Specify horizontal sweep angle size. Expects a `Float`. Default `Math.PI * 2`
   */
  phiLength: number;
  /**
   * thetaStart Specify vertical starting angle. Expects a `Float`. Default `0`
   */
  thetaStart: number;
  /**
   * thetaLength Specify vertical sweep angle size. Expects a `Float`. Default `Math.PI`
   */
  thetaLength: number;

  // Add these properties for sorting
  private vertices_: Float32Array;
  private indices_: Uint16Array | Uint32Array;
  private sortedIndices: number[] = [];
  private readonly NUM_BUCKETS = 16; // Adjust for performance vs quality

  /**
   * Create a new instance of {@link SphereGeometry}
   * @remarks
   * The geometry is created by sweeping and calculating vertexes
   * around the **Y** axis (horizontal sweep) and the **Z** axis (vertical sweep)
   * Thus, incomplete spheres (akin to `'sphere slices'`) can be created
   * through the use of different values of {@link phiStart}, {@link phiLength}, {@link thetaStart} and {@link thetaLength},
   * in order to define the points in which we start (or end) calculating those vertices.
   * @param radius Sphere radius. Expects a `Float`. Default `1`
   * @param widthSegments Number of horizontal segments. Minimum value is 3, and the Expects a `Integer`. Default `32`
   * @param heightSegments Number of vertical segments. Minimum value is 2, and the Expects a `Integer`. Default `16`
   * @param phiStart Specify horizontal starting angle. Expects a `Float`. Default `0`
   * @param phiLength Specify horizontal sweep angle size. Expects a `Float`. Default `Math.PI * 2`
   * @param thetaStart Specify vertical starting angle. Expects a `Float`. Default `0`
   * @param thetaLength Specify vertical sweep angle size. Expects a `Float`. Default `Math.PI`
   */
  constructor(
    gl: WebGL2RenderingContext,
    {
      radius,
      widthSegments,
      heightSegments,
      attributes = {},
      isSkipTexture = false,
      phiStart = 0,
      phiLength = Math.PI * 2,
      thetaStart = 0,
      thetaLength = Math.PI,
    }: SphereGeometryParams,
  ) {
    super({
      type: 'SphereGeometry',
      attributes: {
        ...{
          position: new BufferAttribute({
            location: 0,
            vertices: 3,
            stride: Float32Array.BYTES_PER_ELEMENT * 8,
            offset: 0,
          }),
          normal: new BufferAttribute({
            location: 1,
            vertices: 3,
            stride: Float32Array.BYTES_PER_ELEMENT * 8,
            offset: Float32Array.BYTES_PER_ELEMENT * 3,
          }),
          uv: new BufferAttribute({
            location: 2,
            vertices: 2,
            stride: Float32Array.BYTES_PER_ELEMENT * 8,
            offset: Float32Array.BYTES_PER_ELEMENT * 6,
          }),
          ...attributes,
        },
      },
    });
    this.gl = gl;
    this.radius = radius;
    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;
    this.isSkipTexture = isSkipTexture;
    this.phiStart = phiStart;
    this.phiLength = phiLength;
    this.thetaStart = thetaStart;
    this.thetaLength = thetaLength;

    this.calculateCombinedArray(isSkipTexture);
    this.calculateVertIndicies_();
  }

  /**
   * Generate a uvsphere bottom up, CCW order
   */
  private calculateCombinedArray(isSkipTexture: boolean) {
    const combinedArray = [] as number[];

    for (let heightSegment = 0; heightSegment <= this.heightSegments; heightSegment++) {
      const theta = this.thetaStart + ((this.thetaStart + this.thetaLength) / this.heightSegments) * heightSegment - Math.PI / 2;

      if (theta > this.thetaStart + this.thetaLength) {
        continue;
      }

      const diskRadius = Math.cos(Math.abs(theta));
      const z = Math.sin(theta);

      for (let widthSegment = 0; widthSegment <= this.widthSegments; widthSegment++) {
        const phi = this.phiStart + ((this.phiStart + this.phiLength) / this.widthSegments) * widthSegment;

        if (phi > this.phiStart + this.phiLength) {
          continue;
        }

        const x = Math.cos(phi) * diskRadius;
        const y = Math.sin(phi) * diskRadius;
        const v = 1 - heightSegment / this.heightSegments;
        const u = 0.5 + widthSegment / this.widthSegments;

        combinedArray.push(x * this.radius);
        combinedArray.push(y * this.radius);
        combinedArray.push(z * this.radius);
        combinedArray.push(x);
        combinedArray.push(y);
        combinedArray.push(z);

        if (!isSkipTexture) {
          combinedArray.push(u);
          combinedArray.push(v);
        }
      }
    }

    // Store vertices for sorting - extract positions from combined array
    const stride = isSkipTexture ? 6 : 8;
    const vertexCount = combinedArray.length / stride;

    this.vertices_ = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      this.vertices_[i * 3] = combinedArray[i * stride];
      this.vertices_[i * 3 + 1] = combinedArray[i * stride + 1];
      this.vertices_[i * 3 + 2] = combinedArray[i * stride + 2];
    }

    this.setCombinedBuffer(this.gl, combinedArray);
  }

  /**
   * Calculate the vertex draw order for the sphere
   */
  private calculateVertIndicies_() {
    const index = [] as number[];

    for (let heightSegment = 0; heightSegment < this.heightSegments; heightSegment++) {
      for (let widthSegment = 0; widthSegment < this.widthSegments; widthSegment++) {
        const blVert = heightSegment * (this.widthSegments + 1) + widthSegment;
        const brVert = blVert + 1;
        const tlVert = (heightSegment + 1) * (this.widthSegments + 1) + widthSegment;
        const trVert = tlVert + 1;

        index.push(blVert);
        index.push(brVert);
        index.push(tlVert);

        index.push(tlVert);
        index.push(trVert);
        index.push(brVert);
      }
    }

    // Store indices for sorting
    this.indices_ = new Uint16Array(index);
    this.sortedIndices = [...index]; // Initialize sorted indices

    this.setIndex(this.gl, index);
  }

  /**
   * Sort faces by distance from camera for proper transparency rendering
   * @param camPos Camera position in world space
   * @param modelMatrix Optional model matrix for transformed spheres
   */
  sortFacesByDistance(camPos: vec3, modelMatrix?: Float32Array): void {
    const buckets: number[][] = Array(this.NUM_BUCKETS).fill(null).map(() => []);
    const faceCenters: vec3[] = [];

    // Pre-compute face centers
    for (let i = 0; i < this.indices_.length; i += 3) {
      const v0Idx = this.indices_[i];
      const v1Idx = this.indices_[i + 1];
      const v2Idx = this.indices_[i + 2];

      let centerX = (this.vertices_[v0Idx * 3] + this.vertices_[v1Idx * 3] + this.vertices_[v2Idx * 3]) / 3;
      let centerY = (this.vertices_[v0Idx * 3 + 1] + this.vertices_[v1Idx * 3 + 1] + this.vertices_[v2Idx * 3 + 1]) / 3;
      let centerZ = (this.vertices_[v0Idx * 3 + 2] + this.vertices_[v1Idx * 3 + 2] + this.vertices_[v2Idx * 3 + 2]) / 3;

      // Transform center by model matrix if provided
      if (modelMatrix) {
        const center = vec3.fromValues(centerX, centerY, centerZ);

        vec3.transformMat4(center, center, modelMatrix);
        centerX = center[0];
        centerY = center[1];
        centerZ = center[2];
      }

      faceCenters.push(vec3.fromValues(centerX, centerY, centerZ));
    }

    // Find min and max distances
    let minDist = Infinity;
    let maxDist = -Infinity;

    faceCenters.forEach((center) => {
      const dist = vec3.squaredDistance(center, camPos);

      minDist = Math.min(minDist, dist);
      maxDist = Math.max(maxDist, dist);
    });

    // Handle edge case where all faces are at the same distance
    if (maxDist - minDist < 0.0001) {
      this.sortedIndices = [...this.indices_];
      this.updateIndexBuffer();

      return;
    }

    // Distribute faces into buckets
    const bucketSize = (maxDist - minDist) / this.NUM_BUCKETS;

    for (let i = 0; i < this.indices_.length; i += 3) {
      const dist = vec3.squaredDistance(faceCenters[i / 3], camPos);
      const bucketIndex = Math.min(Math.floor((dist - minDist) / bucketSize), this.NUM_BUCKETS - 1);

      buckets[bucketIndex].push(
        this.indices_[i],
        this.indices_[i + 1],
        this.indices_[i + 2],
      );
    }

    // Concatenate buckets from far to near for back-to-front rendering
    this.sortedIndices = buckets.reduceRight((acc, bucket) => acc.concat(bucket), []);

    // Update the index buffer with sorted indices
    this.updateIndexBuffer();
  }

  /**
   * Update the WebGL index buffer with sorted indices
   */
  private updateIndexBuffer(): void {
    /*
     * Assuming you have a method to update the index buffer
     * This depends on your BufferGeometry implementation
     */
    this.setIndex(this.gl, this.sortedIndices);
  }

  /**
   * Get the sorted indices for external use
   */
  getSortedIndices(): number[] {
    return this.sortedIndices;
  }

  /**
   * Reset to original unsorted index order
   */
  resetSorting(): void {
    this.sortedIndices = [...this.indices_];
    this.updateIndexBuffer();
  }
}
