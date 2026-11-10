import i18next, { InitOptions } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.json';
import { Keys, t7e } from './keys';

/**
 * Non-English languages are loaded on demand: each dynamic import() becomes its own chunk, so main.js
 * carries only English (the fallback). A literal path per language keeps the bundler able to split them.
 */
const LOCALE_LOADERS: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  cs: () => import('./cs.json'),
  de: () => import('./de.json'),
  es: () => import('./es.json'),
  fr: () => import('./fr.json'),
  it: () => import('./it.json'),
  ja: () => import('./ja.json'),
  ko: () => import('./ko.json'),
  pl: () => import('./pl.json'),
  ru: () => import('./ru.json'),
  uk: () => import('./uk.json'),
  zh: () => import('./zh.json'),
};

const opts: InitOptions = {
  interpolation: {
    escapeValue: false,
  },
  fallbackLng: 'en',
  debug: false,
  resources: {
    en: { translation: en },
  },
};

const syncDocumentLanguage = (): void => {
  if (typeof document !== 'undefined') {
    const resolved = i18next.resolvedLanguage ?? 'en';

    document.documentElement.lang = Object.hasOwn(LOCALE_LOADERS, resolved) || resolved === 'en' ? resolved : 'en';
  }
};

/**
 * Load a language's translation bundle (no-op for English, unknown codes, or an already-loaded language).
 * Accepts regional tags such as 'de-DE'. Call it before i18next.changeLanguage() so the switch resolves
 * to the real translations rather than the English fallback.
 */
export const loadLocale = async (code: string): Promise<void> => {
  const base = code.split('-')[0];
  const loader = Object.hasOwn(LOCALE_LOADERS, base) ? LOCALE_LOADERS[base] : null;

  if (!loader || i18next.hasResourceBundle(base, 'translation')) {
    return;
  }

  const bundle = await loader();

  i18next.addResourceBundle(base, 'translation', bundle.default, true, true);
};

i18next.on('languageChanged', syncDocumentLanguage);
i18next.on('initialized', syncDocumentLanguage);
const initPromise = i18next.use(LanguageDetector).init(opts);
syncDocumentLanguage();

/**
 * Resolves once the detected language's bundle is loaded and applied. Boot awaits this before the first
 * t7e() call that renders UI. Never rejects: on a load failure the app keeps running in English.
 */
export const localesReady: Promise<void> = Promise.resolve(initPromise)
  .then(() => loadLocale(i18next.language ?? 'en'))
  .then(() => {
    if (i18next.language && i18next.language !== 'en') {
      // Re-resolve so resolvedLanguage and the document lang reflect the freshly loaded bundle
      return i18next.changeLanguage(i18next.language).then(() => undefined);
    }

    return undefined;
  })
  .catch(() => undefined);

export interface SupportedLocale {
  /** BCP-47 base code matching a key in i18next `resources` above. */
  code: string;
  /** Endonym shown in language pickers (always rendered in its own script). */
  nativeName: string;
}

/**
 * Canonical list of UI languages. Keep this in lockstep with `LOCALE_LOADERS`
 * above (plus English) - it is the single source of truth for language pickers (e.g. the
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
