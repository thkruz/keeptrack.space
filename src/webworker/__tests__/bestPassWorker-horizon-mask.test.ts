import { SatMath } from '@app/app/analysis/sat-math';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { Sgp4 } from '@ootk/src/main';
import { vi } from 'vitest';

const IN = { START: 0 } as const;
const OUT = { CHUNK: 0, COMPLETE: 2, ERROR: 3 } as const;
const STEP_SEC = 30;
const STEP_MS = STEP_SEC * 1000;
const T0_MS = Date.UTC(2026, 10, 4, 0, 0, 0);
const DAY_MS = 86_400_000;
/** Slack on top of one step: absorbs edge disagreements between the worker's RAE path and SatMath.getRae (both sample the same instants). */
const GRID_SLACK_MS = 2000;

/** Persona fixtures TRAIN-LEO-A to F (fixtures/exercise-catalog.tle), copied so the test does not depend on the docs folder. */
const TLES: Record<string, [string, string]> = {
  A: ['1 99001U 26999A   26308.00000000  .00000000  00000-0  00000-0 0  9993', '2 99001  53.0000   0.0000 0010000   0.0000   0.0000 15.05490646    11'],
  B: ['1 99002U 26999A   26308.00000000  .00000000  00000-0  00000-0 0  9994', '2 99002  53.0000   0.0000 0010000   0.0000  60.0000 15.05490646    18'],
  C: ['1 99003U 26999A   26308.00000000  .00000000  00000-0  00000-0 0  9995', '2 99003  53.0000   0.0000 0010000   0.0000 120.0000 15.05490646    16'],
  D: ['1 99004U 26999A   26308.00000000  .00000000  00000-0  00000-0 0  9996', '2 99004  53.0000   0.0000 0010000   0.0000 180.0000 15.05490646    13'],
  E: ['1 99005U 26999A   26308.00000000  .00000000  00000-0  00000-0 0  9997', '2 99005  53.0000   0.0000 0010000   0.0000 240.0000 15.05490646    11'],
  F: ['1 99006U 26999A   26308.00000000  .00000000  00000-0  00000-0 0  9998', '2 99006  53.0000   0.0000 0010000   0.0000 300.0000 15.05490646    19'],
};
const SAT_IDS = Object.keys(TLES);
const sccOf = (id: string) => String(99000 + SAT_IDS.indexOf(id) + 1);

/** fixtures/horizon-mask.csv (azimuth start inclusive, end exclusive; edge belongs to the upper bin). Stops sit just below the next start. */
const MASK = [
  { startAz: 0, stopAz: 89.999, minEl: 10 },
  { startAz: 90, stopAz: 179.999, minEl: 35 },
  { startAz: 180, stopAz: 269.999, minEl: 20 },
  { startAz: 270, stopAz: 359.999, minEl: 10 },
];

/** Vertex mask as the custom sensor menu builds it (interpolateMask = true), straddling 0/360. */
const VERTEX_MASK = [
  { startAz: 350, stopAz: 350, minEl: 30 },
  { startAz: 10, stopAz: 10, minEl: 30 },
  { startAz: 180, stopAz: 180, minEl: 5 },
];

type MaskDef = { startAz: number; stopAz: number; minEl: number }[];
type SensorOpts = { mask?: MaskDef; interpolate?: boolean };

/** RIDGE (sites.csv): 35 N, 106 W, 1500 m. Plain data, as the thread manager structured-clones it. */
const ridge = ({ mask, interpolate }: SensorOpts = {}) => ({
  lat: 35,
  lon: -106,
  alt: 1.5,
  minAz: 0,
  maxAz: 360,
  minEl: 10,
  maxEl: 90,
  minRng: 0,
  maxRng: 5556,
  name: 'RIDGE',
  type: 1,
  ...(mask ? { elevationMasks: mask, interpolateMask: interpolate ?? false } : {}),
});

type Row = {
  SATELLITE_ID: string | number;
  START_DATE: Date;
  STOP_DATE: Date;
  MASK_LIMITED?: boolean;
  MASK_APPLIED?: boolean;
  START_CLIPPED?: boolean;
  END_CLIPPED?: boolean;
};
let posted: { typ?: number; passes?: Row[]; message?: string }[] = [];
let runCounter = 0;

const collect = async (ids: string[], opts: SensorOpts): Promise<Row[]> => {
  posted = [];
  (globalThis.onmessage as (m: { data: unknown }) => void)({
    data: {
      typ: IN.START,
      runId: ++runCounter,
      sats: ids.map((id) => ({ sccNum: sccOf(id), tle1: TLES[id][0], tle2: TLES[id][1] })),
      sensors: [ridge(opts)],
      sensorNames: ['RIDGE'],
      baseTimeMs: T0_MS,
      lengthDays: 1,
      intervalSec: STEP_SEC,
      maxResults: 500,
      sunEci: { x: 0, y: 0, z: 0 },
    },
  });
  await vi.waitFor(() => expect(posted.some((p) => p.typ === OUT.COMPLETE || p.typ === OUT.ERROR)).toBe(true), { timeout: 20000 });
  expect(posted.find((p) => p.typ === OUT.ERROR)?.message).toBeUndefined();

  return posted.filter((p) => p.typ === OUT.CHUNK).flatMap((p) => p.passes ?? []);
};

const ms = (d: Date | number | string) => new Date(d).getTime();
const secs = (rows: Row[]) => rows.reduce((sum, r) => sum + (ms(r.STOP_DATE) - ms(r.START_DATE)) / 1000, 0);
const rowsOf = (rows: Row[], id: string) => rows.filter((r) => String(r.SATELLITE_ID) === sccOf(id));
const hourOf = (d: Date | number | string) => new Date(d).getUTCHours() + new Date(d).getUTCMinutes() / 60;

const raeAt = (id: string, sensor: DetailedSensor, t: number) => SatMath.getRae(new Date(t), Sgp4.createSatrec(TLES[id][0], TLES[id][1]), sensor);
const inViewAt = (id: string, sensor: DetailedSensor, t: number): boolean => SatMath.checkIsInView(sensor, raeAt(id, sensor, t));

/** Independent Look Angles sweep: SatMath.getRae + SatMath.checkIsInView, the pair the Look Angles path uses (sensor-math.ts). */
const lookAnglesIntervals = (id: string, sensor: DetailedSensor): { start: number; stop: number }[] => {
  const out: { start: number; stop: number }[] = [];
  let openAt: number | null = null;

  for (let t = T0_MS; t <= T0_MS + DAY_MS; t += STEP_MS) {
    const inView = inViewAt(id, sensor, t);

    if (inView && openAt === null) {
      openAt = t;
    } else if (!inView && openAt !== null) {
      out.push({ start: openAt, stop: t - STEP_MS });
      openAt = null;
    }
  }

  return out;
};

/** Every unclipped worker pass matches a Look Angles in-view interval within one step at both ends. */
const assertAgreesWithLookAngles = (id: string, rows: Row[], sensor: DetailedSensor) => {
  const intervals = lookAnglesIntervals(id, sensor);
  const all = rowsOf(rows, id).sort((a, b) => ms(a.START_DATE) - ms(b.START_DATE));
  const own = all.filter((r) => !r.START_CLIPPED && !r.END_CLIPPED);
  // A mask split shorter than the probe distance leaves a neighbouring row inside the probe, so skip that probe.

  for (const r of own) {
    const match = intervals.find((iv) => Math.abs(iv.start - ms(r.START_DATE)) <= STEP_MS + GRID_SLACK_MS && Math.abs(iv.stop - ms(r.STOP_DATE)) <= STEP_MS + GRID_SLACK_MS);

    expect(match, `${id} pass ${new Date(r.START_DATE).toISOString()} has a Look Angles interval within one step`).toBeDefined();
    // One step outside the pass, Look Angles says the satellite is not in view.
    const before = ms(r.START_DATE) - STEP_MS - GRID_SLACK_MS;
    const after = ms(r.STOP_DATE) + STEP_MS + GRID_SLACK_MS;

    if (!all.some((o) => o !== r && ms(o.START_DATE) - 2 * STEP_MS <= before && before <= ms(o.STOP_DATE) + 2 * STEP_MS)) {
      expect(inViewAt(id, sensor, before)).toBe(false);
    }
    if (!all.some((o) => o !== r && ms(o.START_DATE) - 2 * STEP_MS <= after && after <= ms(o.STOP_DATE) + 2 * STEP_MS)) {
      expect(inViewAt(id, sensor, after)).toBe(false);
    }
    if (r.MASK_LIMITED) {
      const neighbours = [ms(r.START_DATE) - STEP_MS - GRID_SLACK_MS, ms(r.START_DATE) - STEP_MS, ms(r.STOP_DATE) + STEP_MS, ms(r.STOP_DATE) + STEP_MS + GRID_SLACK_MS].map((t) =>
        raeAt(id, sensor, t)
      );

      expect(neighbours.some((n) => sensor.isMaskBlocked(n.az, n.el))).toBe(true);
    }
  }

  return own;
};

describe('bestPassWorker horizon mask (R03-S02)', () => {
  beforeEach(async () => {
    globalThis.postMessage = vi.fn((payload: { typ?: number }) => {
      posted.push(payload);
    }) as unknown as typeof globalThis.postMessage;
    await import('@app/webworker/bestPassWorker');
  });

  it('a RIDGE sensor with the horizon mask returns a different pass list than without it for TRAIN-LEO-A', async () => {
    const unmasked = await collect(['A'], {});
    const masked = await collect(['A'], { mask: MASK });

    expect(unmasked.length).toBeGreaterThan(0);
    const key = (rows: Row[]) => rows.map((r) => `${ms(r.START_DATE)}-${ms(r.STOP_DATE)}`).join('|');

    expect(key(masked)).not.toBe(key(unmasked));
    expect(masked.some((r) => r.MASK_LIMITED === true)).toBe(true);
    expect(unmasked.some((r) => r.MASK_LIMITED === true)).toBe(false);
    expect(masked.every((r) => r.MASK_APPLIED === true)).toBe(true);
    expect(unmasked.every((r) => r.MASK_APPLIED === false)).toBe(true);
  }, 60000);

  it('R03-S02 pairs A to F: masked list is a strict reduction and agrees with Look Angles within one step', async () => {
    const unmasked = await collect(SAT_IDS, {});
    const masked = await collect(SAT_IDS, { mask: MASK });
    const sensor = new DetailedSensor(ridge({ mask: MASK }) as ConstructorParameters<typeof DetailedSensor>[0]);

    // R03-S02-T02: 28 passes in the reference model, per satellite A 5, B 4, C 4, D 4, E 5, F 6; +-1 per satellite.
    const KEY_COUNTS: Record<string, number> = { A: 5, B: 4, C: 4, D: 4, E: 5, F: 6 };

    for (const id of SAT_IDS) {
      expect(Math.abs(rowsOf(unmasked, id).length - KEY_COUNTS[id]), `${id} unmasked pass count`).toBeLessThanOrEqual(1);
    }
    // R03-S02-T03 direction-level facts: the mask removes time and flags mask-limited passes.
    expect(secs(masked)).toBeLessThan(secs(unmasked) - 2000);
    expect(masked.filter((r) => r.MASK_LIMITED).length).toBeGreaterThanOrEqual(15);

    for (const id of SAT_IDS) {
      const checked = assertAgreesWithLookAngles(id, masked, sensor);

      expect(checked.length + rowsOf(masked, id).filter((r) => r.START_CLIPPED || r.END_CLIPPED).length).toBe(rowsOf(masked, id).length);
      expect(secs(rowsOf(masked, id))).toBeLessThanOrEqual(secs(rowsOf(unmasked, id)));
    }

    // D's north pass (about 07:22 to 07:28, azimuth in [270,360) or [0,90)) is unchanged by the mask.
    const north = rowsOf(unmasked, 'D').find((r) => hourOf(r.START_DATE) > 7 && hourOf(r.START_DATE) < 7.7);

    expect(north).toBeDefined();
    const northMasked = rowsOf(masked, 'D').find((r) => Math.abs(ms(r.START_DATE) - ms(north!.START_DATE)) <= 4 * 60_000);

    expect(northMasked).toBeDefined();
    expect(Math.abs(ms(northMasked!.START_DATE) - ms(north!.START_DATE))).toBeLessThanOrEqual(2 * STEP_MS);
    expect(Math.abs(ms(northMasked!.STOP_DATE) - ms(north!.STOP_DATE))).toBeLessThanOrEqual(2 * STEP_MS);

    // A's early pass (about 04:54, rising south-east, peak under 35 deg) is shortened or removed.
    const aEarly = rowsOf(unmasked, 'A').find((r) => hourOf(r.START_DATE) > 4.5 && hourOf(r.START_DATE) < 5.3);

    expect(aEarly).toBeDefined();
    const aEarlyMasked = rowsOf(masked, 'A').find((r) => Math.abs(ms(r.START_DATE) - ms(aEarly!.START_DATE)) <= 8 * 60_000);

    if (aEarlyMasked) {
      expect(ms(aEarlyMasked.STOP_DATE) - ms(aEarlyMasked.START_DATE)).toBeLessThan(ms(aEarly!.STOP_DATE) - ms(aEarly!.START_DATE));
    }

    // T03 examples: F 05:09:38 and E 05:25:38 each lose about 5 minutes (303 s and 308 s blocked).
    for (const [id, lo, hi] of [
      ['F', 5.0, 5.3],
      ['E', 5.3, 5.55],
    ] as const) {
      const full = rowsOf(unmasked, id).find((r) => hourOf(r.START_DATE) > lo && hourOf(r.START_DATE) < hi);

      expect(full, `${id} unmasked pass near 05:${id === 'F' ? '09' : '25'}`).toBeDefined();
      const keptSec = rowsOf(masked, id)
        .filter((m) => ms(m.START_DATE) < ms(full!.STOP_DATE) && ms(m.STOP_DATE) > ms(full!.START_DATE))
        .reduce((sum, m) => sum + (ms(m.STOP_DATE) - ms(m.START_DATE)) / 1000, 0);

      expect((ms(full!.STOP_DATE) - ms(full!.START_DATE)) / 1000 - keptSec, `${id} blocked seconds`).toBeGreaterThanOrEqual(240);
    }

    // At least one unmasked pass has no overlapping masked pass (fully masked).
    const fullyMasked = unmasked.filter(
      (u) => !rowsOf(masked, SAT_IDS[Number(u.SATELLITE_ID) - 99001]).some((m) => ms(m.START_DATE) < ms(u.STOP_DATE) && ms(m.STOP_DATE) > ms(u.START_DATE))
    );

    expect(fullyMasked.length).toBeGreaterThanOrEqual(1);
  }, 120000);

  it('an interpolated vertex mask wraps at 360 and still agrees with Look Angles', async () => {
    const vertex = { mask: VERTEX_MASK, interpolate: true };
    const unmasked = await collect(SAT_IDS, {});
    const masked = await collect(SAT_IDS, vertex);
    const sensor = new DetailedSensor(ridge(vertex) as ConstructorParameters<typeof DetailedSensor>[0]);

    // Vertices at 350 and 10 are both 30 deg, so the floor is 30 on both sides of azimuth 0.
    expect(sensor.getMaskElevationAt(0 as never)).toBeCloseTo(30, 5);
    expect(sensor.getMaskElevationAt(355 as never)).toBeCloseTo(30, 5);
    expect(sensor.getMaskElevationAt(5 as never)).toBeCloseTo(30, 5);

    expect(masked.every((r) => r.MASK_APPLIED === true)).toBe(true);
    expect(secs(masked)).toBeLessThan(secs(unmasked));
    expect(masked.some((r) => r.MASK_LIMITED)).toBe(true);
    for (const id of SAT_IDS) {
      assertAgreesWithLookAngles(id, masked, sensor);
    }
  }, 120000);
});
