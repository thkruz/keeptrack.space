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

import { settingsManager } from '@app/settings/settings';

/**
 * Returns the reference "now" used when computing the age of GP/TLE data.
 *
 * Normally this is the current wall-clock time. When a historic catalog snapshot
 * is loaded, the loader sets {@link settingsManager.catalogReferenceTime} to the
 * snapshot epoch so age-based displays (the GP-age color scheme, the sat-info-box
 * age row, etc.) read relative to when that catalog was current rather than today.
 *
 * The engine depends only on this global setting — never on the plugin that writes it.
 */
export const getCatalogReferenceDate = (): Date =>
  (typeof settingsManager.catalogReferenceTime === 'number'
    ? new Date(settingsManager.catalogReferenceTime)
    : new Date());
