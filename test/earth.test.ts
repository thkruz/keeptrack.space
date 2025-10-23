/* eslint-disable dot-notation */
import { Earth } from '@app/engine/rendering/draw-manager/earth';
import { mat4 } from 'gl-matrix';
import { GreenwichMeanSiderealTime } from '@ootk/src/main';

describe('Earth', () => {
  // TODO: Update for new mesh/geometry system
  it.skip('updates the model-view matrix correctly', () => {
    const earth = new Earth();
    const gmst = 0.5 as GreenwichMeanSiderealTime;

    earth.update(gmst);
    const expected = mat4.create();

    mat4.identity(expected);
    mat4.rotateZ(expected, expected, gmst);
    const actual = earth['mvMatrix_'];

    expect(actual).toEqual(expected);
  });
});
