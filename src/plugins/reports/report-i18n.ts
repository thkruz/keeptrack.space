/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * report-i18n.ts resolves the human-readable report text. Ted's ruling: the text
 * report (and every document built from it) follows the UI language, while CSV
 * headers and enum cells stay English so spreadsheets and scripts keep parsing.
 *
 * Both lookups read the same locale keys (plugins.ReportsPlugin.doc.*). The
 * English side comes straight from the plugin's en.src.json, so it works without
 * i18next being initialized (pure generators, unit tests) and never drifts from
 * the translated side.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2026 Kruczek Labs LLC
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

import { type TranslationKey, t7e } from '@app/locales/keys';
import enLocale from './locales/en.src.json';

const DOC_PREFIX = 'plugins.ReportsPlugin.doc';

/** The English report text for a key under plugins.ReportsPlugin.doc (falls back to the key). */
export const docEn = (key: string): string => {
  let node: unknown = enLocale.plugins.ReportsPlugin.doc;

  for (const part of key.split('.')) {
    node = typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[part] : undefined;
  }

  return typeof node === 'string' ? node : key;
};

/** The report text for a key in the current UI language, English when the key is unresolved. */
export const doc = (key: string): string => {
  const fullKey = `${DOC_PREFIX}.${key}`;
  const translated = t7e(fullKey as TranslationKey);

  return typeof translated === 'string' && translated !== fullKey && translated.length > 0 ? translated : docEn(key);
};

/** Replaces each {name} placeholder. Function replacements keep `$` in values literal. */
export const fillDoc = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, () => String(value)), template);
