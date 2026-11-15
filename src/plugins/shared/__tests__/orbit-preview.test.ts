import { ServiceLocator } from '@app/engine/core/service-locator';
import { OrbitPreview, rotateToEcef } from '@app/plugins/shared/orbit-preview';
import { TleLine1, TleLine2 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const ISS_1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005' as TleLine1;
const ISS_2 = '2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.50000000    05' as TleLine2;
// The #336 import: e=0.999 at 16 rev/day, perigee far below the Earth's surface.
const BAD_1 = '1 90000U 24001A   24001.50000000  .00000000  00000-0  00000-0 0  9990' as TleLine1;
const BAD_2 = '2 90000  51.6000 100.0000 9990000  90.0000 270.0000 16.00000000    00' as TleLine2;

/*
 * A TLE that SGP4 cannot propagate over its own period must not leave a partial orbit on screen. Before #336 the
 * failed samples were skipped and the ones that worked were joined into jagged orange segments.
 */
describe('OrbitPreview propagation failures (#336)', () => {
  let createOrbitPath: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupStandardEnvironment();
    const timeManager = ServiceLocator.getTimeManager();

    timeManager.simulationTimeObj = new Date(Date.UTC(2024, 0, 1, 12));
    createOrbitPath = vi.fn(() => ({ isGarbage: false }));
    vi.spyOn(ServiceLocator, 'getLineManager').mockReturnValue({ createOrbitPath } as unknown as ReturnType<typeof ServiceLocator.getLineManager>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('draws the orbit for a TLE that propagates', () => {
    new OrbitPreview().update(ISS_1, ISS_2);

    expect(createOrbitPath).toHaveBeenCalledTimes(2);
    expect((createOrbitPath.mock.calls[0] as unknown[])[0]).toHaveLength(129);
  });

  it('draws nothing and removes an earlier orbit when the TLE fails to propagate', () => {
    const preview = new OrbitPreview();

    preview.update(ISS_1, ISS_2);
    const earlier = createOrbitPath.mock.results[0].value as { isGarbage: boolean };

    preview.update(BAD_1, BAD_2);

    expect(createOrbitPath).toHaveBeenCalledTimes(2);
    expect(earlier.isGarbage).toBe(true);
  });

  it('draws an inertial ring for 3D views and an Earth-fixed ground track for the flat map (#476)', () => {
    new OrbitPreview().update(ISS_1, ISS_2);

    const ring = createOrbitPath.mock.results[0].value as { viewFilter?: string; isEcefData?: boolean };
    const track = createOrbitPath.mock.results[1].value as { viewFilter?: string; isEcefData?: boolean };

    expect(ring.viewFilter).toBe('other');
    expect(ring.isEcefData).toBeUndefined();
    expect(track.viewFilter).toBe('flat');
    expect(track.isEcefData).toBe(true);
  });

  it('a geostationary ring does not sweep the whole map once rotated to ECEF (#476)', () => {
    const r = 42164;
    const n = 100;
    const ring: [number, number, number][] = [];
    const gmsts: number[] = [];

    for (let i = 0; i <= n; i++) {
      const a = (2 * Math.PI * i) / n;

      ring.push([r * Math.cos(a), r * Math.sin(a), 0]);
      gmsts.push(a); // GEO: Earth turns exactly as fast as the satellite
    }
    const lons = (pts: [number, number, number][]) => pts.map(([x, y]) => Math.atan2(y, x));
    const span = (v: number[]) => Math.max(...v) - Math.min(...v);

    expect(span(lons(ring))).toBeGreaterThan(Math.PI);
    expect(span(lons(rotateToEcef(ring, gmsts)))).toBeLessThan(0.01);
  });
});
