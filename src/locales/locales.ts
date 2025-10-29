import i18next, { InitOptions } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import ja from './ja.json';
import { Keys, t7e } from './keys';
import ko from './ko.json';
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
  },
};

i18next.use(LanguageDetector).init(opts);

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
    Keys.forEach((key) => {
      t7e(Keys[key]);
    });
  }

  private loadPlugins(): LocaleInformation['plugins'] {
    return {
      ProximityOps: {
        bottomIconLabel: i18next.t('plugins.ProximityOps.bottomIconLabel'),
        title: i18next.t('plugins.ProximityOps.title'),
        helpBody: i18next.t('plugins.ProximityOps.helpBody'),
        noradId: i18next.t('plugins.ProximityOps.noradId'),
        maxDistThreshold: i18next.t('plugins.ProximityOps.maxDistThreshold'),
        maxRelativeVelocity: i18next.t('plugins.ProximityOps.maxRelativeVelocity'),
        searchDuration: i18next.t('plugins.ProximityOps.searchDuration'),
        geoText: i18next.t('plugins.ProximityOps.geoText'),
        leoText: i18next.t('plugins.ProximityOps.leoText'),
        orbitType: i18next.t('plugins.ProximityOps.orbitType'),
        geoAllVsAll: i18next.t('plugins.ProximityOps.geoAllVsAll'),
        geoAllVsAllTooltip: i18next.t('plugins.ProximityOps.geoAllVsAllTooltip'),
        comparePayloadsOnly: i18next.t('plugins.ProximityOps.comparePayloadsOnly'),
        comparePayloadsOnlyTooltip: i18next.t('plugins.ProximityOps.comparePayloadsOnlyTooltip'),
        ignoreVimpelRso: i18next.t('plugins.ProximityOps.ignoreVimpelRso'),
        ignoreVimpelRsoTooltip: i18next.t('plugins.ProximityOps.ignoreVimpelRsoTooltip'),
      },
    };
  }
}
