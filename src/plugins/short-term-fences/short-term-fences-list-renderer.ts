/**
 * Short Term Fences list renderer: builds the secondary-panel HTML for the active
 * fences. Kept DOM-free (returns a string) so the markup is testable and the
 * plugin keeps only the innerHTML write + delegated click wiring. Mirrors the
 * Custom Sensor `renderCustomSensorList` structure so the two active-object lists
 * read identically.
 *
 * @license AGPL-3.0-or-later
 */

import type { DetailedSensor } from '@app/app/sensors/DetailedSensor';

/** Translation lookup for the `fenceList.*` keys, injected by the plugin. */
export type FenceListLabel = (key: string) => string;

/**
 * Build the active-fence list markup as v13 cards (one card per fence: a header
 * with the name + a remove control, then a two-column attribute grid). Returns an
 * empty-state note when there are no fences. The remove control carries
 * `data-id="<objName>"` so a single delegated listener can resolve which fence to
 * remove.
 *
 * The remove icon is rendered as a CSS-masked glyph (the icon URL is passed in via
 * the `--stf-remove-icon` custom property) rather than a raw `<img>`, so the source
 * PNG's color is replaced with the brand red. A raw `<img>` would show the icon's
 * native blue instead of the theme color.
 */
export function renderStfList(fences: DetailedSensor[], l: FenceListLabel, removeIconSrc: string): string {
  if (fences.length === 0) {
    return `<div class="stf-empty">${l('empty')}</div>`;
  }

  const attr = (key: string, value: string) => `
        <div class="stf-attr"><span class="stf-attr-k">${l(key)}</span><span class="stf-attr-v">${value}</span></div>`;

  return fences
    .map(
      (fence) => `
      <div class="stf-fence-card">
        <div class="stf-fence-head">
          <span class="stf-fence-name">${fence.uiName ?? fence.objName}</span>
          <button class="remove-fence" data-id="${fence.objName}" type="button" title="${l('remove')}" aria-label="${l('remove')}">
            <span class="stf-remove-glyph" style="--stf-remove-icon: url('${removeIconSrc}')"></span>
          </button>
        </div>
        <div class="stf-attr-grid">
          ${attr('azimuth', `${fence.minAz.toFixed(0)}° - ${fence.maxAz.toFixed(0)}°`)}
          ${attr('elevation', `${fence.minEl.toFixed(0)}° - ${fence.maxEl.toFixed(0)}°`)}
          ${attr('range', `${fence.minRng.toFixed(0)} - ${fence.maxRng.toFixed(0)} km`)}
        </div>
      </div>`
    )
    .join('');
}
