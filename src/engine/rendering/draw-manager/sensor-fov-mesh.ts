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
    u_earthRadius: null as unknown as WebGLUniformLocation,
    u_sensorLatLon: null as unknown as WebGLUniformLocation,
    u_azLimits: null as unknown as WebGLUniformLocation,
    u_elLimits: null as unknown as WebGLUniformLocation,
    u_rngLimits: null as unknown as WebGLUniformLocation,
  };
  /** Map-sized quad used on the flat map, where coverage is evaluated per fragment instead of projecting the mesh */
  private flatQuadVao_: WebGLVertexArrayObject | null = null;
  private flatQuadBuf_: WebGLBuffer | null = null;
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
    const isFullVolume = isFovDrawn || this.sensor.isVolumetric;

    if (isFlatMap) {
      this.setFlatMapUniforms_(isFullVolume);
      gl.uniform1f(this.uniforms_.logDepthBufFC, 0.0);
    } else {
      gl.uniform1f(this.uniforms_.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
    }

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false); // Disable depth writing

    if (isFlatMap) {
      this.drawFlatMapCoverage_();
      gl.depthMask(true);
      gl.disable(gl.BLEND);

      return;
    }

    gl.bindVertexArray(this.vao_);

    const indicies = isFullVolume ? this.sortedIndices : this.indiciesBottom_;

    // Use the pre-sorted indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.gl_.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicies), gl.DYNAMIC_DRAW);
    gl.drawElements(gl.TRIANGLES, indicies.length, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(null);

    gl.depthMask(true); // Re-enable depth writing
    gl.disable(gl.BLEND);
  }

  /**
   * Flat map coverage (#280). Projecting the 3D volume vertex by vertex breaks for footprints that contain a pole
   * (every longitude is inside, so some triangles always straddle the map seam and smear into straight bands) and
   * for footprints wider than the map. Instead a map-sized quad is drawn and the fragment shader keeps the ground
   * points under which some point of the FOV volume lies: the az/el/range box seen from the sensor.
   */
  private setFlatMapUniforms_(isFullVolume: boolean): void {
    const gl = this.gl_;
    const DEG2RAD = Math.PI / 180;
    const { minAz, azRange, minEl, maxEl, minRange, maxRange } = this.getSensorFovParams_();
    // The bottom-only footprint (surveillance fence, STF) is the subpoint set of the minimum-elevation surface
    const elTop = isFullVolume ? maxEl : minEl;

    gl.uniform2f(this.uniforms_.u_sensorLatLon, this.sensor.lat * DEG2RAD, this.sensor.lon * DEG2RAD);
    gl.uniform2f(this.uniforms_.u_azLimits, minAz, this.sensor.maxAz - minAz >= 360 ? 360 : azRange);
    gl.uniform2f(this.uniforms_.u_elLimits, minEl, elTop);
    gl.uniform2f(this.uniforms_.u_rngLimits, minRange, maxRange);
    gl.uniform1f(this.uniforms_.u_earthRadius, RADIUS_OF_EARTH);
  }

  private drawFlatMapCoverage_(): void {
    const gl = this.gl_;

    if (!this.flatQuadVao_) {
      this.flatQuadBuf_ = gl.createBuffer();
      this.flatQuadVao_ = gl.createVertexArray();
      gl.bindVertexArray(this.flatQuadVao_);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.flatQuadBuf_);
      gl.enableVertexAttribArray(this.attribs_.a_position.location);
      gl.vertexAttribPointer(this.attribs_.a_position.location, 3, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
    }

    // Cover three map widths around the camera so a panned view never shows an edge; the shader wraps longitude
    const mapW = 2 * Math.PI * RADIUS_OF_EARTH;
    const camX = ServiceLocator.getMainCamera().flatMapPanX;
    const x0 = camX - 1.5 * mapW;
    const x1 = camX + 1.5 * mapW;
    const yTop = (Math.PI / 2) * RADIUS_OF_EARTH;
    const z = 0.01;

    gl.bindVertexArray(this.flatQuadVao_);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.flatQuadBuf_);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x0, -yTop, z, x1, -yTop, z, x0, yTop, z, x1, yTop, z]), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  protected verticesTmp_: number[] = [];
  protected indicesTmp_: number[] = [];
  protected vertexCount_ = 0;

  private createHorzGeometry({ azStart, azEnd, elStart, elEnd, rngStart, rngEnd, azSegments, elSegments, reverse = false }: SurfaceMeshParams) {
    const startIndex = this.vertexCount_;

    this.createHorzVertices_({ azSegments, azStart, azEnd, elSegments, elStart, elEnd, rngStart, rngEnd, startIndex });
    this.createHorzIndices_(azSegments, elSegments, startIndex, reverse);
  }

  /**
   * Adds a skirt joining the sensor location to a ring of already-created vertices, so a high minimum
   * elevation still reads as a cone instead of a floating ring.
   * @param ringStart Vertex index of the first ring vertex
   * @param ringLength Number of ring vertices
   * @param stride Distance in vertex indices between neighbouring ring vertices
   */
  private createBottomCone_(ringStart: number, ringLength: number, stride: number) {
    const apex = rae2eci({ az: 0 as Degrees, el: 0 as Degrees, rng: 0 as Kilometers }, this.sensor, 0);
    const apexIndex = this.vertexCount_;

    this.verticesTmp_.push(apex.x, apex.y, apex.z);
    this.vertexCount_++;

    for (let k = 0; k < ringLength - 1; k++) {
      this.indicesTmp_.push(apexIndex, ringStart + (k + 1) * stride, ringStart + k * stride);
    }
    // Close the fan between the last and first ring vertices
    this.indicesTmp_.push(apexIndex, ringStart, ringStart + (ringLength - 1) * stride);
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
      let az = (azStart + (i / azSegments) * (azEnd - azStart)) as Degrees;

      for (let j = 0; j <= elSegments; j++) {
        let el = (elStart + (j / elSegments) * (elEnd - elStart)) as Degrees;
        const rng = rngStart + (j / elSegments) * (rngEnd - rngStart);

        // Handle elevations above 90 degrees
        if (el > 90) {
          el = (180 - el) as Degrees;
          az = (az + 180) as Degrees;
          if (az > 360) {
            az = (az - 360) as Degrees;
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
  private createVertGeometry_(az: Degrees, elStart: Degrees, elEnd: Degrees, rngStart: Kilometers, rngEnd: Kilometers, elSegments: number, reverse = false) {
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
      let el = (elStart + (i / elSegments) * (elEnd - elStart)) as Degrees;
      let localAz = az;

      // Handle elevations above 90 degrees
      if (el > 90) {
        el = (180 - el) as Degrees;
        localAz = (localAz + 180) as Degrees;
        if (localAz > 360) {
          localAz = (localAz - 360) as Degrees;
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
      this.createHorzGeometry({
        azStart: minAz,
        azEnd: maxAz,
        elStart: minEl,
        elEnd: minEl,
        rngStart: minRange,
        rngEnd: maxRange,
        azSegments: this.azimuthSegments,
        elSegments: this.rangeSegments,
      });

      this.indiciesBottom_ = new Uint16Array(this.indicesTmp_);

      // Steep minimum elevations leave the bottom surface hovering, so skirt it down to the sensor
      if (minEl > 20 && azRange >= 360) {
        this.createBottomCone_(0, this.azimuthSegments + 1, this.rangeSegments + 1);
      }
    }

    // 2. Left side (if not 360 degrees)
    if (azRange < 360) {
      this.createVertGeometry_(minAz, minEl, maxEl, minRange, maxRange, this.elevationSegments, true);
    }

    // 3. Right side (if not 360 degrees)
    if (azRange < 360) {
      this.createVertGeometry_(maxAz, minEl, maxEl, minRange, maxRange, this.elevationSegments);
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
    const buckets: number[][] = new Array(this.NUM_BUCKETS).fill(null).map(() => []);
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
      minAz = (this.sensor.minAz - 360) as Degrees;
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
      uniform bool u_flatMapMode;
      uniform float u_earthRadius;
      uniform vec2 u_sensorLatLon;
      uniform vec2 u_azLimits;
      uniform vec2 u_elLimits;
      uniform vec2 u_rngLimits;

      in vec2 v_flatXY;

      out vec4 fragColor;

      const float PI = 3.14159265359;
      const float RAD2DEG = 57.2957795131;

      bool inAz(float azDeg) {
        return u_azLimits.y >= 360.0 || mod(azDeg - u_azLimits.x, 360.0) <= u_azLimits.y;
      }

      // The flat-map footprint is a stylized spherical (R = u_earthRadius) horizon model on the plate carree
      // map. It is kept spherical on purpose (audit row C6): the dome outline differs from the WGS84 one by
      // the 0.19 deg vertical deflection (about 21 km), well inside the map's pixel scale at this zoom.
      // Elevation (deg) seen from the sensor of the point at geocentric radius rho above a ground point theta away
      float elAt(float rho, float theta) {
        return atan(rho * cos(theta) - u_earthRadius, rho * sin(theta)) * RAD2DEG;
      }

      // Geocentric radius of the point above the ground point at slant range rng (larger root)
      float rhoAtRange(float rng, float theta) {
        float s = u_earthRadius * sin(theta);

        return u_earthRadius * cos(theta) + sqrt(max(rng * rng - s * s, 0.0));
      }

      // Is some point straight above the ground point inside the elevation window [el0, el1] and the range limits?
      bool isElWindowCovered(float theta, float el0, float el1) {
        // Range to the ground point itself; points above it are farther (range and elevation grow with height)
        float groundRng = 2.0 * u_earthRadius * sin(theta * 0.5);

        if (u_rngLimits.y < groundRng) {
          return false;
        }
        float rhoLo = u_rngLimits.x <= groundRng ? u_earthRadius : rhoAtRange(u_rngLimits.x, theta);
        float rhoHi = rhoAtRange(u_rngLimits.y, theta);

        return max(elAt(rhoLo, theta), el0) <= min(elAt(rhoHi, theta), el1);
      }

      bool isCovered() {
        float lon = v_flatXY.x / u_earthRadius;
        float lat = v_flatXY.y / u_earthRadius;
        float dLon = lon - u_sensorLatLon.y;
        float lat0 = u_sensorLatLon.x;
        float cosTheta = sin(lat0) * sin(lat) + cos(lat0) * cos(lat) * cos(dLon);
        float theta = acos(clamp(cosTheta, -1.0, 1.0));

        if (theta < 1.0e-5) {
          return u_elLimits.y >= 89.9 && u_rngLimits.x <= u_rngLimits.y;
        }
        float az = atan(sin(dLon) * cos(lat), cos(lat0) * sin(lat) - sin(lat0) * cos(lat) * cos(dLon)) * RAD2DEG;

        if (inAz(az) && isElWindowCovered(theta, u_elLimits.x, min(u_elLimits.y, 90.0))) {
          return true;
        }

        // Elevation limits past 90 deg look back over the zenith toward the opposite azimuth
        return u_elLimits.y > 90.0 && inAz(az + 180.0) && isElWindowCovered(theta, 180.0 - u_elLimits.y, 90.0);
      }

      void main(void) {
        if (u_flatMapMode) {
          if (abs(v_flatXY.y) > 0.5 * PI * u_earthRadius || !isCovered()) {
            discard;
          }
          // One layer here; the projected 3D volume overlapped top and bottom surfaces (about 0.28 combined)
          fragColor = vec4(u_color.rgb, 0.28);
        } else {
          fragColor = vec4(u_color.rgb, 0.15);
        }

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

      in vec3 a_position;

      out vec2 v_flatXY;

      void main(void) {
        vec4 worldPosition = u_mvMatrix * vec4(a_position, 1.0);

        if (u_flatMapMode) {
          // Flat map: a_position is the map quad in flat coordinates; coverage is decided per fragment
          v_flatXY = a_position.xy;
          gl_Position = u_pMatrix * u_camMatrix * vec4(a_position, 1.0);
        } else {
          v_flatXY = vec2(0.0);
          worldPosition.xyz += u_worldOffset;
          gl_Position = u_pMatrix * u_camMatrix * worldPosition;
        }

        ${DepthManager.getLogDepthVertCode()}
      }
    `,
  };
}
