export const setPosition = (satPos: Float32Array, i: number, pos: { x: number; y: number; z: number }): Float32Array => {
  satPos[i * 3] = pos.x;
  satPos[i * 3 + 1] = pos.y;
  satPos[i * 3 + 2] = pos.z;

  return satPos;
};

export const resetPosition = (satPos: Float32Array, i: number): Float32Array => {
  satPos[i * 3] = 0;
  satPos[i * 3 + 1] = 0;
  satPos[i * 3 + 2] = 0;

  return satPos;
};

export const resetVelocity = (satVel: Float32Array, i: number): Float32Array => {
  satVel[i * 3] = 0;
  satVel[i * 3 + 1] = 0;
  satVel[i * 3 + 2] = 0;

  return satVel;
};
