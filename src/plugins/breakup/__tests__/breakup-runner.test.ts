import { runBreakup } from '@app/plugins/breakup/breakup-runner';
import { BreakupVariationParams } from '@app/plugins/breakup/breakup-core';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';

const TLE1 = '1 25544U 98067A   21275.61828767  .00000808  00000-0  26368-4 0  9993' as TleLine1;
const TLE2 = '2 25544  51.6443  82.0195 0002976  83.8537 276.3289 15.48978703297422' as TleLine2;

const params = (over: Partial<BreakupVariationParams> = {}): BreakupVariationParams => ({
  breakupCount: 5,
  radialDeltaV: 40,
  inTrackDeltaV: 40,
  crossTrackDeltaV: 40,
  startNum: 90000,
  ...over,
});

describe('breakup-runner', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  it('rejects an analyst-slot range outside the reserved analyst block', () => {
    const sat = new Satellite({ tle1: TLE1, tle2: TLE2 });
    // A start number below CatalogManager.ANALYST_START_ID (90000) is out of range.
    const result = runBreakup(sat, params({ startNum: 100 }), new Date('2021-10-02T15:00:00Z'));

    expect(result.error).toBe('invalidSlotRange');
    expect(result.createdIds).toHaveLength(0);
  });

  it('rejects a zero-count breakup', () => {
    const sat = new Satellite({ tle1: TLE1, tle2: TLE2 });
    const result = runBreakup(sat, params({ breakupCount: 0 }), new Date('2021-10-02T15:00:00Z'));

    expect(result.error).toBe('invalidSlotRange');
  });
});
