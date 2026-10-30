import i18next from 'i18next';

type PluginLabels = Record<string, { bottomIconLabel?: unknown } | undefined>;

/**
 * Legacy slug rule for default bottom icon ids. Only the first space becomes a dash; keeping it
 * keeps every existing English id (CSS, specs, saved favorites) unchanged.
 */
export const bottomIconSlug = (label: string): string => `${label.toLowerCase().replace(' ', '-')}-bottom-icon`;

let legacyIdMap_: Map<string, string> | null = null;

const pluginLabelsOf_ = (lng: string): PluginLabels => {
  const bundle = i18next.options.resources?.[lng]?.translation as { plugins?: PluginLabels } | undefined;

  return bundle?.plugins ?? {};
};

/**
 * Old default ids were slugs of the TRANSLATED label ("sensoren-bottom-icon"); they are now slugs
 * of the English one. Maps every translated slug in the bundled locales to its English id.
 */
const buildLegacyIdMap_ = (): Map<string, string> => {
  const map = new Map<string, string>();
  const en = pluginLabelsOf_('en');
  const englishIds = new Set(Object.values(en).flatMap((entry) => (typeof entry?.bottomIconLabel === 'string' ? [bottomIconSlug(entry.bottomIconLabel)] : [])));

  for (const lng of Object.keys(i18next.options.resources ?? {})) {
    if (lng === 'en') {
      continue;
    }
    for (const [pluginId, entry] of Object.entries(pluginLabelsOf_(lng))) {
      const enLabel = en[pluginId]?.bottomIconLabel;
      const localLabel = entry?.bottomIconLabel;

      if (typeof enLabel !== 'string' || typeof localLabel !== 'string') {
        continue;
      }
      const legacyId = bottomIconSlug(localLabel);

      // A translation that slugs to some plugin's English id is already a current id.
      if (!englishIds.has(legacyId)) {
        map.set(legacyId, bottomIconSlug(enLabel));
      }
    }
  }

  return map;
};

/** Translate a stored drawer id (favorites, recents) saved under the old localized id. */
export const migrateLegacyBottomIconId = (id: string): string => {
  if (!id.endsWith('-bottom-icon')) {
    return id;
  }
  legacyIdMap_ ??= buildLegacyIdMap_();

  return legacyIdMap_.get(id) ?? id;
};
