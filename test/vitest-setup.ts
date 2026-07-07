import 'webgl-mock';

import { settingsManager } from '@app/settings/settings';
import fs from 'fs';
import { JSDOM } from 'jsdom';
import path from 'path';
import { vi } from 'vitest';

// This allows consistent testing in the CI environment
// eslint-disable-next-line no-process-env
process.env.TZ = 'GMT';
const fakeTime = new Date('2022-01-01');

fakeTime.setUTCHours(0, 0, 0, 0);
vi.useFakeTimers().setSystemTime(fakeTime.getTime());

// eslint-disable-next-line no-sync
const documentHTML = fs.readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8').toString();
const body = '<body>';
const bodyEnd = '</body>';
const docBody = documentHTML.substring(documentHTML.indexOf(body) + body.length, documentHTML.indexOf(bodyEnd));
const dom = new JSDOM(documentHTML, {
  pretendToBeVisual: true,
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'https://app.keeptrack.space',
});

// set the global window and document objects using JSDOM
// global is a node.js global object
if (typeof global !== 'undefined') {
  global.window = dom.window;
  global.document = dom.window.document;
  global.docBody = docBody;
  global.localStorage = dom.window.localStorage;
  global.sessionStorage = dom.window.sessionStorage;
  // Ensure Event and CustomEvent from JSDOM are available globally
  global.Event = dom.window.Event;
  global.CustomEvent = dom.window.CustomEvent;
  global.KeyboardEvent = dom.window.KeyboardEvent;
  global.MouseEvent = dom.window.MouseEvent;
  // MutationObserver must come from the same JSDOM realm as global.document,
  // or observe() rejects its nodes as foreign ("parameter 1 is not of type 'Node'").
  global.MutationObserver = dom.window.MutationObserver;
  // Ensure HTML element classes from JSDOM are available globally
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLDivElement = dom.window.HTMLDivElement;
  global.HTMLInputElement = dom.window.HTMLInputElement;
  global.HTMLFormElement = dom.window.HTMLFormElement;
}

// Mock OffscreenCanvas for ground-view cardinal labels and other WebGL texture generation
global.OffscreenCanvas = class OffscreenCanvas {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext() {
    return {
      fillStyle: '',
      strokeStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      lineWidth: 1,
      lineJoin: 'miter',
      fillRect: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 })),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
      putImageData: vi.fn(),
      canvas: { width: this.width, height: this.height },
    };
  }

  transferToImageBitmap() {
    return {
      width: this.width,
      height: this.height,
      close: vi.fn(),
    };
  }
} as unknown as typeof OffscreenCanvas;

// Mock createImageBitmap for WebGL texture loading
global.createImageBitmap = vi.fn(() =>
  Promise.resolve({
    width: 1,
    height: 1,
    close: () => { },
  } as ImageBitmap),
);

settingsManager.init();

global.settingsManager = settingsManager;

global.document.url = 'https://keeptrack.space';
global.document.includeNodeLocations = true;
if (typeof global.window === 'undefined') {
  global.window = global.document.parentWindow;
}

global.speechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  paused: false,
  resume: vi.fn(),
  getVoices: vi.fn(),
} as unknown as SpeechSynthesis;

global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob()),
    text: () => Promise.resolve(''),
    ok: true,
  }),
) as unknown as typeof fetch;

// Mock Worker for web worker tests
global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onmessage: null,
  onerror: null,
})) as unknown as typeof Worker;

/*
 * global.document.canvas = new HTMLCanvasElement(1920, 1080);
 * global.document.canvas.style = {};
 */

global.window.resizeTo = (width, height) => {
  global.window.innerWidth = width || global.window.innerWidth;
  global.window.innerHeight = height || global.window.innerHeight;

  // Simulate window resize event
  const resizeEvent = global.document.createEvent('Event');

  resizeEvent.initEvent('resize', true, true);
};

window.resizeTo(1920, 1080);

window.matchMedia = vi.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(), // Deprecated
  removeListener: vi.fn(), // Deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Mock @materializecss/materialize (v2 is a pure ESM module; stub its DOM-touching components in jsdom)
vi.mock('@materializecss/materialize', () => {
  class Toast {
    el = document.createElement('div');
    timeRemaining = 0;
    dismiss = vi.fn();
    static dismissAll = vi.fn();
  }

  const instance = { destroy: vi.fn(), updateTabIndicator: vi.fn(), select: vi.fn() };

  return {
    AutoInit: vi.fn(),
    Toast,
    Dropdown: { init: vi.fn(), getInstance: vi.fn(() => instance) },
    Tabs: { init: vi.fn(), getInstance: vi.fn(() => instance) },
    FormSelect: { init: vi.fn(), getInstance: vi.fn(() => instance) },
  };
});

// Mock echarts to avoid noisy console warnings and side effects during tests
vi.mock('echarts', () => {
  const setOption = vi.fn();
  const resize = vi.fn();
  const dispose = vi.fn();
  const getZr = vi.fn(() => ({ dispose: vi.fn() }));
  const on = vi.fn();
  const showLoading = vi.fn();
  const hideLoading = vi.fn();
  const chartInstance = { setOption, resize, dispose, getZr, on, showLoading, hideLoading };
  const init = vi.fn(() => chartInstance);
  const use = vi.fn();
  const registerTheme = vi.fn();
  const registerLocale = vi.fn();
  const graphic = {};
  // Top-level echarts.dispose(target) is a real module export, distinct from the
  // chart instance's own .dispose(); production code calls echarts.dispose(this.chart).
  const disposeInstance = vi.fn();

  return {
    __esModule: true,
    default: { init, use, dispose: disposeInstance, registerTheme, registerLocale, graphic },
    init,
    use,
    dispose: disposeInstance,
    registerTheme,
    registerLocale,
    graphic,
  };
});

vi.mock('echarts-gl', () => ({}));

// Mock xlsx to prevent tests from writing real files to disk (e.g. channel-info.xlsx)
vi.mock('@e965/xlsx', () => {
  const writeFile = vi.fn();
  const utils = {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  };

  return {
    __esModule: true,
    default: { utils, writeFile },
    utils,
    writeFile,
  };
});

global.requestAnimationFrame = function requestAnimationFrame(cb) {
  return setTimeout(cb, 0);
};

// JSDOM does not implement requestIdleCallback; setInnerHtml() and other
// production code rely on it. Polyfill via setTimeout so deferred work runs
// on the next tick during tests.
global.requestIdleCallback = ((cb: IdleRequestCallback) => setTimeout(() => cb({
  didTimeout: false,
  timeRemaining: () => 0,
}), 0)) as unknown as typeof requestIdleCallback;
global.cancelIdleCallback = ((handle: number) => clearTimeout(handle)) as unknown as typeof cancelIdleCallback;

/*
 * Known-noise console patterns that carry no signal in the test environment.
 * Dropping them keeps the test log readable without hiding real failures
 * (console output never affects pass/fail). To silence a new class of noise,
 * add its pattern here rather than sprinkling per-call guards:
 *   - jsdom "Not implemented: ..." stubs for browser APIs we never exercise
 *     (HTMLMediaElement.load/play/pause, window.scrollTo, ...). jsdom routes
 *     these to console.error via its virtual console.
 *   - "[KeyboardShortcutRegistry] Shortcut conflict: ..." — suites re-init the
 *     same plugins repeatedly, so each run re-registers (and self-conflicts on)
 *     the same shortcuts. Benign in tests; noisy in the log.
 *   - echarts-gl's "geo3D exists." re-registration warning.
 */
const suppressedConsolePatterns: RegExp[] = [
  /Not implemented:/u,
  /\[KeyboardShortcutRegistry\] Shortcut conflict:/u,
  /geo3D exists\./u,
];

const isSuppressedConsoleMessage = (args: unknown[]): boolean =>
  args.some((arg) => typeof arg === 'string' && suppressedConsolePatterns.some((pattern) => pattern.test(arg)));

const withNoiseFilter = (base: (...args: unknown[]) => void) => (...args: unknown[]): void => {
  if (isSuppressedConsoleMessage(args)) {
    return;
  }
  base(...args);
};

global.console = {
  error: withNoiseFilter(console.error.bind(console)),
  warn: withNoiseFilter(console.warn.bind(console)),
  log: withNoiseFilter(console.log.bind(console)),

  // Ignore console.info()/debug() statements during test
  info: vi.fn(),
  debug: vi.fn(),
} as unknown as Console;

/*
 * jsdom leaves HTMLMediaElement's media methods unimplemented and logs
 * "Not implemented: HTMLMediaElement's load() method" (etc.) through its virtual
 * console every time one is called. That virtual console is wired to vitest's own
 * console, so it bypasses the global.console noise filter above — the only way to
 * silence it is to give the methods a no-op body.
 *
 * Crucially this must be done on EVERY realm test code can reach: `new Audio()`
 * resolves to the vitest jsdom environment (globalThis.HTMLMediaElement), while
 * document.createElement('audio'/'video') resolves to the manual JSDOM created
 * above (dom.window.HTMLMediaElement). Patching only one leaves the other noisy.
 */
for (const realm of [globalThis as unknown as Window, dom.window]) {
  const MediaElement = (realm as { HTMLMediaElement?: typeof HTMLMediaElement }).HTMLMediaElement;

  if (!MediaElement) {
    continue;
  }

  MediaElement.prototype.load = () => {
    /* do nothing */
  };
  MediaElement.prototype.play = async () => {
    /* do nothing */
  };
  MediaElement.prototype.pause = () => {
    /* do nothing */
  };
  MediaElement.prototype.addTextTrack = ((kind: TextTrackKind, label?: string, language?: string) => ({
    kind,
    label,
    language,
    addCue: () => { /* do nothing */ },
  })) as unknown as HTMLMediaElement['addTextTrack'];
}

/*
 * Eruda is a console for mobile web browsers
 * It is not needed for testing and causes issues with the test environment
 */
vi.mock('eruda', () => ({
  init: vi.fn(),
  add: vi.fn(),
}));

// Mock Draggabilly - jsdom doesn't support getComputedStyle properly for elements
vi.mock('draggabilly', () => {
  class MockDraggabilly {
    on = vi.fn();
    off = vi.fn();
    enable = vi.fn();
    disable = vi.fn();
    destroy = vi.fn();
    position = { x: 0, y: 0 };
  }

  return { default: MockDraggabilly, __esModule: true };
});

/** Setup catalog, webgl, and other standard environment */
import('./environment/standard-env').then((module) => {
  module.setupStandardEnvironment();
});

global.mocks = {};

/*
 * Real WebGL returns a GLint location (>= 0 when the attribute/uniform is live,
 * -1 / null when it is not) — NOT undefined. Returning undefined would make code
 * that branches on the location (e.g. `loc !== -1`, `typeof loc !== 'undefined'`)
 * take a path that cannot occur in production. Hand back deterministic, distinct,
 * non-negative locations per attribute name and opaque objects per uniform name so
 * the production attribute/uniform-binding paths actually execute. Tests that need
 * the "not found" branch override getAttribLocation per-test to return -1.
 */
const glAttribLocations_ = new Map();
const glUniformLocations_ = new Map();

// Accurate WebGL2 (OpenGL ES 3.0) enum constants for the values the codebase uses.
// Hardcoded from the spec — jsdom has no WebGL2RenderingContext to read them from.
const glConstants = {
  POINTS: 0x0000, LINES: 0x0001, LINE_STRIP: 0x0003, TRIANGLES: 0x0004,
  ZERO: 0, ONE: 1, SRC_ALPHA: 0x0302, ONE_MINUS_SRC_COLOR: 0x0301, ONE_MINUS_SRC_ALPHA: 0x0303,
  DEPTH_BUFFER_BIT: 0x0100, COLOR_BUFFER_BIT: 0x4000,
  LEQUAL: 0x0203, BLEND: 0x0BE2, DEPTH_TEST: 0x0B71, SCISSOR_TEST: 0x0C11, POLYGON_OFFSET_FILL: 0x8037,
  BYTE: 0x1400, UNSIGNED_BYTE: 0x1401, SHORT: 0x1402, UNSIGNED_SHORT: 0x1403,
  INT: 0x1404, UNSIGNED_INT: 0x1405, FLOAT: 0x1406,
  RGBA: 0x1908, DEPTH_COMPONENT16: 0x81A5, DEPTH_COMPONENT32F: 0x8CAC,
  ARRAY_BUFFER: 0x8892, ELEMENT_ARRAY_BUFFER: 0x8893, PIXEL_PACK_BUFFER: 0x88EB,
  STREAM_READ: 0x88E1, STATIC_DRAW: 0x88E4, DYNAMIC_DRAW: 0x88E8, BUFFER_SIZE: 0x8764,
  FRAGMENT_SHADER: 0x8B30, VERTEX_SHADER: 0x8B31, COMPILE_STATUS: 0x8B81, LINK_STATUS: 0x8B82,
  TEXTURE_2D: 0x0DE1, TEXTURE_BINDING_2D: 0x8069,
  TEXTURE0: 0x84C0, TEXTURE1: 0x84C1, TEXTURE2: 0x84C2, TEXTURE3: 0x84C3, TEXTURE4: 0x84C4, TEXTURE5: 0x84C5,
  TEXTURE_MAG_FILTER: 0x2800, TEXTURE_MIN_FILTER: 0x2801, TEXTURE_WRAP_S: 0x2802, TEXTURE_WRAP_T: 0x2803,
  TEXTURE_MAX_LEVEL: 0x813D, NEAREST: 0x2600, LINEAR: 0x2601, LINEAR_MIPMAP_LINEAR: 0x2703,
  CLAMP_TO_EDGE: 0x812F, REPEAT: 0x2901,
  FRAMEBUFFER: 0x8D40, RENDERBUFFER: 0x8D41, COLOR_ATTACHMENT0: 0x8CE0, DEPTH_ATTACHMENT: 0x8D00,
  FRAMEBUFFER_COMPLETE: 0x8CD5,
  UNPACK_ALIGNMENT: 0x0CF5, UNPACK_FLIP_Y_WEBGL: 0x9240, UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
  MAX_TEXTURE_SIZE: 0x0D33, VERSION: 0x1F02,
  NO_ERROR: 0, INVALID_ENUM: 0x0500, INVALID_VALUE: 0x0501, INVALID_OPERATION: 0x0502,
  INVALID_FRAMEBUFFER_OPERATION: 0x0506, OUT_OF_MEMORY: 0x0505, CONTEXT_LOST_WEBGL: 0x9242,
  SYNC_GPU_COMMANDS_COMPLETE: 0x9117, ALREADY_SIGNALED: 0x911A, TIMEOUT_EXPIRED: 0x911B,
  CONDITION_SATISFIED: 0x911C, WAIT_FAILED: 0x911D,
};

global.mocks.glMock = {
  ...glConstants,
  activeTexture: vi.fn(),
  attachShader: vi.fn(),
  bindBuffer: vi.fn(),
  bindFramebuffer: vi.fn(),
  bindRenderbuffer: vi.fn(),
  bindTexture: vi.fn(),
  bindVertexArray: vi.fn(),
  blendFunc: vi.fn(),
  bufferData: vi.fn(),
  bufferSubData: vi.fn(),
  canvas: { height: 1080, width: 1920 },
  // Real WebGL contexts expose the backing drawing-buffer size; mirror the canvas dims.
  drawingBufferWidth: 1920,
  drawingBufferHeight: 1080,
  clear: vi.fn(),
  clearColor: vi.fn(),
  compileShader: vi.fn(),
  createBuffer: () => ({ numItems: 0, layout: {}, data: {} }),
  // Real WebGL create* calls return distinct opaque objects (never undefined/null
  // on a healthy context). Return fresh objects so code that stores/null-checks the
  // handle (texture_/vao_/framebuffer_) takes the production path.
  createFramebuffer: () => ({}),
  createProgram: () => ({
    test: '',
  }),
  createImageBitmap: vi.fn(),
  createRenderbuffer: () => ({}),
  createShader: () => ({
    test: '',
  }),
  createTexture: () => ({}),
  createVertexArray: () => ({}),
  depthMask: vi.fn(),
  disable: vi.fn(),
  disableVertexAttribArray: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
  enable: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  framebufferRenderbuffer: vi.fn(),
  framebufferTexture2D: vi.fn(),
  generateMipmap: vi.fn(),
  getAttribLocation: (_program, name) => {
    if (!glAttribLocations_.has(name)) {
      glAttribLocations_.set(name, glAttribLocations_.size);
    }

    return glAttribLocations_.get(name);
  },
  getExtension: vi.fn(),
  getProgramInfoLog: vi.fn(),
  getProgramParameter: () => true,
  getShaderParameter: () => true,
  getUniformLocation: (_program, name) => {
    if (!glUniformLocations_.has(name)) {
      glUniformLocations_.set(name, { name });
    }

    return glUniformLocations_.get(name);
  },
  isContextLost: vi.fn(() => false),
  linkProgram: vi.fn(),
  readPixels: vi.fn(),
  renderbufferStorage: vi.fn(),
  scissor: vi.fn(),
  shaderSource: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  uniform1f: vi.fn(),
  uniform1i: vi.fn(),
  uniform2f: vi.fn(),
  uniform3fv: vi.fn(),
  uniform4fv: vi.fn(),
  uniformMatrix3fv: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  useProgram: vi.fn(),
  viewport: vi.fn(),
  vertexAttribPointer: vi.fn(),
  getShaderInfoLog: vi.fn(() => 'This is a mock error'),
  depthFunc: vi.fn(),
  clearDepth: vi.fn(),
  pixelStorei: vi.fn(),
  vertexAttribDivisor: vi.fn(),
  drawArraysInstanced: vi.fn(),
  drawElementsInstanced: vi.fn(),
  deleteVertexArray: vi.fn(),
  deleteBuffer: vi.fn(),
  deleteTexture: vi.fn(),
  deleteProgram: vi.fn(),
  deleteShader: vi.fn(),
  deleteFramebuffer: vi.fn(),
  deleteRenderbuffer: vi.fn(),
  // --- Methods the codebase calls that were previously absent (would throw). ---
  // Commands (void):
  uniform4f: vi.fn(),
  blendFuncSeparate: vi.fn(),
  polygonOffset: vi.fn(),
  texParameterf: vi.fn(),
  flush: vi.fn(),
  getBufferSubData: vi.fn(),
  deleteSync: vi.fn(),
  // Queries — return realistic "healthy context / no error" values, matching real WebGL:
  getError: () => 0, // NO_ERROR
  getSupportedExtensions: () => [],
  getBufferParameter: () => 0,
  getTexParameter: () => 0,
  checkFramebufferStatus: () => 0x8CD5, // FRAMEBUFFER_COMPLETE
  fenceSync: () => ({}), // opaque WebGLSync
  clientWaitSync: () => 0x911A, // ALREADY_SIGNALED (work is done)
  getParameter: (pname) => {
    if (pname === 0x0D33) {
      return 16384; // MAX_TEXTURE_SIZE
    }
    if (pname === 0x1F02) {
      return 'WebGL 2.0 (mock)'; // VERSION
    }

    return 0;
  },
};

// mock_requestAnimationFrame.js
class RequestAnimationFrameMockSession {
  handleCounter: number;
  queue: Map<any, any>;

  constructor() {
    this.handleCounter = 0;
    this.queue = new Map();
  }

  requestAnimationFrame(callback) {
    const handle = this.handleCounter++;

    this.queue.set(handle, callback);

    return handle;
  }

  cancelAnimationFrame(handle) {
    this.queue.delete(handle);
  }

  triggerNextAnimationFrame(time = performance.now()) {
    const nextEntry = this.queue.entries().next().value;

    if (typeof nextEntry === 'undefined') {
      return;
    }

    const [nextHandle, nextCallback] = nextEntry;

    nextCallback(time);
    this.queue.delete(nextHandle);
  }

  triggerAllAnimationFrames(time = performance.now()) {
    while (this.queue.size > 0) {
      this.triggerNextAnimationFrame(time);
    }
  }

  reset() {
    this.queue.clear();
    this.handleCounter = 0;
  }
}

export const requestAnimationFrameMock = new RequestAnimationFrameMockSession();

window.requestAnimationFrame = requestAnimationFrameMock.requestAnimationFrame.bind(requestAnimationFrameMock);
window.cancelAnimationFrame = requestAnimationFrameMock.cancelAnimationFrame.bind(requestAnimationFrameMock);

window.scrollTo = vi.fn();
