import { mat4 } from 'gl-matrix';
import { Camera } from '../camera';

describe('Camera matrixWorld with singular matrixWorldInverse', () => {
  let camera: Camera;

  beforeEach(() => {
    camera = new Camera();
  });

  it('does not throw when matrixWorldInverse is the zero matrix', () => {
    mat4.set(camera.matrixWorldInverse, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

    expect(() => camera.getCamPos()).not.toThrow();
    expect(() => camera.getCamPosEarthCentered()).not.toThrow();
    expect(() => camera.getDistFromEarth()).not.toThrow();
  });

  it('returns identity from matrixWorld when matrixWorldInverse is singular', () => {
    mat4.set(camera.matrixWorldInverse, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

    const world = camera.matrixWorld;

    expect(Array.from(world)).toEqual(Array.from(mat4.create()));
  });

  it('returns the correct inverse when matrixWorldInverse is invertible', () => {
    mat4.identity(camera.matrixWorldInverse);
    mat4.translate(camera.matrixWorldInverse, camera.matrixWorldInverse, [-10, -20, -30]);

    const pos = camera.getCamPos();

    expect(pos[0]).toBeCloseTo(10);
    expect(pos[1]).toBeCloseTo(20);
    expect(pos[2]).toBeCloseTo(30);
  });
});
