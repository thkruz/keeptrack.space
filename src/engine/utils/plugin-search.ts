import { type TranslationKey, t7e } from '@app/locales/keys';

/** Search ignores punctuation and spacing while retaining letters from every locale. */
export const normalizePluginSearch = (value: string): string =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');

interface PluginAliasSource {
  /** Historical English names; always searchable regardless of UI language. */
  english: string[];
  /** Locale key holding a comma-separated list of names in the current UI language. */
  localeKey: TranslationKey;
}

const ALIAS_SOURCES_: Record<string, PluginAliasSource> = {
  transponderchanneldata: {
    english: ['Satellite Frequencies', 'Transponder', 'Channel Data'],
    localeKey: 'plugins.TransponderChannelData.searchAliases',
  },
  multiview: {
    english: ['Multi-View', 'Multi View'],
    localeKey: 'plugins.PluginManagerPlugin.searchAliases.multiView',
  },
};

/** Comma-separated translated aliases; a missing key (t7e echoes the key back) yields none. */
const translatedAliases_ = (key: TranslationKey): string[] => {
  const raw = t7e(key);

  if (typeof raw !== 'string' || raw === key) {
    return [];
  }

  return raw.split(',');
};

/** Historical and common names complement translated labels and stable plugin IDs. */
export const pluginSearchAliases = (id: string): string[] => {
  const source = ALIAS_SOURCES_[normalizePluginSearch(id)];

  if (!source) {
    return [];
  }

  const seen = new Set<string>();
  const aliases: string[] = [];

  for (const alias of [...source.english, ...translatedAliases_(source.localeKey)]) {
    const trimmed = alias.trim();
    const normalized = normalizePluginSearch(trimmed);

    if (normalized === '' || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    aliases.push(trimmed);
  }

  return aliases;
};
