import i18next, { InitOptions } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import ja from './ja.json';
import it from './it.json';
import { Keys, t7e } from './keys';
import ko from './ko.json';
import pl from './pl.json';
import cs from './cs.json';
import ru from './ru.json';
import uk from './uk.json';
import zh from './zh.json';

const opts: InitOptions = {
  interpolation: {
    escapeValue: false,
  },
  fallbackLng: 'en',
  debug: false,
  resources: {
    de: { translation: de },
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
    ja: { translation: ja },
    ko: { translation: ko },
    uk: { translation: uk },
    ru: { translation: ru },
    zh: { translation: zh },
    pl: { translation: pl },
    cs: { translation: cs },
    it: { translation: it },
  },
};

i18next.use(LanguageDetector).init(opts);

export interface SupportedLocale {
  /** BCP-47 base code matching a key in i18next `resources` above. */
  code: string;
  /** Endonym shown in language pickers (always rendered in its own script). */
  nativeName: string;
}

/**
 * Canonical list of UI languages. Keep this in lockstep with the `resources`
 * map above - it is the single source of truth for language pickers (e.g. the
 * Debug menu's locale switcher) so the option list cannot drift from what is
 * actually bundled.
 */
export const SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'es', nativeName: 'Español' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'ja', nativeName: '日本語' },
  { code: 'ko', nativeName: '한국어' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'uk', nativeName: 'Українська' },
  { code: 'zh', nativeName: '中文' },
  { code: 'pl', nativeName: 'Polski' },
  { code: 'cs', nativeName: 'Čeština' },
  { code: 'it', nativeName: 'Italiano' },
];

export interface LocaleInformation {
  plugins: {
    [pluginName: string]: {
      bottomIconLabel?: string;
      title?: string;
      helpBody?: string;
      [key: string]: string | undefined;
    };
  };
}

export class Localization implements LocaleInformation {
  plugins: LocaleInformation['plugins'];
  private static instance_: Localization;

  static getInstance(): Localization {
    if (!Localization.instance_) {
      Localization.instance_ = new Localization();
    }

    return Localization.instance_;
  }

  constructor() {
    this.plugins = this.loadPlugins();

    requestIdleCallback(this.preCacheTranslations.bind(this));
  }

  private preCacheTranslations() {
    // Pre-cache translations for the current language
    for (const key of Keys) {
      t7e(key);
    }
  }

  private loadPlugins(): LocaleInformation['plugins'] {
    return {};
  }
}
