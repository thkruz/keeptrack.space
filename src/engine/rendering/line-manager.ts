/* eslint-disable max-depth */
/* eslint-disable complexity */
/* eslint-disable camelcase */
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { Singletons, SolarBody } from '@app/engine/core/interfaces';
import { BufferAttribute } from '@app/engine/rendering/buffer-attribute';
import { WebGlProgramHelper } from '@app/engine/rendering/webgl-program';
import { BaseObject, Degrees, DetailedSatellite, DetailedSensor, Kilometers, RaeVec3 } from '@ootk/src/main';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { Container } from '../core/container';
import { Scene } from '../core/scene';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { getTemeToJ2000Matrix, ReferenceFrame } from '../math/reference-frames';
import { EARTH_OBLIQUITY_RADIANS } from '../utils/constants';
import { glsl } from '../utils/development/formatter';
import { DepthManager } from './depth-manager';
import { Line, LineColor, LineColors } from './line-manager/line';
import { ObjToObjLine } from './line-manager/obj-to-obj-line';
import { OrbitPathLine } from './line-manager/orbit-path';
import { RefToRefLine } from './line-manager/ref-to-ref-line';
import { SatRicLine } from './line-manager/sat-ric-line';
import { SatScanEarthLine } from './line-manager/sat-scan-earth-line';
import { SatToCelestialBodyLine } from './line-manager/sat-to-celestial-body';
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
    u_mVMatrix: null as unknown as WebGLUniformLocation,
    u_pCamMatrix: null as unknown as WebGLUniformLocation,
    worldOffset: null as unknown as WebGLUniformLocation,
    logDepthBufFC: null as unknown as WebGLUniformLocation,
  };
  program: WebGLProgram;

  lines = <Line[]>[];

  clear(): void {
    this.lines = [];
    EventBus.getInstance().emit(EventBusEvent.onLineAdded, this);
    EventBus.getInstance().emit(EventBusEvent.onLinesCleared, this);
  }

  add(line: Line): void {
    this.lines.push(line);
    EventBus.getInstance().emit(EventBusEvent.onLineAdded, this);
  }

  createSatRicFrame(sat: DetailedSatellite | MissileObject | OemSatellite | null): void {
    if (!sat || !(sat instanceof DetailedSatellite)) {
      return;
    }

    this.add(new SatRicLine(sat, 'I', LineColors.GREEN));
    this.add(new SatRicLine(sat, 'R', LineColors.RED));
    this.add(new SatRicLine(sat, 'C', LineColors.BLUE));
  }

  createSatToRef(sat: DetailedSatellite | OemSatellite | MissileObject | null, ref: vec3, color = LineColors.PURPLE): void {
    if (!sat || !(sat instanceof DetailedSatellite || sat instanceof OemSatellite)) {
      return;
    }

    this.add(new SatToRefLine(sat, ref, color));
  }

  createSat2Sun(sat: DetailedSatellite | MissileObject | OemSatellite | null): void {
    if (!sat || !(sat instanceof DetailedSatellite || sat instanceof OemSatellite)) {
      return;
    }

    this.add(new SatToSunLine(sat));
  }

  createSat2CelestialBody(sat: DetailedSatellite | MissileObject | OemSatellite | null, body: SolarBody): void {
    if (!sat || !(sat instanceof DetailedSatellite || sat instanceof OemSatellite)) {
      return;
    }

    this.add(new SatToCelestialBodyLine(sat, body));
  }

  createRef2Ref(ref1: vec3, ref2: vec3, color: vec4): void {
    this.add(new RefToRefLine(ref1, ref2, color));
  }

  createOrbitPath(path: vec3[] | vec4[], color: vec4, solarBody = SolarBody.Sun): OrbitPathLine | null {
    if (!path || path.length === 0) {
      return null;
    }

    const orbitPathLine = new OrbitPathLine(path, color, solarBody);

    this.add(orbitPathLine);

    return orbitPathLine;
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

  createSensorToSat(sensor: DetailedSensor | null, sat: DetailedSatellite | MissileObject | OemSatellite | null, color?: vec4): void {
    if (!sensor || !sat || !(sat instanceof DetailedSatellite || sat instanceof OemSatellite)) {
      return;
    }

    this.add(new SensorToSatLine(sensor, sat, color));
  }

  createObjToObj(obj1: DetailedSatellite | OemSatellite | MissileObject | null, obj2: DetailedSatellite | MissileObject | OemSatellite | null, color?: vec4): void {
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
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    for (const sensor of sensorManagerInstance.getAllSensors()) {
      const line = new SensorToSatLine(sensor, sat, color);

      line.setDrawFovOnly(true);
      this.add(line);
    }
  }

  createGrid(type: 'x' | 'y' | 'z', color: LineColor, scalar = 1): void {
    if (type !== 'x' && type !== 'y' && type !== 'z') {
      throw new Error('Invalid type');
    }

    const num1 = 100000 / scalar;
    const num2 = num1 * 7 * scalar;
    const min = -7 * scalar;
    const max = 7 * scalar;

    // Split lines into 10 segments to reduce maximum length
    const segments = 10;
    const segmentLength = (num2 * 2) / segments; // Total length divided by segments

    switch (type) {
      case 'x':
        for (let i = min; i <= max; i++) {
          // Horizontal lines (varying x)
          for (let seg = 0; seg < segments; seg++) {
            const startX = -num2 + seg * segmentLength;
            const endX = startX + segmentLength;

            this.add(new RefToRefLine([startX, i * num1, 0], [endX, i * num1, 0], color));
          }
          // Vertical lines (varying y)
          for (let seg = 0; seg < segments; seg++) {
            const startY = -num2 + seg * segmentLength;
            const endY = startY + segmentLength;

            this.add(new RefToRefLine([i * num1, startY, 0], [i * num1, endY, 0], color));
          }
        }
        break;
      case 'y':
        for (let i = min; i <= max; i++) {
          // Lines parallel to y-axis (varying y)
          for (let seg = 0; seg < segments; seg++) {
            const startY = -num2 + seg * segmentLength;
            const endY = startY + segmentLength;

            this.add(new RefToRefLine([0, startY, i * num1], [0, endY, i * num1], color));
          }
          // Lines perpendicular to y-axis (varying z)
          for (let seg = 0; seg < segments; seg++) {
            const startZ = -num2 + seg * segmentLength;
            const endZ = startZ + segmentLength;

            this.add(new RefToRefLine([0, i * num1, startZ], [0, i * num1, endZ], color));
          }
        }
        break;
      case 'z':
        for (let i = min; i <= max; i++) {
          // Lines parallel to z-axis (varying z)
          for (let seg = 0; seg < segments; seg++) {
            const startZ = -num2 + seg * segmentLength;
            const endZ = startZ + segmentLength;

            this.add(new RefToRefLine([i * num1, 0, startZ], [i * num1, 0, endZ], color));
          }
          // Lines perpendicular to z-axis (varying x)
          for (let seg = 0; seg < segments; seg++) {
            const startX = -num2 + seg * segmentLength;
            const endX = startX + segmentLength;

            this.add(new RefToRefLine([startX, 0, i * num1], [endX, 0, i * num1], color));
          }
        }
        break;
      default:
        break;
    }
  }

  createGridRadial(params: {
    axis: 'x' | 'y' | 'z';
    color: LineColor;
    opacity?: number;
    gridRadius?: number;
    angleStep?: number;
    segments?: number;
    circleInterval?: number;
    circleSegments?: number;
    referenceFrame?: ReferenceFrame;
  }): void {
    const {
      axis,
      color,
      opacity = 1.0,
      gridRadius = 700000,
      angleStep = 20 as Degrees,
      segments = 5,
      circleInterval = 10000 as Kilometers, // Circle every 10,000km
      circleSegments = 36 as Degrees, // Number of segments per circle (10 degrees each)
      referenceFrame = ReferenceFrame.J2000,
    } = params;

    color[3] = opacity;

    if (axis !== 'x' && axis !== 'y' && axis !== 'z') {
      throw new Error('Invalid axis');
    }

    const segmentLength = gridRadius / segments;

    switch (axis) {
      case 'y':
        // Fan out in the YZ plane (perpendicular to X axis)
        for (let angle = 0; angle < 360; angle += angleStep) {
          const radians = (angle * Math.PI) / 180;

          // Create segmented radial line from origin to outer edge
          for (let seg = 0; seg < segments; seg++) {
            const startDist = Math.max(seg * segmentLength, 1000);
            const endDist = (seg + 1) * segmentLength;
            const startY = startDist * Math.cos(radians);
            const startZ = startDist * Math.sin(radians);
            const segEndY = endDist * Math.cos(radians);
            const segEndZ = endDist * Math.sin(radians);
            const radialLineSegment = new RefToRefLine([0, startY, startZ], [0, segEndY, segEndZ], color);

            radialLineSegment.referenceFrame = referenceFrame;
            this.add(radialLineSegment);
          }
        }

        // Add concentric circles
        for (let r = circleInterval; r <= gridRadius; r += circleInterval) {
          for (let i = 0; i < circleSegments; i++) {
            const angle1 = (i * 360 / circleSegments) * Math.PI / 180;
            const angle2 = ((i + 1) * 360 / circleSegments) * Math.PI / 180;

            const y1 = r * Math.cos(angle1);
            const z1 = r * Math.sin(angle1);
            const y2 = r * Math.cos(angle2);
            const z2 = r * Math.sin(angle2);
            const radialLineSegment = new RefToRefLine([0, y1, z1], [0, y2, z2], color);

            radialLineSegment.referenceFrame = referenceFrame;
            this.add(radialLineSegment);
          }
        }
        break;

      case 'z':
        // Fan out in the XZ plane (perpendicular to Y axis)
        for (let angle = 0; angle < 360; angle += angleStep) {
          const radians = (angle * Math.PI) / 180;

          // Create segmented radial line from origin to outer edge
          for (let seg = 0; seg < segments; seg++) {
            const startDist = Math.max(seg * segmentLength, 1000);
            const endDist = (seg + 1) * segmentLength;
            const startX = startDist * Math.cos(radians);
            const startZ = startDist * Math.sin(radians);
            const segEndX = endDist * Math.cos(radians);
            const segEndZ = endDist * Math.sin(radians);
            const radialLineSegment = new RefToRefLine([startX, 0, startZ], [segEndX, 0, segEndZ], color);

            radialLineSegment.referenceFrame = referenceFrame;
            this.add(radialLineSegment);
          }
        }

        // Add concentric circles
        for (let r = circleInterval; r <= gridRadius; r += circleInterval) {
          for (let i = 0; i < circleSegments; i++) {
            const angle1 = (i * 360 / circleSegments) * Math.PI / 180;
            const angle2 = ((i + 1) * 360 / circleSegments) * Math.PI / 180;

            const x1 = r * Math.cos(angle1);
            const z1 = r * Math.sin(angle1);
            const x2 = r * Math.cos(angle2);
            const z2 = r * Math.sin(angle2);
            const radialLineSegment = new RefToRefLine([x1, 0, z1], [x2, 0, z2], color);

            radialLineSegment.referenceFrame = referenceFrame;
            this.add(radialLineSegment);
          }
        }
        break;

      case 'x':
        // Fan out in the XY plane (perpendicular to Z axis)
        for (let angle = 0; angle < 360; angle += angleStep) {
          const radians = (angle * Math.PI) / 180;

          // Create segmented radial line from origin to outer edge
          for (let seg = 0; seg < segments; seg++) {
            const startDist = Math.max(seg * segmentLength, 1000);
            const endDist = (seg + 1) * segmentLength;
            const startX = startDist * Math.cos(radians);
            const startY = startDist * Math.sin(radians);
            const segEndX = endDist * Math.cos(radians);
            const segEndY = endDist * Math.sin(radians);
            const radialLineSegment = new RefToRefLine([startX, startY, 0], [segEndX, segEndY, 0], color);

            radialLineSegment.referenceFrame = referenceFrame;
            this.add(radialLineSegment);
          }
        }

        // Add concentric circles
        for (let r = circleInterval; r <= gridRadius; r += circleInterval) {
          for (let i = 0; i < circleSegments; i++) {
            const angle1 = (i * 360 / circleSegments) * Math.PI / 180;
            const angle2 = ((i + 1) * 360 / circleSegments) * Math.PI / 180;

            const x1 = r * Math.cos(angle1);
            const y1 = r * Math.sin(angle1);
            const x2 = r * Math.cos(angle2);
            const y2 = r * Math.sin(angle2);
            const radialLineSegment = new RefToRefLine([x1, y1, 0], [x2, y2, 0], color);

            radialLineSegment.referenceFrame = referenceFrame;
            this.add(radialLineSegment);
          }
        }
        break;

      default:
        break;
    }
  }

  draw(projectionCameraMatrix: mat4, tgtBuffer = null as WebGLFramebuffer | null): void {
    if (this.lines.length === 0) {
      return;
    }

    const modelViewMatrix = mat4.create();
    const gl = ServiceLocator.getRenderer().gl;

    // Default to 1 so no transformation
    mat4.identity(modelViewMatrix);

    this.runBeforeDraw(modelViewMatrix, projectionCameraMatrix, tgtBuffer);

    for (let i = this.lines.length - 1; i >= 0; i--) {
      if (this.lines[i].isGarbage) {
        this.lines.splice(i, 1);
      }
    }

    const temeLines = this.lines.filter((line) => line.referenceFrame === 'TEME');
    const j2000Lines = this.lines.filter((line) => line.referenceFrame === 'J2000');

    for (const line of temeLines) {
      line.draw(gl, this);
    }


    // Apply ecliptic rotation to modelMatrix
    // TEME to J2000 transformation
    const temeToJ2000Matrix = getTemeToJ2000Matrix(ServiceLocator.getTimeManager().simulationTimeObj);

    mat4.rotateX(temeToJ2000Matrix, temeToJ2000Matrix, EARTH_OBLIQUITY_RADIANS);

    gl.uniformMatrix4fv(this.uniforms_.u_mVMatrix, false, temeToJ2000Matrix);

    for (const line of j2000Lines) {
      line.draw(gl, this);
    }

    this.runAfterDraw();
  }

  update(): void {
    for (const line of this.lines) {
      line.update();
    }
  }

  runBeforeDraw(modelViewMatrix: mat4, projectionCameraMatrix: mat4, tgtBuffer: WebGLFramebuffer | null) {
    const { gl } = ServiceLocator.getRenderer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    gl.useProgram(this.program);

    gl.enable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    this.setWorldUniforms(modelViewMatrix, projectionCameraMatrix);

    gl.enableVertexAttribArray(this.attribs.a_position.location); // Enable
  }

  runAfterDraw() {
    const gl = ServiceLocator.getRenderer().gl;

    gl.enable(gl.DEPTH_TEST);
    gl.disableVertexAttribArray(this.attribs.a_position.location); // Disable
  }

  init() {
    const gl = ServiceLocator.getRenderer().gl;

    this.program = new WebGlProgramHelper(gl, this.shaders_.vert, this.shaders_.frag, this.attribs, this.uniforms_).program;

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (sat: BaseObject) => {
        if (sat) {
          const sensor = ServiceLocator.getSensorManager().getSensor();

          this.createSensorToSatFovAndSelectedOnly(sensor, sat as DetailedSatellite);
        }
      },
    );
  }

  setAttribsAndDrawLineStrip(buffer: WebGLBuffer, segments: number) {
    const gl = ServiceLocator.getRenderer().gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(this.attribs.a_position.location, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.attribs.a_position.location);

    // Validate the buffer has enough data
    // DEBUGGING CODE - Uncomment if needed
    // const bufferSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
    // const requiredSize = segments * 4 * Float32Array.BYTES_PER_ELEMENT;
    // if (bufferSize < requiredSize) {
    //   console.warn(`LineManager: Buffer size (${bufferSize} bytes) is less than required size (${requiredSize} bytes). Adjusting segments to fit buffer.`);
    //   segments = Math.floor(bufferSize / (4 * Float32Array.BYTES_PER_ELEMENT));
    // }

    gl.drawArrays(gl.LINE_STRIP, 0, segments);
    gl.disableVertexAttribArray(this.attribs.a_position.location);
  }

  setColorUniforms(color: vec4) {
    const gl = ServiceLocator.getRenderer().gl;

    gl.uniform4fv(this.uniforms_.u_color, color);
  }

  setWorldUniforms(modelViewMatrix: mat4, projectionCameraMatrix: mat4) {
    const gl = ServiceLocator.getRenderer().gl;

    gl.uniformMatrix4fv(this.uniforms_.u_pCamMatrix, false, projectionCameraMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_mVMatrix, false, modelViewMatrix);
    gl.uniform1f(this.uniforms_.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
    gl.uniform3fv(this.uniforms_.worldOffset, Scene.getInstance().worldShift ?? [0, 0, 0]);
  }

  private readonly shaders_ = {
    frag: glsl`#version 300 es
      precision highp float;

      in vec4 vColor;
      in float vAlpha;

      uniform float logDepthBufFC;

      out vec4 fragColor;

      void main(void) {
        fragColor = vec4(vColor[0],vColor[1],vColor[2], vColor[3] * vAlpha);

        ${DepthManager.getLogDepthFragCode()}
      }
      `,
    vert: glsl`#version 300 es
      precision highp float;

      in vec4 a_position;

      uniform vec4 u_color;
      uniform mat4 u_mVMatrix;
      uniform mat4 u_pCamMatrix;
      uniform vec3 worldOffset;
      uniform float logDepthBufFC;

      out vec4 vColor;
      out float vAlpha;

      void main(void) {
          // Apply offset in world space, then transform
          vec4 worldPosition = u_mVMatrix * vec4(a_position.xyz, 1.0);
          vec4 position = u_pCamMatrix * vec4(worldPosition.xyz + worldOffset, 1.0);
          gl_Position = position;

          ${DepthManager.getLogDepthVertCode()}

          vColor = u_color;
          vAlpha = a_position[3];
      }
      `,
  };
}

export const lineManagerInstance = new LineManager();
Container.getInstance().registerSingleton(Singletons.LineManager, lineManagerInstance);
