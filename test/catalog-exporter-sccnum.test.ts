import { vi } from 'vitest';
import { CatalogExporter } from '@app/app/data/catalog-exporter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { saveXlsx } from '@app/engine/utils/saveVariable';
import { BaseObject, Satellite, TleLine1, TleLine2 } from '@ootk/src/main';

vi.mock('@app/engine/utils/saveVariable', () => ({
  saveXlsx: vi.fn(),
  saveCsv: vi.fn(),
  saveVariable: vi.fn(),
  copyTsvToClipboard: vi.fn(),
  getCircularReplacer: vi.fn(),
}));

// file-saver's saveAs is invoked by the TLE-text export path. Capture the
// raw text the exporter would have written so the test can assert on it.
let lastSavedBlob: Blob | null = null;

vi.mock('file-saver', () => ({
  saveAs: vi.fn((blob: Blob) => {
    lastSavedBlob = blob;
  }),
}));

// Build a Satellite directly from TLEs so the sccNum invariant applies
// (always normalized to numeric form by the Satellite class).
const buildSat = (id: number, tleSatNum: string, sccNumOverride?: string): Satellite => {
  const tle1 = `1 ${tleSatNum.padEnd(5)}U 98067A   22203.46960946  .00003068  00000+0  61583-4 0  9996` as TleLine1;
  const tle2 = `2 ${tleSatNum.padEnd(5)}  51.6415 161.8339 0005168  35.9781  54.7009 15.50067047350657` as TleLine2;
  const sat = new Satellite({ tle1, tle2, sccNum: sccNumOverride });

  sat.id = id;

  return sat;
};

describe('CatalogExporter sccNum behavior across forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastSavedBlob = null;
  });

  describe('exportTle2Csv preserves canonical sccNum across all forms', () => {
    it('writes Satellite.sccNum (always numeric) into the satId column', () => {
      const sats: BaseObject[] = [
        buildSat(0, '25544'),                  // legacy 5-digit numeric
        buildSat(1, 'T0001'),                  // alpha-5 — Satellite normalizes to 270001
        buildSat(2, '99999', '799500766'),     // extended ID via explicit override
      ];

      CatalogExporter.exportTle2Csv(sats);

      expect(saveXlsx).toHaveBeenCalledTimes(1);
      const [rows] = (saveXlsx as ReturnType<typeof vi.fn>).mock.calls[0];

      // Each row's satId === canonical sccNum. Alpha-5 input is the 6-digit
      // form; extended preserves the full canonical 9-digit value.
      const ids = rows.map((r: { satId: string }) => r.satId).sort();

      expect(ids).toEqual(['25544', '270001', '799500766']);
    });

    it('round-trips Satellite.sccNum through CSV export without precision loss for extended IDs', () => {
      const extended = buildSat(0, '99999', '799500766');

      CatalogExporter.exportTle2Csv([extended] as BaseObject[]);

      const [rows] = (saveXlsx as ReturnType<typeof vi.fn>).mock.calls[0];

      expect(rows[0].satId).toBe('799500766');
      // TLE columns in the export carry the trailing 5 digits — by physical
      // TLE format. The full canonical id is recoverable from the satId column.
      expect(rows[0].tle1.substring(2, 7)).toBe('99999');
    });
  });

  describe('exportTle2Csv sort order across mixed-width sccNums', () => {
    it('sorts numerically across 5-digit, alpha-5 numeric form, and 9-digit', () => {
      const sats: BaseObject[] = [
        buildSat(0, '99999'),                  // 99999
        buildSat(1, '25544'),                  // 25544
        buildSat(2, '00005'),                  // "5" after leading-zero strip
        buildSat(3, 'T0001'),                  // alpha-5 → 270001 numeric
        buildSat(4, '99999', '799500766'),     // extended 9-digit
      ];

      CatalogExporter.exportTle2Csv(sats);

      const [rows] = (saveXlsx as ReturnType<typeof vi.fn>).mock.calls[0];
      const orderedIds = rows.map((r: { satId: string }) => r.satId);

      // Natural-number sort order: 5 < 25544 < 99999 < 270001 < 799500766.
      // sat.sccNum is the natural-number form for all five so localeCompare
      // with {numeric: true} produces the correct cross-width ordering.
      expect(orderedIds).toEqual(['5', '25544', '99999', '270001', '799500766']);
    });
  });

  describe('exportTle2Txt preserves TLE col 3-7 satnum verbatim', () => {
    it('writes the TLE lines with their original satnum (truncated last-5 for extended)', async () => {
      const sats: BaseObject[] = [
        buildSat(0, '25544'),
        buildSat(1, '99999', '799500766'),
      ];

      CatalogExporter.exportTle2Txt(sats);

      expect(lastSavedBlob).not.toBeNull();
      // Node's Blob.text() resolves natively; jsdom's Blob in vitest also
      // exposes a working .text() per the WHATWG spec.
      const text = await lastSavedBlob!.text();
      const lines = text.split('\n');

      expect(lines).toHaveLength(4); // 2 sats × 2 lines
      expect(lines[0]).toContain(' 25544U');
      // Extended: TLE only carries trailing 5 digits; canonical 9-digit lives
      // on the Satellite (and on the CSV satId column, not in the TLE text).
      expect(lines[2]).toContain(' 99999U');
    });
  });

  describe('TLE-text export warns when extended IDs are in the selection', () => {
    // TLE format physically caps cols 3-7 at 5 chars. CSV/OMM exports carry
    // the canonical sccNum in a dedicated column so extended IDs survive,
    // but pure-TLE-text exports (TLE.txt / .tce) lose the canonical id on
    // re-import. The exporter still proceeds — the warning is informational.
    it('exportTle2Txt warns when any sat has an extended sccNum', () => {
      const warnSpy = vi.spyOn(errorManagerInstance, 'warn');
      const sats: BaseObject[] = [
        buildSat(0, '25544'),
        buildSat(1, '99999', '799500766'),
      ];

      CatalogExporter.exportTle2Txt(sats);

      expect(warnSpy).toHaveBeenCalled();
      const [msg] = warnSpy.mock.calls[0];

      expect(msg).toMatch(/extended/iu);
      expect(msg).toMatch(/CSV.*OMM|OMM.*CSV/iu);
    });

    it('exportTle2Txt does not warn when only numeric/alpha-5 sats are exported', () => {
      const warnSpy = vi.spyOn(errorManagerInstance, 'warn');
      const sats: BaseObject[] = [
        buildSat(0, '25544'),
        buildSat(1, 'T0001'), // alpha-5 → numeric6 on sccNum, still TLE-safe
      ];

      CatalogExporter.exportTle2Txt(sats);

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('exportTle2Csv does NOT warn — CSV preserves extended IDs in the satId column', () => {
      const warnSpy = vi.spyOn(errorManagerInstance, 'warn');
      const sats: BaseObject[] = [
        buildSat(0, '25544'),
        buildSat(1, '99999', '799500766'),
      ];

      CatalogExporter.exportTle2Csv(sats);

      // CSV round-trip is safe — no warning needed.
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('exportTle2Csv excludes analyst satellites by default', () => {
    it('filters sats whose country is ANALSAT', () => {
      const real = buildSat(0, '25544');
      const analyst = buildSat(1, '90001');

      analyst.country = 'ANALSAT';

      CatalogExporter.exportTle2Csv([real, analyst] as BaseObject[]);
      const [rows] = (saveXlsx as ReturnType<typeof vi.fn>).mock.calls[0];

      expect(rows.map((r: { satId: string }) => r.satId)).toEqual(['25544']);
    });

    it('includes analyst satellites when isDeleteAnalysts=false', () => {
      const real = buildSat(0, '25544');
      const analyst = buildSat(1, '90001');

      analyst.country = 'ANALSAT';

      CatalogExporter.exportTle2Csv([real, analyst] as BaseObject[], false);
      const [rows] = (saveXlsx as ReturnType<typeof vi.fn>).mock.calls[0];

      expect(rows.map((r: { satId: string }) => r.satId).sort()).toEqual(['25544', '90001']);
    });
  });
});
