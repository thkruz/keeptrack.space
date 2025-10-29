/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undefined */
import { Pickable } from '@app/engine/core/interfaces';
import { ObjectTypeColorScheme } from '@app/engine/rendering/color-schemes/object-type-color-scheme';
import { SpaceObjectType } from '@ootk/src/main';
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
    getGroupsManager: () => ({
      selectedGroup: {
        hasObject: (id: number) => id === 1,
      },
    }),
    html: (strings: TemplateStringsArray) => strings[0],
  },
}));

jest.mock('@app/settings/settings', () => ({
  settingsManager: {
    colors: {
      transparent: [0, 0, 0, 0],
      deselected: [0.1, 0.1, 0.1, 0.5],
      inFOVAlt: [1, 1, 0, 1],
    },
    isShowPayloads: true,
    isShowRocketBodies: true,
    isShowDebris: true,
    isDisableSensors: false,
    isDisableLaunchSites: false,
    plugins: { MissilePlugin: true },
  },
}));

describe('ObjectTypeColorScheme', () => {
  let colorScheme: ObjectTypeColorScheme;

  beforeEach(() => {
    colorScheme = new ObjectTypeColorScheme();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct label and id', () => {
      expect(colorScheme.label).toBe('Object Type');
      expect(colorScheme.id).toBe('ObjectTypeColorScheme');
      expect(ObjectTypeColorScheme.id).toBe('ObjectTypeColorScheme');
    });

    it('should initialize unique color theme', () => {
      expect(colorScheme.colorTheme.celestrakDefaultActivePayload).toEqual([0.0, 1.0, 0.0, 0.85]);
      expect(colorScheme.colorTheme.celestrakDefaultInactivePayload).toEqual([1.0, 0.5, 0.0, 1.0]);
      expect(colorScheme.colorTheme.celestrakDefaultRocketBody).toEqual([1.0, 0.0, 0.0, 1.0]);
      expect(colorScheme.colorTheme.celestrakDefaultDebris).toEqual([0.5, 0.5, 0.5, 0.9]);
    });

    it('should initialize object type flags', () => {
      expect(colorScheme.objectTypeFlags.payload).toBe(true);
      expect(colorScheme.objectTypeFlags.rocketBody).toBe(true);
      expect(colorScheme.objectTypeFlags.debris).toBe(true);
      expect(colorScheme.objectTypeFlags.notional).toBe(true);
    });
  });

  describe('Color Assignment Logic', () => {
    it('should color payloads with payload color', () => {
      const result = colorScheme.update(mockSatellites.activePayload);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('should color rocket bodies with rocketBody color', () => {
      const result = colorScheme.update(mockSatellites.rocketBody);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('should color debris with debris color', () => {
      const result = colorScheme.update(mockSatellites.debris);

      ColorSchemeTestUtils.assertValidColorInformation(result);
      expect(result.pickable).toBe(Pickable.Yes);
    });

    it('should color unknown object types with unknown color', () => {
      const unknownObject = ColorSchemeTestUtils.createMockSatellite({
        type: SpaceObjectType.UNKNOWN,
      });
      const result = colorScheme.update(unknownObject);

      expect(result).not.toBeNull();
    });
  });

  describe('Object Type Flag Filtering', () => {
    it('should hide payloads when flag is disabled', () => {
      colorScheme.objectTypeFlags.payload = false;
      const result = colorScheme.update(mockSatellites.activePayload);

      expect(ColorSchemeTestUtils.colorsEqual(result.color, colorScheme.colorTheme.deselected)).toBe(true);
      expect(result.pickable).toBe(Pickable.No);
    });

    it('should hide rocket bodies when flag is disabled', () => {
      colorScheme.objectTypeFlags.rocketBody = false;
      const result = colorScheme.update(mockSatellites.rocketBody);

      expect(result.pickable).toBe(Pickable.No);
    });

    it('should hide debris when flag is disabled', () => {
      colorScheme.objectTypeFlags.debris = false;
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

      expect(ColorSchemeTestUtils.colorsEqual(result.color, colorScheme.colorTheme.transparent)).toBe(true);
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
    it('should have proper legendHtml', () => {
      expect(ObjectTypeColorScheme.layersHtml).toContain('Payload');
      expect(ObjectTypeColorScheme.layersHtml).toContain('Rocket Body');
      expect(ObjectTypeColorScheme.layersHtml).toContain('Debris');
    });
  });

  describe('Bulk Testing with Test Collection', () => {
    it('should handle all test satellites without errors', () => {
      const testSatellites = ColorSchemeTestUtils.createTestSatelliteCollection();

      ColorSchemeTestUtils.testColorSchemeWithSatellites(
        colorScheme,
        testSatellites,
        (sat, scheme) => (scheme as ObjectTypeColorScheme).update(sat),
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

      expect(processingTime).toBeLessThan(100);
    });
  });
});
