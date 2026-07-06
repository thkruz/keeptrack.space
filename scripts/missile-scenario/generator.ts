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
import { MissileTrajectory } from '@app/plugins/missile/missile-types';
import { Degrees, SpaceObjectType } from '@ootk/src/main';
import { Doctrine, Salvo, Scenario, DEFAULT_TOTAL_CAP } from './scenario-config';
import { LaunchSite, Target } from './scenario-data';

/** One missile as stored in a mass-raid JSON file (only the fields the loader reads). */
export interface RaidEntry {
  /** Object name (the loader also derives it from this). */
  ON: string;
  /** Country label. */
  C: string;
  /** Human-readable "site -> target" description. */
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
}

/** Summary returned alongside the entries so the CLI can report coverage. */
export interface GenerationStats {
  requested: number;
  created: number;
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
 * Build one raid entry from a solved trajectory: apply a small aimpoint jitter's
 * result (already baked into the trajectory), front-pad `delaySec` on-pad samples
 * to stagger the launch, and round coordinates.
 */
const buildEntry = (
  attacker: string,
  desc: string,
  trajectory: MissileTrajectory,
  site: LaunchSite,
  delaySec: number,
): RaidEntry => {
  const latList: number[] = [];
  const lonList: number[] = [];
  const altList: number[] = [];

  // On-pad hold: the missile sits at its launch site (alt 0) until its slot in the salvo.
  const padLat = round(site.lat, 4);
  const padLon = round(site.lon, 4);

  for (let i = 0; i < delaySec; i++) {
    latList.push(padLat);
    lonList.push(padLon);
    altList.push(0);
  }

  for (let i = 0; i < trajectory.altList.length; i++) {
    latList.push(round(trajectory.latList[i], 4));
    lonList.push(round(trajectory.lonList[i], 4));
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
  };
};

/** Expand a salvo into individual (site, shot-index) pairs, one per round fired. */
const expandShots = (salvo: Salvo): LaunchSite[] => {
  const shots: LaunchSite[] = [];

  for (const site of salvo.sites) {
    for (let i = 0; i < site.salvo; i++) {
      shots.push(site);
    }
  }

  return shots;
};

/**
 * Generate every missile for a scenario. Deterministic for a given scenario id
 * (+ optional extra seed offset).
 */
export const generateScenario = (scenario: Scenario, seedOffset = 0): { entries: RaidEntry[]; stats: GenerationStats } => {
  const rng = makeRng(hashSeed(scenario.id) + seedOffset);
  const cap = scenario.totalCap ?? DEFAULT_TOTAL_CAP;
  const entries: RaidEntry[] = [];
  const stats: GenerationStats = { requested: 0, created: 0, skippedOutOfRange: 0, skippedSolverError: 0, cappedAt: cap };

  for (const salvo of scenario.salvos) {
    const shots = expandShots(salvo);
    const salvoCap = salvo.maxMissiles ?? shots.length;
    let salvoCreated = 0;

    for (const site of shots) {
      stats.requested++;

      if (entries.length >= cap || salvoCreated >= salvoCap) {
        continue;
      }

      const { min, max } = validRange(site);
      const inRange = salvo.targets.filter((t) => {
        const d = greatCircleKm(site.lat, site.lon, t.lat, t.lon);

        return d >= min && d <= max;
      });

      if (inRange.length === 0) {
        stats.skippedOutOfRange++;
        continue;
      }

      const target = weightedPick(
        inRange.map((t) => ({ item: t, weight: targetWeight(t, salvo.doctrine) })),
        rng,
      );

      if (!target) {
        stats.skippedOutOfRange++;
        continue;
      }

      // Jitter the aimpoint (~15 km) so several shots at one city fan out like
      // separate warheads instead of stacking on an identical track.
      const jitterLat = (rng() - 0.5) * 0.3;
      const jitterLon = (rng() - 0.5) * 0.3;
      const aimLat = (target.lat + jitterLat) as Degrees;
      const aimLon = (target.lon + jitterLon) as Degrees;

      // Re-validate the jittered arc against the hard 320 km floor before solving.
      if (greatCircleKm(site.lat, site.lon, aimLat, aimLon) < 322) {
        stats.skippedOutOfRange++;
        continue;
      }

      const trajectory = solveTrajectory(site, aimLat, aimLon);

      if (!trajectory) {
        stats.skippedSolverError++;
        continue;
      }

      const delaySec = Math.floor(rng() * scenario.launchWindowSec);
      const desc = `${site.name} -> ${target.name}`;

      entries.push(buildEntry(salvo.attacker, desc, trajectory, site, delaySec));
      salvoCreated++;
      stats.created++;
    }
  }

  // Name the missiles in final order (RV_0, RV_1, ...), matching the app's convention.
  entries.forEach((entry, i) => {
    entry.ON = `RV_${i}`;
  });

  return { entries, stats };
};

export type { Kilometers };
