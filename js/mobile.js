var maxPinchSize = 1;

(function () {
  var mobile = {};
  $(document).ready(function () { // Code Once index.htm is loaded
    $('#mobile-start-button').hide();
  });

  mobile.fullscreenToggle = function () {
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
    uiController.resize2DMap();
  };

  var isSearchOpen = false;
  var forceClose = false;
  var forceOpen = false;
  mobile.searchToggle = function (force) {
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
    } else {
      isSearchOpen = false;
      $('#search-holder').removeClass('search-slide-down');
      $('#search-holder').addClass('search-slide-up');
      uiController.hideSideMenus();
      $('#search').val('');
      searchBox.hideResults();
      isMilSatSelected = false;
      $('#menu-space-stations').removeClass('bmenu-item-selected');
      satSet.setColorScheme(ColorScheme.default, true);
    }
  };

  var isSocialOpen = false;
  mobile.socialToggle = function (forceClose) {
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
    if ($(document).width() <= settingsManager.desktopMinimumWidth) {
      settingsManager.isMobileModeEnabled = true;
      settingsManager.fieldOfView = 1.2;
      settingsManager.cameraMovementSpeed = 0.0001;
      settingsManager.cameraMovementSpeedMin = 0.0001;
      settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
    } else {
      settingsManager.isMobileModeEnabled = false;
      settingsManager.cameraMovementSpeed = 0.003;
      settingsManager.cameraMovementSpeedMin = 0.005;
    }
  };

  mobile.start = function () {
    mobile.checkMobileMode();
    maxPinchSize = Math.hypot($(document).width(),$(document).height());
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
