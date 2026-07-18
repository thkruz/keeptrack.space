/* eslint-disable max-lines-per-function */

import { SolarBody } from '@app/engine/core/interfaces';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LineManager } from '../../line-manager';
import { Line, LineColors } from '../line';
import { Path } from '../path';
import { SatRicLine } from '../sat-ric-line';
import { SatScanEarthLine } from '../sat-scan-earth-line';
import { SatToCelestialBodyLine } from '../sat-to-celestial-body';
import { SatToRefLine } from '../sat-to-ref-line';
import { SatToSunLine } from '../sat-to-sun-line';
import { SensorMarkerLine } from '../sensor-marker-line';
import { SensorToMoonLine } from '../sensor-to-moon-line';
import { SensorToRaeLine } from '../sensor-to-rae-line';
import { SensorToSatLine } from '../sensor-to-sat-line';
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
const satWithEci = (x: number, y: number, z: number) => ({ eci: () => ({ position: { x, y, z } }) }) as never;
/** A sensor whose eci(date) returns {x,y,z}. */
const sensorWithEci = (x: number, y: number, z: number) => ({ eci: () => ({ x, y, z }) }) as never;

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

      expect(calls).toEqual([
        [
          [1, 2, 3],
          [7, 8, 9],
        ],
      ]);
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

      expect(calls).toEqual([
        [
          [1, 2, 3],
          [7, 8, 9],
        ],
      ]);
    });
  });

  describe('SensorMarkerLine', () => {
    it('extends 100 km radially outward from the sensor position', () => {
      const line = new SensorMarkerLine(sensorWithEci(6371, 0, 0));
      const calls = capture(line);

      line.update();

      expect(calls).toEqual([
        [
          [6371, 0, 0],
          [6471, 0, 0],
        ],
      ]);
    });

    it('describes itself with the sensorMarker kind and the group detail', () => {
      const line = new SensorMarkerLine(sensorWithEci(1, 2, 3), 'NASA Deep Space Network');

      expect(line.getDescription()).toEqual({ kind: 'sensorMarker', detail: 'NASA Deep Space Network' });
    });

    it('is found and removed by kind+detail through the LineManager', () => {
      const lineManager = new LineManager();

      lineManager.createSensorMarkers([sensorWithEci(6371, 0, 0), sensorWithEci(0, 6371, 0)], 'GroupA');

      expect(lineManager.hasSensorMarkers('GroupA')).toBe(true);
      expect(lineManager.hasSensorMarkers('GroupB')).toBe(false);
      expect(lineManager.lines).toHaveLength(2);

      lineManager.removeLinesByKind('sensorMarker', 'GroupA');

      expect(lineManager.hasSensorMarkers('GroupA')).toBe(false);
      expect(lineManager.lines).toHaveLength(0);
    });
  });

  describe('SensorToMoonLine', () => {
    it('connects the sensor eci position to the moon position', () => {
      ServiceLocator.getScene().moons = { Moon: { position: [10, 11, 12] } } as never;
      const line = new SensorToMoonLine(sensorWithEci(1, 2, 3));
      const calls = capture(line);

      line.update();

      expect(calls).toEqual([
        [
          [1, 2, 3],
          [10, 11, 12],
        ],
      ]);
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

      expect(calls).toEqual([
        [
          [1, 2, 3],
          [4, 5, 6],
        ],
      ]);
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

      expect(calls).toEqual([
        [
          [100, 200, 300],
          [4, 5, 6],
        ],
      ]);
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

  describe('SatScanEarthLine', () => {
    it('scans outward and draws a segment from the sat to the first lit ground point', () => {
      settingsManager.lineScanSpeedSat = 6;
      settingsManager.lineScanMinEl = -90; // accept the very first scan point
      const sat = { eci: () => ({ position: { x: 7000, y: 0, z: 0 } }), position: { x: 7000, y: 0, z: 0 } } as never;
      const line = new SatScanEarthLine(sat);
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toEqual([7000, 0, 0]);
      expect(calls[0][1]).toHaveLength(3);
    });

    it('does not draw when the satellite has no eci', () => {
      const line = new SatScanEarthLine({ eci: () => null } as never);
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(0);
    });

    it('never draws when no ground point clears the minimum elevation', () => {
      settingsManager.lineScanSpeedSat = 6;
      settingsManager.lineScanMinEl = 100; // unreachable elevation -> loop exhausts
      const sat = { eci: () => ({ position: { x: 7000, y: 0, z: 0 } }), position: { x: 7000, y: 0, z: 0 } } as never;
      const line = new SatScanEarthLine(sat);
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(0);
    });

    it('defaults to a green line color', () => {
      const line = new SatScanEarthLine({ eci: () => null } as never);

      expect((line as unknown as { color_: number[] }).color_).toEqual(LineColors.GREEN);
    });
  });

  describe('SensorToSatLine', () => {
    const seedPos = (idx: number, x: number, y: number, z: number) => {
      const posData = ServiceLocator.getDotsManager().positionData;

      posData[idx * 3] = x;
      posData[idx * 3 + 1] = y;
      posData[idx * 3 + 2] = z;
    };

    it('connects the satellite catalog position to the sensor eci position', () => {
      seedPos(0, 100, 200, 300);
      const line = new SensorToSatLine(sensorWithEci(4, 5, 6), { id: 0 } as never);
      const calls = capture(line);

      line.update();

      expect(calls).toEqual([
        [
          [100, 200, 300],
          [4, 5, 6],
        ],
      ]);
    });

    it('defaults to a green line color', () => {
      const line = new SensorToSatLine(sensorWithEci(0, 0, 0), { id: 0 } as never);

      expect((line as unknown as { color_: number[] }).color_).toEqual(LineColors.GREEN);
    });

    it('does not draw when position data has been nulled', () => {
      ServiceLocator.getDotsManager().positionData = null as never;
      const line = new SensorToSatLine(sensorWithEci(4, 5, 6), { id: 0 } as never);
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(0);
    });

    it('does not draw when the index is out of range', () => {
      ServiceLocator.getDotsManager().positionData = new Float32Array(3);
      const line = new SensorToSatLine(sensorWithEci(4, 5, 6), { id: 50 } as never);
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(0);
    });

    it('keeps a real Satellite in FOV when the sensor reports it is in view', () => {
      seedPos(0, 100, 200, 300);
      const sensor = { eci: () => ({ x: 4, y: 5, z: 6 }), isSatInFov: () => true } as never;
      const line = new SensorToSatLine(sensor, defaultSat);

      line.setDrawFovOnly(true);
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(1);
      expect((line as unknown as { isGarbage: boolean }).isGarbage).toBe(false);
    });

    it('marks itself garbage in FOV-only mode when the object is not a known satellite type', () => {
      seedPos(0, 100, 200, 300);
      const line = new SensorToSatLine(sensorWithEci(4, 5, 6), { id: 0 } as never);

      line.setDrawFovOnly(true);
      capture(line);

      line.update();

      expect((line as unknown as { isGarbage: boolean }).isGarbage).toBe(true);
    });

    it('marks itself garbage in selected-only mode when the sat is not the selected one', () => {
      seedPos(0, 100, 200, 300);
      // SelectSatManager is not registered, so selectedSat is undefined and any id mismatches.
      const line = new SensorToSatLine(sensorWithEci(4, 5, 6), { id: 0 } as never);

      line.setDrawSelectedOnly(true);
      capture(line);

      line.update();

      expect((line as unknown as { isGarbage: boolean }).isGarbage).toBe(true);
    });
  });

  describe('SensorToRaeLine', () => {
    it('draws from the rae-derived eci point to the sensor catalog position', () => {
      const posData = ServiceLocator.getDotsManager().positionData;

      posData[0] = 100;
      posData[1] = 200;
      posData[2] = 300;
      const sensor = { id: 0, lla: () => ({ lat: 0, lon: 0, alt: 0 }) } as never;
      const line = new SensorToRaeLine(sensor, { az: 0, el: 90, rng: 100 } as never);
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toHaveLength(3);
      expect(calls[0][1]).toEqual([100, 200, 300]);
    });

    it('does not draw when position data has been nulled', () => {
      ServiceLocator.getDotsManager().positionData = null as never;
      const sensor = { id: 0, lla: () => ({ lat: 0, lon: 0, alt: 0 }) } as never;
      const line = new SensorToRaeLine(sensor, { az: 0, el: 90, rng: 100 } as never);
      const calls = capture(line);

      line.update();

      expect(calls).toHaveLength(0);
    });
  });

  describe('Path', () => {
    class TestPath extends Path {
      // eslint-disable-next-line class-methods-use-this
      update(): void {
        // no-op concrete implementation for testing the base class
      }
    }

    const lineManager = () => {
      const lm = new LineManager();

      lm.init();

      return lm;
    };

    it('updateVertBuf records the path length from vec3 points', () => {
      const path = new TestPath();

      path.updateVertBuf([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ] as never);

      expect((path as unknown as { pathLength_: number }).pathLength_).toBe(3);
    });

    it('updateVertBuf accepts pre-built vec4 points', () => {
      const path = new TestPath();

      path.updateVertBuf([
        [1, 2, 3, 1],
        [4, 5, 6, 1],
      ] as never);

      expect((path as unknown as { pathLength_: number }).pathLength_).toBe(2);
    });

    it('updateVertBufDirect sets the explicit point count', () => {
      const path = new TestPath();

      path.updateVertBufDirect(new Float32Array([1, 2, 3, 1, 4, 5, 6, 1]), 2);

      expect((path as unknown as { pathLength_: number }).pathLength_).toBe(2);
    });

    it('validateColor throws for out-of-range channels', () => {
      const path = new TestPath();

      expect(() => (path as unknown as { validateColor: (c: number[]) => void }).validateColor([2, 0, 0, 1])).toThrow('Invalid color');
    });

    it('does not touch GL when the path is not set to draw', () => {
      const gl = ServiceLocator.getRenderer().gl;

      vi.clearAllMocks();
      const path = new TestPath();

      (path as unknown as { isDraw_: boolean }).isDraw_ = false;
      path.draw(gl, lineManager());

      expect(gl.drawArrays).not.toHaveBeenCalled();
    });

    it('uses the scene world shift for an Earth-centered path', () => {
      const gl = ServiceLocator.getRenderer().gl;

      vi.spyOn(Scene.getInstance(), 'getBodyById').mockReturnValue({ position: [1, 2, 3] } as never);
      const path = new TestPath();

      path.updateVertBuf([
        [1, 2, 3],
        [4, 5, 6],
      ] as never);
      path.draw(gl, lineManager());

      expect(gl.drawArrays).toHaveBeenCalledWith(gl.LINE_STRIP, 0, 2);
    });

    it('uses the body position for a non-Earth-centered path', () => {
      const gl = ServiceLocator.getRenderer().gl;

      vi.spyOn(Scene.getInstance(), 'getBodyById').mockReturnValue({ position: [10, 20, 30] } as never);
      const path = new TestPath(2, SolarBody.Moon);

      path.updateVertBuf([
        [1, 2, 3],
        [4, 5, 6],
      ] as never);
      path.draw(gl, lineManager());

      expect(gl.uniform3fv).toHaveBeenCalledWith(expect.anything(), [10, 20, 30]);
    });

    it('falls back to a zero world offset when not following the center body', () => {
      const gl = ServiceLocator.getRenderer().gl;

      const path = new TestPath();

      path.isFollowCenterBody = false;
      path.updateVertBuf([
        [1, 2, 3],
        [4, 5, 6],
      ] as never);
      path.draw(gl, lineManager());

      expect(gl.uniform3fv).toHaveBeenCalledWith(expect.anything(), [0, 0, 0]);
    });
  });
});
