import { ServiceLocator } from '@app/engine/core/service-locator';
import { DeepSpaceSatellite, DeepSpaceSatelliteConfig } from '@app/engine/rendering/draw-manager/celestial-bodies/deep-space-satellite';
import { Kilometers, Seconds } from '@ootk/src/main';
import { vi } from 'vitest';

/**
 * Regression test for #1426: "Cannot read properties of null (reading 'interpolate')" in
 * DeepSpaceSatellite.updatePosition via Scene.updateWorldShift.
 *
 * A deep-space satellite has no interpolator until its ephemeris fetch resolves. `update()`
 * guards on isLoaded_, but the world-shift path calls `updatePosition()` on the center body
 * directly, so centering on a probe before its coefficients arrive crashed the game loop.
 */
describe('ChebyshevBody.updatePosition before coefficients load (#1426)', () => {
  const config: DeepSpaceSatelliteConfig = {
    name: 'test-probe',
    color: [1, 1, 1, 1],
    orbitalPeriod: 1e9 as Seconds,
    meanDistanceToSun: 1.5e8 as Kilometers,
    dataFile: 'test-probe.json',
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a no-op while the interpolator is still null', () => {
    const probe = new DeepSpaceSatellite(config);
    const before = [...probe.position];

    expect(probe.isEphemerisReady).toBe(false);
    expect(() => probe.updatePosition(new Date('2026-08-05T21:00:40Z'))).not.toThrow();
    expect(probe.position).toEqual(before);
  });

  it('updates position once coefficients are available', () => {
    const probe = new DeepSpaceSatellite(config);
    const j2000 = { toTEME: () => ({ position: { x: 100, y: 200, z: 300 } }) };
    const sun = { updateEci: vi.fn(), eci: { x: 1, y: 2, z: 3 } };

    vi.spyOn(ServiceLocator, 'getScene').mockReturnValue({ sun } as never);
    // Same shape the real ChebyshevInterpolator exposes to updatePosition.
    (probe as unknown as { interpolator_: unknown }).interpolator_ = { interpolate: () => j2000 };

    probe.updatePosition(new Date('2026-08-05T21:00:40Z'));

    expect(sun.updateEci).toHaveBeenCalledTimes(1);
    expect(probe.position).toEqual([101, 202, 303]);
  });
});
