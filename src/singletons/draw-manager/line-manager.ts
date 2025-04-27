/* eslint-disable max-depth */
/* eslint-disable complexity */
/* eslint-disable camelcase */
import { KeepTrackApiEvents, Singletons } from '@app/interfaces';
import { BaseObject, DetailedSatellite, DetailedSensor, RaeVec3 } from 'ootk';

import { keepTrackApi } from '@app/keepTrackApi';
import { BufferAttribute } from '@app/static/buffer-attribute';
import { WebGlProgramHelper } from '@app/static/webgl-program';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { keepTrackContainer } from '../../container';
import { MissileObject } from '../catalog-manager/MissileObject';
import { Line, LineColor, LineColors } from './line-manager/line';
import { ObjToObjLine } from './line-manager/obj-to-obj-line';
import { RefToRefLine } from './line-manager/ref-to-ref-line';
import { SatRicLine } from './line-manager/sat-ric-line';
import { SatScanEarthLine } from './line-manager/sat-scan-earth-line';
import { SatToRefLine } from './line-manager/sat-to-ref-line';
import { SatToSunLine } from './line-manager/sat-to-sun-line';
import { SensorScanHorizonLine } from './line-manager/sensor-scan-horizon-line';
import { SensorToMoonLine } from './line-manager/sensor-to-moon-line';
import { SensorToRaeLine } from './line-manager/sensor-to-rae-line';
import { SensorToSatLine } from './line-manager/sensor-to-sat-line';
import { SensorToSunLine } from './line-manager/sensor-to-sun-line';

export class LineManager {
  attribs = {
    a_position: new BufferAttribute({
      location: 0,
      vertices: 4,
      offset: 0,
      stride: 0,
    }),
  };
  uniforms_ = {
    u_color: null as unknown as WebGLUniformLocation,
    u_camMatrix: null as unknown as WebGLUniformLocation,
    u_pMatrix: null as unknown as WebGLUniformLocation,
  };
  program: WebGLProgram;

  lines = <Line[]>[];

  clear(): void {
    this.lines = [];
    keepTrackApi.runEvent(KeepTrackApiEvents.onLineAdded, keepTrackApi.getLineManager());
  }

  add(line: Line): void {
    this.lines.push(line);
    keepTrackApi.runEvent(KeepTrackApiEvents.onLineAdded, this);
  }

  createSatRicFrame(sat: DetailedSatellite | MissileObject | null): void {
    if (!sat || !(sat instanceof DetailedSatellite)) {
      return;
    }

    this.add(new SatRicLine(sat, 'I', LineColors.GREEN));
    this.add(new SatRicLine(sat, 'R', LineColors.RED));
    this.add(new SatRicLine(sat, 'C', LineColors.BLUE));
  }

  createSatToRef(sat: DetailedSatellite | MissileObject | null, ref: vec3, color = LineColors.PURPLE): void {
    if (!sat || !(sat instanceof DetailedSatellite)) {
      return;
    }

    this.add(new SatToRefLine(sat, ref, color));
  }

  createSat2Sun(sat: DetailedSatellite | MissileObject | null): void {
    if (!sat || !(sat instanceof DetailedSatellite)) {
      return;
    }

    this.add(new SatToSunLine(sat));
  }

  createRef2Ref(ref1: vec3, ref2: vec3, color: vec4): void {
    this.add(new RefToRefLine(ref1, ref2, color));
  }

  createSensorToSun(sensor: DetailedSensor | null): void {
    if (!sensor) {
      return;
    }
    this.add(new SensorToSunLine(sensor));
  }

  createSensorToMoon(sensor: DetailedSensor | null): void {
    if (!sensor) {
      return;
    }
    this.add(new SensorToMoonLine(sensor));
  }

  createSatScanEarth(sat: DetailedSatellite | null, color?: vec4): void {
    if (!sat) {
      return;
    }
    this.add(new SatScanEarthLine(sat, color));
  }

  createSensorScanHorizon(sensor: DetailedSensor | null, face = 1, faces = 2, color = LineColors.CYAN): void {
    if (!sensor) {
      return;
    }

    this.add(new SensorScanHorizonLine(sensor, face, faces, color));
  }

  createSensorToRae(sensor: DetailedSensor | null, rae: RaeVec3, color?: vec4): void {
    if (!sensor) {
      return;
    }

    this.add(new SensorToRaeLine(sensor, rae, color));
  }

  createSensorToSat(sensor: DetailedSensor | null, sat: DetailedSatellite | MissileObject | null, color?: vec4): void {
    if (!sensor || !sat || !(sat instanceof DetailedSatellite)) {
      return;
    }

    this.add(new SensorToSatLine(sensor, sat, color));
  }

  createObjToObj(obj1: DetailedSatellite | MissileObject | null, obj2: DetailedSatellite | MissileObject | null, color?: vec4): void {
    if (!obj1 || !obj2) {
      return;
    }
    this.add(new ObjToObjLine(obj1, obj2, color));
  }

  createSensorToSatFovOnly(sensor: DetailedSensor | null, sat: DetailedSatellite | null, color?: vec4): void {
    if (!sensor || !sat) {
      return;
    }

    const line = new SensorToSatLine(sensor, sat, color);

    line.setDrawFovOnly(true);
    this.add(line);
  }

  createSensorToSatFovAndSelectedOnly(sensor: DetailedSensor | null, sat: DetailedSatellite | null, color?: vec4): void {
    if (!sensor || !sat || !(sat instanceof DetailedSatellite)) {
      return;
    }

    const line = new SensorToSatLine(sensor, sat, color);

    line.setDrawFovOnly(true);
    line.setDrawSelectedOnly(true);
    this.add(line);
  }

  createSensorsToSatFovOnly(sat: DetailedSatellite, color?: vec4): void {
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    for (const sensor of sensorManagerInstance.getAllSensors()) {
      const line = new SensorToSatLine(sensor, sat, color);

      line.setDrawFovOnly(true);
      this.add(line);
    }
  }

  createGrid(type: 'x' | 'y' | 'z', color?: LineColor, scalar = 1): void {
    if (type !== 'x' && type !== 'y' && type !== 'z') {
      throw new Error('Invalid type');
    }

    const num1 = 10000 / scalar;
    const num2 = num1 * 7 * scalar;
    const min = -7 * scalar;
    const max = 7 * scalar;

    switch (type) {
      case 'x':
        for (let i = min; i <= max; i++) {
          this.add(new RefToRefLine([num2, i * num1, 0], [-num2, i * num1, 0], color));
          this.add(new RefToRefLine([i * num1, num2, 0], [i * num1, -num2, 0], color));
        }
        break;
      case 'y':
        for (let i = min; i <= max; i++) {
          this.add(new RefToRefLine([0, num2, i * num1], [0, -num2, i * num1], color));
          this.add(new RefToRefLine([0, i * num1, num2], [0, i * num1, -num2], color));
        }
        break;
      case 'z':
        for (let i = min; i <= max; i++) {
          this.add(new RefToRefLine([num2, 0, i * num1], [-num2, 0, i * num1], color));
          this.add(new RefToRefLine([i * num1, num2, 0], [i * num1, -num2, 0], color));
        }
        break;
      default:
        break;
    }
  }

  draw(tgtBuffer = null as WebGLFramebuffer | null): void {
    if (this.lines.length === 0) {
      return;
    }

    this.runBeforeDraw(tgtBuffer);

    for (let i = this.lines.length - 1; i >= 0; i--) {
      if (this.lines[i].isGarbage) {
        this.lines.splice(i, 1);
      }
    }

    for (const line of this.lines) {
      line.draw(this);
    }

    this.runAfterDraw();
  }

  update(): void {
    for (const line of this.lines) {
      line.update();
    }
  }

  runBeforeDraw(tgtBuffer = null as WebGLFramebuffer | null): void {
    const { projectionMatrix, gl } = keepTrackApi.getRenderer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    gl.useProgram(this.program);

    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, keepTrackApi.getMainCamera().camMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, projectionMatrix);

    gl.enableVertexAttribArray(this.attribs.a_position.location); // Enable
  }

  runAfterDraw() {
    const gl = keepTrackApi.getRenderer().gl;

    gl.disableVertexAttribArray(this.attribs.a_position.location); // Disable
  }

  init() {
    const gl = keepTrackApi.getRenderer().gl;

    this.program = new WebGlProgramHelper(gl, this.shaders_.vert, this.shaders_.frag, this.attribs, this.uniforms_).program;

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: 'LineManager',
      cb: (sat: BaseObject) => {
        if (sat) {
          const sensor = keepTrackApi.getSensorManager().getSensor();

          this.createSensorToSatFovAndSelectedOnly(sensor, sat as DetailedSatellite);
        }
      },
    });
  }

  setAttribsAndDrawLineStrip(buffer: WebGLBuffer, segments: number) {
    const gl = keepTrackApi.getRenderer().gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(this.attribs.a_position.location, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.attribs.a_position.location);
    gl.drawArrays(gl.LINE_STRIP, 0, segments);
    gl.disableVertexAttribArray(this.attribs.a_position.location);
  }

  setColorUniforms(color: vec4) {
    const gl = keepTrackApi.getRenderer().gl;

    gl.uniform4fv(this.uniforms_.u_color, color);
  }

  setWorldUniforms(camMatrix: mat4, pMatrix: mat4) {
    const gl = keepTrackApi.getRenderer().gl;

    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
  }

  private shaders_ = {
    frag: keepTrackApi.glsl`#version 300 es
      precision mediump float;

      in vec4 vColor;
      in float vAlpha;

      out vec4 fragColor;

      void main(void) {
        fragColor = vec4(vColor[0],vColor[1],vColor[2], vColor[3] * vAlpha);
      }
      `,
    vert: keepTrackApi.glsl`#version 300 es
      in vec4 a_position;

      uniform vec4 u_color;
      uniform mat4 u_camMatrix;
      uniform mat4 u_pMatrix;

      out vec4 vColor;
      out float vAlpha;

      void main(void) {
          vec4 position = u_pMatrix * u_camMatrix * vec4(a_position[0],a_position[1],a_position[2], 1.0);
          gl_Position = position;
          vColor = u_color;
          vAlpha = a_position[3];
      }
      `,
  };
}

export const lineManagerInstance = new LineManager();
keepTrackContainer.registerSingleton(Singletons.LineManager, lineManagerInstance);
