import i18next, { InitOptions } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import ja from './ja.json';
import { t7e } from './keys';
import ko from './ko.json';
import ru from './ru.json';
import uk from './uk.json';
import zh from './zh.json';


const opts: InitOptions = {
  interpolation: {
    escapeValue: false,
  },
  // lng: 'ukUA',
  fallbackLng: 'en',
  debug: false,
  resources: {
    de: {
      translation: de, // German
    },
    en: {
      translation: en, // English
    },
    es: {
      translation: es, // Spanish
    },
    ja: {
      translation: ja, // Japanese
    },
    ko: {
      translation: ko, // Korean
    },
    uk: {
      translation: uk, // Ukrainian
    },
    ru: {
      translation: ru, // Russian
    },
    zh: {
      translation: zh, // Chinese
    },
  },
};

i18next.use(LanguageDetector).init(opts);

export interface LocaleInformation {
  plugins: {
    [pluginName: string]: {
      bottomIconLabel?: string;
      title?: string;
      helpBody?: string;
    };
  };
}

/**
 * This function is mainly for reloading the localization object
 * during testing
 * @returns localization object
 */
export const loadLocalization = () => ({
  plugins: {
    SensorListPlugin: {
      bottomIconLabel: t7e('plugins.SensorListPlugin.bottomIconLabel'),
      title: t7e('plugins.SensorListPlugin.title'),
      helpBody: t7e('plugins.SensorListPlugin.helpBody'),
    },
    SensorInfoPlugin: {
      bottomIconLabel: t7e('plugins.SensorInfoPlugin.bottomIconLabel'),
      title: t7e('plugins.SensorInfoPlugin.title'),
      helpBody: t7e('plugins.SensorInfoPlugin.helpBody'),
    },
    CustomSensorPlugin: {
      bottomIconLabel: t7e('plugins.CustomSensorPlugin.bottomIconLabel'),
      title: t7e('plugins.CustomSensorPlugin.title'),
      helpBody: t7e('plugins.CustomSensorPlugin.helpBody'),
    },
    LookAnglesPlugin: {
      bottomIconLabel: t7e('plugins.LookAnglesPlugin.bottomIconLabel'),
      title: t7e('plugins.LookAnglesPlugin.title'),
      helpBody: t7e('plugins.LookAnglesPlugin.helpBody'),
    },
    MultiSiteLookAnglesPlugin: {
      bottomIconLabel: t7e('plugins.MultiSiteLookAnglesPlugin.bottomIconLabel'),
      title: t7e('plugins.MultiSiteLookAnglesPlugin.title'),
      helpBody: t7e('plugins.MultiSiteLookAnglesPlugin.helpBody'),
    },
    SensorTimeline: {
      bottomIconLabel: t7e('plugins.SensorTimeline.bottomIconLabel'),
      title: t7e('plugins.SensorTimeline.title'),
      helpBody: t7e('plugins.SensorTimeline.helpBody'),
    },
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
    SatelliteTimeline: {
      bottomIconLabel: t7e('plugins.SatelliteTimeline.bottomIconLabel'),
      title: t7e('plugins.SatelliteTimeline.title'),
      helpBody: t7e('plugins.SatelliteTimeline.helpBody'),
    },
    WatchlistPlugin: {
      bottomIconLabel: t7e('plugins.WatchlistPlugin.bottomIconLabel'),
      title: t7e('plugins.WatchlistPlugin.title'),
      helpBody: t7e('plugins.WatchlistPlugin.helpBody'),
    },
    WatchlistOverlay: {
      bottomIconLabel: t7e('plugins.WatchlistOverlay.bottomIconLabel'),
      title: t7e('plugins.WatchlistOverlay.title'),
      helpBody: t7e('plugins.WatchlistOverlay.helpBody'),
    },
    ReportsPlugin: {
      bottomIconLabel: t7e('plugins.ReportsPlugin.bottomIconLabel'),
      title: t7e('plugins.ReportsPlugin.title'),
      helpBody: t7e('plugins.ReportsPlugin.helpBody'),
    },
    PolarPlotPlugin: {
      bottomIconLabel: t7e('plugins.PolarPlotPlugin.bottomIconLabel'),
      title: t7e('plugins.PolarPlotPlugin.title'),
      helpBody: t7e('plugins.PolarPlotPlugin.helpBody'),
    },
    NextLaunchesPlugin: {
      bottomIconLabel: t7e('plugins.NextLaunchesPlugin.bottomIconLabel'),
      title: t7e('plugins.NextLaunchesPlugin.title'),
      helpBody: t7e('plugins.NextLaunchesPlugin.helpBody'),
    },
    FindSatPlugin: {
      bottomIconLabel: t7e('plugins.FindSatPlugin.bottomIconLabel'),
      title: t7e('plugins.FindSatPlugin.title'),
      helpBody: t7e('plugins.FindSatPlugin.helpBody'),
    },
    ShortTermFences: {
      bottomIconLabel: t7e('plugins.ShortTermFences.bottomIconLabel'),
      title: t7e('plugins.ShortTermFences.title'),
      helpBody: t7e('plugins.ShortTermFences.helpBody'),
    },
    Collisions: {
      bottomIconLabel: t7e('plugins.Collisions.bottomIconLabel'),
      title: t7e('plugins.Collisions.title'),
      helpBody: t7e('plugins.Collisions.helpBody'),
    },
    TrackingImpactPredict: {
      bottomIconLabel: t7e('plugins.TrackingImpactPredict.bottomIconLabel'),
      title: t7e('plugins.TrackingImpactPredict.title'),
      helpBody: t7e('plugins.TrackingImpactPredict.helpBody'),
    },
    Breakup: {
      bottomIconLabel: t7e('plugins.Breakup.bottomIconLabel'),
      title: t7e('plugins.Breakup.title'),
      helpBody: t7e('plugins.Breakup.helpBody'),
    },
    DebrisScreening: {
      bottomIconLabel: t7e('plugins.DebrisScreening.bottomIconLabel'),
      title: t7e('plugins.DebrisScreening.title'),
      helpBody: t7e('plugins.DebrisScreening.helpBody'),
    },
    TransponderChannelData: {
      bottomIconLabel: t7e('plugins.TransponderChannelData.bottomIconLabel'),
      title: t7e('plugins.TransponderChannelData.title'),
      helpBody: t7e('plugins.TransponderChannelData.helpBody'),
    },
    EditSat: {
      bottomIconLabel: t7e('plugins.EditSat.bottomIconLabel'),
      title: t7e('plugins.EditSat.title'),
      helpBody: t7e('plugins.EditSat.helpBody'),
    },
    NewLaunch: {
      bottomIconLabel: t7e('plugins.NewLaunch.bottomIconLabel'),
      title: t7e('plugins.NewLaunch.title'),
      helpBody: t7e('plugins.NewLaunch.helpBody'),
    },
    MissilePlugin: {
      bottomIconLabel: t7e('plugins.MissilePlugin.bottomIconLabel'),
      title: t7e('plugins.MissilePlugin.title'),
      helpBody: t7e('plugins.MissilePlugin.helpBody'),
    },
    StereoMap: {
      bottomIconLabel: t7e('plugins.StereoMap.bottomIconLabel'),
      title: t7e('plugins.StereoMap.title'),
      helpBody: t7e('plugins.StereoMap.helpBody'),
    },
    SensorFov: {
      bottomIconLabel: t7e('plugins.SensorFov.bottomIconLabel'),
    },
    SensorSurvFence: {
      bottomIconLabel: t7e('plugins.SensorSurvFence.bottomIconLabel'),
    },
    SatelliteViewPlugin: {
      bottomIconLabel: t7e('plugins.SatelliteViewPlugin.bottomIconLabel'),
    },
    SatelliteFov: {
      bottomIconLabel: t7e('plugins.SatelliteFov.bottomIconLabel'),
      title: t7e('plugins.SatelliteFov.title'),
      helpBody: t7e('plugins.SatelliteFov.helpBody'),
    },
    Planetarium: {
      bottomIconLabel: t7e('plugins.Planetarium.bottomIconLabel'),
    },
    NightToggle: {
      bottomIconLabel: t7e('plugins.NightToggle.bottomIconLabel'),
    },
    SatConstellations: {
      bottomIconLabel: t7e('plugins.SatConstellations.bottomIconLabel'),
      title: t7e('plugins.SatConstellations.title'),
      helpBody: t7e('plugins.SatConstellations.helpBody'),
    },
    CountriesMenu: {
      bottomIconLabel: t7e('plugins.CountriesMenu.bottomIconLabel'),
      title: t7e('plugins.CountriesMenu.title'),
      helpBody: t7e('plugins.CountriesMenu.helpBody'),
    },
    ColorMenu: {
      bottomIconLabel: t7e('plugins.ColorMenu.bottomIconLabel'),
      title: t7e('plugins.ColorMenu.title'),
      helpBody: t7e('plugins.ColorMenu.helpBody'),
    },
    Screenshot: {
      bottomIconLabel: t7e('plugins.Screenshot.bottomIconLabel'),
    },
    LaunchCalendar: {
      bottomIconLabel: t7e('plugins.LaunchCalendar.bottomIconLabel'),
    },
    TimeMachine: {
      bottomIconLabel: t7e('plugins.TimeMachine.bottomIconLabel'),
    },
    SatellitePhotos: {
      bottomIconLabel: t7e('plugins.SatellitePhotos.bottomIconLabel'),
      title: t7e('plugins.SatellitePhotos.title'),
      helpBody: t7e('plugins.SatellitePhotos.helpBody'),
    },
    ScreenRecorder: {
      bottomIconLabel: t7e('plugins.ScreenRecorder.bottomIconLabel'),
    },
    Astronomy: {
      bottomIconLabel: t7e('plugins.Astronomy.bottomIconLabel'),
    },
    AnalysisMenu: {
      bottomIconLabel: t7e('plugins.AnalysisMenu.bottomIconLabel'),
      title: t7e('plugins.AnalysisMenu.title'),
      helpBody: t7e('plugins.AnalysisMenu.helpBody'),
    },
    SettingsMenuPlugin: {
      bottomIconLabel: t7e('plugins.SettingsMenuPlugin.bottomIconLabel'),
      title: t7e('plugins.SettingsMenuPlugin.title'),
      helpBody: t7e('plugins.SettingsMenuPlugin.helpBody'),
    },
    VideoDirectorPlugin: {
      bottomIconLabel: t7e('plugins.VideoDirectorPlugin.bottomIconLabel'),
      title: t7e('plugins.VideoDirectorPlugin.title'),
      helpBody: t7e('plugins.VideoDirectorPlugin.helpBody'),
    },
    Calculator: {
      bottomIconLabel: t7e('plugins.Calculator.bottomIconLabel'),
      title: t7e('plugins.Calculator.title'),
      helpBody: t7e('plugins.Calculator.helpBody'),
    },
    CreateSat: {
      bottomIconLabel: t7e('plugins.CreateSat.bottomIconLabel'),
      title: t7e('plugins.CreateSat.title'),
      helpBody: t7e('plugins.CreateSat.helpBody'),
    },
    DopsPlugin: {
      bottomIconLabel: t7e('plugins.DopsPlugin.bottomIconLabel'),
      title: t7e('plugins.DopsPlugin.title'),
      helpBody: t7e('plugins.DopsPlugin.helpBody'),
    },
    EciPlot: {
      bottomIconLabel: t7e('plugins.EciPlot.bottomIconLabel'),
      title: t7e('plugins.EciPlot.title'),
      helpBody: t7e('plugins.EciPlot.helpBody'),
    },
    EcfPlot: {
      bottomIconLabel: t7e('plugins.EcfPlot.bottomIconLabel'),
      title: t7e('plugins.EcfPlot.title'),
      helpBody: t7e('plugins.EcfPlot.helpBody'),
    },
    RicPlot: {
      bottomIconLabel: t7e('plugins.RicPlot.bottomIconLabel'),
      title: t7e('plugins.RicPlot.title'),
      helpBody: t7e('plugins.RicPlot.helpBody'),
    },
    Time2LonPlots: {
      bottomIconLabel: t7e('plugins.Time2LonPlots.bottomIconLabel'),
      title: t7e('plugins.Time2LonPlots.title'),
      helpBody: t7e('plugins.Time2LonPlots.helpBody'),
    },
    Lat2LonPlots: {
      bottomIconLabel: t7e('plugins.Lat2LonPlots.bottomIconLabel'),
      title: t7e('plugins.Lat2LonPlots.title'),
      helpBody: t7e('plugins.Lat2LonPlots.helpBody'),
    },
    Inc2AltPlots: {
      bottomIconLabel: t7e('plugins.Inc2AltPlots.bottomIconLabel'),
      title: t7e('plugins.Inc2AltPlots.title'),
      helpBody: t7e('plugins.Inc2AltPlots.helpBody'),
    },
    Inc2LonPlots: {
      bottomIconLabel: t7e('plugins.Inc2LonPlots.bottomIconLabel'),
      title: t7e('plugins.Inc2LonPlots.title'),
      helpBody: t7e('plugins.Inc2LonPlots.helpBody'),
    },
    GraphicsMenuPlugin: {
      bottomIconLabel: t7e('plugins.GraphicsMenuPlugin.bottomIconLabel'),
      title: t7e('plugins.GraphicsMenuPlugin.title'),
      helpBody: t7e('plugins.GraphicsMenuPlugin.helpBody'),
    },
  },
});

export const Localization: LocaleInformation = loadLocalization();
