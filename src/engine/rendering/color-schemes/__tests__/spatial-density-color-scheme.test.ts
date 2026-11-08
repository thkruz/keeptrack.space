/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undefined */
import { Pickable } from '@app/engine/core/interfaces';
import { SpatialDensityColorScheme } from '@app/engine/rendering/color-schemes/spatial-density-color-scheme';
import { ColorSchemeTestUtils } from '@test/engine/rendering/color-schemes/__helpers__/color-scheme-test-utils';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('@app/keepTrackApi', () => ({
  keepTrackApi: {
    html: (strings: TemplateStringsArray) => strings[0],
  },
}));

vi.mock('@app/settings/settings', () => ({
  SettingsManager: class {},
  settingsManager: {
    colors: {
      transparent: [0, 0, 0, 0],
      deselected: [0.1, 0.1, 0.1, 0.5],
      spatialDensityHi: [1, 0, 0, 1],
      spatialDensityMed: [1, 0.4, 0, 1],
      spatialDensityLow: [1, 1, 0, 0.9],
      spatialDensityOther: [0.8, 0.8, 0.8, 0.3],
    },
  },
}));

/** Orbit density bins are 25 km apart starting at 75 km; the default mock satellite sits in bin 12. */
const makeParams = (density: number) => ({
  orbitDensity: Array.from({ length: 78 }, (_, i) => ({
    minAltitude: 75 + i * 25,
    maxAltitude: 100 + i * 25,
    density,
  })) as any,
  orbitDensityMax: 1.0e-6,
});

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

  describe('Color Assignment Logic', () => {
    it('should assign low density color for low density', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});
      const result = colorScheme.update(sat, makeParams(5.0e-8));

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(settingsManager.colors.spatialDensityLow);
    });

    it('should assign medium density color for medium density', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});
      const result = colorScheme.update(sat, makeParams(1.2e-7));

      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(settingsManager.colors.spatialDensityMed);
    });

    it('should assign high density color for high density', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});
      const result = colorScheme.update(sat, makeParams(1.0e-6));

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
      expect(result.color).toEqual(settingsManager.colors.spatialDensityHi);
    });

    it('should assign the other color for negligible density', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});
      const result = colorScheme.update(sat, makeParams(0));

      expect(result.color).toEqual(settingsManager.colors.spatialDensityOther);
    });

    it('should return deselected color when the density flag is disabled', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});

      colorScheme.objectTypeFlags.spatialDensityHi = false;
      const result = colorScheme.update(sat, makeParams(1.0e-6));

      expect(result.color).toEqual(colorScheme.colorTheme.deselected);
      expect(result.pickable).toBe(Pickable.No);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should throw when the altitude is outside the matching density bin', () => {
      const sat = ColorSchemeTestUtils.createMockSatellite({});
      const params = makeParams(5.0e-8);

      params.orbitDensity = params.orbitDensity.map(() => ({ minAltitude: 0, maxAltitude: 1, density: 0 }));

      expect(() => colorScheme.update(sat, params)).toThrow();
    });

    it('should provide consistent colors for identical density', () => {
      const sat1 = ColorSchemeTestUtils.createMockSatellite({});
      const sat2 = ColorSchemeTestUtils.createMockSatellite({ id: sat1.id + 1000 });
      const result1 = colorScheme.update(sat1, makeParams(1.2e-7));
      const result2 = colorScheme.update(sat2, makeParams(1.2e-7));

      expect(result1.color).toEqual(result2.color);
      expect(result1.pickable).toBe(result2.pickable);
    });
  });

  describe('Lifecycle Methods', () => {
    it('should have proper legend html', () => {
      expect(SpatialDensityColorScheme.layersHtml).toContain('layers-spatialDensityHi-box');
      expect(SpatialDensityColorScheme.layersHtml).toContain('layers-spatialDensityLow-box');
    });
  });
});
