import { vi } from 'vitest';
import { CatalogExporter } from '@app/app/data/catalog-exporter';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { saveXlsx } from '@app/engine/utils/saveVariable';
import { BaseObject, Satellite, TleLine1 } from '@ootk/src/main';
import { defaultSat } from './environment/apiMocks';

vi.mock('@app/engine/utils/saveVariable', () => ({
  saveXlsx: vi.fn(),
  saveCsv: vi.fn(),
  saveVariable: vi.fn(),
  copyTsvToClipboard: vi.fn(),
  getCircularReplacer: vi.fn(),
}));

// Capture the text the TLE/TCE export paths would have written to disk.
let lastSavedBlob: Blob | null = null;

vi.mock('file-saver', () => ({
  saveAs: vi.fn((blob: Blob) => {
    lastSavedBlob = blob;
  }),
}));

/*
 * Covers the previously-untested export paths: exportTce, exportSatInFov2Csv,
 * the 3-line variant of exportTle2Txt, and the analyst/NO-TLE filters. The
 * data-shaping is what matters; the actual file save is mocked.
 */
describe('CatalogExporter (extra paths)', () => {
  const saveXlsxMock = saveXlsx as unknown as ReturnType<typeof vi.fn>;

  const makeSat = (overrides: Partial<Satellite>): Satellite => {
    const sat = defaultSat.clone() as Satellite;

    Object.assign(sat, overrides);

    return sat;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    lastSavedBlob = null;
  });

  describe('exportTce', () => {
    it('writes the TLE pairs of every satellite, sorted by sccNum', async () => {
      const objData = [
        makeSat({ id: 0, sccNum: '25544' }),
        makeSat({ id: 1, sccNum: '00005' }),
      ] as BaseObject[];

      CatalogExporter.exportTce(objData);

      expect(lastSavedBlob).not.toBeNull();
      const text = await lastSavedBlob!.text();

      // 2 sats * 2 TLE lines.
      expect(text.split('\n')).toHaveLength(4);
    });

    it('excludes analyst satellites by default', async () => {
      const objData = [
        makeSat({ id: 0, sccNum: '25544', country: 'USA' }),
        makeSat({ id: 1, sccNum: '90001', country: 'ANALSAT' }),
      ] as BaseObject[];

      CatalogExporter.exportTce(objData);
      const text = await lastSavedBlob!.text();

      // Only the non-analyst sat's 2 lines.
      expect(text.split('\n')).toHaveLength(2);
    });

    it('skips satellites whose TLE is a "NO TLE" placeholder', async () => {
      const objData = [
        makeSat({ id: 0, sccNum: '25544' }),
        makeSat({ id: 1, sccNum: '30000', tle1: 'NO TLE AVAILABLE' as TleLine1 }),
      ] as BaseObject[];

      CatalogExporter.exportTce(objData);
      const text = await lastSavedBlob!.text();

      expect(text.split('\n')).toHaveLength(2);
    });

    it('does not save anything when there is no TLE data', () => {
      CatalogExporter.exportTce([]);
      expect(lastSavedBlob).toBeNull();
    });
  });

  describe('exportTle2Txt 3-line variant', () => {
    it('prepends the satellite name before each TLE pair', async () => {
      const objData = [makeSat({ id: 0, sccNum: '25544', name: 'ISS (ZARYA)' })] as BaseObject[];

      CatalogExporter.exportTle2Txt(objData, 3);
      const text = await lastSavedBlob!.text();
      const lines = text.split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('ISS (ZARYA)');
    });
  });

  describe('exportSatInFov2Csv', () => {
    it('exports only the satellites flagged in-view by the dots manager', () => {
      const inView = makeSat({ id: 0, sccNum: '25544' });
      const notInView = makeSat({ id: 1, sccNum: '00005' });

      vi.spyOn(ServiceLocator, 'getDotsManager').mockReturnValue({
        inViewData: [1, 0],
      } as never);

      CatalogExporter.exportSatInFov2Csv([inView, notInView] as BaseObject[]);

      expect(saveXlsxMock).toHaveBeenCalledOnce();
      const [rows, filename] = saveXlsxMock.mock.calls[0];

      expect(filename).toBe('satInView');
      expect(rows).toHaveLength(1);
      expect(rows[0].satId).toBe('25544');
    });
  });
});
