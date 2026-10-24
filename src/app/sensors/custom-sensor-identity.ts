import { t7e } from '@app/locales/keys';
import i18next from 'i18next';

/**
 * Custom sensor identity helpers.
 *
 * A custom sensor's display `name` is whatever the user typed, so it must never
 * be used to decide "is this a custom sensor". Identity comes from the
 * `isCustomSensor` flag, with the reserved `objName` prefix as a fallback for
 * sensors built before the flag existed (saved scenarios, older persistence).
 */

/** Display name used when the user leaves the sensor name empty. */
export const CUSTOM_SENSOR_DEFAULT_NAME = 'Custom Sensor';

/** Reserved objName prefix for custom sensors (`Custom Sensor-<random id>`). */
export const CUSTOM_SENSOR_OBJNAME_PREFIX = 'Custom Sensor';

interface CustomSensorLike {
  isCustomSensor?: boolean;
  objName?: string;
  name?: string;
}

/** True when the sensor was created by the user rather than loaded from the catalog. */
export function isCustomSensor(sensor: CustomSensorLike | null | undefined): boolean {
  if (!sensor) {
    return false;
  }
  if (sensor.isCustomSensor === true) {
    return true;
  }

  return !!sensor.objName?.startsWith(CUSTOM_SENSOR_OBJNAME_PREFIX) || isDefaultCustomSensorName(sensor.name);
}

/**
 * True when `name` is the default custom-sensor name in English or in any loaded UI
 * language. The displayed default is localized (`sensorMath.customSensorDefaultName`),
 * so identity must never depend on the current language's wording alone.
 */
export function isDefaultCustomSensorName(name: string | null | undefined): boolean {
  if (!name) {
    return false;
  }
  if (name === CUSTOM_SENSOR_DEFAULT_NAME) {
    return true;
  }

  const languages = Object.keys(i18next.options?.resources ?? {});

  return languages.some((lng) => i18next.t('sensorMath.customSensorDefaultName', { lng }) === name);
}

/** The localized default custom-sensor name for display. */
export function getCustomSensorDefaultDisplayName(): string {
  return t7e('sensorMath.customSensorDefaultName');
}

/** The typed name, trimmed, or the default when it is empty. */
export function resolveCustomSensorName(typedName: string | null | undefined): string {
  const trimmed = (typedName ?? '').trim();

  return trimmed.length > 0 ? trimmed : CUSTOM_SENSOR_DEFAULT_NAME;
}

/** Location line for a custom sensor, e.g. `39.739°N, 104.990°W`. */
export function formatCustomSensorLocation(lat: number, lon: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return t7e('sensorMath.customLocation');
  }
  const latStr = `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(3)}°${lon >= 0 ? 'E' : 'W'}`;

  return `${latStr}, ${lonStr}`;
}
