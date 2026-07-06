/**
 * Core of the notional missile-scenario generator.
 *
 * Turns a declarative {@link Scenario} into an array of raid entries in the exact
 * shape `missileManager.massRaidPre` consumes. Trajectories come from the analytic
 * {@link generateBallisticTrajectory} (minimum-energy Keplerian arc), which is
 * correct and well-behaved at every range - unlike the ICBM-tuned rocket-integration
 * solver, which cannot fly the short regional (IRBM/SRBM) arcs and used to bake NaN
 * tails. Using one analytic model for every scenario keeps the whole catalog of
 * raids consistent and guarantees each missile lands exactly on its aimpoint.
 *
 * Launch staggering is done the same way the shipped scenarios do it: every
 * missile in a raid shares one global start time (the app overwrites `startTime`
 * on load), so a delayed launch is expressed by front-padding its lat/lon/alt
 * lists with N stationary "on the pad" samples (one per second).
 */
import { generateBallisticTrajectory } from '@app/plugins/missile/ballistic-trajectory';
import { warheadCountForDesc, RvTarget } from '@app/plugins/missile/missile-mirv';
import { MissileTrajectory } from '@app/plugins/missile/missile-types';
import { Degrees, SpaceObjectType } from '@ootk/src/main';
import { Doctrine, Salvo, Scenario, DEFAULT_TOTAL_CAP } from './scenario-config';
import { LaunchSite, Target } from './scenario-data';

/**
 * One bus as stored in a mass-raid JSON file. Each entry is a launcher flying to its
 * primary aimpoint (`rvTargets[0]`); at load time the app fans it into one reentry
 * vehicle per {@link RvTarget}, each landing on a distinct real target with its own
 * label. This is what spreads a raid across the whole target set instead of clustering
 * every warhead of a bus onto one city.
 */
export interface RaidEntry {
  /** Object name (the loader also derives it from this). */
  ON: string;
  /** Country label. */
  C: string;
  /** Human-readable "site -> primary target" description. */
  desc: string;
  active: boolean;
  /** SpaceObjectType.BALLISTIC_MISSILE. */
  type: number;
  latList: number[];
  lonList: number[];
  altList: number[];
  /** Overwritten by the app at load time; kept at 0 here. */
  startTime: number;
  /** Apogee (km) - used by the app's zoom controls. */
  maxAlt: number;
  /** Distinct aimpoints for this bus's reentry vehicles (index 0 is the primary/bus impact). */
  rvTargets: RvTarget[];
}

/** Summary returned alongside the entries so the CLI can report coverage. */
export interface GenerationStats {
  /** Number of bus entries written. */
  buses: number;
  /** Total reentry vehicles (warheads) across all buses - what fills the app's missile slots. */
  warheads: number;
  /** Distinct targets struck at least once. */
  targetsCovered: number;
  /** Total distinct targets available across the scenario's salvos. */
  targetsAvailable: number;
  skippedOutOfRange: number;
  skippedSolverError: number;
  cappedAt: number;
}

const EARTH_RADIUS_KM = 6371;
const DEG2RAD = Math.PI / 180;

/**
 * Deterministic PRNG (mulberry32). Seeding from the scenario id keeps regenerated
 * files byte-stable across runs, so re-baking produces a clean git diff instead of
 * churning every coordinate.
 */
const makeRng = (seed: number): (() => number) => {
  let a = seed >>> 0;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Hash a string to a 32-bit seed (FNV-1a). */
const hashSeed = (str: string): number => {
  let h = 0x811c9dc5;

  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
};

/** Great-circle distance (km) between two lat/lon points. */
const greatCircleKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const p1 = lat1 * DEG2RAD;
  const p2 = lat2 * DEG2RAD;
  const dp = (lat2 - lat1) * DEG2RAD;
  const dl = (lon2 - lon1) * DEG2RAD;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
};

/** Shortest ballistic range we bother modeling (km); below this a "missile" reads as artillery. */
const MIN_BALLISTIC_RANGE_KM = 300;

/**
 * Range window (km) a site can validly engage. The analytic solver is happy at any
 * range, so this is now purely doctrinal: no shorter than a real short-range ballistic
 * missile, no farther than the launcher's stated reach.
 */
const validRange = (site: LaunchSite): { min: number; max: number } => ({
  min: MIN_BALLISTIC_RANGE_KM,
  max: site.rangeKm,
});

/** Relative selection weight for a target under a doctrine. */
const targetWeight = (target: Target, doctrine: Doctrine): number => {
  if (doctrine === 'counterforce') {
    return target.kind === 'military' ? 4 : 1;
  }
  if (doctrine === 'countervalue') {
    return target.kind === 'population' ? 4 : 1;
  }

  return target.kind === 'military' ? 1.5 : 1; // mixed, slight counterforce lean
};

/** Weighted random pick from a list of {item, weight}. Returns null if empty. */
const weightedPick = <T>(items: { item: T; weight: number }[], rng: () => number): T | null => {
  if (items.length === 0) {
    return null;
  }
  let total = 0;

  for (const { weight } of items) {
    total += weight;
  }
  let r = rng() * total;

  for (const { item, weight } of items) {
    r -= weight;
    if (r <= 0) {
      return item;
    }
  }

  return items[items.length - 1].item;
};

/**
 * Solve one trajectory as a minimum-energy ballistic arc. Returns null only for a
 * degenerate (coincident) launch/target pair; the analytic model handles every real
 * range without retries or failure modes.
 */
const solveTrajectory = (site: LaunchSite, targetLat: number, targetLon: number): MissileTrajectory | null => {
  try {
    return generateBallisticTrajectory(site.lat, site.lon, targetLat, targetLon);
  } catch {
    return null;
  }
};

/** Round to N decimal places (trims file size without visible trajectory change). */
const round = (value: number, decimals: number): number => {
  const f = 10 ** decimals;

  return Math.round(value * f) / f;
};

/**
 * Build one bus entry from a solved trajectory: front-pad `delaySec` on-pad samples to
 * stagger the launch, round coordinates, and attach the distinct reentry-vehicle targets.
 */
const buildEntry = (
  attacker: string,
  desc: string,
  trajectory: MissileTrajectory,
  site: LaunchSite,
  delaySec: number,
  rvTargets: RvTarget[],
): RaidEntry => {
  const latList: number[] = [];
  const lonList: number[] = [];
  const altList: number[] = [];

  // 3 decimals of lat/lon is ~110 m - imperceptible on the globe, and it keeps the big raids
  // (the strategic exchanges reach ~2,000-2,300 reentry vehicles) to a manageable file size.
  const padLat = round(site.lat, 3);
  const padLon = round(site.lon, 3);

  for (let i = 0; i < delaySec; i++) {
    latList.push(padLat);
    lonList.push(padLon);
    altList.push(0);
  }

  for (let i = 0; i < trajectory.altList.length; i++) {
    latList.push(round(trajectory.latList[i], 3));
    lonList.push(round(trajectory.lonList[i], 3));
    altList.push(round(Math.max(0, trajectory.altList[i]), 2));
  }

  return {
    ON: '',
    C: attacker,
    desc,
    active: true,
    type: SpaceObjectType.BALLISTIC_MISSILE,
    latList,
    lonList,
    altList,
    startTime: 0,
    maxAlt: round(trajectory.maxAltitudeKm, 2),
    rvTargets,
  };
};

/** Expand a salvo into individual launch origins, one per round fired (site repeated `salvo` times). */
const expandShots = (salvo: Salvo): LaunchSite[] => {
  const shots: LaunchSite[] = [];

  for (const site of salvo.sites) {
    for (let i = 0; i < site.salvo; i++) {
      shots.push(site);
    }
  }

  return shots;
};

/** Fisher-Yates shuffle into a new array, driven by the injected rng. */
const shuffled = <T>(items: readonly T[], rng: () => number): T[] => {
  const out = items.slice();

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));

    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
};

/**
 * Order a target set for maximum-coverage assignment: a doctrine-weighted random
 * permutation (draw without replacement, weighting military/population by doctrine). The
 * generator walks this order handing each still-unstruck target to the next bus, so every
 * target is hit once before any is doubled up.
 */
const coverageOrder = (targets: readonly Target[], doctrine: Doctrine, rng: () => number): Target[] => {
  const remaining = targets.slice();
  const order: Target[] = [];

  while (remaining.length > 0) {
    const pick = weightedPick(remaining.map((t) => ({ item: t, weight: targetWeight(t, doctrine) })), rng);

    if (!pick) {
      break;
    }
    order.push(pick);
    remaining.splice(remaining.indexOf(pick), 1);
  }

  return order;
};

/** A reentry-vehicle footprint radius (km) scaled to the shot: wide for an ICBM, tight for an SRBM. */
const footprintRadiusKm = (arcKm: number): number => Math.min(1200, Math.max(120, arcKm * 0.22));

/** Small deterministic jitter (deg) so warheads doubled onto one target don't render exactly stacked. */
const jitter = (rng: () => number): number => (rng() - 0.5) * 0.12;

/**
 * Generate every bus for a scenario, maximizing distinct-target coverage.
 *
 * For each salvo the target set is walked in a coverage order (every target struck once
 * before any repeat). Each launcher becomes a MIRV bus: it takes the next unstruck target
 * in range as its primary aimpoint, then packs up to its warhead capacity with additional
 * distinct targets inside a range-scaled footprint - so a bus's reentry vehicles fan out
 * across several real nearby targets rather than clustering on one. Warheads are capped at
 * the scenario's slot budget. Deterministic for a given scenario id (+ optional seed offset).
 */
export const generateScenario = (scenario: Scenario, seedOffset = 0): { entries: RaidEntry[]; stats: GenerationStats } => {
  const rng = makeRng(hashSeed(scenario.id) + seedOffset);
  const cap = scenario.totalCap ?? DEFAULT_TOTAL_CAP;
  const entries: RaidEntry[] = [];
  const allTargets = new Set<Target>();
  const struckTargets = new Set<Target>();
  const stats: GenerationStats = {
    buses: 0, warheads: 0, targetsCovered: 0, targetsAvailable: 0, skippedOutOfRange: 0, skippedSolverError: 0, cappedAt: cap,
  };

  let warheadTotal = 0;

  for (const salvo of scenario.salvos) {
    for (const t of salvo.targets) {
      allTargets.add(t);
    }

    const budget = Math.min(cap - warheadTotal, salvo.maxMissiles ?? Number.MAX_SAFE_INTEGER);

    if (budget <= 0) {
      continue;
    }

    const sitePool = shuffled(expandShots(salvo), rng);
    const order = coverageOrder(salvo.targets, salvo.doctrine, rng);
    const assigned = new Set<Target>(); // struck within this salvo (for coverage-first)
    let salvoWarheads = 0;
    let siteIdx = 0;
    let guard = 0;
    const maxIterations = sitePool.length * 6 + salvo.targets.length * 2;

    const reaches = (site: LaunchSite, t: Target): boolean => {
      const d = greatCircleKm(site.lat, site.lon, t.lat, t.lon);
      const { min, max } = validRange(site);

      return d >= min && d <= max;
    };

    while (salvoWarheads < budget && guard < maxIterations) {
      guard++;
      const site = sitePool[siteIdx % sitePool.length];

      siteIdx++;

      // Primary: the next not-yet-struck target this site can reach; once all are struck,
      // fall back to any reachable target so extra warheads pile realistic double taps.
      let primary = order.find((t) => !assigned.has(t) && reaches(site, t)) ?? order.find((t) => reaches(site, t));

      if (!primary) {
        stats.skippedOutOfRange++;
        continue; // this launcher can't range any target (e.g. a short-range site vs far pool)
      }

      const warheadCap = Math.min(warheadCountForDesc(site.name), budget - salvoWarheads);
      const rvTargets: Target[] = [primary];

      assigned.add(primary);
      struckTargets.add(primary);

      // Pack the rest of the bus with distinct nearby targets inside a range-scaled footprint,
      // preferring not-yet-struck ones so the footprint adds coverage rather than repeats.
      if (warheadCap > 1) {
        const arcKm = greatCircleKm(site.lat, site.lon, primary.lat, primary.lon);
        const radius = footprintRadiusKm(arcKm);
        const nearby = salvo.targets
          .filter((t) => t !== primary && reaches(site, t) && greatCircleKm(primary.lat, primary.lon, t.lat, t.lon) <= radius)
          .sort((a, b) => greatCircleKm(primary.lat, primary.lon, a.lat, a.lon) - greatCircleKm(primary.lat, primary.lon, b.lat, b.lon));
        const orderedNearby = [...nearby.filter((t) => !assigned.has(t)), ...nearby.filter((t) => assigned.has(t))];

        for (const t of orderedNearby) {
          if (rvTargets.length >= warheadCap) {
            break;
          }
          if (rvTargets.includes(t)) {
            continue;
          }
          rvTargets.push(t);
          assigned.add(t);
          struckTargets.add(t);
        }
      }

      const trajectory = solveTrajectory(site, primary.lat as Degrees, primary.lon as Degrees);

      if (!trajectory) {
        stats.skippedSolverError++;
        continue;
      }

      const delaySec = Math.floor(rng() * scenario.launchWindowSec);
      const bakedRvs: RvTarget[] = rvTargets.map((t) => ({
        lat: round(t.lat + jitter(rng), 3),
        lon: round(t.lon + jitter(rng), 3),
        name: t.name,
      }));

      entries.push(buildEntry(salvo.attacker, `${site.name} -> ${primary.name}`, trajectory, site, delaySec, bakedRvs));
      salvoWarheads += rvTargets.length;
      warheadTotal += rvTargets.length;
      stats.buses++;
    }
  }

  stats.warheads = warheadTotal;
  stats.targetsAvailable = allTargets.size;
  stats.targetsCovered = struckTargets.size;

  // Name the buses in final order (RV_0, RV_1, ...), matching the app's convention.
  entries.forEach((entry, i) => {
    entry.ON = `RV_${i}`;
  });

  return { entries, stats };
};
