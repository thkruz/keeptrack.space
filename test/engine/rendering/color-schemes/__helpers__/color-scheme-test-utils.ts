import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { ColorScheme } from '@app/engine/rendering/color-schemes/color-scheme';
import { DetailedSatellite, PayloadStatus, SpaceObjectType, TleLine1, TleLine2 } from '@ootk/src/main';

/**
 * Utility functions for testing color schemes
 */

export class ColorSchemeTestUtils {
  /**
   * Compare two RGBA arrays with tolerance for floating point precision
   */
  static colorsEqual(color1: rgbaArray, color2: rgbaArray, tolerance = 0.001): boolean {
    if (color1.length !== color2.length) {
      return false;
    }

    return color1.every((value, index) =>
      Math.abs(value - color2[index]) <= tolerance,
    );
  }

  /**
   * Assert that a ColorInformation object is valid
   */
  static assertValidColorInformation(colorInfo: ColorInformation): void {
    expect(colorInfo).toBeDefined();
    expect(colorInfo.color).toBeDefined();
    expect(Array.isArray(colorInfo.color)).toBe(true);
    expect(colorInfo.color).toHaveLength(4);
    expect(Object.values(Pickable)).toContain(colorInfo.pickable);

    // Validate RGBA values are in correct range
    colorInfo.color.forEach((component) => {
      expect(component).toBeGreaterThanOrEqual(0);
      expect(component).toBeLessThanOrEqual(1);
    });
  }

  /**
   * Create a mock satellite with specified properties
   */
  static createMockSatellite(options: Partial<DetailedSatellite> = {}): DetailedSatellite {
    const defaultSat = new DetailedSatellite({
      id: options.id ?? 1,
      name: options.name ?? 'TEST SAT',
      tle1: '1 25544U 98067A   25341.54791667  .00016717  00000-0  10270-3 0  9004' as TleLine1,
      tle2: '2 25544  51.6446 351.7886 0002187  96.5361  28.6483 15.49315347256916' as TleLine2,
      type: options.type ?? SpaceObjectType.PAYLOAD,
      status: options.status ?? PayloadStatus.OPERATIONAL,
      country: options.country ?? 'US',
      rcs: options.rcs ?? 1.0,
      vmag: options.vmag ?? 5.0,
      inclination: options.inclination ?? 45.0,
      period: options.period ?? 90.0,
      apogee: options.apogee ?? 400.0,
      perigee: options.perigee ?? 350.0,
      ...options,
    });

    return defaultSat;
  }

  /**
   * Create a collection of test satellites with various properties
   */
  static createTestSatelliteCollection(): DetailedSatellite[] {
    return [
      // Active payload
      this.createMockSatellite({
        id: 1,
        name: 'ACTIVE PAYLOAD',
        type: SpaceObjectType.PAYLOAD,
        status: PayloadStatus.OPERATIONAL,
        rcs: 2.5,
      }),

      // Inactive payload
      this.createMockSatellite({
        id: 2,
        name: 'INACTIVE PAYLOAD',
        type: SpaceObjectType.PAYLOAD,
        status: PayloadStatus.NONOPERATIONAL,
        rcs: 1.8,
      }),

      // Rocket body
      this.createMockSatellite({
        id: 3,
        name: 'ROCKET BODY',
        type: SpaceObjectType.ROCKET_BODY,
        rcs: 15.0,
      }),

      // Debris
      this.createMockSatellite({
        id: 4,
        name: 'DEBRIS',
        type: SpaceObjectType.DEBRIS,
        rcs: 0.1,
      }),

      // Edge cases
      this.createMockSatellite({
        id: 5,
        name: 'NO RCS DATA',
        type: SpaceObjectType.PAYLOAD,
      }),

      this.createMockSatellite({
        id: 6,
        name: 'EXTREME RCS',
        type: SpaceObjectType.DEBRIS,
        rcs: 0.001,
      }),

      // Different countries
      this.createMockSatellite({
        id: 7,
        name: 'CHINESE SAT',
        type: SpaceObjectType.PAYLOAD,
        country: 'CN',
      }),

      this.createMockSatellite({
        id: 8,
        name: 'RUSSIAN SAT',
        type: SpaceObjectType.PAYLOAD,
        country: 'RU',
      }),
    ];
  }

  /**
   * Test a color scheme against multiple satellites
   */
  static testColorSchemeWithSatellites<T extends ColorScheme>(
    colorScheme: T,
    satellites: DetailedSatellite[],
    testFn: (sat: DetailedSatellite, colorScheme: T) => ColorInformation,
    additionalAssertions?: (sat: DetailedSatellite, result: ColorInformation) => void,
  ): void {
    satellites.forEach((sat) => {
      const result = testFn(sat, colorScheme);

      this.assertValidColorInformation(result);

      if (additionalAssertions) {
        additionalAssertions(sat, result);
      }
    });
  }
}
