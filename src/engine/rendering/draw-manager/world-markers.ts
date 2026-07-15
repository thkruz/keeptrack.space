import { ServiceLocator } from '@app/engine/core/service-locator';
import { settingsManager } from '@app/settings/settings';
import { DEG2RAD, Kilometers, lla2eci, Radians } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { SelectSatManager } from '../../../plugins/select-sat-manager/select-sat-manager';
import { CameraType } from '../../camera/camera-type';
import { PluginRegistry } from '../../core/plugin-registry';
import { glsl } from '../../utils/development/formatter';
import { DepthManager } from '../depth-manager';

/**
 * WorldMarkers — soft, depth-occluded sprites drawn at ECI positions.
 *
 * A tiny points pass that reuses the dots' ECI→clip transform (a_position + worldOffset,
 * projected by the projection·view·camera matrix, log-depth encoded) so markers share the
 * scene's depth and are correctly hidden behind the globe. It backs two companion-driven
 * features, both off in stock OSS:
 *
 *  - "You are here": a green map-PIN glyph at settingsManager.observerMarkerLla (lat/lon,
 *    deg). Null → nothing drawn. The companion feeds the GPS observer via the embed bridge.
 *  - Selected-satellite glow: a red pulsing halo around the selected sat in non-ride-along
 *    views, gated by settingsManager.isDrawSelectionGlow. Mirrors the 2D map's live marker.
 *
 * Each marker carries a SHAPE (0 = soft glow disc, 1 = map pin), so one pass renders both.
 * The pulse is a smooth sine (no sawtooth snap) to match the 2D map's smoothed pulse.
 */

// 9 floats per marker vertex: position(3) + size(1) + color(4) + shape(1).
const FLOATS_PER_MARKER = 9;
const MAX_MARKERS = 2;
const PULSE_PERIOD_MS = 2000;
const SHAPE_GLOW = 0;
const SHAPE_PIN = 1;
// Lift the ground marker a hair above the surface so it depth-tests as "in front" on the
// near side (and behind the globe on the far side) without z-fighting the earth mesh.
const OBSERVER_ALT_KM = 40 as Kilometers;

// Colors: red selection (matches selectedColor / orbitSelectColor), green observer pin
// (matches the 2D map's #2fd6a2 observer).
const SELECTION_RGB: [number, number, number] = [1.0, 0.0, 0.0];
const OBSERVER_RGB: [number, number, number] = [47 / 255, 214 / 255, 162 / 255];

interface MarkerSpec {
  x: number; y: number; z: number; // ECI km
  size: number; // point size (device px)
  r: number; g: number; b: number; a: number;
  shape: number; // SHAPE_GLOW | SHAPE_PIN
}

export class WorldMarkers {
  private gl_!: WebGL2RenderingContext;
  private program_: WebGLProgram | null = null;
  private vao_: WebGLVertexArrayObject | null = null;
  private buffer_: WebGLBuffer | null = null;
  private uPMvCamMatrix_: WebGLUniformLocation | null = null;
  private uWorldOffset_: WebGLUniformLocation | null = null;
  private uLogDepthBufFC_: WebGLUniformLocation | null = null;
  private maxPointSize_ = 64;
  private isLoaded_ = false;
  private readonly data_ = new Float32Array(MAX_MARKERS * FLOATS_PER_MARKER);

  private readonly vertShader_ = glsl`#version 300 es
    precision highp float;
    in vec3 a_position;
    in float a_size;
    in vec4 a_color;
    in float a_shape;
    uniform vec3 worldOffset;
    uniform mat4 u_pMvCamMatrix;
    uniform float logDepthBufFC;
    out vec4 vColor;
    out float vShape;

    void main(void) {
      vec3 eciPos = a_position + worldOffset;
      gl_Position = u_pMvCamMatrix * vec4(eciPos, 1.0);
      ${DepthManager.getLogDepthVertCode()}
      gl_PointSize = a_size;
      vColor = a_color;
      vShape = a_shape;
    }
  `;

  private readonly fragShader_ = glsl`#version 300 es
    precision highp float;
    in vec4 vColor;
    in float vShape;
    out vec4 fragColor;

    // gl_PointCoord: (0,0) top-left .. (1,1) bottom-left; y increases DOWN the screen.
    void main(void) {
      vec2 p = gl_PointCoord;

      if (vShape > 0.5) {
        // ---- Map pin: teardrop head above, tip anchored at the sprite centre (the
        // ground point), with a see-through hole in the head. Uses only the top half. ----
        vec2 headC = vec2(0.5, 0.28);
        float headR = 0.20;
        vec2 tip = vec2(0.5, 0.5);
        float dHead = length(p - headC) - headR;
        float t = clamp((p.y - headC.y) / (tip.y - headC.y), 0.0, 1.0);
        float halfW = headR * (1.0 - t);
        float dBody = max(abs(p.x - 0.5) - halfW, max(headC.y - p.y, p.y - tip.y));
        float d = min(dHead, dBody);
        float pin = 1.0 - smoothstep(-0.02, 0.02, d);
        float hole = smoothstep(0.06, 0.09, length(p - headC)); // transparent centre
        float a = vColor.a * pin * hole;
        if (a < 0.01) { discard; }
        fragColor = vec4(vColor.rgb, a);
      } else {
        // ---- Soft radial glow: bright core, smooth falloff to a transparent rim. ----
        vec2 pc = p * 2.0 - 1.0;
        float glow = 1.0 - smoothstep(0.0, 1.0, length(pc));
        glow = pow(glow, 1.6);
        if (glow < 0.01) { discard; }
        fragColor = vec4(vColor.rgb, vColor.a * glow);
      }
    }
  `;

  init(gl: WebGL2RenderingContext): void {
    this.gl_ = gl;

    const program = this.compileProgram_(gl, this.vertShader_, this.fragShader_);

    if (!program) {
      return;
    }
    this.program_ = program;

    this.uPMvCamMatrix_ = gl.getUniformLocation(program, 'u_pMvCamMatrix');
    this.uWorldOffset_ = gl.getUniformLocation(program, 'worldOffset');
    this.uLogDepthBufFC_ = gl.getUniformLocation(program, 'logDepthBufFC');

    const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array;

    if (range?.length === 2 && range[1] > 0) {
      this.maxPointSize_ = range[1];
    }

    this.vao_ = gl.createVertexArray();
    this.buffer_ = gl.createBuffer();
    gl.bindVertexArray(this.vao_);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer_);
    gl.bufferData(gl.ARRAY_BUFFER, this.data_.byteLength, gl.DYNAMIC_DRAW);

    const b = Float32Array.BYTES_PER_ELEMENT;
    const stride = FLOATS_PER_MARKER * b;

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, stride, 3 * b);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 4 * b);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 8 * b);
    gl.bindVertexArray(null);

    this.isLoaded_ = true;
  }

  draw(pMvCamMatrix: mat4, worldShift: [number, number, number], targetBuffer: WebGLFramebuffer | null): void {
    if (!this.isLoaded_ || !this.program_) {
      return;
    }

    const markers = this.collectMarkers_();

    if (markers.length === 0) {
      return;
    }

    for (let i = 0; i < markers.length; i++) {
      const m = markers[i];
      const o = i * FLOATS_PER_MARKER;

      this.data_[o] = m.x;
      this.data_[o + 1] = m.y;
      this.data_[o + 2] = m.z;
      this.data_[o + 3] = Math.min(m.size, this.maxPointSize_);
      this.data_[o + 4] = m.r;
      this.data_[o + 5] = m.g;
      this.data_[o + 6] = m.b;
      this.data_[o + 7] = m.a;
      this.data_[o + 8] = m.shape;
    }

    const gl = this.gl_;

    gl.bindFramebuffer(gl.FRAMEBUFFER, targetBuffer);
    gl.useProgram(this.program_);

    gl.uniformMatrix4fv(this.uPMvCamMatrix_, false, pMvCamMatrix);
    gl.uniform3fv(this.uWorldOffset_, worldShift ?? [0, 0, 0]);
    gl.uniform1f(this.uLogDepthBufFC_, DepthManager.getConfig().logDepthBufFC);

    // Alpha blend (solid pin + translucent glow), depth-tested against the globe (LEQUAL
    // to match log depth) but not depth-writing — markers must not occlude the dots/mesh.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);

    gl.bindVertexArray(this.vao_);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer_);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data_.subarray(0, markers.length * FLOATS_PER_MARKER));
    gl.drawArrays(gl.POINTS, 0, markers.length);
    gl.bindVertexArray(null);

    // Restore the shared defaults other passes assume.
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  private collectMarkers_(): MarkerSpec[] {
    const markers: MarkerSpec[] = [];
    // Smooth 0..1 sine pulse (matches the 2D map's smoothed marker pulse).
    const pulse = 0.5 + 0.5 * Math.sin((performance.now() % PULSE_PERIOD_MS) / PULSE_PERIOD_MS * Math.PI * 2.0);

    // --- Selected-satellite glow (non-ride-along views only) --------------------
    if (settingsManager.isDrawSelectionGlow) {
      const camType = ServiceLocator.getMainCamera()?.cameraType;
      const isRideAlong = camType === CameraType.FIXED_TO_SAT_LVLH ||
        camType === CameraType.FIXED_TO_SAT_ECI ||
        camType === CameraType.SATELLITE_FIRST_PERSON;

      if (!isRideAlong) {
        const sel = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

        if (sel && Number(sel.id) > -1 && sel.position) {
          markers.push({
            x: sel.position.x, y: sel.position.y, z: sel.position.z,
            size: 26 + 20 * pulse,
            r: SELECTION_RGB[0], g: SELECTION_RGB[1], b: SELECTION_RGB[2],
            a: 0.35 + 0.35 * pulse,
            shape: SHAPE_GLOW,
          });
        }
      }
    }

    // --- "You are here" observer pin --------------------------------------------
    const lla = settingsManager.observerMarkerLla;

    if (lla && Number.isFinite(lla.lat) && Number.isFinite(lla.lon)) {
      const gmst = ServiceLocator.getTimeManager().gmst;
      const eci = lla2eci({ lat: (lla.lat * DEG2RAD) as Radians, lon: (lla.lon * DEG2RAD) as Radians, alt: OBSERVER_ALT_KM }, gmst);

      markers.push({
        x: eci.x, y: eci.y, z: eci.z,
        size: 52, // larger: the pin glyph only uses the sprite's top half (tip at centre)
        r: OBSERVER_RGB[0], g: OBSERVER_RGB[1], b: OBSERVER_RGB[2],
        a: 0.95,
        shape: SHAPE_PIN,
      });
    }

    return markers;
  }

  private compileProgram_(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): WebGLProgram | null {
    const compile = (type: number, src: string): WebGLShader | null => {
      const shader = gl.createShader(type);

      if (!shader) {
        return null;
      }
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);

        return null;
      }

      return shader;
    };

    const vert = compile(gl.VERTEX_SHADER, vertSrc);
    const frag = compile(gl.FRAGMENT_SHADER, fragSrc);

    if (!vert || !frag) {
      return null;
    }

    const program = gl.createProgram();

    if (!program) {
      return null;
    }
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    // Match the interleaved buffer layout (position/size/color/shape at 0/1/2/3).
    gl.bindAttribLocation(program, 0, 'a_position');
    gl.bindAttribLocation(program, 1, 'a_size');
    gl.bindAttribLocation(program, 2, 'a_color');
    gl.bindAttribLocation(program, 3, 'a_shape');
    gl.linkProgram(program);
    gl.deleteShader(vert);
    gl.deleteShader(frag);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);

      return null;
    }

    return program;
  }
}
