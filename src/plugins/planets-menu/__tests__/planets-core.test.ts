import { SolarBody } from '@app/engine/core/interfaces';
import { getBodyViewConfig } from '@app/plugins/planets-menu/planets-core';
import { Kilometers, RADIUS_OF_EARTH, WGS84_A } from '@ootk/src/main';

describe('planets-core getBodyViewConfig', () => {
  it('keeps the camera near the surface for Earth and hides the dots', () => {
    const cfg = getBodyViewConfig(SolarBody.Earth);

    expect(cfg.minZoom).toBe(WGS84_A + 50);
    expect(cfg.minZoom).toBeCloseTo(6428.137, 3);
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

  /*
   * The proportional 1.2x rule alone would put the camera ~1.2 km above a Deimos-sized moon
   * (and, since the mean radius understates an irregular body's long axis, potentially inside
   * the mesh - a black frame with no error). Every body now keeps 10 km of surface clearance.
   */
  it.each([
    ['Deimos', SolarBody.Deimos, 6.2],
    ['Phobos', SolarBody.Phobos, 11.1],
  ])('keeps at least 10 km of surface clearance at %s', (_label, body, radius) => {
    const cfg = getBodyViewConfig(body as SolarBody, radius as Kilometers);

    expect(cfg.minZoom).toBeCloseTo(radius + 10);
    expect(cfg.minZoom - radius).toBeGreaterThanOrEqual(10);
  });

  it('leaves large bodies on the proportional rule', () => {
    // 1.2x radius already clears 10 km for anything bigger than 50 km.
    expect(getBodyViewConfig(SolarBody.Moon, 1737 as Kilometers).minZoom).toBeCloseTo(1737 * 1.2);
    expect(getBodyViewConfig(SolarBody.Mars, 3389 as Kilometers).minZoom).toBeCloseTo(3389 * 1.2);
  });
});

/*
 * Selecting a body used to leave the normalized zoom level alone and simply re-read it through
 * the new limits, so where the camera ended up depended on where it happened to be - almost
 * always far enough away that the body was a dot. Every view now names the distance it frames at.
 */
describe('planets-core framing distance', () => {
  const framingOf = (body: SolarBody, radius?: Kilometers) => getBodyViewConfig(body, radius).framingDistance;

  it.each([
    ['the Moon', SolarBody.Moon, 1737],
    ['Mars', SolarBody.Mars, 3389],
    ['Phobos-sized irregulars', SolarBody.Phobos, 13.4],
  ])('frames %s at six radii', (_label, body, radius) => {
    expect(framingOf(body as SolarBody, radius as Kilometers)).toBeCloseTo(radius * 6);
  });

  it.each([
    ['Earth', SolarBody.Earth, RADIUS_OF_EARTH],
    ['the Moon', SolarBody.Moon, 1737 as Kilometers],
    ['Mars', SolarBody.Mars, 3389 as Kilometers],
    ['Phobos', SolarBody.Phobos, 13.4 as Kilometers],
    ['the Sun', SolarBody.Sun, undefined],
  ])('keeps %s visible without letting the camera inside it', (_label, body, radius) => {
    const cfg = getBodyViewConfig(body as SolarBody, radius as Kilometers);

    // Outside the surface floor, inside the ceiling: a framing outside either is not reachable.
    expect(cfg.framingDistance).toBeGreaterThan(cfg.minZoom);
    expect(cfg.framingDistance).toBeLessThanOrEqual(cfg.maxZoom);
  });

  it('falls back to a finite distance for a body that reports no radius', () => {
    // A body missing zoomFloorRadiusKm would otherwise frame at zero, which is a black screen.
    expect(framingOf(SolarBody.Mars, 0 as Kilometers)).toBeGreaterThan(0);
  });

  /*
   * The Sun view is the solar-system view, so it is framed for context rather than at six solar
   * radii - which would be 25x closer than the view's own zoom floor allows.
   */
  it('arrives at the Sun far enough out to show the inner planets, not the Sun alone', () => {
    expect(framingOf(SolarBody.Sun)).toBeGreaterThan(getBodyViewConfig(SolarBody.Sun).minZoom);
  });
});
