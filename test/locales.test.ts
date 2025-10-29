import { LocaleInformation, Localization } from '@app/locales/locales';
import i18next from 'i18next';

describe('Locales', () => {
  const flatMapOfAllKeys: string[] = [];

  const setup = (Localization: LocaleInformation) => {
    /*
     * Create a flat array of all keys in the localization object,
     * this needs to be deep nested so the function might be plugins.SensorListPlugin.bottomIconLabel for example
     */

    const flatMap = (obj: LocaleInformation, prefix: string = ''): string[] => Object.keys(obj).flatMap((key) => {
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

