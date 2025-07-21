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
  getProgramParameter: jest.fn(() => true),
  getShaderParameter: jest.fn(() => true),
  getUniformLocation: jest.fn(() => true),
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
