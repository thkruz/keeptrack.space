import { SolarBody } from '@app/engine/core/interfaces';
import { getBodyViewConfig } from '@app/plugins/planets-menu/planets-core';
import { Kilometers, RADIUS_OF_EARTH } from '@ootk/src/main';

describe('planets-core getBodyViewConfig', () => {
  it('keeps the camera near the surface for Earth and hides the dots', () => {
    const cfg = getBodyViewConfig(SolarBody.Earth);

    expect(cfg.minZoom).toBe(RADIUS_OF_EARTH + 50);
    expect(cfg.maxZoom).toBe(1.2e6);
    expect(cfg.dotSize).toBe(0);
    expect(cfg.drawOrbits).toBe(false);
    expect(cfg.clearLines).toBe(true);
    expect(cfg.useHighestQualityTexture).toBe(false);
  });

  it('pulls the camera far back for the Sun and draws orbits', () => {
    const cfg = getBodyViewConfig(SolarBody.Sun);

    expect(cfg.minZoom).toBe(62e6);
    expect(cfg.maxZoom).toBe(1.5e10);
    expect(cfg.dotSize).toBe(1);
    expect(cfg.drawOrbits).toBe(true);
    expect(cfg.clearLines).toBe(false);
  });

  it('scales the Moon zoom by its radius and clears lines', () => {
    const cfg = getBodyViewConfig(SolarBody.Moon, 1737 as Kilometers);

    expect(cfg.minZoom).toBeCloseTo(1737 * 1.2);
    expect(cfg.maxZoom).toBe(1.2e6);
    expect(cfg.dotSize).toBe(0);
    expect(cfg.clearLines).toBe(true);
    expect(cfg.useHighestQualityTexture).toBe(true);
  });

  it('scales a generic planet by radius and draws orbits', () => {
    const cfg = getBodyViewConfig(SolarBody.Mars, 3389 as Kilometers);

    expect(cfg.minZoom).toBeCloseTo(3389 * 1.2);
    expect(cfg.maxZoom).toBe(1.3e10);
    expect(cfg.dotSize).toBe(1);
    expect(cfg.drawOrbits).toBe(true);
    expect(cfg.clearLines).toBe(false);
    expect(cfg.useHighestQualityTexture).toBe(true);
  });
});
