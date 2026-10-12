import { sensorGroups } from '@app/app/data/catalogs/sensor-groups';
import { sensors } from '@app/app/data/catalogs/sensors';
import { GROUND_STATION_GROUP_LIST, GROUND_STATION_MERGES, GROUND_STATIONS, groundStationSensors } from '@app/app/data/catalogs/sensors/ground-stations';

const rows = Object.entries(GROUND_STATIONS);

describe('GROUND_STATIONS catalog data', () => {
  it('has the 43 SODA rows', () => {
    expect(rows).toHaveLength(43);
  });

  it('keys each row by its objName and has no duplicate objName', () => {
    const names = rows.map(([, p]) => p.objName);

    expect(new Set(names).size).toBe(43);
    for (const [key, p] of rows) {
      expect(p.objName).toBe(key);
    }
  });

  it('keeps latitude in [-90, 90] and longitude in [-180, 180]', () => {
    for (const [key, p] of rows) {
      expect(p.lat, key).toBeGreaterThanOrEqual(-90);
      expect(p.lat, key).toBeLessThanOrEqual(90);
      expect(p.lon, key).toBeGreaterThanOrEqual(-180);
      expect(p.lon, key).toBeLessThanOrEqual(180);
    }
  });

  it('uses only the 5 deg (LEO) and 10 deg (deep-space) minimum elevations', () => {
    for (const [key, p] of rows) {
      expect([5, 10], key).toContain(p.minEl);
    }
  });

  it('cites every row with an https source and an ISO retrieval date', () => {
    for (const [key, p] of rows) {
      expect(p.sourceUrl?.startsWith('https://'), key).toBe(true);
      expect(p.sourceRetrieved, key).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    }
  });

  it('spot-checks three rows against Wikidata P625 (retrieved 2026-10-12)', () => {
    // Q618630 Goldstone: 35.426666666667, -116.89; alt 899 m -> 0.899 km
    expect(GROUND_STATIONS['DSN-GOLDSTONE'].lat).toBeCloseTo(35.42667, 5);
    expect(GROUND_STATIONS['DSN-GOLDSTONE'].lon).toBeCloseTo(-116.89, 5);
    expect(GROUND_STATIONS['DSN-GOLDSTONE'].alt).toBeCloseTo(0.899, 9);
    expect(GROUND_STATIONS['DSN-GOLDSTONE'].sourceRetrieved).toBe('2026-09-25');
    // Q1796135 Svalbard Satellite Station: 78.2298, 15.4078
    expect(GROUND_STATIONS['KSAT-SVALBARD'].lat).toBe(78.2298);
    expect(GROUND_STATIONS['KSAT-SVALBARD'].lon).toBe(15.4078);
    // Q6741341 Malargue Station: -35.776, -69.3982
    expect(GROUND_STATIONS['ESTRACK-MALARGUE'].lat).toBe(-35.776);
    expect(GROUND_STATIONS['ESTRACK-MALARGUE'].lon).toBe(-69.3982);
  });
});

describe('Ground Stations in the sensor catalog', () => {
  it('merges the 10 DSN/ESTRACK rows into existing entries instead of duplicating them', () => {
    expect(Object.keys(GROUND_STATION_MERGES)).toHaveLength(10);
    expect(Object.keys(groundStationSensors)).toHaveLength(33);

    for (const [sodaKey, catalogKey] of Object.entries(GROUND_STATION_MERGES)) {
      expect(sensors[sodaKey], sodaKey).toBeUndefined();
      expect(sensors[catalogKey].sourceUrl, catalogKey).toBe(GROUND_STATIONS[sodaKey].sourceUrl);
      expect(sensors[catalogKey].sourceRetrieved, catalogKey).toBe(GROUND_STATIONS[sodaKey].sourceRetrieved);
    }
  });

  it('registers a ttc "groundStations" group whose 43 keys all resolve', () => {
    const group = sensorGroups.find((g) => g.name === 'groundStations');

    expect(group?.category).toBe('ttc');
    expect(group?.list).toBe(GROUND_STATION_GROUP_LIST);
    expect(group?.list).toHaveLength(43);
    for (const key of group!.list) {
      expect(sensors[key], key).toBeDefined();
    }
  });

  it('builds all-sky presets with a 0-50000 km range shell', () => {
    const svalsat = sensors['KSAT-SVALBARD'];

    expect([svalsat.minAz, svalsat.maxAz, svalsat.maxEl, svalsat.minRng, svalsat.maxRng]).toEqual([0, 360, 90, 0, 50000]);
    // 450 m -> 0.45 km
    expect(svalsat.alt).toBeCloseTo(0.45, 9);
    expect(svalsat.minEl).toBe(5);
  });
});
