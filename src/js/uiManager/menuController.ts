import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { saveCsv } from '@app/js/lib/helpers';
import $ from 'jquery';
import { SpaceObjectType } from '../api/SpaceObjectType';

export const initMenuController = () => {
  const { objectManager, orbitManager, satSet, satellite, searchBox, uiManager } = keepTrackApi.programs;

  document.getElementById('search-icon').addEventListener('click', () => {
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

  // document.getElementById('search-close').addEventListener('click', () => {
  //   searchBox.hideResults();
  //   document.getElementById('menu-space-stations').classList.remove('bmenu-item-selected');
  // });

  document.getElementById('legend-hover-menu').addEventListener('click', function (e: any) {
    if (e.target.classList[1]) {
      uiManager.legendHoverMenuClick(e.target.classList[1]);
    }
  });

  document.getElementById('legend-menu').addEventListener('click', () => {
    if (settingsManager.legendMenuOpen) {
      document.getElementById('legend-hover-menu').style.display = 'none';
      document.getElementById('legend-icon').classList.remove('bmenu-item-selected');
      settingsManager.legendMenuOpen = false;
    } else {
      document.getElementById('legend-hover-menu').style.display = 'block';
      document.getElementById('legend-icon').classList.add('bmenu-item-selected');
      searchBox.hideResults();
      document.getElementById('search-results').style.display = 'none';
      settingsManager.legendMenuOpen = true;
    }
  });

  document.querySelector('.menu-selectable').addEventListener('click', () => {
    if (objectManager.selectedSat !== -1) {
      document.getElementById('menu-lookangles').classList.remove('bmenu-item-disabled');
      document.getElementById('menu-satview').classList.remove('bmenu-item-disabled');
    }
  });

  // Resizing Listener
  $(window).on('resize', () => {
    uiManager.mobileManager.checkMobileMode();
    if (!settingsManager.disableUI) {
      const bodyDOM = document.getElementById('bodyDOM');
      if (settingsManager.screenshotMode) {
        bodyDOM.style.overflow = 'visible';
        $('#canvas-holder').css('overflow', 'visible');
        $('#canvas-holder').width(3840);
        $('#canvas-holder').height(2160);
        bodyDOM.style.width = '3840px';
        bodyDOM.style.height = '2160px';
      } else {
        bodyDOM.style.overflow = 'hidden';
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

  document.getElementById('search-results').addEventListener('click', function (evt: Event) {
    // must be '.search-result' class
    if (!(<HTMLElement>evt.target).classList.contains('search-result')) return;
    var satId = $(this).data('obj-id');
    const sat = satSet.getSat(satId);
    if (sat.type === SpaceObjectType.STAR) {
      uiManager.panToStar(sat);
    } else {
      objectManager.setSelectedSat(satId);
    }
  });

  $('#search-results').on('mouseover', '.search-result', function () {
    const satId = <number>$(this).data('obj-id');
    searchForSat(satId);
  });
  $('#search-results').on('mouseout', () => {
    orbitManager.clearHoverOrbit();
    satSet.setHover(-1);
    searchBox.isHovering(false);
  });

  $('#search').on('input', () => {
    const searchStr = <string>(<HTMLInputElement>document.getElementById('search')).value;
    uiManager.doSearch(searchStr);
  });

  var isSocialOpen = false;
  document.getElementById('share-icon').addEventListener('click', () => {
    if (!isSocialOpen) {
      isSocialOpen = true;
      document.getElementById('github-share').classList.remove('share-up');
      document.getElementById('twitter-share').classList.remove('share-up');
      document.getElementById('github-share').classList.add('github-share-down');
      document.getElementById('twitter-share').classList.add('twitter-share-down');
    } else {
      isSocialOpen = false;
      document.getElementById('github-share').classList.add('share-up');
      document.getElementById('twitter-share').classList.add('share-up');
      document.getElementById('github-share').classList.remove('github-share-down');
      document.getElementById('twitter-share').classList.remove('twitter-share-down');
    }
  });

  document.getElementById('fullscreen-icon').addEventListener('click', () => {
    uiManager.mobileManager.fullscreenToggle();
  });

  document.getElementById('nav-footer-toggle').addEventListener('click', () => {
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

  document.getElementById('export-lookangles').addEventListener('click', () => {
    saveCsv(satellite.lastlooksArray, 'lookAngles');
  });

  document.getElementById('export-multiSiteArray').addEventListener('click', () => {
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
