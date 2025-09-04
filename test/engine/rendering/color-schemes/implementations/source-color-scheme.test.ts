/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undefined */
import { Pickable } from '@app/engine/core/interfaces';
import { SourceColorScheme } from '@app/engine/rendering/color-schemes/source-color-scheme';
import { ColorSchemeTestUtils } from '../__helpers__/color-scheme-test-utils';

// Mock dependencies
jest.mock('@app/keepTrackApi', () => ({
  keepTrackApi: {
    html: (strings: TemplateStringsArray) => strings[0],
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

describe('SourceColorScheme', () => {
  let colorScheme: SourceColorScheme;

  beforeEach(() => {
    colorScheme = new SourceColorScheme();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct label and id', () => {
      expect(colorScheme.label).toBe('Data Source');
      expect(colorScheme.id).toBe('SourceColorScheme');
      expect(SourceColorScheme.id).toBe('SourceColorScheme');
    });

    it('should initialize color theme', () => {
      expect(colorScheme.colorTheme.sourceCelestrak).toBeDefined();
      expect(colorScheme.colorTheme.sourceUssf).toBeDefined();
      expect(colorScheme.colorTheme.sourceVimpel).toBeDefined();
    });
  });

  describe('Color Assignment Logic', () => {
    it('should assign Celestrak color for Celestrak source', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ source: 'Celestrak' });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.sourceCelestrak);
    });

    it('should assign Space-Track color for Space-Track source', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ source: 'USSF' });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.sourceUssf);
    });

    it('should assign Other color for unknown source', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ source: 'JSC Vimpel' });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.sourceVimpel);
    });

    it('should assign Other color for missing source', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.countryOther);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should provide consistent colors for identical sources', () => {
      const sat1 = ColorSchemeTestUtils.createMockSatellite({ source: 'Celestrak' });
      const sat2 = ColorSchemeTestUtils.createMockSatellite({ id: sat1.id + 1000, source: 'Celestrak' });
      const result1 = colorScheme.update(sat1);
      const result2 = colorScheme.update(sat2);

      expect(result1.color).toEqual(result2.color);
      expect(result1.pickable).toBe(result2.pickable);
    });
  });

  describe('Lifecycle Methods', () => {
    it('should have proper legendHtml', () => {
      expect(SourceColorScheme.layersHtml).toContain('Celestrak');
      expect(SourceColorScheme.layersHtml).toContain('18 SDS');
      expect(SourceColorScheme.layersHtml).toContain('Vimpel');
    });
  });

  describe('Bulk Testing with Test Collection', () => {
    it('should handle all test satellites without errors', () => {
      const testSatellites = ColorSchemeTestUtils.createTestSatelliteCollection();

      ColorSchemeTestUtils.testColorSchemeWithSatellites(
        colorScheme,
        testSatellites.map((sat, i) => {
          if (i % 3 === 0) {
            sat.source = 'Celestrak';
          } else if (i % 3 === 1) {
            sat.source = 'USSF';
          } else {
            sat.source = 'Other';
          }

          return sat;
        }),
        (sat, scheme) => (scheme as SourceColorScheme).update(sat),
      );
    });
  });

  describe('Performance Characteristics', () => {
    it('should process large numbers of satellites efficiently', () => {
      const largeSatelliteSet = Array.from({ length: 1000 }, (_, i) => {
        const sat = ColorSchemeTestUtils.createMockSatellite({ id: i });

        sat.source = ['Celestrak', 'Space-Track', 'Other'][i % 3];

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
