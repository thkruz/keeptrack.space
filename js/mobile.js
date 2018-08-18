var maxPinchSize = 1;

(function () {
  var mobile = {};
  $(document).ready(function () { // Code Once index.htm is loaded
    $('#mobile-start-button').hide();

    // Hide Menus on Small Screens
    if ($(document).width() <= settingsManager.desktopMinimumWidth) {
      settingsManager.isMobileModeEnabled = true;
      // TODO FullScreen Option
      // document.documentElement.webkitRequestFullScreen();
      $('#menu-sensor-info img').show();
      $('#menu-in-coverage img').hide();
      // $('#menu-lookangles img').removeClass('bmenu-item-disabled');
      // $('#menu-lookanglesmultisite img').removeClass('bmenu-item-disabled');
      $('#zoom-in img').removeClass('bmenu-item-disabled');
      $('#zoom-out img').removeClass('bmenu-item-disabled');
      $('#menu-find-sat img').removeClass('bmenu-item-disabled');
      $('#menu-twitter img').hide();
      $('#menu-weather img').hide();
      // $('#menu-map img').removeClass('bmenu-item-disabled');
      $('#menu-launches img').hide();
      $('#menu-about img').removeClass('bmenu-item-disabled');
      $('#menu-about img').attr('style', 'border-right:0px;');
      $('#menu-space-stations img').hide();
      $('#menu-satellite-collision img').removeClass('bmenu-item-disabled');
      $('#menu-customSensor img').removeClass('bmenu-item-disabled');
      $('#menu-settings').hide();
      $('#menu-editSat img').show();
      $('#menu-newLaunch img').show();
      $('#menu-missile img').show();
      $('#social').hide();
      $('#version-info').hide();
      $('#mobile-warning').show();
      $('#changelog-row').addClass('center-align');
      $('#fastCompSettings').hide();
      $('#social-alt').show();
      $('.side-menu').attr('style', 'width:100%;height:auto;');
      $('#canvas-holder').attr('style', 'overflow:auto;');
      // $('#datetime').attr('style', 'position:fixed;left:130px;top:10px;width:141px;height:32px');
      $('#datetime-text').attr('style', 'padding:6px;height:100%;');
      $('#datetime-input').attr('style', 'bottom:0px;');
      $('#bottom-icons').attr('style', 'position:inherit;');
      $('#mobile-controls').show();
      // if ($(document).height() >= 600) {
      //   $('#sat-infobox').attr('style', 'width:100%;top:75%; padding: 0px 5%;');
      // } else {
      //   $('#sat-infobox').attr('style', 'width:100%;top:60%; padding: 0px 5%;');
      // }
      $('.sat-info-value').attr('style', 'width:45%;float: right; text-overflow: ellipsis; overflow: hidden;');
  }

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
      $('#menu-space-stations img').removeClass('bmenu-item-selected');
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
