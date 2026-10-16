import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { buildDownloadPayload } from '@app/plugins/reports/report-formatter';
import {
  buildReportHeader,
  formatReportTime,
  generateAerReport,
  generateCoesReport,
  generateEciReport,
  generateLlaReport,
  generateSunEclipseReport,
  generateVisibilityWindowsReport,
  ReportCoreDeps,
  ReportOptions,
  ReportPass,
} from '@app/plugins/reports/reports-core';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';

const generatedAt = new Date('2022-01-01T00:00:00Z');
const startTime = new Date('2022-01-01T00:00:00Z');

const opts: ReportOptions = { startTime, windowSec: 6 * 60 * 60, stepSec: 60 };

const fakeSensor = {
  name: 'FAKE',
  getTypeString: () => 'Optical',
  lat: 10,
  lon: 20,
  alt: 0,
  minAz: 0,
  maxAz: 360,
  minEl: 0,
  maxEl: 90,
  minRng: 0,
  maxRng: 100000,
  rae: () => ({ az: 123.456, el: 45.678, rng: 678.9 }),
} as unknown as DetailedSensor;

const onePass: ReportPass = {
  aos: new Date(startTime.getTime() + 60_000),
  los: new Date(startTime.getTime() + 240_000),
  maxEl: 42.5,
  maxElTime: new Date(startTime.getTime() + 150_000),
};

const deps: ReportCoreDeps = {
  findPasses: () => [onePass],
  sunStatusAt: () => ({ illumination: 'sun', sunAngleDeg: 88.8 }),
};

describe('reports-core', () => {
  describe('formatReportTime', () => {
    it('renders YYYY-MM-DD HH:MM:SS in UTC', () => {
      expect(formatReportTime(new Date('2022-03-04T05:06:07.890Z'))).toBe('2022-03-04 05:06:07');
    });
  });

  describe('buildReportHeader', () => {
    it('includes satellite metadata and the injected timestamp, no sensor block without a sensor', () => {
      const header = buildReportHeader('My Report', defaultSat, null, generatedAt);

      expect(header).toContain('My Report');
      expect(header).toContain(`NORAD ID: ${defaultSat.sccNum}`);
      expect(header).toContain(generatedAt.toISOString());
      expect(header).not.toContain('Sensor:');
    });

    it('appends the sensor block when a sensor is given', () => {
      const header = buildReportHeader('My Report', defaultSat, fakeSensor, generatedAt);

      expect(header).toContain('Sensor: FAKE');
      expect(header).toContain('Type: Optical');
      expect(header).toContain('Max Range: 100000');
    });
  });

  describe('time-series generators', () => {
    it('LLA produces a row per step with lat/lon/alt columns', () => {
      const data = generateLlaReport(defaultSat, opts, generatedAt);

      expect(data.filename).toBe(`lla-${defaultSat.sccNum}`);
      expect(data.table!.headers).toEqual(['Time (UTC)', 'Latitude(°)', 'Longitude(°)', 'Altitude(km)']);
      expect(data.table!.rows.length).toBeGreaterThan(0);
      expect(data.table!.rows[0]).toHaveLength(4);
    });

    it('ECI produces seven columns of position and velocity', () => {
      const data = generateEciReport(defaultSat, opts, generatedAt);

      expect(data.table!.headers).toHaveLength(7);
      expect(data.table!.rows[0]).toHaveLength(7);
      expect(data.header).toContain('TEME');
    });

    it('COES emits the element set, both epochs and the classical elements as Element/Value rows', () => {
      const data = generateCoesReport(defaultSat, generatedAt);

      expect(data.table!.headers).toEqual(['Element', 'Value']);
      expect(data.table!.rows).toHaveLength(13);
      expect(data.table!.rows.map((r) => r[0])).toContain('Inclination');
    });

    describe('COES for LANDSAT 8 (39084)', () => {
      const landsat8 = new Satellite({
        name: 'LANDSAT 8',
        tle1: '1 39084U 13008A   22221.78099992  .00000176  00000-0  49109-4 0  9999' as TleLine1,
        tle2: '2 39084  98.2198 291.4222 0001287  95.0667 265.0678 14.57105218504766' as TleLine2,
      });
      const stateEpoch = new Date('2022-08-10T00:00:00Z');
      const data = generateCoesReport(landsat8, stateEpoch);
      const value = (element: string): string => data.table!.rows.find((r) => r[0] === element)![1];

      it('prints inclination in degrees, not radians', () => {
        expect(value('Inclination')).toMatch(/°$/u);
        expect(parseFloat(value('Inclination'))).toBeCloseTo(98.2, 0);
      });

      it('prints mean motion in rev/day', () => {
        expect(value('Mean Motion')).toMatch(/rev\/day$/u);
        expect(Math.abs(parseFloat(value('Mean Motion')) - 14.57)).toBeLessThan(0.1);
      });

      it('keeps the near-circular eccentricity visible', () => {
        expect(parseFloat(value('Eccentricity'))).toBeGreaterThan(0);
        expect(parseFloat(value('Eccentricity'))).toBeLessThan(0.01);
      });

      it('lists the TLE epoch and the osculating state epoch as separate rows', () => {
        expect(value('TLE Epoch (UTC)')).toBe('2022-08-09 18:44:38');
        expect(value('State Epoch (osculating, UTC)')).toBe('2022-08-10 00:00:00');
        expect(value('Element Set')).toContain('Osculating');
        expect(data.header).toContain('osculating');
      });

      it('serializes to parseable JSON with the epoch rows', () => {
        const payload = buildDownloadPayload(data, 'json');
        const records = JSON.parse(payload.content) as { Element: string; Value: string }[];

        expect(payload.ext).toBe('json');
        expect(records.map((r) => r.Element)).toEqual(expect.arrayContaining(['TLE Epoch (UTC)', 'State Epoch (osculating, UTC)', 'Inclination', 'Mean Motion']));
      });
    });

    it('Sun/Eclipse maps the injected illumination to display labels', () => {
      const data = generateSunEclipseReport(defaultSat, opts, deps, generatedAt);

      expect(data.table!.headers).toContain('Eclipse Type');
      // illumination 'sun' -> "Yes" illuminated, "None" eclipse
      expect(data.table!.rows[0][1]).toBe('Yes');
      expect(data.table!.rows[0][2]).toBe('None');
    });
  });

  describe('pass-based generators', () => {
    it('AER samples the look angle inside each injected pass window', () => {
      const data = generateAerReport(defaultSat, fakeSensor, opts, deps, generatedAt);

      expect(data.table!.headers).toEqual(['Time (UTC)', 'Pass', 'Azimuth(°)', 'Elevation(°)', 'Range(km)']);
      // 180s window at 60s step inclusive -> 4 samples, all pass index 1.
      expect(data.table!.rows.length).toBe(4);
      expect(data.table!.rows.every((r) => r[1] === '1')).toBe(true);
      expect(data.table!.rows[0][2]).toBe('123.456');
    });

    it('AER reports an empty message when there are no passes', () => {
      const data = generateAerReport(defaultSat, fakeSensor, opts, { ...deps, findPasses: () => [] }, generatedAt);

      expect(data.table!.rows).toHaveLength(0);
      expect(data.emptyMessage).toBeTruthy();
    });

    it('Visibility Windows emits one row per pass with rise/set/duration', () => {
      const data = generateVisibilityWindowsReport(defaultSat, fakeSensor, opts, deps, generatedAt);

      expect(data.table!.headers[0]).toBe('Pass #');
      expect(data.table!.rows).toHaveLength(1);
      // duration = (240s - 60s) / 60 = 3.00 min
      expect(data.table!.rows[0][3]).toBe('3.00');
      expect(data.table!.rows[0][4]).toBe('42.5');
    });
  });

  describe('targets without satellite identity (OEM objects, missiles)', () => {
    // Structurally a ReportableObject: position sampling but no NORAD identity.
    const interceptorTarget = {
      name: 'Interceptor → COSMOS 2251',
      lla: () => ({ lat: 10.123, lon: 20.456, alt: 300.789 }),
      eci: () => ({ position: { x: 7000, y: 0, z: 0 }, velocity: { x: 0, y: 7.5, z: 0 } }),
    };

    it('LLA falls back to a name slug for the filename and None for missing ids', () => {
      const data = generateLlaReport(interceptorTarget as never, opts, generatedAt);

      expect(data.filename).toBe('lla-Interceptor_COSMOS_2251');
      expect(data.header).toContain('NORAD ID: None');
      expect(data.header).toContain('International Designator: None');
      expect(data.table!.rows.length).toBeGreaterThan(0);
    });

    it('ECI samples position and velocity from the target', () => {
      const data = generateEciReport(interceptorTarget as never, opts, generatedAt);

      expect(data.filename).toBe('eci-Interceptor_COSMOS_2251');
      expect(data.table!.rows[0][1]).toBe('7000.000');
      expect(data.table!.rows[0][5]).toBe('7.500');
    });

    it('skips samples where the target has no position (outside its window)', () => {
      const gappy = { ...interceptorTarget, lla: () => null };
      const data = generateLlaReport(gappy as never, opts, generatedAt);

      expect(data.table!.rows).toHaveLength(0);
    });
  });
});
