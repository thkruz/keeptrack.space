import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { POLITICAL_FADE_FULL_KM, POLITICAL_FADE_ZERO_KM, politicalMapFade } from '../political-map-fade';

const src = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf-8');

describe('politicalMapFade (W6: borders fade where the 4096 x 2048 overlay is too coarse)', () => {
  it('is full above the full altitude, zero below the zero altitude, monotonic between', () => {
    expect(politicalMapFade(20000)).toBe(1);
    expect(politicalMapFade(POLITICAL_FADE_FULL_KM)).toBe(1);
    expect(politicalMapFade(POLITICAL_FADE_ZERO_KM)).toBe(0);
    expect(politicalMapFade(300)).toBe(0);
    expect(politicalMapFade(-50)).toBe(0);
    let prev = 0;

    for (let a = POLITICAL_FADE_ZERO_KM; a <= POLITICAL_FADE_FULL_KM; a += 100) {
      const f = politicalMapFade(a);

      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
    expect(politicalMapFade((POLITICAL_FADE_ZERO_KM + POLITICAL_FADE_FULL_KM) / 2)).toBeCloseTo(0.5, 6);
  });

  it('starts fading near where one 9.8 km texel spans two 1080p pixels (0.6 rad field of view)', () => {
    const texelKm = 40075 / 4096;
    const pixelRad = (2 * Math.tan(0.3)) / 1080;
    const twoPxAltKm = texelKm / (2 * pixelRad);

    expect(POLITICAL_FADE_FULL_KM).toBeGreaterThanOrEqual(twoPxAltKm);
    expect(POLITICAL_FADE_FULL_KM).toBeLessThan(twoPxAltKm * 1.25);
  });

  it('treats a non-finite altitude as fully drawn', () => {
    expect(politicalMapFade(Number.NaN)).toBe(1);
  });

  it('the Earth surface shader applies the fade', () => {
    const earth = src('src/engine/rendering/draw-manager/earth.ts');

    expect(earth).toContain('politicalColor.rgb * politicalColor.a * uPoliticalFade');
    expect(earth).toContain('politicalMapFade(getCameraAltitudeAboveEllipsoid(');
    expect(earth).toMatch(/politicalFade: this\.politicalFade_/u);
  });
});
