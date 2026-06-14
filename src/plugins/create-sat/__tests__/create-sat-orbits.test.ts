import { TleLine1, TleLine2 } from '@ootk/src/main';
import {
  computePresetElements,
  cosparToRawIntlDes,
  dateToEpochFields,
  rawIntlDesFromTle,
  sunSyncInclinationDeg,
  tleToElementFields,
} from '@app/plugins/create-sat/create-sat-orbits';

describe('create-sat-orbits', () => {
  it('computePresetElements(geo) yields a ~1 rev/day equatorial circular orbit', () => {
    const el = computePresetElements('geo');

    expect(el.inc).toBe('000.0000');
    expect(el.ecen).toBe('0000000');
    expect(el.meanmo.startsWith('01.00')).toBe(true);
    expect(el.period.startsWith('143')).toBe(true);
  });

  it('computePresetElements(molniya) keeps the defining 63.4 deg / 270 deg geometry', () => {
    const el = computePresetElements('molniya');

    expect(el.inc).toBe('063.4000');
    expect(el.argPe).toBe('270.0000');
    expect(el.ecen).toHaveLength(7);
    // Eccentric (~0.72), so the 7-digit field is well above zero.
    expect(parseInt(el.ecen, 10)).toBeGreaterThan(6_000_000);
  });

  it('computePresetElements(sso) derives a retrograde sun-synchronous inclination', () => {
    const el = computePresetElements('sso-800');
    const inc = parseFloat(el.inc);

    expect(inc).toBeGreaterThan(98);
    expect(inc).toBeLessThan(99.5);
  });

  it('sunSyncInclinationDeg is ~98.6 deg at 800 km', () => {
    const inc = sunSyncInclinationDeg(800);

    expect(inc).toBeGreaterThan(98);
    expect(inc).toBeLessThan(99);
  });

  it('cosparToRawIntlDes converts COSPAR ids to raw TLE columns', () => {
    expect(cosparToRawIntlDes('1998-067A')).toBe('98067A');
    expect(cosparToRawIntlDes('2024-001AB')).toBe('24001AB');
    expect(cosparToRawIntlDes('')).toBe('');
    expect(cosparToRawIntlDes('not-a-cospar')).toBe('');
  });

  it('rawIntlDesFromTle reads cols 10-17 of line 1', () => {
    const line1 = '1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991' as TleLine1;

    expect(rawIntlDesFromTle(line1)).toBe('98067A');
  });

  it('dateToEpochFields returns 2-digit year and fractional day-of-year', () => {
    const fields = dateToEpochFields(new Date('2021-07-22T00:00:00.000Z'));

    expect(fields.year).toBe('21');
    expect(fields.day.startsWith('203.')).toBe(true);
  });

  it('tleToElementFields round-trips the ISS element set', () => {
    const line1 = '1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991' as TleLine1;
    const line2 = '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053' as TleLine2;
    const fields = tleToElementFields(line1, line2);

    expect(fields.year).toBe('21');
    expect(fields.inc).toContain('51.6423');
    expect(fields.rasc).toContain('168.5744');
  });
});
