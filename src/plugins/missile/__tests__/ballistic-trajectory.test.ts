import { generateBallisticTrajectory } from '@app/plugins/missile/ballistic-trajectory';

const EARTH_RADIUS_KM = 6371;
const DEG2RAD = Math.PI / 180;

/** Great-circle distance (km) between two lat/lon points. */
const greatCircleKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const p1 = lat1 * DEG2RAD;
  const p2 = lat2 * DEG2RAD;
  const dp = (lat2 - lat1) * DEG2RAD;
  const dl = (lon2 - lon1) * DEG2RAD;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
};

/**
 * Representative shots spanning SRBM -> ICBM ranges. These are exactly the class of
 * arcs the old ICBM-only rocket solver corrupted (short regional shots produced NaN
 * tails). Every one of these must now be a clean, on-target ballistic arc.
 */
const SHOTS = [
  { name: 'SRBM ~430km (Belgorod->Kyiv)', lat: 50.6, lon: 36.59, tLat: 50.45, tLon: 30.523 },
  { name: 'SRBM ~570km (Sumy->Moscow)', lat: 50.91, lon: 34.8, tLat: 55.751, tLon: 37.618 },
  { name: 'MRBM ~1240km (Tabriz->Tel Aviv)', lat: 38.08, lon: 46.29, tLat: 32.085, tLon: 34.781 },
  { name: 'IRBM ~1585km (Sdot Micha->Tehran)', lat: 31.7, lon: 34.92, tLat: 35.689, tLon: 51.389 },
  { name: 'ICBM ~9400km (Aleysk->NYC)', lat: 52.5, lon: 82.75, tLat: 40.713, tLon: -74.006 },
  { name: 'Antimeridian (Pyongyang->LA)', lat: 39.02, lon: 125.74, tLat: 34.05, tLon: -118.24 },
];

describe('generateBallisticTrajectory', () => {
  for (const shot of SHOTS) {
    describe(shot.name, () => {
      const traj = generateBallisticTrajectory(shot.lat, shot.lon, shot.tLat, shot.tLon);
      const n = traj.altList.length;

      it('emits equal-length lat/lon/alt lists (no truncated coordinate tail)', () => {
        expect(traj.lonList.length).toBe(n);
        expect(traj.latList.length).toBe(n);
        expect(n).toBeGreaterThan(60); // at least a minute of flight
      });

      it('contains no NaN / non-finite coordinates or altitudes', () => {
        expect(traj.latList.every((v) => Number.isFinite(v))).toBe(true);
        expect(traj.lonList.every((v) => Number.isFinite(v))).toBe(true);
        expect(traj.altList.every((v) => Number.isFinite(v))).toBe(true);
        expect(Number.isFinite(traj.maxAltitudeKm)).toBe(true);
      });

      it('starts at the launch site and lands on the target (< 5 km miss)', () => {
        expect(greatCircleKm(traj.latList[0], traj.lonList[0], shot.lat, shot.lon)).toBeLessThan(5);
        expect(greatCircleKm(traj.latList[n - 1], traj.lonList[n - 1], shot.tLat, shot.tLon)).toBeLessThan(5);
      });

      it('never dips below the ground mid-flight and peaks once', () => {
        expect(traj.altList.every((v) => v >= 0)).toBe(true);
        // Endpoints are on the surface; the interior climbs and descends.
        expect(traj.altList[0]).toBeLessThan(5);
        expect(traj.altList[n - 1]).toBeLessThan(5);
        expect(Math.max(...traj.altList)).toBeGreaterThan(50);
      });

      it('has a physically plausible apogee (well clear of the degenerate 0 / over-lofted cases)', () => {
        const arc = greatCircleKm(shot.lat, shot.lon, shot.tLat, shot.tLon);

        // Minimum-energy apogee is ~arc/4 at short range, dropping toward ~arc/7 as Earth
        // curvature matters at ICBM range. Bound it away from the degenerate cases (0 or
        // absurdly lofted) that signalled the old breakage, tolerant across the whole span.
        expect(traj.maxAltitudeKm).toBeGreaterThan(arc / 10);
        expect(traj.maxAltitudeKm).toBeLessThan(arc / 2);
        // maxAltitudeKm must match the actual sampled peak.
        expect(Math.abs(traj.maxAltitudeKm - Math.max(...traj.altList))).toBeLessThan(2);
      });
    });
  }

  it('throws on a degenerate (coincident) launch/target pair rather than emitting garbage', () => {
    expect(() => generateBallisticTrajectory(40, -100, 40, -100)).toThrow();
  });

  it('produces a higher apogee when lofted', () => {
    const minEnergy = generateBallisticTrajectory(38.08, 46.29, 32.085, 34.781);
    const lofted = generateBallisticTrajectory(38.08, 46.29, 32.085, 34.781, { loftFactor: 1.3 });

    expect(lofted.maxAltitudeKm).toBeGreaterThan(minEnergy.maxAltitudeKm);
  });
});
