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

window.M = {
  AutoInit: vi.fn(),
  updateTextFields: vi.fn(),
} as unknown as typeof window.M;

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

  return {
    __esModule: true,
    default: { init, use, registerTheme, registerLocale, graphic },
    init,
    use,
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

global.console = {
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  log: console.log.bind(console),

  // Ignore console.log() type statements during test
  info: vi.fn(),
  debug: vi.fn(),
} as unknown as Console;

// Note: echarts-gl warning filtered below during tests

// If console.warn tries to warn "geo3D exists." ignore it.
const consoleWarn = global.console.warn;

global.console.warn = (message, ...optionalParams) => {
  if (typeof message === 'string' && message.includes('geo3D exists.')) {
    return;
  }
  consoleWarn(message, ...optionalParams);
};

window.HTMLMediaElement.prototype.load = () => {
  /* do nothing */
};
window.HTMLMediaElement.prototype.play = async () => {
  /* do nothing */
};
window.HTMLMediaElement.prototype.pause = () => {
  /* do nothing */
};
window.HTMLMediaElement.prototype.addTextTrack = (kind, label, language) => {
  return {
    kind,
    label,
    language,
    addCue: () => { },
  } as unknown as TextTrack;
};

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
global.mocks.glMock = {
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
  clear: vi.fn(),
  clearColor: vi.fn(),
  compileShader: vi.fn(),
  createBuffer: () => ({ numItems: 0, layout: {}, data: {} }),
  createFramebuffer: vi.fn(),
  createProgram: () => ({
    test: '',
  }),
  createImageBitmap: vi.fn(),
  createRenderbuffer: vi.fn(),
  createShader: () => ({
    test: '',
  }),
  createTexture: vi.fn(),
  createVertexArray: vi.fn(),
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
  getAttribLocation: vi.fn(),
  getExtension: vi.fn(),
  getProgramInfoLog: vi.fn(),
  getProgramParameter: () => true,
  getShaderParameter: () => true,
  getUniformLocation: () => true,
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
