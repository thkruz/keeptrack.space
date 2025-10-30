import 'webgl-mock';

import { settingsManager } from '@app/settings/settings';
import fs from 'fs';
import { JSDOM } from 'jsdom';
import path from 'path';

// This allows consistent testing in the CI environment
// eslint-disable-next-line no-process-env
process.env.TZ = 'GMT';
const fakeTime = new Date('2022-01-01');

fakeTime.setUTCHours(0, 0, 0, 0);
jest.useFakeTimers().setSystemTime(fakeTime.getTime());

// eslint-disable-next-line no-sync
const documentHTML = fs.readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8').toString();
const body = '<body>';
const bodyEnd = '</body>';
const docBody = documentHTML.substring(documentHTML.indexOf(body) + body.length, documentHTML.indexOf(bodyEnd));
const dom = new JSDOM(documentHTML, { pretendToBeVisual: true, runScripts: 'dangerously', resources: 'usable' });

// set the global window and document objects using JSDOM
// global is a node.js global object
if (typeof global !== 'undefined') {
  global.window = dom.window;
  global.document = dom.window.document;
  global.docBody = docBody;
}

settingsManager.init();

global.settingsManager = settingsManager;

global.document.url = 'https://keeptrack.space';
global.document.includeNodeLocations = true;
if (typeof global.window === 'undefined') {
  global.window = global.document.parentWindow;
}

global.speechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  paused: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(),
};

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob()),
    text: () => Promise.resolve(''),
    ok: true,
  }),
);

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

window.matchMedia = jest.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(), // Deprecated
  removeListener: jest.fn(), // Deprecated
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

window.M = {
  AutoInit: jest.fn(),
};

global.requestAnimationFrame = function requestAnimationFrame(cb) {
  return setTimeout(cb, 0);
};

global.console = {
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  log: console.log.bind(console),

  // Ignore console.log() type statements during test
  info: jest.fn(),
  debug: jest.fn(),
};

// TODO: Make a PR to fix this warning in the echarts-gl codebase

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
window.HTMLMediaElement.prototype.play = () => {
  /* do nothing */
};
window.HTMLMediaElement.prototype.pause = () => {
  /* do nothing */
};
window.HTMLMediaElement.prototype.addTextTrack = () => {
  /* do nothing */
};

// global.document.canvas.addEventListener = () => true;

/*
 * Eruda is a console for mobile web browsers
 * It is not needed for testing and causes issues with the test environment
 */
jest.mock('eruda', () => ({
  init: jest.fn(),
  add: jest.fn(),
}));

/** Setup catalog, webgl, and other standard environment */
import('./environment/standard-env').then((module) => {
  module.setupStandardEnvironment();
});

global.mocks = {};
global.mocks.glMock = {
  activeTexture: jest.fn(),
  attachShader: jest.fn(),
  bindBuffer: jest.fn(),
  bindFramebuffer: jest.fn(),
  bindRenderbuffer: jest.fn(),
  bindTexture: jest.fn(),
  bindVertexArray: jest.fn(),
  blendFunc: jest.fn(),
  bufferData: jest.fn(),
  bufferSubData: jest.fn(),
  canvas: { height: 1080, width: 1920 },
  clear: jest.fn(),
  clearColor: jest.fn(),
  compileShader: jest.fn(),
  createBuffer: () => ({ numItems: 0, layout: {}, data: {} }),
  createFramebuffer: jest.fn(),
  createProgram: () => ({
    test: '',
  }),
  createRenderbuffer: jest.fn(),
  createShader: () => ({
    test: '',
  }),
  createTexture: jest.fn(),
  createVertexArray: jest.fn(),
  depthMask: jest.fn(),
  disable: jest.fn(),
  disableVertexAttribArray: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn(),
  enable: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  framebufferRenderbuffer: jest.fn(),
  framebufferTexture2D: jest.fn(),
  generateMipmap: jest.fn(),
  getAttribLocation: jest.fn(),
  getExtension: jest.fn(),
  getProgramInfoLog: jest.fn(),
  getProgramParameter: () => true,
  getShaderParameter: () => true,
  getUniformLocation: () => true,
  isContextLost: jest.fn(() => false),
  linkProgram: jest.fn(),
  readPixels: jest.fn(),
  renderbufferStorage: jest.fn(),
  scissor: jest.fn(),
  shaderSource: jest.fn(),
  texImage2D: jest.fn(),
  texParameteri: jest.fn(),
  uniform1f: jest.fn(),
  uniform1i: jest.fn(),
  uniform2f: jest.fn(),
  uniform3fv: jest.fn(),
  uniform4fv: jest.fn(),
  uniformMatrix3fv: jest.fn(),
  uniformMatrix4fv: jest.fn(),
  useProgram: jest.fn(),
  viewport: jest.fn(),
  vertexAttribPointer: jest.fn(),
  getShaderInfoLog: jest.fn(() => 'This is a mock error'),
  depthFunc: jest.fn(),
  clearDepth: jest.fn(),
  pixelStorei: jest.fn(),
};

// mock_requestAnimationFrame.js
class RequestAnimationFrameMockSession {
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

window.scrollTo = jest.fn();
