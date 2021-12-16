import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { saveCsv } from '@app/js/lib/helpers';
import $ from 'jquery';

export const initMenuController = () => {
  const { objectManager, orbitManager, satSet, satellite, searchBox, uiManager } = keepTrackApi.programs;

  $('#search-icon').on('click', () => {
    uiManager.searchToggle();
  });

  $('.menu-item').on('mouseover', function () {
    $(this).children('.submenu').css({
      display: 'block',
    });
  });

  $('.menu-item').on('mouseout', function () {
    $(this).children('.submenu').css({
      display: 'none',
    });
  });

  $('#search-close').on('click', () => {
    searchBox.hideResults();
    $('#menu-space-stations').removeClass('bmenu-item-selected');
  });

  $('#legend-hover-menu').on('click', function (e: any) {
    uiManager.legendHoverMenuClick(e.target.classList[1]);
  });

  $('#legend-menu').on('click', () => {
    if (settingsManager.legendMenuOpen) {
      $('#legend-hover-menu').hide();
      $('#legend-icon').removeClass('bmenu-item-selected');
      settingsManager.legendMenuOpen = false;
    } else {
      // uiManager.legendColorsChange(); // Disabled colors show up again.
      $('#legend-hover-menu').show();
      $('#legend-icon').addClass('bmenu-item-selected');
      searchBox.hideResults();
      $('#search-results').hide();
      settingsManager.legendMenuOpen = true;
    }
  });

  $('.menu-selectable').on('click', () => {
    if (objectManager.selectedSat !== -1) {
      $('#menu-lookangles').removeClass('bmenu-item-disabled');
      $('#menu-satview').removeClass('bmenu-item-disabled');
    }
  });

  // Resizing Listener
  $(window).on('resize', () => {
    uiManager.mobileManager.checkMobileMode();
    if (!settingsManager.disableUI) {
      const bodyDOM = $('#bodyDOM');
      if (settingsManager.screenshotMode) {
        bodyDOM.css('overflow', 'visible');
        $('#canvas-holder').css('overflow', 'visible');
        $('#canvas-holder').width(3840);
        $('#canvas-holder').height(2160);
        bodyDOM.width(3840);
        bodyDOM.height(2160);
      } else {
        bodyDOM.css('overflow', 'hidden');
        $('#canvas-holder').css('overflow', 'hidden');
      }
    }
    settingsManager.isResizing = true;
  });

  $('#search').on('focus', function () {
    uiManager.isCurrentlyTyping = true;
  });
  $('#ui-wrapper').on('focusin', function () {
    uiManager.isCurrentlyTyping = true;
  });

  $('#search').on('blur', function () {
    uiManager.isCurrentlyTyping = false;
  });
  $('#ui-wrapper').on('focusout', function () {
    uiManager.isCurrentlyTyping = false;
  });

  $('#search-results').on('click', '.search-result', function () {
    var satId = $(this).data('sat-id');
    objectManager.setSelectedSat(satId);
  });

  $('#search-results').on('mouseover', '.search-result', function () {
    const satId = <number>$(this).data('sat-id');
    searchForSat(satId);
  });
  $('#search-results').on('mouseout', () => {
    orbitManager.clearHoverOrbit();
    satSet.setHover(-1);
    searchBox.isHovering(false);
  });

  $('#search').on('input', () => {
    const searchStr = <string>$('#search').val();
    uiManager.doSearch(searchStr);
  });

  var isSocialOpen = false;
  $('#share-icon').on('click', () => {
    if (!isSocialOpen) {
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
  });

  $('#fullscreen-icon').on('click', () => {
    uiManager.mobileManager.fullscreenToggle();
  });

  $('#nav-footer-toggle').on('click', () => {
    uiManager.footerToggle();
    if (parseInt(window.getComputedStyle(document.getElementById('nav-footer')).bottom.replace('px', '')) < 0) {
      setTimeout(() => {
        const bottomHeight = document.getElementById('bottom-icons-container').offsetHeight;
        document.documentElement.style.setProperty('--bottom-menu-top', bottomHeight + 'px');
      }, 1000); // Wait for the footer to be fully visible.
    } else {
      // If the footer is open, then it will be hidden shortly but we don't want to wait for it to be hidden
      document.documentElement.style.setProperty('--bottom-menu-top', '0px');
    }
  });

  // Allow All Side Menu Resizing
  (<any>$('#sensor-list-menu')).resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 400,
    minWidth: 280,
  });

  (<any>$('#sensor-info-menu')).resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 400,
    minWidth: 280,
  });

  (<any>$('#lookangles-menu')).resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  (<any>$('#lookanglesmultisite-menu')).resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 600,
    minWidth: 300,
  });

  (<any>$('#findByLooks-menu')).resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  (<any>$('#customSensor-menu')).resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  (<any>$('#settings-menu')).resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  (<any>$('#about-menu')).resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#export-lookangles').on('click', () => {
    saveCsv(satellite.lastlooksArray, 'lookAngles');
  });

  $('#export-multiSiteArray').on('click', () => {
    saveCsv(satellite.lastMultiSiteArray, 'multiSiteLooks');
  });
};

export const searchForSat = (satId: number) => {
  const { orbitManager, satSet, searchBox } = keepTrackApi.programs;
  orbitManager.setHoverOrbit(satId);
  satSet.setHover(satId);
  searchBox.isHovering(true);
  searchBox.setHoverSat(satId);
};
