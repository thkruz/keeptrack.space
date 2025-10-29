/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undefined */
import { Pickable } from '@app/engine/core/interfaces';
import { MissionColorScheme } from '@app/engine/rendering/color-schemes/mission-color-scheme';
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

describe('MissionColorScheme', () => {
  let colorScheme: MissionColorScheme;

  beforeEach(() => {
    colorScheme = new MissionColorScheme();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct label and id', () => {
      expect(colorScheme.label).toBe('Mission');
      expect(colorScheme.id).toBe('MissionColorScheme');
      expect(MissionColorScheme.id).toBe('MissionColorScheme');
    });

    it('should initialize unique color theme', () => {
      expect(colorScheme.colorTheme.missionMilitary).toEqual([0.8, 0.0, 0.0, 1.0]);
      expect(colorScheme.colorTheme.missionCommunications).toEqual([0.0, 0.5, 1.0, 1.0]);
      expect(colorScheme.colorTheme.missionTechnology).toEqual([0.0, 1.0, 0.0, 1.0]);
      expect(colorScheme.colorTheme.missionEarthObservation).toEqual([0.5, 0.25, 0.0, 1.0]);
    });

    it('should initialize object type flags', () => {
      expect(colorScheme.objectTypeFlags.missionMilitary).toBe(true);
      expect(colorScheme.objectTypeFlags.missionCommunications).toBe(true);
      expect(colorScheme.objectTypeFlags.missionTechnology).toBe(true);
      expect(colorScheme.objectTypeFlags.missionEarthObservation).toBe(true);
    });
  });

  describe('Color Assignment Logic', () => {
    it('should color military missions red', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ mission: 'military reconnaissance' });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(ColorSchemeTestUtils.colorsEqual(result.color, colorScheme.colorTheme.missionMilitary)).toBe(true);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('should color communication missions sky blue', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ mission: 'communications' });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(ColorSchemeTestUtils.colorsEqual(result.color, colorScheme.colorTheme.missionCommunications)).toBe(true);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('should color technology missions green', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ mission: 'technology demonstration' });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(ColorSchemeTestUtils.colorsEqual(result.color, colorScheme.colorTheme.missionTechnology)).toBe(true);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('should color earth observation missions brown', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ mission: 'earth observation' });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(ColorSchemeTestUtils.colorsEqual(result.color, colorScheme.colorTheme.missionEarthObservation)).toBe(true);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('should color science missions yellow', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ mission: 'space science' });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(ColorSchemeTestUtils.colorsEqual(result.color, colorScheme.colorTheme.missionScience)).toBe(true);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('should color astronomy missions purple', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ mission: 'astronomy observatory' });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(ColorSchemeTestUtils.colorsEqual(result.color, colorScheme.colorTheme.missionAstronomy)).toBe(true);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('should color navigation missions orange', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ mission: 'navigation' });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(ColorSchemeTestUtils.colorsEqual(result.color, colorScheme.colorTheme.missionNavigation)).toBe(true);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('should color unknown/other missions gray', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ mission: 'unknown mission type' });
      const result = colorScheme.update(sat);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(ColorSchemeTestUtils.colorsEqual(result.color, colorScheme.colorTheme.missionOther)).toBe(true);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('should return deselected color for non-satellite objects', () => {
      const nonSatellite = { id: 999 } as any;
      const result = colorScheme.update(nonSatellite);

      expect(ColorSchemeTestUtils.colorsEqual(result.color, colorScheme.colorTheme.deselected)).toBe(true);
      expect(result.pickable).toBe(Pickable.No);
    });
  });

  describe('Object Type Flag Filtering', () => {
    it('should hide military missions when flag is disabled', () => {
      colorScheme.objectTypeFlags.missionMilitary = false;
      const sat = ColorSchemeTestUtils.createMockSatellite({ mission: 'military' });
      const result = colorScheme.update(sat);

      expect(ColorSchemeTestUtils.colorsEqual(result.color, colorScheme.colorTheme.deselected)).toBe(true);
      expect(result.pickable).toBe(Pickable.No);
    });

    it('should hide communications missions when flag is disabled', () => {
      colorScheme.objectTypeFlags.missionCommunications = false;
      const sat = ColorSchemeTestUtils.createMockSatellite({ mission: 'communications' });
      const result = colorScheme.update(sat);

      expect(result.pickable).toBe(Pickable.No);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should provide consistent colors for identical objects', () => {
      const sat1 = ColorSchemeTestUtils.createMockSatellite({ mission: 'military' });
      const sat2 = ColorSchemeTestUtils.createMockSatellite({ id: sat1.id + 1000, mission: 'military' });
      const result1 = colorScheme.update(sat1);
      const result2 = colorScheme.update(sat2);

      expect(ColorSchemeTestUtils.colorsEqual(result1.color, result2.color)).toBe(true);
      expect(result1.pickable).toBe(result2.pickable);
    });

    it('should handle empty mission gracefully', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({ mission: '' });
      const result = colorScheme.update(sat);

      expect(ColorSchemeTestUtils.colorsEqual(result.color, colorScheme.colorTheme.missionOther)).toBe(true);
      expect(result.pickable).toBe(Pickable.Yes);
    });
  });

  describe('Lifecycle Methods', () => {
    it('should have proper legendHtml', () => {
      expect(MissionColorScheme.layersHtml).toContain('Military');
      expect(MissionColorScheme.layersHtml).toContain('Communications');
      expect(MissionColorScheme.layersHtml).toContain('Technology');
    });
  });

  describe('Bulk Testing with Test Collection', () => {
    it('should handle all test satellites without errors', () => {
      const testSatellites = ColorSchemeTestUtils.createTestSatelliteCollection();

      ColorSchemeTestUtils.testColorSchemeWithSatellites(
        colorScheme,
        testSatellites,
        (sat, scheme) => (scheme as MissionColorScheme).update(sat),
      );
    });
  });

  describe('Performance Characteristics', () => {
    it('should process large numbers of satellites efficiently', () => {
      const largeSatelliteSet = Array.from({ length: 1000 }, (_, i) =>
        ColorSchemeTestUtils.createMockSatellite({
          id: i,
          mission: ['military', 'communications', 'technology', 'earth observation', 'science', 'astronomy', 'navigation', 'other'][i % 8],
        }),
      );
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
