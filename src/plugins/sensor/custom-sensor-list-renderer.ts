/**
 * Custom Sensor list renderer: builds the secondary-panel HTML for the active
 * custom sensors. Kept DOM-free (returns a string) so the markup is testable and
 * the plugin keeps only the innerHTML write + delegated click wiring.
 *
 * @license AGPL-3.0-or-later
 */

import type { DetailedSensor } from '@app/app/sensors/DetailedSensor';

/** Translation lookup for the `sensorList.*` keys, injected by the plugin. */
export type SensorListLabel = (key: string) => string;

/**
 * Build the active-custom-sensor list markup as v13 cards (one card per sensor:
 * a header with the name + a remove control, then a two-column attribute grid).
 * Returns an empty-state note when there are no sensors. The remove control
 * carries `data-id="<objName>"` so a single delegated listener can resolve which
 * sensor to remove.
 */
export function renderCustomSensorList(sensors: DetailedSensor[], l: SensorListLabel, removeIconSrc: string): string {
  if (sensors.length === 0) {
    return `<div class="cs-empty">${l('empty')}</div>`;
  }

  const attr = (key: string, value: string) => `
        <div class="cs-attr"><span class="cs-attr-k">${l(key)}</span><span class="cs-attr-v">${value}</span></div>`;

  return sensors.map((sensor) => `
      <div class="cs-sensor-card">
        <div class="cs-sensor-head">
          <span class="cs-sensor-name">${sensor.uiName}</span>
          <button class="remove-sensor" data-id="${sensor.objName}" type="button" title="${l('remove')}" aria-label="${l('remove')}">
            <span class="cs-remove-glyph" style="--cs-remove-icon: url('${removeIconSrc}')"></span>
          </button>
        </div>
        <div class="cs-attr-grid">
          ${attr('latitude', `${sensor.lat.toFixed(0)}°`)}
          ${attr('longitude', `${sensor.lon.toFixed(0)}°`)}
          ${attr('altitude', `${sensor.alt.toFixed(0)} km`)}
          ${attr('azimuth', `${sensor.minAz.toFixed(0)}° - ${sensor.maxAz.toFixed(0)}°`)}
          ${attr('elevationRange', `${sensor.minEl.toFixed(0)}° - ${sensor.maxEl.toFixed(0)}°`)}
          ${attr('range', `${sensor.minRng.toFixed(0)} - ${sensor.maxRng.toFixed(0)} km`)}
        </div>
      </div>`).join('');
}
