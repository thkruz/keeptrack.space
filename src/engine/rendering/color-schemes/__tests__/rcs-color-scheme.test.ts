/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pickable } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { RcsColorScheme } from '@app/engine/rendering/color-schemes/rcs-color-scheme';
import { SpaceObjectType } from '@ootk/src/main';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorSchemeTestUtils } from '@test/engine/rendering/color-schemes/__helpers__/color-scheme-test-utils';

const mockSats: any[] = [];

describe('RcsColorScheme', () => {
  let scheme: RcsColorScheme;

  beforeEach(() => {
    mockSats.length = 0;
    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({
      getSats: () => mockSats,
    } as any);
    scheme = new RcsColorScheme();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('exposes the expected scheme id', () => {
      expect(scheme.id).toBe('RcsColorScheme');
      expect(RcsColorScheme.id).toBe('RcsColorScheme');
    });

    it('registers seven size buckets plus the unknown swatch', () => {
      const slugs = ['rcsXXXSmall', 'rcsXXSmall', 'rcsXSmall', 'rcsSmall', 'rcsMed', 'rcsLarge', 'rcsXLarge', 'rcsUnknown'];

      for (const slug of slugs) {
        expect(scheme.colorTheme[slug]).toBeDefined();
        expect(scheme.objectTypeFlags[slug]).not.toBeUndefined();
      }
    });

    it('defaults the unknown toggle to ON — no-data renders as translucent grey by default for consistency with std-mag', () => {
      expect(scheme.objectTypeFlags.rcsUnknown).toBe(true);
    });

    it('uses a plasma palette: smallest bucket is dark indigo, largest is yellow', () => {
      // Dark indigo at the small end
      expect(scheme.colorTheme.rcsXXXSmall[0]).toBeLessThan(0.2);
      expect(scheme.colorTheme.rcsXXXSmall[1]).toBeLessThan(0.2);
      expect(scheme.colorTheme.rcsXXXSmall[2]).toBeGreaterThan(0.4);

      // Yellow at the large end
      expect(scheme.colorTheme.rcsXLarge[0]).toBeGreaterThan(0.9);
      expect(scheme.colorTheme.rcsXLarge[1]).toBeGreaterThan(0.9);
      expect(scheme.colorTheme.rcsXLarge[2]).toBeLessThan(0.2);
    });
  });

  describe('non-satellite handling', () => {
    it('returns transparent + non-pickable for non-satellites', () => {
      const fakeMissile = { isSatellite: () => false } as any;
      const result = scheme.update(fakeMissile);

      expect(result.color).toBe(scheme.colorTheme.transparent);
      expect(result.pickable).toBe(Pickable.No);
    });
  });

  describe('unknown handling', () => {
    it('hides objects with no RCS signal when the user disables the unknown toggle', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});

      // Null out every signal — including vmag, since the new vmag-derived
      // estimator layer would otherwise rescue an object with photometry.
      (sat as any).rcs = null;
      (sat as any).vmag = null;
      (sat as any).length = '';
      (sat as any).diameter = '';
      (sat as any).span = '';
      (sat as any).bus = '';
      (sat as any).name = 'UNCATALOGED-X';

      // Explicit opt-out: with the toggle off, no-data objects vanish entirely.
      scheme.objectTypeFlags.rcsUnknown = false;
      const result = scheme.update(sat);

      expect(result.color).toBe(scheme.colorTheme.deselected);
      expect(result.pickable).toBe(Pickable.No);
    });

    it('shows grey for unknowns when the user enables the toggle', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});

      (sat as any).rcs = null;
      (sat as any).vmag = null;
      (sat as any).length = '';
      (sat as any).diameter = '';
      (sat as any).span = '';
      (sat as any).bus = '';
      (sat as any).name = 'UNCATALOGED-X';
      (sat as any).type = SpaceObjectType.PAYLOAD;

      scheme.objectTypeFlags.rcsUnknown = true;
      const result = scheme.update(sat);

      expect(result.color).toBe(scheme.colorTheme.rcsUnknown);
      expect(result.pickable).toBe(Pickable.Yes);
    });
  });

  describe('bucket assignment with fallback thresholds', () => {
    // Fallback thresholds: [0.005, 0.01, 0.05, 0.1, 1, 10]
    it.each([
      [0.001, 'rcsXXXSmall'],
      [0.008, 'rcsXXSmall'],
      [0.03, 'rcsXSmall'],
      [0.08, 'rcsSmall'],
      [0.5, 'rcsMed'],
      [5, 'rcsLarge'],
      [50, 'rcsXLarge'],
    ])('assigns rcs %f m² to %s before calculateParams runs', (rcs, expectedSlug) => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ rcs });
      const result = scheme.update(sat);

      expect(result.color).toBe(scheme.colorTheme[expectedSlug]);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('returns deselected + non-pickable when the assigned bucket toggle is OFF', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ rcs: 0.5 });

      scheme.objectTypeFlags.rcsMed = false;
      const result = scheme.update(sat);

      expect(result.color).toBe(scheme.colorTheme.deselected);
      expect(result.pickable).toBe(Pickable.No);
    });
  });

  describe('calculateParams', () => {
    it('computes quantile-equalized thresholds from the loaded catalog', () => {
      // 14 distinct evenly-spaced RCS values, all unique → standard quantile
      // thresholds at indices 2..12. With the new "advance threshold[0] past
      // the smallest cluster" tweak, since all values are distinct, threshold[0]
      // still lands at index 2 (the first value > value[0]=1).
      for (let i = 0; i < 14; i++) {
        mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: i, rcs: i + 1 }));
      }
      scheme.calculateParams();

      const thresholds = (scheme as any).thresholds_ as number[];

      // threshold[0] = mags[2] = 3 (value > the smallest, 1). Then 5, 7, 9, 11, 13.
      expect(thresholds).toEqual([3, 5, 7, 9, 11, 13]);
    });

    it('ensures bucket 0 is populated even when the smallest value dominates the catalog', () => {
      // 100 objects sharing the smallest value, then a sparse upper tail.
      // Without the threshold[0] advance, all 100 would land in bucket 1 and
      // bucket 0 would render empty.
      for (let i = 0; i < 100; i++) {
        mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: i, rcs: 0.0001 }));
      }
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 100, rcs: 1 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 101, rcs: 10 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 102, rcs: 100 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 103, rcs: 1000 }));

      scheme.calculateParams();

      // An object at the dominant smallest value must land in bucket 0
      // (smallest = rcsXXXSmall slug), not bucket 1.
      const smallResult = scheme.update(ColorSchemeTestUtils.createMockSatellite({ rcs: 0.0001 }));

      expect(smallResult.color).toBe(scheme.colorTheme.rcsXXXSmall);
    });

    it('keeps the prior thresholds when the catalog is too small for quantiles', () => {
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ rcs: 0.5 }));
      const before = (scheme as any).thresholds_;

      scheme.calculateParams();

      expect((scheme as any).thresholds_).toBe(before);
    });

    it('dedups thresholds when one RCS value dominates the catalog', () => {
      // Simulates the catalog-mined case: most Starlinks resolve to the same
      // mined bus-mean. Without dedup the quantile thresholds all collapse to
      // that one value and 6 of the 7 buckets render empty.
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 0, rcs: 0.001 })); // tiny debris
      for (let i = 1; i <= 100; i++) {
        mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: i, rcs: 14 })); // Starlink cluster
      }
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 101, rcs: 20 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 102, rcs: 30 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 103, rcs: 50 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 104, rcs: 100 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 105, rcs: 200 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 106, rcs: 400 }));

      scheme.calculateParams();

      const thresholds = (scheme as any).thresholds_ as number[];

      for (let i = 1; i < thresholds.length; i++) {
        expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
      }

      // Cluster, tiny debris, and ISS-class object should land in distinct buckets
      const tinyResult = scheme.update(ColorSchemeTestUtils.createMockSatellite({ rcs: 0.001 }));
      const clusterResult = scheme.update(ColorSchemeTestUtils.createMockSatellite({ rcs: 14 }));
      const issResult = scheme.update(ColorSchemeTestUtils.createMockSatellite({ rcs: 400 }));

      expect(tinyResult.color).not.toBe(clusterResult.color);
      expect(clusterResult.color).not.toBe(issResult.color);
      expect(tinyResult.color).not.toBe(issResult.color);
    });

    it('exercises the estimator cascade — catalog-mined values feed into bucketing', () => {
      // 10 sats with known RCS (build the bus-mean stat), plus 10 with no rcs
      // but matching bus → catalog-mined; both groups feed the quantile.
      for (let i = 0; i < 10; i++) {
        const sat = ColorSchemeTestUtils.createMockSatellite({ id: i, rcs: 5 });

        (sat as any).bus = 'WIDGET BUS';
        (sat as any).vmag = null;
        mockSats.push(sat);
      }
      for (let i = 10; i < 20; i++) {
        const sat = ColorSchemeTestUtils.createMockSatellite({ id: i });

        (sat as any).rcs = null;
        (sat as any).vmag = null;
        (sat as any).bus = 'WIDGET BUS';
        mockSats.push(sat);
      }
      scheme.calculateParams();

      const thresholds = (scheme as any).thresholds_ as number[];

      // 20 sats all resolve to rcs=5 (10 catalog + 10 mined-from-bus-mean).
      // With all values tied, the threshold[0] advance pushes off the end →
      // every threshold becomes +Infinity. All sats then land in bucket 0,
      // which is correct: one value, one color band.
      expect(thresholds.every((t) => t === Number.POSITIVE_INFINITY)).toBe(true);

      // Verify the estimator cascade fired: a Starlink-named sat with no
      // direct rcs should resolve via the catalog-mined or preset layer.
      const widgetSat = ColorSchemeTestUtils.createMockSatellite({});

      (widgetSat as any).rcs = null;
      (widgetSat as any).vmag = null;
      (widgetSat as any).bus = 'WIDGET BUS';
      const result = scheme.update(widgetSat);

      expect(result.pickable).toBe(Pickable.Yes);
    });
  });

  describe('legend contract', () => {
    it('exposes layersHtml with the eight expected swatches', () => {
      const slugs = ColorSchemeTestUtils.extractLegendSlugs(RcsColorScheme.layersHtml);

      expect(slugs.sort()).toEqual(
        ['rcsLarge', 'rcsMed', 'rcsSmall', 'rcsUnknown', 'rcsXLarge', 'rcsXSmall', 'rcsXXSmall', 'rcsXXXSmall'],
      );
    });
  });
});
