/* eslint-disable dot-notation */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Earth, getCloudFadeZoom, getEarthNightTextureBase } from '@app/engine/rendering/draw-manager/earth';
import { EarthNightTextureQuality, EarthTextureStyle } from '@app/engine/rendering/draw-manager/earth-quality-enums';
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

describe('getEarthNightTextureBase', () => {
  const textures = resolve(__dirname, '../../../../../public/textures');

  it('never names a night texture that is not shipped (Ops Center / flat requested a 404)', () => {
    for (const style of Object.values(EarthTextureStyle)) {
      const base = getEarthNightTextureBase(style);

      if (base === null) {
        continue;
      }
      for (const quality of Object.values(EarthNightTextureQuality)) {
        const file = `${base}${quality}.jpg`;

        expect(existsSync(resolve(textures, file)), file).toBe(true);
      }
    }
  });

  it('has no night map for the flat style and reuses the Blue Marble one for Nadir', () => {
    expect(getEarthNightTextureBase(EarthTextureStyle.FLAT)).toBeNull();
    expect(getEarthNightTextureBase(EarthTextureStyle.NADIR)).toBe('earthmap-night');
    expect(getEarthNightTextureBase(EarthTextureStyle.BLUE_MARBLE)).toBe('earthmap-night');
  });
});
