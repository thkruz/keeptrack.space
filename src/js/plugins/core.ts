import { isThisJest } from '../api/keepTrackApi';

// Register all core modules
export const loadCorePlugins = async (keepTrackApi: { programs?: any; register?: any }, plugins: any): Promise<void> => {
  plugins ??= {};
  try {
    // Register Catalog Loader
    await import('@app/js/plugins/catalogLoader/catalogLoader').then((mod) => mod.init());

    // Load Debug Plugins
    if (plugins.debug) await import('@app/js/plugins/debug/debug').then((mod) => mod.init());

    // Register selectSatData
    if (plugins.satInfoboxCore) await import('@app/js/plugins/selectSatManager/satInfoboxCore').then((mod) => mod.init());

    // Update Select Box
    if (plugins.updateSelectBoxCore) await import('@app/js/plugins/updateSelectBox/updateSelectBoxCore').then((mod) => mod.init());

    if (plugins.topMenu) await import('@app/js/plugins/topMenu/topMenu').then((mod) => mod.init());
    if (plugins.datetime) await import('@app/js/plugins/datetime/datetime').then((mod) => mod.init());
    if (plugins.social) await import('@app/js/plugins/social/social').then((mod) => mod.init());

    // UI Menu
    // Load order determines menu order
    if (plugins.classification) await import('@app/js/plugins/classification/classification').then((mod) => mod.init());
    if (plugins.sensor) await import('@app/js/plugins/sensor/sensor').then((mod) => mod.init());
    if (plugins.watchlist) await import('@app/js/plugins/watchlist/watchlist').then((mod) => mod.init());
    if (plugins.nextLaunch) await import('@app/js/plugins/nextLaunch/nextLaunch').then((mod) => mod.init());
    if (plugins.findSat) await import('@app/js/plugins/findSat/findSat').then((mod) => mod.init());
    if (plugins.shortTermFences) await import('@app/js/plugins/shortTermFences/shortTermFences').then((mod) => mod.init());
    if (plugins.orbitReferences) await import('@app/js/plugins/orbitReferences/orbitReferences').then((mod) => mod.init());
    if (plugins.collisions) await import('@app/js/plugins/collisions/collisions').then((mod) => mod.init());
    if (plugins.breakup) await import('@app/js/plugins/breakup/breakup').then((mod) => mod.init());
    if (plugins.editSat) await import('@app/js/plugins/editSat/editSat').then((mod) => mod.init());
    if (plugins.newLaunch) await import('@app/js/plugins/newLaunch/newLaunch').then((mod) => mod.init());
    if (plugins.satChanges) await import('@app/js/plugins/satChanges/satChanges').then((mod) => mod.init());
    if (plugins.initialOrbit) await import('@app/js/plugins/initialOrbit/initialOrbit').then((mod) => mod.init());
    if (plugins.missile)
      await import('@app/js/plugins/missile/missile')
        .then((mod) => mod.init())
        .catch((err) => {
          // If this fails and it isn't jest then throw an error
          if (!isThisJest()) {
            console.debug(err);
          }
        });
    if (plugins.stereoMap) await import('@app/js/plugins/stereoMap/stereoMap').then((mod) => mod.init());
    if (plugins.sensorFov) await import('@app/js/plugins/sensorFov/sensorFov').then((mod) => mod.init());
    if (plugins.sensorSurv) await import('@app/js/plugins/sensorSurv/sensorSurv').then((mod) => mod.init());
    if (plugins.satelliteView) await import('@app/js/plugins/satelliteView/satelliteView').then((mod) => mod.init());
    if (plugins.satelliteFov) await import('@app/js/plugins/satelliteFov/satelliteFov').then((mod) => mod.init());
    if (plugins.planetarium) await import('@app/js/plugins/planetarium/planetarium').then((mod) => mod.init());
    if (plugins.astronomy) await import('@app/js/plugins/astronomy/astronomy').then((mod) => mod.init());
    if (plugins.nightToggle) await import('@app/js/plugins/nightToggle/nightToggle').then((mod) => mod.init());
    if (plugins.dops) await import('@app/js/plugins/dops/dops').then((mod) => mod.init());
    if (plugins.constellations) await import('@app/js/plugins/constellations/constellations').then((mod) => mod.init());
    if (plugins.countries) await import('@app/js/plugins/countries/countries').then((mod) => mod.init());
    if (plugins.colorsMenu) await import('@app/js/plugins/colorsMenu/colorsMenu').then((mod) => mod.init());
    if (plugins.photo) await import('@app/js/plugins/photo/photo').then((mod) => mod.init());
    if (plugins.launchCalendar) await import('@app/js/plugins/launchCalendar/launchCalendar').then((mod) => mod.init());
    if (plugins.timeMachine) await import('@app/js/plugins/timeMachine/timeMachine').then((mod) => mod.init());
    if (plugins.photoManager) await import('@app/js/plugins/photoManager/photoManager').then((mod) => mod.init());
    if (plugins.recorderManager) await import('@app/js/plugins/recorderManager/recorderManager').then((mod) => mod.init());
    if (plugins.analysis) await import('@app/js/plugins/analysis/analysis').then((mod) => mod.init());
    if (plugins.twitter) await import('@app/js/plugins/twitter/twitter').then((mod) => mod.init());
    if (plugins.externalSources) await import('@app/js/plugins/externalSources/externalSources').then((mod) => mod.init());
    if (plugins.aboutManager) await import('@app/js/plugins/aboutManager/aboutManager').then((mod) => mod.init());
    if (plugins.settingsMenu) await import('@app/js/plugins/settingsMenu/settingsMenu').then((mod) => mod.init());
    if (plugins.soundManager) await import('@app/js/plugins/sounds/sounds').then((mod) => mod.init());
    if (plugins.gamepad) await import('@app/js/plugins/gamepad/gamepad').then((mod) => mod.init());

    keepTrackApi.register({
      method: 'uiManagerFinal',
      cbName: 'core',
      cb: function () {
        uiManagerFinal(plugins);
      },
    });
  } catch (e) {
    console.debug(e);
  }
};
export const uiManagerFinal = (plugins: any): void => {
  const bicDom = document.getElementById('bottom-icons-container');
  if (bicDom) {
    const bottomHeight = bicDom.offsetHeight;
    document.documentElement.style.setProperty('--bottom-menu-height', bottomHeight + 'px');
  } else {
    document.documentElement.style.setProperty('--bottom-menu-height', '0px');
  }

  if (plugins.topMenu) {
    let topMenuHeight = parseInt(document.documentElement.style.getPropertyValue('--top-menu-height').replace('px', ''));
    if (isNaN(topMenuHeight)) topMenuHeight = 0;
    document.documentElement.style.setProperty('--top-menu-height', topMenuHeight + 22 + 'px');
  }

  if (document.getElementById('bottom-icons') && document.getElementById('bottom-icons').innerText == '') {
    document.getElementById('nav-footer').style.visibility = 'hidden';
  }

  const bottomContainer = document.getElementById('bottom-icons-container');
  if (bottomContainer) {
    const bottomHeight = bottomContainer.offsetHeight;
    document.documentElement.style.setProperty('--bottom-menu-top', bottomHeight + 'px');
  }

  $('#versionNumber-text').html(`${settingsManager.versionNumber} - ${settingsManager.versionDate}`);

  // Only turn on analytics if on keeptrack.space ()
  if (window.location.hostname === 'keeptrack.space' || window.location.hostname === 'www.keeptrack.space') {
    startGoogleAnalytics();
  }

  const wheel = (dom: HTMLDivElement, deltaY: number) => {
    const step = 0.15;
    const pos = dom.scrollTop();
    const nextPos = pos + step * deltaY;
    dom.scrollTop(nextPos);
  };

  $('#bottom-icons-container').bind('mousewheel', function (event: any) {
    wheel($(this), event.originalEvent.deltaY);
    event.preventDefault();
  });
};

/* istanbul ignore next */
export const startGoogleAnalytics = (): void => {
  const newScript = document.createElement('script');
  newScript.type = 'text/javascript';
  newScript.setAttribute('async', 'true');
  newScript.setAttribute('src', 'https://www.googletagmanager.com/gtag/js?id=G-ENHWK6L0X7');
  document.documentElement.firstChild.appendChild(newScript);
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line no-unused-vars
  const gtag = function (_a?: string, _b?: any): void {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  gtag('js', new Date());
  gtag('config', 'G-ENHWK6L0X7');
};
