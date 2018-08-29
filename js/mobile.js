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
  mobile.searchToggle = function (forceClose) {
    forceClose = forceClose || false;
    if (!isSearchOpen && !forceClose) {
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
      $('#facebook-share').removeClass('share-up');
      $('#twitter-share').removeClass('share-up');
      $('#reddit-share').removeClass('share-up');
      $('#facebook-share').addClass('facebook-share-down');
      $('#twitter-share').addClass('twitter-share-down');
      $('#reddit-share').addClass('reddit-share-down');
    } else {
      isSocialOpen = false;
      $('#facebook-share').addClass('share-up');
      $('#reddit-share').addClass('share-up');
      $('#twitter-share').addClass('share-up');
      $('#facebook-share').removeClass('facebook-share-down');
      $('#twitter-share').removeClass('twitter-share-down');
      $('#reddit-share').removeClass('reddit-share-down');
    }
  };

  mobile.start = function () {
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
