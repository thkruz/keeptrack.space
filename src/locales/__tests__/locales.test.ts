import { LocaleInformation, Localization, loadLocale, localesReady } from '@app/locales/locales';
import i18next from 'i18next';

describe('Locales', () => {
  it('synchronizes document language to the resolved supported locale', async () => {
    for (const [requested, expected] of [
      ['de-DE', 'de'],
      ['en', 'en'],
      ['de', 'de'],
      ['unsupported', 'en'],
      ['en', 'en'],
    ]) {
      // biome-ignore lint/performance/noAwaitInLoops: each language switch must finish before the next assertion
      await loadLocale(requested);
      await i18next.changeLanguage(requested);
      expect(document.documentElement.lang).toBe(expected);
    }
  });

  it('lazy-loads a non-English bundle through the dynamic path and keeps the English fallback', async () => {
    await localesReady;
    expect(i18next.hasResourceBundle('en', 'translation')).toBe(true);

    // Pick a key whose German text differs from English
    const en = (await import('@app/locales/en.json')).default as Record<string, unknown>;
    const de = (await import('@app/locales/de.json')).default as Record<string, unknown>;
    const pick = (obj: unknown, path: string[]): unknown => path.reduce((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
    const findDiff = (a: unknown, b: unknown, path: string[] = []): string[] | null => {
      if (typeof a === 'string') {
        return typeof pick(b, path) === 'string' && pick(b, path) !== a ? path : null;
      }
      for (const k of Object.keys((a as object) ?? {})) {
        const r = findDiff((a as Record<string, unknown>)[k], b, [...path, k]);

        if (r) {
          return r;
        }
      }

      return null;
    };
    const diffPath = findDiff(en, de) as string[];
    const key = diffPath.join('.');

    await i18next.changeLanguage('en');
    i18next.removeResourceBundle('de', 'translation');
    expect(i18next.hasResourceBundle('de', 'translation')).toBe(false);

    await loadLocale('de-DE');
    expect(i18next.hasResourceBundle('de', 'translation')).toBe(true);
    await i18next.changeLanguage('de');
    expect(i18next.t(key)).toBe(pick(de, diffPath));
    expect(i18next.t(key)).not.toBe(pick(en, diffPath));

    // Unknown language: falls back to English text, loadLocale is a safe no-op
    await loadLocale('xx');
    await i18next.changeLanguage('xx');
    expect(i18next.t(key)).toBe(pick(en, diffPath));
    await i18next.changeLanguage('en');
  });

  const flatMapOfAllKeys: string[] = [];

  const setup = (Localization: LocaleInformation) => {
    /*
     * Create a flat array of all keys in the localization object,
     * this needs to be deep nested so the function might be plugins.SensorListPlugin.bottomIconLabel for example
     */

    const flatMap = (obj: LocaleInformation, prefix: string = ''): string[] =>
      Object.keys(obj).flatMap((key) => {
        const newPrefix = prefix ? `${prefix}.${key}` : key;

        return typeof obj[key] === 'object' ? flatMap(obj[key], newPrefix) : newPrefix;
      });

    flatMapOfAllKeys.push(...flatMap(Localization));
  };

  it('should have a valid English translations', () => {
    i18next.changeLanguage('en');
    const localization = Localization.getInstance();

    setup(localization);
    validateLocalizationKeys(localization, flatMapOfAllKeys);
  });

  it('should have a valid French translations', () => {
    i18next.changeLanguage('fr');
    const localization = Localization.getInstance();

    setup(localization);
    validateLocalizationKeys(localization, flatMapOfAllKeys);
  });

  it('should have a valid Spanish translations', () => {
    i18next.changeLanguage('es');
    const localization = Localization.getInstance();

    setup(localization);
    validateLocalizationKeys(localization, flatMapOfAllKeys);
  });

  it('should have a valid German translations', () => {
    i18next.changeLanguage('de');
    const localization = Localization.getInstance();

    setup(localization);
    validateLocalizationKeys(localization, flatMapOfAllKeys);
  });

  it('pre-caches all translations without throwing', () => {
    i18next.changeLanguage('en');
    const localization = Localization.getInstance() as unknown as { preCacheTranslations(): void };

    expect(() => localization.preCacheTranslations()).not.toThrow();
  });
});

// Check that every function in the localization object works
const validateLocalizationKeys = (localization: LocaleInformation, flatMapOfAllKeys: string[]) => {
  flatMapOfAllKeys.forEach((key) => {
    const splitKey = key.split('.');

    if (splitKey.length === 1) {
      expect(() => localization[key]).not.toThrow();
      expect(() => localization[key]).not.toBe(key);
      // console.warn(localization[key]);
    } else if (splitKey.length === 2) {
      expect(() => localization[splitKey[0]][splitKey[1]]).not.toThrow();
      expect(() => localization[splitKey[0]][splitKey[1]]).not.toBe(key);
      // console.warn(localization[splitKey[0]][splitKey[1]]);
    } else if (splitKey.length === 3) {
      expect(() => localization[splitKey[0]][splitKey[1]][splitKey[2]]).not.toThrow();
      expect(() => localization[splitKey[0]][splitKey[1]][splitKey[2]]).not.toBe(key);
      // console.warn(localization[splitKey[0]][splitKey[1]][splitKey[2]]);
    } else if (splitKey.length === 4) {
      expect(() => localization[splitKey[0]][splitKey[1]][splitKey[2]][splitKey[3]]).not.toThrow();
      expect(() => localization[splitKey[0]][splitKey[1]][splitKey[2]][splitKey[3]]).not.toBe(key);
      // console.warn(localization[splitKey[0]][splitKey[1]][splitKey[2]][splitKey[3]]);
    }
  });
};
