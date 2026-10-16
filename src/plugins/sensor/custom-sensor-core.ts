/**
 * Custom Sensor core: DOM-free validation and parameter building.
 *
 * Split out of `custom-sensor-plugin.ts` so the rules can be unit-tested without
 * jsdom (and without the SensorInfo `#sensor-type` DOM the plugin used to poke).
 * The plugin reads the form into a {@link CustomSensorFormValues}, calls
 * {@link buildCustomSensor}, and either surfaces the localized `errorKey` or
 * hands the returned params to `addSecondarySensor`.
 *
 * @license AGPL-3.0-or-later
 */

import { CUSTOM_SENSOR_DEFAULT_NAME, CUSTOM_SENSOR_OBJNAME_PREFIX, formatCustomSensorLocation, resolveCustomSensorName } from '@app/app/sensors/custom-sensor-identity';
import type { DetailedSensorParams } from '@app/app/sensors/DetailedSensor';
import {
  Degrees,
  ElevationMask,
  Kilometers,
  MAX_INTERPOLATED_MASK_EL,
  MAX_INTERPOLATED_MASK_VERTICES,
  MIN_INTERPOLATED_MASK_VERTICES,
  SpaceObjectType,
  ZoomValue,
} from '@ootk/src/main';

/** The four sensor archetypes the menu offers. */
export type CustomSensorType = 'Observer' | 'Optical' | 'Mechanical' | 'Phased Array Radar';

/** Raw numeric form values (already parsed from the input strings). */
export interface CustomSensorFormValues {
  uiName: string;
  type: string;
  lat: number;
  lon: number;
  alt: number;
  minAz: number;
  maxAz: number;
  minEl: number;
  maxEl: number;
  minRng: number;
  maxRng: number;
  /** Optional horizon mask text: `az,el` pairs, one per line or separated by semicolons. */
  mask?: string;
}

/** Error keys {@link parseMask} can report (under `plugins.CustomSensorPlugin.errorMsgs`). */
export type MaskErrorKey = 'maskBadPair' | 'maskTooFew' | 'maskTooMany' | 'maskDuplicateAz';

/** Result of {@link parseMask}. `error` is null when the text is valid (or blank). */
export interface ParsedMask {
  /** Vertices in input order; empty when the text is blank. */
  masks: ElevationMask[];
  error: MaskErrorKey | null;
  /** The offending pair text for `maskBadPair` / `maskDuplicateAz`, else null. */
  badPair: string | null;
}

/** One `az,el` pair: two decimal numbers separated by a comma (spaces allowed). */
const MASK_PAIR_RE = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/u;
/** Pairs are separated by newlines or semicolons. */
const MASK_SPLIT_RE = /[\r\n;]/u;

/**
 * Parse a pasted horizon mask into interpolated ootk {@link ElevationMask} vertices
 * (`startAz` = `stopAz` = az, `minEl` = el). Blank lines are ignored and blank text means
 * "no mask". Rules match ootk's interpolated-mask validation: 2 to 72 vertices,
 * 0 <= az < 360, 0 <= el <= 89, unique azimuths. The first problem found is reported.
 */
export function parseMask(text: string | undefined): ParsedMask {
  const masks: ElevationMask[] = [];

  if (!text || text.trim() === '') {
    return { masks, error: null, badPair: null };
  }

  const seen = new Set<number>();

  for (const raw of text.split(MASK_SPLIT_RE)) {
    const pair = raw.trim();

    if (pair === '') {
      continue;
    }

    const match = MASK_PAIR_RE.exec(pair);
    const az = match ? parseFloat(match[1]) : NaN;
    const el = match ? parseFloat(match[2]) : NaN;

    if (!match || az < 0 || az >= 360 || el < 0 || el > MAX_INTERPOLATED_MASK_EL) {
      return { masks: [], error: 'maskBadPair', badPair: pair };
    }
    if (seen.has(az)) {
      return { masks: [], error: 'maskDuplicateAz', badPair: pair };
    }
    seen.add(az);
    masks.push({ startAz: az as Degrees, stopAz: az as Degrees, minEl: el as Degrees });
  }

  if (masks.length > MAX_INTERPOLATED_MASK_VERTICES) {
    return { masks: [], error: 'maskTooMany', badPair: null };
  }
  if (masks.length < MIN_INTERPOLATED_MASK_VERTICES) {
    return { masks: [], error: 'maskTooFew', badPair: null };
  }

  return { masks, error: null, badPair: null };
}

/** Above this max range a sensor is treated as deep-space and framed at GEO zoom. */
const GEO_ZOOM_THRESHOLD_KM = 6000;

/**
 * Map the menu's string type to an ootk {@link SpaceObjectType}. Unknown values
 * fall back to Observer (the menu can only emit the four known strings, but a
 * stale/garbage value should degrade gracefully rather than throw).
 */
export function mapSensorType(type: string): SpaceObjectType {
  switch (type) {
    case 'Observer':
      return SpaceObjectType.OBSERVER;
    case 'Optical':
      return SpaceObjectType.OPTICAL;
    case 'Mechanical':
      return SpaceObjectType.MECHANICAL;
    case 'Phased Array Radar':
      return SpaceObjectType.PHASED_ARRAY_RADAR;
    default:
      return SpaceObjectType.OBSERVER;
  }
}

/**
 * Validate the parsed form values. Returns the locale error key of the first
 * failing rule, or `null` when every field is acceptable.
 *
 * Note on azimuth: min > max is intentionally NOT rejected. Azimuth wraps
 * through north, so a sensor facing north can legitimately span e.g. 350 to 10
 * degrees (minAz > maxAz). Elevation and range never wrap, so their ordering is
 * enforced.
 */
export function validateCustomSensor(values: CustomSensorFormValues): string | null {
  const numericFields: Array<keyof CustomSensorFormValues> = ['lat', 'lon', 'alt', 'minAz', 'maxAz', 'minEl', 'maxEl', 'minRng', 'maxRng'];

  for (const field of numericFields) {
    if (!Number.isFinite(values[field] as number)) {
      return 'invalidNumber';
    }
  }

  if (values.lat > 90 || values.lat < -90) {
    return 'latRange';
  }
  if (values.lon > 180 || values.lon < -180) {
    return 'lonRange';
  }
  if (values.alt < 0) {
    return 'altRange';
  }
  if (values.minAz < -360 || values.minAz > 360) {
    return 'minAzRange';
  }
  if (values.maxAz < -360 || values.maxAz > 360) {
    return 'maxAzRange';
  }
  if (values.minEl < -90 || values.minEl > 90) {
    return 'minElRange';
  }
  if (values.maxEl < -90 || values.maxEl > 90) {
    return 'maxElRange';
  }
  if (values.minRng < 0) {
    return 'minRangeValue';
  }
  if (values.maxRng < 0) {
    return 'maxRangeValue';
  }
  if (values.minEl > values.maxEl) {
    return 'elOrder';
  }
  if (values.minRng > values.maxRng) {
    return 'rangeOrder';
  }

  // Horizon mask last; the plugin fills the offending pair from parseMask(values.mask).badPair
  return parseMask(values.mask).error;
}

/**
 * Build the {@link DetailedSensorParams} for a custom sensor. Assumes the values
 * have already passed {@link validateCustomSensor}. `objNameSuffix` is supplied by
 * the caller (a random id) so this stays pure and deterministic for tests.
 */
export function buildCustomSensorParams(values: CustomSensorFormValues, objNameSuffix: string): DetailedSensorParams {
  const { masks } = parseMask(values.mask);
  const name = resolveCustomSensorName(values.uiName);
  const params: DetailedSensorParams = {
    lat: values.lat as Degrees,
    lon: values.lon as Degrees,
    alt: values.alt as Kilometers,
    minAz: values.minAz as Degrees,
    maxAz: values.maxAz as Degrees,
    minEl: values.minEl as Degrees,
    maxEl: values.maxEl as Degrees,
    minRng: values.minRng as Kilometers,
    maxRng: values.maxRng as Kilometers,
    type: mapSensorType(values.type),
    name,
    uiName: name,
    system: CUSTOM_SENSOR_DEFAULT_NAME,
    country: formatCustomSensorLocation(values.lat, values.lon),
    objName: `${CUSTOM_SENSOR_OBJNAME_PREFIX}-${objNameSuffix}`,
    operator: CUSTOM_SENSOR_DEFAULT_NAME,
    isCustomSensor: true,
    zoom: values.maxRng > GEO_ZOOM_THRESHOLD_KM ? ZoomValue.GEO : ZoomValue.LEO,
    volume: false,
  };

  // Kept inside the params object so custom-sensor persistence can serialise it later
  if (masks.length > 0) {
    params.elevationMasks = masks;
    params.interpolateMask = true;
  }

  return params;
}
