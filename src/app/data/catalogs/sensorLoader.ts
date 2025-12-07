/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * sensorLoader.ts loads sensor data from a JSON file and creates sensor objects.
 * This enables sensors to be loaded from remote sources without code changes.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { CommLink, Degrees, DetailedSensor, Kilometers, Milliseconds, RfSensor, SpaceObjectType, ZoomValue } from '@ootk/src/main';
import type { SensorList } from './sensors';
import sensorsData from './sensors.json';

// Re-export types and enums that other modules might need
export { Operators } from './sensors';
export type { SensorList } from './sensors';

/**
 * Enum mapping strings to actual enum values for SpaceObjectType
 */
const SpaceObjectTypeMap: Record<string, SpaceObjectType> = {
  'SpaceObjectType.PHASED_ARRAY_RADAR': SpaceObjectType.PHASED_ARRAY_RADAR,
  'SpaceObjectType.OPTICAL': SpaceObjectType.OPTICAL,
  'SpaceObjectType.MECHANICAL': SpaceObjectType.MECHANICAL,
  'SpaceObjectType.OBSERVER': SpaceObjectType.OBSERVER,
};

/**
 * Enum mapping strings to actual enum values for ZoomValue
 */
const ZoomValueMap: Record<string, ZoomValue> = {
  'ZoomValue.LEO': ZoomValue.LEO,
  'ZoomValue.GEO': ZoomValue.GEO,
  'ZoomValue.MEO': ZoomValue.MEO,
};

/**
 * Enum mapping strings to actual enum values for CommLink
 */
const CommLinkMap: Record<string, CommLink> = {
  'CommLink.AEHF': CommLink.AEHF,
  'CommLink.WGS': CommLink.WGS,
  'CommLink.DSN': CommLink.DSN,
  'CommLink.DSN_S': CommLink.DSN_S,
  'CommLink.DSN_X': CommLink.DSN_X,
  'CommLink.DSN_Ka': CommLink.DSN_Ka,
  'CommLink.UHF': CommLink.UHF,
  'CommLink.VHF': CommLink.VHF,
  'CommLink.SHF': CommLink.SHF,
  'CommLink.EHF': CommLink.EHF,
  'CommLink.Ka': CommLink.Ka,
  'CommLink.Laser': CommLink.Laser,
};

/**
 * Parse a value that might be an enum string back to its enum value
 */
function parseEnumValue(value: any, enumMap: Record<string, any>): any {
  if (typeof value === 'string' && value in enumMap) {
    return enumMap[value];
  }

  return value;
}

/**
 * Parse an array that might contain enum strings
 */
function parseEnumArray(value: any, enumMap: Record<string, any>): any {
  if (Array.isArray(value)) {
    return value.map(item => parseEnumValue(item, enumMap));
  }

  return value;
}

/**
 * Load sensors from JSON data and create sensor objects
 */
function loadSensorsFromJson(): SensorList {
  const sensors: SensorList = {};

  for (const key in sensorsData) {
    const data = sensorsData[key as keyof typeof sensorsData] as any;

    // Parse enum values
    const sensorConfig: any = { ...data };

    // Convert type enum
    if (sensorConfig.type) {
      sensorConfig.type = parseEnumValue(sensorConfig.type, SpaceObjectTypeMap);
    }

    // Convert zoom enum
    if (sensorConfig.zoom) {
      sensorConfig.zoom = parseEnumValue(sensorConfig.zoom, ZoomValueMap);
    }

    // Convert commLinks array
    if (sensorConfig.commLinks) {
      sensorConfig.commLinks = parseEnumArray(sensorConfig.commLinks, CommLinkMap);
    }

    // Ensure typed values are properly cast
    if (sensorConfig.lat !== undefined) {
      sensorConfig.lat = sensorConfig.lat as Degrees;
    }
    if (sensorConfig.lon !== undefined) {
      sensorConfig.lon = sensorConfig.lon as Degrees;
    }
    if (sensorConfig.alt !== undefined) {
      sensorConfig.alt = sensorConfig.alt as Kilometers;
    }
    if (sensorConfig.minAz !== undefined) {
      sensorConfig.minAz = sensorConfig.minAz as Degrees;
    }
    if (sensorConfig.maxAz !== undefined) {
      sensorConfig.maxAz = sensorConfig.maxAz as Degrees;
    }
    if (sensorConfig.minEl !== undefined) {
      sensorConfig.minEl = sensorConfig.minEl as Degrees;
    }
    if (sensorConfig.maxEl !== undefined) {
      sensorConfig.maxEl = sensorConfig.maxEl as Degrees;
    }
    if (sensorConfig.minRng !== undefined) {
      sensorConfig.minRng = sensorConfig.minRng as Kilometers;
    }
    if (sensorConfig.maxRng !== undefined) {
      sensorConfig.maxRng = sensorConfig.maxRng as Kilometers;
    }
    if (sensorConfig.changeObjectInterval !== undefined) {
      sensorConfig.changeObjectInterval = sensorConfig.changeObjectInterval as Milliseconds;
    }
    if (sensorConfig.beamwidth !== undefined) {
      sensorConfig.beamwidth = sensorConfig.beamwidth as Degrees;
    }
    if (sensorConfig.boresightAz && Array.isArray(sensorConfig.boresightAz)) {
      sensorConfig.boresightAz = sensorConfig.boresightAz.map((v: number) => v as Degrees);
    }
    if (sensorConfig.boresightEl && Array.isArray(sensorConfig.boresightEl)) {
      sensorConfig.boresightEl = sensorConfig.boresightEl.map((v: number) => v as Degrees);
    }

    // Remove the _sensorType field as it's not part of the constructor
    const sensorType = sensorConfig._sensorType;

    delete sensorConfig._sensorType;

    // Create the appropriate sensor type
    if (sensorType === 'RfSensor') {
      sensors[key] = new RfSensor(sensorConfig);
    } else {
      sensors[key] = new DetailedSensor(sensorConfig);
    }
  }

  return sensors;
}

// Export the loaded sensors
export const sensors = loadSensorsFromJson();
