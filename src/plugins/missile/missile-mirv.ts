/**
 * MIRV (Multiple Independently-targetable Reentry Vehicle) geometry helpers.
 *
 * These are pure, DOM-free, and catalog-free so they can be unit tested in
 * isolation. The orchestration that turns the output into catalog objects lives
 * in `missile-manager.ts` (`createMirvAttack`).
 *
 * The model is deliberately simple and notional: one shared "bus" trajectory is
 * flown to the primary aimpoint, and at the bus apogee the reentry vehicles
 * separate and fan out to a footprint of nearby aimpoints. Each RV reuses the
 * bus's altitude/timing profile but its ground track is bent toward its own
 * aimpoint by a laterally-growing offset, so the tracks coincide until apogee
 * and then diverge - which is what reads as a MIRV footprint on the globe.
 */

const DEG2RAD = Math.PI / 180;
/** Approximate length of one degree of latitude (km). Good enough for a notional footprint. */
const KM_PER_DEG = 111.32;

export interface LatLon {
  lat: number;
  lon: number;
}

export interface GroundTrack {
  latList: number[];
  lonList: number[];
  altList: number[];
}

/**
 * Distribute `count` aimpoints around a center within roughly `spreadKm`.
 *
 * Index 0 is always the exact center (so one RV strikes the selected target);
 * the remaining vehicles are spaced evenly on a ring of radius `spreadKm`. The
 * east/west spacing is widened by `1/cos(lat)` so the ring stays roughly circular
 * on the ground rather than collapsing near the poles.
 */
export const generateFootprint = (centerLat: number, centerLon: number, count: number, spreadKm: number): LatLon[] => {
  const center: LatLon = { lat: centerLat, lon: centerLon };

  if (count <= 1) {
    return [center];
  }

  const kmPerDegLon = KM_PER_DEG * Math.max(Math.cos(centerLat * DEG2RAD), 1e-6);
  const points: LatLon[] = [center];
  const ringCount = count - 1;

  for (let i = 0; i < ringCount; i++) {
    const theta = (2 * Math.PI * i) / ringCount;
    const dNorthKm = spreadKm * Math.sin(theta);
    const dEastKm = spreadKm * Math.cos(theta);

    points.push({
      lat: centerLat + dNorthKm / KM_PER_DEG,
      lon: centerLon + dEastKm / kmPerDegLon,
    });
  }

  return points;
};

/**
 * Index into the trajectory where the reentry vehicles separate from the bus -
 * the apogee (highest altitude sample). RVs share the bus track up to here and
 * diverge afterward.
 */
export const findSeparationIndex = (altList: number[]): number => {
  let maxIndex = 0;

  for (let i = 1; i < altList.length; i++) {
    if (altList[i] > altList[maxIndex]) {
      maxIndex = i;
    }
  }

  return maxIndex;
};

/**
 * Bend a copy of the bus ground track toward an RV's own aimpoint.
 *
 * Up to `sepIdx` the track is identical to the bus. After separation a lateral
 * offset that grows linearly from 0 (at separation) to `(dLat, dLon)` (at impact)
 * is added, so the descent lands at `busImpact + (dLat, dLon)` with no
 * discontinuity at the separation point. Altitude is left untouched (the whole
 * footprint shares the bus's apogee and reentry timing), which is a reasonable
 * approximation for a compact footprint.
 */
export const retargetDescent = (
  busLatList: number[],
  busLonList: number[],
  busAltList: number[],
  sepIdx: number,
  dLat: number,
  dLon: number,
): GroundTrack => {
  const latList = busLatList.slice();
  const lonList = busLonList.slice();
  const altList = busAltList.slice();
  const lastIdx = altList.length - 1;
  const span = lastIdx - sepIdx;

  if (span <= 0 || (dLat === 0 && dLon === 0)) {
    return { latList, lonList, altList };
  }

  for (let t = sepIdx + 1; t <= lastIdx; t++) {
    const frac = (t - sepIdx) / span;

    latList[t] = busLatList[t] + dLat * frac;
    lonList[t] = busLonList[t] + dLon * frac;
  }

  return { latList, lonList, altList };
};

/**
 * Notional reentry-vehicle load per missile designator, keyed by the code that
 * appears in the raid data's `desc` ("Aleysk (SS-18) -> ..."). Only MIRV-capable
 * types are listed; anything absent is a single warhead (see {@link warheadCountForDesc}).
 * Counts are the systems' generally-cited MIRV capacity, capped at 12 (the sim's
 * per-missile ceiling) so a mass raid reads as realistically MIRVed rather than a
 * field of single RVs.
 */
export const MISSILE_WARHEAD_COUNTS: Readonly<Record<string, number>> = {
  // Russia
  'SS-18': 10, // R-36M2 Voevoda ("Satan")
  'SS-19': 6, // UR-100N
  'SS-N-23A': 4, // R-29RMU Sineva family (SLBM)
  Sineva: 4,
  Layner: 4, // R-29RMU2.1
  Bulava: 6, // R-30 (SLBM)
  // China
  'DF-5A/B': 5, // DF-5B is MIRVed
  'DF-41': 6,
  // North Korea
  'KN-22': 3, // Hwasong-17 (claimed MIRV-capable)
  // USA
  'Trident II': 8, // UGM-133A (SLBM)
  'Minuteman III': 3, // LGM-30G design capacity
};

/** Upper bound on warheads per missile (matches the interactive MIRV launcher). */
export const MAX_WARHEADS_PER_MISSILE = 12;

/**
 * Reentry-vehicle count for a raid missile, parsed from the designator in its
 * `desc` (the text inside the first parentheses, e.g. "Aleysk (SS-18) -> Boston"
 * -> "SS-18"). Unknown or single-warhead systems return 1. Clamped to
 * [1, {@link MAX_WARHEADS_PER_MISSILE}].
 */
export const warheadCountForDesc = (desc: string | undefined): number => {
  if (!desc) {
    return 1;
  }

  const designator = (/\(([^)]+)\)/u).exec(desc)?.[1]?.trim();
  const count = designator ? MISSILE_WARHEAD_COUNTS[designator] ?? 1 : 1;

  return Math.max(1, Math.min(count, MAX_WARHEADS_PER_MISSILE));
};

/**
 * Fan an existing bus trajectory into `count` reentry-vehicle tracks. Every RV
 * shares the bus track up to apogee (the separation point) and then bends toward
 * its own aimpoint on a footprint around the bus's impact (the last sample), so the
 * tracks coincide on the way up and spread on the way down - a MIRV footprint. RV 0
 * keeps the bus's exact impact; `count <= 1` returns a single copy of the bus.
 */
export const expandTrajectoryToMirv = (
  busLatList: number[],
  busLonList: number[],
  busAltList: number[],
  count: number,
  spreadKm: number,
): GroundTrack[] => {
  if (count <= 1 || busAltList.length === 0) {
    return [{ latList: busLatList.slice(), lonList: busLonList.slice(), altList: busAltList.slice() }];
  }

  const lastIdx = busAltList.length - 1;
  const targetLat = busLatList[lastIdx];
  const targetLon = busLonList[lastIdx];
  const sepIdx = findSeparationIndex(busAltList);
  const footprint = generateFootprint(targetLat, targetLon, count, spreadKm);

  return footprint.map((aim) => retargetDescent(busLatList, busLonList, busAltList, sepIdx, aim.lat - targetLat, aim.lon - targetLon));
};
