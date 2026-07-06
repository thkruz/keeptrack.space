/* eslint-disable max-params */
/* eslint-disable max-statements */
/* eslint-disable max-lines-per-function */
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { MissileParams, ToastMsgType } from '@app/engine/core/interfaces';
import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { jday } from '@app/engine/utils/transforms';
import { DEG2RAD, Degrees, TemeVec3, Kilometers, KilometersPerSecond, MILLISECONDS_TO_DAYS, RAD2DEG, Sgp4, SpaceObjectType, ecefRad2rae, eci2ecef, eci2lla } from '@ootk/src/main';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ScenarioManagementPlugin } from '@app/plugins/scenario-management/scenario-management';
import { TimeSlider } from '@app/plugins/time-slider/time-slider';
import { SettingsMenuPlugin } from '../settings-menu/settings-menu';
import { ChinaICBM, FraSLBM, NorthKoreanBM, RussianICBM, USATargets, UsaICBM, globalBMTargets, ukSLBM } from './missile-data';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { MissileSimulation } from './missile-simulation';
import { generateBallisticTrajectory } from './ballistic-trajectory';
import { MissileSpec, MissileTrajectory } from './missile-types';
import { expandTrajectoryToMirv, generateFootprint, findSeparationIndex, retargetDescent, warheadCountForDesc } from './missile-mirv';
import { isSubmarineLaunch, planSubmarineLaunches, SubLaunchEntry } from './sub-launch';

const missileArray: MissileObject[] = [];

let isMassRaidLoaded = false;

/**
 * Bound the scenario timeline to the union of every active missile in the catalog: earliest launch
 * → latest impact (each trajectory point is 1 second in the cruncher's index→time mapping).
 *
 * Recomputed whenever missiles are added, so the window expands to cover the whole mass raid, or
 * every custom missile launched so far (start = earliest of any, stop = latest of any). No-op when
 * the scenario plugin isn't loaded or no active missiles remain - clearMissiles() releases the
 * bounds in that case.
 */
const boundScenarioToActiveMissiles_ = (): void => {
  const scenarioPlugin = PluginRegistry.getPlugin(ScenarioManagementPlugin);

  if (!scenarioPlugin) {
    return;
  }

  const catalogManagerInstance = ServiceLocator.getCatalogManager();
  const firstMissileId = catalogManagerInstance.missileSats - settingsManager.maxMissiles;
  let minStartMs = Infinity;
  let maxEndMs = -Infinity;

  for (let id = firstMissileId; id < catalogManagerInstance.missileSats; id++) {
    const missile = catalogManagerInstance.objectCache[id] as MissileObject | undefined;

    if (!missile?.isMissile() || !missile.active || !missile.altList?.length) {
      continue;
    }

    minStartMs = Math.min(minStartMs, missile.startTime);
    maxEndMs = Math.max(maxEndMs, missile.startTime + (missile.altList.length - 1) * 1000);
  }

  if (minStartMs === Infinity) {
    return; // No active missiles to bound
  }

  scenarioPlugin.updateScenario({ startTime: new Date(minStartMs), endTime: new Date(maxEndMs) });
  PluginRegistry.getPlugin(TimeSlider)?.updateSliderPosition();
};

// This function stalls Jest for multiple minutes.
/* istanbul ignore next */
export const MassRaidPre = async (time: number, simFile: string) => {
  missileManager.clearMissiles();

  await fetch(simFile)
    .then((response) => response.json())
    .then((newMissileArray) => {
      const catalogManagerInstance = ServiceLocator.getCatalogManager();
      const dotsManagerInstance = ServiceLocator.getDotsManager();
      const orbitManagerInstance = ServiceLocator.getOrbitManager();
      const satSetLen = catalogManagerInstance.missileSats;

      // Collect the real MissileObjects we build below (not the raw JSON) so the
      // per-frame orbit redraw in the plugin's updateLoop_ reads a correct catalog
      // id off each entry. The raw JSON carries no id, and even the legacy files'
      // baked ids were stale relative to the runtime catalog slot.
      const builtMissiles: MissileObject[] = [];
      const maxMissiles = settingsManager.maxMissiles;
      const firstSlot = satSetLen - maxMissiles;
      let slotOffset = 0; // running index into the missile reservation

      // Submarine launchers were authored from land (the USA "Ohio Sub" shots start over North
      // Dakota) and often piled onto one city. Plan every SLBM entry up front: cluster them onto a
      // realistic number of hulls (never more than the class fleet), place each boat in one of its
      // class's patrol oceans, and spread its missiles across the attacker's target pool within
      // range. Build that pool per attacking country from the raid's distinct targets.
      const targetsByAttacker = new Map<string, { lat: number; lon: number }[]>();

      for (const entry of newMissileArray) {
        if (!entry.latList?.length) {
          continue;
        }
        const li = entry.latList.length - 1;
        const key = String(entry.C ?? '');
        const seen = targetsByAttacker.get(key) ?? [];
        const target = { lat: entry.latList[li], lon: entry.lonList[li] };

        // Dedupe to ~0.1 deg so distribution spreads across distinct places, not repeats of one city.
        if (!seen.some((t) => Math.abs(t.lat - target.lat) < 0.1 && Math.abs(t.lon - target.lon) < 0.1)) {
          seen.push(target);
        }
        targetsByAttacker.set(key, seen);
      }

      const subLaunchEntries: SubLaunchEntry[] = [];

      for (let i = 0; i < newMissileArray.length; i++) {
        const raw = newMissileArray[i];

        if (isSubmarineLaunch(raw.desc) && raw.altList?.length >= 2) {
          const lastIdx = raw.altList.length - 1;

          subLaunchEntries.push({ index: i, desc: raw.desc, country: String(raw.C ?? ''), targetLat: raw.latList[lastIdx], targetLon: raw.lonList[lastIdx] });
        }
      }
      const subLaunches = planSubmarineLaunches(subLaunchEntries, targetsByAttacker);

      for (let i = 0; i < newMissileArray.length && slotOffset < maxMissiles; i++) {
        const raw = newMissileArray[i];

        raw.startTime = time;
        raw.name = raw.ON;
        raw.country = raw.C;

        // Re-fly a planned submarine launcher from its boat's ocean point to its assigned target.
        const subLaunch = subLaunches.get(i);

        if (subLaunch) {
          const traj = generateBallisticTrajectory(subLaunch.launchLat, subLaunch.launchLon, subLaunch.targetLat, subLaunch.targetLon);

          raw.latList = traj.latList;
          raw.lonList = traj.lonList;
          raw.altList = traj.altList;
        }

        // Fan each raid missile into a realistic number of reentry vehicles based on its
        // designator (the sim files carry one bus trajectory per launcher). The RVs share
        // the bus track up to apogee and spread across a footprint on the way down; every RV
        // but the first is hidden until separation, so the raid reads as N missiles that each
        // split into their warheads rather than a field of single RVs. Clamp to the slots left.
        const warheads = Math.min(warheadCountForDesc(raw.desc), maxMissiles - slotOffset);
        const tracks = expandTrajectoryToMirv(raw.latList, raw.lonList, raw.altList, warheads, MIRV_DEFAULT_SPREAD_KM);

        for (let w = 0; w < tracks.length; w++) {
          const x = firstSlot + slotOffset;
          const track = tracks[w];

          // Build the real MissileObject directly from the sim data and store that in the
          // catalog. Never stage raw JSON in the cache: a plain object has no class methods, so any
          // catalog read that runs updatePosVel() would call isStatic() on it and throw. The
          // MissileObject constructor already defaults velocity/totalVelocity to zero. (issue #1373)
          const missileObj = new MissileObject({
            id: x,
            name: `RV_${x}`,
            country: raw.country,
            desc: tracks.length > 1 ? `${raw.desc} (RV ${w + 1}/${tracks.length})` : raw.desc,
            active: raw.active,
            type: raw.type,
            latList: track.latList,
            lonList: track.lonList,
            altList: track.altList,
            startTime: raw.startTime,
          } as unknown as MissileParams);

          // Children ride on top of the bus during ascent; hide them until separation.
          missileObj.hideUntilSeparation = w > 0;
          // The whole load flies as one bus until apogee, so tag every RV with the full
          // count: the visible ascent object (w === 0) then resolves to the deploy mesh
          // that shows this many reentry vehicles.
          missileObj.warheadCount = tracks.length;

          catalogManagerInstance.objectCache[x] = missileObj;
          builtMissiles.push(missileObj);

          // Seed the missile's initial position on the main thread. The position-cruncher worker
          // fills positionData asynchronously on its next cycle, but the doSearch('RV_') below runs
          // synchronously - without this seed every missile reads position {0,0,0} and is flagged as
          // "decayed" until the user searches a second time. The cruncher overwrites these with
          // matching values once it runs, so this only bridges the startup gap.
          const pv = missileObj.eci();

          if (pv && dotsManagerInstance.positionData) {
            dotsManagerInstance.positionData[x * 3] = pv.position.x;
            dotsManagerInstance.positionData[x * 3 + 1] = pv.position.y;
            dotsManagerInstance.positionData[x * 3 + 2] = pv.position.z;
          }

          catalogManagerInstance.satCruncherThread.sendNewMissile({
            id: missileObj.id,
            active: missileObj.active,
            type: missileObj.type,
            latList: missileObj.latList,
            lonList: missileObj.lonList,
            altList: missileObj.altList,
            startTime: missileObj.startTime,
          });

          orbitManagerInstance.updateOrbitBuffer(missileObj.id, missileObj);
          slotOffset++;
        }
      }
      missileManager.missilesInUse = slotOffset;
      missileManager.missileArray = builtMissiles;
    });

  ServiceLocator.getUiManager().toast('Missile Mass Raid Loaded Successfully', ToastMsgType.normal);
  settingsManager.searchLimit = Math.max(settingsManager.searchLimit, settingsManager.maxMissiles);
  SettingsMenuPlugin.syncOnLoad();

  isMassRaidLoaded = true;

  // Bound the scenario timeline to the raid window (launch → last impact). Outside this range the
  // cruncher has no trajectory data, so missiles would otherwise sit at the launch site; the
  // scenario plugin clamps sim time to these bounds and pauses at the edges.
  boundScenarioToActiveMissiles_();

  // The missiles were just activated in objectCache, but in worker-mode the color worker only has
  // the typed-array snapshot taken at catalog init (active=0 for these slots). Without this nudge
  // it keeps coloring them transparent, so the group orbit overlay skips them on alpha (they only
  // appear on hover, which ignores the color buffer). Rebuilds the worker's catalog + recolors.
  ServiceLocator.getColorSchemeManager().notifyObjectsChanged();

  ServiceLocator.getUiManager().doSearch('RV_');
};

export const clearMissiles = () => {
  const uiManagerInstance = ServiceLocator.getUiManager();
  const catalogManagerInstance = ServiceLocator.getCatalogManager();

  uiManagerInstance.doSearch('');
  const satSetLen = catalogManagerInstance.missileSats;

  for (let i = 0; i < settingsManager.maxMissiles; i++) {
    const x = satSetLen - settingsManager.maxMissiles + i;

    const missileObj: MissileObject = <MissileObject>catalogManagerInstance.getObject(x);

    missileObj.active = false;
    missileObj.latList = [];
    missileObj.lonList = [];
    missileObj.name = '';
    missileObj.startTime = 0;

    catalogManagerInstance.objectCache[x] = missileObj;
    // Set the velocity to 0 if it doesn't exist
    const cachedMissile = catalogManagerInstance.objectCache[x] as unknown as { velocity?: TemeVec3<KilometersPerSecond>; totalVelocity?: number };

    cachedMissile.velocity ??= { x: 0, y: 0, z: 0 } as TemeVec3<KilometersPerSecond>;
    cachedMissile.totalVelocity ??= 0;

    catalogManagerInstance.satCruncherThread.sendNewMissile({
      id: missileObj.id,
      active: missileObj.active,
      type: missileObj.type,
      latList: missileObj.latList,
      lonList: missileObj.lonList,
      altList: missileObj.altList,
      startTime: missileObj.startTime,
    });

    if (missileObj.id) {
      const orbitManagerInstance = ServiceLocator.getOrbitManager();

      orbitManagerInstance.updateOrbitBuffer(missileObj.id, missileObj);
    }
  }
  missileManager.missilesInUse = 0;

  // Release the raid's scenario timeline bounds so the user can scrub freely again. MassRaidPre
  // calls clearMissiles() before loading, then re-applies fresh bounds, so this is a no-op there.
  PluginRegistry.getPlugin(ScenarioManagementPlugin)?.updateScenario({ startTime: null, endTime: null });
  PluginRegistry.getPlugin(TimeSlider)?.updateSliderPosition();
};

/** Default footprint radius (km) over which a MIRV's reentry vehicles fan out. */
export const MIRV_DEFAULT_SPREAD_KM = 75;

/** Input contract for {@link MirvAttack}. */
export interface MirvLaunchParams {
  launchLatitude: number;
  launchLongitude: number;
  targetLatitude: number;
  targetLongitude: number;
  /** Number of reentry vehicles (1-12). 1 is equivalent to a single normal launch. */
  warheadCount: number;
  startTime: number;
  description: string;
  length?: number;
  diameter?: number;
  burnRate?: number;
  maxRangeKm: number;
  country?: string;
  minAltitudeKm?: number;
  /** Footprint radius (km); defaults to {@link MIRV_DEFAULT_SPREAD_KM}. */
  spreadKm?: number;
}

/**
 * Shared coordinate bounds check for launch + target lat/lon. Returns a
 * human-readable error string, or null when every coordinate is in range.
 */
const validateLaunchBounds_ = (launchLat: number, launchLon: number, targetLat: number, targetLon: number): string | null => {
  if (launchLat > 90 || launchLat < -90) {
    return 'Error: Launch Latitude must be<br>between 90 and -90 degrees';
  }
  if (launchLon > 180 || launchLon < -180) {
    return 'Error: Launch Longitude must be<br>between 180 and -180 degrees';
  }
  if (targetLat > 90 || targetLat < -90) {
    return 'Error: Target Latitude must be<br>between 90 and -90 degrees';
  }
  if (targetLon > 180 || targetLon < -180) {
    return 'Error: Target Longitude must be<br>between 180 and -180 degrees';
  }

  return null;
};

/** Great-circle distance (km) between two lat/lon points. */
const greatCircleKm_ = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const p1 = lat1 * DEG2RAD;
  const p2 = lat2 * DEG2RAD;
  const dp = (lat2 - lat1) * DEG2RAD;
  const dl = (lon2 - lon1) * DEG2RAD;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;

  return 2 * RADIUS_OF_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
};

/**
 * Runs the ballistic flight simulation and returns the smoothed trajectory, or a
 * toast-ready error. Encapsulates the low-apogee retry (bump the burn rate and
 * re-solve) so both the single-missile and MIRV paths share one implementation.
 *
 * The rocket-integration model in {@link MissileSimulation} was tuned for ICBMs and
 * cannot fly short regional (IRBM/SRBM) arcs: fired at a nearby target it carries too
 * much energy, overshoots, and its solver now reports an error rather than baking a
 * corrupted track (the old behaviour was a NaN-tailed "success"). For any target that
 * is inside the missile's stated range but too short for the rocket model, fall back to
 * the analytic minimum-energy ballistic arc, which is well-behaved at every range and
 * always lands on the aimpoint. Genuinely out-of-range targets keep surfacing the error.
 */
const solveTrajectory_ = (spec: MissileSpec): { trajectory: MissileTrajectory } | { error: string; errorType: ToastMsgType } => {
  const result = new MissileSimulation(spec).run();

  if (result.kind === 'success') {
    // The simulation emits a smooth, full-precision great-circle track (samples are
    // interpolated, not snapped to a 0.01deg grid), so no post-smoothing is needed.
    return { trajectory: result.trajectory };
  }

  if (result.kind === 'lowApogee') {
    return solveTrajectory_({ ...spec, burnRate: (spec.burnRate || 0.042) * result.burnMultiplier });
  }

  // result.kind is 'error' or 'tooClose'. Try the analytic fallback for in-range shots.
  const arcKm = greatCircleKm_(spec.launchLatitude, spec.launchLongitude, spec.targetLatitude, spec.targetLongitude);

  if (arcKm >= 320 && arcKm <= spec.maxRangeKm) {
    try {
      return {
        trajectory: generateBallisticTrajectory(spec.launchLatitude, spec.launchLongitude, spec.targetLatitude, spec.targetLongitude),
      };
    } catch {
      // Degenerate geometry - fall through to the solver's original error.
    }
  }

  return { error: result.errorMessage, errorType: result.errorType };
};

/**
 * Writes a finished trajectory into a single pre-allocated missile slot: mutates
 * the catalog `MissileObject`, pushes it onto the active array, hands it to the
 * cruncher + orbit buffer, and seeds its main-thread position so it renders as
 * active immediately. Returns the object, or null if the slot is missing.
 *
 * The caller owns `missilesInUse` and the scenario-bounds refresh, so this can be
 * looped over for a MIRV without re-bounding per RV.
 */
const writeMissileToSlot_ = (
  slot: number,
  latList: Degrees[],
  lonList: Degrees[],
  altList: Kilometers[],
  maxAltitudeKm: number,
  startTime: number,
  desc: string,
  country?: string,
): MissileObject | null => {
  const catalogManagerInstance = ServiceLocator.getCatalogManager();
  const missileObj = catalogManagerInstance.getObject(slot) as MissileObject | null;

  if (!missileObj) {
    return null;
  }

  missileObj.altList = altList;
  missileObj.latList = latList;
  missileObj.lonList = lonList;
  missileObj.active = true;
  missileObj.type = SpaceObjectType.BALLISTIC_MISSILE;
  missileObj.id = slot;
  missileObj.name = `RV_${slot}`;
  missileObj.desc = desc;
  missileObj.maxAlt = maxAltitudeKm; // used for zoom controls
  missileObj.startTime = startTime;
  if (country) {
    missileObj.country = country;
  }

  missileArray.push(missileObj);

  catalogManagerInstance.satCruncherThread.sendNewMissile({
    id: missileObj.id,
    active: missileObj.active,
    type: missileObj.type,
    latList,
    lonList,
    altList,
    startTime,
  });

  ServiceLocator.getOrbitManager().updateOrbitBuffer(slot, { latList, lonList, altList });

  // Seed the initial position on the main thread so the missile reads as active immediately,
  // rather than "decayed" (position {0,0,0}) until the async position-cruncher's first cycle.
  const dotsManagerInstance = ServiceLocator.getDotsManager();
  const pv = missileObj.eci();

  if (pv && dotsManagerInstance.positionData) {
    dotsManagerInstance.positionData[slot * 3] = pv.position.x;
    dotsManagerInstance.positionData[slot * 3 + 1] = pv.position.y;
    dotsManagerInstance.positionData[slot * 3 + 2] = pv.position.z;
  }

  return missileObj;
};

/**
 * @warning This function stalls Jest for multiple minutes.
 *
 * Designs the flight path of an intercontinental ballistic missile (ICBM) and
 * writes the result into the catalog at `MissileObjectNum`.
 *
 * As of PR 2 of issue #914, the physics simulation has been extracted into
 * [MissileSimulation](./missile-simulation.ts). This function now owns:
 *   - Argument validation (lat/lon/warheads/range bounds).
 *   - Catalog interaction (`getObject`, `satCruncherThread.sendNewMissile`,
 *     `orbitManager.updateOrbitBuffer`).
 *   - Writing the finished trajectory to the missile object.
 *   - The low-apogee retry recursion (preserved verbatim - the bug where this
 *     path returns 0 even when the recursive call succeeded is fixed in PR 4).
 *
 * The 14-positional signature and `1` / `0` return value are preserved for
 * backward compatibility; PR 4 will switch callers to `MissileSpec` /
 * `MissileLaunchResult`.
 */
export const Missile = (
  CurrentLatitude: number,
  CurrentLongitude: number,
  TargetLatitude: number,
  TargetLongitude: number,
  NumberWarheads: number,
  MissileObjectNum: number,
  CurrentTime: number,
  MissileDesc: string,
  Length: number,
  Diameter: number,
  NewBurnRate: number,
  MaxMissileRange: number,
  country: string,
  minAltitude: number,
) => {
  if (isMassRaidLoaded) {
    clearMissiles();
    const satSetLen = ServiceLocator.getCatalogManager().missileSats;

    MissileObjectNum = satSetLen - settingsManager.maxMissiles;
  }

  if (missileManager.missilesInUse >= settingsManager.maxMissiles) {
    missileManager.lastMissileErrorType = ToastMsgType.critical;
    missileManager.lastMissileError = 'Error: Maximum number of missiles<br>have been reached.';

    return 0;
  }

  // Dimensions of the rocket
  Length = Length || 17; // (m)
  Diameter = Diameter || 3.1; // (m)

  const boundsError = validateLaunchBounds_(CurrentLatitude, CurrentLongitude, TargetLatitude, TargetLongitude);

  if (boundsError) {
    missileManager.lastMissileErrorType = ToastMsgType.critical;
    missileManager.lastMissileError = boundsError;

    return 0;
  }
  if (NumberWarheads > 12) {
    return 0;
  }
  if (NumberWarheads % 1 > 0) {
    return 0;
  }

  if (typeof minAltitude === 'undefined') {
    minAltitude = 0;
  }

  const spec: MissileSpec = {
    launchLatitude: CurrentLatitude,
    launchLongitude: CurrentLongitude,
    targetLatitude: TargetLatitude,
    targetLongitude: TargetLongitude,
    numberOfWarheads: NumberWarheads,
    missileObjectNum: MissileObjectNum,
    startTime: CurrentTime,
    description: MissileDesc,
    length: Length,
    diameter: Diameter,
    burnRate: NewBurnRate,
    maxRangeKm: MaxMissileRange,
    country,
    minAltitudeKm: minAltitude,
  };

  const solved = solveTrajectory_(spec);

  if ('error' in solved) {
    missileManager.lastMissileErrorType = solved.errorType;
    missileManager.lastMissileError = solved.error;

    return 0;
  }

  const { trajectory } = solved;
  const written = writeMissileToSlot_(
    MissileObjectNum,
    trajectory.latList,
    trajectory.lonList,
    trajectory.altList,
    trajectory.maxAltitudeKm,
    CurrentTime,
    MissileDesc,
    country,
  );

  if (written) {
    missileManager.missileArray = missileArray;

    // Expand the scenario timeline to cover this missile alongside every other active one
    // (earliest launch → latest impact across all custom missiles).
    boundScenarioToActiveMissiles_();
  }
  missileManager.missilesInUse++;
  missileManager.lastMissileErrorType = ToastMsgType.normal;
  missileManager.lastMissileError = `Missile Named RV_${MissileObjectNum}<br>has been created.`;

  return 1; // Successful Launch
};

/**
 * Spawns a MIRV (Multiple Independently-targetable Reentry Vehicle) attack: one
 * shared "bus" trajectory to the primary aimpoint, then `warheadCount` reentry
 * vehicles that separate at apogee and fan out across a footprint of nearby
 * aimpoints. Each RV is written to its own catalog slot (so the missile
 * reservation, settingsManager.maxMissiles, counts every RV).
 *
 * For `warheadCount <= 1` this defers to a single normal launch. Returns the
 * number of reentry vehicles actually created (0 on validation/range failure).
 */
export const MirvAttack = (params: MirvLaunchParams): number => {
  const catalogManagerInstance = ServiceLocator.getCatalogManager();

  if (isMassRaidLoaded) {
    clearMissiles();
  }

  const count = Math.max(1, Math.min(12, Math.floor(params.warheadCount)));
  const boundsError = validateLaunchBounds_(params.launchLatitude, params.launchLongitude, params.targetLatitude, params.targetLongitude);

  if (boundsError) {
    missileManager.lastMissileErrorType = ToastMsgType.critical;
    missileManager.lastMissileError = boundsError;

    return 0;
  }

  if (missileManager.missilesInUse + count > settingsManager.maxMissiles) {
    missileManager.lastMissileErrorType = ToastMsgType.critical;
    missileManager.lastMissileError = 'Error: Maximum number of missiles<br>have been reached.';

    return 0;
  }

  // The bus carries every warhead during ascent, so size its mass with the full count.
  const busSpec: MissileSpec = {
    launchLatitude: params.launchLatitude,
    launchLongitude: params.launchLongitude,
    targetLatitude: params.targetLatitude,
    targetLongitude: params.targetLongitude,
    numberOfWarheads: count,
    missileObjectNum: 0,
    startTime: params.startTime,
    description: params.description,
    length: params.length || 17,
    diameter: params.diameter || 3.1,
    burnRate: params.burnRate,
    maxRangeKm: params.maxRangeKm,
    country: params.country,
    minAltitudeKm: params.minAltitudeKm ?? 0,
  };

  const solved = solveTrajectory_(busSpec);

  if ('error' in solved) {
    missileManager.lastMissileErrorType = solved.errorType;
    missileManager.lastMissileError = solved.error;

    return 0;
  }

  const bus = solved.trajectory;
  const sepIdx = findSeparationIndex(bus.altList);
  const footprint = generateFootprint(params.targetLatitude, params.targetLongitude, count, params.spreadKm ?? MIRV_DEFAULT_SPREAD_KM);
  const base = catalogManagerInstance.missileSats - settingsManager.maxMissiles + missileManager.missilesInUse;
  let created = 0;

  for (let i = 0; i < count; i++) {
    const aim = footprint[i];
    const rv = retargetDescent(bus.latList, bus.lonList, bus.altList, sepIdx, aim.lat - params.targetLatitude, aim.lon - params.targetLongitude);
    const desc = count > 1 ? `${params.description} (RV ${i + 1}/${count})` : params.description;
    const written = writeMissileToSlot_(
      base + created,
      rv.latList as Degrees[],
      rv.lonList as Degrees[],
      rv.altList as Kilometers[],
      bus.maxAltitudeKm,
      params.startTime,
      desc,
      params.country,
    );

    if (written) {
      // Every RV but the primary (index 0) rides the shared bus track during ascent,
      // so hide it until the vehicles separate at apogee: the MIRV reads as a single
      // missile on the way up and fans into N reentry vehicles after separation.
      written.hideUntilSeparation = i > 0;
      // Tag every RV with the full load so the ascent object resolves to the deploy
      // mesh that shows this many reentry vehicles.
      written.warheadCount = count;
      created++;
    }
  }

  if (created > 0) {
    missileManager.missilesInUse += created;
    missileManager.missileArray = missileArray;
    boundScenarioToActiveMissiles_();
  }

  missileManager.lastMissileErrorType = ToastMsgType.normal;
  missileManager.lastMissileError = `${created} reentry vehicle(s) (MIRV)<br>have been created.`;

  return created;
};

/**
 * Calculates the current TEARR (Target Elevation, Azimuth, Range, and Range Rate) data for a given missile object and sensor(s).
 * @param missile - The missile object for which to calculate the TEARR data.
 * @param sensors - An optional array of sensor objects to use for the calculation. If not provided, the current sensor(s) will be used.
 * @returns An object containing the current TEARR data for the missile.
 */
export const getMissileTEARR = (missile: MissileObject, sensors?: DetailedSensor[]) => {
  const timeManagerInstance = ServiceLocator.getTimeManager();

  const currentTEARR = {
    objName: '',
    time: '',
    alt: 0 as Kilometers,
    lon: 0 as Degrees,
    lat: 0 as Degrees,
    az: 0 as Degrees,
    el: 0 as Degrees,
    rng: 0 as Kilometers,
    inView: false,
  }; // Most current TEARR data that is set in satellite object and returned.
  const now = timeManagerInstance.simulationTimeObj;
  let j = jday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
  ); // Converts time to jday (TLEs use epoch year/day)

  j += now.getUTCMilliseconds() * MILLISECONDS_TO_DAYS;
  const gmst = Sgp4.gstime(j);

  // If no sensor passed to function then try to use the 'currentSensor'
  if (typeof sensors === 'undefined') {
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    if (typeof sensorManagerInstance.currentSensors === 'undefined') {
      throw new Error('getTEARR requires a sensor or for a sensor to be currently selected.');
    } else {
      sensors = sensorManagerInstance.currentSensors;
    }
  }

  // TODO: We should return an array
  const sensor = sensors[0];

  let curMissileTime;

  for (let t = 0; t < missile.altList.length; t++) {
    if (missile.startTime + t * 1000 > now.getTime()) {
      curMissileTime = t;
      break;
    }
  }

  // The missile is not in flight at the current sim time (pre-launch or post-impact):
  // there is no trajectory sample to read, so return the zeroed, not-in-view TEARR
  // rather than indexing the lists with `undefined` and producing NaN angles.
  if (typeof curMissileTime === 'undefined') {
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    if (sensorManagerInstance) {
      sensorManagerInstance.currentTEARR = currentTEARR;
    }

    return currentTEARR;
  }

  const cosLat = Math.cos(missile.latList[curMissileTime] * DEG2RAD);
  const sinLat = Math.sin(missile.latList[curMissileTime] * DEG2RAD);
  const cosLon = Math.cos(missile.lonList[curMissileTime] * DEG2RAD + gmst);
  const sinLon = Math.sin(missile.lonList[curMissileTime] * DEG2RAD + gmst);

  const x = <Kilometers>((RADIUS_OF_EARTH + missile.altList[curMissileTime]) * cosLat * cosLon);
  const y = <Kilometers>((RADIUS_OF_EARTH + missile.altList[curMissileTime]) * cosLat * sinLon);
  const z = <Kilometers>((RADIUS_OF_EARTH + missile.altList[curMissileTime]) * sinLat);

  let lookAngles, positionEcf;

  try {
    const gpos = eci2lla({ x, y, z }, gmst);

    currentTEARR.alt = gpos.alt;
    currentTEARR.lon = gpos.lon;
    currentTEARR.lat = gpos.lat;
    positionEcf = eci2ecef({ x, y, z }, gmst);
    lookAngles = ecefRad2rae(sensor.llaRad(), positionEcf);
    currentTEARR.az = lookAngles.az * RAD2DEG as Degrees;
    currentTEARR.el = lookAngles.el * RAD2DEG as Degrees;
    currentTEARR.rng = lookAngles.rng;
  } catch {
    currentTEARR.alt = 0 as Kilometers;
    currentTEARR.lon = 0 as Degrees;
    currentTEARR.lat = 0 as Degrees;
    currentTEARR.az = 0 as Degrees;
    currentTEARR.el = 0 as Degrees;
    currentTEARR.rng = 0 as Kilometers;
  }

  // Check if satellite is in field of view of a sensor.
  const hasSecondaryFov = sensor.minAz2 !== undefined && sensor.maxAz2 !== undefined &&
    sensor.minEl2 !== undefined && sensor.maxEl2 !== undefined &&
    sensor.minRng2 !== undefined && sensor.maxRng2 !== undefined;

  if (sensor.minAz > sensor.maxAz) {
    const inPrimaryFov = (currentTEARR.az >= sensor.minAz || currentTEARR.az <= sensor.maxAz) &&
      currentTEARR.el >= sensor.minEl &&
      currentTEARR.el <= sensor.maxEl &&
      currentTEARR.rng <= sensor.maxRng &&
      currentTEARR.rng >= sensor.minRng;

    const inSecondaryFov = hasSecondaryFov &&
      (currentTEARR.az >= sensor.minAz2! || currentTEARR.az <= sensor.maxAz2!) &&
      currentTEARR.el >= sensor.minEl2! &&
      currentTEARR.el <= sensor.maxEl2! &&
      currentTEARR.rng <= sensor.maxRng2! &&
      currentTEARR.rng >= sensor.minRng2!;

    currentTEARR.inView = inPrimaryFov || inSecondaryFov;
  } else {
    const inPrimaryFov = currentTEARR.az >= sensor.minAz &&
      currentTEARR.az <= sensor.maxAz &&
      currentTEARR.el >= sensor.minEl &&
      currentTEARR.el <= sensor.maxEl &&
      currentTEARR.rng <= sensor.maxRng &&
      currentTEARR.rng >= sensor.minRng;

    const inSecondaryFov = hasSecondaryFov &&
      currentTEARR.az >= sensor.minAz2! &&
      currentTEARR.az <= sensor.maxAz2! &&
      currentTEARR.el >= sensor.minEl2! &&
      currentTEARR.el <= sensor.maxEl2! &&
      currentTEARR.rng <= sensor.maxRng2! &&
      currentTEARR.rng >= sensor.minRng2!;

    currentTEARR.inView = inPrimaryFov || inSecondaryFov;
  }

  const sensorManagerInstance = ServiceLocator.getSensorManager();

  if (sensorManagerInstance) {
    sensorManagerInstance.currentTEARR = currentTEARR;
  }

  return currentTEARR;
};

export type MissileManager = typeof missileManager;
const missileManager = {
  isLoaded: true,
  lastMissileErrorType: <ToastMsgType>'',
  missilesInUse: 0,
  lastMissileError: '',
  RussianICBM,
  ChinaICBM,
  NorthKoreanBM,
  UsaICBM,
  FraSLBM,
  ukSLBM,
  globalBMTargets,
  USATargets,
  missileArray,
  clearMissiles,
  createMissile: Missile,
  createMirvAttack: MirvAttack,
  massRaidPre: MassRaidPre,
  getMissileTEARR,
};

export { missileManager };
