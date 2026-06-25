import { Satellite } from '@ootk/src/main';
import { vi } from 'vitest';
import {
  DEFAULT_EPHEM_SPAN_HOURS,
  DEFAULT_EPHEM_STEP_SEC,
  MAX_EPHEM_POINTS,
  downloadText,
  exportFileName,
  parseEphemerisParams,
} from '../catalog-management-export';

// file-saver's ESM export can't be spied directly, so replace the module wholesale.
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

describe('parseEphemerisParams', () => {
  it('parses valid span/step and derives the sample count', () => {
    const result = parseEphemerisParams('24', '60');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.params.spanHours).toBe(24);
      expect(result.params.stepSec).toBe(60);
      // 24h / 60s = 1440 intervals + 1 sample
      expect(result.params.numPoints).toBe(1441);
    }
  });

  it.each([
    ['blank', '', ''],
    ['non-numeric', 'abc', 'xyz'],
    ['zero', '0', '0'],
    ['negative', '-5', '-10'],
  ])('falls back to defaults for %s input', (_label, span, step) => {
    const result = parseEphemerisParams(span, step);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.params.spanHours).toBe(DEFAULT_EPHEM_SPAN_HOURS);
      expect(result.params.stepSec).toBe(DEFAULT_EPHEM_STEP_SEC);
    }
  });

  it('tolerates null/undefined input', () => {
    const result = parseEphemerisParams(null, undefined);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.params.spanHours).toBe(DEFAULT_EPHEM_SPAN_HOURS);
      expect(result.params.stepSec).toBe(DEFAULT_EPHEM_STEP_SEC);
    }
  });

  it('rejects parameter combinations exceeding the point cap', () => {
    // 24h with a 0.001s step would be ~86.4M points.
    const result = parseEphemerisParams('24', '0.001');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('tooManyPoints');
      expect(result.numPoints).toBeGreaterThan(MAX_EPHEM_POINTS);
    }
  });

  it('accepts a combination right at the point cap', () => {
    // Pick a step that lands just under the cap for a 24h span.
    const stepSec = (24 * 3600) / (MAX_EPHEM_POINTS - 1);
    const result = parseEphemerisParams('24', stepSec.toString());

    expect(result.ok).toBe(true);
  });
});

describe('exportFileName', () => {
  it('prefers the 5-digit SCC number', () => {
    const sat = { sccNum5: '00005', sccNum: '5' } as unknown as Satellite;

    expect(exportFileName(sat, 'opm')).toBe('00005.opm');
  });

  it('falls back to sccNum when sccNum5 is absent', () => {
    const sat = { sccNum5: undefined, sccNum: '270001' } as unknown as Satellite;

    expect(exportFileName(sat, 'oem')).toBe('270001.oem');
  });
});

describe('downloadText', () => {
  it('wraps content in a UTF-8 blob and saves it under the given name', async () => {
    // Resolve the live mock the helper actually calls (robust to module-cache
    // sharing across test files when isolation is relaxed).
    const { saveAs: liveSaveAs } = await import('file-saver');

    vi.mocked(liveSaveAs).mockClear();

    downloadText('hello world', 'test.omm');

    expect(liveSaveAs).toHaveBeenCalledTimes(1);
    const [blob, filename] = vi.mocked(liveSaveAs).mock.calls[0];

    expect(filename).toBe('test.omm');
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toBe('text/plain;charset=utf-8');
  });
});
