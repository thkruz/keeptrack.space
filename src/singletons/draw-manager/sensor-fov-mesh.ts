/* eslint-disable camelcase */
import { SensorFov } from '@app/plugins/sensor-fov/sensor-fov';
import { SensorSurvFence } from '@app/plugins/sensor-surv/sensor-surv-fence';
import { mat4 } from 'gl-matrix';
import { Degrees, DetailedSensor, GreenwichMeanSiderealTime, Kilometers, rae2eci } from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { CustomMesh } from './custom-mesh';

export class SensorFovMesh extends CustomMesh {
  uniforms_ = {
    u_pMatrix: <WebGLUniformLocation>null,
    u_camMatrix: <WebGLUniformLocation>null,
    u_mvMatrix: <WebGLUniformLocation>null,
    u_color: <WebGLUniformLocation>null,
  };

  sensor: DetailedSensor;
  private indiciesBottom_: Uint16Array;
  private minRange_: Kilometers;
  private maxRange_: Kilometers;
  private minEl_: Degrees;
  private maxEl_: Degrees;
  private minAz_: Degrees;
  private maxAz_: Degrees;

  constructor(sensor: DetailedSensor) {
    super();

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

  update(gmst: GreenwichMeanSiderealTime) {
    if (!this.isLoaded_) {
      return;
    }

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);

    mat4.rotateZ(this.mvMatrix_, this.mvMatrix_, gmst);
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

  createMesh_() {
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

  shaders_ = {
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
