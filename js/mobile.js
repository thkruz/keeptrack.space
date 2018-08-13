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
      $('#menu-sensor-info img').hide();
      $('#menu-in-coverage img').hide();
      // $('#menu-lookangles img').removeClass('bmenu-item-disabled');
      // $('#menu-lookanglesmultisite img').removeClass('bmenu-item-disabled');
      $('#zoom-in').show();
      $('#zoom-out').show();
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
      $('#menu-newLaunch img').hide();
      $('#menu-missile img').show();
      $('#social').hide();
      $('#version-info').hide();
      $('#legend-menu').hide();
      $('#mobile-warning').show();
      $('#changelog-row').addClass('center-align');
      $('#fastCompSettings').hide();
      $('#social-alt').show();
      $('.side-menu').attr('style', 'width:100%;height:auto;');
      $('#canvas-holder').attr('style', 'overflow:auto;');
      $('#datetime').attr('style', 'position:fixed;left:130px;top:10px;width:141px;height:32px');
      $('#datetime-text').attr('style', 'padding:6px;height:100%;');
      $('#datetime-input').attr('style', 'bottom:0px;');
      $('#bottom-icons').attr('style', 'position:inherit;');
      $('#mobile-controls').show();
      $('#search').attr('style', 'width:55px;');
      if ($(document).height() >= 600) {
        $('#sat-infobox').attr('style', 'width:100%;top:75%; padding: 0px 5%;');
      } else {
        $('#sat-infobox').attr('style', 'width:100%;top:60%; padding: 0px 5%;');
      }
      $('.sat-info-value').attr('style', 'width:45%;float: right; text-overflow: ellipsis; overflow: hidden;');
  }

  });
  mobile.init = function () {
    maxPinchSize = Math.hypot($(document).width(),$(document).height());
  };
  mobile.start = function () {
    $('#loading-screen').removeClass('full-loader');
    $('#loading-screen').addClass('mini-loader-container');
    $('#logo-inner-container').addClass('mini-loader');
    $('#logo-text').html('');
    $('#loader-text').html('Attempting to Math...');
    $('#loading-screen').fadeOut();
    $('#spinner').show();
    $('#mobile-start-button').hide();
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    }
  };

  window.mobile = mobile;
})();
