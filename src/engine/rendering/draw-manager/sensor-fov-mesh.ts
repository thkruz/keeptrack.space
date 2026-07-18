/* eslint-disable camelcase */
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { CameraType } from '@app/engine/camera/camera-type';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { glsl } from '@app/engine/utils/development/formatter';
import { SensorFov } from '@app/plugins/sensor-fov/sensor-fov';
import { SensorSurvFence } from '@app/plugins/sensor-surv/sensor-surv-fence';
import { Degrees, GreenwichMeanSiderealTime, Kilometers, RADIUS_OF_EARTH, rae2eci } from '@ootk/src/main';
import { mat4, vec3 } from 'gl-matrix';
import { DepthManager } from '../depth-manager';
import { CustomMesh } from './custom-mesh';

interface SurfaceMeshParams {
  azStart: Degrees;
  azEnd: Degrees;
  elStart: Degrees;
  elEnd: Degrees;
  rngStart: Kilometers;
  rngEnd: Kilometers;
  azSegments: number;
  elSegments: number;
  reverse?: boolean;
}

export class SensorFovMesh extends CustomMesh {
  private readonly azimuthSegments = 32;
  private readonly elevationSegments = 16;
  private readonly rangeSegments = 16;
  sensor: DetailedSensor;

  uniforms_ = {
    u_pMatrix: null as unknown as WebGLUniformLocation,
    u_camMatrix: null as unknown as WebGLUniformLocation,
    u_mvMatrix: null as unknown as WebGLUniformLocation,
    u_color: null as unknown as WebGLUniformLocation,
    u_worldOffset: null as unknown as WebGLUniformLocation,
    logDepthBufFC: null as unknown as WebGLUniformLocation,
    u_flatMapMode: null as unknown as WebGLUniformLocation,
    u_gmst: null as unknown as WebGLUniformLocation,
    u_earthRadius: null as unknown as WebGLUniformLocation,
    u_meshRefFlatX: null as unknown as WebGLUniformLocation,
  };
  /**
   * A typed array that stores the indices for the bottom part of the sensor field of view mesh.
   * This is used when wanting to display on the bottom of the sensor.
   */
  protected indiciesBottom_: Uint16Array;


  constructor(sensor: DetailedSensor) {
    super();

    this.sensor = sensor;
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

    const isFovDrawn = PluginRegistry.getPlugin(SensorFov)?.isMenuButtonActive;
    const isSurvFenceDrawn = PluginRegistry.getPlugin(SensorSurvFence)?.isMenuButtonActive;
    const isStfCreated = ServiceLocator.getSensorManager().stfSensors.length > 0;

    if (!isFovDrawn && !isSurvFenceDrawn && !isStfCreated) {
      return;
    }

    const gl = this.gl_;

    gl.useProgram(this.program_);
    if (tgtBuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    }

    const isFlatMap = ServiceLocator.getMainCamera().cameraType === CameraType.FLAT_MAP;

    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);
    gl.uniform3fv(this.uniforms_.u_worldOffset, Scene.getInstance().worldShift);
    gl.uniform4fv(this.uniforms_.u_color, color);

    gl.uniform1i(this.uniforms_.u_flatMapMode, isFlatMap ? 1 : 0);
    if (isFlatMap) {
      const sensorLonRad = this.sensor.lon * (Math.PI / 180);
      const mapW = 2 * Math.PI * RADIUS_OF_EARTH;
      const camCenterX = ServiceLocator.getMainCamera().flatMapPanX;
      const d = sensorLonRad * RADIUS_OF_EARTH - camCenterX + mapW / 2;
      const meshRefFlatX = camCenterX + ((d % mapW) + mapW) % mapW - mapW / 2;

      gl.uniform1f(this.uniforms_.u_meshRefFlatX, meshRefFlatX);
      gl.uniform1f(this.uniforms_.u_gmst, ServiceLocator.getTimeManager().gmst);
      gl.uniform1f(this.uniforms_.u_earthRadius, RADIUS_OF_EARTH);
      gl.uniform1f(this.uniforms_.logDepthBufFC, 0.0);
    } else {
      gl.uniform1f(this.uniforms_.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
    }

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false); // Disable depth writing

    gl.bindVertexArray(this.vao_);

    const indicies = isFovDrawn || this.sensor.isVolumetric ? this.sortedIndices : this.indiciesBottom_;

    // Use the pre-sorted indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.gl_.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicies), gl.DYNAMIC_DRAW);
    gl.drawElements(gl.TRIANGLES, indicies.length, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(null);

    gl.depthMask(true); // Re-enable depth writing
    gl.disable(gl.BLEND);
  }

  protected verticesTmp_: number[] = [];
  protected indicesTmp_: number[] = [];
  protected vertexCount_ = 0;

  private createHorzGeometry(
    { azStart, azEnd, elStart, elEnd, rngStart, rngEnd, azSegments, elSegments, reverse = false }: SurfaceMeshParams,
  ) {
    const startIndex = this.vertexCount_;

    this.createHorzVertices_({ azSegments, azStart, azEnd, elSegments, elStart, elEnd, rngStart, rngEnd, startIndex });
    this.createHorzIndices_(azSegments, elSegments, startIndex, reverse);
  }

  /**
   * Adds a conical skirt from the sensor location to the inner edge of the
   * bottom FOV surface. This prevents the FOV from looking like a floating
   * circle when the sensor has a high minimum elevation (e.g., Poker Flats).
   *
   * The inner ring is the first column of the bottom surface vertex grid
   * (range = minRange, elevation = minEl). We create a triangle fan from
   * the sensor center to each adjacent pair of inner ring vertices.
   */
  private addBottomCone_(innerRingStartIndex: number, innerRingCount: number) {
    const centerIndex = this.vertexCount_;
    const center = rae2eci({ az: 0 as Degrees, el: 0 as Degrees, rng: 0 as Kilometers }, this.sensor, 0);

    this.verticesTmp_.push(center.x, center.y, center.z);
    this.vertexCount_++;

    // Triangle fan: center vertex to each adjacent pair of inner ring vertices
    for (let i = 0; i < innerRingCount - 1; i++) {
      const ringA = innerRingStartIndex + i;
      const ringB = innerRingStartIndex + i + 1;

      // Counter-clockwise when viewed from below (outside the FOV)
      this.indicesTmp_.push(
        // center → ringB → ringA
        centerIndex, ringB, ringA,
      );
    }

    // Close the fan (last vertex back to first)
    this.indicesTmp_.push(
      centerIndex,
      innerRingStartIndex,
      innerRingStartIndex + innerRingCount - 1,
    );
  }

  private createHorzIndices_(azSegments: number, elSegments: number, startIndex: number, reverse: boolean) {
    for (let i = 0; i < azSegments; i++) {
      for (let j = 0; j < elSegments; j++) {
        const a = startIndex + i * (elSegments + 1) + j;
        const b = a + elSegments + 1;
        const c = a + 1;
        const d = b + 1;

        if (reverse) {
          this.indicesTmp_.push(a, c, b);
          this.indicesTmp_.push(b, c, d);
        } else {
          this.indicesTmp_.push(a, b, c);
          this.indicesTmp_.push(b, d, c);
        }
      }
    }
  }

  private createHorzVertices_({ azSegments, azStart, azEnd, elSegments, elStart, elEnd, rngStart, rngEnd, startIndex }) {
    for (let i = 0; i <= azSegments; i++) {
      let az = azStart + (i / azSegments) * (azEnd - azStart) as Degrees;

      for (let j = 0; j <= elSegments; j++) {
        let el = elStart + (j / elSegments) * (elEnd - elStart) as Degrees;
        const rng = rngStart + (j / elSegments) * (rngEnd - rngStart);

        // Handle elevations above 90 degrees
        if (el > 90) {
          el = 180 - el as Degrees;
          az = az + 180 as Degrees;
          if (az > 360) {
            az = az - 360 as Degrees;
          }
        }

        const eci = rae2eci({ az, el, rng }, this.sensor, 0);

        this.verticesTmp_.push(eci.x, eci.y, eci.z);
        this.vertexCount_++;

        if (i < azSegments && j < elSegments) {
          const a = startIndex + i * (elSegments + 1) + j;
          const b = a + elSegments + 1;

          this.indicesTmp_.push(a, b, a + 1);
          this.indicesTmp_.push(b, b + 1, a + 1);
        }
      }
    }
  }

  /**
   * This creates the left and right walls of the radar dome.
   * The first vertex is at minimum range, elevation, and a fixed azimuth
   * The second is at maximum range, minimum elevation, and a fixed azimuth
   * It then continues climbing in elevation until it reaches the maximum elevation
   * The last vertex is at maximum range, maximum elevation, and a fixed azimuth
   */
  private createVertGeometry_(
    az: Degrees,
    elStart: Degrees,
    elEnd: Degrees,
    rngStart: Kilometers,
    rngEnd: Kilometers,
    elSegments: number,
    reverse = false,
  ) {
    const startIndex = this.vertexCount_;

    this.createVertVertices_(elSegments, elStart, elEnd, az, rngEnd, rngStart, startIndex);
    this.createVertIndices_(elSegments, startIndex, reverse);
  }

  private createVertIndices_(elSegments: number, startIndex: number, reverse: boolean) {
    for (let i = 0; i < elSegments; i++) {
      for (let j = 0; j < 1; j++) {
        const a = startIndex + i * (1 + 1) + j;
        const b = a + 1 + 1;
        const c = a + 1;
        const d = b + 1;

        if (reverse) {
          this.indicesTmp_.push(a, c, b);
          this.indicesTmp_.push(b, c, d);
        } else {
          this.indicesTmp_.push(a, b, c);
          this.indicesTmp_.push(b, d, c);
        }
      }
    }
  }

  private createVertVertices_(elSegments: number, elStart: Degrees, elEnd: Degrees, az: Degrees, rngEnd: Kilometers, rngStart: Kilometers, startIndex: number) {
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

        this.verticesTmp_.push(eci.x, eci.y, eci.z);
        this.vertexCount_++;

        if (i < 1 && j < 1) {
          const a = startIndex + i * (1 + 1) + j;
          const b = a + 1 + 1;

          this.indicesTmp_.push(a, b, a + 1);
          this.indicesTmp_.push(b, b + 1, a + 1);
        }
      }
    }
  }

  initGeometry_() {
    const { maxEl, minAz, maxAz, azRange, minEl, minRange, maxRange } = this.getSensorFovParams_();


    if (maxEl <= 90) {
      // 1. Bottom surface
      this.createHorzGeometry(
        { azStart: minAz, azEnd: maxAz, elStart: minEl, elEnd: minEl, rngStart: minRange, rngEnd: maxRange, azSegments: this.azimuthSegments, elSegments: this.rangeSegments },
      );

      this.indiciesBottom_ = new Uint16Array(this.indicesTmp_);

      // For sensors with a high minimum elevation (>= 20°), the bottom surface
      // appears as a small floating circle. Add a conical skirt from the sensor
      // to the inner ring so the FOV looks like a cone instead.
      if (minEl > 20 && azRange >= 360) {
        // Inner ring is the first column in the bottom surface grid (j=0)
        this.addBottomCone_(
          0, // inner ring starts at vertex 0 (first column of step 1 grid)
          this.azimuthSegments + 1,
        );
      }
    }

    // 2. Left side (if not 360 degrees)
    if (azRange < 360) {
      this.createVertGeometry_(
        minAz, minEl, maxEl, minRange, maxRange,
        this.elevationSegments,
        true,
      );
    }

    // 3. Right side (if not 360 degrees)
    if (azRange < 360) {
      this.createVertGeometry_(
        maxAz, minEl, maxEl, minRange, maxRange,
        this.elevationSegments,
      );
    }

    /*
     * Beyond 90 degrees elevation the mesh criss-crosses itself, this will
     * be fixed with an update to ootk where the elevation is ajusted to
     * a reference boresight elevation
     */
    if (maxEl <= 90) {
      // 4. Back side
      this.createHorzGeometry({
        azStart: minAz,
        azEnd: maxAz,
        elStart: minEl,
        elEnd: maxEl,
        rngStart: minRange,
        rngEnd: minRange,
        azSegments: this.azimuthSegments,
        elSegments: this.elevationSegments,
        reverse: true,
      });

      // 5. Front side
      this.createHorzGeometry({
        azStart: minAz,
        azEnd: maxAz,
        elStart: minEl,
        elEnd: maxEl,
        rngStart: maxRange,
        rngEnd: maxRange,
        azSegments: this.azimuthSegments,
        elSegments: this.elevationSegments,
      });

      // 6. Top surface
      this.createHorzGeometry({
        azStart: minAz,
        azEnd: maxAz,
        elStart: maxEl,
        elEnd: maxEl,
        rngStart: minRange,
        rngEnd: maxRange,
        azSegments: this.azimuthSegments,
        elSegments: this.rangeSegments,
      });
    }


    this.vertices_ = new Float32Array(this.verticesTmp_);
    this.indices_ = new Uint16Array(this.indicesTmp_);
  }

  sortFacesByDistance(camPos: vec3): void {
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

  private getSensorFovParams_() {
    const minRange = this.sensor.minRng;
    const maxRange = this.sensor.maxRng;
    const minEl = this.sensor.minEl;
    const maxEl = this.sensor.maxEl;
    let minAz = this.sensor.minAz;

    if (this.sensor.minAz > this.sensor.maxAz) {
      minAz = this.sensor.minAz - 360 as Degrees;
    }
    const maxAz = this.sensor.maxAz;

    let azRange = maxAz - minAz;

    if (azRange < 0) {
      azRange += 360;
    }

    return { maxEl, minAz, maxAz, azRange, minEl, minRange, maxRange };
  }

  shaders_ = {
    frag: glsl`#version 300 es
      precision highp float;

      uniform vec4 u_color;
      uniform float logDepthBufFC;

      out vec4 fragColor;

      void main(void) {
        fragColor = vec4(u_color.rgb, 0.15);

        ${DepthManager.getLogDepthFragCode()}
      }
    `,
    vert: glsl`#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform vec3 u_worldOffset;
      uniform float logDepthBufFC;
      uniform bool u_flatMapMode;
      uniform float u_gmst;
      uniform float u_earthRadius;
      uniform float u_meshRefFlatX;

      in vec3 a_position;

      void main(void) {
        vec4 worldPosition = u_mvMatrix * vec4(a_position, 1.0);

        if (u_flatMapMode) {
          float PI = 3.14159265359;
          vec3 eciPos = worldPosition.xyz;
          float eciDist = length(eciPos);
          float lon = atan(eciPos.y, eciPos.x) - u_gmst;
          float lat = atan(eciPos.z, length(eciPos.xy));
          float alt = eciDist - u_earthRadius;

          // Wrap X relative to mesh center to keep all mesh vertices contiguous
          float mapW = 2.0 * PI * u_earthRadius;
          float flatX = lon * u_earthRadius;
          flatX = u_meshRefFlatX + mod(flatX - u_meshRefFlatX + mapW * 0.5, mapW) - mapW * 0.5;

          vec3 flatPos = vec3(flatX, lat * u_earthRadius, alt * 0.001);
          gl_Position = u_pMatrix * u_camMatrix * vec4(flatPos, 1.0);
        } else {
          worldPosition.xyz += u_worldOffset;
          gl_Position = u_pMatrix * u_camMatrix * worldPosition;
        }

        ${DepthManager.getLogDepthVertCode()}
      }
    `,
  };
}
