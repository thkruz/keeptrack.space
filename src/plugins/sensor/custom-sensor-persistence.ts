/**
 * Custom Sensor persistence: DOM-free (de)serialisation of the user's custom
 * sensors so they survive a reload.
 *
 * The stored value is a small JSON document: one record per custom sensor that
 * was present in the sensor manager (primary first when it was custom, then the
 * secondaries), plus the objName of the one that was the primary sensor. The
 * plugin owns the I/O (PersistenceManager + StorageKey.CUSTOM_SENSORS); this file
 * only converts between sensors, records and the JSON string so the round trip
 * can be unit-tested without jsdom.
 *
 * @license AGPL-3.0-or-later
 */

import {
  CUSTOM_SENSOR_DEFAULT_NAME,
  CUSTOM_SENSOR_OBJNAME_PREFIX,
  formatCustomSensorLocation,
  isCustomSensor,
  resolveCustomSensorName,
} from '@app/app/sensors/custom-sensor-identity';
import type { DetailedSensorParams } from '@app/app/sensors/DetailedSensor';
import { Degrees, ElevationMask, Kilometers, SpaceObjectType, ZoomValue } from '@ootk/src/main';

/** Bump when the record shape changes incompatibly; older documents are ignored. */
export const CUSTOM_SENSOR_STORE_VERSION = 1;

/** Everything needed to rebuild one custom sensor. */
export interface CustomSensorRecord {
  objName: string;
  name: string;
  type: SpaceObjectType;
  lat: number;
  lon: number;
  alt: number;
  minAz: number;
  maxAz: number;
  minEl: number;
  maxEl: number;
  minRng: number;
  maxRng: number;
  zoom?: ZoomValue;
  elevationMasks?: ElevationMask[];
  interpolateMask?: boolean;
}

/** The persisted document. */
export interface CustomSensorStore {
  version: number;
  /** objName of the custom sensor that was the primary sensor, or null when a catalog sensor (or none) was primary. */
  primaryObjName: string | null;
  sensors: CustomSensorRecord[];
}

/** The fields of a DetailedSensor this module reads; kept structural so tests can pass plain objects. */
export interface CustomSensorSource {
  objName: string;
  name: string;
  uiName?: string;
  type: SpaceObjectType;
  lat: number;
  lon: number;
  alt: number;
  minAz: number;
  maxAz: number;
  minEl: number;
  maxEl: number;
  minRng: number;
  maxRng: number;
  zoom?: ZoomValue;
  elevationMasks?: ElevationMask[];
  interpolateMask?: boolean;
  isCustomSensor?: boolean;
}

const NUMERIC_FIELDS = ['lat', 'lon', 'alt', 'minAz', 'maxAz', 'minEl', 'maxEl', 'minRng', 'maxRng'] as const;

/** Snapshot one sensor into a plain record. */
export function toCustomSensorRecord(sensor: CustomSensorSource): CustomSensorRecord {
  const record: CustomSensorRecord = {
    objName: sensor.objName,
    name: sensor.uiName ?? sensor.name,
    type: sensor.type,
    lat: sensor.lat,
    lon: sensor.lon,
    alt: sensor.alt,
    minAz: sensor.minAz,
    maxAz: sensor.maxAz,
    minEl: sensor.minEl,
    maxEl: sensor.maxEl,
    minRng: sensor.minRng,
    maxRng: sensor.maxRng,
  };

  if (typeof sensor.zoom === 'number') {
    record.zoom = sensor.zoom;
  }
  if (sensor.elevationMasks && sensor.elevationMasks.length > 0) {
    record.elevationMasks = sensor.elevationMasks.map((m) => ({ ...m }));
    record.interpolateMask = sensor.interpolateMask === true;
  }

  return record;
}

/**
 * Build the store document from the sensor manager's current state. Only custom
 * sensors are kept; catalog sensors are already persisted by
 * StorageKey.CURRENT_SENSOR. Duplicates (same objName) are dropped.
 */
export function buildCustomSensorStore(primary: CustomSensorSource | null | undefined, secondaries: CustomSensorSource[]): CustomSensorStore {
  const isPrimaryCustom = !!primary && isCustomSensor(primary);
  const seen = new Set<string>();
  const sensors: CustomSensorRecord[] = [];

  for (const sensor of [...(isPrimaryCustom && primary ? [primary] : []), ...secondaries]) {
    if (!isCustomSensor(sensor) || !sensor.objName || seen.has(sensor.objName)) {
      continue;
    }
    seen.add(sensor.objName);
    sensors.push(toCustomSensorRecord(sensor));
  }

  return {
    version: CUSTOM_SENSOR_STORE_VERSION,
    primaryObjName: isPrimaryCustom && primary ? primary.objName : null,
    sensors,
  };
}

/** True when `value` has every field a record needs, with finite numbers. */
function isValidRecord(value: unknown): value is CustomSensorRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const rec = value as Record<string, unknown>;

  if (typeof rec.objName !== 'string' || !rec.objName.startsWith(CUSTOM_SENSOR_OBJNAME_PREFIX)) {
    return false;
  }
  if (typeof rec.name !== 'string' || typeof rec.type !== 'number') {
    return false;
  }

  return NUMERIC_FIELDS.every((field) => typeof rec[field] === 'number' && Number.isFinite(rec[field]));
}

/**
 * Parse a stored document. Returns null for missing, corrupt or wrong-version
 * data; invalid individual records are skipped rather than failing the lot.
 */
export function parseCustomSensorStore(json: string | null | undefined): CustomSensorStore | null {
  if (!json) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const doc = parsed as Partial<CustomSensorStore>;

  if (doc.version !== CUSTOM_SENSOR_STORE_VERSION || !Array.isArray(doc.sensors)) {
    return null;
  }

  const sensors = doc.sensors.filter(isValidRecord);
  const primaryObjName = typeof doc.primaryObjName === 'string' && sensors.some((s) => s.objName === doc.primaryObjName) ? doc.primaryObjName : null;

  return { version: CUSTOM_SENSOR_STORE_VERSION, primaryObjName, sensors };
}

/** Rebuild the DetailedSensor params for a stored record (same shape the Add form produces). */
export function customSensorParamsFromRecord(record: CustomSensorRecord): DetailedSensorParams {
  const name = resolveCustomSensorName(record.name);
  const params: DetailedSensorParams = {
    lat: record.lat as Degrees,
    lon: record.lon as Degrees,
    alt: record.alt as Kilometers,
    minAz: record.minAz as Degrees,
    maxAz: record.maxAz as Degrees,
    minEl: record.minEl as Degrees,
    maxEl: record.maxEl as Degrees,
    minRng: record.minRng as Kilometers,
    maxRng: record.maxRng as Kilometers,
    type: record.type,
    name,
    uiName: name,
    system: CUSTOM_SENSOR_DEFAULT_NAME,
    country: formatCustomSensorLocation(record.lat, record.lon),
    objName: record.objName,
    operator: CUSTOM_SENSOR_DEFAULT_NAME,
    isCustomSensor: true,
    zoom: record.zoom ?? ZoomValue.LEO,
    volume: false,
  };

  if (record.elevationMasks && record.elevationMasks.length > 0) {
    params.elevationMasks = record.elevationMasks.map((m) => ({ ...m }));
    params.interpolateMask = record.interpolateMask === true;
  }

  return params;
}
