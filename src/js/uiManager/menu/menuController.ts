import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { clickAndDragWidth, getEl, saveCsv } from '@app/js/lib/helpers';
import $ from 'jquery';

export const initMenuController = () => {
  const { objectManager, orbitManager, satSet, satellite, searchBox, uiManager } = keepTrackApi.programs;

  getEl('search-icon').addEventListener('click', () => {
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

  getEl('legend-hover-menu').addEventListener('click', function (e: any) {
    if (e.target.classList[1]) {
      uiManager.legendHoverMenuClick(e.target.classList[1]);
    }
  });

  getEl('legend-menu').addEventListener('click', () => {
    if (settingsManager.legendMenuOpen) {
      getEl('legend-hover-menu').style.display = 'none';
      getEl('legend-icon').classList.remove('bmenu-item-selected');
      settingsManager.legendMenuOpen = false;
    } else {
      getEl('legend-hover-menu').style.display = 'block';
      getEl('legend-icon').classList.add('bmenu-item-selected');
      searchBox.hideResults();
      settingsManager.legendMenuOpen = true;
    }
  });

  document.querySelector('.menu-selectable').addEventListener('click', () => {
    if (objectManager.selectedSat !== -1) {
      getEl('menu-lookangles').classList.remove('bmenu-item-disabled');
      getEl('menu-satview').classList.remove('bmenu-item-disabled');
    }
  });

  // Resizing Listener
  window.addEventListener('resize', () => {
    uiManager.mobileManager.checkMobileMode();
    if (!settingsManager.disableUI) {
      const bodyDOM = getEl('bodyDOM');
      if (settingsManager.screenshotMode) {
        bodyDOM.style.overflow = 'visible';
        getEl('canvas-holder').style.overflow = 'visible';
        getEl('canvas-holder').style.width = '3840px';
        getEl('canvas-holder').style.height = '2160px';
        bodyDOM.style.width = '3840px';
        bodyDOM.style.height = '2160px';
      } else {
        bodyDOM.style.overflow = 'hidden';
        getEl('canvas-holder').style.overflow = 'hidden';
      }
    }
    settingsManager.isResizing = true;
  });

  getEl('search').addEventListener('focus', () => {
    uiManager.isCurrentlyTyping = true;
  });
  getEl('ui-wrapper').addEventListener('focusin', () => {
    uiManager.isCurrentlyTyping = true;
  });

  getEl('search').addEventListener('blur', () => {
    uiManager.isCurrentlyTyping = false;
  });
  getEl('ui-wrapper').addEventListener('focusout', () => {
    uiManager.isCurrentlyTyping = false;
  });

  getEl('search-results').addEventListener('click', function (evt: Event) {
    let satId: number;
    // must be '.search-result' class
    if ((<HTMLElement>evt.target).classList.contains('search-result')) {
      satId = parseInt((<HTMLElement>evt.target).dataset.objId);
    } else if ((<HTMLElement>evt.target).parentElement.classList.contains('search-result')) {
      satId = parseInt((<HTMLElement>evt.target).parentElement?.dataset.objId);
    } else if ((<HTMLElement>evt.target).parentElement?.parentElement?.classList.contains('search-result')) {
      satId = parseInt((<HTMLElement>evt.target).parentElement.parentElement.dataset.objId);
    } else {
      return;
    }

    const sat = satSet.getSat(satId);
    if (sat.type === SpaceObjectType.STAR) {
      uiManager.panToStar(sat);
    } else {
      objectManager.setSelectedSat(satId);
    }
  });

  getEl('search-results').addEventListener('mouseover', function (evt) {
    let satId: number;
    // must be '.search-result' class
    if ((<HTMLElement>evt.target).classList.contains('search-result')) {
      satId = parseInt((<HTMLElement>evt.target).dataset.objId);
    } else if ((<HTMLElement>evt.target).parentElement.classList.contains('search-result')) {
      satId = parseInt((<HTMLElement>evt.target).parentElement?.dataset.objId);
    } else if ((<HTMLElement>evt.target).parentElement?.parentElement?.classList.contains('search-result')) {
      satId = parseInt((<HTMLElement>evt.target).parentElement.parentElement.dataset.objId);
    } else {
      return;
    }

    searchForSat(satId);
  });
  getEl('search-results').addEventListener('mouseout', () => {
    orbitManager.clearHoverOrbit();
    satSet.setHover(-1);
    searchBox.isHovering(false);
  });

  getEl('search').addEventListener('input', () => {
    const searchStr = <string>(<HTMLInputElement>getEl('search')).value;
    uiManager.doSearch(searchStr);
  });

  var isSocialOpen = false;
  getEl('share-icon').addEventListener('click', () => {
    if (!isSocialOpen) {
      isSocialOpen = true;
      getEl('github-share').classList.remove('share-up');
      getEl('twitter-share').classList.remove('share-up');
      getEl('github-share').classList.add('github-share-down');
      getEl('twitter-share').classList.add('twitter-share-down');
    } else {
      isSocialOpen = false;
      getEl('github-share').classList.add('share-up');
      getEl('twitter-share').classList.add('share-up');
      getEl('github-share').classList.remove('github-share-down');
      getEl('twitter-share').classList.remove('twitter-share-down');
    }
  });

  getEl('fullscreen-icon').addEventListener('click', () => {
    uiManager.mobileManager.fullscreenToggle();
  });

  getEl('nav-footer-toggle').addEventListener('click', () => {
    uiManager.footerToggle();
    if (parseInt(window.getComputedStyle(getEl('nav-footer')).bottom.replace('px', '')) < 0) {
      setTimeout(() => {
        const bottomHeight = getEl('bottom-icons-container').offsetHeight;
        document.documentElement.style.setProperty('--bottom-menu-top', bottomHeight + 'px');
      }, 1000); // Wait for the footer to be fully visible.
    } else {
      // If the footer is open, then it will be hidden shortly but we don't want to wait for it to be hidden
      document.documentElement.style.setProperty('--bottom-menu-top', '0px');
    }
  });

  clickAndDragWidth(getEl('settings-menu'));
  clickAndDragWidth(getEl('about-menu'));

  getEl('export-lookangles').addEventListener('click', () => {
    saveCsv(satellite.lastlooksArray, 'lookAngles');
  });

  getEl('export-multiSiteArray').addEventListener('click', () => {
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
