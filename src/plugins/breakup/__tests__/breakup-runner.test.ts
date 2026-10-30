import { AnalystSlotReservations } from '@app/app/data/analyst-slot-reservations';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { BreakupVariationParams, selectAnalystSlots } from '@app/plugins/breakup/breakup-core';
import { runBreakup } from '@app/plugins/breakup/breakup-runner';
import { settingsManager } from '@app/settings/settings';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

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

  describe('analyst slot ownership', () => {
    /** Ten analyst slots (90000-90009) at catalog ids 0-9; `active` marks the ones another tool filled. */
    const installSlots = (active: number[] = []) => {
      const catalog = ServiceLocator.getCatalogManager();
      const slots = Array.from({ length: 10 }, (_, i) => ({ id: i, sccNum: String(90000 + i), active: active.includes(i), name: `Analyst Sat ${i}`, country: 'ANALSAT' }));

      catalog.objectCache = slots as never;
      vi.spyOn(catalog, 'sccNum2Id').mockImplementation(((scc: string) => {
        const i = Number(scc) - 90000;

        return i >= 0 && i < slots.length ? i : null;
      }) as never);
      vi.spyOn(catalog, 'seedDotPosition').mockImplementation(() => undefined as never);
      catalog.satCruncherThread = { sendSatEdit: vi.fn() } as never;
      vi.spyOn(ServiceLocator.getOrbitManager(), 'changeOrbitBufferData').mockImplementation(() => undefined as never);
      settingsManager.maxAnalystSats = 10;

      return catalog;
    };
    const epoch = new Date('2021-10-02T15:00:00Z');

    afterEach(() => {
      AnalystSlotReservations.clear();
      vi.restoreAllMocks();
    });

    it('selectAnalystSlots shifts past unusable numbers and fails when the block runs out', () => {
      const blocked = new Set([90001, 90003]);
      const writable = (num: number) => !blocked.has(num);

      expect(selectAnalystSlots(90000, 3, 90010, writable)).toEqual([90000, 90002, 90004]);
      expect(selectAnalystSlots(90007, 4, 90010, writable)).toBeNull();
    });

    it('skips a reserved id and an active object another tool made, never overwriting them', () => {
      const catalog = installSlots([1]);
      const foreign = catalog.objectCache[1];

      AnalystSlotReservations.reserve('90000', 'new-launch');
      const result = runBreakup(new Satellite({ tle1: TLE1, tle2: TLE2 }), params({ breakupCount: 3 }), epoch);

      expect(result.error).toBeNull();
      expect(result.createdIds.length + result.reenteredCount + result.failedCount).toBe(3);
      expect(result.createdIds.every((id) => id >= 2)).toBe(true);
      expect(catalog.objectCache[1]).toBe(foreign);
      expect((catalog.objectCache[0] as { active: boolean }).active).toBe(false);
    });

    it('reports noFreeSlots instead of overwriting when too few slots are usable', () => {
      installSlots([2, 3, 4, 5, 6, 7, 8, 9]);

      const result = runBreakup(new Satellite({ tle1: TLE1, tle2: TLE2 }), params({ breakupCount: 3 }), epoch);

      expect(result.error).toBe('noFreeSlots');
      expect(result.createdIds).toHaveLength(0);
    });

    it("a re-run may overwrite the previous run's own pieces but not a piece another tool replaced", () => {
      const catalog = installSlots();
      const sat = new Satellite({ tle1: TLE1, tle2: TLE2 });
      const first = runBreakup(sat, params({ breakupCount: 2 }), epoch);

      expect(first.createdIds).toEqual([0, 1]);

      // Re-run with the first run's pieces reusable: same slots.
      const second = runBreakup(sat, params({ breakupCount: 2 }), epoch, undefined, { reusableIds: first.createdIds });

      expect(second.createdIds).toEqual([0, 1]);

      // Without reuse rights the active pieces are protected and the cloud shifts.
      const third = runBreakup(sat, params({ breakupCount: 2 }), epoch);

      expect(third.createdIds).toEqual([2, 3]);

      // Another tool replaced piece 0: the id is no longer reusable.
      catalog.objectCache[0] = { id: 0, sccNum: '90000', active: true, name: 'Created Sat' } as never;
      const fourth = runBreakup(sat, params({ breakupCount: 2 }), epoch, undefined, { reusableIds: [0, 1] });

      expect(fourth.createdIds).toEqual([1, 4]);
      expect((catalog.objectCache[0] as { name: string }).name).toBe('Created Sat');
    });
  });
});
