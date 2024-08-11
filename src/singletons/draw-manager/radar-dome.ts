/* eslint-disable camelcase */
import { SensorFov } from '@app/plugins/sensor-fov/sensor-fov';
import { SensorSurvFence } from '@app/plugins/sensor-surv/sensor-surv-fence';
import { BufferAttribute } from '@app/static/buffer-attribute';
import { WebGlProgramHelper } from '@app/static/webgl-program';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { Degrees, DetailedSensor, GreenwichMeanSiderealTime, Kilometers, rae2eci } from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';

export class RadarDome {
  id = 0;
  sortedIndices: number[] = [];
  private readonly NUM_BUCKETS = 100; // Adjust based on your needs
  private attribs_ = {
    a_position: new BufferAttribute({
      location: 0,
      vertices: 3,
      offset: 0,
    }),
  };

  private buffers_ = {
    vertCount: 0,
    combinedBuf: null as WebGLBuffer,
    vertPosBuf: null as WebGLBuffer,
    vertNormBuf: null as WebGLBuffer,
    vertIndexBuf: null as WebGLBuffer,
  };

  private gl_: WebGL2RenderingContext;
  private isLoaded_ = false;
  private mvMatrix_: mat4;
  private nMatrix_ = mat3.create();
  private program_: WebGLProgram;

  private uniforms_ = {
    u_nMatrix: <WebGLUniformLocation>null,
    u_pMatrix: <WebGLUniformLocation>null,
    u_camMatrix: <WebGLUniformLocation>null,
    u_mvMatrix: <WebGLUniformLocation>null,
    u_color: <WebGLUniformLocation>null,
  };

  sensor: DetailedSensor;
  private vao_: WebGLVertexArrayObject;
  private vertices_: Float32Array;
  private indices_: Uint16Array;
  private indiciesBottom_: Uint16Array;
  private minRange_: Kilometers;
  private maxRange_: Kilometers;
  private minEl_: Degrees;
  private maxEl_: Degrees;
  private minAz_: Degrees;
  private maxAz_: Degrees;

  constructor(sensor: DetailedSensor) {
    this.sensor = sensor;
    this.minRange_ = sensor.minRng;
    this.maxRange_ = sensor.maxRng;
    this.minEl_ = sensor.minEl;
    this.maxEl_ = sensor.maxEl;
    if (sensor.minAz > sensor.maxAz) {
      this.minAz_ = sensor.minAz - 360 as Degrees;
    } else {
      this.minAz_ = sensor.minAz;
    }
    this.maxAz_ = sensor.maxAz;
  }

  init(gl: WebGL2RenderingContext): void {
    this.gl_ = gl;

    this.program_ = new WebGlProgramHelper(this.gl_, this.shaders_.vert, this.shaders_.frag, this.attribs_, this.uniforms_).program;
    this.createMesh_();
    this.initBuffers_();
    this.initVao_();

    this.sortFacesByDistance(keepTrackApi.getMainCamera().getCamPos());

    this.isLoaded_ = true;
  }

  update(gmst: GreenwichMeanSiderealTime) {
    if (!this.isLoaded_) {
      return;
    }

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);

    mat4.rotateZ(this.mvMatrix_, this.mvMatrix_, gmst);

    // Update normal matrix
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  draw(pMatrix: mat4, camMatrix: mat4, color: [number, number, number, number], tgtBuffer?: WebGLFramebuffer) {
    if (!this.isLoaded_) {
      return;
    }

    const isFovDrawn = keepTrackApi.getPlugin(SensorFov).isMenuButtonActive;
    const isSurvFenceDrawn = keepTrackApi.getPlugin(SensorSurvFence).isMenuButtonActive;
    const isStfCreated = keepTrackApi.getSensorManager().stfSensors.length > 0;

    if (!isFovDrawn && !isSurvFenceDrawn && !isStfCreated) {
      return;
    }

    const gl = this.gl_;

    gl.useProgram(this.program_);
    if (tgtBuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    }

    gl.uniformMatrix3fv(this.uniforms_.u_nMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);
    gl.uniform4fv(this.uniforms_.u_color, color);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false); // Disable depth writing

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-2.0, -2.0);

    gl.bindVertexArray(this.vao_);

    const indicies = isFovDrawn || this.sensor.isVolumetric ? this.sortedIndices : this.indiciesBottom_;

    // Use the pre-sorted indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.gl_.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicies), gl.DYNAMIC_DRAW);
    gl.drawElements(gl.TRIANGLES, indicies.length, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(null);

    gl.depthMask(true); // Re-enable depth writing
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }

  private sortFacesByDistance(camPos: vec3): void {
    const buckets: number[][] = Array(this.NUM_BUCKETS).fill(null).map(() => []);
    const faceCenters: vec3[] = [];

    // Pre-compute face centers
    for (let i = 0; i < this.indices_.length; i += 3) {
      const centerX = (this.vertices_[this.indices_[i] * 3] + this.vertices_[this.indices_[i + 1] * 3] + this.vertices_[this.indices_[i + 2] * 3]) / 3;
      const centerY = (this.vertices_[this.indices_[i] * 3 + 1] + this.vertices_[this.indices_[i + 1] * 3 + 1] + this.vertices_[this.indices_[i + 2] * 3 + 1]) / 3;
      const centerZ = (this.vertices_[this.indices_[i] * 3 + 2] + this.vertices_[this.indices_[i + 1] * 3 + 2] + this.vertices_[this.indices_[i + 2] * 3 + 2]) / 3;

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

    // Distribute faces into buckets
    const bucketSize = (maxDist - minDist) / this.NUM_BUCKETS;

    for (let i = 0; i < this.indices_.length; i += 3) {
      const dist = vec3.squaredDistance(faceCenters[i / 3], camPos);
      const bucketIndex = Math.min(Math.floor((dist - minDist) / bucketSize), this.NUM_BUCKETS - 1);

      buckets[bucketIndex].push(this.indices_[i], this.indices_[i + 1], this.indices_[i + 2]);
    }

    // Concatenate buckets from far to near
    this.sortedIndices = buckets.reduceRight((acc, bucket) => acc.concat(bucket), []);
  }

  private createMesh_() {
    const azimuthSegments = 32;
    const elevationSegments = 16;
    const rangeSegments = 16;

    const vertices = [];
    const indices = [];
    let vertexCount = 0;

    const createSurface = (
      azStart, azEnd, elStart, elEnd, rngStart, rngEnd,
      azSegments, elSegments,
      reverse = false,
    ) => {
      const startIndex = vertexCount;

      for (let i = 0; i <= azSegments; i++) {
        let az = azStart + (i / azSegments) * (azEnd - azStart);

        for (let j = 0; j <= elSegments; j++) {
          let el = elStart + (j / elSegments) * (elEnd - elStart);
          const rng = rngStart + (j / elSegments) * (rngEnd - rngStart);

          // Handle elevations above 90 degrees
          if (el > 90) {
            el = 180 - el;
            az += 180;
            if (az > 360) {
              az -= 360;
            }
          }

          const eci = rae2eci({ az, el, rng }, this.sensor, 0);

          vertices.push(eci.x, eci.y, eci.z);
          vertexCount++;

          if (i < azSegments && j < elSegments) {
            const a = startIndex + i * (elSegments + 1) + j;
            const b = a + elSegments + 1;

            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
          }
        }
      }

      for (let i = 0; i < azSegments; i++) {
        for (let j = 0; j < elSegments; j++) {
          const a = startIndex + i * (elSegments + 1) + j;
          const b = a + elSegments + 1;
          const c = a + 1;
          const d = b + 1;

          if (reverse) {
            indices.push(a, c, b);
            indices.push(b, c, d);
          } else {
            indices.push(a, b, c);
            indices.push(b, d, c);
          }
        }
      }
    };

    /**
     * This creates the left and right walls of the radar dome.
     * The first vertex is at minimum range, elevation, and a fixed azimuth
     * The second is at maximum range, minimum elevation, and a fixed azimuth
     * It then continues climbing in elevation until it reaches the maximum elevation
     * The last vertex is at maximum range, maximum elevation, and a fixed azimuth
     */
    const createWallSurface_ = (
      az: Degrees,
      elStart: Degrees,
      elEnd: Degrees,
      rngStart: Kilometers,
      rngEnd: Kilometers,
      elSegments: number,
      reverse = false,
    ) => {
      const startIndex = vertexCount;

      for (let i = 0; i <= elSegments; i++) {
        let el = elStart + (i / elSegments) * (elEnd - elStart) as Degrees;
        let localAz = az;

        // Handle elevations above 90 degrees
        if (el > 90) {
          el = 180 - el as Degrees;
          localAz = localAz + 180 as Degrees;
          if (localAz > 360) {
            localAz = localAz - 360 as Degrees;
          }
        }

        for (let j = 0; j <= 1; j++) {
          const rng = j ? rngEnd : rngStart;

          const eci = rae2eci({ az: localAz, el, rng }, this.sensor, 0);

          vertices.push(eci.x, eci.y, eci.z);
          vertexCount++;

          if (i < 1 && j < 1) {
            const a = startIndex + i * (1 + 1) + j;
            const b = a + 1 + 1;

            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
          }
        }
      }

      for (let i = 0; i < elSegments; i++) {
        for (let j = 0; j < 1; j++) {
          const a = startIndex + i * (1 + 1) + j;
          const b = a + 1 + 1;
          const c = a + 1;
          const d = b + 1;

          if (reverse) {
            indices.push(a, c, b);
            indices.push(b, c, d);
          } else {
            indices.push(a, b, c);
            indices.push(b, d, c);
          }
        }
      }

      return { vertices, indices };
    };

    if (this.sensor.maxEl <= 90) {
      // 1. Bottom surface
      createSurface(
        this.minAz_, this.maxAz_, this.minEl_, this.minEl_,
        this.minRange_, this.maxRange_,
        azimuthSegments, rangeSegments,
      );

      this.indiciesBottom_ = new Uint16Array(indices);
    }

    // 2. Left side (if not 360 degrees)
    let azRange = this.maxAz_ - this.minAz_;

    if (azRange < 0) {
      azRange += 360;
    }

    if (azRange < 360) {
      createWallSurface_(
        this.minAz_, this.minEl_, this.maxEl_, this.minRange_, this.maxRange_,
        elevationSegments,
        true,
      );
    }

    // 3. Right side (if not 360 degrees)
    if (azRange < 360) {
      createWallSurface_(
        this.maxAz_, this.minEl_, this.maxEl_, this.minRange_, this.maxRange_,
        elevationSegments,
      );
    }

    if (this.sensor.maxEl <= 90) {
      // 4. Back side
      createSurface(
        this.minAz_, this.maxAz_, this.minEl_, this.maxEl_,
        this.minRange_, this.minRange_,
        azimuthSegments, elevationSegments,
        true,
      );

      // 5. Front side
      createSurface(
        this.minAz_, this.maxAz_, this.minEl_, this.maxEl_,
        this.maxRange_, this.maxRange_,
        azimuthSegments, elevationSegments,
      );

      // 6. Top surface
      createSurface(
        this.minAz_, this.maxAz_, this.maxEl_, this.maxEl_,
        this.minRange_, this.maxRange_,
        azimuthSegments, rangeSegments,
      );
    }


    this.vertices_ = new Float32Array(vertices);
    this.indices_ = new Uint16Array(indices);
  }


  private initBuffers_() {
    const gl = this.gl_;

    this.buffers_.vertCount = this.indices_.length;
    this.buffers_.vertPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.vertPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices_, gl.STATIC_DRAW);

    this.buffers_.vertIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices_, gl.STATIC_DRAW);
  }

  private initVao_() {
    const gl = this.gl_;

    this.vao_ = gl.createVertexArray();
    gl.bindVertexArray(this.vao_);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.vertPosBuf);
    gl.enableVertexAttribArray(this.attribs_.a_position.location);
    gl.vertexAttribPointer(this.attribs_.a_position.location, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);

    gl.bindVertexArray(null);
  }

  private shaders_ = {
    frag: keepTrackApi.glsl`#version 300 es
      precision highp float;

      uniform vec4 u_color;

      out vec4 fragColor;

      void main(void) {
        fragColor = vec4(u_color.rgb, 0.15);
      }
    `,
    vert: keepTrackApi.glsl`#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;

      in vec3 a_position;

      void main(void) {
        gl_Position = u_pMatrix * u_camMatrix * u_mvMatrix * vec4(a_position, 1.0);
      }
    `,
  };
}
