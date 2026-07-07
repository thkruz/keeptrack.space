import { OCEAN_PATROL_REGIONS, SUBMARINE_FLEETS, SubLaunchEntry, isSubmarineLaunch, planSubmarineBoats, randomOceanLaunchPoint, subClassOf } from '@app/plugins/missile/sub-launch';

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

  describe('planSubmarineBoats', () => {
    const halfRng = () => 0.5;
    const launchKey = (p: { launchLat: number; launchLon: number }) => `${p.launchLat},${p.launchLon}`;

    /** True when a point lies inside any Pacific-basin patrol box. */
    const inPacific = (lat: number, lon: number): boolean =>
      OCEAN_PATROL_REGIONS.some((r) => r.ocean === 'pacific' && lat >= r.latMin && lat <= r.latMax && lon >= r.lonMin && lon <= r.lonMax);

    /** Build N Ohio-sub entries aimed at a spread of (roughly) Russian targets. */
    const ohioEntries = (n: number): SubLaunchEntry[] =>
      Array.from({ length: n }, (_unused, i) => ({
        index: i,
        desc: 'Ohio Sub (Trident II) -> Target',
        targetLat: 55 + (i % 5),
        targetLon: 37 + (i % 7) * 3,
      }));

    it('never uses more distinct launch points than the class fleet size', () => {
      // 400 Ohio missiles must still fit on at most 14 hulls (14 distinct points).
      const launches = planSubmarineBoats(ohioEntries(400), halfRng);
      const points = new Set(Array.from(launches.values()).map(launchKey));

      expect(points.size).toBeLessThanOrEqual(SUBMARINE_FLEETS['Ohio Sub'].fleetSize);
      expect(launches.size).toBe(400); // every entry got a plan
    });

    it('deploys the whole fleet for a large salvo (spreads across many hulls, not one)', () => {
      // A big raid should surface many distinct, well-separated boats - not a single blob.
      const points = new Set(Array.from(planSubmarineBoats(ohioEntries(400), Math.random).values()).map(launchKey));

      expect(points.size).toBeGreaterThan(4);
    });

    it('assigns a launch point to every submarine entry, at sea', () => {
      const launches = planSubmarineBoats(ohioEntries(30), halfRng);

      for (const p of launches.values()) {
        expect(inSomeRegion(p.launchLat, p.launchLon)).toBe(true);
      }
    });

    it('keeps Chinese submarines in the Pacific', () => {
      const entries: SubLaunchEntry[] = Array.from({ length: 9 }, (_unused, i) => ({
        index: i, desc: 'Type 092 Sub (JL-2) -> Honolulu', targetLat: 21.4, targetLon: -157.9,
      }));
      const launches = planSubmarineBoats(entries, halfRng);

      for (const p of launches.values()) {
        expect(inPacific(p.launchLat, p.launchLon)).toBe(true);
      }
    });

    it('caps each boat class independently at its own fleet size', () => {
      // A raid mixing many Ohio and Borei missiles caps each class at its own fleet.
      const mixed: SubLaunchEntry[] = [
        ...ohioEntries(400),
        ...Array.from({ length: 400 }, (_unused, i) => ({
          index: 1000 + i, desc: 'Borei Sub (Bulava) -> Washington DC', targetLat: 38.9, targetLon: -77,
        })),
      ];
      const launches = planSubmarineBoats(mixed, halfRng);
      const ohioPts = new Set(mixed.filter((e) => e.desc.startsWith('Ohio')).map((e) => launchKey(launches.get(e.index)!)));
      const boreiPts = new Set(mixed.filter((e) => e.desc.startsWith('Borei')).map((e) => launchKey(launches.get(e.index)!)));

      expect(ohioPts.size).toBeLessThanOrEqual(SUBMARINE_FLEETS['Ohio Sub'].fleetSize);
      expect(boreiPts.size).toBeLessThanOrEqual(SUBMARINE_FLEETS['Borei Sub'].fleetSize);
    });
  });
});
