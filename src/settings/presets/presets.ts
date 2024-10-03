import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl, hideEl, setInnerHtml, showEl } from '@app/lib/get-el';
import { lat2pitch, lon2yaw } from '@app/lib/transforms';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { TimeMachine } from '@app/plugins/time-machine/time-machine';
import { ConeSettings } from '@app/singletons/draw-manager/cone-mesh';
import { Degrees, Kilometers, Milliseconds } from 'ootk';
import { slideInDown, slideOutUp } from '../../lib/slide';
import { SettingsManager } from '../settings';
export class SettingsPresets {
  static loadPresetMillionYear(settings: SettingsManager) {
    settings.maxZoomDistance = <Kilometers>200000;
    settings.zFar = 600000;
    settings.isDrawSun = false;
    settings.isDisableMoon = true;
    settings.satShader.minSize = 2.0;
    settings.isDisableSensors = true;
    settings.isDisableControlSites = true;
    settings.isDisableLaunchSites = true;
    settings.isLoadLastSensor = false;
    settings.isShowNotionalSats = false;
    settings.maxAnalystSats = 1;
    settings.maxMissiles = 1;
    settings.maxFieldOfViewMarkers = 1;
    settings.isEPFL = true;
    settings.disableAllPlugins();
    settings.plugins.timeMachine = true;
    settings.loopTimeMachine = true;
    settings.timeMachineDelay = <Milliseconds>6000;
    settings.timeMachineDelayAtPresentDay = <Milliseconds>(1000 * 60 * 4); // 4 Minutes

    settings.colors.transparent = [1, 1, 1, 0.4];
    settings.colors.rocketBody = [0.5, 0.5, 0.5, 1];
    settings.colors.unknown = [0.5, 0.5, 0.5, 1];
    settings.colors.pink = [0.5, 0.5, 0.5, 1];
    settings.colors.notional = [0.5, 0.5, 0.5, 1];
    settings.colors.deselected = [0, 0, 0, 0];
    settings.selectedColor = [0, 0, 0, 0];
    settings.selectedColorFallback = [0, 0, 0, 0];
    settings.isDrawOrbits = false;

    settings.timeMachineString = (yearStr) => {
      window.M.Toast.dismissAll(); // Dismiss All Toast Messages (workaround to avoid animations)
      const yearPrefix = parseInt(yearStr) < 57 ? '20' : '19';
      const english = `In ${yearPrefix}${yearStr}`;
      /*
       * const french = `En ${yearPrefix}${yearStr}`;
       * const german = `Im ${yearPrefix}${yearStr}`;
       */
      const satellitesSpan = '<span style="color: rgb(35, 255, 35);">Satellites </span>';
      const debrisSpan = '<span style="color: rgb(150, 150, 150);">Debris </span>';

      document.getElementById('textOverlay').innerHTML = `${satellitesSpan} and ${debrisSpan} ${english}`;

      return `${english}`;
    };
    settings.onLoadCb = () => {
      // Create div for textOverlay
      const textOverlay = document.createElement('div');

      textOverlay.id = 'textOverlay';
      document.body.appendChild(textOverlay);

      // Update CSS
      const toastCss = `
                    .toast,
                    .toast-container {
                      display: none !important;
                    }
                  `;
      const style = document.createElement('style');

      style.type = 'text/css';
      style.appendChild(document.createTextNode(toastCss));
      document.head.appendChild(style);

      document.getElementById('textOverlay').style.cssText = `
                    border-radius: 2px;
                    bottom: 75px;
                    right: 150px;
                    width: auto;
                    position: absolute;
                    min-height: 48px;
                    line-height: 2rem !important;
                    background-color: rgb(0, 0, 0) !important;
                    padding: 10px 10px !important;
                    font-size: 2rem !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Open Sans', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
                    font-weight: 300;
                    color: white;
                  }`;

      getEl('nav-footer').style.display = 'none';
      keepTrackApi.getPlugin(TimeMachine).isMenuButtonActive = true;
      keepTrackApi.getPlugin(TimeMachine).bottomIconCallback();
    };
  }

  static loadPresetMillionYear2(settings: SettingsManager) {
    SettingsPresets.loadPresetMillionYear(settings);
    settings.isDrawOrbits = true;
  }

  static loadPresetStarlink(settings: SettingsManager) {
    settings.maxAnalystSats = 1;
    settings.maxMissiles = 1;
    settings.maxFieldOfViewMarkers = 1;
    // settings.isNotionalDebris = true;
    settings.isEnableExtendedCatalog = false;
    settings.searchLimit = 6500;
    settings.isDisableExtraCatalog = true;
    settings.isDisableAsciiCatalog = true;
    settings.isStarlinkOnly = true;
    settings.isShowStarlinkSats = true;
    settings.isEnableJscCatalog = false;

    settings.isShowAgencies = false;
    settings.isAllowRightClick = false;
    settings.isDisableSelectSat = true;
    settings.isDisableSensors = true;
    settings.isDisableControlSites = true;
    settings.isDisableLaunchSites = true;
    settings.isLoadLastSensor = false;
    settings.isShowNotionalSats = false;

    settings.isEPFL = true;
    settings.disableAllPlugins();

    settings.onLoadCb = () => {
      keepTrackApi.getUiManager().searchManager.doSearch('starlink');
    };
  }

  static loadPresetAltitudes_(settings: SettingsManager) {
    settings.maxAnalystSats = 1;
    settings.maxMissiles = 1;
    settings.maxFieldOfViewMarkers = 1;
    // settings.isNotionalDebris = true;
    settings.isEnableExtendedCatalog = true;
    settings.isShowAgencies = false;
    settings.isDisableLaunchSites = true;
    settings.isDisableControlSites = true;
    settings.isDisableSensors = true;
    settings.colors.transparent = [1, 1, 1, 0.4];
    settings.colors.rocketBody = [0.5, 0.5, 0.5, 1];
    settings.colors.unknown = [0.5, 0.5, 0.5, 1];
    settings.colors.pink = [0.5, 0.5, 0.5, 1];
    settings.colors.notional = [0.5, 0.5, 0.5, 1];
    settings.colors.deselected = [0, 0, 0, 0];
    settings.selectedColor = [0, 0, 0, 0];
    settings.selectedColorFallback = [0, 0, 0, 0];
    settings.isDrawOrbits = false;
    settings.maxNotionalDebris = 0.5 * 1000000; // 2.5 million
    settings.searchLimit = 100000;
    settings.isEPFL = true;
    settings.isDisableExtraCatalog = false;
    settings.offline = true;
    settings.timeMachineDelay = <Milliseconds>1325;
    settings.maxZoomDistance = <Kilometers>2000000;
    settings.satShader.minSize = 8.0;
    settings.isDisableAsciiCatalog = true;
    settings.plugins.videoDirector = true;
    settings.zFar = 1250000.0;
    settings.isDisableMoon = false;

    settings.hiresMilkWay = true;
    settings.earthNumLatSegs = 128;
    settings.earthNumLonSegs = 128;
    settings.hiresImages = true;

    settings.autoZoomSpeed = 0.001;
    settings.autoRotateSpeed = 0.000025;

    settings.timeMachineString = (yearStr) => {
      window.M.Toast.dismissAll(); // Dismiss All Toast Messages (workaround to avoid animations)
      const yearPrefix = parseInt(yearStr) < 57 ? '20' : '19';
      const english = `In ${yearPrefix}${yearStr}`;
      /*
       * const french = `En ${yearPrefix}${yearStr}`;
       * const german = `Im ${yearPrefix}${yearStr}`;
       */
      const satellitesSpan = '<span style="color: rgb(35, 255, 35);">Satellites </span>';
      const debrisSpan = '<span style="color: rgb(150, 150, 150);">Debris </span>';

      setInnerHtml('textOverlay', `${satellitesSpan} and ${debrisSpan} ${english}`);

      return `${english}`;
    };
    settings.onLoadCb = () => {
      // Create div for textOverlay
      const textOverlay = document.createElement('div');

      textOverlay.id = 'textOverlay';
      keepTrackApi.containerRoot.appendChild(textOverlay);

      // Update CSS
      const toastCss = `
                    .toast,
                    .toast-container {
                      display: none !important;
                    }
                  `;
      const style = document.createElement('style');

      style.type = 'text/css';
      style.appendChild(document.createTextNode(toastCss));
      document.head.appendChild(style);

      getEl('textOverlay').style.cssText = `
                    border-radius: 2px;
                    bottom: 75px;
                    right: 150px;
                    width: auto;
                    position: absolute;
                    min-height: 48px;
                    line-height: 2.5em !important;
                    background-color: rgb(0, 0, 0) !important;
                    padding: 10px 55px !important;
                    font-size: 1.8rem !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Open Sans', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
                    font-weight: 300;
                    color: white;
                  }`;
    };
  }

  static loadPresetDebris(settings: SettingsManager) {
    settings.disableAllPlugins();
    settings.isDisableStars = true;
    settings.maxAnalystSats = 1;
    settings.maxMissiles = 1;
    settings.maxFieldOfViewMarkers = 1;
    settings.noMeshManager = true;
    settings.isLoadLastMap = false;
    settings.isShowRocketBodies = true;
    settings.isShowDebris = true;
    settings.isShowPayloads = false;
    settings.isShowAgencies = false;
    settings.lowresImages = true;
    settings.isAllowRightClick = false;
    settings.isDisableSelectSat = false;
    settings.isDisableSensors = true;
    settings.isDisableControlSites = true;
    settings.isDisableLaunchSites = true;
    settings.isLoadLastSensor = false;
    settings.colors.rocketBody = [0.5, 0.5, 0.5, 1];
    settings.colors.unknown = [0.5, 0.5, 0.5, 1];
    settings.colors.pink = [0.5, 0.5, 0.5, 1];
    settings.maxOribtsDisplayedDesktopAll = 100000;
    settings.maxOribtsDisplayed = 100000;
    settings.searchLimit = 100000;

    settings.onLoadCb = () => {
      const groupManagerInstance = keepTrackApi.getGroupsManager();
      const allSats = groupManagerInstance.createGroup(0, null);

      groupManagerInstance.selectGroup(allSats);
      allSats.updateOrbits();
      keepTrackApi.getColorSchemeManager().setColorScheme((<any>keepTrackApi.getColorSchemeManager()).group, true);
    };
  }

  static loadPresetOpsCenter(settings: SettingsManager) {
    settings.politicalImages = true;
    settings.isDrawSun = false;
    settings.isDisableStars = true;
    settings.isDrawAtmosphere = false;
    settings.isDrawAurora = false;
    settings.isShowRocketBodies = false;
    settings.isShowDebris = false;
    settings.isDrawBumpMap = false;
    settings.isDrawSpecMap = false;
    settings.isDrawMilkyWay = false;
    settings.isGraySkybox = false;
    settings.isLoadLastMap = false;
    settings.isShowNotionalSats = false;
    settings.isShowStarlinkSats = false;
  }

  static loadPresetEducation(settings: SettingsManager) {
    settings.isShowSplashScreen = true;
    settings.isEPFL = true;
    settings.disableAllPlugins();
    settings.plugins.gamepad = true;
    settings.isLoadLastMap = false;
    settings.isShowRocketBodies = true;
    settings.isShowDebris = true;
    settings.isShowPayloads = true;
    settings.isShowAgencies = false;
    settings.isShowNotionalSats = false;
    settings.lowresImages = true;
    settings.isAllowRightClick = false;
    settings.isDisableSelectSat = true;
    settings.isDisableSensors = true;
    settings.isDisableControlSites = true;
    settings.isDisableLaunchSites = true;
    settings.isLoadLastSensor = false;
    settings.colors.rocketBody = [0.5, 0.5, 0.5, 1];
    settings.colors.unknown = [0.5, 0.5, 0.5, 1];
    settings.colors.pink = [0.5, 0.5, 0.5, 1];
  }

  static loadPresetOutreach(settings: SettingsManager) {
    settings.satShader.minSize = 30.0;
    settings.limitSats = '25544';
    settings.disableAllPlugins();
    settings.isDisableStars = true;
    settings.maxAnalystSats = 1;
    settings.maxMissiles = 1;
    settings.maxFieldOfViewMarkers = 1;
    settings.noMeshManager = false;
    settings.isLoadLastMap = false;
    settings.isShowRocketBodies = true;
    settings.isShowDebris = true;
    settings.isShowPayloads = true;
    settings.isShowAgencies = false;
    settings.nasaImages = true;
    settings.isAllowRightClick = false;
    settings.isDisableSelectSat = false;
    settings.isDisableSensors = true;
    settings.isDisableControlSites = true;
    settings.isDisableLaunchSites = true;
    settings.isLoadLastSensor = false;
    settings.isEnableJscCatalog = false;
    settings.onLoadCb = () => {
      const groupManagerInstance = keepTrackApi.getGroupsManager();
      const sccNumGroup = groupManagerInstance.createGroup(9, [25544]);

      groupManagerInstance.selectGroup(sccNumGroup);
      sccNumGroup.updateOrbits();
      keepTrackApi.getColorSchemeManager().setColorScheme((<any>keepTrackApi.getColorSchemeManager()).group, true);
    };
  }

  static _show2DMapIcon() {
    const mapIcon = document.getElementById('map-2d-icon');

    mapIcon.addEventListener('click', () => {
      window.location.href = './2d-map.html';
    });
  }

  static _showGitHubIcon() {
    const githubIcon = document.getElementById('sateliot-github-icon');

    githubIcon.addEventListener('click', () => {
      window.location.href = 'https://github.com/Sateliot/sateliot.keeptrack';
    });
  }

  static _showRestoreViewIcon() {

    getEl('restore-view-icon').addEventListener('click', () => {
      keepTrackApi.getPlugin(SelectSatManager)?.selectSat(-1); // Deselect Any Satellites
      setTimeout(() => {
        // (<TimeMachine>keepTrackApi.getPlugin(TimeMachine)).historyOfSatellitesPlay(); // Start Time Machine
        keepTrackApi.getMainCamera().zoomTarget = 0.67; // Reset Zoom to Default
        keepTrackApi.getMainCamera().camSnap(lat2pitch(0 as Degrees), lon2yaw(0 as Degrees, new Date())); // Reset Camera to Default
      }, 1000);
      setTimeout(() => {
        keepTrackApi.getMainCamera().isAutoPitchYawToTarget = false; // Disable Camera Snap Mode
        keepTrackApi.getMainCamera().autoRotate(true); // Start Rotating Camera
      }, 3000);
    });
  }

  static _showFovSatelliteFOVCones(angle) {
    const allSats = keepTrackApi.getCatalogManager().getActiveSats();

    allSats.forEach((currentSat) => {
      if (currentSat) {
        const coneFactory = keepTrackApi.getScene().coneFactory;
        const cone = coneFactory.checkCacheForMesh_(currentSat);

        if (cone) {
          coneFactory.remove(cone.id);
        } else {
          const coneSettings = {
            fieldOfView: angle as Degrees,
            color: [0.2, 1.0, 1.0, 0.15],
          } as ConeSettings;

          coneFactory.generateMesh(currentSat, coneSettings);
        }
      }
    });
  }

  static _searchResultsManager() {
    // open/close results
    getEl('toggle-search-icon').addEventListener('click', () => {
      const searchManagerInstance = keepTrackApi.getUiManager().searchManager;

      searchManagerInstance.isSearchOpen = !searchManagerInstance.isSearchOpen;
      if (searchManagerInstance.isSearchOpen) {
        slideOutUp(getEl('search-results'), 1000);
      } else {
        slideInDown(getEl('search-results'), 1000);
      }
    });
  }

  static loadPresetSateliot(settings: SettingsManager) {
    console.log("Sateliot Preset");
    settings.satShader.minSize = 30.0;
    settings.limitSats = '60550,60534,60552,60537';
    settings.disableAllPlugins();
    settings.isDisableStars = true;
    settings.maxAnalystSats = 1;
    settings.maxMissiles = 1;
    settings.maxFieldOfViewMarkers = 1;
    settings.noMeshManager = false;
    settings.isLoadLastMap = false;
    settings.isShowRocketBodies = true;
    settings.isShowDebris = true;
    settings.isShowPayloads = true;
    settings.isShowAgencies = false;
    settings.nasaImages = true;
    settings.isAllowRightClick = false;
    settings.isDisableSelectSat = false;
    settings.isDisableSensors = true;
    settings.isDisableControlSites = true;
    settings.isDisableLaunchSites = true;
    settings.isLoadLastSensor = false;
    settings.isEnableJscCatalog = false;
    settings.isDrawSun = true;
    settings.isDisableMoon = false;
    settings.isDrawAurora = true;
    settings.isShowRocketBodies = true;
    settings.plugins.nightToggle = true;
    settings.maxZoomDistance = <Kilometers>70000;
    settings.zFar = 300000;
    settings.minDistanceFromSatellite = <Kilometers>4;
    // only load the 3D model of a sateliot satellite
    settings.meshListOverride = ['sateliotsat'];
    settings.plugins.satelliteFov = true;
    const SATELIOT_FOV_ANGLE = 52.32;

    settings.plugins.satInfoboxCore = true;
    settings.plugins.settingsMenu = false;
    settings.plugins.soundManager = false;
    settings.plugins.topMenu = true;
    settings.plugins.datetime = true;

    // detect if is a mobile device checking the screen width
    const isMobile = window.innerWidth < 1024;

    if (isMobile) {
      console.log('isMobile');
      settings.maxZoomDistance = <Kilometers>150000;
      settings.zFar = 300000;
    }
    // detect if is a tablet device checking the screen width
    const isTablet = window.innerWidth < 1024 && window.innerWidth > 768;

    if (isTablet) {
      console.log('isTablet');
      settings.maxZoomDistance = <Kilometers>100000;
      settings.zFar = 300000;
    }

    settings.onLoadCb = () => {
      hideEl('nav-footer');
      // hideEl('nav-wrapper');
      hideEl('nav-mobile2');
      showEl('sateliot-logo');
      showEl('toggle-search-icon');
      hideEl('jday');

      keepTrackApi.getUiManager().searchManager.doSearch(settings.limitSats);

      this._show2DMapIcon();

      this._showGitHubIcon();

      this._showRestoreViewIcon();

      this._showFovSatelliteFOVCones(SATELIOT_FOV_ANGLE);

      this._searchResultsManager();

    };
  }

  static loadPresetSateliotOps(settings: SettingsManager) {
    console.log("Sateliot Ops Preset");
    this.loadPresetSateliot(settings);

  }

  static loadPresetFacSat2(settings: SettingsManager) {
    settings.isDisableKeyboard = true;
    settings.isShowLogo = true;
    settings.isShowSplashScreen = false;
    settings.maxAnalystSats = 1;
    settings.maxMissiles = 1;
    settings.maxFieldOfViewMarkers = 1;
    settings.isShowSplashScreen = true;
    settings.isEPFL = true;
    settings.disableAllPlugins();
    settings.isLoadLastMap = false;
    settings.isShowRocketBodies = true;
    settings.isShowDebris = true;
    settings.isShowPayloads = true;
    settings.isShowAgencies = false;
    settings.lowresImages = true;
    settings.isAllowRightClick = false;
    settings.isDisableSensors = true;
    settings.isEnableJscCatalog = false;
    settings.isDisableControlSites = true;
    settings.isDisableLaunchSites = true;
    settings.isLoadLastSensor = false;
    settings.colors.payload = [0.2, 1.0, 0.0, 0.1];
    settings.colors.rocketBody = [0.5, 0.5, 0.5, 0.1];
    settings.colors.debris = [0.5, 0.5, 0.5, 0.1];
    settings.colors.unknown = [0.5, 0.5, 0.5, 0.1];
    settings.colors.pink = [0.5, 0.5, 0.5, 0.1];
    keepTrackApi.register({
      event: KeepTrackApiEvents.onCruncherReady,
      cbName: 'satFromsettings: SettingsManager',
      cb: () => {
        keepTrackApi.getTimeManager().changeStaticOffset(1672588802000 - Date.now());
        setTimeout(() => {
          keepTrackApi.getPlugin(SelectSatManager)?.selectSat(keepTrackApi.getCatalogManager().sccNum2Id(43721));
          settings.isDisableSelectSat = true;
        }, 5000);
      },
    });
  }
}
