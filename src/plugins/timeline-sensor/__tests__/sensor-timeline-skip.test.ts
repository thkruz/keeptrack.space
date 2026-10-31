import { SatMath } from '@app/app/analysis/sat-math';
import { sensors } from '@app/app/data/catalogs/sensors';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SensorTimeline } from '@app/plugins/timeline-sensor/sensor-timeline';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/*
 * While a satellite is out of a sensor's view, calculatePasses_ jumps over samples it cannot reach the view in
 * (secondsUntilPossibleView_). These tests run real propagation over every catalog sensor and compare the passes with
 * the jump against a run with the jump turned off. The jump keeps the sample grid, so the passes must be identical.
 */

const START = new Date('2026-10-27T12:00:00Z');

const tleChecksum = (line: string): string => {
  let sum = 0;

  for (const ch of line) {
    if (ch >= '0' && ch <= '9') {
      sum += Number(ch);
    } else if (ch === '-') {
      sum += 1;
    }
  }

  return `${line}${sum % 10}`;
};

const field = (value: number, width: number, digits: number): string => value.toFixed(digits).padStart(width, ' ');

/** Builds a TLE pair at epoch 2026 day 300 from mean elements (eccentricity as a fraction). */
const makeSat = (id: number, inc: number, raan: number, ecc: number, argp: number, meanMotion: number): Satellite => {
  const scc = String(90000 + id);
  const tle1 = tleChecksum(`1 ${scc}U 26001A   26300.50000000  .00000000  00000-0  00000-0 0  999`);
  const eccStr = ecc.toFixed(7).slice(2);
  const tle2 = tleChecksum(`2 ${scc} ${field(inc, 8, 4)} ${field(raan, 8, 4)} ${eccStr} ${field(argp, 8, 4)} ${field(0, 8, 4)} ${field(meanMotion, 11, 8)}    1`);

  return new Satellite({ id, tle1: tle1 as TleLine1, tle2: tle2 as TleLine2 });
};

/** One object per orbit class, each at two node longitudes so the ground tracks differ. */
const ORBITS: { name: string; inc: number; ecc: number; argp: number; n: number }[] = [
  { name: 'ISS-like LEO', inc: 51.64, ecc: 0.0005, argp: 90, n: 15.5 },
  { name: 'sun-synchronous LEO', inc: 98.2, ecc: 0.001, argp: 90, n: 14.57 },
  { name: 'low-inclination LEO', inc: 28.5, ecc: 0.002, argp: 90, n: 15.2 },
  { name: 'GPS MEO', inc: 55, ecc: 0.005, argp: 0, n: 2.0056 },
  { name: 'equatorial MEO', inc: 0.04, ecc: 0.0002, argp: 0, n: 5 },
  { name: 'Molniya HEO', inc: 63.4, ecc: 0.72, argp: 270, n: 2.006 },
  { name: 'GTO', inc: 27, ecc: 0.73, argp: 180, n: 2.26 },
  { name: 'GEO', inc: 0.05, ecc: 0.0002, argp: 0, n: 1.0027 },
];

const SATS = ORBITS.flatMap((o, idx) => [0, 135].map((raan, k) => ({ name: `${o.name} RAAN ${raan}`, sat: makeSat(idx * 2 + k, o.inc, raan, o.ecc, o.argp, o.n) })));

const cloneSensor = (sensor: DetailedSensor): DetailedSensor => Object.assign(Object.create(Object.getPrototypeOf(sensor)), sensor) as DetailedSensor;

const ALL_SENSORS = (Object.values(sensors) as DetailedSensor[]).filter((s) => typeof s.lat === 'number' && typeof s.minAz === 'number');

type Pass = { start: Date; end: Date };

describe('SensorTimeline skip-ahead after leaving the field of view', () => {
  let plugin: SensorTimeline;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    ServiceLocator.getSensorManager().getSensorList = vi.fn((name: string) => (name === 'mw' || name === 'ssn' ? [defaultSensor] : [])) as never;
    plugin = new SensorTimeline();
    websiteInit(plugin);
    vi.spyOn(ServiceLocator.getTimeManager(), 'getOffsetTimeObj').mockImplementation(() => new Date(START));
    p().useWeather = false;
    p().detailedPlot = false;
    p().lengthOfLookAngles_ = 24;
    p().angleCalculationInterval_ = 30;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const runPasses = async (sat: Satellite, sensorList: DetailedSensor[], skip: boolean): Promise<Pass[][][]> => {
    vi.spyOn(PluginRegistry.getPlugin(SelectSatManager)!, 'getSelectedSat').mockReturnValue(sat);
    const skipSpy = vi.spyOn(SensorTimeline as never, 'secondsUntilPossibleView_');

    if (!skip) {
      skipSpy.mockReturnValue(0 as never);
    }
    p().enabledSensors_ = sensorList.map(cloneSensor);
    const lists = await p().calculatePasses_();

    skipSpy.mockRestore();

    return lists.map((list: { passes: Pass[] }[]) => list.map((entry) => entry.passes));
  };

  it('finds the same passes as sampling every interval, for every catalog sensor and orbit class', async () => {
    let baselinePasses = 0;
    let baselineSamples = 0;
    let skipSamples = 0;
    const getRae = vi.spyOn(SatMath, 'getRae');

    for (const { name, sat } of SATS) {
      getRae.mockClear();
      // biome-ignore lint/performance/noAwaitInLoops: the getRae call count is read per run, so runs must not overlap
      const baseline = await runPasses(sat, ALL_SENSORS, false);

      baselineSamples += getRae.mock.calls.length;
      getRae.mockClear();
      const skipped = await runPasses(sat, ALL_SENSORS, true);

      skipSamples += getRae.mock.calls.length;
      baselinePasses += baseline[1].reduce((sum, passes) => sum + passes.length, 0);
      expect(skipped, name).toEqual(baseline);
    }

    // The jump must pay for itself: at least half of the propagations are skipped across this mix of orbits
    expect(skipSamples).toBeLessThan(baselineSamples / 2);
    expect(baselinePasses).toBeGreaterThan(1000);
  }, 600_000);
});
