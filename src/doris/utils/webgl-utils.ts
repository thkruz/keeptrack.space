import { vec2, vec4 } from 'gl-matrix';

export const getCurrentViewport = (gl: WebGL2RenderingContext, target = vec4.create()): vec4 => {
  vec4.set(target, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  return target;
};

export const getDrawingBufferSize = (gl: WebGL2RenderingContext, target = vec2.create()): vec2 => {
  vec2.set(target, gl.drawingBufferWidth, gl.drawingBufferHeight);

  return target;
};

export const getActiveMipmapLevel = (gl: WebGL2RenderingContext): number => {
  const activeTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);

  if (!activeTexture) {
    return 0;
  }
  const activeTextureLevel = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL);


  return activeTextureLevel;
};

export const getPixelRatio = (): number => window.devicePixelRatio;
