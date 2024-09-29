import { keepTrackApi } from '@app/keepTrackApi';
import { getEl, hideEl, showEl } from '@app/lib/get-el';
import { slideInDown, slideOutUp } from '@app/lib/slide';
import { ConeSettings } from '@app/singletons/draw-manager/cone-mesh';
import { Degrees, Kilometers } from 'ootk';
import { SettingsManager } from './../settings';

export const sateliot = (settingsManager: SettingsManager) => {
  settingsManager.satShader.minSize = 30.0;
  settingsManager.limitSats = '60550,60534,60552,60537';
  settingsManager.disableAllPlugins();
  settingsManager.isDisableStars = true;
  settingsManager.maxAnalystSats = 1;
  settingsManager.maxMissiles = 1;
  settingsManager.maxFieldOfViewMarkers = 1;
  settingsManager.noMeshManager = false;
  settingsManager.isLoadLastMap = false;
  settingsManager.isShowRocketBodies = true;
  settingsManager.isShowDebris = true;
  settingsManager.isShowPayloads = true;
  settingsManager.isShowAgencies = false;
  settingsManager.nasaImages = true;
  settingsManager.isAllowRightClick = false;
  settingsManager.isDisableSelectSat = false;
  settingsManager.isDisableSensors = true;
  settingsManager.isDisableControlSites = true;
  settingsManager.isDisableLaunchSites = true;
  settingsManager.isLoadLastSensor = false;
  settingsManager.isEnableJscCatalog = false;
  // SATELIOT
  settingsManager.isDrawSun = true;
  settingsManager.isDisableMoon = false;
  settingsManager.isDrawAurora = true;
  settingsManager.isShowRocketBodies = true;
  settingsManager.plugins.nightToggle = true;
  settingsManager.maxZoomDistance = <Kilometers>65000;
  settingsManager.zFar = 300000;
  settingsManager.minDistanceFromSatellite = <Kilometers>4;
  // only load the 3D model of a sateliot satellite
  settingsManager.meshListOverride = ['sateliotsat'];
  settingsManager.plugins.satelliteFov = true;
  const SATELIOT_FOV_ANGLE = 52.32;

  settingsManager.plugins.satInfoboxCore = true;
  settingsManager.plugins.topMenu = false;
  settingsManager.plugins.settingsMenu = false;
  settingsManager.plugins.soundManager = false;

  // detect if is a mobile device checking the screen width
  const isMobile = window.innerWidth < 1024;

  if (isMobile) {
    console.log('isMobile');
    settingsManager.maxZoomDistance = <Kilometers>150000;
    settingsManager.zFar = 300000;
  }
  // detect if is a tablet device checking the screen width
  const isTablet = window.innerWidth < 1024 && window.innerWidth > 768;

  if (isTablet) {
    console.log('isTablet');
    settingsManager.maxZoomDistance = <Kilometers>100000;
    settingsManager.zFar = 300000;
  }

  settingsManager.onLoadCb = () => {
    keepTrackApi.getUiManager().searchManager.doSearch('60550,60534,60552,60537');
    keepTrackApi.getMainCamera().lookAtLatLon(41.38160380932027 as Degrees, 2.1420305583779276 as Degrees, 0.67); // Look at HQ

    hideEl('nav-footer');
    hideEl('nav-wrapper');
    showEl('sateliot-logo');
    showEl('toggle-search-icon');

    getEl('map-2d-icon')?.addEventListener('click', () => {
      window.location.href = './2d-map.html'; // Redirigir al visualizador 2D
    });
    getEl('sateliot-github-icon')?.addEventListener('click', () => {
      window.location.href = 'https://github.com/Sateliot/sateliot.keeptrack'; // Redirigir al visualizador 2D
    });

    keepTrackApi.getCatalogManager().getActiveSats().forEach((currentSat) => {
      if (currentSat) {
        const coneFactory = keepTrackApi.getScene().coneFactory;
        const cone = coneFactory.checkCacheForMesh_(currentSat);

        if (cone) {
          coneFactory.remove(cone.id);
        } else {
          const coneSettings = {
            fieldOfView: SATELIOT_FOV_ANGLE as Degrees,
            color: [0.2, 1.0, 1.0, 0.15],
          } as ConeSettings;

          coneFactory.generateMesh(currentSat, coneSettings);
        }
      }
    });

    // open/close results
    getEl('toggle-search-icon')?.addEventListener('click', () => {
      // const searchResults = getEl('search-results');
      const searchManagerInstance = keepTrackApi.getUiManager().searchManager;

      searchManagerInstance.isSearchOpen = !searchManagerInstance.isSearchOpen;
      if (searchManagerInstance.isSearchOpen) {
        slideOutUp(getEl('search-results'), 1000);
      } else {
        slideInDown(getEl('search-results'), 1000);
      }
    });

    // restore the view
    getEl('restore-view-icon')?.addEventListener('click', () => {
      console.log('restore view');
      keepTrackApi.getMainCamera().reset();
      keepTrackApi.getMainCamera().lookAtLatLon(41.38160380932027 as Degrees, 2.1420305583779276 as Degrees, 0.67);
    });
  };
};
