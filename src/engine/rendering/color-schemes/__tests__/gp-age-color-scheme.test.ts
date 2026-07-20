/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undefined */
import { Pickable } from '@app/engine/core/interfaces';
import { GpAgeColorScheme } from '@app/engine/rendering/color-schemes/gp-age-color-scheme';
import { ColorSchemeTestUtils } from '@test/engine/rendering/color-schemes/__helpers__/color-scheme-test-utils';
import { vi } from 'vitest';

vi.mock('@app/keepTrackApi', () => ({
  keepTrackApi: {
    html: (strings: TemplateStringsArray) => strings[0],
  },
}));

vi.mock('@app/settings/settings', () => ({
  settingsManager: {
    colors: {
      transparent: [0, 0, 0, 0],
      deselected: [0.1, 0.1, 0.1, 0.5],
    },
  },
}));

describe('GpAgeColorScheme', () => {
  let colorScheme: GpAgeColorScheme;

  beforeEach(() => {
    colorScheme = new GpAgeColorScheme();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct id', () => {
      expect(colorScheme.id).toBe('GpAgeColorScheme');
      expect(GpAgeColorScheme.id).toBe('GpAgeColorScheme');
    });

    it('should initialize age color theme', () => {
      expect(colorScheme.colorTheme.age1).toBeDefined();
      expect(colorScheme.colorTheme.age7).toBeDefined();
    });
  });

  describe('Color Assignment Logic', () => {
    // Default mock TLE epoch: year 2025, day 341.54791667
    const epochParams = { year: 25, jday: 341.54791667 };

    it('should assign age1 for fresh element set (<0.5 days old)', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});
      const result = colorScheme.update(sat, { ...epochParams, jday: epochParams.jday + 0.3 });

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.age1);
    });

    it('should assign age7 for stale element set (>3 days old)', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});
      const result = colorScheme.update(sat, { ...epochParams, jday: epochParams.jday + 5 });

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.age7);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    /*
     * Regression test for issue #1319: HoverManager passes the catalog object
     * directly to update(); a Satellite that landed in the catalog without
     * a populated tle1 (e.g. user-created or OMM-only entry) used to crash
     * with "Cannot read properties of undefined (reading 'substring')".
     */
    it('should not throw when sat.tle1 is undefined', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});

      (sat as any).tle1 = undefined;

      let result: ReturnType<typeof colorScheme.update> | undefined;

      expect(() => {
        result = colorScheme.update(sat);
      }).not.toThrow();

      expect(result).toBeDefined();
      expect(result!.pickable).toBe(Pickable.No);
      expect(result!.color).toEqual(colorScheme.colorTheme.transparent);
    });

    it('should not throw when sat.tle1 is too short to slice the epoch', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});

      (sat as any).tle1 = '1 25544U';

      let result: ReturnType<typeof colorScheme.update> | undefined;

      expect(() => {
        result = colorScheme.update(sat);
      }).not.toThrow();

      expect(result).toBeDefined();
      expect(result!.pickable).toBe(Pickable.No);
      expect(result!.color).toEqual(colorScheme.colorTheme.transparent);
    });
  });

  describe('Lifecycle Methods', () => {
    it('should have proper layersHtml', () => {
      expect(GpAgeColorScheme.layersHtml).toContain('Less Than 0.5 Days');
      expect(GpAgeColorScheme.layersHtml).toContain('More Than 3 Days');
    });
  });
});
