import { buildStfSensorParams, clampExtent, computeExtentKm, STF_MAX_EXTENT_DEG, validateStfForm, wrapAz } from '@app/plugins/short-term-fences/short-term-fences-core';
import { Degrees, EpochUTC, Geodetic, Kilometers } from '@ootk/src/main';

const SITE_LAT = 41.75 as Degrees;
const SITE_LON = -70.54 as Degrees;
const SITE_ALT = 0.06 as Kilometers;

const makeSiteJ2000 = () => {
  const epoch = EpochUTC.fromDateTime(new Date('2024-01-01T00:00:00Z'));

  return Geodetic.fromDegrees(SITE_LAT, SITE_LON, SITE_ALT).toITRF(epoch).toJ2000();
};

describe('short-term-fences-core', () => {
  describe('wrapAz', () => {
    it('leaves in-range azimuths untouched', () => {
      expect(wrapAz(50)).toBe(50);
      expect(wrapAz(0)).toBe(0);
    });

    it('wraps negative azimuths into [0, 360)', () => {
      expect(wrapAz(-10)).toBe(350);
    });

    it('wraps azimuths at or above 360 back into range', () => {
      expect(wrapAz(370)).toBe(10);
      expect(wrapAz(360)).toBe(0);
    });
  });

  describe('clampExtent', () => {
    it('passes through in-range extents', () => {
      expect(clampExtent(4)).toBe(4);
    });

    it('clamps to the max extent', () => {
      expect(clampExtent(120)).toBe(STF_MAX_EXTENT_DEG);
    });

    it('floors negatives at zero', () => {
      expect(clampExtent(-5)).toBe(0);
    });
  });

  describe('validateStfForm', () => {
    const valid = { az: '50', azExt: '4', el: '20', elExt: '4', rng: '1000', rngExt: '100' };

    it('accepts and parses valid input', () => {
      const result = validateStfForm(valid);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.values).toEqual({ az: 50, azExt: 4, el: 20, elExt: 4, rng: 1000, rngExt: 100 });
      }
    });

    it('rejects non-numeric fields', () => {
      const result = validateStfForm({ ...valid, az: '' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errorKey).toBe('errorMsgs.invalidInput');
      }
    });

    it('rejects a non-positive range', () => {
      const result = validateStfForm({ ...valid, rng: '0' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errorKey).toBe('errorMsgs.invalidRange');
      }
    });

    it('clamps an over-wide extent even without a blur', () => {
      const result = validateStfForm({ ...valid, azExt: '120', elExt: '200' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.values.azExt).toBe(STF_MAX_EXTENT_DEG);
        expect(result.values.elExt).toBe(STF_MAX_EXTENT_DEG);
      }
    });
  });

  describe('buildStfSensorParams', () => {
    const site = { lat: SITE_LAT, lon: SITE_LON, alt: SITE_ALT };

    it('names the fence by index', () => {
      const params = buildStfSensorParams({ az: 50, azExt: 4, el: 20, elExt: 4, rng: 1000, rngExt: 100 }, site, 3);

      expect(params.uiName).toBe('STF-3');
      expect(params.objName).toBe('STF-3');
    });

    it('floors elevation and range minima at zero', () => {
      const params = buildStfSensorParams({ az: 50, azExt: 4, el: 2, elExt: 10, rng: 40, rngExt: 100 }, site, 1);

      expect(params.minEl).toBe(0);
      expect(params.minRng).toBe(0);
    });

    it('wraps azimuth across the north crossing', () => {
      const params = buildStfSensorParams({ az: 1, azExt: 4, el: 20, elExt: 4, rng: 1000, rngExt: 100 }, site, 1);

      expect(params.minAz).toBe(359);
      expect(params.maxAz).toBe(3);
    });

    it('selects GEO zoom for a far fence', () => {
      const leo = buildStfSensorParams({ az: 50, azExt: 4, el: 20, elExt: 4, rng: 1000, rngExt: 100 }, site, 1);
      const geo = buildStfSensorParams({ az: 50, azExt: 4, el: 20, elExt: 4, rng: 40000, rngExt: 100 }, site, 1);

      expect(leo.zoom).not.toBe(geo.zoom);
    });
  });

  describe('computeExtentKm', () => {
    const epoch = EpochUTC.fromDateTime(new Date('2024-01-01T00:00:00Z'));

    it('returns a positive width for a non-zero azimuth extent', () => {
      const km = computeExtentKm(epoch, makeSiteJ2000(), 50, 20, 1000, 4, 'az');

      expect(km).toBeGreaterThan(0);
    });

    it('grows with a wider extent', () => {
      const site = makeSiteJ2000();
      const narrow = computeExtentKm(epoch, site, 50, 20, 1000, 4, 'az');
      const wide = computeExtentKm(epoch, site, 50, 20, 1000, 8, 'az');

      expect(wide).toBeGreaterThan(narrow);
    });

    it('grows with a longer range', () => {
      const site = makeSiteJ2000();
      const near = computeExtentKm(epoch, site, 50, 20, 1000, 4, 'el');
      const far = computeExtentKm(epoch, site, 50, 20, 2000, 4, 'el');

      expect(far).toBeGreaterThan(near);
    });

    it('returns zero for a zero extent', () => {
      const km = computeExtentKm(epoch, makeSiteJ2000(), 50, 20, 1000, 0, 'az');

      expect(km).toBeCloseTo(0, 6);
    });
  });
});
