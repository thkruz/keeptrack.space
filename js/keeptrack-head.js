// Global Constants
const ZOOM_EXP = 3;
const TAU = 2 * Math.PI;
const DEG2RAD = TAU / 360;
const RAD2DEG = 360 / TAU;
const RADIUS_OF_EARTH = 6371.0;
const RADIUS_OF_SUN = 695700;
const MINUTES_PER_DAY = 1440;
const PLANETARIUM_DIST = 3;
const MILLISECONDS_PER_DAY = 1.15741e-8;

const RADIUS_OF_DRAW_SUN = 9000;
const SUN_SCALAR_DISTANCE = 250000;
const RADIUS_OF_DRAW_MOON = 4000;
const MOON_SCALAR_DISTANCE = 250000;

// Settings Manager Setup
{
    let settingsManager = {};

    //  Version Control
    settingsManager.versionNumber = '1.20.8';
    settingsManager.versionDate = 'October 20, 2020';

    // Install Folder Settings
    {
        switch (window.location.host) {
            case 'keeptrack.space':
                settingsManager.installDirectory = '/';
                settingsManager.isOfficialWebsite = true;
                break;
            case 'localhost':
                // Comment Out the Next Two Lines if you are testing on a local server
                // and have the keeptrack files installed in a subdirectory
                settingsManager.installDirectory = '/';
                break;
            case 'thkruz.github.io':
                settingsManager.installDirectory = '/keeptrack.space/';
                break;
        }
        if (typeof settingsManager.installDirectory == 'undefined') {
            // Put Your Custom Install Directory Here
            settingsManager.installDirectory = '/';
        }
    }

    settingsManager.lowPerf = false;

    if (
        window.location.hostname === 'keeptrack.space' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === 'thkruz.github.io'
    ) {
        settingsManager.unofficial = false;
    } else {
        settingsManager.unofficial = true;
    }

    // //////////////////////////////////////////////////////////////////////////
    // Most Commonly Used Settings
    // //////////////////////////////////////////////////////////////////////////

    // Adjust to change camera speed of auto rotate around earth
    settingsManager.autoRotateSpeed = 1.0 * 0.000075;
    // Disable main user interface. Currently an all or nothing package.
    settingsManager.disableUI = false;
    // Currently only disables panning. In the future it will disable all camera
    // movement
    settingsManager.disableCameraControls = false;
    // Disable normal browser events from keyboard/mouse
    settingsManager.disableNormalEvents = false;
    // Enable limited UI features
    settingsManager.enableLimitedUI = false;
    // Allows canvas will steal focus on load
    settingsManager.startWithFocus = false;
    // Shows an overlay with object information
    settingsManager.enableHoverOverlay = true;
    // Shows the oribt of the object when highlighted
    settingsManager.enableHoverOrbits = true;
    // Automatically display all of the orbits
    settingsManager.startWithOrbitsDisplayed = false;
    // Maximum orbits allowed on fullsize screens
    settingsManager.maxOribtsDisplayedDesktop = 100000;
    // Maximum orbits allowed on smaller screens
    settingsManager.maxOrbitsDisplayedMobile = 1500;
    // Canvas will autoresize on screen resize to width/height of window
    settingsManager.isAutoResizeCanvas = true;
    // Changing the zoom with the mouse wheel will stop the camera from following
    // the satellite.
    settingsManager.isZoomStopsSnappedOnSat = false;

    // How many draw calls to wait before updating orbit overlay if last draw
    // time was greater than 20ms
    settingsManager.updateHoverDelayLimitSmall = 10;

    // How many draw calls to wait before updating orbit overlay if last draw
    // time was greater than 50ms
    settingsManager.updateHoverDelayLimitBig = 15;

    settingsManager.fieldOfViewMin = 0.04; // 4 Degrees (I think)
    settingsManager.fieldOfViewMax = 1.2; // 120 Degrees (I think)

    settingsManager.minZoomDistance = 6800;
    settingsManager.maxZoomDistance = 120000;

    settingsManager.timeMachineDelay = 5000;

    // settingsManager.earthPanningBufferDistance = 100 // Needs work in main.js

    // Use to Override TLE Settings
    // settingsManager.tleSource = settingsManager.installDirectory + 'tle/TLEdebris.json'

    // Use these to default smallest resolution maps and limited "extras" like
    // the atmosphere and sun. Really useful on small screens and for faster
    // loading times
    // settingsManager.isDrawLess = true;
    // settingsManager.smallImages = true;

    // //////////////////////////////////////////////////////////////////////////
    // Mobile Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.desktopMinimumWidth = 1300;
    settingsManager.isMobileModeEnabled = false;
    if (window.innerWidth <= settingsManager.desktopMinimumWidth) {
        settingsManager.isMobileModeEnabled = true;
        // settingsManager.smallImages = true;
        settingsManager.isDrawLess = true;
        settingsManager.camDistBuffer = 100;
    }

    // //////////////////////////////////////////////////////////////////////////
    // Shader Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.showOrbitThroughEarth = false;

    settingsManager.atmosphereSize = RADIUS_OF_EARTH + 250;
    settingsManager.atmosphereColor = 'vec3(0.35,0.8,1.0)';

    settingsManager.satShader = {};
    settingsManager.satShader.largeObjectMinZoom = 0.37;
    settingsManager.satShader.largeObjectMaxZoom = 0.58;
    settingsManager.satShader.minSize = 4.0;
    // Max size dynamically changes based on zoom level
    settingsManager.satShader.maxAllowedSize = 80.0;
    settingsManager.satShader.isUseDynamicSizing = false;
    settingsManager.satShader.dynamicSizeScalar = 1.0;
    settingsManager.satShader.starSize = '20.0'; // Has to be a string
    // NOTE: Use floats not integers because some settings get sent to graphics card
    // Must be a string for GPU to read.
    settingsManager.satShader.distanceBeforeGrow = '22000.0'; // Km allowed before grow
    // Used for Satellites
    settingsManager.satShader.blurFactor1 = '0.53';
    settingsManager.satShader.blurFactor2 = '0.5';
    // Used for Stars
    settingsManager.satShader.blurFactor3 = '0.43';
    settingsManager.satShader.blurFactor4 = '0.2';

    // //////////////////////////////////////////////////////////////////////////
    // Embed Overrides - FOR TESTING ONLY
    // //////////////////////////////////////////////////////////////////////////

    let pageName = location.href.split('/').slice(-1);
    pageName = pageName[0].split('?').slice(0);

    if (pageName[0] == 'embed.html') {
        settingsManager.disableUI = true;
        settingsManager.enableLimitedUI = true;
        settingsManager.startWithOrbitsDisplayed = true;
        settingsManager.isAutoResizeCanvas = true;
        settingsManager.enableHoverOverlay = true;
        settingsManager.enableHoverOrbits = true;
        settingsManager.isDrawLess = true;
        settingsManager.smallImages = true;
        settingsManager.hiresNoCloudsImages = false;
        settingsManager.tleSource = 'tle/TLEdebris.json';
        settingsManager.updateHoverDelayLimitSmall = 25;
        settingsManager.updateHoverDelayLimitBig = 45;
    }

    // //////////////////////////////////////////////////////////////////////////
    // Map settings
    // //////////////////////////////////////////////////////////////////////////

    // settingsManager.smallImages = false;
    settingsManager.nasaImages = false;
    settingsManager.blueImages = false;
    settingsManager.lowresImages = false;
    settingsManager.hiresImages = false;
    settingsManager.hiresNoCloudsImages = false;
    settingsManager.vectorImages = false;
    settingsManager.isLoadLastMap = true;
    if (settingsManager.disableUI) {
        settingsManager.isLoadLastMap = false;
    }

    // //////////////////////////////////////////////////////////////////////////
    // Color Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.currentColorScheme = null;

    settingsManager.hoverColor = [1.0, 1.0, 0.0, 1.0]; // Yellow
    settingsManager.selectedColor = [1.0, 0.0, 0.0, 1.0]; // Red

    settingsManager.reColorMinimumTime = 1000;
    settingsManager.colors = {};
    settingsManager.colors = JSON.parse(
        localStorage.getItem('settingsManager-colors')
    );
    if (
        settingsManager.colors == null ||
        settingsManager.colors.version !== '1.0.2'
    ) {
        settingsManager.colors = {};
        settingsManager.colors.version = '1.0.2';
        settingsManager.colors.facility = [0.64, 0.0, 0.64, 1.0];
        settingsManager.colors.starHi = [1.0, 1.0, 1.0, 1.0];
        settingsManager.colors.starMed = [1.0, 1.0, 1.0, 0.35];
        settingsManager.colors.starLow = [1.0, 1.0, 1.0, 0.15];
        settingsManager.colors.sensor = [1.0, 0.0, 0.0, 1.0];
        settingsManager.colors.marker = [
            [0.2, 1.0, 1.0, 1.0],
            [1.0, 0.2, 1.0, 1.0],
            [1.0, 1.0, 0.2, 1.0],
            [0.2, 0.2, 1.0, 1.0],
            [0.2, 1.0, 0.2, 1.0],
            [1.0, 0.2, 0.2, 1.0],
            [0.5, 0.6, 1.0, 1.0],
            [0.6, 0.5, 1.0, 1.0],
            [1.0, 0.6, 0.5, 1.0],
            [1.0, 1.0, 1.0, 1.0],
            [0.2, 1.0, 1.0, 1.0],
            [1.0, 0.2, 1.0, 1.0],
            [1.0, 1.0, 0.2, 1.0],
            [0.2, 0.2, 1.0, 1.0],
            [0.2, 1.0, 0.2, 1.0],
            [1.0, 0.2, 0.2, 1.0],
            [0.5, 0.6, 1.0, 1.0],
            [0.6, 0.5, 1.0, 1.0],
        ];
        settingsManager.colors.deselected = [1.0, 1.0, 1.0, 0];
        settingsManager.colors.inview = [0.85, 0.5, 0.0, 1.0];
        settingsManager.colors.inviewAlt = [0.2, 0.4, 1.0, 1];
        settingsManager.colors.payload = [0.2, 1.0, 0.0, 0.5];
        settingsManager.colors.rocketBody = [0.2, 0.4, 1.0, 1];
        if (settingsManager.trusatOnly) {
            settingsManager.colors.debris = [0.9, 0.9, 0.9, 1];
        } else {
            settingsManager.colors.debris = [0.5, 0.5, 0.5, 1];
        }
        settingsManager.colors.unknown = [0.5, 0.5, 0.5, 0.85];
        settingsManager.colors.trusat = [1.0, 0.0, 0.6, 1.0];
        settingsManager.colors.analyst = [1.0, 1.0, 1.0, 0.8];
        settingsManager.colors.missile = [1.0, 1.0, 0.0, 1.0];
        settingsManager.colors.missileInview = [1.0, 0.0, 0.0, 1.0];
        settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0.1];
        settingsManager.colors.satHi = [1.0, 1.0, 1.0, 1.0];
        settingsManager.colors.satMed = [1.0, 1.0, 1.0, 0.8];
        settingsManager.colors.satLow = [1.0, 1.0, 1.0, 0.6];
        settingsManager.colors.sunlightInview = [0.85, 0.5, 0.0, 1.0];
        settingsManager.colors.penumbral = [1.0, 1.0, 1.0, 0.3];
        settingsManager.colors.umbral = [1.0, 1.0, 1.0, 0.1];
        // DEBUG Colors
        // settingsManager.colors.sunlight = [0.2, 0.4, 1.0, 1]
        // settingsManager.colors.penumbral = [0.5, 0.5, 0.5, 0.85]
        // settingsManager.colors.umbral = [0.2, 1.0, 0.0, 0.5]

        settingsManager.colors.gradientAmt = 0;
        // Gradients Must be Edited in color-scheme.js
        // settingsManager.colors.apogeeGradient = [1.0 - settingsManager.colors.gradientAmt, settingsManager.colors.gradientAmt, 0.0, 1.0]
        // settingsManager.colors.velGradient = [1.0 - settingsManager.colors.gradientAmt, settingsManager.colors.gradientAmt, 0.0, 1.0]
        settingsManager.colors.satSmall = [0.2, 1.0, 0.0, 0.65];
        settingsManager.colors.rcsSmall = [1.0, 0, 0, 0.6];
        settingsManager.colors.rcsMed = [0.2, 0.4, 1.0, 1];
        settingsManager.colors.rcsLarge = [0, 1.0, 0, 0.6];
        settingsManager.colors.rcsUnknown = [1.0, 1.0, 0, 0.6];
        settingsManager.colors.ageNew = [0, 1.0, 0, 0.9];
        settingsManager.colors.ageMed = [1.0, 1.0, 0.0, 0.9];
        settingsManager.colors.ageOld = [1.0, 0.6, 0, 0.9];
        settingsManager.colors.ageLost = [1.0, 0.0, 0, 0.9];
        settingsManager.colors.lostobjects = [0.2, 1.0, 0.0, 0.65];
        settingsManager.colors.satLEO = [0.2, 1.0, 0.0, 0.65];
        settingsManager.colors.satGEO = [0.2, 1.0, 0.0, 0.65];
        settingsManager.colors.inGroup = [1.0, 0.0, 0.0, 1.0];
        settingsManager.colors.countryPRC = [1.0, 0, 0, 0.6];
        settingsManager.colors.countryUS = [0.2, 0.4, 1.0, 1];
        settingsManager.colors.countryCIS = [1.0, 1.0, 1.0, 1.0];
        settingsManager.colors.countryOther = [0, 1.0, 0, 0.6];
        localStorage.setItem(
            'settingsManager-colors',
            JSON.stringify(settingsManager.colors)
        );
    }

    // //////////////////////////////////////////////////////////////////////////
    // Orbit Color Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.orbitSelectColor = [1.0, 0.0, 0.0, 0.9];
    settingsManager.orbitHoverColor = [1.0, 1.0, 0.0, 0.9];
    // settingsManager.orbitHoverColor = [0.5, 0.5, 1.0, 1.0]
    settingsManager.orbitInViewColor = [1.0, 1.0, 1.0, 0.7]; // WHITE
    // settingsManager.orbitInViewColor = [1.0, 1.0, 0.0, 1.0] // Applies to Planetarium View
    //settingsManager.orbitGroupColor = [0.3, 0.5, 1.0, 0.4]
    settingsManager.orbitGroupColor = [0.3, 1.0, 1.0, 0.7];

    // //////////////////////////////////////////////////////////////////////////
    // UI Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.nextNPassesCount = 5;

    settingsManager.minimumSearchCharacters = 2; // Searches after 3 characters typed
    settingsManager.searchLimit = 400;

    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;

    settingsManager.offsetCameraModeX = 15000;
    settingsManager.offsetCameraModeZ = -6000;

    settingsManager.fpsForwardSpeed = 3;
    settingsManager.fpsSideSpeed = 3;
    settingsManager.fpsVertSpeed = 3;
    settingsManager.fpsPitchRate = 0.02;
    settingsManager.fpsYawRate = 0.02;
    settingsManager.fpsRotateRate = 0.02;

    settingsManager.gpsElevationMask = 15;
    settingsManager.daysUntilObjectLost = 60;

    settingsManager.mobileMaxLabels = 100;
    settingsManager.desktopMaxLabels = 20000;
    settingsManager.maxLabels = 20000;

    settingsManager.isAlwaysHidePropRate = false;

    settingsManager.maxFieldOfViewMarkers = 105000;
    settingsManager.maxMissiles = 500;
    settingsManager.maxAnalystSats = 256;

    // Information Overlay Color Settings
    settingsManager.redTheme = false;
    settingsManager.themes = {};
    settingsManager.isThemesNeeded = false;
    settingsManager.themes.currentTheme = 'Blue';
    settingsManager.themes.retheme = function () {
        if (!settingsManager.isThemesNeeded) return;
        if (settingsManager.themes.currentTheme === 'Blue')
            settingsManager.themes.blueTheme(true);
        if (settingsManager.themes.currentTheme === 'Red')
            settingsManager.themes.redTheme(true);
    };
    settingsManager.themes.redTheme = function (isForce) {
        if (settingsManager.retro) return;
        if (settingsManager.themes.currentTheme === 'Red' && !isForce) return;
        document.getElementById('nav-wrapper').classList.remove('light-blue');
        document.getElementById('nav-wrapper').classList.add('red');
        document.getElementById('nav-footer').classList.add('red');
        document.getElementById('nav-footer').classList.add('darken-3');
        $('#bottom-menu').css('background', 'rgb(165, 0, 0)');
        $('.bmenu-item').css('border-right-color', 'orangered');
        $('#menu-info-overlay ').css('border-left-color', 'orangered');
        $('.side-menu').css('background', 'LightCoral');
        $('.side-menu').css('border-color', 'DarkRed');
        $('#sat-infobox').css('background', 'LightCoral');
        $('#sat-infobox').css('border-color', 'DarkRed');
        $('#legend-hover-menu').css('background', 'LightCoral');
        $('#legend-hover-menu').css('border-color', 'DarkRed');
        $('#colorbox').css('border', '10px solid DarkRed');
        // $('#search-results').css('cssText', 'background: LightCoral !important')
        // $('#search-results').css('border-color', 'DarkRed')
        // $('#search-result:hover').css('background', 'DarkRed')
        $('#nav-footer-toggle').css('background', 'DarkRed');
        $('.badge').css('cssText', 'color: DarkRed !important');
        $('.search-hilight').css('color', 'DarkRed');
        $('.btn-ui').css('background-color', 'red');
        settingsManager.themes.currentTheme = 'Red';
    };
    settingsManager.themes.redThemeSearch = function (isForce) {
        if (settingsManager.retro) return;
        if (settingsManager.themes.currentTheme !== 'Red' && !isForce) return;
        $('#search-results').css('background', 'LightCoral');
        $('#search-result:hover').css('background', 'DarkRed');
        $('.search-hilight').css('color', 'DarkRed');
    };
    settingsManager.themes.blueTheme = function (isForce) {
        if (settingsManager.retro) return;
        if (settingsManager.themes.currentTheme === 'Blue' && !isForce) return;
        document.getElementById('nav-wrapper').classList.remove('red');
        document.getElementById('nav-footer').classList.remove('red');
        document.getElementById('nav-footer').classList.remove('darken-3');
        document.getElementById('nav-wrapper').classList.add('light-blue');
        $('#nav-footer').css('background-color', '#172635');
        $('#bottom-menu').css('background', 'rgb(0,105,165)');
        $('.bmenu-item').css('border-right-color', 'steelblue');
        $('.badge').css('color', '#4dacff !important');
        $('#menu-info-overlay ').css('border-left-color', 'steelblue');
        $('.side-menu').css('background', '#1f3347');
        $('.side-menu').css('border-color', '#172635');
        // $('#search-results').css('cssText', 'background: #1f3347 !important')
        // $('#search-results:hover').css('background', '#172635')
        // $('#search-results').css('border-color', '#172635')
        $('#legend-hover-menu').css('background', '#1f3347');
        $('#legend-hover-menu').css('border-color', '#172635');
        $('#colorbox').css('border', '10px solid #172635');
        $('#sat-infobox').css('background', '#1f3347');
        $('#sat-infobox').css('border-color', '#172635');
        $('#nav-footer-toggle').css('background', '#172635');
        $('.search-hilight').css('color', '#4dacff');
        $('.btn-ui').css('background-color', '#005a8f');
        settingsManager.themes.currentTheme = 'Blue';
    };

    // //////////////////////////////////////////////////////////////////////////
    // Advanced Settings Below This Point
    // Feel free to change these, but they could break something
    // //////////////////////////////////////////////////////////////////////////

    // Frames Per Second Limiter
    settingsManager.minimumDrawDt = 0.0; // 20 FPS // 60 FPS = 0.01667

    settingsManager.camDistBuffer = 75;
    settingsManager.zNear = 1.0;
    settingsManager.zFar = 450000.0;

    // //////////////////////////////////////////////////////////////////////////
    // Defaults that should never be changed
    // //////////////////////////////////////////////////////////////////////////

    // Nominal max size - overwritten by settingsManager.satShader.maxAllowedSize
    settingsManager.satShader.maxSize =
        settingsManager.satShader.maxAllowedSize * 2;

    settingsManager.fieldOfView = 0.6;

    // Determines if the Loading is complete
    settingsManager.shadersReady = false;
    settingsManager.cruncherReady = false;

    settingsManager.lkVerify = Date.now();

    // If No UI Reduce Overhead
    if (settingsManager.disableUI) {
        // LEAVE AT LEAST ONE TO PREVENT ERRORS
        settingsManager.maxFieldOfViewMarkers = 1;
        settingsManager.maxMissiles = 1;
        settingsManager.maxAnalystSats = 1;
    }

    if (settingsManager.enableLimitedUI) {
        settingsManager.zFar = 150000;
    }

    settingsManager.limitSats = '';
    settingsManager.geolocation = {};
    settingsManager.geolocationUsed = false;
    settingsManager.mapWidth = 800;
    settingsManager.mapHeight = 600;
    settingsManager.currentLegend = 'default';
    settingsManager.socratesOnSatCruncher = null;
    settingsManager.queuedScreenshot = false;

    settingsManager.isResizing = false;
    if (typeof settingsManager.isOfficialWebsite == 'undefined') {
        settingsManager.isOfficialWebsite = false;
    }

    settingsManager.vertShadersSize = 12;
    settingsManager.isEditTime = false;
    settingsManager.isPropRateChange = false;
    settingsManager.isOnlyFOVChecked = false;
    settingsManager.isBottomMenuOpen = false;
    settingsManager.isMapMenuOpen = false;
    settingsManager.isForceColorScheme = false;

    settingsManager.isDemoModeOn = false;
    settingsManager.demoModeInterval = 3000; // in ms (3 second default)
    settingsManager.isSatLabelModeOn = true;
    settingsManager.satLabelInterval = 100; //  in ms (0.5 second default)

    settingsManager.isSatOverflyModeOn = false;
    settingsManager.isFOVBubbleModeOn = false;

    settingsManager.isMapUpdateOverride = false;
    settingsManager.lastMapUpdateTime = 0;

    settingsManager.lastSearchResults = [];

    // Export settingsManager to everyone else
    window.settingsManager = settingsManager;
}

// This is an initial parse of the GET variables
// to determine critical settings. Other variables are checked later during
// satSet.init
if (!settingsManager.disableUI) {
    (function initParseFromGETVariables() {
        let queryStr = window.location.search.substring(1);
        let params = queryStr.split('&');
        for (let i = 0; i < params.length; i++) {
            let key = params[i].split('=')[0];
            let val = params[i].split('=')[1];
            switch (key) {
                case 'lowperf':
                    settingsManager.lowPerf = true;
                    settingsManager.maxFieldOfViewMarkers = 1;
                    break;
                case 'hires':
                    settingsManager.hiresImages = true;
                    settingsManager.minimumDrawDt = 0.01667;
                    break;
                case 'draw-less':
                    settingsManager.isDrawLess = true;
                    settingsManager.smallImages = true;
                    break;
                case 'draw-more':
                    settingsManager.isDrawLess = false;
                    settingsManager.smallImages = false;
                    break;
                case 'vec':
                    settingsManager.vectorImages = true;
                    break;
                case 'retro':
                    settingsManager.retro = true;
                    settingsManager.tleSource = 'tle/retro.json';
                    break;
                case 'offline':
                    settingsManager.offline = true;
                    break;
                case 'debris':
                    settingsManager.tleSource = 'tle/TLEdebris.json';
                    break;
                case 'mw':
                    settingsManager.tleSource = 'tle/mw.json';
                    break;
                case 'trusat':
                    settingsManager.trusatMode = true;
                    settingsManager.trusatImages = true;
                    break;
                case 'trusat-only':
                    settingsManager.trusatMode = true;
                    settingsManager.trusatOnly = true;
                    settingsManager.trusatImages = true;
                    settingsManager.tleSource = 'tle/trusat.json';
                    break;
                case 'cpo':
                    settingsManager.copyrightOveride = true;
                    break;
                case 'logo':
                    settingsManager.isShowLogo = true;
                    break;
                case 'noPropRate':
                    settingsManager.isAlwaysHidePropRate = true;
                    break;
            }
        }
    })();
}

// Load the previously saved map
if (settingsManager.isLoadLastMap && !settingsManager.isDrawLess) {
    let lastMap = localStorage.getItem('lastMap');
    switch (lastMap) {
        case 'blue':
            settingsManager.blueImages = true;
            break;
        case 'nasa':
            settingsManager.nasaImages = true;
            break;
        case 'low':
            settingsManager.lowresImages = true;
            break;
        case 'trusat':
            settingsManager.trusatImages = true;
            break;
        case 'high':
            settingsManager.hiresImages = true;
            break;
        case 'high-nc':
            settingsManager.hiresNoCloudsImages = true;
            break;
        case 'vec':
            settingsManager.vectorImages = true;
            break;
        default:
            settingsManager.lowresImages = true;
            break;
    }
}

// Make sure there is some map loaded!
if (!settingsManager.smallImages &&
    !settingsManager.nasaImages &&
    !settingsManager.blueImages &&
    !settingsManager.lowresImages &&
    !settingsManager.hiresImages &&
    !settingsManager.hiresNoCloudsImages &&
    !settingsManager.vectorImages)
{
  settingsManager.lowresImages = true;
}

//Global Debug Manager
let db = {};
{
    try {
        db = JSON.parse(localStorage.getItem('db'));
        if (db == null) reloadDb();
        if (typeof db.enabled == 'undefined') reloadDb();
    } catch (e) {
        db = {};
        db.enabled = false;
        db.verbose = false;
        localStorage.setItem('db', JSON.stringify(db));
    }
    db.init = (function () {
        db.log = function (message, isVerbose) {
            // Don't Log Verbose Stuff Normally
            if (isVerbose && !db.verbose) return;

            // If Logging is Enabled - Log It
            if (db.enabled) {
                console.log(message);
            }
        };
        db.on = function () {
            db.enabled = true;
            console.log('db is now on!');
            localStorage.setItem('db', JSON.stringify(db));
        };
        db.off = function () {
            db.enabled = false;
            console.log('db is now off!');
            localStorage.setItem('db', JSON.stringify(db));
        };
        if (db.enabled) {
            // Fix for multiple sensors gettings saved locally by previous bug
            try {
                if (currentSensor.length > 1) currentSensor = currentSensor[0];
            } catch (e) {}
        }
    })();
}

// Try to Make Older Versions of Jquery Work
if (typeof $ == 'undefined') {
    if (typeof jQuery !== 'undefined') {
        var $ = jQuery;
    }
}

// Import CSS needed for loading screen
if (!settingsManager.disableUI) {
    document.write(`
    <link rel="stylesheet" href="${settingsManager.installDirectory}css/fonts.css?v=${settingsManager.versionNumber}" type="text/css"\>
    <link rel="stylesheet" href="${settingsManager.installDirectory}css/loading-screen.css?v=${settingsManager.versionNumber}" type="text/css"\>
    <link rel="stylesheet" href="${settingsManager.installDirectory}css/materialize.css?v=${settingsManager.versionNumber}" type="text/css"\>
    <link rel="stylesheet" href="${settingsManager.installDirectory}css/materialize-local.css?v=${settingsManager.versionNumber}" type="text/css"\>
    <link rel="stylesheet" href="${settingsManager.installDirectory}js/lib/colorPick.css?v=${settingsManager.versionNumber}" type="text/css"\>
    <link rel="stylesheet" href="${settingsManager.installDirectory}modules/nextLaunchManager.css?v=${settingsManager.versionNumber}" type="text/css"\>
    <link rel="stylesheet" href="${settingsManager.installDirectory}css/perfect-scrollbar.min.css?v=${settingsManager.versionNumber}" type="text/css"\>
    <link rel="stylesheet" href="${settingsManager.installDirectory}css/jquery-ui.min.css?v=${settingsManager.versionNumber}" type="text/css"\>
    <link rel="stylesheet" href="${settingsManager.installDirectory}css/jquery-ui-timepicker-addon.css?v=${settingsManager.versionNumber}" type="text/css"\>
    <link rel="stylesheet" href="${settingsManager.installDirectory}css/style.css?v=${settingsManager.versionNumber}" type="text/css"\>
    <link rel="stylesheet" href="${settingsManager.installDirectory}css/responsive.css?v=${settingsManager.versionNumber}" type="text/css"\>
  `);
} else if (settingsManager.enableLimitedUI) {
    document.write(`
    <link rel="stylesheet" href="${settingsManager.installDirectory}css/limitedUI.css?v=${settingsManager.versionNumber}" type="text/css"\>
  `);
} else {
    console.log('ERROR');
}
