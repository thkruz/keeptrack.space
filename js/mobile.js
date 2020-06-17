var maxPinchSize = 1;

(function () {
  var mobile = {};
  $(document).ready(function () { // Code Once index.htm is loaded
    $('#mobile-start-button').hide();
  });

  mobile.fullscreenToggle = function () {
    db.log('mobile.fullscreenToggle');
    if ((document.fullScreenElement && document.fullScreenElement !== null) ||
     (!document.mozFullScreen && !document.webkitIsFullScreen)) {
      if (document.documentElement.requestFullScreen) {
        document.documentElement.requestFullScreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullScreen) {
        document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
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
      satSet.setColorScheme(ColorScheme.default, true);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
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
    if (window.innerWidth <= settingsManager.desktopMinimumWidth) {
      settingsManager.isDisableSatHoverBox = true;
      settingsManager.isMobileModeEnabled = true;
      settingsManager.cameraMovementSpeed = 0.0001;
      settingsManager.cameraMovementSpeedMin = 0.0001;
      settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
      settingsManager.maxLabels = settingsManager.mobileMaxLabels;
    } else {
      settingsManager.isDisableSatHoverBox = false;
      settingsManager.isMobileModeEnabled = false;
      settingsManager.cameraMovementSpeed = 0.003;
      settingsManager.cameraMovementSpeedMin = 0.005;
      settingsManager.fieldOfView = 0.6;
      settingsManager.maxLabels = settingsManager.desktopMaxLabels;
    }
  };

  mobile.start = function () {
    db.log('mobile.checkMobileMode');
    mobile.checkMobileMode();
    maxPinchSize = Math.hypot(window.innerWidth,$(document).height());
    $('#loading-screen').removeClass('full-loader');
    $('#loading-screen').addClass('mini-loader-container');
    $('#logo-inner-container').addClass('mini-loader');
    $('#logo-text').html('');
    $('#loader-text').html('Attempting to Math...');
    $('#loading-screen').fadeOut();
    $('#spinner').show();
    $('#mobile-start-button').hide();
    mobile.fullscreenToggle();
    settingsManager.isDisableSatHoverBox = true;
  };

  window.mobile = mobile;
})();
