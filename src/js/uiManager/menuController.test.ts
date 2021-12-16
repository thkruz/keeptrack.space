import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import * as menuController from './menuController';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

describe('Menu Controller', () => {
  beforeEach(() => {
    document.body.innerHTML = `
    <div id="search-icon"></div>
    <div class="menu-item"></div>
    <div id="search-close"></div>
    <div id="legend-hover-menu"></div> 
    <div id="legend-menu"></div>
    <div class="menu-selectable"></div>
    <div id="search"></div>
    <div id="search-results"></div>
    <div id="ui-wrapper"></div>
    <div id="share-icon"></div>
    <div id="fullscreen-icon"></div>
    <div id="nav-footer-toggle"></div>
    <div id="nav-footer"></div>
    <div id="sensor-list-menu"></div>
    <div id="sensor-info-menu"></div>
    <div id="lookangles-menu"></div>
    <div id="lookanglesmultisite-menu"></div>
    <div id="findByLooks-menu"></div>
    <div id="customSensor-menu"></div>
    <div id="settings-menu"></div>
    <div id="about-menu"></div>
    <div id="export-lookangles"></div>
    <div id="export-multiSiteArray"></div>
    <div id="export-export-lookangles"></div>
    <div id="export-export-multiSiteArray"></div>
    `;
    menuController.initMenuController();
  });
  it('should be a function', () => {
    expect(menuController.initMenuController).toBeInstanceOf(Function);
  });
  it('should respond to search-icon clicks', () => {
    const { uiManager } = keepTrackApi.programs;
    const spy = jest.spyOn(uiManager, 'searchToggle');
    const searchIcon = document.getElementById('search-icon');
    searchIcon.click();
    expect(spy).toHaveBeenCalled();
  });
  it('should respond to menu-item mouseover', () => {
    const menuItem = document.querySelector('.menu-item');
    menuItem.dispatchEvent(new MouseEvent('mouseover'));
  });
  it('should respond to menu-item mouseout', () => {
    const menuItem = document.querySelector('.menu-item');
    menuItem.dispatchEvent(new MouseEvent('mouseout'));
  });
  it('should respond to search-close clicks', () => {
    const { searchBox } = keepTrackApi.programs;
    const spy = jest.spyOn(searchBox, 'hideResults');
    const searchClose = document.getElementById('search-close');
    searchClose.click();
    expect(spy).toHaveBeenCalled();
  });
  it('should respond to legend-hover-menu clicks', () => {
    const { uiManager } = keepTrackApi.programs;
    const spy = jest.spyOn(uiManager, 'legendHoverMenuClick');
    const legendHoverMenu = document.getElementById('legend-hover-menu');
    legendHoverMenu.click();
    expect(spy).toHaveBeenCalled();
  });
  it('should respond to legend-menu clicks', () => {
    const legendMenu = document.getElementById('legend-menu');
    legendMenu.click();
    expect(window.settingsManager.legendMenuOpen).toBe(true);
    legendMenu.click();
    expect(window.settingsManager.legendMenuOpen).toBe(false);
  });
  it('should respond to menu-selectable clicks', () => {
    const menuSelectable = <HTMLElement>document.querySelector('.menu-selectable');
    menuSelectable.click();
    const { objectManager } = keepTrackApi.programs;
    objectManager.selectedSat = 1;
    menuSelectable.click();
  });
  it('should respond window resizes', () => {
    const { uiManager } = keepTrackApi.programs;
    const spy = jest.spyOn(uiManager.mobileManager, 'checkMobileMode');
    window.dispatchEvent(new Event('resize'));
    expect(spy).toHaveBeenCalled();
    window.settingsManager.disableUI = false;
    window.dispatchEvent(new Event('resize'));
    window.settingsManager.screenshotMode = true;
    window.dispatchEvent(new Event('resize'));
  });
  it('should respond to search focus', () => {
    const search = document.getElementById('search');
    search.dispatchEvent(new Event('focus'));
  });
  it('should respond to search blur', () => {
    const search = document.getElementById('search');
    search.dispatchEvent(new Event('blur'));
  });
  it('should respond to ui-wrapper focus in', () => {
    const uiWrapper = document.getElementById('ui-wrapper');
    uiWrapper.dispatchEvent(new Event('focusin'));
  });
  it('should respond to ui-wrapper focus out', () => {
    const uiWrapper = document.getElementById('ui-wrapper');
    uiWrapper.dispatchEvent(new Event('focusout'));
  });
  it('should respond to share-icon clicks', () => {
    const shareIcon = document.getElementById('share-icon');
    shareIcon.click();
    shareIcon.click();
  });
  it('should respond to search-results clicks', () => {
    const searchResults = document.getElementById('search-results');
    searchResults.click();
    menuController.searchForSat(1);
  });
  it('should respond to search-results mouseover', () => {
    const searchResults = document.getElementById('search-results');
    searchResults.dispatchEvent(new MouseEvent('mouseover'));
  });
  it('should respond to search-results mouseout', () => {
    const searchResults = document.getElementById('search-results');
    searchResults.dispatchEvent(new MouseEvent('mouseout'));
  });
  it('should respond to fullscreen-icon clicks', () => {
    const fullscreenIcon = document.getElementById('fullscreen-icon');
    fullscreenIcon.click();
    fullscreenIcon.click();
  });
  it('should respond to nav-footer-toggle clicks', () => {
    const navFooterToggle = document.getElementById('nav-footer-toggle');
    navFooterToggle.click();
    navFooterToggle.click();
  });
  it('should respond export lookangles', () => {
    const exportLookangles = document.getElementById('export-lookangles');
    exportLookangles.click();
  });
  it('should respond export multiSiteArray', () => {
    const exportMultiSiteArray = document.getElementById('export-multiSiteArray');
    exportMultiSiteArray.click();
  });
});
