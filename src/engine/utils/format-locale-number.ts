import i18next from 'i18next';

/**
 * Fixed-decimals number in the UI language's own format (decimal comma in German, French, etc.).
 * Falls back to `toFixed` if Intl rejects the locale.
 */
export const formatLocaleNumber = (value: number, decimals: number): string => {
  try {
    return new Intl.NumberFormat(i18next.language || 'en', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: false,
    }).format(value);
  } catch {
    return value.toFixed(decimals);
  }
};
