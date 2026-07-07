import { DEG2RAD, Degrees, getDayOfYear, Kilometers, Radians, TAU } from '@ootk/src/main';
import { RADIUS_OF_EARTH, ZOOM_EXP } from './constants';

/**
 * This function normalizes the angle to be between -TAU/2 and TAU/2.
 */
export const normalizeAngle = (angle: Radians): Radians => {
  let normalizedAngle = angle % TAU;

  if (normalizedAngle > TAU / 2) {
    normalizedAngle -= TAU;
  }
  if (normalizedAngle < -TAU / 2) {
    normalizedAngle += TAU;
  }

  return <Radians>normalizedAngle;
};

/**
 * This function converts longitude in degrees to yaw in radians for the camera.
 */
export const lon2yaw = (lon: Degrees, selectedDate: Date): Radians => {
  const realTime = new Date();
  let propTime = new Date();

  /*
   * NOTE: camera formula sometimes is incorrect, but has been stable for over a year
   * NOTE: Looks wrong again as of 8/29/2020 - time of year issue?
   * NOTE: Could camera be related to daylight savings time? Subtracting one hour from selected date works
   */
  const doy = getDayOfYear(selectedDate);
  const modifier = 1000 * 60 * 60 * (-11.23 + 0.065666667 * doy);

  propTime.setUTCHours(selectedDate.getUTCHours());
  // + (selectedDate.getUTCMonth() * 2 - 11) / 2); // Offset has to account for time of year. Add 2 Hours per month into the year starting at -12.
  propTime.setUTCMinutes(selectedDate.getUTCMinutes());
  propTime.setUTCSeconds(selectedDate.getUTCSeconds());
  propTime = new Date(propTime.getTime() * 1 + modifier);

  realTime.setUTCHours(0, 0, 0, 0);
  const longOffset = (((propTime.getTime() - realTime.getTime()) / 60 / 60 / 1000) % 24) * 15; // 15 Degress Per Hour longitude Offset

  return normalizeAngle(<Radians>((lon + longOffset) * DEG2RAD));
};
/**
 * This function converts latitude in degrees to pitch in radians.
 */
export const lat2pitch = (lat: Degrees): Radians => {
  const QUARTER_TAU = TAU / 4;

  let pitch = lat * DEG2RAD;

  pitch = Math.min(Math.max(pitch, -QUARTER_TAU), QUARTER_TAU);

  return <Radians>pitch;
};

/**
 * This function converts altitude in kilometers to a zoom level between MIN_ZOOM_LEVEL and MAX_ZOOM_LEVEL for the camera.
 */
export const alt2zoom = (alt: Kilometers, minZoomDistance: Kilometers, maxZoomDistance: Kilometers, minDistanceFromSatellite: Kilometers): number => {
  if (minZoomDistance > maxZoomDistance) {
    throw new Error('minZoomDistance must be less than maxZoomDistance');
  }

  // Clamp so low-altitude satellites (below minZoomDistance) return 0 instead of NaN
  const distanceFromCenter = Math.max(alt + RADIUS_OF_EARTH + minDistanceFromSatellite, minZoomDistance);
  const zoomLevel = ((distanceFromCenter - minZoomDistance) / (maxZoomDistance - minZoomDistance)) ** (1 / ZOOM_EXP);

  return Math.min(Math.max(zoomLevel, 0), 1);
};

/** Default bounding radii (meters) used when an object carries no usable size metadata. */
const DEFAULT_RADIUS_M = {
  rocketBody: 5,
  payload: 2,
  debris: 0.3,
} as const;

/**
 * Estimate an object's bounding radius (km) from catalog metadata, for scaling the minimum
 * camera standoff so the camera can approach small objects at true physical scale. Priority:
 * explicit dimensions (span/length/diameter, in meters) → RCS-derived (m² → equivalent-area
 * radius) → object-type default. span/length/diameter are catalog strings that may be empty.
 */
export const estimateObjectRadiusKm = (dims: {
  span?: string | null;
  length?: string | null;
  diameter?: string | null;
  rcs?: number | null;
  isRocketBody?: boolean;
  isPayload?: boolean;
}): Kilometers => {
  const meters = [dims.span, dims.length, dims.diameter]
    .map((v) => (typeof v === 'string' ? Number.parseFloat(v) : Number.NaN))
    .filter((v) => Number.isFinite(v) && v > 0);

  let radiusM: number;

  if (meters.length > 0) {
    radiusM = Math.max(...meters) / 2;
  } else if (typeof dims.rcs === 'number' && dims.rcs > 0) {
    radiusM = Math.sqrt(dims.rcs / Math.PI);
  } else if (dims.isRocketBody) {
    radiusM = DEFAULT_RADIUS_M.rocketBody;
  } else if (dims.isPayload) {
    radiusM = DEFAULT_RADIUS_M.payload;
  } else {
    radiusM = DEFAULT_RADIUS_M.debris;
  }

  return (radiusM / 1000) as Kilometers;
};

/**
 * Minimum camera standoff (km) for an object of the given bounding radius: three times the
 * radius so the whole object stays in frame, floored at 2 m so the camera never lands inside a
 * point-like target. This is the zoom-in floor (closest the camera may get), not the initial
 * framing distance - see initialFramingDistanceKm.
 */
export const targetStandoffDistanceKm = (radiusKm: Kilometers): Kilometers =>
  Math.max(3 * radiusKm, 0.002) as Kilometers;

/**
 * Initial camera framing distance (km) when a satellite is selected: six times the radius so the
 * object sits comfortably in frame with room to zoom in, but floored at 30 m so small objects are
 * not framed uncomfortably close (the user should not have to zoom out after selecting). Large
 * objects scale with 6x radius; small objects are lifted off by the floor. Always at least the
 * standoff minimum, so the camDistBuffer clamp never has to raise it.
 */
export const initialFramingDistanceKm = (radiusKm: Kilometers): Kilometers =>
  Math.max(6 * radiusKm, 0.03) as Kilometers;

const isLeapYear_ = (dateIn: Date) => {
  const year = dateIn.getUTCFullYear();

  if ((year & 3) !== 0) {
    return false;
  }

  return year % 100 !== 0 || year % 400 === 0;
};

/**
 * Calculate the julian day from a calendar date.
 */
export const jday = (year: number, month: number, day: number, hour: number, minute: number, second: number): number => {
  // Any negative values throw an error
  if (year < 0 || month < 1 || day < 0 || hour < 0 || minute < 0 || second < 0) {
    throw new Error('Invalid negative value');
  }
  // Validate month
  if (month > 12) {
    throw new Error('Invalid month value');
  }
  // Validate day
  if (day > 31) {
    throw new Error('Invalid day value');
  }
  // Validate hour
  if (hour > 23) {
    throw new Error('Invalid hour value');
  }
  // Validate minute
  if (minute > 59) {
    throw new Error('Invalid minute value');
  }
  // Validate second
  if (second > 60) {
    throw new Error('Invalid second value');
  }

  return (
    367.0 * year -
    Math.trunc(7 * (year + Math.trunc((month + 9) / 12.0)) * 0.25) +
    Math.trunc((275 * month) / 9.0) +
    day +
    1721013.5 +
    ((second / 60.0 + minute) / 60.0 + hour) / 24.0
  );
};

/**
 * Converts a local date to a zulu (UTC) date.
 */
export const localToZulu = (date: Date) => new Date(date.toISOString());

export const dateFromJday = (year: number, day: number): Date => {
  if (year < 0) {
    throw new Error('Invalid negative value');
  }
  if (day < 1 || day > 366) {
    throw new Error('Invalid day value');
  }

  const date = new Date(Date.UTC(year, 0)); // initialize a date in `year-01-01` in UTC

  if (isLeapYear_(date)) {
    if (day > 366) {
      throw new Error('Invalid day value');
    }
  } else if (day > 365) {
    throw new Error('Invalid day value');
  }

  return new Date(date.setUTCDate(day)); // set the UTC date to the specified day
};

/**
 * Normalize a longitude in radians to [-PI, PI].
 * Mirrors the GLSL: mod(lon + PI, 2.0 * PI) - PI
 */
export const wrapLon = (lon: number): number => {
  const TWO_PI = 2 * Math.PI;
  // JS % can return negative values, so add TWO_PI to ensure positive modulus
  const result = ((lon + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;

  return result;
};

/**
 * Convert an ECI (or ECEF) position to flat-map X coordinate.
 * Mirrors the vertex shader logic in line-manager.ts.
 *
 * @param eciX - ECI X component (km)
 * @param eciY - ECI Y component (km)
 * @param gmst - Greenwich Mean Sidereal Time (radians), 0 for ECEF mode
 * @param earthRadius - Earth radius (km)
 * @param flatMapCenterX - Camera pan center X (km)
 * @returns The wrapped flat-map X coordinate (km)
 */
export const eciToFlatMapX = (
  eciX: number,
  eciY: number,
  gmst: number,
  earthRadius: number,
  flatMapCenterX: number,
): number => {
  const lon = wrapLon(Math.atan2(eciY, eciX) - gmst);
  const mapW = 2 * Math.PI * earthRadius;
  const rawX = lon * earthRadius;

  return flatMapCenterX + (((rawX - flatMapCenterX + mapW * 0.5) % mapW) + mapW) % mapW - mapW * 0.5;
};

/**
 * Determine whether a flat-map line fragment should be discarded due to
 * antimeridian crossing. Mirrors the two-check discard logic in the
 * line-manager fragment shader.
 *
 * @param interpolatedFlatX - Linearly interpolated flat X between two vertices (km)
 * @param interpolatedEci - Linearly interpolated ECI position [x, y] (km)
 * @param gmst - Greenwich Mean Sidereal Time (radians), 0 for ECEF mode
 * @param earthRadius - Earth radius (km)
 * @param flatMapCenterX - Camera pan center X (km)
 * @returns true if the fragment should be discarded (antimeridian crossing artifact)
 */
export const shouldDiscardFlatMapFragment = (
  interpolatedFlatX: number,
  interpolatedEci: [number, number],
  gmst: number,
  earthRadius: number,
  flatMapCenterX: number,
): boolean => {
  const mapW = 2 * Math.PI * earthRadius;
  const recomputedFlatX = eciToFlatMapX(interpolatedEci[0], interpolatedEci[1], gmst, earthRadius, flatMapCenterX);

  // Check 1: position divergence (matches shader threshold of mapW * 0.02)
  if (Math.abs(interpolatedFlatX - recomputedFlatX) > mapW * 0.02) {
    return true;
  }

  return false;
};

export const dateToLocalInIso = (date: Date): string => {
  const offsetMs = -date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() + offsetMs);
  const iso = localDate.toISOString().replace('T', ' ');


  return `${iso.slice(0, 19)} ${iso.slice(25, 31)}`;
};
