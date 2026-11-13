/* eslint-disable dot-notation */
import { Earth, getCloudFadeZoom } from '@app/engine/rendering/draw-manager/earth';
import { GreenwichMeanSiderealTime } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';

describe('Earth', () => {
  // TODO: Update for new mesh/geometry system
  it.skip('updates the model-view matrix correctly', () => {
    const earth = new Earth();
    const gmst = 0.5 as GreenwichMeanSiderealTime;

    earth.update();
    const expected = mat4.create();

    mat4.identity(expected);
    mat4.rotateZ(expected, expected, gmst);
    const actual = earth['mvMatrix_'];

    expect(actual).toEqual(expected);
  });
});

describe('getCloudFadeZoom', () => {
  it('depends only on zoom for an Earth-centered view', () => {
    expect(getCloudFadeZoom(true, 0.1)).toBe(0.1);
    expect(getCloudFadeZoom(true, 0.8)).toBe(0.8);
  });

  it('keeps clouds fully visible for other center bodies', () => {
    expect(getCloudFadeZoom(false, 0.1)).toBe(1.0);
  });
});
