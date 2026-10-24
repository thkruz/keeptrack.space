import { TranslationKey, t7e } from '@app/locales/keys';
import i18next from 'i18next';

/**
 * Localized label for a color-scheme legend row (`colorSchemes.legend.<key>`).
 * Only call this lazily (from a getter), never at module-parse time: t7e caches
 * whatever i18next returns, and before init that is the raw key.
 */
export const legendLabel = (key: string): string => t7e(`colorSchemes.legend.${key}` as TranslationKey);

/**
 * Localized country name for a legend row, from the ISO 3166 region code.
 * Falls back to the English name on engines without Intl.DisplayNames.
 */
export const legendCountry = (isoCode: string, englishName: string): string => {
  try {
    return new Intl.DisplayNames([i18next.language || 'en'], { type: 'region' }).of(isoCode) ?? englishName;
  } catch {
    return englishName;
  }
};
