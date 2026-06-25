import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import {
  ClassicalElements,
  DEG2RAD,
  Degrees,
  EpochUTC,
  Geodetic,
  ITRF,
  J2000,
  Kilometers,
  KilometersPerSecond,
  RadecGeocentric,
  Radians,
  RaeVec3,
  TEME,
  Vector3D,
  eci2rae,
  rae2eci,
} from '@ootk/src/main';

/** Coordinate frames the calculator can convert between. */
export enum CoordFrame {
  J2000 = 'J2000',
  ITRF = 'ITRF',
  TEME = 'TEME',
  LLA = 'LLA',
  RAE = 'RAE',
  RADEC = 'RaDec',
  CLASSICAL = 'Classical',
}

/** Output value formatting modes. */
export enum OutputFormat {
  FIXED_4 = '4',
  FIXED_6 = '6',
  FIXED_8 = '8',
  SCIENTIFIC = 'sci',
  DMS = 'dms',
}

/** Cartesian (position-only) frames where a velocity vector is meaningful. */
export const CARTESIAN_FRAMES: readonly CoordFrame[] = [CoordFrame.J2000, CoordFrame.ITRF, CoordFrame.TEME];

/** Parsed numeric inputs keyed by field id (e.g. `x`, `lat`, `sma`). */
export type FrameInputValues = Record<string, number>;

/** Time + sensor context shared by every conversion. */
export interface ConversionContext {
  epoch: EpochUTC;
  /** Simulation time as a Date, used by the RAE topocentric transforms. */
  date: Date;
  gmst: number;
  /** Required for RAE input; optional otherwise (RAE output is skipped without it). */
  sensor?: DetailedSensor | null;
}

/** A position/velocity readout in a cartesian frame. */
export interface CartesianOutput {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
}

/** Structured numeric result of a conversion, one entry per output frame. */
export interface FrameOutputs {
  j2000?: CartesianOutput;
  itrf?: CartesianOutput;
  teme?: CartesianOutput;
  lla?: { lat: number; lon: number; alt: number };
  /** null when no sensor is available. */
  rae?: { range: number; az: number; el: number; sensorName: string } | null;
  radec?: { ra: number; dec: number; range: number };
  /** 'needsVelocity' when the state has no usable velocity. */
  classical?: 'needsVelocity' | {
    sma: number; ecc: number; inc: number; raan: number; argpe: number;
    nu: number; period: number; apogee: number; perigee: number;
  };
}

const ZERO_VEL = Vector3D.origin as Vector3D<KilometersPerSecond>;

/** Velocities below this magnitude (km/s) can't define an orbit, so Classical output is skipped. */
const MIN_ORBITAL_VELOCITY = 0.001;

const toCartesian = (pos: Vector3D<Kilometers>, vel: Vector3D<KilometersPerSecond>): CartesianOutput => ({
  x: pos.x, y: pos.y, z: pos.z, vx: vel.x, vy: vel.y, vz: vel.z,
});

const vec = (v: FrameInputValues, kx: string, ky: string, kz: string): Vector3D<Kilometers> =>
  new Vector3D<Kilometers>(v[kx] as Kilometers, v[ky] as Kilometers, v[kz] as Kilometers);

/**
 * Validate parsed inputs for a frame. Returns an error key (under
 * `plugins.Calculator.errorMsgs.*`) when invalid, or null when valid.
 */
export function validateFrameInput(frame: CoordFrame, values: FrameInputValues): string | null {
  for (const key of Object.keys(values)) {
    if (!Number.isFinite(values[key])) {
      return 'invalidNumber';
    }
  }

  if (frame === CoordFrame.CLASSICAL) {
    if (values.ecc < 0 || values.ecc >= 1) {
      return 'badEccentricity';
    }
    if (values.sma <= 0) {
      return 'badSemiMajorAxis';
    }
  }

  return null;
}

/** Convert a parsed input bag (in `frame`) into a J2000 state vector. */
export function frameInputToJ2000(frame: CoordFrame, values: FrameInputValues, ctx: ConversionContext): J2000 {
  const { epoch } = ctx;
  const cartesianVel = (): Vector3D<KilometersPerSecond> =>
    (CARTESIAN_FRAMES.includes(frame) && ('vx' in values)
      ? new Vector3D<KilometersPerSecond>(values.vx as KilometersPerSecond, values.vy as KilometersPerSecond, values.vz as KilometersPerSecond)
      : ZERO_VEL);

  switch (frame) {
    case CoordFrame.J2000:
      return new J2000(epoch, vec(values, 'x', 'y', 'z'), cartesianVel());
    case CoordFrame.ITRF:
      return new ITRF(epoch, vec(values, 'x', 'y', 'z'), cartesianVel()).toJ2000();
    case CoordFrame.TEME:
      return new TEME(epoch, vec(values, 'x', 'y', 'z'), cartesianVel()).toJ2000();
    case CoordFrame.LLA:
      return Geodetic.fromDegrees(values.lat as Degrees, values.lon as Degrees, values.alt as Kilometers).toITRF(epoch).toJ2000();
    case CoordFrame.RAE: {
      if (!ctx.sensor) {
        throw new Error('noSensorForRae');
      }
      const rae = { rng: values.r, az: values.a, el: values.e } as RaeVec3<Kilometers, Degrees>;
      const eci = rae2eci(rae, ctx.sensor.lla(), ctx.gmst);

      return new J2000(epoch, new Vector3D<Kilometers>(eci.x, eci.y, eci.z), ZERO_VEL);
    }
    case CoordFrame.RADEC: {
      const range = values.range as Kilometers;
      const radec = RadecGeocentric.fromDegrees(epoch, values.ra as Degrees, values.dec as Degrees, range);

      return new J2000(epoch, radec.position(range), ZERO_VEL);
    }
    case CoordFrame.CLASSICAL:
      return new ClassicalElements({
        epoch,
        semimajorAxis: values.sma as Kilometers,
        eccentricity: values.ecc,
        inclination: (values.inc * DEG2RAD) as Radians,
        rightAscension: (values.raan * DEG2RAD) as Radians,
        argPerigee: (values.argpe * DEG2RAD) as Radians,
        trueAnomaly: (values.nu * DEG2RAD) as Radians,
      }).toJ2000();
    default:
      throw new Error(`Unknown input frame: ${frame}`);
  }
}

/**
 * Derive every output frame from a J2000 state. The `inputFrame` is skipped (you don't
 * convert a frame back to itself). The result is purely numeric, so callers can re-render
 * it under any {@link OutputFormat} without recomputing time-dependent transforms.
 */
export function j2000ToAllFrames(j2000: J2000, inputFrame: CoordFrame, ctx: ConversionContext): FrameOutputs {
  const out: FrameOutputs = {};

  if (inputFrame !== CoordFrame.J2000) {
    out.j2000 = toCartesian(j2000.position, j2000.velocity);
  }
  if (inputFrame !== CoordFrame.ITRF) {
    const itrf = j2000.toITRF();

    out.itrf = toCartesian(itrf.position, itrf.velocity);
  }
  if (inputFrame !== CoordFrame.TEME) {
    const teme = j2000.toTEME();

    out.teme = toCartesian(teme.position, teme.velocity);
  }
  if (inputFrame !== CoordFrame.LLA) {
    const geo = j2000.toITRF().toGeodetic();

    out.lla = { lat: geo.latDeg, lon: geo.lonDeg, alt: geo.alt };
  }
  if (inputFrame !== CoordFrame.RAE) {
    out.rae = computeRae(j2000, ctx);
  }
  if (inputFrame !== CoordFrame.RADEC) {
    const radec = RadecGeocentric.fromStateVector(j2000);

    out.radec = { ra: radec.rightAscensionDegrees, dec: radec.declinationDegrees, range: j2000.position.magnitude() };
  }
  if (inputFrame !== CoordFrame.CLASSICAL) {
    out.classical = computeClassical(j2000);
  }

  return out;
}

/** Topocentric range/azimuth/elevation from the context sensor, or null without one. */
function computeRae(j2000: J2000, ctx: ConversionContext): FrameOutputs['rae'] {
  if (!ctx.sensor) {
    return null;
  }

  const teme = j2000.toTEME();
  const rae = eci2rae(ctx.date, { x: teme.position.x, y: teme.position.y, z: teme.position.z }, ctx.sensor);

  return { range: rae.rng, az: rae.az, el: rae.el, sensorName: ctx.sensor.name };
}

/** Keplerian elements (with period/apogee/perigee), or 'needsVelocity' for a velocity-less state. */
function computeClassical(j2000: J2000): FrameOutputs['classical'] {
  if (j2000.velocity.magnitude() < MIN_ORBITAL_VELOCITY) {
    return 'needsVelocity';
  }

  const ce = j2000.toClassicalElements();

  return {
    sma: ce.semimajorAxis,
    ecc: ce.eccentricity,
    inc: ce.inclinationDegrees,
    raan: ce.rightAscensionDegrees,
    argpe: ce.argPerigeeDegrees,
    nu: ce.trueAnomalyDegrees,
    period: ce.period,
    apogee: ce.apogee,
    perigee: ce.perigee,
  };
}

/**
 * Numeric field values for a single `frame` derived from a J2000 state, used to fill the
 * input fields when loading a selected satellite. Throws `'noSensorForRae'` if RAE is
 * requested without a sensor in the context.
 */
export function j2000ToFrameValues(j2000: J2000, frame: CoordFrame, ctx: ConversionContext): FrameInputValues {
  switch (frame) {
    case CoordFrame.J2000:
      return { x: j2000.position.x, y: j2000.position.y, z: j2000.position.z, vx: j2000.velocity.x, vy: j2000.velocity.y, vz: j2000.velocity.z };
    case CoordFrame.ITRF: {
      const itrf = j2000.toITRF();

      return { x: itrf.position.x, y: itrf.position.y, z: itrf.position.z, vx: itrf.velocity.x, vy: itrf.velocity.y, vz: itrf.velocity.z };
    }
    case CoordFrame.TEME: {
      const teme = j2000.toTEME();

      return { x: teme.position.x, y: teme.position.y, z: teme.position.z, vx: teme.velocity.x, vy: teme.velocity.y, vz: teme.velocity.z };
    }
    case CoordFrame.LLA: {
      const geo = j2000.toITRF().toGeodetic();

      return { lat: geo.latDeg, lon: geo.lonDeg, alt: geo.alt };
    }
    case CoordFrame.RAE: {
      const rae = computeRae(j2000, ctx);

      if (!rae) {
        throw new Error('noSensorForRae');
      }

      return { r: rae.range, a: rae.az, e: rae.el };
    }
    case CoordFrame.RADEC: {
      const radec = RadecGeocentric.fromStateVector(j2000);

      return { ra: radec.rightAscensionDegrees, dec: radec.declinationDegrees, range: j2000.position.magnitude() };
    }
    case CoordFrame.CLASSICAL: {
      const ce = ClassicalElements.fromStateVector(j2000);

      return { sma: ce.semimajorAxis, ecc: ce.eccentricity, inc: ce.inclinationDegrees, raan: ce.rightAscensionDegrees, argpe: ce.argPerigeeDegrees, nu: ce.trueAnomalyDegrees };
    }
    default:
      return {};
  }
}

/** Decimal degrees to a `D° M' S"` string. */
export function toDms(degrees: number): string {
  const sign = degrees < 0 ? '-' : '';
  const abs = Math.abs(degrees);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;

  return `${sign}${d}° ${m}' ${s.toFixed(2)}"`;
}

/** Format a numeric value under the given output format. DMS only applies to angles. */
export function formatValue(value: number, format: OutputFormat, isAngle = false): string {
  switch (format) {
    case OutputFormat.FIXED_4:
      return value.toFixed(4);
    case OutputFormat.FIXED_6:
      return value.toFixed(6);
    case OutputFormat.FIXED_8:
      return value.toFixed(8);
    case OutputFormat.SCIENTIFIC:
      return value.toExponential(6);
    case OutputFormat.DMS:
      return isAngle ? toDms(value) : value.toFixed(4);
    default:
      return value.toFixed(4);
  }
}
