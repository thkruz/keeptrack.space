/* eslint-disable no-undefined */
/*globals
  global
  jest
*/

global.mocks = {};
global.mocks.glMock = {
  canvas: { height: 1080, width: 1920 },
  createShader: jest.fn(),
  createProgram: () => ({
    test: '',
  }),
  getAttribLocation: jest.fn(),
  getUniformLocation: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  createBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  createTexture: jest.fn(),
  activeTexture: jest.fn(),
  enable: jest.fn(),
  blendFunc: jest.fn(),
  bindTexture: jest.fn(),
  texParameteri: jest.fn(),
  texImage2D: jest.fn(),
  createRenderbuffer: jest.fn(),
  bindRenderbuffer: jest.fn(),
  renderbufferStorage: jest.fn(),
  createFramebuffer: jest.fn(),
  bindFramebuffer: jest.fn(),
  framebufferTexture2D: jest.fn(),
  framebufferRenderbuffer: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn(),
  depthMask: jest.fn(),
  useProgram: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  uniformMatrix3fv: jest.fn(),
  uniformMatrix4fv: jest.fn(),
  uniform4fv: jest.fn(),
  uniform3fv: jest.fn(),
  uniform1f: jest.fn(),
  uniform1i: jest.fn(),
  uniform2f: jest.fn(),
  getProgramParameter: jest.fn(() => true),
  getProgramInfoLog: jest.fn(),
  disable: jest.fn(),
  scissor: jest.fn(),
  bufferSubData: jest.fn(),
  generateMipmap: jest.fn(),
  createVertexArray: jest.fn(),
  bindVertexArray: jest.fn(),
  disableVertexAttribArray: jest.fn(),
};

// mock_requestAnimationFrame.js
class RequestAnimationFrameMockSession {
  handleCounter = 0;
  queue = new Map();
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
    if (nextEntry === undefined) return;

    const [nextHandle, nextCallback] = nextEntry;

    nextCallback(time);
    this.queue.delete(nextHandle);
  }

  triggerAllAnimationFrames(time = performance.now()) {
    while (this.queue.size > 0) this.triggerNextAnimationFrame(time);
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
