/**
 * Submarine launch positioning for scripted mass raids.
 *
 * The raid sim files bake every launcher's trajectory from a fixed point, and the
 * SLBM entries were authored from land (e.g. the USA "Ohio Sub" shots start over
 * North Dakota). This module relocates a submarine-launched missile to a random
 * point in open ocean so the raid re-flies the shot from a plausible patrol area;
 * the caller regenerates the trajectory from that point with
 * {@link ./ballistic-trajectory.generateBallisticTrajectory}.
 */

/** A rectangular patch of open ocean (all water, clear of coasts) usable as an SSBN patrol box. */
export interface OceanRegion {
  name: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

/**
 * Open-ocean SSBN patrol boxes, curated to lie in deep water away from land. Covers
 * the major strategic-submarine operating areas so a relocated launcher can reach
 * targets in either hemisphere. A random point inside any box is guaranteed to be at sea.
 */
export const OCEAN_PATROL_REGIONS: readonly OceanRegion[] = [
  { name: 'North Atlantic', latMin: 46, latMax: 54, lonMin: -42, lonMax: -28 },
  { name: 'Norwegian Sea', latMin: 66, latMax: 71, lonMin: -6, lonMax: 6 },
  { name: 'Barents Approach', latMin: 74, latMax: 78, lonMin: 25, lonMax: 42 },
  { name: 'Mid Atlantic', latMin: 28, latMax: 38, lonMin: -52, lonMax: -40 },
  { name: 'Northeast Pacific', latMin: 40, latMax: 48, lonMin: -148, lonMax: -136 },
  { name: 'East Pacific', latMin: 25, latMax: 34, lonMin: -135, lonMax: -125 },
  { name: 'Central North Pacific', latMin: 35, latMax: 44, lonMin: 160, lonMax: 175 },
  { name: 'Western North Pacific', latMin: 38, latMax: 46, lonMin: 150, lonMax: 160 },
  { name: 'Philippine Sea', latMin: 16, latMax: 25, lonMin: 130, lonMax: 140 },
  { name: 'Arabian Sea', latMin: 12, latMax: 19, lonMin: 61, lonMax: 69 },
  { name: 'Bay of Bengal', latMin: 10, latMax: 17, lonMin: 85, lonMax: 92 },
];

/** Beyond this great-circle range (km) an SLBM shot is filtered out as implausible. */
const MAX_SLBM_RANGE_KM = 11_000;
const EARTH_RADIUS_KM = 6371;
const DEG2RAD = Math.PI / 180;

/** True when a raid entry's description marks it as a submarine launch (e.g. "Ohio Sub (Trident II)"). */
export const isSubmarineLaunch = (desc: string | undefined): boolean => (/\bsub\b/iu).test(desc ?? '');

/** A ballistic-missile submarine class: fleet size, tubes per boat, missile range, and patrol waters. */
export interface SubFleet {
  /** Number of hulls in the class - the hard cap on distinct launch positions. */
  fleetSize: number;
  /** Missile tubes per boat - the most missiles one hull can fire. */
  capacity: number;
  /** Missile range (km) - targets beyond this are unreachable from the boat. */
  rangeKm: number;
  /** Names (from {@link OCEAN_PATROL_REGIONS}) of the oceans this class patrols. */
  regions: readonly string[];
}

/**
 * SSBN classes keyed by the launcher name in the raid `desc` (the text before the
 * " (", e.g. "Ohio Sub (Trident II)" -> "Ohio Sub"). `fleetSize` is the real number of
 * boats (so a raid never implies more submarines than exist); `regions` are the oceans
 * that class patrols, so e.g. Chinese boats stay in the Pacific.
 */
export const SUBMARINE_FLEETS: Readonly<Record<string, SubFleet>> = {
  // USA - Trident II D5, near-global reach from Atlantic & Pacific patrols.
  'Ohio Sub': { fleetSize: 14, capacity: 20, rangeKm: 12_000, regions: ['North Atlantic', 'Mid Atlantic', 'Norwegian Sea', 'Northeast Pacific', 'East Pacific', 'Central North Pacific'] },
  // Russia - Bulava, Borei / Borei-A, Northern & Pacific fleets (6 of the 12-boat SSBN force).
  'Borei Sub': { fleetSize: 6, capacity: 16, rangeKm: 9_000, regions: ['Barents Approach', 'Norwegian Sea', 'North Atlantic', 'Western North Pacific', 'Central North Pacific'] },
  // Russia - Sineva / Layner, Delta IV, Northern Fleet with longer legs (the other 6 SSBNs).
  'Delta IV Sub': { fleetSize: 6, capacity: 16, rangeKm: 11_000, regions: ['Barents Approach', 'Norwegian Sea', 'North Atlantic'] },
  // China - Type 094 / 094A Jin-class (9 SSBNs), JL-2/JL-3 from the Western & Central Pacific bastions (Pacific only).
  'Type 092 Sub': { fleetSize: 9, capacity: 12, rangeKm: 10_000, regions: ['Philippine Sea', 'Western North Pacific', 'Central North Pacific'] },
  // UK - Trident II, North Atlantic.
  'Vanguard Sub': { fleetSize: 4, capacity: 16, rangeKm: 12_000, regions: ['North Atlantic', 'Norwegian Sea'] },
  // France - M51, North Atlantic.
  'Triomphant Sub': { fleetSize: 4, capacity: 16, rangeKm: 10_000, regions: ['North Atlantic', 'Mid Atlantic'] },
  // North Korea - experimental, short-ranged, near-shore Pacific.
  'Sinpo Sub': { fleetSize: 1, capacity: 6, rangeKm: 2_000, regions: ['Western North Pacific'] },
};

/** Fallback fleet for an unrecognized submarine class. */
const DEFAULT_FLEET: SubFleet = { fleetSize: 4, capacity: 16, rangeKm: 10_000, regions: ['North Atlantic', 'Mid Atlantic', 'Central North Pacific'] };

/** The submarine class of a raid entry: the launcher name before the " (" in its `desc`. */
export const subClassOf = (desc: string | undefined): string => (desc ?? '').split(' (')[0].trim();

/** A submarine-launched raid entry awaiting a launch + target assignment. */
export interface SubLaunchEntry {
  /** Index of this entry in the raid array (used to map the result back). */
  index: number;
  desc: string;
  /** Attacking country - its own targets form this boat's target pool. */
  country: string;
  /** The entry's baked target (fallback pool when no country targets are supplied). */
  targetLat: number;
  targetLon: number;
}

/** The re-flown launch and (re-distributed) target for one submarine missile. */
export interface SubLaunchPlan {
  launchLat: number;
  launchLon: number;
  targetLat: number;
  targetLon: number;
}

interface LatLon { lat: number; lon: number }

/** A random point uniformly inside an ocean region. */
const randomPointInRegion = (region: OceanRegion, rng: () => number): LatLon => ({
  lat: region.latMin + rng() * (region.latMax - region.latMin),
  lon: region.lonMin + rng() * (region.lonMax - region.lonMin),
});

/** Fisher-Yates shuffle into a new array, driven by the injected rng. */
const shuffled = <T>(items: readonly T[], rng: () => number): T[] => {
  const out = items.slice();

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));

    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
};

/** The single target nearest a boat (used as a last resort when nothing is in range). */
const nearestTarget = (boat: LatLon, pool: readonly LatLon[]): LatLon =>
  pool.reduce((best, t) => (greatCircleKm(boat.lat, boat.lon, t.lat, t.lon) < greatCircleKm(boat.lat, boat.lon, best.lat, best.lon) ? t : best));

/**
 * Assign every submarine-launched raid entry a launch point AND a re-distributed target,
 * so a boat's missiles fan out across the enemy instead of piling onto one city.
 *
 * Entries are grouped by boat class and split across `min(fleetSize, ceil(count / capacity))`
 * hulls (never more than the real fleet). Each boat is placed at a random point in one of its
 * class's patrol oceans (Chinese boats stay in the Pacific, etc.), and its missiles are spread
 * across the attacker's target pool that lies within the boat's missile range. `rng` is
 * injectable for tests.
 *
 * `targetsByAttacker` maps an attacking country to the distinct targets its forces strike; a
 * boat draws from its own country's pool, falling back to the entries' baked targets when none
 * is supplied. Returns a map from entry index -> its {@link SubLaunchPlan}.
 */
export const planSubmarineLaunches = (
  entries: readonly SubLaunchEntry[],
  targetsByAttacker: ReadonlyMap<string, readonly LatLon[]> = new Map(),
  rng: () => number = Math.random,
): Map<number, SubLaunchPlan> => {
  const byClass = new Map<string, SubLaunchEntry[]>();

  for (const entry of entries) {
    const cls = subClassOf(entry.desc);
    let group = byClass.get(cls);

    if (!group) {
      group = [];
      byClass.set(cls, group);
    }
    group.push(entry);
  }

  const result = new Map<number, SubLaunchPlan>();

  for (const [cls, group] of byClass) {
    const fleet = SUBMARINE_FLEETS[cls] ?? DEFAULT_FLEET;
    const country = group[0].country;

    // Target pool: the attacker's own distinct targets, else this class's baked targets.
    const pool = targetsByAttacker.get(country) ?? group.map((e) => ({ lat: e.targetLat, lon: e.targetLon }));

    // Patrol waters for this class (fall back to all oceans if none configured), then keep
    // only regions from which at least one target is in range so every boat can shoot.
    const classRegions = OCEAN_PATROL_REGIONS.filter((r) => fleet.regions.includes(r.name));
    const regions = classRegions.length > 0 ? classRegions : OCEAN_PATROL_REGIONS;
    const viable = regions.filter((r) => pool.some((t) => greatCircleKm(regionCenterLat(r), regionCenterLon(r), t.lat, t.lon) <= fleet.rangeKm));
    const useRegions = shuffled(viable.length > 0 ? viable : regions, rng);

    const boatCount = Math.max(1, Math.min(fleet.fleetSize, Math.ceil(group.length / fleet.capacity)));
    // Spread boats across distinct patrol regions where possible.
    const boats = Array.from({ length: boatCount }, (_unused, i) => randomPointInRegion(useRegions[i % useRegions.length], rng));

    // Per boat: the in-range targets it will spread its missiles across (nearest as a fallback).
    const boatTargets = boats.map((boat) => {
      const reach = shuffled(pool.filter((t) => greatCircleKm(boat.lat, boat.lon, t.lat, t.lon) <= fleet.rangeKm), rng);

      if (reach.length > 0) {
        return reach;
      }

      // Nothing in range: fall back to the single nearest target so the boat still fires.
      return pool.length > 0 ? [nearestTarget(boat, pool)] : [];
    });
    const cursor = new Array(boatCount).fill(0);

    group.forEach((entry, i) => {
      // Balance missiles across boats; give each a distinct target from its boat's reachable set.
      const boatIndex = i % boatCount;
      const targets = boatTargets[boatIndex];
      const target = targets.length > 0 ? targets[cursor[boatIndex]++ % targets.length] : { lat: entry.targetLat, lon: entry.targetLon };

      result.set(entry.index, {
        launchLat: boats[boatIndex].lat,
        launchLon: boats[boatIndex].lon,
        targetLat: target.lat,
        targetLon: target.lon,
      });
    });
  }

  return result;
};

/** Great-circle distance (km) between two lat/lon points on a spherical Earth. */
const greatCircleKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLon = (lon2 - lon1) * DEG2RAD;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
};

/** Center latitude of an ocean region. */
const regionCenterLat = (r: OceanRegion): number => (r.latMin + r.latMax) / 2;
/** Center longitude of an ocean region. */
const regionCenterLon = (r: OceanRegion): number => (r.lonMin + r.lonMax) / 2;

/**
 * Pick a random open-ocean launch point for a submarine firing at the given target.
 *
 * Regions within a plausible SLBM range of the target are the candidates (falling back
 * to the single nearest region if the target is unusually remote); one is chosen at
 * random and a uniform random point inside it is returned. `rng` is injectable so tests
 * are deterministic.
 */
export const randomOceanLaunchPoint = (
  targetLat: number,
  targetLon: number,
  rng: () => number = Math.random,
): { lat: number; lon: number } => {
  const inRange = OCEAN_PATROL_REGIONS.filter(
    (r) => greatCircleKm(regionCenterLat(r), regionCenterLon(r), targetLat, targetLon) <= MAX_SLBM_RANGE_KM,
  );

  const candidates = inRange.length > 0
    ? inRange
    : [[...OCEAN_PATROL_REGIONS].sort(
      (a, b) => greatCircleKm(regionCenterLat(a), regionCenterLon(a), targetLat, targetLon)
          - greatCircleKm(regionCenterLat(b), regionCenterLon(b), targetLat, targetLon),
    )[0]];

  const region = candidates[Math.floor(rng() * candidates.length)];

  return {
    lat: region.latMin + rng() * (region.latMax - region.latMin),
    lon: region.lonMin + rng() * (region.lonMax - region.lonMin),
  };
};
