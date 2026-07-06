import { expandTrajectoryToMirv, findSeparationIndex, generateFootprint, MAX_WARHEADS_PER_MISSILE, retargetDescent, warheadCountForDesc } from '@app/plugins/missile/missile-mirv';

describe('missile-mirv geometry', () => {
  describe('generateFootprint', () => {
    it('returns just the center for a single warhead', () => {
      const pts = generateFootprint(40, -100, 1, 75);

      expect(pts).toEqual([{ lat: 40, lon: -100 }]);
    });

    it('places the first vehicle exactly on target and the rest on a ring', () => {
      const pts = generateFootprint(40, -100, 5, 75);

      expect(pts).toHaveLength(5);
      expect(pts[0]).toEqual({ lat: 40, lon: -100 });

      // Every ring vehicle is roughly spreadKm (=75) from the center.
      const kmPerDeg = 111.32;

      for (let i = 1; i < pts.length; i++) {
        const dNorthKm = (pts[i].lat - 40) * kmPerDeg;
        const dEastKm = (pts[i].lon - -100) * kmPerDeg * Math.cos((40 * Math.PI) / 180);
        const r = Math.sqrt(dNorthKm ** 2 + dEastKm ** 2);

        expect(r).toBeCloseTo(75, 0);
      }
    });
  });

  describe('findSeparationIndex', () => {
    it('returns the index of peak altitude', () => {
      expect(findSeparationIndex([0, 10, 50, 120, 90, 30, 0])).toBe(3);
    });
  });

  describe('retargetDescent', () => {
    const busLat = [0, 1, 2, 3, 4, 5, 6];
    const busLon = [0, 0, 0, 0, 0, 0, 0];
    const busAlt = [0, 50, 100, 120, 90, 40, 0]; // apogee at index 3

    it('leaves pre-separation samples untouched and lands at target+offset', () => {
      const sepIdx = findSeparationIndex(busAlt); // 3

      const rv = retargetDescent(busLat, busLon, busAlt, sepIdx, 2, -1);

      // Up to and including separation, identical to the bus.
      for (let t = 0; t <= sepIdx; t++) {
        expect(rv.latList[t]).toBe(busLat[t]);
        expect(rv.lonList[t]).toBe(busLon[t]);
      }

      // Impact (last sample) is shifted by the full offset.
      const last = busAlt.length - 1;

      expect(rv.latList[last]).toBeCloseTo(busLat[last] + 2, 6);
      expect(rv.lonList[last]).toBeCloseTo(busLon[last] - 1, 6);

      // Altitude is never changed - the whole footprint shares the bus profile.
      expect(rv.altList).toEqual(busAlt);
    });

    it('is a no-op when the offset is zero (the primary reentry vehicle)', () => {
      const rv = retargetDescent(busLat, busLon, busAlt, 3, 0, 0);

      expect(rv.latList).toEqual(busLat);
      expect(rv.lonList).toEqual(busLon);
    });

    it('does not mutate the input arrays', () => {
      const lat = [0, 1, 2, 3];
      const lon = [0, 0, 0, 0];
      const alt = [0, 10, 20, 5];

      retargetDescent(lat, lon, alt, 1, 5, 5);

      expect(lat).toEqual([0, 1, 2, 3]);
      expect(lon).toEqual([0, 0, 0, 0]);
    });
  });

  describe('warheadCountForDesc', () => {
    it('returns the MIRV load for a known designator in the desc', () => {
      expect(warheadCountForDesc('Aleysk (SS-18) -> Boston')).toBe(10);
      expect(warheadCountForDesc('Ohio Sub (Trident II) -> Moscow')).toBe(8);
      expect(warheadCountForDesc('Daqing City (DF-41) -> Seattle')).toBe(6);
    });

    it('returns 1 for single-warhead or unknown designators', () => {
      expect(warheadCountForDesc('Irkutsk (SS-25) -> Chicago')).toBe(1); // single warhead
      expect(warheadCountForDesc('Somewhere (MADE-UP) -> Nowhere')).toBe(1); // unknown
      expect(warheadCountForDesc('No parentheses here')).toBe(1);
      expect(warheadCountForDesc(undefined)).toBe(1);
    });

    it('never exceeds the per-missile ceiling', () => {
      expect(warheadCountForDesc('X (SS-18) -> Y')).toBeLessThanOrEqual(MAX_WARHEADS_PER_MISSILE);
    });
  });

  describe('expandTrajectoryToMirv', () => {
    // Bus arc: climbs to apogee at index 2, then descends to impact at (10, 20).
    const busLat = [0, 5, 8, 9, 10];
    const busLon = [0, 5, 12, 16, 20];
    const busAlt = [0, 100, 200, 100, 0];

    it('returns a single copy of the bus for count <= 1', () => {
      const tracks = expandTrajectoryToMirv(busLat, busLon, busAlt, 1, 75);

      expect(tracks).toHaveLength(1);
      expect(tracks[0].latList).toEqual(busLat);
      expect(tracks[0].latList).not.toBe(busLat); // a copy, not the same reference
    });

    it('produces one track per warhead, all sharing the bus track up to apogee', () => {
      const count = 4;
      const sepIdx = findSeparationIndex(busAlt); // 2

      const tracks = expandTrajectoryToMirv(busLat, busLon, busAlt, count, 75);

      expect(tracks).toHaveLength(count);
      for (const track of tracks) {
        // Identical to the bus up to and including separation.
        expect(track.latList.slice(0, sepIdx + 1)).toEqual(busLat.slice(0, sepIdx + 1));
        expect(track.lonList.slice(0, sepIdx + 1)).toEqual(busLon.slice(0, sepIdx + 1));
        // Altitude is shared for the whole flight.
        expect(track.altList).toEqual(busAlt);
      }
    });

    it('keeps the primary (index 0) on the bus impact and spreads the rest', () => {
      const tracks = expandTrajectoryToMirv(busLat, busLon, busAlt, 4, 75);
      const last = busAlt.length - 1;

      // RV 0 hits the original target; the others diverge to their own aimpoints.
      expect(tracks[0].latList[last]).toBeCloseTo(busLat[last], 6);
      expect(tracks[0].lonList[last]).toBeCloseTo(busLon[last], 6);
      expect(tracks[1].latList[last] !== busLat[last] || tracks[1].lonList[last] !== busLon[last]).toBe(true);
    });
  });
});
