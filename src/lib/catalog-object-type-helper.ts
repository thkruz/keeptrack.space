import { CatalogObject } from '@app/interfaces';
import { MissileObject, SatObject, SensorObject } from '../interfaces';

/**
 * Checks if the given object is a sensor object.
 * @param sat The object to check.
 * @returns True if the object is a sensor object, false otherwise.
 */
export const isSensorObject = (sat: CatalogObject | SatObject | MissileObject | SensorObject): boolean => !!(<SensorObject>sat).objName;

/**
 * Checks if the given object is a missile object.
 * @param sat The catalog object to check.
 * @returns True if the object is a missile object, false otherwise.
 */
export const isMissileObject = (sat: CatalogObject | SatObject | MissileObject | SensorObject): boolean => !!(<MissileObject>sat).missile;

/**
 * Checks if the given object is a Satellite Object.
 * @param sat - The catalog object to check.
 * @returns True if the object is a Satellite Object, false otherwise.
 */
export const isSatObject = (sat: CatalogObject | SatObject | MissileObject | SensorObject): boolean => {
  if (!sat) return false;

  return !!((<SatObject>sat).sccNum || (<SatObject>sat).intlDes || (<SatObject>sat).TLE1);
};
