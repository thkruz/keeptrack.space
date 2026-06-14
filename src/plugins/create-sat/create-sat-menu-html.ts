/**
 * v13+ side-menu HTML builders for the Create Satellite plugin.
 *
 * These are pure string builders (no `this`), split out of create-sat.ts so the
 * plugin class stays under the max-lines budget. The element IDs produced here
 * are the contract the plugin's event wiring and tests depend on, so keep them
 * stable when editing the markup.
 */
import { html } from '@app/engine/utils/development/formatter';
import { t7e } from '@app/locales/keys';
import { ORBIT_PRESETS } from './create-sat-orbits';

type T7eKey = Parameters<typeof t7e>[0];

/** Shared element-ID prefix (matches `CreateSat.elementPrefix`). */
const P = 'createSat';

const l = (key: string): string => t7e(`plugins.CreateSat.labels.${key}` as T7eKey);
const o = (key: string): string => t7e(`plugins.CreateSat.options.${key}` as T7eKey);
const b = (key: string): string => t7e(`plugins.CreateSat.buttons.${key}` as T7eKey);
const pl = (key: string): string => t7e(`plugins.CreateSat.presets.${key}` as T7eKey);

/** A full-width v13 action row (label left, chevron added via CSS). */
export function createSatActionButton(id: string, label: string, opts: { submit?: boolean; disabled?: boolean } = {}): string {
  const type = opts.submit ? 'submit' : 'button';
  const disabled = opts.disabled ? ' disabled' : '';

  return html`
    <button id="${id}" type="${type}" class="kt-action waves-effect"${disabled}>
      <span class="kt-action-label">${label}</span>
    </button>
  `;
}

/** Basic tab: build an orbit from altitudes + inclination. */
export function buildBasicTabHtml(): string {
  return html`
    <form id="createSat-basic-form">
      <section class="kt-section">
        <div class="kt-section-label">${l('sectionIdentity')}</div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <input value="90000" id="${P}-basic-scc" type="text" maxlength="9" />
            <label for="${P}-basic-scc" class="active">${l('noradId')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <input id="${P}-basic-name" type="text" maxlength="24" />
            <label for="${P}-basic-name" class="active">${l('satelliteName')}</label>
          </div>
        </div>
      </section>
      <section class="kt-section">
        <div class="kt-section-label">${l('sectionOrbit')}</div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <input placeholder="51.6" id="${P}-basic-inc" type="text" />
            <label for="${P}-basic-inc" class="active">${l('inclinationDeg')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s6">
            <input placeholder="400" id="${P}-basic-apogee" type="text" />
            <label for="${P}-basic-apogee" class="active">${l('apogeeAltKm')}</label>
          </div>
          <div class="input-field col s6">
            <input placeholder="400" id="${P}-basic-perigee" type="text" />
            <label for="${P}-basic-perigee" class="active">${l('perigeeAltKm')}</label>
          </div>
        </div>
        ${createSatActionButton('createSat-basic-submit', b('createSatellite'))}
      </section>
    </form>
  `;
}

/** Advanced tab: full TLE element set with a live calculated-params readout. */
export function buildAdvancedTabHtml(): string {
  return html`
    <form id="createSat" style="scrollbar-gutter: stable;">
      <!--
        Carries the raw TLE international designator (cols 10-17) when a satellite
        is imported, so createSatSubmit_ can preserve the real COSPAR ID instead
        of synthesizing one. Left blank for manually entered satellites.
      -->
      <input type="hidden" id="${P}-intl" />

      <section class="kt-section">
        <div class="kt-section-label">${l('sectionPresets')}</div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <select id="${P}-preset">
              <option value="" selected disabled>${pl('placeholder')}</option>
              ${ORBIT_PRESETS.map((preset) => `<option value="${preset.id}">${pl(preset.labelKey)}</option>`).join('')}
            </select>
            <label for="${P}-preset">${pl('selectLabel')}</label>
          </div>
        </div>
        ${createSatActionButton('createSat-clone', b('cloneSelected'))}
      </section>

      <section class="kt-section">
        <div class="kt-section-label">${l('sectionIdentity')}</div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <input value="90000" id="${P}-scc" type="text" maxlength="9" />
            <label for="${P}-scc" class="active">${l('noradId')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s6">
            <select value=1 id="${P}-type" type="text">
              <option value=1>${o('payload')}</option>
              <option value=2>${o('rocketBody')}</option>
              <option value=3>${o('debris')}</option>
              <option value=4>${o('special')}</option>
            </select>
            <label for="${P}-type">${l('objectType')}</label>
          </div>
          <div class="input-field col s6">
            <select value="TBD" id="${P}-country" type="text">
              <option value="TBD">${o('unknown')}</option>
            </select>
            <label for="${P}-country">${l('country')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s6">
            <input placeholder="" id="${P}-name" type="text" maxlength="24" />
            <label for="${P}-name" class="active">${l('satelliteName')}</label>
          </div>
          <div class="input-field col s6">
            <input placeholder="" id="${P}-src" type="text" maxlength="24" />
            <label for="${P}-src" class="active">${l('dataSource')}</label>
          </div>
        </div>
      </section>

      <section class="kt-section">
        <div class="kt-section-label">${l('sectionEpoch')}</div>
        <div class="kt-field-row">
          <div class="input-field col s6">
            <input placeholder="AA" id="${P}-year" type="text" maxlength="2" />
            <label for="${P}-year" class="active">${l('epochYear')}</label>
          </div>
          <div class="input-field col s6">
            <input placeholder="AAA.AAAAAAAA" id="${P}-day" type="text" maxlength="12" />
            <label for="${P}-day" class="active">${l('epochDay')}</label>
          </div>
        </div>
      </section>

      <section class="kt-section">
        <div class="kt-section-label">${l('sectionElements')}</div>
        <div class="kt-field-row">
          <div class="input-field col s6">
            <input placeholder="AAA.AAAA" id="${P}-inc" type="text" maxlength="8" />
            <label for="${P}-inc" class="active">${l('inclination')}</label>
          </div>
          <div class="input-field col s6">
            <input placeholder="AAA.AAAA" id="${P}-rasc" type="text" maxlength="8" />
            <label for="${P}-rasc" class="active">${l('rightAscension')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s6">
            <input placeholder="AA.AAAAAAAA" id="${P}-ecen" type="text" maxlength="7" />
            <label for="${P}-ecen" class="active">${l('eccentricity')}</label>
          </div>
          <div class="input-field col s6">
            <input placeholder="AA.AAAAAAAA" id="${P}-argPe" type="text" maxlength="8" />
            <label for="${P}-argPe" class="active">${l('argOfPerigee')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s6">
            <input placeholder="AAA.AAAA" id="${P}-meana" type="text" maxlength="8" />
            <label for="${P}-meana" class="active">${l('meanAnomaly')}</label>
          </div>
          <div class="input-field col s6">
            <input placeholder="AAA.AAAA" id="${P}-meanmo" type="text" maxlength="11" />
            <label for="${P}-meanmo" class="active">${l('meanMotion')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <input placeholder="AA.AAAA" id="${P}-per" type="text" maxlength="11" />
            <label for="${P}-per" class="active">${l('period')}</label>
          </div>
        </div>
        ${createSatActionButton('createSat-sso', b('makeSunSync'))}
      </section>

      <section class="kt-section" id="createSat-derived">
        <div class="kt-section-label">${l('calculatedParameters')}</div>
        <div class="kt-field-row">
          <div class="input-field col s6">
            <input disabled id="${P}-calc-apogee" type="text" />
            <label for="${P}-calc-apogee" class="active">${l('apogeeKm')}</label>
          </div>
          <div class="input-field col s6">
            <input disabled id="${P}-calc-perigee" type="text" />
            <label for="${P}-calc-perigee" class="active">${l('perigeeKm')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s6">
            <input disabled id="${P}-calc-sma" type="text" />
            <label for="${P}-calc-sma" class="active">${l('smaKm')}</label>
          </div>
          <div class="input-field col s6">
            <input disabled id="${P}-calc-velocity" type="text" />
            <label for="${P}-calc-velocity" class="active">${l('velocityKms')}</label>
          </div>
        </div>
      </section>

      <section class="kt-section">
        ${createSatActionButton('createSat-submit', b('createSatellite'))}
        ${createSatActionButton('createSat-save', b('saveTle'))}
      </section>
    </form>
  `;
}
