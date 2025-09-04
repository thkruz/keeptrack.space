/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undefined */
import { Pickable } from '@app/engine/core/interfaces';
import { SpatialDensityColorScheme } from '@app/engine/rendering/color-schemes/spatial-density-color-scheme';
import { ColorSchemeTestUtils } from '../__helpers__/color-scheme-test-utils';

// Mock dependencies
jest.mock('@app/keepTrackApi', () => ({
  keepTrackApi: {
    html: (strings: TemplateStringsArray) => strings[0],
    getSpatialDensityManager: () => ({
      getDensityForObject: (obj: any) => obj.mockDensity ?? 0.5,
    }),
  },
}));

jest.mock('@app/settings/settings', () => ({
  settingsManager: {
    colors: {
      transparent: [0, 0, 0, 0],
      deselected: [0.1, 0.1, 0.1, 0.5],
    },
  },
}));

describe('SpatialDensityColorScheme', () => {
  let colorScheme: SpatialDensityColorScheme;

  beforeEach(() => {
    colorScheme = new SpatialDensityColorScheme();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct label and id', () => {
      expect(colorScheme.label).toBe('Spatial Density');
      expect(colorScheme.id).toBe('SpatialDensityColorScheme');
      expect(SpatialDensityColorScheme.id).toBe('SpatialDensityColorScheme');
    });

    it('should initialize color theme', () => {
      expect(colorScheme.colorTheme.spatialDensityLow).toBeDefined();
      expect(colorScheme.colorTheme.spatialDensityHi).toBeDefined();
    });
  });

  describe.skip('Color Assignment Logic', () => {
    it('should assign low density color for low density', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});

      (sat as any).mockDensity = 0.1;
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.spatialDensityLow);
    });

    it('should assign high density color for high density', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});

      (sat as any).mockDensity = 0.9;
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.spatialDensityHi);
    });

    it('should interpolate color for medium density', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});

      (sat as any).mockDensity = 0.5;
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      // Should be neither low nor high color
      expect(result.color).not.toEqual(colorScheme.colorTheme.spatialDensityLow);
      expect(result.color).not.toEqual(colorScheme.colorTheme.spatialDensityHi);
    });

    it('should return deselected color for non-satellite objects', () => {
      const nonSatellite = { id: 999 } as any;
      const result = colorScheme.update(nonSatellite);

      expect(result.color).toEqual(colorScheme.colorTheme.deselected);
      expect(result.pickable).toBe(Pickable.No);
    });
  });

  describe.skip('Edge Cases and Error Handling', () => {
    it('should handle missing density gracefully', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('should provide consistent colors for identical density', () => {
      const sat1 = ColorSchemeTestUtils.createMockSatellite({});

      (sat1 as any).mockDensity = 0.7;
      const sat2 = ColorSchemeTestUtils.createMockSatellite({ id: sat1.id + 1000 });

      (sat2 as any).mockDensity = 0.7;
      const result1 = colorScheme.update(sat1);
      const result2 = colorScheme.update(sat2);

      expect(result1.color).toEqual(result2.color);
      expect(result1.pickable).toBe(result2.pickable);
    });
  });

  describe.skip('Lifecycle Methods', () => {
    it('should have proper legendHtml', () => {
      expect(SpatialDensityColorScheme.layersHtml).toContain('Low Density');
      expect(SpatialDensityColorScheme.layersHtml).toContain('High Density');
    });
  });

  describe.skip('Bulk Testing with Test Collection', () => {
    it('should handle all test satellites without errors', () => {
      const testSatellites = ColorSchemeTestUtils.createTestSatelliteCollection();

      testSatellites.forEach((sat, i) => {
        (sat as any).mockDensity = (i % 10) / 10;
      });
      ColorSchemeTestUtils.testColorSchemeWithSatellites(
        colorScheme,
        testSatellites,
        (sat, scheme) => (scheme as SpatialDensityColorScheme).update(sat),
      );
    });
  });

  describe.skip('Performance Characteristics', () => {
    it('should process large numbers of satellites efficiently', () => {
      const largeSatelliteSet = Array.from({ length: 1000 }, (_, i) => {
        const sat = ColorSchemeTestUtils.createMockSatellite({ id: i });

        (sat as any).mockDensity = (i % 100) / 100;

        return sat;
      });
      const startTime = performance.now();

      largeSatelliteSet.forEach((sat) => {
        colorScheme.update(sat);
      });
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(100);
    });
  });
});
