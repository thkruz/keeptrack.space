/* eslint-disable class-methods-use-this */
import { MissileParams } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import type { ClassicalElements } from '@app/engine/ootk/src/coordinate/ClassicalElements';
import type { ITRF } from '@app/engine/ootk/src/coordinate/ITRF';
import type { J2000 } from '@app/engine/ootk/src/coordinate/J2000';
import { calcGmst, DEG2RAD, Degrees, EcefVec3, eci2ecef, eci2lla, GreenwichMeanSiderealTime, Kilometers, lla2eci, LlaVec3, PosVel, Radians, SpaceObject, SpaceObjectParams, SpaceObjectType, TemeVec3, Vector3D } from '@ootk/src/main';
import { interpolateMissileSample } from '@app/plugins/missile/missile-interpolation';

export class MissileObject extends SpaceObject {
  type = SpaceObjectType.BALLISTIC_MISSILE;
  desc: string;
  latList: Degrees[];
  lonList: Degrees[];
  altList: Kilometers[];
  timeList: number[];
  startTime: number;
  maxAlt: number;
  country: string;
  launchVehicle: string;
  lastTime: number;

  /**
   * Full-resolution Earth-fixed (ECEF) orbit-line path ([x,y,z,alpha] per 1 Hz
   * trajectory sample), built once by getOrbitPath() and drawn directly (like
   * OemSatellite) so the line stays smooth up close instead of being sub-sampled to
   * orbitSegments chords. The orbit-line shader rotates it to ECI by the current
   * GMST each frame, so the track follows the ground rather than unwinding.
   */
  orbitPathCache_: Float32Array | null = null;
  private orbitPathCacheKey_ = '';

  private totalVelocity_: number = 0;

  /**
   * Mutable totalVelocity for missiles - overrides the computed getter in SpaceObject.
   * Missiles need smoothed velocity tracking during flight simulation.
   */
  override get totalVelocity(): number {
    return this.totalVelocity_;
  }

  set totalVelocity(value: number) {
    this.totalVelocity_ = value;
  }

  constructor(info: MissileParams & SpaceObjectParams) {
    super(info);
    this.id = info.id ?? 0;
    this.active = info.active;
    this.desc = info.desc;
    this.latList = info.latList;
    this.lonList = info.lonList;
    this.altList = info.altList;
    this.timeList = info.timeList;
    this.startTime = info.startTime;
    this.maxAlt = info.maxAlt;
    this.country = info.country;
    this.launchVehicle = info.launchVehicle;
  }

  isStatic(): boolean {
    return false;
  }

  isSatellite(): boolean {
    return false;
  }

  isMissile(): boolean {
    return true;
  }

  getAltitude(): Kilometers {
    const { gmst } = calcGmst(ServiceLocator.getTimeManager().simulationTimeObj);
    const eciResult = this.eci();

    if (!eciResult) {
      return 0 as Kilometers;
    }

    const eciPos: TemeVec3 = {
      x: eciResult.position.x,
      y: eciResult.position.y,
      z: eciResult.position.z,
    };

    const lla = eci2lla(eciPos, gmst);

    return lla.alt;
  }

  getTimeInTrajectory(): number {
    this.lastTime ??= 0;

    if (this.altList.length === 0) {
      this.lastTime = 0;

      return 0;
    }

    // First 1-second sample whose absolute time is at/after the current sim time.
    // Recomputed from the clock each call (rather than advanced from the previous
    // value) so scrubbing time *backwards* moves the index back too, keeping the
    // mesh manager's per-frame model resolution in sync with the trajectory.
    const elapsedSec = (ServiceLocator.getTimeManager().simulationTimeObj.getTime() - this.startTime) / 1000;
    const index = Math.ceil(elapsedSec);

    this.lastTime = Math.max(0, Math.min(index, this.altList.length - 1));

    return this.lastTime;
  }

  eci(_date?: Date): PosVel | null {
    const now = ServiceLocator.getTimeManager().simulationTimeObj;
    const { gmst } = calcGmst(now);

    if (this.altList.length === 0) {
      return null;
    }

    // Interpolate between 1-second samples so the position (and info-box readouts /
    // camera follow) is continuous rather than stepping once per second.
    const sample = interpolateMissileSample(this.latList, this.lonList, this.altList, this.startTime, now.getTime());

    const lla = {
      lat: (sample.lat * DEG2RAD) as Radians,
      lon: (sample.lon * DEG2RAD) as Radians,
      alt: sample.alt as Kilometers,
    };

    const eciPos = lla2eci(lla, gmst);

    // Update position cache
    this.position = {
      x: eciPos.x as Kilometers,
      y: eciPos.y as Kilometers,
      z: eciPos.z as Kilometers,
    };

    return {
      position: {
        x: eciPos.x as Kilometers,
        y: eciPos.y as Kilometers,
        z: eciPos.z as Kilometers,
      },
      velocity: {
        x: this.velocity.x,
        y: this.velocity.y,
        z: this.velocity.z,
      },
    };
  }

  /**
   * Get TEME position as Vector3D (for orbit rendering compatibility)
   */
  getEciVector3D(): Vector3D {
    const eciResult = this.eci();

    if (!eciResult) {
      return new Vector3D(0, 0, 0);
    }

    return new Vector3D(eciResult.position.x, eciResult.position.y, eciResult.position.z);
  }

  isGoingUp(): boolean {
    const t = this.getTimeInTrajectory();

    if (this.altList[t] > this.altList[t - 1]) {
      return true;
    }

    return false;

  }

  /**
   * MIRV children (every reentry vehicle except the primary/bus) share the bus
   * trajectory during ascent, so they sit exactly on top of the primary until the
   * vehicles separate at apogee. When true, this object is hidden until then, so a
   * MIRV reads as a single missile on the way up and fans into N RVs after
   * separation. Set at creation by MirvAttack.
   */
  hideUntilSeparation = false;

  /**
   * Total number of reentry vehicles this missile carries to apogee. Set at
   * creation by the MIRV paths (MirvAttack / mass-raid expansion) to the full
   * warhead load, so the mesh resolver can pick the deploy mesh (misl3-N/misl4-N)
   * that shows the right number of RVs during the reveal/separation window.
   * Non-MIRV missiles keep the default of 1.
   */
  warheadCount = 1;

  /**
   * Whether this object's dot and orbit line should render at the current sim time.
   * A MIRV child is hidden until the reentry vehicles separate (apogee); everything
   * else is always visible. Recomputed from the clock each call, so rewinding past
   * separation re-hides the children and collapses the spread back to one missile.
   */
  isVisibleNow(): boolean {
    return !this.hideUntilSeparation || this.getTimeInTrajectory() >= this.getApogeeIndex();
  }

  private apogeeIndexCache_ = -1;
  private apogeeIndexKey_ = '';

  /**
   * Trajectory sample index of apogee (the highest-altitude sample). For a MIRV
   * this is exactly where the reentry vehicles separate from the bus (see
   * `findSeparationIndex` in missile-mirv.ts); for any shot it is the natural
   * boundary between the ascending boost/bus phase and the descending reentry
   * phase, which the mesh resolver uses to pick the flight-phase model. Cached:
   * altList is written once at creation and not mutated afterward.
   */
  getApogeeIndex(): number {
    const key = `${this.altList.length}:${this.startTime}`;

    if (this.apogeeIndexCache_ >= 0 && this.apogeeIndexKey_ === key) {
      return this.apogeeIndexCache_;
    }

    let maxIdx = 0;

    for (let i = 1; i < this.altList.length; i++) {
      if (this.altList[i] > this.altList[maxIdx]) {
        maxIdx = i;
      }
    }

    this.apogeeIndexCache_ = maxIdx;
    this.apogeeIndexKey_ = key;

    return maxIdx;
  }

  /**
   * Unit ECI direction of travel at the current sim time, from the two trajectory
   * samples bracketing "now" (the same ellipsoidal lla2eci the dot and the orbit
   * line use). The mesh manager points the missile model's nose along this so the
   * mesh tracks the rendered trajectory instead of tumbling. Returns null when the
   * trajectory is too short or the bracketing samples coincide.
   */
  getVelocityDirection(): Vector3D | null {
    if (this.altList.length < 2) {
      return null;
    }

    const now = ServiceLocator.getTimeManager().simulationTimeObj;
    const { gmst } = calcGmst(now);
    const lastIdx = this.altList.length - 1;
    const elapsedSec = Math.max(0, Math.min((now.getTime() - this.startTime) / 1000, lastIdx));
    const i0 = Math.min(Math.floor(elapsedSec), lastIdx - 1);
    const i1 = i0 + 1;

    const toEci = (idx: number) => lla2eci(
      { lat: (this.latList[idx] * DEG2RAD) as Radians, lon: (this.lonList[idx] * DEG2RAD) as Radians, alt: this.altList[idx] },
      gmst,
    );
    const p0 = toEci(i0);
    const p1 = toEci(i1);
    const dir = new Vector3D(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
    const mag = Math.hypot(dir.x, dir.y, dir.z);

    if (mag === 0) {
      return null;
    }

    return new Vector3D(dir.x / mag, dir.y / mag, dir.z / mag);
  }

  /**
   * Earth-fixed (ECEF) orbit path as an [x,y,z,alpha] vertex array for the orbit
   * line, covering only the *un-flown remainder* of the trajectory: vertex 0 is
   * the object's current (interpolated) position and the rest are the remaining
   * full-resolution samples out to impact. The already-flown history is omitted,
   * so the red line starts at the dot and runs ahead of it (the way an in-flight
   * launch object reads) instead of trailing a stale path behind it.
   *
   * The samples are ground points (gmst = 0 yields the Earth-fixed position); the
   * orbit-line shader rotates the whole strip to ECI by the live GMST every frame
   * (forced ECF mode for missiles), so the track stays glued to the rotating Earth
   * like a map route instead of unwinding into an inertial loop over a long flight.
   * Alpha fades from the object toward impact. Dense so it stays smooth up close.
   *
   * Keyed on the current 1 Hz sample index as well as the trajectory identity, so
   * it rebuilds as the missile advances (and when the clock is scrubbed either
   * way) but stays cached between frames within the same second / while paused.
   */
  getOrbitPath(): Float32Array {
    const len = this.altList.length;
    const now = ServiceLocator.getTimeManager().simulationTimeObj.getTime();
    const elapsedSec = (now - this.startTime) / 1000;
    // First sample strictly ahead of "now"; the interpolated head vertex covers
    // the gap between the current position and that sample.
    const startIdx = Math.max(0, Math.min(Math.ceil(elapsedSec), len - 1));
    const key = `${len}:${this.startTime}:${startIdx}`;

    if (this.orbitPathCache_ && this.orbitPathCacheKey_ === key) {
      return this.orbitPathCache_;
    }

    if (len === 0) {
      this.orbitPathCache_ = new Float32Array(0);
      this.orbitPathCacheKey_ = key;

      return this.orbitPathCache_;
    }

    const toEcef = (lat: number, lon: number, alt: number) => lla2eci(
      { lat: (lat * DEG2RAD) as Radians, lon: (lon * DEG2RAD) as Radians, alt: alt as Kilometers },
      0 as GreenwichMeanSiderealTime,
    );

    const remaining = len - startIdx;
    const out = new Float32Array((remaining + 1) * 4);
    const fade = settingsManager.orbitFadeFactor;

    // Vertex 0: the current interpolated position, so the line begins at the dot.
    const head = interpolateMissileSample(this.latList, this.lonList, this.altList, this.startTime, now);
    const headEcef = toEcef(head.lat, head.lon, head.alt);

    out[0] = headEcef.x;
    out[1] = headEcef.y;
    out[2] = headEcef.z;
    out[3] = 1.0;

    for (let i = 0; i < remaining; i++) {
      const idx = startIdx + i;
      const ecef = toEcef(this.latList[idx], this.lonList[idx], this.altList[idx]);
      const o = (i + 1) * 4;

      out[o] = ecef.x;
      out[o + 1] = ecef.y;
      out[o + 2] = ecef.z;
      // Brightest at the object, fading toward impact.
      out[o + 3] = Math.min(fade * (remaining / (i + 1)), 1.0);
    }

    this.orbitPathCache_ = out;
    this.orbitPathCacheKey_ = key;

    return out;
  }

  // ==================== SpaceObject Abstract Method Implementations ====================

  ecef(date?: Date): EcefVec3<Kilometers> | null {
    const eciResult = this.eci(date);

    if (!eciResult) {
      return null;
    }

    const { gmst } = calcGmst(date ?? ServiceLocator.getTimeManager().simulationTimeObj);

    return eci2ecef(eciResult.position, gmst);
  }

  lla(date?: Date): LlaVec3<Degrees, Kilometers> | null {
    const eciResult = this.eci(date);

    if (!eciResult) {
      return null;
    }

    const { gmst } = calcGmst(date ?? ServiceLocator.getTimeManager().simulationTimeObj);
    const eciPos: TemeVec3 = {
      x: eciResult.position.x,
      y: eciResult.position.y,
      z: eciResult.position.z,
    };

    return eci2lla(eciPos, gmst);
  }

  toJ2000(_date?: Date): J2000 {
    throw new Error('MissileObject does not support J2000 coordinate conversion - missiles follow ballistic trajectories, not orbits.');
  }

  toITRF(_date?: Date): ITRF {
    throw new Error('MissileObject does not support ITRF coordinate conversion - missiles follow ballistic trajectories, not orbits.');
  }

  toClassicalElements(_date?: Date): ClassicalElements {
    throw new Error('MissileObject does not support classical orbital elements - missiles follow ballistic trajectories, not orbits.');
  }

  clone(_options?: Record<string, unknown>): MissileObject {
    return new MissileObject({
      id: this.id,
      name: this.name,
      active: this.active,
      desc: this.desc,
      latList: [...this.latList],
      lonList: [...this.lonList],
      altList: [...this.altList],
      timeList: [...this.timeList],
      startTime: this.startTime,
      maxAlt: this.maxAlt,
      country: this.country,
      launchVehicle: this.launchVehicle,
    });
  }

  protected serializeSpecific(): Record<string, unknown> {
    return {
      desc: this.desc,
      latList: this.latList,
      lonList: this.lonList,
      altList: this.altList,
      timeList: this.timeList,
      startTime: this.startTime,
      maxAlt: this.maxAlt,
      country: this.country,
      launchVehicle: this.launchVehicle,
    };
  }
}
