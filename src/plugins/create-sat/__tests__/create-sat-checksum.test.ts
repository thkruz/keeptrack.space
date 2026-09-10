import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getTleChecksumMismatches, warnOnTleChecksumMismatch } from '@app/plugins/create-sat/create-sat-checksum';
import { FormatTle } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/** Real ISS element set with valid mod-10 checksums (1 and 3). */
const ISS_TLE1 = '1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991';
const ISS_TLE2 = '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053';

/** Replace the trailing checksum column (69) of a TLE line. */
const withChecksum = (line: string, digit: string): string => line.substring(0, 68) + digit;

describe('create-sat-checksum', () => {
  it('reports no mismatches for a TLE pair with valid checksums', () => {
    expect(getTleChecksumMismatches(ISS_TLE1, ISS_TLE2)).toEqual([]);
  });

  it('reports a mismatch when the line 1 trailing digit is wrong', () => {
    const badLine1 = withChecksum(ISS_TLE1, '5');
    const mismatches = getTleChecksumMismatches(badLine1, ISS_TLE2);

    expect(mismatches).toEqual([{ lineNumber: 1, expected: 1, actual: '5' }]);
  });

  it('reports both lines when both trailing digits are wrong', () => {
    const badLine1 = withChecksum(ISS_TLE1, '0');
    const badLine2 = withChecksum(ISS_TLE2, '0');
    const mismatches = getTleChecksumMismatches(badLine1, badLine2);

    expect(mismatches).toEqual([
      { lineNumber: 1, expected: 1, actual: '0' },
      { lineNumber: 2, expected: 3, actual: '0' },
    ]);
  });

  it('handles alpha-5 lines (letters contribute nothing to the mod-10 sum)', () => {
    const { tle1, tle2 } = FormatTle.createTle({
      scc: 'T0001',
      inc: '51.6400',
      meanmo: '15.48839820',
      rasc: '168.5744',
      argPe: '184.3976',
      meana: '313.3642',
      ecen: '0001475',
      epochyr: '21',
      epochday: '203.40407588',
      intl: '98067A',
    });

    // createTle stamps a freshly computed checksum, so the pair is consistent.
    expect(getTleChecksumMismatches(tle1, tle2)).toEqual([]);

    // Corrupting the trailing digit is still caught on an alpha-5 line.
    const expected = FormatTle.tleChecksum(tle1);
    const wrongDigit = ((expected + 1) % 10).toString();
    const badLine1 = withChecksum(tle1, wrongDigit);

    expect(getTleChecksumMismatches(badLine1, tle2)).toEqual([{ lineNumber: 1, expected, actual: wrongDigit }]);
  });

  it('ignores lines too short to carry a checksum column', () => {
    expect(getTleChecksumMismatches('1 25544U', '2 25544')).toEqual([]);
  });

  describe('warnOnTleChecksumMismatch', () => {
    beforeEach(() => {
      setupStandardEnvironment();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('raises a caution toast per mismatched line without blocking', () => {
      const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

      toastSpy.mockClear();

      const badLine1 = withChecksum(ISS_TLE1, '5');

      expect(warnOnTleChecksumMismatch(badLine1, ISS_TLE2)).toBe(true);
      expect(toastSpy).toHaveBeenCalledTimes(1);
      expect(toastSpy).toHaveBeenCalledWith(expect.any(String), ToastMsgType.caution, true);
    });

    it('stays silent for a valid TLE pair', () => {
      const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

      toastSpy.mockClear();

      expect(warnOnTleChecksumMismatch(ISS_TLE1, ISS_TLE2)).toBe(false);
      expect(toastSpy).not.toHaveBeenCalled();
    });
  });
});
