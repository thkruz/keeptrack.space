var maxPinchSize = 1;

(function () {
    var mobile = {};
    $(document).ready(function () {
        // Code Once index.htm is loaded
        $('#mobile-start-button').hide();
    });

    mobile.fullscreenToggle = function () {
        db.log('mobile.fullscreenToggle');
        if (
            (document.fullScreenElement &&
                document.fullScreenElement !== null) ||
            (!document.mozFullScreen && !document.webkitIsFullScreen)
        ) {
            if (document.documentElement.requestFullScreen) {
                document.documentElement.requestFullScreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullScreen) {
                document.documentElement.webkitRequestFullScreen(
                    Element.ALLOW_KEYBOARD_INPUT
                );
            }
        } else {
            if (document.cancelFullScreen) {
                document.cancelFullScreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            }
        }
        uiManager.resize2DMap();
    };

    var isSearchOpen = false;
    var forceClose = false;
    var forceOpen = false;
    mobile.searchToggle = function (force) {
        db.log('mobile.searchToggle');
        // Reset Force Options
        forceClose = false;
        forceOpen = false;

        // Pass false to force close and true to force open
        if (typeof force != 'undefined') {
            if (!force) forceClose = true;
            if (force) forceOpen = true;
        }

        if ((!isSearchOpen && !forceClose) || forceOpen) {
            isSearchOpen = true;
            $('#search-holder').removeClass('search-slide-up');
            $('#search-holder').addClass('search-slide-down');
            $('#search-icon').addClass('search-icon-search-on');
            $('#fullscreen-icon').addClass('top-menu-icons-search-on');
            $('#tutorial-icon').addClass('top-menu-icons-search-on');
            $('#legend-icon').addClass('top-menu-icons-search-on');
        } else {
            isSearchOpen = false;
            $('#search-holder').removeClass('search-slide-down');
            $('#search-holder').addClass('search-slide-up');
            $('#search-icon').removeClass('search-icon-search-on');
            setTimeout(function () {
                $('#fullscreen-icon').removeClass('top-menu-icons-search-on');
                $('#tutorial-icon').removeClass('top-menu-icons-search-on');
                $('#legend-icon').removeClass('top-menu-icons-search-on');
            }, 500);
            uiManager.hideSideMenus();
            searchBox.hideResults();
            isMilSatSelected = false;
            $('#menu-space-stations').removeClass('bmenu-item-selected');

            // This is getting called too much. Not sure what it was meant to prevent?
            // satSet.setColorScheme(ColorScheme.default, true);
            // uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        }
    };

    var isSocialOpen = false;
    mobile.socialToggle = function (forceClose) {
        db.log('mobile.socialToggle');
        forceClose = forceClose || false;
        if (!isSocialOpen && !forceClose) {
            isSocialOpen = true;
            $('#github-share').removeClass('share-up');
            $('#twitter-share').removeClass('share-up');
            $('#github-share').addClass('github-share-down');
            $('#twitter-share').addClass('twitter-share-down');
        } else {
            isSocialOpen = false;
            $('#github-share').addClass('share-up');
            $('#twitter-share').addClass('share-up');
            $('#github-share').removeClass('github-share-down');
            $('#twitter-share').removeClass('twitter-share-down');
        }
    };

    mobile.checkMobileMode = function () {
        db.log('mobile.checkMobileMode');
        if (mobile.checkIfMobileDevice()) {
            mobile.forceResize = true;
            settingsManager.maxOribtsDisplayed =
                settingsManager.maxOrbitsDisplayedMobile;
            settingsManager.enableHoverOverlay = false;
            settingsManager.isMobileModeEnabled = true;
            settingsManager.cameraMovementSpeed = 0.0001;
            settingsManager.cameraMovementSpeedMin = 0.0001;
            if (settingsManager.isUseHigherFOVonMobile) {
                settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
            } else {
                settingsManager.fieldOfView = 0.6;
            }
            settingsManager.maxLabels = settingsManager.mobileMaxLabels;
        } else {
            settingsManager.maxOribtsDisplayed =
                settingsManager.maxOribtsDisplayedDesktop;
            if (typeof settingsManager.enableHoverOverlay == 'undefined') {
                settingsManager.enableHoverOverlay = true;
            }
            settingsManager.isMobileModeEnabled = false;
            settingsManager.cameraMovementSpeed = 0.003;
            settingsManager.cameraMovementSpeedMin = 0.005;
            if (settingsManager.isUseHigherFOVonMobile) {
                settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
            } else {
                settingsManager.fieldOfView = 0.6;
            }
            settingsManager.maxLabels = settingsManager.desktopMaxLabels;
        }
    };

    mobile.checkIfMobileDevice = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
    };

    mobile.start = function () {
        db.log('mobile.checkMobileMode');
        mobile.checkMobileMode();
        mobile.fullscreenToggle();
        maxPinchSize = Math.hypot(window.innerWidth, $(document).height());
        $('#loading-screen').removeClass('full-loader');
        $('#loading-screen').addClass('mini-loader-container');
        $('#logo-inner-container').addClass('mini-loader');
        $('#logo-text').html('');
        $('#loading-screen').hide();
        settingsManager.loadStr('math');
        $('#spinner').show();
        $('#mobile-start-button').hide();
        settingsManager.enableHoverOverlay = false;
    };

    window.mobile = mobile;
})();
