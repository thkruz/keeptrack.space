import { vec3 } from 'gl-matrix';
import { BufferAttribute } from './buffer-attribute';
import { BufferGeometry, GeometryParams } from './buffer-geometry';

interface RingGeometryParams extends GeometryParams {
  innerRadius: number;
  outerRadius: number;
  thetaSegments: number; // Number of segments around the ring
  phiSegments: number; // Number of segments between inner and outer radius
  isSkipTexture?: boolean;
  thetaStart?: number;
  thetaLength?: number;
}

export class RingGeometry extends BufferGeometry {
  innerRadius: number;
  outerRadius: number;
  thetaSegments: number;
  phiSegments: number;
  isSkipTexture: boolean;
  thetaStart: number;
  thetaLength: number;

  private vertices_: Float32Array;
  private indices_: Uint16Array | Uint32Array;
  private sortedIndices: number[] = [];
  private readonly NUM_BUCKETS = 16;

  constructor(
    gl: WebGL2RenderingContext,
    {
      innerRadius,
      outerRadius,
      thetaSegments,
      phiSegments,
      attributes = {},
      isSkipTexture = false,
      thetaStart = 0,
      thetaLength = Math.PI * 2,
    }: RingGeometryParams,
  ) {
    super({
      type: 'RingGeometry',
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
    this.innerRadius = innerRadius;
    this.outerRadius = outerRadius;
    this.thetaSegments = Math.max(3, thetaSegments);
    this.phiSegments = Math.max(1, phiSegments);
    this.isSkipTexture = isSkipTexture;
    this.thetaStart = thetaStart;
    this.thetaLength = thetaLength;

    this.calculateCombinedArray(isSkipTexture);
    this.calculateVertIndicies_();
  }

  /**
   * Generate a flat ring in the X-Y plane, CCW order
   */
  private calculateCombinedArray(isSkipTexture: boolean) {
    const combinedArray = [] as number[];

    for (let phiSegment = 0; phiSegment <= this.phiSegments; phiSegment++) {
      const radius = this.innerRadius + (this.outerRadius - this.innerRadius) * (phiSegment / this.phiSegments);

      for (let thetaSegment = 0; thetaSegment <= this.thetaSegments; thetaSegment++) {
        const theta = this.thetaStart + (this.thetaLength / this.thetaSegments) * thetaSegment;

        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta) * radius;
        const z = 0;

        // Normal always points up
        const nx = 0;
        const ny = 0;
        const nz = 1;

        // UV mapping
        const u = (radius - this.innerRadius) / (this.outerRadius - this.innerRadius);
        const v = thetaSegment / this.thetaSegments;

        combinedArray.push(x);
        combinedArray.push(y);
        combinedArray.push(z);
        combinedArray.push(nx);
        combinedArray.push(ny);
        combinedArray.push(nz);

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
   * Calculate the vertex draw order for the ring
   */
  private calculateVertIndicies_() {
    const index = [] as number[];

    for (let phiSegment = 0; phiSegment < this.phiSegments; phiSegment++) {
      for (let thetaSegment = 0; thetaSegment < this.thetaSegments; thetaSegment++) {
        const a = phiSegment * (this.thetaSegments + 1) + thetaSegment;
        const b = a + 1;
        const c = (phiSegment + 1) * (this.thetaSegments + 1) + thetaSegment;
        const d = c + 1;

        index.push(a, b, c);
        index.push(c, b, d);
      }
    }

    this.indices_ = new Uint16Array(index);
    this.sortedIndices = [...index];

    this.setIndex(this.gl, index);
  }

  // --- Sorting and other methods remain unchanged ---
  sortFacesByDistance(camPos: vec3, modelMatrix?: Float32Array): void {
    const buckets: number[][] = Array(this.NUM_BUCKETS).fill(null).map(() => []);
    const faceCenters: vec3[] = [];

    for (let i = 0; i < this.indices_.length; i += 3) {
      const v0Idx = this.indices_[i];
      const v1Idx = this.indices_[i + 1];
      const v2Idx = this.indices_[i + 2];

      let centerX = (this.vertices_[v0Idx * 3] + this.vertices_[v1Idx * 3] + this.vertices_[v2Idx * 3]) / 3;
      let centerY = (this.vertices_[v0Idx * 3 + 1] + this.vertices_[v1Idx * 3 + 1] + this.vertices_[v2Idx * 3 + 1]) / 3;
      let centerZ = (this.vertices_[v0Idx * 3 + 2] + this.vertices_[v1Idx * 3 + 2] + this.vertices_[v2Idx * 3 + 2]) / 3;

      if (modelMatrix) {
        const center = vec3.fromValues(centerX, centerY, centerZ);

        vec3.transformMat4(center, center, modelMatrix);
        centerX = center[0];
        centerY = center[1];
        centerZ = center[2];
      }

      faceCenters.push(vec3.fromValues(centerX, centerY, centerZ));
    }

    let minDist = Infinity;
    let maxDist = -Infinity;

    faceCenters.forEach((center) => {
      const dist = vec3.squaredDistance(center, camPos);

      minDist = Math.min(minDist, dist);
      maxDist = Math.max(maxDist, dist);
    });

    if (maxDist - minDist < 0.0001) {
      this.sortedIndices = [...this.indices_];
      this.updateIndexBuffer();

      return;
    }

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

    this.sortedIndices = buckets.reduceRight((acc, bucket) => acc.concat(bucket), []);
    this.updateIndexBuffer();
  }

  private updateIndexBuffer(): void {
    this.setIndex(this.gl, this.sortedIndices);
  }

  getSortedIndices(): number[] {
    return this.sortedIndices;
  }

  resetSorting(): void {
    this.sortedIndices = [...this.indices_];
    this.updateIndexBuffer();
  }
}
