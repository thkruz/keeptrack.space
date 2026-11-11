import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { BestPassDeps, findPassesForSat, PassRae } from '@app/plugins/best-pass/best-pass-calculator';
import { SatelliteRecord } from '@ootk/src/main';
import { defaultSensor } from '@test/environment/apiMocks';
import { findPassesForSat as findPassesLegacy } from './fixtures/best-pass-calculator.pre-f1';

/**
 * F1 golden comparison: the pre-F1 calculator (fixtures/best-pass-calculator.pre-f1.ts) against the
 * current one over deterministic scripted look angles (no network, pinned epoch).
 *
 * Contract: opt-in output is identical; on the default path only MAXIMUM_ELEVATION, MINIMUM_RANGE,
 * MAXIMUM_ELEVATION_DTG and PASS_SCORE may differ, and only on rows that follow a dropped contact. A row where only
 * PASS_SCORE differs (the start3 carry-over fix) must follow a dropped contact with el <= 3.5 deg.
 */
const BASE_MS = Date.UTC(2026, 10, 4, 0, 0, 0);
const MIN_MS = 60_000;
const ALLOWED_DIFF = new Set(['MAXIMUM_ELEVATION', 'MINIMUM_RANGE', 'MAXIMUM_ELEVATION_DTG', 'PASS_SCORE']);
const satrec = (no: number): SatelliteRecord => ({ no }) as unknown as SatelliteRecord;

interface Look {
  el: number;
  az: number;
  rng: number;
}

interface Fixture {
  name: string;
  no: number;
  periodMin: number;
  duty: number;
  phaseMin: number;
  peaks: number[];
  lengthDays: number;
  masked: boolean;
}

const FIXTURES: Fixture[] = [
  { name: 'LEO phase -3 (3 min into a contact at t=0)', no: 0.065696, periodMin: 95, duty: 0.1, phaseMin: -3, peaks: [60, 12, 85, 4, 30], lengthDays: 1, masked: false },
  { name: 'LEO phase 40 (rises 40 min after t=0)', no: 0.065696, periodMin: 95, duty: 0.1, phaseMin: 40, peaks: [15, 70, 3, 45, 22], lengthDays: 1, masked: false },
  { name: 'LEO short contacts, phase -0.4 (in view at t=0)', no: 0.065696, periodMin: 95, duty: 0.012, phaseMin: -0.4, peaks: [50, 9, 66], lengthDays: 1, masked: false },
  { name: 'LEO masked, phase -2 (in view at t=0)', no: 0.065696, periodMin: 95, duty: 0.1, phaseMin: -2, peaks: [55, 6, 80, 11], lengthDays: 1, masked: true },
  { name: 'MEO phase -60 (in view at t=0)', no: 0.0087, periodMin: 720, duty: 0.3, phaseMin: -60, peaks: [40, 75, 20], lengthDays: 2, masked: false },
  { name: 'MEO masked, phase 200', no: 0.0087, periodMin: 720, duty: 0.3, phaseMin: 200, peaks: [35, 10, 62], lengthDays: 2, masked: true },
  { name: 'GEO mostly in view, phase -30 (in view at t=0)', no: 0.004375269, periodMin: 1440, duty: 0.9, phaseMin: -30, peaks: [48, 52], lengthDays: 2, masked: false },
  { name: 'GEO daily gap, phase 100', no: 0.004375269, periodMin: 1440, duty: 0.6, phaseMin: 100, peaks: [33, 41], lengthDays: 3, masked: false },
];

const lookAt = (f: Fixture, offsetMs: number): Look | null => {
  const periodMs = f.periodMin * MIN_MS;
  // Contact rises phaseMin minutes after t=0; a negative phase starts already inside a contact.
  const shifted = offsetMs - f.phaseMin * MIN_MS;
  const cycle = Math.floor(shifted / periodMs);
  const u = (shifted - cycle * periodMs) / periodMs;

  if (u >= f.duty) {
    return null;
  }
  const peak = f.peaks[((cycle % f.peaks.length) + f.peaks.length) % f.peaks.length];
  const el = peak * Math.sin((Math.PI * u) / f.duty);
  const az = 100 + (u / f.duty) * 200;

  return { el, az, rng: 500 + (90 - el) * 20 + (((cycle % 5) + 5) % 5) * 7 };
};

const MASK_AZ_MAX = 180;
const MASK_EL_MIN = 8;

const makeDeps = (f: Fixture): BestPassDeps => ({
  baseTimeMs: BASE_MS,
  getRae: (date): PassRae => {
    const l = lookAt(f, date.getTime() - BASE_MS);

    return l ? { az: l.az, el: l.el, rng: l.rng } : { az: 250, el: -10, rng: 40000 };
  },
  checkIsInView: (_s, rae) => {
    const el = rae.el ?? -90;

    if (el < 0) {
      return false;
    }

    return !(f.masked && (rae.az ?? 0) < MASK_AZ_MAX && el < MASK_EL_MIN);
  },
  sunEciKm: () => ({ x: 1.4e8, y: 0, z: 0 }) as ReturnType<BestPassDeps['sunEciKm']>,
});

const makeSensor = (f: Fixture): DetailedSensor => {
  const sensor = Object.create(defaultSensor) as Record<string, unknown>;

  sensor.maxRng = 50000;
  sensor.hasElevationMask = () => f.masked;
  sensor.isMaskBlocked = (az: number, el: number) => f.masked && az < MASK_AZ_MAX && el < MASK_EL_MIN;

  return sensor as unknown as DetailedSensor;
};

const norm = (v: unknown): unknown => (v instanceof Date ? v.getTime() : v);

describe('best-pass F1 golden: pre-F1 snapshot vs current', () => {
  it('differs only in the four derived fields, only after a dropped contact; opt-in is identical', () => {
    let rowsCompared = 0;
    let rowsDiffering = 0;
    let passScoreOnlyRows = 0;
    let rowsAfterDroppedContact = 0;
    const fieldsDiffering = new Set<string>();

    for (const f of FIXTURES) {
      for (const intervalSec of [30, 60, 300]) {
        for (const optIn of [false, true]) {
          const options = { lengthDays: f.lengthDays, intervalSec, includeClippedPasses: optIn };
          const oldRows = findPassesLegacy('G', satrec(f.no), makeSensor(f), options, makeDeps(f), 'RIDGE').passes;
          const newDeps = makeDeps(f);
          const inViewSamplesMs: number[] = [];
          const lowViewSamplesMs: number[] = [];
          let lastRaeMs = 0;
          const baseGetRae = newDeps.getRae;
          const baseCheck = newDeps.checkIsInView;

          newDeps.getRae = (date, ...rest) => {
            lastRaeMs = date.getTime();

            return baseGetRae(date, ...rest);
          };
          newDeps.checkIsInView = (sensor, rae) => {
            const inView = baseCheck(sensor, rae);

            if (inView) {
              inViewSamplesMs.push(lastRaeMs);
              if ((rae.el ?? 90) <= 3.5) {
                lowViewSamplesMs.push(lastRaeMs);
              }
            }

            return inView;
          };
          const newRows = findPassesForSat('G', satrec(f.no), makeSensor(f), options, newDeps, 'RIDGE').passes;
          const label = `${f.name} / ${intervalSec}s / optIn=${optIn}`;

          expect({ label, count: newRows.length }).toEqual({ label, count: oldRows.length });

          let prevStopMs = BASE_MS - 1; // so the t=0 sample counts

          newRows.forEach((row, i) => {
            const old = oldRows[i] as unknown as Record<string, unknown>;
            const cur = row as unknown as Record<string, unknown>;
            const keys = new Set([...Object.keys(old), ...Object.keys(cur)]);
            const diff = [...keys].filter((k) => norm(old[k]) !== norm(cur[k]));
            const startMs = (row.START_DATE as Date).getTime();

            // A dropped contact: an in-view sample the calculator actually took (recorded through the wrapped
            // checkIsInView) strictly between the previous emitted row's stop and this row's start.
            const dropped = inViewSamplesMs.some((t) => t > prevStopMs && t < startMs);
            const droppedLow = lowViewSamplesMs.some((t) => t > prevStopMs && t < startMs);

            prevStopMs = (row.STOP_DATE as Date).getTime();
            rowsCompared++;
            if (dropped) {
              rowsAfterDroppedContact++;
            }
            if (diff.length === 0) {
              return;
            }
            rowsDiffering++;
            for (const k of diff) {
              fieldsDiffering.add(k);
            }

            expect({ label, row: i, optIn, diff: diff.filter((k) => !ALLOWED_DIFF.has(k)) }).toEqual({ label, row: i, optIn, diff: [] });
            expect({ label, row: i, optIn }).toEqual({ label, row: i, optIn: false });
            expect({ label, row: i, dropped }).toEqual({ label, row: i, dropped: true });
            if (diff.includes('PASS_SCORE') && !diff.includes('MAXIMUM_ELEVATION') && !diff.includes('MINIMUM_RANGE')) {
              passScoreOnlyRows++;
              expect({ label, row: i, droppedLow }).toEqual({ label, row: i, droppedLow: true });
            }
          });
        }
      }
    }

    expect(rowsCompared).toBeGreaterThan(100);
    expect(rowsDiffering).toBeGreaterThan(0);
    // The scripted golden data has no dropped low contact followed by a low-setting pass, so the droppedLow guard
    // above never runs. Pin the count at 0 so a fixture or data change that starts hitting the start3 carry-over
    // shows up here and gets reviewed.
    expect(passScoreOnlyRows).toBe(0);
  });
});
