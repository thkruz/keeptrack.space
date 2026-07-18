/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undefined */
import { Pickable } from '@app/engine/core/interfaces';
import { ConfidenceColorScheme } from '@app/engine/rendering/color-schemes/confidence-color-scheme';
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

const baseTle = '1 25544U 98067A   25341.54791667  .00016717  00000-0  10270-3 0  9004';

const tleWithConfidence = (digit: string): string => `${baseTle.substring(0, 64)}${digit}${baseTle.substring(65)}`;

describe('ConfidenceColorScheme', () => {
  let colorScheme: ConfidenceColorScheme;

  beforeEach(() => {
    colorScheme = new ConfidenceColorScheme();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct id', () => {
      expect(colorScheme.id).toBe('ConfidenceColorScheme');
      expect(ConfidenceColorScheme.id).toBe('ConfidenceColorScheme');
    });

    it('should initialize confidence color theme', () => {
      expect(colorScheme.colorTheme.confidenceLow).toBeDefined();
      expect(colorScheme.colorTheme.confidenceMed).toBeDefined();
      expect(colorScheme.colorTheme.confidenceHi).toBeDefined();
    });
  });

  describe('Color Assignment Logic', () => {
    it('should assign confidenceHi for score >= 7', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});

      (sat as any).tle1 = tleWithConfidence('8');
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.confidenceHi);
    });

    it('should assign confidenceMed for score 4..6', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});

      (sat as any).tle1 = tleWithConfidence('5');
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.confidenceMed);
    });

    it('should assign confidenceLow for score < 4', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});

      (sat as any).tle1 = tleWithConfidence('2');
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.confidenceLow);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    /*
     * Regression test for issue #1319: ConfidenceColorScheme reads
     * sat.tle1.substring(64, 65) without checking that tle1 exists or is
     * long enough. Hovering over a satellite created without a TLE
     * (user-created or OMM-only) used to throw.
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

    it('should not throw when sat.tle1 is too short to slice the confidence digit', () => {
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
      expect(ConfidenceColorScheme.layersHtml).toContain('3 or Lower');
      expect(ConfidenceColorScheme.layersHtml).toContain('7 or Higher');
    });
  });
});
