/**
 * Optional off-screen "scenery target": a floating-point colour and a depth texture that the Sun,
 * skybox, planets, Earth surface, Moon, atmosphere and aurora render into, followed by one
 * full-screen resolve to the canvas.
 *
 * Convention for the target's contents: gamma-encoded, scene-referred colour. These are the same
 * values the existing shaders write to an 8-bit canvas, except that values above 1.0 are allowed
 * and preserved. A plugin supplies the resolve step through {@link SceneryTargetHook}; the engine
 * knows nothing about what the resolve does to the colour. The engine owns the parts that must be
 * right regardless of the plugin:
 *   - depth is copied from the depth texture into the canvas depth buffer by writing gl_FragDepth
 *     (depth test ALWAYS, depth write on), so dots, orbits, lines and meshes drawn afterwards
 *     depth-test against the Earth and Moon as they do without the target;
 *   - a bloom chain (bright pass above `bloomThreshold` in linear light, five-level 13-tap
 *     downsample, tent upsample) whose result the hook receives as `bloom`;
 *   - allocation, resize, context loss and the fallback to the plain frame when the float
 *     formats are not available or a framebuffer is incomplete.
 */

/** Number of levels in the bloom pyramid. Level 0 is half the drawing-buffer size. */
export const SCENERY_BLOOM_LEVELS = 5;

export interface SceneryTargetSettings {
  /** Scale on the bloom added by the resolve. 0 skips the bloom chain entirely. */
  bloomIntensity: number;
  /** Tent radius of the upsample, in texels of the source level (1 is the plain tent). */
  bloomRadius: number;
  /** Linear value above which the bright pass lets light into the bloom. */
  bloomThreshold: number;
  /** Exponent used to go from the encoded values to linear light for the bright pass. */
  gamma: number;
  /** Multiplier for the Sun disc (encoded value) in the godrays composite. 1 leaves it alone. */
  sunBoost: number;
}

export interface SceneryResolveContext {
  /** Drawing-buffer size of the target. */
  width: number;
  height: number;
}

/**
 * Supplied by the plugin that owns the look of the resolve. `resolveSource` is GLSL ES 3.00 that
 * declares its own uniforms and defines
 *
 *   vec3 sceneryResolve(vec3 sceneEncoded, vec3 bloomLinear, vec2 fragCoord)
 *
 * returning the final display-encoded colour. The engine wraps it in a `main` that fetches the
 * scene colour and depth, samples the bloom, and writes `gl_FragDepth`.
 */
export interface SceneryTargetHook {
  /** True when the target should be used this frame. */
  isEnabled(): boolean;
  resolveSource: string;
  /** Extra uniform names declared by `resolveSource` (looked up on the resolve program). */
  uniformNames: string[];
  getSettings(): SceneryTargetSettings;
  /** Called with the resolve program in use, before the draw; set the hook's uniforms here. */
  bind(gl: WebGL2RenderingContext, uniforms: Record<string, WebGLUniformLocation | null>, ctx: SceneryResolveContext): void;
}

export type SceneryTargetStatus = 'idle' | 'active' | 'unsupported' | 'incomplete' | 'error';

export interface SceneryAttachmentPlan {
  width: number;
  height: number;
  /** Size of each bloom level, level 0 first. */
  bloom: Array<{ width: number; height: number }>;
}

/** Sizes of every attachment for a drawing buffer, or null for an empty (zero-size) buffer. */
export const planSceneryAttachments = (width: number, height: number, levels = SCENERY_BLOOM_LEVELS): SceneryAttachmentPlan | null => {
  const w = Math.floor(width);
  const h = Math.floor(height);

  if (!(w > 0) || !(h > 0)) {
    return null;
  }

  const bloom: SceneryAttachmentPlan['bloom'] = [];
  let bw = w;
  let bh = h;

  for (let i = 0; i < levels; i++) {
    bw = Math.max(1, Math.floor(bw / 2));
    bh = Math.max(1, Math.floor(bh / 2));
    bloom.push({ width: bw, height: bh });
  }

  return { width: w, height: h, bloom };
};

/** True when two plans need the same allocations. */
export const isSamePlan = (a: SceneryAttachmentPlan | null, b: SceneryAttachmentPlan | null): boolean => !!a && !!b && a.width === b.width && a.height === b.height;

/** Name of the extension that makes RGBA16F renderable, or null when the context has neither. */
export const findFloatColorExtension = (gl: Pick<WebGL2RenderingContext, 'getExtension'>): 'EXT_color_buffer_float' | 'EXT_color_buffer_half_float' | null => {
  if (gl.getExtension('EXT_color_buffer_float')) {
    return 'EXT_color_buffer_float';
  }
  if (gl.getExtension('EXT_color_buffer_half_float')) {
    return 'EXT_color_buffer_half_float';
  }

  return null;
};

const FULLSCREEN_VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

const DOWN_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uSrcTexel;
uniform vec2 uDstSize;
uniform float uIsFirst;
uniform float uThreshold;
uniform float uGamma;
out vec4 fragColor;

vec3 fetchTap(vec2 uv) {
  vec3 c = texture(uSrc, uv).rgb;
  if (uIsFirst > 0.5) {
    // Bright pass: only light above the threshold in linear terms reaches the bloom.
    c = max(pow(max(c, vec3(0.0)), vec3(uGamma)) - vec3(uThreshold), vec3(0.0));
    c = min(c, vec3(64.0));
  }
  return c;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uDstSize;
  vec2 t = uSrcTexel;
  vec3 a = fetchTap(uv + t * vec2(-2.0, 2.0));
  vec3 b = fetchTap(uv + t * vec2(0.0, 2.0));
  vec3 c = fetchTap(uv + t * vec2(2.0, 2.0));
  vec3 d = fetchTap(uv + t * vec2(-2.0, 0.0));
  vec3 e = fetchTap(uv);
  vec3 f = fetchTap(uv + t * vec2(2.0, 0.0));
  vec3 g = fetchTap(uv + t * vec2(-2.0, -2.0));
  vec3 h = fetchTap(uv + t * vec2(0.0, -2.0));
  vec3 i = fetchTap(uv + t * vec2(2.0, -2.0));
  vec3 j = fetchTap(uv + t * vec2(-1.0, 1.0));
  vec3 k = fetchTap(uv + t * vec2(1.0, 1.0));
  vec3 l = fetchTap(uv + t * vec2(-1.0, -1.0));
  vec3 m = fetchTap(uv + t * vec2(1.0, -1.0));
  vec3 r = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  fragColor = vec4(r, 1.0);
}
`;

const UP_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uSrcTexel;
uniform vec2 uDstSize;
uniform float uRadius;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uDstSize;
  vec2 o = uSrcTexel * uRadius;
  vec3 r = texture(uSrc, uv).rgb * 4.0;
  r += texture(uSrc, uv + vec2(-o.x, 0.0)).rgb * 2.0;
  r += texture(uSrc, uv + vec2(o.x, 0.0)).rgb * 2.0;
  r += texture(uSrc, uv + vec2(0.0, -o.y)).rgb * 2.0;
  r += texture(uSrc, uv + vec2(0.0, o.y)).rgb * 2.0;
  r += texture(uSrc, uv + vec2(-o.x, -o.y)).rgb;
  r += texture(uSrc, uv + vec2(o.x, -o.y)).rgb;
  r += texture(uSrc, uv + vec2(-o.x, o.y)).rgb;
  r += texture(uSrc, uv + vec2(o.x, o.y)).rgb;
  fragColor = vec4(r / 16.0, 1.0);
}
`;

/** Wraps the hook's function in the engine-owned `main` (scene fetch, bloom sample, depth copy). */
export const buildResolveFragment = (resolveSource: string): string => `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uSceneTex;
uniform sampler2D uDepthTex;
uniform sampler2D uBloomTex;
uniform vec2 uResolution;
uniform float uBloomEnabled;
out vec4 fragColor;

${resolveSource}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec3 scene = texelFetch(uSceneTex, p, 0).rgb;
  vec3 bloom = uBloomEnabled > 0.5 ? texture(uBloomTex, gl_FragCoord.xy / uResolution).rgb : vec3(0.0);
  fragColor = vec4(sceneryResolve(scene, bloom, gl_FragCoord.xy), 1.0);
  gl_FragDepth = texelFetch(uDepthTex, p, 0).r;
}
`;

interface BloomLevel {
  width: number;
  height: number;
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
}

interface Resources {
  plan: SceneryAttachmentPlan;
  color: WebGLTexture;
  depth: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  bloom: BloomLevel[];
}

interface ProgramInfo {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

export class SceneryTarget {
  status: SceneryTargetStatus = 'idle';
  /** Why the target switched itself off (for diagnostics). */
  failureReason = '';

  private res_: Resources | null = null;
  private failed_ = false;
  private vao_: WebGLVertexArrayObject | null = null;
  private down_: ProgramInfo | null = null;
  private up_: ProgramInfo | null = null;
  private resolve_: (ProgramInfo & { source: string }) | null = null;

  constructor(private readonly gl_: WebGL2RenderingContext) {}

  /** The framebuffer the scenery renders into, or null when the target is not allocated. */
  get framebuffer(): WebGLFramebuffer | null {
    return this.res_?.framebuffer ?? null;
  }

  get plan(): SceneryAttachmentPlan | null {
    return this.res_?.plan ?? null;
  }

  /** False once the target gave up (no float format, incomplete framebuffer, shader failure). */
  get isUsable(): boolean {
    return !this.failed_;
  }

  /** Allows another attempt after the owner changed something (a new hook, a restored context). */
  reset(): void {
    this.release_();
    this.failed_ = false;
    this.failureReason = '';
    this.status = 'idle';
  }

  /**
   * Bind the target and clear it. Returns false (and leaves the default framebuffer bound) when the
   * target cannot be used this frame; the caller then renders the frame the plain way.
   */
  begin(hook: SceneryTargetHook, clearColor: ArrayLike<number>): boolean {
    const gl = this.gl_;

    if (this.failed_ || gl.isContextLost()) {
      return false;
    }

    const plan = planSceneryAttachments(gl.drawingBufferWidth, gl.drawingBufferHeight);

    if (!plan) {
      return false;
    }
    if (this.res_ && !gl.isTexture(this.res_.color)) {
      // The context was lost and restored: every object we held is gone.
      this.release_();
      this.down_ = null;
      this.up_ = null;
      this.resolve_ = null;
      this.vao_ = null;
    }
    if (!isSamePlan(this.res_?.plan ?? null, plan) && !this.allocate_(plan)) {
      return false;
    }

    // Compile before the frame renders into the target: a failure here must leave the plain frame intact.
    if (!this.ensureResolveProgram_(hook) || !this.ensureBloomPrograms_()) {
      this.fail_('error', `resolve shader failed: ${this.failureReason}`);

      return false;
    }

    const res = this.res_ as Resources;

    gl.bindFramebuffer(gl.FRAMEBUFFER, res.framebuffer);
    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.status = 'active';

    return true;
  }

  /** Reallocate to the current drawing-buffer size (the renderer calls this from its resize path). */
  resize(): void {
    const gl = this.gl_;

    if (!this.res_ || gl.isContextLost()) {
      return;
    }
    const plan = planSceneryAttachments(gl.drawingBufferWidth, gl.drawingBufferHeight);

    if (!plan) {
      this.release_();

      return;
    }
    if (!isSamePlan(this.res_.plan, plan)) {
      this.allocate_(plan);
    }
  }

  /**
   * Run the bloom chain and the hook's resolve, writing colour and depth to the default
   * framebuffer. Draw state that the chain touches is restored.
   */
  resolve(hook: SceneryTargetHook): void {
    const gl = this.gl_;
    const res = this.res_;

    if (!res || this.failed_) {
      return;
    }

    const saved = this.saveState_();

    try {
      const settings = hook.getSettings();
      const info = this.ensureResolveProgram_(hook);

      if (!info || !this.ensureBloomPrograms_()) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return;
      }

      gl.disable(gl.SCISSOR_TEST);
      gl.disable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.colorMask(true, true, true, true);
      gl.bindVertexArray(this.vao_);

      const isBloom = settings.bloomIntensity > 0 && res.bloom.length > 0;

      if (isBloom) {
        this.runBloom_(res, settings);
      }

      // Resolve to the canvas over the whole drawing buffer: fragment coordinates index the target 1:1.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, res.plan.width, res.plan.height);
      gl.useProgram(info.program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, res.color);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, res.depth);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, isBloom ? res.bloom[0].texture : null);
      gl.uniform1i(info.uniforms.uSceneTex, 0);
      gl.uniform1i(info.uniforms.uDepthTex, 1);
      gl.uniform1i(info.uniforms.uBloomTex, 2);
      gl.uniform2f(info.uniforms.uResolution, res.plan.width, res.plan.height);
      gl.uniform1f(info.uniforms.uBloomEnabled, isBloom ? 1 : 0);
      hook.bind(gl, info.uniforms, { width: res.plan.width, height: res.plan.height });

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.ALWAYS);
      gl.depthMask(true);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      for (const unit of [2, 1, 0]) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
    } finally {
      this.restoreState_(saved);
    }
  }

  dispose(): void {
    this.release_();
    for (const info of [this.down_, this.up_, this.resolve_]) {
      if (info) {
        this.gl_.deleteProgram(info.program);
      }
    }
    this.down_ = null;
    this.up_ = null;
    this.resolve_ = null;
    if (this.vao_) {
      this.gl_.deleteVertexArray(this.vao_);
      this.vao_ = null;
    }
  }

  private runBloom_(res: Resources, settings: SceneryTargetSettings): void {
    const gl = this.gl_;
    const down = this.down_ as ProgramInfo;
    const up = this.up_ as ProgramInfo;

    gl.useProgram(down.program);
    gl.uniform1i(down.uniforms.uSrc, 0);
    gl.uniform1f(down.uniforms.uThreshold, settings.bloomThreshold);
    gl.uniform1f(down.uniforms.uGamma, settings.gamma);
    gl.activeTexture(gl.TEXTURE0);

    for (let i = 0; i < res.bloom.length; i++) {
      const level = res.bloom[i];
      const srcTex = i === 0 ? res.color : res.bloom[i - 1].texture;
      const srcW = i === 0 ? res.plan.width : res.bloom[i - 1].width;
      const srcH = i === 0 ? res.plan.height : res.bloom[i - 1].height;

      gl.bindFramebuffer(gl.FRAMEBUFFER, level.framebuffer);
      gl.viewport(0, 0, level.width, level.height);
      gl.bindTexture(gl.TEXTURE_2D, srcTex);
      gl.uniform2f(down.uniforms.uSrcTexel, 1 / srcW, 1 / srcH);
      gl.uniform2f(down.uniforms.uDstSize, level.width, level.height);
      gl.uniform1f(down.uniforms.uIsFirst, i === 0 ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    gl.useProgram(up.program);
    gl.uniform1i(up.uniforms.uSrc, 0);
    gl.uniform1f(up.uniforms.uRadius, settings.bloomRadius);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    for (let i = res.bloom.length - 1; i > 0; i--) {
      const src = res.bloom[i];
      const dst = res.bloom[i - 1];

      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.framebuffer);
      gl.viewport(0, 0, dst.width, dst.height);
      gl.bindTexture(gl.TEXTURE_2D, src.texture);
      gl.uniform2f(up.uniforms.uSrcTexel, 1 / src.width, 1 / src.height);
      gl.uniform2f(up.uniforms.uDstSize, dst.width, dst.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private saveState_() {
    const gl = this.gl_;

    return {
      viewport: gl.getParameter(gl.VIEWPORT) as Int32Array,
      scissor: gl.isEnabled(gl.SCISSOR_TEST),
      blend: gl.isEnabled(gl.BLEND),
      depthTest: gl.isEnabled(gl.DEPTH_TEST),
      cull: gl.isEnabled(gl.CULL_FACE),
      depthMask: gl.getParameter(gl.DEPTH_WRITEMASK) as boolean,
      depthFunc: gl.getParameter(gl.DEPTH_FUNC) as number,
      blendSrcRgb: gl.getParameter(gl.BLEND_SRC_RGB) as number,
      blendDstRgb: gl.getParameter(gl.BLEND_DST_RGB) as number,
      blendSrcAlpha: gl.getParameter(gl.BLEND_SRC_ALPHA) as number,
      blendDstAlpha: gl.getParameter(gl.BLEND_DST_ALPHA) as number,
      activeTexture: gl.getParameter(gl.ACTIVE_TEXTURE) as number,
    };
  }

  private restoreState_(s: ReturnType<SceneryTarget['saveState_']>): void {
    const gl = this.gl_;

    gl.viewport(s.viewport[0], s.viewport[1], s.viewport[2], s.viewport[3]);
    const toggle = (cap: number, on: boolean) => (on ? gl.enable(cap) : gl.disable(cap));

    toggle(gl.SCISSOR_TEST, s.scissor);
    toggle(gl.BLEND, s.blend);
    toggle(gl.DEPTH_TEST, s.depthTest);
    toggle(gl.CULL_FACE, s.cull);
    gl.depthMask(s.depthMask);
    gl.depthFunc(s.depthFunc);
    gl.blendFuncSeparate(s.blendSrcRgb, s.blendDstRgb, s.blendSrcAlpha, s.blendDstAlpha);
    gl.activeTexture(s.activeTexture);
    gl.bindVertexArray(null);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private fail_(status: SceneryTargetStatus, reason: string): void {
    this.failed_ = true;
    this.status = status;
    this.failureReason = reason;
    this.release_();
  }

  private release_(): void {
    const gl = this.gl_;
    const res = this.res_;

    if (!res) {
      return;
    }
    try {
      gl.deleteFramebuffer(res.framebuffer);
      gl.deleteTexture(res.color);
      gl.deleteTexture(res.depth);
      for (const level of res.bloom) {
        gl.deleteFramebuffer(level.framebuffer);
        gl.deleteTexture(level.texture);
      }
    } catch {
      // The context may already be gone; nothing left to free.
    }
    this.res_ = null;
  }

  private makeTexture_(width: number, height: number, internalFormat: number): WebGLTexture {
    const gl = this.gl_;
    const tex = gl.createTexture() as WebGLTexture;

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, width, height);
    const filter = internalFormat === gl.DEPTH_COMPONENT24 ? gl.NEAREST : gl.LINEAR;

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return tex;
  }

  private allocate_(plan: SceneryAttachmentPlan): boolean {
    const gl = this.gl_;

    this.release_();

    if (!findFloatColorExtension(gl)) {
      this.fail_('unsupported', 'neither EXT_color_buffer_float nor EXT_color_buffer_half_float is available');

      return false;
    }

    const prevTex = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;
    const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;

    try {
      while (gl.getError() !== gl.NO_ERROR) {
        // Drain errors that other code left behind so the check below is ours.
      }

      const color = this.makeTexture_(plan.width, plan.height, gl.RGBA16F);
      const depth = this.makeTexture_(plan.width, plan.height, gl.DEPTH_COMPONENT24);
      const framebuffer = gl.createFramebuffer() as WebGLFramebuffer;

      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
      const mainStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      const bloom: BloomLevel[] = [];
      let isComplete = mainStatus === gl.FRAMEBUFFER_COMPLETE;

      this.res_ = { plan, color, depth, framebuffer, bloom };

      for (const size of plan.bloom) {
        const texture = this.makeTexture_(size.width, size.height, gl.RGBA16F);
        const fb = gl.createFramebuffer() as WebGLFramebuffer;

        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        isComplete &&= gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        bloom.push({ width: size.width, height: size.height, texture, framebuffer: fb });
      }

      const glError = gl.getError();

      if (!isComplete || glError !== gl.NO_ERROR) {
        this.fail_('incomplete', `framebuffer status ${mainStatus}, gl error ${glError}`);

        return false;
      }
    } catch (error) {
      this.fail_('error', error instanceof Error ? error.message : String(error));

      return false;
    } finally {
      gl.bindTexture(gl.TEXTURE_2D, prevTex);
      gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);
    }

    return true;
  }

  private compile_(fragment: string, uniformNames: string[]): ProgramInfo | null {
    const gl = this.gl_;
    const make = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type) as WebGLShader;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        this.failureReason = gl.getShaderInfoLog(shader) ?? 'shader compile failed';
        gl.deleteShader(shader);

        return null;
      }

      return shader;
    };
    const vs = make(gl.VERTEX_SHADER, FULLSCREEN_VERT);
    const fs = make(gl.FRAGMENT_SHADER, fragment);

    if (!vs || !fs) {
      return null;
    }
    const program = gl.createProgram() as WebGLProgram;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      this.failureReason = gl.getProgramInfoLog(program) ?? 'program link failed';
      gl.deleteProgram(program);

      return null;
    }

    const uniforms: Record<string, WebGLUniformLocation | null> = {};

    for (const name of uniformNames) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }

    return { program, uniforms };
  }

  private ensureBloomPrograms_(): boolean {
    if (!this.vao_) {
      this.vao_ = this.gl_.createVertexArray();
    }
    this.down_ ??= this.compile_(DOWN_FRAG, ['uSrc', 'uSrcTexel', 'uDstSize', 'uIsFirst', 'uThreshold', 'uGamma']);
    this.up_ ??= this.compile_(UP_FRAG, ['uSrc', 'uSrcTexel', 'uDstSize', 'uRadius']);

    return !!this.down_ && !!this.up_;
  }

  private ensureResolveProgram_(hook: SceneryTargetHook): (ProgramInfo & { source: string }) | null {
    if (this.resolve_ && this.resolve_.source === hook.resolveSource && this.gl_.isProgram(this.resolve_.program)) {
      return this.resolve_;
    }
    if (this.resolve_) {
      this.gl_.deleteProgram(this.resolve_.program);
      this.resolve_ = null;
    }
    const info = this.compile_(buildResolveFragment(hook.resolveSource), ['uSceneTex', 'uDepthTex', 'uBloomTex', 'uResolution', 'uBloomEnabled', ...hook.uniformNames]);

    if (!info) {
      return null;
    }
    this.resolve_ = { ...info, source: hook.resolveSource };

    return this.resolve_;
  }
}
