/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undefined */
import { Pickable } from '@app/engine/core/interfaces';
import { StarlinkColorScheme } from '@app/engine/rendering/color-schemes/starlink-color-scheme';
import { PayloadStatus } from '@ootk/src/main';
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

describe('StarlinkColorScheme', () => {
  let colorScheme: StarlinkColorScheme;

  beforeEach(() => {
    colorScheme = new StarlinkColorScheme();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct label and id', () => {
      expect(colorScheme.label).toBe('Starlink');
      expect(colorScheme.id).toBe('StarlinkColorScheme');
      expect(StarlinkColorScheme.id).toBe('StarlinkColorScheme');
    });

    it('should initialize color theme', () => {
      expect(colorScheme.colorTheme.starlinkOperational).toBeDefined();
      expect(colorScheme.colorTheme.starlinkNot).toBeDefined();
      expect(colorScheme.colorTheme.starlinkOther).toBeDefined();
    });
  });

  describe('Color Assignment Logic', () => {
    it('should assign active color for active Starlink satellites', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ name: 'STARLINK-1000', status: PayloadStatus.OPERATIONAL });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.starlinkOperational);
    });

    it('should assign inactive color for inactive Starlink satellites', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ name: 'STARLINK-1001', status: PayloadStatus.NONOPERATIONAL });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.starlinkOther);
    });

    it('should assign other color for non-Starlink satellites', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ name: 'NOT-STARLINK' });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.starlinkNot);
    });

    it('should assign other color for missing name', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ name: '' });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(colorScheme.colorTheme.starlinkNot);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should provide consistent colors for identical Starlink status', () => {
      const sat1 = ColorSchemeTestUtils.createMockSatellite({ name: 'STARLINK-2000', status: PayloadStatus.OPERATIONAL });
      const sat2 = ColorSchemeTestUtils.createMockSatellite({ id: sat1.id + 1000, name: 'STARLINK-2000', status: PayloadStatus.OPERATIONAL });
      const result1 = colorScheme.update(sat1);
      const result2 = colorScheme.update(sat2);

      expect(result1.color).toEqual(result2.color);
      expect(result1.pickable).toBe(result2.pickable);
    });
  });

  describe('Lifecycle Methods', () => {
    it('should have proper legendHtml', () => {
      expect(StarlinkColorScheme.layersHtml).toContain('Operational Starlink');
      expect(StarlinkColorScheme.layersHtml).toContain('Other Starlink');
      expect(StarlinkColorScheme.layersHtml).toContain('Not Starlink');
    });
  });

  describe('Bulk Testing with Test Collection', () => {
    it('should handle all test satellites without errors', () => {
      const testSatellites = ColorSchemeTestUtils.createTestSatelliteCollection();

      ColorSchemeTestUtils.testColorSchemeWithSatellites(
        colorScheme,
        testSatellites.map((sat, i) => {
          if (i % 3 === 0) {
            sat.name = `STARLINK-${i}`;
          } else {
            sat.name = `NOT-STARLINK-${i}`;
          }

          return sat;
        }),
        (sat, scheme) => (scheme as StarlinkColorScheme).update(sat),
      );
    });
  });

  describe('Performance Characteristics', () => {
    it('should process large numbers of satellites efficiently', () => {
      const largeSatelliteSet = Array.from({ length: 1000 }, (_, i) => {
        const sat = ColorSchemeTestUtils.createMockSatellite({ id: i });

        sat.name = i % 2 === 0 ? `STARLINK-${i}` : `NOT-STARLINK-${i}`;

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
