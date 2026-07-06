import { readdirSync, readFileSync } from 'fs';
import * as path from 'path';

/**
 * Structural integrity of the committed mass-raid scenario files.
 *
 * This is the guard that was missing when the regional (IRBM/SRBM) scenarios shipped
 * with broken trajectories: the ICBM-only solver truncated their coordinate lists into
 * NaN tails, and nothing flagged it. These checks validate every baked missile in every
 * scenario so a bad regeneration fails CI instead of shipping.
 */
const SIM_DIR = path.resolve(__dirname, '../../../../public/simulation');

interface RaidEntry {
  ON: string;
  C: string;
  desc: string;
  type: number;
  latList: number[];
  lonList: number[];
  altList: number[];
}

const scenarioFiles = readdirSync(SIM_DIR).filter((f) => f.endsWith('.json'));

describe('Mass-raid scenario file integrity', () => {
  it('finds scenario files to validate', () => {
    expect(scenarioFiles.length).toBeGreaterThan(0);
  });

  for (const file of scenarioFiles) {
    describe(file, () => {
      const entries = JSON.parse(readFileSync(path.join(SIM_DIR, file), 'utf8')) as RaidEntry[];

      it('has at least one missile', () => {
        expect(entries.length).toBeGreaterThan(0);
      });

      it('every missile has equal-length lat/lon/alt lists (no truncated NaN tail)', () => {
        const bad = entries.filter((e) => !(e.latList.length === e.lonList.length && e.lonList.length === e.altList.length));

        expect(bad.map((e) => e.ON)).toEqual([]);
      });

      it('every coordinate and altitude is finite (no NaN / null)', () => {
        const bad = entries.filter(
          (e) =>
            !e.latList.every((v) => Number.isFinite(v)) ||
            !e.lonList.every((v) => Number.isFinite(v)) ||
            !e.altList.every((v) => Number.isFinite(v)),
        );

        expect(bad.map((e) => e.ON)).toEqual([]);
      });

      it('no altitude dips below the ground', () => {
        const bad = entries.filter((e) => e.altList.some((v) => v < 0));

        expect(bad.map((e) => e.ON)).toEqual([]);
      });

      it('every missile reaches a plausible apogee (30 km .. 2000 km) and returns to the surface', () => {
        const bad = entries.filter((e) => {
          const peak = Math.max(...e.altList);
          const last = e.altList[e.altList.length - 1];

          return peak < 30 || peak > 2000 || last > 5;
        });

        expect(bad.map((e) => `${e.ON} (${e.desc})`)).toEqual([]);
      });

      it('every missile is typed as a ballistic missile (type 8)', () => {
        const bad = entries.filter((e) => e.type !== 8);

        expect(bad.map((e) => e.ON)).toEqual([]);
      });
    });
  }
});
