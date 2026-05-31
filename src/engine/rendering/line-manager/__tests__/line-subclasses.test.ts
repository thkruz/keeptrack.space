import { ServiceLocator } from '@app/engine/core/service-locator';
import { SolarBody } from '@app/engine/core/interfaces';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Line, LineColors } from '../line';
import { SatRicLine } from '../sat-ric-line';
import { SatToCelestialBodyLine } from '../sat-to-celestial-body';
import { SatToRefLine } from '../sat-to-ref-line';
import { SatToSunLine } from '../sat-to-sun-line';
import { SensorToMoonLine } from '../sensor-to-moon-line';
import { SensorToSunLine } from '../sensor-to-sun-line';

/**
 * Shadow updateVertBuf on a single line instance (it lives on the shared Line
 * prototype, so a prototype spy would leak across tests). Returns captured calls.
 */
const capture = (line: Line): number[][][] => {
  const calls: number[][][] = [];

  (line as unknown as { updateVertBuf: (p: number[][]) => void }).updateVertBuf = (p: number[][]) => {
    calls.push(p.map((pt) => Array.from(pt)));
  };

  return calls;
};

/** A satellite/OEM whose eci(date) returns { position: {x,y,z} }. */
const satWithEci = (x: number, y: number, z: number) => ({ eci: () => ({ position: { x, y, z } }) } as never);
/** A sensor whose eci(date) returns {x,y,z}. */
const sensorWithEci = (x: number, y: number, z: number) => ({ eci: () => ({ x, y, z }) } as never);

describe('line-manager subclasses', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SatToSunLine', () => {
    it('connects the satellite eci position to the sun position', () => {
      ServiceLocator.getScene().sun = { position: [7, 8, 9] } as never;
      const line = new SatToSunLine(satWithEci(1, 2, 3));
      const calls = capture(line);

      line.update();

      expect(calls).toEqual([[[1, 2, 3], [7, 8, 9]]]);
    });

    it('marks itself garbage and does not draw when the satellite has no eci', () => {
      const line = new SatToSunLine({ eci: () => null } as never);
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(0);
      expect((line as unknown as { isGarbage: boolean }).isGarbage).toBe(true);
    });
  });

  describe('SensorToSunLine', () => {
    it('connects the sensor eci position to the sun position', () => {
      ServiceLocator.getScene().sun = { position: [7, 8, 9] } as never;
      const line = new SensorToSunLine(sensorWithEci(1, 2, 3));
      const calls = capture(line);

      line.update();

      expect(calls).toEqual([[[1, 2, 3], [7, 8, 9]]]);
    });
  });

  describe('SensorToMoonLine', () => {
    it('connects the sensor eci position to the moon position', () => {
      ServiceLocator.getScene().moons = { Moon: { position: [10, 11, 12] } } as never;
      const line = new SensorToMoonLine(sensorWithEci(1, 2, 3));
      const calls = capture(line);

      line.update();

      expect(calls).toEqual([[[1, 2, 3], [10, 11, 12]]]);
    });

    it('defaults to a white line color', () => {
      const line = new SensorToMoonLine(sensorWithEci(0, 0, 0));

      expect((line as unknown as { color_: number[] }).color_).toEqual(LineColors.WHITE);
    });
  });

  describe('SatToCelestialBodyLine', () => {
    it('connects the satellite eci position to the resolved celestial body', () => {
      vi.spyOn(ServiceLocator.getScene(), 'getBodyById').mockReturnValue({ position: [4, 5, 6] } as never);
      const line = new SatToCelestialBodyLine(satWithEci(1, 2, 3), SolarBody.Moon);
      const calls = capture(line);

      line.update();

      expect(calls).toEqual([[[1, 2, 3], [4, 5, 6]]]);
    });

    it('marks itself garbage when the satellite has no eci', () => {
      const line = new SatToCelestialBodyLine({ eci: () => null } as never, SolarBody.Moon);
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(0);
      expect((line as unknown as { isGarbage: boolean }).isGarbage).toBe(true);
    });
  });

  describe('SatToRefLine', () => {
    it('connects the satellite catalog position to a fixed reference point', () => {
      const posData = ServiceLocator.getDotsManager().positionData;

      posData[0] = 100;
      posData[1] = 200;
      posData[2] = 300;

      const line = new SatToRefLine({ id: 0 } as never, [4, 5, 6] as never, LineColors.RED);
      const calls = capture(line);

      line.update();

      expect(calls).toEqual([[[100, 200, 300], [4, 5, 6]]]);
    });

    it('throws for an out-of-range color in the constructor', () => {
      expect(() => new SatToRefLine({ id: 0 } as never, [0, 0, 0] as never, [2, 0, 0, 1] as never)).toThrow('Invalid color');
    });

    it('does not draw when the position data has been nulled', () => {
      ServiceLocator.getDotsManager().positionData = null as never;
      const line = new SatToRefLine({ id: 0 } as never, [4, 5, 6] as never, LineColors.RED);
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(0);
    });

    it('does not draw when the index is out of range', () => {
      ServiceLocator.getDotsManager().positionData = new Float32Array(3);
      const line = new SatToRefLine({ id: 50 } as never, [4, 5, 6] as never, LineColors.RED);
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(0);
    });
  });

  describe('SatRicLine', () => {
    /** Position at +X, velocity along +Y so the RIC frame is well-defined. */
    const seedSat = () => {
      const posData = ServiceLocator.getDotsManager().positionData;

      posData[0] = 7000;
      posData[1] = 0;
      posData[2] = 0;

      return { id: 0, velocity: { x: 0, y: 7.5, z: 0 } } as never;
    };

    it('radial line points along +X, 2km out, anchored at the sat', () => {
      const line = new SatRicLine(seedSat(), 'R');
      const calls = capture(line);

      line.update();
      const [tip, anchor] = calls[0];

      expect(anchor).toEqual([7000, 0, 0]);
      expect(tip[0]).toBeCloseTo(7002);
      expect(tip[1]).toBeCloseTo(0);
      expect(tip[2]).toBeCloseTo(0);
    });

    it('in-track line points along +Y', () => {
      const line = new SatRicLine(seedSat(), 'I');
      const calls = capture(line);

      line.update();
      const [tip] = calls[0];

      expect(tip[0]).toBeCloseTo(7000);
      expect(tip[1]).toBeCloseTo(2);
      expect(tip[2]).toBeCloseTo(0);
    });

    it('cross-track line points along +Z', () => {
      const line = new SatRicLine(seedSat(), 'C');
      const calls = capture(line);

      line.update();
      const [tip] = calls[0];

      expect(tip[0]).toBeCloseTo(7000);
      expect(tip[1]).toBeCloseTo(0);
      expect(tip[2]).toBeCloseTo(2);
    });

    it('does not draw a zero-velocity satellite (would emit NaN)', () => {
      const posData = ServiceLocator.getDotsManager().positionData;

      posData[0] = 7000;
      const line = new SatRicLine({ id: 0, velocity: { x: 0, y: 0, z: 0 } } as never, 'R');
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(0);
    });

    it('does not draw when position data has been nulled', () => {
      ServiceLocator.getDotsManager().positionData = null as never;
      const line = new SatRicLine({ id: 0, velocity: { x: 0, y: 7.5, z: 0 } } as never, 'R');
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(0);
    });

    it('throws for an invalid coordinate', () => {
      const line = new SatRicLine(seedSat(), 'X' as 'R');

      capture(line);
      expect(() => line.update()).toThrow('Invalid type');
    });

    it('defaults to an orange line color', () => {
      const line = new SatRicLine(seedSat(), 'R');

      expect((line as unknown as { color_: number[] }).color_).toEqual(LineColors.ORANGE);
    });
  });
});
