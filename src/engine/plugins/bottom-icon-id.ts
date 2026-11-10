import crossLocale from '@app/locales/cross-locale.json';

/**
 * Legacy slug rule for default bottom icon ids. Only the first space becomes a dash; keeping it
 * keeps every existing English id (CSS, specs, saved favorites) unchanged.
 */
export const bottomIconSlug = (label: string): string => `${label.toLowerCase().replace(' ', '-')}-bottom-icon`;

/**
 * Old default ids were slugs of the TRANSLATED label ("sensoren-bottom-icon"); they are now slugs
 * of the English one. The map covers every bundled language and is generated at build time
 * (build/utils/generate-cross-locale.ts), because non-English locales are lazy chunks at runtime.
 */
const legacyIdMap_ = new Map<string, string>(Object.entries(crossLocale.legacyBottomIconIds));

/** Translate a stored drawer id (favorites, recents) saved under the old localized id. */
export const migrateLegacyBottomIconId = (id: string): string => {
  if (!id.endsWith('-bottom-icon')) {
    return id;
  }
  return legacyIdMap_.get(id) ?? id;
};
