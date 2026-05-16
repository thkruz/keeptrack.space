/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pickable } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { VisualMagnitudeColorScheme } from '@app/engine/rendering/color-schemes/visual-magnitude-color-scheme';
import { SpaceObjectType } from '@ootk/src/main';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorSchemeTestUtils } from '../__helpers__/color-scheme-test-utils';

const mockSats: any[] = [];

describe('VisualMagnitudeColorScheme', () => {
  let scheme: VisualMagnitudeColorScheme;

  beforeEach(() => {
    mockSats.length = 0;
    // Runtime spy — vi.mock fights setupStandardEnvironment, which has
    // already wired a real CatalogManager into the ServiceLocator before
    // this test file loads.
    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({
      getSats: () => mockSats,
    } as any);
    scheme = new VisualMagnitudeColorScheme();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('exposes the expected scheme id', () => {
      expect(scheme.id).toBe('VisualMagnitudeColorScheme');
      expect(VisualMagnitudeColorScheme.id).toBe('VisualMagnitudeColorScheme');
    });

    it('registers all seven magnitude buckets plus the unknown swatch', () => {
      const slugs = ['vmagBright', 'vmagBright2', 'vmagMed1', 'vmagMed2', 'vmagDim1', 'vmagDim2', 'vmagFaint', 'vmagUnknown'];

      for (const slug of slugs) {
        expect(scheme.colorTheme[slug]).toBeDefined();
        expect(scheme.objectTypeFlags[slug]).not.toBeUndefined();
      }
    });

    it('defaults the unknown toggle to OFF — unknowns hide until users opt them in', () => {
      expect(scheme.objectTypeFlags.vmagUnknown).toBe(false);
    });

    it('uses a viridis palette: brightest bucket is yellow, faintest is dark purple', () => {
      // Yellow has high red+green, low blue
      expect(scheme.colorTheme.vmagBright[0]).toBeGreaterThan(0.9);
      expect(scheme.colorTheme.vmagBright[1]).toBeGreaterThan(0.9);
      expect(scheme.colorTheme.vmagBright[2]).toBeLessThan(0.2);

      // Dark purple has low red+green, moderate blue
      expect(scheme.colorTheme.vmagFaint[0]).toBeLessThan(0.4);
      expect(scheme.colorTheme.vmagFaint[1]).toBeLessThan(0.1);
      expect(scheme.colorTheme.vmagFaint[2]).toBeGreaterThan(0.2);
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
    it('hides objects with no catalog vmag and no estimable size when the toggle is OFF', () => {
      // No vmag set, no preset-matching name, no dimensions → estimator returns null
      const sat = ColorSchemeTestUtils.createMockSatellite({
        name: 'UNCATALOGED-OBJECT-X',
        vmag: undefined as any,
        rcs: undefined as any,
      });

      (sat as any).vmag = null;
      (sat as any).rcs = null;
      (sat as any).length = '';
      (sat as any).diameter = '';
      (sat as any).span = '';
      (sat as any).bus = '';

      const result = scheme.update(sat);

      // colorTheme.deselected is [1, 1, 1, 0] — alpha 0, fully invisible.
      // (Note: distinct from colorTheme.transparent which is [1, 1, 1, 0.1].)
      expect(result.color).toBe(scheme.colorTheme.deselected);
      expect(result.pickable).toBe(Pickable.No);
    });

    it('shows grey for unknowns when the user enables the toggle', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});

      (sat as any).vmag = null;
      (sat as any).rcs = null;
      (sat as any).length = '';
      (sat as any).diameter = '';
      (sat as any).span = '';
      (sat as any).bus = '';
      (sat as any).name = 'UNCATALOGED-OBJECT-X';
      (sat as any).type = SpaceObjectType.PAYLOAD;

      scheme.objectTypeFlags.vmagUnknown = true;
      const result = scheme.update(sat);

      expect(result.color).toBe(scheme.colorTheme.vmagUnknown);
      expect(result.pickable).toBe(Pickable.Yes);
    });
  });

  describe('bucket assignment with fallback thresholds', () => {
    // Fallback thresholds: [2, 4, 5.5, 6.5, 7.5, 9]
    // → bucket 0 (vmagBright)   for mag < 2
    // → bucket 1 (vmagBright2)  for mag in [2, 4)
    // → bucket 2 (vmagMed1)     for mag in [4, 5.5)
    // → bucket 3 (vmagMed2)     for mag in [5.5, 6.5)
    // → bucket 4 (vmagDim1)     for mag in [6.5, 7.5)
    // → bucket 5 (vmagDim2)     for mag in [7.5, 9)
    // → bucket 6 (vmagFaint)    for mag >= 9
    it.each([
      [-1.0, 'vmagBright'],
      [1.5, 'vmagBright'],
      [3.0, 'vmagBright2'],
      [5.0, 'vmagMed1'],
      [6.0, 'vmagMed2'],
      [7.0, 'vmagDim1'],
      [8.0, 'vmagDim2'],
      [10.0, 'vmagFaint'],
    ])('assigns mag %f to %s before calculateParams runs', (vmag, expectedSlug) => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ vmag });
      const result = scheme.update(sat);

      expect(result.color).toBe(scheme.colorTheme[expectedSlug]);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('returns deselected (zero-alpha) + non-pickable when the assigned bucket toggle is OFF', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ vmag: 5.0 });

      scheme.objectTypeFlags.vmagMed1 = false;
      const result = scheme.update(sat);

      // colorTheme.deselected is [1, 1, 1, 0] — alpha 0, fully invisible.
      expect(result.color).toBe(scheme.colorTheme.deselected);
      expect(result.pickable).toBe(Pickable.No);
    });
  });

  describe('calculateParams', () => {
    it('computes quantile-equalized thresholds from the loaded catalog', () => {
      // 14 evenly-spaced points → with 7 buckets we expect each bucket to
      // hold 2 points, and the 6 thresholds to land at indices 2, 4, 6, 8, 10, 12.
      for (let i = 0; i < 14; i++) {
        mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: i, vmag: i }));
      }
      scheme.calculateParams();

      const thresholds = (scheme as any).thresholds_ as number[];

      expect(thresholds).toEqual([2, 4, 6, 8, 10, 12]);
    });

    it('keeps the prior thresholds when the catalog is too small for quantiles', () => {
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ vmag: 4.0 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ vmag: 5.0 }));
      const before = (scheme as any).thresholds_;

      scheme.calculateParams();
      const after = (scheme as any).thresholds_;

      expect(after).toBe(before);
    });

    it('falls back to the estimator for satellites with no catalog vmag', () => {
      // A Starlink name matches a preset (vmag ~5.5) — should be counted.
      for (let i = 0; i < 14; i++) {
        const sat = ColorSchemeTestUtils.createMockSatellite({ id: i });

        (sat as any).name = `STARLINK-${i}`;
        (sat as any).vmag = null;
        (sat as any).type = SpaceObjectType.PAYLOAD;
        mockSats.push(sat);
      }
      scheme.calculateParams();

      const thresholds = (scheme as any).thresholds_ as number[];

      // All 14 sats resolve to the same preset value (5.5). The threshold[0]
      // advance pushes past the leading cluster to the next strictly greater
      // value — but no such value exists, so every threshold becomes
      // +Infinity. The estimator path still participated (we got here, not
      // an empty thresholds array).
      expect(thresholds.every((t) => t === Number.POSITIVE_INFINITY)).toBe(true);

      // Sanity check: a Starlink-named sat should resolve via the preset and
      // come back pickable, not flagged unknown.
      const sat = ColorSchemeTestUtils.createMockSatellite({});

      (sat as any).name = 'STARLINK-999';
      (sat as any).vmag = null;
      (sat as any).type = SpaceObjectType.PAYLOAD;
      const result = scheme.update(sat);

      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('dedups thresholds when one magnitude value dominates the catalog', () => {
      // Simulates the real-world case: ~5000 Starlinks all at preset 5.5 with
      // a handful of other objects spread across the magnitude range. Without
      // dedup, every threshold collapses to 5.5 and 6 of the 7 buckets render
      // empty. With dedup, thresholds advance past the cluster.
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 0, vmag: -1.3 })); // ISS
      for (let i = 1; i <= 100; i++) {
        mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: i, vmag: 5.5 }));
      }
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 101, vmag: 6.0 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 102, vmag: 7.0 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 103, vmag: 8.0 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 104, vmag: 9.0 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 105, vmag: 10.0 }));
      mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: 106, vmag: 11.0 }));

      scheme.calculateParams();

      const thresholds = (scheme as any).thresholds_ as number[];

      // Every threshold must be strictly greater than the previous one — the
      // crucial invariant for non-empty intermediate buckets.
      for (let i = 1; i < thresholds.length; i++) {
        expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
      }

      // The dominant cluster should sit between thresholds[0] and thresholds[1]
      // (bucket index 1) — i.e. it does NOT all dump into bucket 6.
      const starlinkResult = scheme.update(ColorSchemeTestUtils.createMockSatellite({ vmag: 5.5 }));
      const issResult = scheme.update(ColorSchemeTestUtils.createMockSatellite({ vmag: -1.3 }));
      const dimResult = scheme.update(ColorSchemeTestUtils.createMockSatellite({ vmag: 11.0 }));

      expect(starlinkResult.color).not.toBe(scheme.colorTheme.vmagFaint);
      expect(starlinkResult.color).not.toBe(issResult.color);
      expect(dimResult.color).not.toBe(starlinkResult.color);
    });

    it('shifts bucket assignments when thresholds are recomputed', () => {
      // First pass: catalog of large/bright objects → mag 5 lands in the
      // faint half of the distribution.
      for (let i = 0; i < 14; i++) {
        mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: i, vmag: i * 0.5 }));
      }
      scheme.calculateParams();

      const brightSat = ColorSchemeTestUtils.createMockSatellite({ vmag: 5.0 });
      const firstResult = scheme.update(brightSat);

      // Reset catalog to faint-skewed and rescan
      mockSats.length = 0;
      for (let i = 0; i < 14; i++) {
        mockSats.push(ColorSchemeTestUtils.createMockSatellite({ id: i, vmag: 8 + i * 0.5 }));
      }
      scheme.calculateParams();

      const secondResult = scheme.update(brightSat);

      // Mag 5 should be brighter (lower index slug) in the second
      // distribution. Slugs are ordered brightest→faintest in BUCKET_SLUGS.
      const slugOrder = ['vmagBright', 'vmagBright2', 'vmagMed1', 'vmagMed2', 'vmagDim1', 'vmagDim2', 'vmagFaint'];
      const firstSlugIdx = slugOrder.findIndex((s) => scheme.colorTheme[s] === firstResult.color);
      const secondSlugIdx = slugOrder.findIndex((s) => scheme.colorTheme[s] === secondResult.color);

      expect(secondSlugIdx).toBeLessThan(firstSlugIdx);
    });
  });

  describe('legend contract', () => {
    it('exposes a non-empty layersHtml with the eight expected swatches', () => {
      const slugs = ColorSchemeTestUtils.extractLegendSlugs(VisualMagnitudeColorScheme.layersHtml);

      expect(slugs.sort()).toEqual(
        ['vmagBright', 'vmagBright2', 'vmagDim1', 'vmagDim2', 'vmagFaint', 'vmagMed1', 'vmagMed2', 'vmagUnknown'],
      );
    });
  });
});
