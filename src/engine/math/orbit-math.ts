import { EciVec3, FormatTle, Kilometers, MINUTES_PER_DAY, Meters, RAD2DEG, TAU } from '@ootk/src/main';
import { StringifiedNumber } from '../../app/analysis/sat-math';
import { TimeManager } from '../core/time-manager';
import { EARTHS_GRAV_CONST, MASS_OF_EARTH } from '../utils/constants';
import { StringPad } from '../utils/stringPad';

export abstract class OrbitMath {
  public static stateVector2Tle(sv: { position: EciVec3; velocity: EciVec3; date: Date }): { tle1: string; tle2: string } {
    const pad0 = StringPad.pad0;
    const pos = [sv.position.x, sv.position.y, sv.position.z];
    const vel = [sv.velocity.x, sv.velocity.y, sv.velocity.z];

    const [epochyr, epochday] = TimeManager.currentEpoch(sv.date);
    // 8 character international designator
    const intl = '58001A  ';
    const scc = '00001';
    const inc = <StringifiedNumber>pad0(OrbitMath.calculateInclination(pos, vel).toFixed(4), 8);
    const rasc = <StringifiedNumber>pad0(OrbitMath.calculateRAAN(pos, vel).toFixed(4), 8);
    const ecen = OrbitMath.calculateEccentricity(pos, vel).toFixed(7).split('.')[1];
    const argPe = <StringifiedNumber>pad0(OrbitMath.calculateArgumentOfPerigee(pos, vel).toFixed(4), 8);
    const meana = <StringifiedNumber>pad0(OrbitMath.calculateMeanAnomaly(pos, vel).toFixed(4), 8);
    const meanmo = <StringifiedNumber>pad0(OrbitMath.calculateMeanMotion(pos, vel).toFixed(8), 11);

    return FormatTle.createTle({ inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc });
  }

  public static calculateEccentricity(position: Kilometers[], velocity: Kilometers[]): number {
    const WeightOfSatellite = 1; // This doesn't really matter compared to earth's mass

    const rx = <Meters>(position[0] * 1000);
    const ry = <Meters>(position[1] * 1000);
    const rz = <Meters>(position[2] * 1000);
    const vx = <Meters>(velocity[0] * 1000);
    const vy = <Meters>(velocity[1] * 1000);
    const vz = <Meters>(velocity[2] * 1000);

    const mu = EARTHS_GRAV_CONST * (WeightOfSatellite + MASS_OF_EARTH);
    const r = OrbitMath.magnitude([rx, ry, rz]);
    const v = OrbitMath.magnitude([vx, vy, vz]);
    const semiMajorAxis = 1 / (2 / r - (v * v) / mu);

    const hx = ry * vz - rz * vy;
    const hy = rz * vx - rx * vz;
    const hz = rx * vy - ry * vx;
    const h = OrbitMath.magnitude([hx, hy, hz]);

    const p = (h * h) / mu;

    return Math.sqrt(1 - p / semiMajorAxis);
  }

  public static calculateInclination(position: number[], velocity: number[]): number {
    const rx = <Meters>(position[0] * 1000);
    const ry = <Meters>(position[1] * 1000);
    const rz = <Meters>(position[2] * 1000);
    const vx = <Meters>(velocity[0] * 1000);
    const vy = <Meters>(velocity[1] * 1000);
    const vz = <Meters>(velocity[2] * 1000);

    const hx = ry * vz - rz * vy;
    const hy = rz * vx - rx * vz;
    const hz = rx * vy - ry * vx;
    const h = OrbitMath.magnitude([hx, hy, hz]);

    return Math.acos(hz / h) * RAD2DEG;
  }

  public static calculateMeanAnomaly(position: number[], velocity: number[]): number {
    const WeightOfSatellite = 1; // This doesn't really matter compared to earth's mass

    const rx = <Meters>(position[0] * 1000);
    const ry = <Meters>(position[1] * 1000);
    const rz = <Meters>(position[2] * 1000);
    const vx = <Meters>(velocity[0] * 1000);
    const vy = <Meters>(velocity[1] * 1000);
    const vz = <Meters>(velocity[2] * 1000);

    const mu = EARTHS_GRAV_CONST * (WeightOfSatellite + MASS_OF_EARTH);
    const r = OrbitMath.magnitude([rx, ry, rz]);
    const v = OrbitMath.magnitude([vx, vy, vz]);
    const semiMajorAxis = 1 / (2 / r - (v * v) / mu);

    const hx = ry * vz - rz * vy;
    const hy = rz * vx - rx * vz;
    const hz = rx * vy - ry * vx;
    const h = OrbitMath.magnitude([hx, hy, hz]);

    const p = (h * h) / mu;
    const q = rx * vx + ry * vy + rz * vz; // dot product of r*v

    const eccentricity = Math.sqrt(1 - p / semiMajorAxis);

    const ex = 1 - r / semiMajorAxis;
    const ey = q / Math.sqrt(semiMajorAxis * mu);
    const u = OrbitMath.arctan2(ey, ex);


    return ((u - eccentricity * Math.sin(u)) * RAD2DEG) % 360;
  }

  private static arctan2(y: number, x: number): number {
    let u: number;

    if (x !== 0) {
      u = Math.atan(y / x);
      if (x < 0) {
        u += Math.PI;
      }
      if (x > 0 && y < 0) {
        u += TAU;
      }
    } else {
      if (y < 0) {
        u = -Math.PI / 2;
      }
      if (y === 0) {
        u = 0;
      }
      if (y > 0) {
        u = Math.PI / 2;
      }
    }

    return u;
  }

  // Calculate Mean Motion from position and velocity
  public static calculateMeanMotion(position: number[], velocity: number[]): number {
    const WeightOfSatellite = 1; // This doesn't really matter compared to earth's mass

    const rx = <Meters>(position[0] * 1000);
    const ry = <Meters>(position[1] * 1000);
    const rz = <Meters>(position[2] * 1000);
    const vx = <Meters>(velocity[0] * 1000);
    const vy = <Meters>(velocity[1] * 1000);
    const vz = <Meters>(velocity[2] * 1000);

    const mu = EARTHS_GRAV_CONST * (WeightOfSatellite + MASS_OF_EARTH);
    const r = OrbitMath.magnitude([rx, ry, rz]);
    const v = OrbitMath.magnitude([vx, vy, vz]);
    const semiMajorAxis = 1 / (2 / r - (v * v) / mu);

    const period = TAU * Math.sqrt((semiMajorAxis * semiMajorAxis * semiMajorAxis) / (EARTHS_GRAV_CONST * (WeightOfSatellite + MASS_OF_EARTH)));
    const periodInMinutes = period / 60;


    return MINUTES_PER_DAY / periodInMinutes;
  }

  public static calculateRAAN(position: number[], velocity: number[]): number {
    const rx = <Meters>(position[0] * 1000);
    const ry = <Meters>(position[1] * 1000);
    const rz = <Meters>(position[2] * 1000);
    const vx = <Meters>(velocity[0] * 1000);
    const vy = <Meters>(velocity[1] * 1000);
    const vz = <Meters>(velocity[2] * 1000);

    const angMomentum = OrbitMath.cross([rx, ry, rz], [vx, vy, vz]);


    return Math.atan2(angMomentum[0], -angMomentum[1]) * RAD2DEG;
  }

  public static calculateArgumentOfPerigee(position: number[], velocity: number[]): number {
    const WeightOfSatellite = 1; // This doesn't really matter compared to earth's mass

    const rx = <Meters>(position[0] * 1000);
    const ry = <Meters>(position[1] * 1000);
    const rz = <Meters>(position[2] * 1000);
    const vx = <Meters>(velocity[0] * 1000);
    const vy = <Meters>(velocity[1] * 1000);
    const vz = <Meters>(velocity[2] * 1000);

    const hx = ry * vz - rz * vy;
    const hy = rz * vx - rx * vz;
    const hz = rx * vy - ry * vx;
    const h = OrbitMath.magnitude([hx, hy, hz]);

    const mu = EARTHS_GRAV_CONST * (WeightOfSatellite + MASS_OF_EARTH);
    const r = OrbitMath.magnitude([rx, ry, rz]);

    const q = rx * vx + ry * vy + rz * vz; // dot product of r*v

    const inclination = Math.acos(hz / h);
    let raan = 0;

    if (inclination !== 0) {
      raan = OrbitMath.arctan2(hx, -hy);
    }

    const tax = (h * h) / (r * mu) - 1;
    const tay = (h * q) / (r * mu);
    const ta = OrbitMath.arctan2(tay, tax);
    const cw = (rx * Math.cos(raan) + ry * Math.sin(raan)) / r;

    let sw = 0;

    if (inclination === 0 || inclination === Math.PI) {
      sw = (ry * Math.cos(raan) - rx * Math.sin(raan)) / r;
    } else {
      sw = rz / (r * Math.sin(inclination));
    }

    let argPe = OrbitMath.arctan2(sw, cw) - ta;

    if (argPe < 0) {
      argPe = TAU + argPe;
    }

    return (argPe * RAD2DEG) % 360;
  }

  public static cross(vector1: number[], vector2: number[]): number[] {
    const x = vector1[1] * vector2[2] - vector1[2] * vector2[1];
    const y = vector1[2] * vector2[0] - vector1[0] * vector2[2];
    const z = vector1[0] * vector2[1] - vector1[1] * vector2[0];

    return [x, y, z];
  }

  public static magnitude(vector: number[]): number {
    const squaredSum = vector.reduce((sum, component) => sum + component * component, 0);


    return Math.sqrt(squaredSum);
  }

  public static scalar(vector: number[], scalar: number): number[] {
    return vector.map((component) => component * scalar);
  }
}
