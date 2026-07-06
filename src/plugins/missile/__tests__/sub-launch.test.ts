import { OCEAN_PATROL_REGIONS, SUBMARINE_FLEETS, SubLaunchEntry, SubLaunchPlan, isSubmarineLaunch, planSubmarineLaunches, randomOceanLaunchPoint, subClassOf } from '@app/plugins/missile/sub-launch';

/** True when a point falls inside any curated open-ocean region. */
const inSomeRegion = (lat: number, lon: number): boolean =>
  OCEAN_PATROL_REGIONS.some((r) => lat >= r.latMin && lat <= r.latMax && lon >= r.lonMin && lon <= r.lonMax);

const EARTH_RADIUS_KM = 6371;
const DEG2RAD = Math.PI / 180;
const greatCircleKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLon = (lon2 - lon1) * DEG2RAD;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
};

describe('sub-launch', () => {
  describe('isSubmarineLaunch', () => {
    it('matches submarine launcher descriptions', () => {
      expect(isSubmarineLaunch('Ohio Sub (Trident II) -> Moscow')).toBe(true);
      expect(isSubmarineLaunch('Borei Sub (Bulava) -> Washington DC')).toBe(true);
      expect(isSubmarineLaunch('Type 092 Sub (JL-2) -> Seattle')).toBe(true);
      expect(isSubmarineLaunch('Sinpo Sub (KN-11) -> Honolulu')).toBe(true);
    });

    it('does not match silo / mobile launchers or empty input', () => {
      expect(isSubmarineLaunch('Aleysk (SS-18) -> Boston')).toBe(false);
      expect(isSubmarineLaunch('Minot (Minuteman III) -> Kozelsk')).toBe(false);
      expect(isSubmarineLaunch('')).toBe(false);
      expect(isSubmarineLaunch(undefined)).toBe(false);
    });
  });

  describe('randomOceanLaunchPoint', () => {
    // Deterministic rng so the test is stable: always returns the region center.
    const halfRng = () => 0.5;

    it('returns a point inside a curated open-ocean region', () => {
      // Sample many (lat, lon) targets; every relocation must land at sea.
      for (let lat = -60; lat <= 70; lat += 20) {
        for (let lon = -170; lon <= 170; lon += 40) {
          const p = randomOceanLaunchPoint(lat, lon, halfRng);

          expect(inSomeRegion(p.lat, p.lon)).toBe(true);
        }
      }
    });

    it('keeps the launch within a plausible SLBM range of the target when possible', () => {
      // Moscow: several ocean regions are within range, so the pick must be one of them.
      const p = randomOceanLaunchPoint(55.75, 37.62, halfRng);

      expect(greatCircleKm(p.lat, p.lon, 55.75, 37.62)).toBeLessThanOrEqual(11_000);
    });

    it('varies the point with the rng (randomized, not fixed)', () => {
      // Two different rng streams should be able to yield different launch points.
      const a = randomOceanLaunchPoint(38.9, -77.0, () => 0.1);
      const b = randomOceanLaunchPoint(38.9, -77.0, () => 0.9);

      expect(a.lat !== b.lat || a.lon !== b.lon).toBe(true);
      expect(inSomeRegion(a.lat, a.lon)).toBe(true);
      expect(inSomeRegion(b.lat, b.lon)).toBe(true);
    });
  });

  describe('subClassOf', () => {
    it('extracts the boat class from the launcher description', () => {
      expect(subClassOf('Ohio Sub (Trident II) -> Moscow')).toBe('Ohio Sub');
      expect(subClassOf('Delta IV Sub (Sineva) -> Boston')).toBe('Delta IV Sub');
      expect(subClassOf('Type 092 Sub (JL-2) -> Seattle')).toBe('Type 092 Sub');
    });
  });

  describe('planSubmarineLaunches', () => {
    const halfRng = () => 0.5;
    const launchKey = (p: SubLaunchPlan) => `${p.launchLat},${p.launchLon}`;
    const targetKey = (p: SubLaunchPlan) => `${p.targetLat},${p.targetLon}`;

    // Ocean regions that count as "the Pacific" for the China constraint.
    const PACIFIC = new Set(['Philippine Sea', 'Western North Pacific', 'Central North Pacific', 'Northeast Pacific', 'East Pacific']);
    const inPacific = (lat: number, lon: number): boolean =>
      OCEAN_PATROL_REGIONS.some((r) => PACIFIC.has(r.name) && lat >= r.latMin && lat <= r.latMax && lon >= r.lonMin && lon <= r.lonMax);

    /** Build N Ohio-sub entries aimed at a spread of (roughly) Russian targets. */
    const ohioEntries = (n: number): SubLaunchEntry[] =>
      Array.from({ length: n }, (_unused, i) => ({
        index: i,
        desc: 'Ohio Sub (Trident II) -> Target',
        country: 'United States',
        targetLat: 55 + (i % 5),
        targetLon: 37 + (i % 7) * 3,
      }));

    it('never uses more distinct launch points than the class fleet size', () => {
      // 400 Ohio missiles must still fit on at most 14 hulls (14 distinct points).
      const launches = planSubmarineLaunches(ohioEntries(400), new Map(), halfRng);
      const points = new Set(Array.from(launches.values()).map(launchKey));

      expect(points.size).toBeLessThanOrEqual(SUBMARINE_FLEETS['Ohio Sub'].fleetSize);
      expect(launches.size).toBe(400); // every entry got a plan
    });

    it('clusters a modest salvo onto few hulls (ceil(count / capacity))', () => {
      // 30 Ohio missiles, 20 tubes/boat -> 2 boats, so at most 2 distinct launch points.
      const launches = planSubmarineLaunches(ohioEntries(30), new Map(), halfRng);
      const points = new Set(Array.from(launches.values()).map(launchKey));

      expect(points.size).toBeLessThanOrEqual(2);
    });

    it('assigns a launch point to every submarine entry, at sea', () => {
      const launches = planSubmarineLaunches(ohioEntries(30), new Map(), halfRng);

      for (const p of launches.values()) {
        expect(inSomeRegion(p.launchLat, p.launchLon)).toBe(true);
      }
    });

    it('spreads a boat\'s missiles across distinct targets (does not pile onto one city)', () => {
      // One boat (10 <= 20 tubes) firing at 8 distinct US targets must hit several of them.
      const usTargets = [
        { lat: 21.4, lon: -157.9 }, { lat: 61.2, lon: -149.9 }, { lat: 47.6, lon: -122.3 },
        { lat: 45.5, lon: -122.7 }, { lat: 37.8, lon: -122.3 }, { lat: 32.7, lon: -117.1 },
        { lat: 38.8, lon: -104.9 }, { lat: 41.2, lon: -104.8 },
      ];
      const entries: SubLaunchEntry[] = Array.from({ length: 10 }, (_unused, i) => ({
        index: i, desc: 'Type 092 Sub (JL-2) -> Honolulu', country: 'China', targetLat: 21.4, targetLon: -157.9,
      }));
      const launches = planSubmarineLaunches(entries, new Map([['China', usTargets]]), halfRng);
      const distinctTargets = new Set(Array.from(launches.values()).map(targetKey));

      expect(distinctTargets.size).toBeGreaterThan(1);
    });

    it('keeps Chinese submarines in the Pacific', () => {
      const usTargets = [
        { lat: 21.4, lon: -157.9 }, { lat: 47.6, lon: -122.3 }, { lat: 34.0, lon: -118.2 }, { lat: 61.2, lon: -149.9 },
      ];
      const entries: SubLaunchEntry[] = Array.from({ length: 6 }, (_unused, i) => ({
        index: i, desc: 'Type 092 Sub (JL-2) -> Honolulu', country: 'China', targetLat: 21.4, targetLon: -157.9,
      }));
      const launches = planSubmarineLaunches(entries, new Map([['China', usTargets]]), halfRng);

      for (const p of launches.values()) {
        expect(inPacific(p.launchLat, p.launchLon)).toBe(true);
      }
    });

    it('caps each boat class independently at its own fleet size', () => {
      // A raid mixing many Ohio and Borei missiles caps each class at its fleet (14 / 7).
      const mixed: SubLaunchEntry[] = [
        ...ohioEntries(400),
        ...Array.from({ length: 400 }, (_unused, i) => ({
          index: 1000 + i, desc: 'Borei Sub (Bulava) -> Washington DC', country: 'Russia', targetLat: 38.9, targetLon: -77,
        })),
      ];
      const launches = planSubmarineLaunches(mixed, new Map(), halfRng);
      const ohioPts = new Set(mixed.filter((e) => e.desc.startsWith('Ohio')).map((e) => launchKey(launches.get(e.index)!)));
      const boreiPts = new Set(mixed.filter((e) => e.desc.startsWith('Borei')).map((e) => launchKey(launches.get(e.index)!)));

      expect(ohioPts.size).toBeLessThanOrEqual(SUBMARINE_FLEETS['Ohio Sub'].fleetSize);
      expect(boreiPts.size).toBeLessThanOrEqual(SUBMARINE_FLEETS['Borei Sub'].fleetSize);
    });
  });
});
