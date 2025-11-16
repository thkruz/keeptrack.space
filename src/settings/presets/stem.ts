import { BottomMenu } from '@app/app/ui/bottom-menu';
import { MenuMode } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import {
  EarthBumpTextureQuality, EarthCloudTextureQuality, EarthDayTextureQuality, EarthNightTextureQuality, EarthPoliticalTextureQuality, EarthSpecTextureQuality,
} from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { getEl } from '@app/engine/utils/get-el';
import { SettingsManager } from '../settings';

export const stemEnvironment = (settingsManager: SettingsManager) => {
  settingsManager.isBlockPersistence = true;

  settingsManager.disableAllPlugins();
  settingsManager.plugins.SoundManager = { enabled: true };
  settingsManager.plugins.SatInfoBoxCore = { enabled: true };
  settingsManager.plugins.SatInfoBoxObject = { enabled: true };
  settingsManager.plugins.EarthAtmosphere = { enabled: true };

  settingsManager.plugins.TopMenu = { enabled: true };

  settingsManager.plugins.CountriesMenu = { enabled: true };
  settingsManager.plugins.ColorMenu = { enabled: true };
  settingsManager.plugins.Collisions = { enabled: true };
  settingsManager.plugins.SatellitePhotos = { enabled: true };
  settingsManager.plugins.FilterMenuPlugin = { enabled: true };
  settingsManager.plugins.NextLaunchesPlugin = { enabled: true };
  settingsManager.plugins.TimeMachine = { enabled: true };
  settingsManager.plugins.StereoMap = { enabled: true };
  settingsManager.isShowSplashScreen = true;


  settingsManager.simulationTime = new Date('2025-04-01T00:00:00Z'); // Set to April 1, 2025

  settingsManager.isEnableJscCatalog = false;

  settingsManager.earthDayTextureQuality = '16k' as EarthDayTextureQuality;
  settingsManager.earthNightTextureQuality = '16k' as EarthNightTextureQuality;
  settingsManager.earthSpecTextureQuality = '8k' as EarthSpecTextureQuality;
  settingsManager.earthBumpTextureQuality = '8k' as EarthBumpTextureQuality;
  settingsManager.earthPoliticalTextureQuality = 'off' as EarthPoliticalTextureQuality;
  settingsManager.earthCloudTextureQuality = '8k' as EarthCloudTextureQuality;

  settingsManager.disableCameraControls = true;

  settingsManager.isShowLoadingHints = false; // Disable Loading Hints

  settingsManager.splashScreenList = ['epfl-1', 'epfl-2', 'thule', 'rocket', 'cubesat'];

  settingsManager.isDisableAsciiCatalog = true;
  settingsManager.defaultColorScheme = 'CelestrakColorScheme';

  settingsManager.isLoadLastMap = false;
  settingsManager.isAllowRightClick = false;
  settingsManager.isDisableSelectSat = false;

  settingsManager.isShowAgencies = false;
  settingsManager.isDisableSensors = true;
  settingsManager.isDisableControlSites = true;
  settingsManager.isDisableLaunchSites = true;
  settingsManager.isLoadLastSensor = false;

  settingsManager.isDisableExtraCatalog = false;

  EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
    BottomMenu.changeMenuMode(MenuMode.ALL);

    getEl('bottom-icons-filter')!.style.display = 'none';
    document.documentElement.style.setProperty('--bottom-filter-width', '0px');
  });
};
