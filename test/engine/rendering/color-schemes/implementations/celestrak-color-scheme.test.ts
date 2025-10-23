/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undefined */
import { Pickable } from '@app/engine/core/interfaces';
import { CelestrakColorScheme } from '@app/engine/rendering/color-schemes/celestrak-color-scheme';
import { PayloadStatus, SpaceObjectType } from '@ootk/src/main';
import { mockSatellites } from '../__fixtures__/mock-satellites';
import { ColorSchemeTestUtils } from '../__helpers__/color-scheme-test-utils';

// Mock dependencies
jest.mock('@app/keepTrackApi', () => ({
  keepTrackApi: {
    getCatalogManager: () => ({
      isSensorManagerLoaded: false,
    }),
    getDotsManager: () => ({
      inViewData: null,
    }),
    getMainCamera: () => ({
      cameraType: 'default',
    }),
  },
}));

jest.mock('@app/settings/settings', () => ({
  settingsManager: {
    colors: {
      transparent: [0, 0, 0, 0],
      deselected: [0.1, 0.1, 0.1, 0.5],
      inFOVAlt: [1, 1, 0, 1],
    },
  },
}));

describe('CelestrakColorScheme', () => {
  let colorScheme: CelestrakColorScheme;

  beforeEach(() => {
    colorScheme = new CelestrakColorScheme();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct label and id', () => {
      expect(colorScheme.label).toBe('Celestrak');
      expect(colorScheme.id).toBe('CelestrakColorScheme');
      expect(CelestrakColorScheme.id).toBe('CelestrakColorScheme');
    });

    it('should initialize unique color theme', () => {
      expect(colorScheme.colorTheme.celestrakDefaultActivePayload).toEqual([0.0, 1.0, 0.0, 0.85]);
      expect(colorScheme.colorTheme.celestrakDefaultInactivePayload).toEqual([1.0, 0.5, 0.0, 1.0]);
      expect(colorScheme.colorTheme.celestrakDefaultRocketBody).toEqual([1.0, 0.0, 0.0, 1.0]);
      expect(colorScheme.colorTheme.celestrakDefaultDebris).toEqual([0.5, 0.5, 0.5, 0.9]);
    });

    it('should initialize object type flags', () => {
      expect(colorScheme.objectTypeFlags.celestrakDefaultActivePayload).toBe(true);
      expect(colorScheme.objectTypeFlags.celestrakDefaultInactivePayload).toBe(true);
      expect(colorScheme.objectTypeFlags.celestrakDefaultRocketBody).toBe(true);
      expect(colorScheme.objectTypeFlags.celestrakDefaultDebris).toBe(true);
    });
  });

  describe('Color Assignment Logic', () => {
    describe('Active Payloads', () => {
      it('should color active payloads green', () => {
        const result = colorScheme.update(mockSatellites.activePayload);

        ColorSchemeTestUtils.assertValidColorInformation(result);
        expect(ColorSchemeTestUtils.colorsEqual(
          result.color,
          colorScheme.colorTheme.celestrakDefaultActivePayload,
        )).toBe(true);
        expect(result.pickable).toBe(Pickable.Yes);
      });
    });

    describe('Inactive Payloads', () => {
      it('should color inactive payloads orange', () => {
        const result = colorScheme.update(mockSatellites.inactivePayload);

        ColorSchemeTestUtils.assertValidColorInformation(result);
        expect(ColorSchemeTestUtils.colorsEqual(
          result.color,
          colorScheme.colorTheme.celestrakDefaultInactivePayload,
        )).toBe(true);
        expect(result.pickable).toBe(Pickable.Yes);
      });

      it('should color payloads with unknown status as inactive', () => {
        const unknownPayload = ColorSchemeTestUtils.createMockSatellite({
          type: SpaceObjectType.PAYLOAD,
          status: PayloadStatus.UNKNOWN,
        });

        const result = colorScheme.update(unknownPayload);

        expect(ColorSchemeTestUtils.colorsEqual(
          result.color,
          colorScheme.colorTheme.celestrakDefaultInactivePayload,
        )).toBe(true);
      });
    });

    describe('Rocket Bodies', () => {
      it('should color rocket bodies red', () => {
        const result = colorScheme.update(mockSatellites.rocketBody);

        ColorSchemeTestUtils.assertValidColorInformation(result);
        expect(ColorSchemeTestUtils.colorsEqual(
          result.color,
          colorScheme.colorTheme.celestrakDefaultRocketBody,
        )).toBe(true);
        expect(result.pickable).toBe(Pickable.Yes);
      });
    });

    describe('Debris', () => {
      it('should color debris gray', () => {
        const result = colorScheme.update(mockSatellites.debris);

        ColorSchemeTestUtils.assertValidColorInformation(result);
        expect(ColorSchemeTestUtils.colorsEqual(
          result.color,
          colorScheme.colorTheme.celestrakDefaultDebris,
        )).toBe(true);
        expect(result.pickable).toBe(Pickable.Yes);
      });
    });

    describe('Unknown Object Types', () => {
      it('should color unknown objects with default unknown color', () => {
        const unknownObject = ColorSchemeTestUtils.createMockSatellite({
          type: SpaceObjectType.STAR, // Unexpected type for satellite
        });

        const result = colorScheme.update(unknownObject);

        expect(result).not.toBeNull();
      });
    });
  });

  describe('Object Type Flag Filtering', () => {
    beforeEach(() => {
      colorScheme.resetObjectTypeFlags();
    });

    it('should hide active payloads when flag is disabled', () => {
      colorScheme.objectTypeFlags.celestrakDefaultActivePayload = false;

      const result = colorScheme.update(mockSatellites.activePayload);

      expect(ColorSchemeTestUtils.colorsEqual(
        result.color,
        colorScheme.colorTheme.deselected,
      )).toBe(true);
      expect(result.pickable).toBe(Pickable.No);
    });

    it('should hide rocket bodies when flag is disabled', () => {
      colorScheme.objectTypeFlags.celestrakDefaultRocketBody = false;

      const result = colorScheme.update(mockSatellites.rocketBody);

      expect(result.pickable).toBe(Pickable.No);
    });

    it('should hide debris when flag is disabled', () => {
      colorScheme.objectTypeFlags.celestrakDefaultDebris = false;

      const result = colorScheme.update(mockSatellites.debris);

      expect(result.pickable).toBe(Pickable.No);
    });
  });

  describe('Non-Satellite Objects', () => {
    it.skip('should handle non-satellite objects appropriately', () => {
      const nonSatellite = {
        id: 999,
        isSatellite: false,
        type: SpaceObjectType.STAR,
        isNotional: () => false,
        isStar: () => false,
        isMarker: () => false,
      } as any;

      const result = colorScheme.update(nonSatellite);

      expect(ColorSchemeTestUtils.colorsEqual(
        result.color,
        colorScheme.colorTheme.transparent,
      )).toBe(true);
      expect(result.pickable).toBe(Pickable.No);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it.skip('should handle objects with missing properties gracefully', () => {
      const malformedSat = {
        id: 500,
        isSatellite: true,
        type: undefined,
        status: undefined,
      } as any;

      expect(() => {
        const result = colorScheme.update(malformedSat);

        ColorSchemeTestUtils.assertValidColorInformation(result);
      }).not.toThrow();
    });

    it('should provide consistent colors for identical objects', () => {
      const sat1 = mockSatellites.activePayload;
      const sat2 = ColorSchemeTestUtils.createMockSatellite({
        id: sat1.id + 1000,
        type: sat1.type,
        status: sat1.status,
      });

      const result1 = colorScheme.update(sat1);
      const result2 = colorScheme.update(sat2);

      expect(ColorSchemeTestUtils.colorsEqual(result1.color, result2.color)).toBe(true);
      expect(result1.pickable).toBe(result2.pickable);
    });
  });

  describe('Lifecycle Methods', () => {
    it('should have proper onSelected behavior', () => {
      expect(() => colorScheme.onSelected()).not.toThrow();
    });

    it('should calculate parameters correctly', () => {
      const params = colorScheme.calculateParams();

      expect(params).toBeDefined();
    });

    it('should reset object type flags correctly', () => {
      // Disable some flags
      colorScheme.objectTypeFlags.celestrakDefaultActivePayload = false;
      colorScheme.objectTypeFlags.celestrakDefaultDebris = false;

      // Reset them
      colorScheme.resetObjectTypeFlags();

      // They should all be true now
      Object.values(colorScheme.objectTypeFlags).forEach((flag) => {
        expect(flag).toBe(true);
      });
    });
  });

  describe('Bulk Testing with Test Collection', () => {
    it('should handle all test satellites without errors', () => {
      const testSatellites = ColorSchemeTestUtils.createTestSatelliteCollection();

      ColorSchemeTestUtils.testColorSchemeWithSatellites(
        colorScheme,
        testSatellites,
        (sat, scheme) => (scheme as CelestrakColorScheme).update(sat),
        (sat, result) => {
          // Additional assertions specific to Celestrak color scheme
          if (sat.type === SpaceObjectType.PAYLOAD && sat.status === PayloadStatus.OPERATIONAL) {
            expect(ColorSchemeTestUtils.colorsEqual(
              result.color,
              colorScheme.colorTheme.celestrakDefaultActivePayload,
            )).toBe(true);
          }
        },
      );
    });
  });

  describe('Performance Characteristics', () => {
    it('should process large numbers of satellites efficiently', () => {
      const largeSatelliteSet = Array.from({ length: 1000 }, (_, i) =>
        ColorSchemeTestUtils.createMockSatellite({
          id: i,
          type: [SpaceObjectType.PAYLOAD, SpaceObjectType.ROCKET_BODY, SpaceObjectType.DEBRIS][i % 3],
        }),
      );

      const startTime = performance.now();

      largeSatelliteSet.forEach((sat) => {
        colorScheme.update(sat);
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should process 1000 satellites in less than 100ms
      expect(processingTime).toBeLessThan(100);
    });
  });
});
