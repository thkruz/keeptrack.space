/* eslint-disable camelcase */
import { GetSatType, SatObject, Singletons } from '@app/js/interfaces';
import { DEG2RAD, RAD2DEG } from '@app/js/lib/constants';
import { SpaceObjectType } from '@app/js/lib/space-object-type';

import { keepTrackApi } from '@app/js/keepTrackApi';
import { mat4, vec4 } from 'gl-matrix';
import { Degrees, Kilometers, Radians, Transforms } from 'ootk';
import { keepTrackContainer } from '../../container';
import { EciArr3 } from '../../interfaces';
import { CoordinateTransforms } from '../../static/coordinate-transforms';
import { GlUtils } from '../../static/gl-utils';
import { SensorMath } from '../../static/sensor-math';
import { DrawManager } from '../draw-manager';
import { Line } from './line-manager/line';

export type LineTypes = 'sat' | 'sat2' | 'sat3' | 'sat4' | 'sat5' | 'sat6' | 'scan' | 'scan2' | 'misl' | 'ref' | 'ref2';
export type LineColors = 'r' | 'o' | 'y' | 'g' | 'b' | 'c' | 'p' | 'w' | [number, number, number, number];

export type LineTask = {
  line: Line;
  sat?: SatObject;
  sat2?: SatObject;
  star1?: string;
  star2?: string;
  star1ID?: number;
  star2ID?: number;
  ref?: EciArr3;
  ref2?: EciArr3;
  color?: [number, number, number, number];
  isOnlyInFOV?: boolean;
  isDrawWhenSelected?: boolean;
  isCalculateIfInFOV?: boolean;
  isScan?: boolean;
  isScan2?: boolean;
  lat?: Degrees;
  lon?: Degrees;
  az?: Degrees;
  minAz?: Degrees;
  maxAz?: Degrees;
  minEl?: Degrees;
  maxRng?: Kilometers;
};

export class LineManager {
  // #region Properties (7)

  private shaders_ = {
    frag: `#version 300 es
      precision mediump float;

      in vec4 vColor;
      in float vAlpha;

      out vec4 fragColor;

      void main(void) {
        fragColor = vec4(vColor[0],vColor[1],vColor[2], vColor[3] * vAlpha);
      }
      `,
    vert: `#version 300 es
      in vec4 a_position;

      uniform vec4 u_color;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform mat4 u_pMatrix;

      out vec4 vColor;
      out float vAlpha;

      void main(void) {
          vec4 position = u_pMatrix * u_camMatrix *  u_mvMatrix * vec4(a_position[0],a_position[1],a_position[2], 1.0);
          gl_Position = position;
          vColor = u_color;
          vAlpha = a_position[3];
      }
      `,
  };

  private attribs_ = {
    a_position: 0,
  };

  private uniforms_ = {
    u_color: <WebGLUniformLocation>null,
    u_camMatrix: <WebGLUniformLocation>null,
    u_mvMatrix: <WebGLUniformLocation>null,
    u_pMatrix: <WebGLUniformLocation>null,
  };

  public drawLineList = <LineTask[]>[];
  private gl_: WebGL2RenderingContext;
  public program: WebGLProgram;
  private tempStar1_: SatObject;
  private tempStar2_: SatObject;

  // #endregion Properties (7)

  // #region Constructors (1)

  init() {
    this.gl_ = keepTrackApi.getDrawManager().gl;
    this.initProgram_();
  }

  private initProgram_() {
    const gl = this.gl_;
    this.program = GlUtils.createProgramFromCode(gl, this.shaders_.vert, this.shaders_.frag);
    this.gl_.useProgram(this.program);

    // Assign Attributes
    GlUtils.assignAttributes(this.attribs_, gl, this.program, ['a_position']);
    GlUtils.assignUniforms(this.uniforms_, gl, this.program, ['u_pMatrix', 'u_camMatrix', 'u_mvMatrix', 'u_color']);
  }

  // #endregion Constructors (1)

  // #region Public Static Methods (1)

  public static getColor(color?: LineColors): [number, number, number, number] {
    color ??= [1.0, 0, 1.0, 1.0];
    switch (color) {
      case 'r':
        color = [1.0, 0.0, 0.0, 1.0];
        break;
      case 'o':
        color = [1.0, 0.5, 0.0, 1.0];
        break;
      case 'y':
        color = [1.0, 1.0, 0.0, 1.0];
        break;
      case 'g':
        color = [0.0, 1.0, 0.0, 1.0];
        break;
      case 'b':
        color = [0.0, 0.0, 1.0, 1.0];
        break;
      case 'c':
        color = [0.0, 1.0, 1.0, 1.0];
        break;
      case 'p':
        color = [1.0, 0.0, 1.0, 1.0];
        break;
      case 'w':
        color = [1.0, 1.0, 1.0, 1.0];
        break;
      default:
        // If color not a letter than assume its been set
        if (color.length !== 4) throw new Error('Color must be a 4 element array or a valid string!');
        break;
    }

    return color;
  }

  // #endregion Public Static Methods (1)

  // #region Public Methods (8)

  public clear(): void {
    this.drawLineList = [];
  }

  // This is intentionally complex to reduce object creation and GC
  // Splitting it into subfunctions would not be optimal
  // prettier-ignore
  public create(type: LineTypes, value: number[] | number, inputColor?: LineColors): void { // NOSONAR
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const getSat = catalogManagerInstance.getSat.bind(catalogManagerInstance);
    let sat = null;
    let sat2 = null;

    const color = LineManager.getColor(inputColor);

    // Center of the Earth to the Satellite
    if (type == 'sat') {
      const sat = getSat(<number>value);
      if (!sat || !sat.position || !sat.position.x) {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl_, this.attribs_, this.uniforms_),
        sat: sat,
        ref: [0, 0, 0],
        ref2: [sat.position.x, sat.position.y, sat.position.z],
        color: color,
      });
    }
    // Reference Point to Satellite
    if (type == 'sat2') {
      sat = getSat(value[0]);
      if (!sat || !sat.position || !sat.position.x) {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl_, this.attribs_, this.uniforms_),
        sat: sat,
        ref: [value[1], value[2], value[3]],
        ref2: [sat.position.x, sat.position.y, sat.position.z],
        color: color,
      });
    }
    // Sensor to Satellite When in View of Currently Selected Sensor
    if (type == 'sat3') {
      sat = getSat(value[0]);
      sat2 = getSat(value[1]);
      if (!sat || !sat2 || !sat.position || !sat.position.x || !sat2.position || !sat2.position.x) {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        console.debug(sat2);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl_, this.attribs_, this.uniforms_),
        sat: sat,
        sat2: sat2,
        ref: [sat.position.x, sat.position.y, sat.position.z],
        ref2: [sat2.position.x, sat2.position.y, sat2.position.z],
        color: color,
        isOnlyInFOV: true,
        isDrawWhenSelected: false,
      });
    }
    // Sensor to Satellite When in View of Currently Selected Sensor and Satellite Selected
    if (type == 'sat4') {
      sat = getSat(value[0]);
      sat2 = getSat(value[1]);
      if (!sat || !sat2 || !sat.position || !sat.position.x || !sat2.position || !sat2.position.x) {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        console.debug(sat2);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl_, this.attribs_, this.uniforms_),
        sat: sat,
        sat2: sat2,
        ref: [sat.position.x, sat.position.y, sat.position.z],
        ref2: [sat2.position.x, sat2.position.y, sat2.position.z],
        color: color,
        isOnlyInFOV: true,
        isDrawWhenSelected: true,
      });
    }

    // One Sensor to Satellite
    if (type == 'sat5') {
      sat = getSat(value[0]);
      sat2 = getSat(value[1]);
      if (!sat || !sat2 || !sat.position || !sat.position.x || !sat2.position || !sat2.position.x) {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        console.debug(sat2);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl_, this.attribs_, this.uniforms_),
        sat: sat,
        sat2: sat2,
        ref: [sat.position.x, sat.position.y, sat.position.z],
        ref2: [sat2.position.x, sat2.position.y, sat2.position.z],
        color: color,
        isOnlyInFOV: false,
        isDrawWhenSelected: false,
      });
    }
    // Multiple Sensors to Satellite
    if (type == 'sat6') {
      sat = getSat(value[0]);
      sat2 = getSat(value[1]);
      if (!sat || !sat2 || !sat.position || !sat.position.x || !sat2.position || !sat2.position.x) {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        console.debug(sat2);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl_, this.attribs_, this.uniforms_),
        sat: sat,
        sat2: sat2,
        ref: [sat.position.x, sat.position.y, sat.position.z],
        ref2: [sat2.position.x, sat2.position.y, sat2.position.z],
        color: color,
        isOnlyInFOV: true,
        isDrawWhenSelected: false,
        isCalculateIfInFOV: true,
      });
    }
    // Scanning Satellite to Reference Points on Earth in FOV
    if (type == 'scan') {
      sat = getSat(value[0]);
      if (!sat || !sat.position || !sat.position.x) {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl_, this.attribs_, this.uniforms_),
        sat: sat,
        ref: [0, 0, 0],
        ref2: [sat.position.x, sat.position.y, sat.position.z],
        color: color,
        isScan: true,
        lat: <Degrees>-90,
        lon: <Degrees>0,
      });
    }

    // Scanning Satellite to Reference Points on Earth in FOV
    if (type == 'scan2') {
      sat = getSat(value[0]);
      if (!sat || !sat.position || !sat.position.x) {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl_, this.attribs_, this.uniforms_),
        sat: sat,
        ref: [0, 0, 0],
        ref2: [sat.position.x, sat.position.y, sat.position.z],
        color: color,
        isScan2: true,
        az: value[1],
        minAz: value[1],
        maxAz: value[2],
        minEl: value[3],
        maxRng: value[4],
      });
    }

    // Satellite to Missile
    if (type == 'misl') {
      sat = getSat(value[0]);
      sat2 = getSat(value[1]);
      if (!sat || !sat2 || !sat.position || !sat.position.x || !sat2.position || !sat2.position.x) {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        console.debug(sat2);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl_, this.attribs_, this.uniforms_),
        sat: sat,
        sat2: sat2,
        ref: [sat.position.x, sat.position.y, sat.position.z],
        ref2: [sat2.position.x, sat2.position.y, sat2.position.z],
        color: color,
      });
    }

    if (type == 'ref') {
      this.drawLineList.push({
        line: new Line(this.gl_, this.attribs_, this.uniforms_),
        ref: [0, 0, 0],
        ref2: [value[0], value[1], value[2]],
        color: color,
      });
    }
    if (type == 'ref2') {
      this.drawLineList.push({
        line: new Line(this.gl_, this.attribs_, this.uniforms_),
        ref: [value[0], value[1], value[2]],
        ref2: [value[3], value[4], value[5]],
        color: color,
      });
    }
  }

  public createGrid(type: 'x' | 'y' | 'z', inputColor?: LineColors, scalar?: number): void {
    if (type !== 'x' && type !== 'y' && type !== 'z') {
      throw new Error('Invalid type');
    }

    const color = LineManager.getColor(inputColor);

    scalar ??= 1;

    const num1 = 10000 / scalar;
    const num2 = num1 * 7 * scalar;
    const min = -7 * scalar;
    const max = 7 * scalar;

    switch (type) {
      case 'x':
        for (let i = min; i <= max; i++) {
          this.drawLineList.push({
            line: new Line(this.gl_, this.attribs_, this.uniforms_),
            ref: [num2, i * num1, 0],
            ref2: [-num2, i * num1, 0],
            color: color,
          });
          this.drawLineList.push({
            line: new Line(this.gl_, this.attribs_, this.uniforms_),
            ref: [i * num1, num2, 0],
            ref2: [i * num1, -num2, 0],
            color: color,
          });
        }
        break;
      case 'y':
        for (let i = min; i <= max; i++) {
          this.drawLineList.push({
            line: new Line(this.gl_, this.attribs_, this.uniforms_),
            ref: [num2, 0, i * num1],
            ref2: [-num2, 0, i * num1],
            color: color,
          });
          this.drawLineList.push({
            line: new Line(this.gl_, this.attribs_, this.uniforms_),
            ref: [i * num1, 0, num2],
            ref2: [i * num1, 0, -num2],
            color: color,
          });
        }
        break;
      case 'z':
        for (let i = min; i <= max; i++) {
          this.drawLineList.push({
            line: new Line(this.gl_, this.attribs_, this.uniforms_),
            ref: [0, num2, i * num1],
            ref2: [0, -num2, i * num1],
            color: color,
          });
          this.drawLineList.push({
            line: new Line(this.gl_, this.attribs_, this.uniforms_),
            ref: [0, i * num1, num2],
            ref2: [0, i * num1, -num2],
            color: color,
          });
        }
        break;
    }
  }

  public draw(drawManager: DrawManager, inViewData: Int8Array, camMatrix: mat4, tgtBuffer: WebGLFramebuffer = null): void {
    const gl = this.gl_;
    const { gmst, pMatrix } = drawManager;

    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    gl.useProgram(this.program);

    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, mat4.create());
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);

    gl.enableVertexAttribArray(this.attribs_.a_position); // Enable

    if (this.drawLineList.length == 0) return;
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    for (let i = 0; i < this.drawLineList.length; i++) {
      try {
        if (typeof this.drawLineList[i].sat != 'undefined' && this.drawLineList[i].sat != null && typeof this.drawLineList[i].sat.id != 'undefined') {
          // At least One Satellite
          this.drawLineList[i].sat = catalogManagerInstance.getSat(this.drawLineList[i].sat.id, GetSatType.POSITION_ONLY);
          if (typeof this.drawLineList[i].sat2 != 'undefined' && this.drawLineList[i].sat2 != null) {
            // Satellite and Static
            if (typeof this.drawLineList[i].sat2.name != 'undefined') {
              if (typeof this.drawLineList[i].sat2.id == 'undefined' && this.drawLineList[i].sat2 != null) {
                this.drawLineList[i].sat2.id = catalogManagerInstance.getSensorFromSensorName(this.drawLineList[i].sat2.name);
              }
              this.drawLineList[i].sat2 = catalogManagerInstance.getSat(this.drawLineList[i].sat2.id);
              if (
                (!this.drawLineList[i].isCalculateIfInFOV && this.drawLineList[i].isOnlyInFOV && !inViewData[this.drawLineList[i].sat.id]) ||
                !settingsManager.isDrawInCoverageLines
              ) {
                this.drawLineList.splice(i, 1);
                continue;
              }
              if (this.drawLineList[i].isCalculateIfInFOV && this.drawLineList[i].isOnlyInFOV) {
                const staticSet = keepTrackApi.getCatalogManager().staticSet;
                Object.keys(staticSet).forEach((key) => {
                  const sensor = staticSet[key];
                  if (sensor.name == this.drawLineList[i].sat2.name) {
                    let tearr = SensorMath.getTearr(this.drawLineList[i].sat, [sensor]);
                    if (!tearr.inView || !settingsManager.isDrawInCoverageLines) {
                      this.drawLineList.splice(i, 1);
                    }
                  }
                });
              }
              this.drawLineList[i].line.set(
                [this.drawLineList[i].sat.position.x, this.drawLineList[i].sat.position.y, this.drawLineList[i].sat.position.z],
                [this.drawLineList[i].sat2.position.x, this.drawLineList[i].sat2.position.y, this.drawLineList[i].sat2.position.z]
              );
            } else {
              // Two Satellites
              this.drawLineList[i].sat2 = catalogManagerInstance.getSat(this.drawLineList[i].sat2.id, GetSatType.POSITION_ONLY);
              this.drawLineList[i].line.set(
                [this.drawLineList[i].sat.position.x, this.drawLineList[i].sat.position.y, this.drawLineList[i].sat.position.z],
                [this.drawLineList[i].sat2.position.x, this.drawLineList[i].sat2.position.y, this.drawLineList[i].sat2.position.z]
              );
            }
          } else {
            if (this.drawLineList[i].isScan) {
              let t = 0;
              while (t < 1000) {
                this.drawLineList[i].lon = <Degrees>(this.drawLineList[i].lon + settingsManager.lineScanSpeedSat);
                if (this.drawLineList[i].lon > 180) {
                  this.drawLineList[i].lon = <Degrees>-180;
                }
                if (this.drawLineList[i].lon >= 0 && this.drawLineList[i].lon < settingsManager.lineScanSpeedSat) {
                  this.drawLineList[i].lat = <Degrees>(this.drawLineList[i].lat + settingsManager.lineScanSpeedSat);
                }
                if (this.drawLineList[i].lat > 90) {
                  this.drawLineList[i].lat = <Degrees>-90;
                }

                const lla = { lat: <Radians>(this.drawLineList[i].lat * DEG2RAD), lon: <Radians>(this.drawLineList[i].lon * DEG2RAD), alt: <Kilometers>0.05 };
                const ecf = Transforms.eci2ecf(this.drawLineList[i].sat.position, 0);
                const rae = Transforms.ecf2rae(lla, ecf);
                const el = rae.el * RAD2DEG;
                if (el > settingsManager.lineScanMinEl) {
                  const pos = Transforms.lla2ecf(lla);
                  this.drawLineList[i].line.set(
                    [pos.x, pos.y, pos.z],
                    [this.drawLineList[i].sat.position.x, this.drawLineList[i].sat.position.y, this.drawLineList[i].sat.position.z]
                  );
                  break;
                }

                if (this.drawLineList[i].lat === -90) {
                  this.drawLineList[i].lat = <Degrees>(this.drawLineList[i].lat + settingsManager.lineScanSpeedSat);
                }
                if (this.drawLineList[i].lat === 90) {
                  this.drawLineList[i].lat = <Degrees>-90;
                }

                t++;
              }
            } else if (this.drawLineList[i].isScan2) {
              this.drawLineList[i].az = <Degrees>(this.drawLineList[i].az + settingsManager.lineScanSpeedRadar);
              // Normalize azimuth
              if (this.drawLineList[i].az > 360) {
                this.drawLineList[i].az = <Degrees>0;
              }
              // Is azimuth outside of FOV?
              if (
                (this.drawLineList[i].maxAz > this.drawLineList[i].minAz && this.drawLineList[i].az > this.drawLineList[i].maxAz) ||
                (this.drawLineList[i].maxAz < this.drawLineList[i].minAz &&
                  this.drawLineList[i].az > this.drawLineList[i].maxAz &&
                  this.drawLineList[i].az < this.drawLineList[i].minAz)
              ) {
                // Reset it
                this.drawLineList[i].az = this.drawLineList[i].minAz;
              }
              // Calculate ECI for that RAE coordinate
              // Adding 30km to altitude to avoid clipping the earth
              const pos = Transforms.ecf2eci(
                CoordinateTransforms.rae2ecf(
                  <Degrees>this.drawLineList[i].az,
                  <Degrees>this.drawLineList[i].minEl,
                  <Kilometers>this.drawLineList[i].maxRng,
                  <Radians>(this.drawLineList[i].sat.lat * DEG2RAD),
                  <Radians>(this.drawLineList[i].sat.lon * DEG2RAD),
                  <Kilometers>(this.drawLineList[i].sat.alt + 30)
                ),
                gmst
              );
              // Update the line
              this.drawLineList[i].line.set([pos.x, pos.y, pos.z], [this.drawLineList[i].sat.position.x, this.drawLineList[i].sat.position.y, this.drawLineList[i].sat.position.z]);
            } else {
              // Just One Satellite
              this.drawLineList[i].line.set(this.drawLineList[i].ref, [
                this.drawLineList[i].sat.position.x,
                this.drawLineList[i].sat.position.y,
                this.drawLineList[i].sat.position.z,
              ]);
            }
          }
        } else if (
          typeof this.drawLineList[i].star1 != 'undefined' &&
          typeof this.drawLineList[i].star2 != 'undefined' &&
          this.drawLineList[i].star1 != null &&
          this.drawLineList[i].star2 != null
        ) {
          // Constellation
          const dotsManagerInstance = keepTrackApi.getDotsManager();
          const starIdx1 = dotsManagerInstance.starIndex1;
          const starIdx2 = dotsManagerInstance.starIndex2;

          if (typeof this.drawLineList[i].star1ID == 'undefined') {
            this.drawLineList[i].star1ID = catalogManagerInstance.getIdFromStarName(this.drawLineList[i].star1, starIdx1, starIdx2);
          }
          if (typeof this.drawLineList[i].star2ID == 'undefined') {
            this.drawLineList[i].star2ID = catalogManagerInstance.getIdFromStarName(this.drawLineList[i].star2, starIdx1, starIdx2);
          }
          this.tempStar1_ = catalogManagerInstance.getSat(this.drawLineList[i].star1ID, GetSatType.POSITION_ONLY);
          this.tempStar2_ = catalogManagerInstance.getSat(this.drawLineList[i].star2ID, GetSatType.POSITION_ONLY);
          this.drawLineList[i].line.set(
            [this.tempStar1_.position.x, this.tempStar1_.position.y, this.tempStar1_.position.z],
            [this.tempStar2_.position.x, this.tempStar2_.position.y, this.tempStar2_.position.z]
          );
        } else {
          // Arbitrary Lines
          this.drawLineList[i].line.set(this.drawLineList[i].ref, this.drawLineList[i].ref2);
        }

        this.drawLineList[i].line.draw(this.drawLineList[i].color);
      } catch (error) {
        // DEBUG:
        // console.warn(error);
      }

      // When multiple sensors are selected it will keep creating new lines so we have to purge them
      const sensorManagerInstance = keepTrackApi.getSensorManager();
      if (sensorManagerInstance.currentSensors.length > 1 && this.drawLineList[i].isOnlyInFOV && !this.drawLineList[i].isDrawWhenSelected) {
        this.drawLineList.splice(i, 1);
      }
    }

    gl.disableVertexAttribArray(this.attribs_.a_position); // Reset
  }

  public drawWhenSelected(): void {
    for (let i = 0; i < this.drawLineList.length; i++) {
      if (this.drawLineList[i].isDrawWhenSelected) {
        this.drawLineList.splice(i, 1);
      }
    }
  }

  public getLineListLen(): number {
    return this.drawLineList.length;
  }

  setWorldUniforms(camMatrix: mat4, pMatrix: mat4) {
    const gl = this.gl_;
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, mat4.create());
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
  }

  setColorUniforms(color: vec4) {
    this.gl_.uniform4fv(this.uniforms_.u_color, color);
  }

  setAttribsAndDrawLineStrip(buffer: WebGLBuffer, segments: number) {
    const gl = this.gl_;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(this.attribs_.a_position, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.attribs_.a_position);
    gl.drawArrays(gl.LINE_STRIP, 0, segments);
    gl.disableVertexAttribArray(this.attribs_.a_position);
  }

  public removeStars(): boolean {
    let starFound = false;
    for (let i = 0; i < this.drawLineList.length; i++) {
      if (
        (typeof this.drawLineList[i].sat !== 'undefined' && this.drawLineList[i].sat.type === SpaceObjectType.STAR) ||
        (typeof this.drawLineList[i].sat2 !== 'undefined' && this.drawLineList[i].sat2.type === SpaceObjectType.STAR)
      ) {
        this.drawLineList.splice(i, 1);
        starFound = true;
      }
    }
    return starFound;
  }

  public updateLineToSat(satId: number, sensorId: number) {
    let isLineDrawnToSat = false;
    for (let i = 0; i < this.drawLineList.length; i++) {
      if (typeof this.drawLineList[i].sat == 'undefined') continue;

      if (this.drawLineList[i].sat.id == satId) {
        isLineDrawnToSat = true;
      }
    }
    if (!isLineDrawnToSat) {
      this.create('sat4', [satId, sensorId], 'g');
    }
  }

  // #endregion Public Methods (8)
}

export const lineManagerInstance = new LineManager();
keepTrackContainer.registerSingleton(Singletons.LineManager, lineManagerInstance);
