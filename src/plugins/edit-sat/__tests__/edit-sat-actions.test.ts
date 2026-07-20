import { buildSaveBlob, calculateDerivedParams, parseLoadedTle, pickZoomForApogee } from '@app/plugins/edit-sat/edit-sat-actions';
import { Satellite, TleLine1, TleLine2, ZoomValue } from '@ootk/src/main';

const TLE1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005' as TleLine1;
const TLE2 = '2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.49401438 25004' as TleLine2;

describe('edit-sat-actions', () => {
  describe('buildSaveBlob', () => {
    it('includes the canonical sccNum alongside the TLE lines', () => {
      // The pre-fix writer emitted only {tle1, tle2}; the loader prefers sccNum
      // to preserve identity for extended/alpha-5 catalog numbers.
      const sat = { sccNum: '799500766', tle1: TLE1, tle2: TLE2 } as unknown as Satellite;
      const parsed = JSON.parse(buildSaveBlob(sat));

      expect(parsed).toEqual({ sccNum: '799500766', tle1: TLE1, tle2: TLE2 });
    });
  });

  describe('parseLoadedTle', () => {
    it('prefers the canonical sccNum field when present', () => {
      const result = parseLoadedTle(JSON.stringify({ sccNum: 'T0001', tle1: TLE1, tle2: TLE2 }));

      expect(result).not.toBeNull();
      expect(result!.sccNum).toBe('T0001');
      expect(result!.tle1).toBe(TLE1);
    });

    it('coerces a numeric sccNum to a string', () => {
      const result = parseLoadedTle(JSON.stringify({ sccNum: 25544, tle1: TLE1, tle2: TLE2 }));

      expect(result!.sccNum).toBe('25544');
    });

    it('falls back to the TLE column for legacy files without sccNum', () => {
      const result = parseLoadedTle(JSON.stringify({ tle1: TLE1, tle2: TLE2 }));

      // Columns 3-7 of TLE1 hold the catalog number (25544).
      expect(result!.sccNum).toBe('25544');
    });

    it('returns null for malformed JSON', () => {
      expect(parseLoadedTle('not json')).toBeNull();
    });

    it('returns null when the TLE lines are missing', () => {
      expect(parseLoadedTle(JSON.stringify({ sccNum: '25544' }))).toBeNull();
    });
  });

  describe('pickZoomForApogee', () => {
    it('zooms out to GEO for high-apogee orbits', () => {
      expect(pickZoomForApogee(35_786)).toBe(ZoomValue.GEO);
    });

    it('stays at LEO for low-apogee orbits', () => {
      expect(pickZoomForApogee(400)).toBe(ZoomValue.LEO);
    });
  });

  describe('calculateDerivedParams', () => {
    it('derives a ~400 km circular LEO from its mean motion', () => {
      // ISS-like: ~15.5 rev/day, near-circular.
      const derived = calculateDerivedParams(15.5, 0.0006);

      expect(derived.apogee).toBeGreaterThan(380);
      expect(derived.apogee).toBeLessThan(440);
      expect(derived.perigee).toBeGreaterThan(360);
      expect(derived.period).toBeCloseTo(1440 / 15.5, 1);
      expect(derived.velocity).toBeGreaterThan(7);
    });

    it('derives a GEO altitude from one rev/day', () => {
      const derived = calculateDerivedParams(1.0027, 0);

      expect(derived.apogee).toBeGreaterThan(35_000);
      expect(derived.apogee).toBeLessThan(36_500);
    });
  });
});
