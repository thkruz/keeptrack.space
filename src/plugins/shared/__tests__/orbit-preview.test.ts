import { ServiceLocator } from '@app/engine/core/service-locator';
import { OrbitPreview } from '@app/plugins/shared/orbit-preview';
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

    expect(createOrbitPath).toHaveBeenCalledTimes(1);
    expect((createOrbitPath.mock.calls[0] as unknown[])[0]).toHaveLength(129);
  });

  it('draws nothing and removes an earlier orbit when the TLE fails to propagate', () => {
    const preview = new OrbitPreview();

    preview.update(ISS_1, ISS_2);
    const earlier = createOrbitPath.mock.results[0].value as { isGarbage: boolean };

    preview.update(BAD_1, BAD_2);

    expect(createOrbitPath).toHaveBeenCalledTimes(1);
    expect(earlier.isGarbage).toBe(true);
  });
});
