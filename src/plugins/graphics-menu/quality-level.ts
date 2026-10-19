/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * quality-level.ts is the overall graphics quality model: how a control's
 * {@link ISettingQualityRule} maps a level to a value, how one level is applied
 * to a set of controls, and how the current level is derived back from the
 * controls' values. Pure: no DOM, no ServiceLocator.
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

import type {
  GraphicsQualityLevel,
  ISettingControl,
  ISettingNumberControl,
  ISettingQualityRule,
  ISettingSelectControl,
  ISettingToggleControl,
} from '@app/engine/plugins/core/plugin-capabilities';

export type { GraphicsQualityLevel } from '@app/engine/plugins/core/plugin-capabilities';

/** Quality levels, lowest first. */
export const GRAPHICS_QUALITY_ORDER: readonly GraphicsQualityLevel[] = ['low', 'medium', 'high', 'ultra'];

/** What the overall selector shows: a level, or `'custom'` when the controls match none. */
export type GraphicsQualityDisplay = GraphicsQualityLevel | 'custom';

export type QualityValue = string | number | boolean;

type ValueControl_ = ISettingToggleControl | ISettingNumberControl | ISettingSelectControl;
type QualityControl_ = ValueControl_ & { quality: ISettingQualityRule };

export const isGraphicsQualityLevel = (value: unknown): value is GraphicsQualityLevel => GRAPHICS_QUALITY_ORDER.includes(value as GraphicsQualityLevel);

/** The value a control with `rule` should hold at `level`. */
export const targetValueFor = (rule: ISettingQualityRule, level: GraphicsQualityLevel): QualityValue => {
  if ('minLevel' in rule) {
    return GRAPHICS_QUALITY_ORDER.indexOf(level) >= GRAPHICS_QUALITY_ORDER.indexOf(rule.minLevel);
  }

  return rule.byLevel[level];
};

/** Controls the selector drives: value controls with a rule that are currently available. */
const qualityControls_ = (controls: readonly ISettingControl[]): QualityControl_[] =>
  controls.filter(
    (c): c is QualityControl_ => c.type !== 'button' && typeof c.quality === 'object' && c.quality !== null && (typeof c.isAvailable !== 'function' || c.isAvailable())
  );

/**
 * Set every quality-aware control to its value at `level`, in the given order.
 * `set()` runs only for controls whose `get()` differs, so an already-matching
 * control triggers no side effects. Returns how many controls were changed.
 * The caller owns batching (one Earth/skybox re-init) and the menu refresh.
 */
export const applyQualityLevel = (level: GraphicsQualityLevel, controls: readonly ISettingControl[]): number => {
  let changed = 0;

  for (const control of qualityControls_(controls)) {
    const target = targetValueFor(control.quality, level);

    if (control.get() !== target) {
      (control.set as (next: QualityValue) => void)(target);
      changed++;
    }
  }

  return changed;
};

/**
 * The highest level whose targets every quality-aware control currently
 * matches, or `'custom'` when no level matches (or no control has a rule).
 */
export const deriveQualityLevel = (controls: readonly ISettingControl[]): GraphicsQualityDisplay => {
  const quality = qualityControls_(controls);

  if (quality.length === 0) {
    return 'custom';
  }

  for (let i = GRAPHICS_QUALITY_ORDER.length - 1; i >= 0; i--) {
    const level = GRAPHICS_QUALITY_ORDER[i];

    if (quality.every((c) => c.get() === targetValueFor(c.quality, level))) {
      return level;
    }
  }

  return 'custom';
};
