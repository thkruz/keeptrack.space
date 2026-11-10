import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * A few runtime checks must recognise strings saved under ANY UI language, but only English (plus the
 * active language) is loaded at runtime since locales became lazy chunks. This step extracts just those
 * strings from the merged locale files into src/locales/cross-locale.json (gitignored, like the merged
 * locales), so main.js carries a few KB instead of every language.
 *
 * Output:
 * - customSensorDefaultNames: `sensorMath.customSensorDefaultName` in every language
 * - legacyBottomIconIds: old translated bottom-icon slug -> current English slug
 */

type Bundle = { plugins?: Record<string, { bottomIconLabel?: unknown } | undefined>; sensorMath?: { customSensorDefaultName?: unknown } };

/** Must match bottomIconSlug in src/engine/plugins/bottom-icon-id.ts (first space only, on purpose). */
export const bottomIconSlug = (label: string): string => `${label.toLowerCase().replace(' ', '-')}-bottom-icon`;

export function buildCrossLocaleTable(bundles: Record<string, Bundle>): { customSensorDefaultNames: string[]; legacyBottomIconIds: Record<string, string> } {
  const names = new Set<string>();
  const legacy: Record<string, string> = {};
  const en = bundles.en?.plugins ?? {};
  const englishIds = new Set(Object.values(en).flatMap((entry) => (typeof entry?.bottomIconLabel === 'string' ? [bottomIconSlug(entry.bottomIconLabel)] : [])));

  for (const [lng, bundle] of Object.entries(bundles)) {
    const name = bundle.sensorMath?.customSensorDefaultName;

    if (typeof name === 'string' && name.length > 0) {
      names.add(name);
    }
    if (lng === 'en') {
      continue;
    }
    for (const [pluginId, entry] of Object.entries(bundle.plugins ?? {})) {
      const enLabel = en[pluginId]?.bottomIconLabel;
      const localLabel = entry?.bottomIconLabel;

      if (typeof enLabel !== 'string' || typeof localLabel !== 'string') {
        continue;
      }
      const legacyId = bottomIconSlug(localLabel);

      // A translation that slugs to some plugin's English id is already a current id.
      if (!englishIds.has(legacyId)) {
        legacy[legacyId] = bottomIconSlug(enLabel);
      }
    }
  }

  return { customSensorDefaultNames: [...names].sort(), legacyBottomIconIds: legacy };
}

export function generateCrossLocaleFile(localesDir: string): { languages: number; legacyIds: number } {
  const bundles: Record<string, Bundle> = {};

  for (const file of readdirSync(localesDir)) {
    const match = (/^([a-z]{2})\.json$/u).exec(file);

    if (match) {
      bundles[match[1]] = JSON.parse(readFileSync(path.join(localesDir, file), 'utf8')) as Bundle;
    }
  }
  if (!existsSync(path.join(localesDir, 'en.json'))) {
    throw new Error(`generate-cross-locale: ${localesDir}/en.json missing; run the locale merge first`);
  }
  const table = buildCrossLocaleTable(bundles);

  writeFileSync(path.join(localesDir, 'cross-locale.json'), `${JSON.stringify(table, null, 2)}\n`);

  return { languages: Object.keys(bundles).length, legacyIds: Object.keys(table.legacyBottomIconIds).length };
}
