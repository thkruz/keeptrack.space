/**
 * /////////////////////////////////////////////////////////////////////////////
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

import { SoundNames } from '@app/engine/audio/sounds';
import { ServiceLocator } from '@app/engine/core/service-locator';
import {
  ISettingButtonControl,
  ISettingControl,
  ISettingNumberControl,
  ISettingSelectControl,
  ISettingToggleControl,
  ISettingsContribution,
} from '@app/engine/plugins/core/plugin-capabilities';

/**
 * Builds the stable DOM id used for a plugin-contributed control.
 * Format: `setting-<sectionId>-<controlId>`. Both fragments are slugified
 * (non-[A-Za-z0-9_-] → `_`) so plugin authors can use natural ids without
 * worrying about CSS-selector safety.
 */
export const domIdForControl = (sectionId: string, controlId: string): string =>
  `setting-${slugify_(sectionId)}-${slugify_(controlId)}`;

const slugify_ = (s: string): string => s.replace(/[^A-Za-z0-9_-]/gu, '_');

const escapeAttr_ = (s: string): string =>
  s.replace(/&/gu, '&amp;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;');

const escapeText_ = (s: string): string =>
  s.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');

const tooltipAttrs_ = (helpText?: string): string => {
  if (typeof helpText !== 'string' || helpText.length === 0) {
    return '';
  }

  return ` data-position="top" data-delay="50" data-tooltip="${escapeAttr_(helpText)}"`;
};

const disabledAttr_ = (control: ISettingControl): string => (control.isDisabled?.() ? ' disabled' : '');

const renderToggle_ = (c: ISettingToggleControl, domId: string): string => `
        <div class="switch row">
          <label${tooltipAttrs_(c.helpText)}>
            <input id="${domId}" type="checkbox"${c.get() ? ' checked' : ''}${disabledAttr_(c)}/>
            <span class="lever"></span>
            ${escapeText_(c.label)}
          </label>
        </div>`;

const renderNumber_ = (c: ISettingNumberControl, domId: string): string => {
  const minAttr = typeof c.min === 'number' ? ` min="${c.min}"` : '';
  const maxAttr = typeof c.max === 'number' ? ` max="${c.max}"` : '';
  const stepAttr = typeof c.step === 'number' ? ` step="${c.step}"` : '';
  const unitSuffix = c.unit ? ` (${escapeText_(c.unit)})` : '';

  return `
        <div class="input-field col s12"${tooltipAttrs_(c.helpText)}>
          <input id="${domId}" type="number" value="${escapeAttr_(String(c.get()))}"${minAttr}${maxAttr}${stepAttr}${disabledAttr_(c)} />
          <label for="${domId}" class="active">${escapeText_(c.label)}${unitSuffix}</label>
        </div>`;
};

const renderSelect_ = (c: ISettingSelectControl, domId: string): string => {
  const current = c.get();
  const options = c.options
    .map((opt) => `<option value="${escapeAttr_(opt.value)}"${opt.value === current ? ' selected' : ''}>${escapeText_(opt.label)}</option>`)
    .join('');

  return `
        <div class="input-field col s12"${tooltipAttrs_(c.helpText)}>
          <select id="${domId}"${disabledAttr_(c)}>${options}</select>
          <label>${escapeText_(c.label)}</label>
        </div>`;
};

const renderButton_ = (c: ISettingButtonControl, domId: string): string => `
        <button id="${domId}" type="button" class="kt-action waves-effect"${tooltipAttrs_(c.helpText)}${disabledAttr_(c)}>
          <span class="kt-action-label">${escapeText_(c.label)}</span>
        </button>`;

/**
 * Renders a single control to its HTML representation. Listeners are NOT
 * attached here - call {@link attachSettingControlListeners} after the HTML
 * is inserted into the DOM.
 */
export const renderSettingControl = (control: ISettingControl, sectionId: string): string => {
  if (control.isAvailable && !control.isAvailable()) {
    return '';
  }
  const domId = domIdForControl(sectionId, control.id);

  switch (control.type) {
    case 'toggle': return renderToggle_(control, domId);
    case 'number': return renderNumber_(control, domId);
    case 'select': return renderSelect_(control, domId);
    case 'button': return renderButton_(control, domId);
    default: {
      control satisfies never;

      return '';
    }
  }
};

/**
 * Renders a full plugin-contributed section: header + every visible control.
 * Returns empty string if every control is hidden by {@link ISettingControl.isAvailable}.
 */
export const renderSettingsSection = (contribution: ISettingsContribution): string => {
  const controlsHtml = contribution.controls.map((c) => renderSettingControl(c, contribution.sectionId)).join('');

  if (controlsHtml.trim().length === 0) {
    return '';
  }

  return `
      <section id="settings-section-${slugify_(contribution.sectionId)}" class="kt-section">
        <div class="kt-section-label">${escapeText_(contribution.sectionLabel)}</div>
${controlsHtml}
      </section>`;
};

const attachToggleListeners_ = (c: ISettingToggleControl, el: HTMLInputElement): void => {
  el.addEventListener('change', () => {
    const next = el.checked;

    ServiceLocator.getSoundManager()?.play(next ? SoundNames.TOGGLE_ON : SoundNames.TOGGLE_OFF);
    c.set(next);
  });
};

const attachNumberListeners_ = (c: ISettingNumberControl, el: HTMLInputElement): void => {
  el.addEventListener('change', () => {
    const parsed = parseFloat(el.value);

    if (Number.isNaN(parsed)) {
      el.value = String(c.get());

      return;
    }
    c.set(parsed);
  });
};

const attachSelectListeners_ = (c: ISettingSelectControl, el: HTMLSelectElement): void => {
  el.addEventListener('change', () => {
    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
    c.set(el.value);
  });
};

const attachButtonListeners_ = (c: ISettingButtonControl, el: HTMLButtonElement): void => {
  el.addEventListener('click', () => {
    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);
    c.onClick();
  });
};

/**
 * Attaches DOM event listeners for one control. Idempotent only if the
 * surrounding container is replaced wholesale on re-render (old listeners
 * are GC'd with their removed nodes).
 */
export const attachSettingControlListeners = (control: ISettingControl, sectionId: string): void => {
  if (control.isAvailable && !control.isAvailable()) {
    return;
  }
  const domId = domIdForControl(sectionId, control.id);
  const el = document.getElementById(domId);

  if (!el) {
    return;
  }

  switch (control.type) {
    case 'toggle':
      attachToggleListeners_(control, el as HTMLInputElement);
      break;
    case 'number':
      attachNumberListeners_(control, el as HTMLInputElement);
      break;
    case 'select':
      attachSelectListeners_(control, el as HTMLSelectElement);
      break;
    case 'button':
      attachButtonListeners_(control, el as HTMLButtonElement);
      break;
    default: {
      control satisfies never;
    }
  }
};
