import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import $ from 'jquery';
import { AnalysisBottomIcon } from './components/AnalysisBottomIcon';
import { AnalysisSideMenu } from './components/AnalysisSideMenu';
import { OrbitOptionGroup, RaeOptionGroup } from './components/TrendAnalysis';
/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * analysis.ts is a plugin for viewing trend data on TLEs and calculating best
 * pass times.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

export const init = (): void => {
  const { sensorManager, objectManager, satSet, uiManager } = keepTrackApi.programs;
  let isAnalysisMenuOpen = false;
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'analysis',
    cb: uiManagerInit,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'analysis',
    cb: (iconName: string): void => {
      if (iconName === 'menu-analysis') {
        if (isAnalysisMenuOpen) {
          isAnalysisMenuOpen = false;
          $('#menu-analysis').removeClass('bmenu-item-selected');
          uiManager.hideSideMenus();
          return;
        } else {
          uiManager.hideSideMenus();
          isAnalysisMenuOpen = true;
          if (objectManager.selectedSat != -1) {
            const sat: SatObject = satSet.getSat(objectManager.selectedSat);
            $('#anal-sat').val(sat.sccNum);
          }
          if (sensorManager.checkSensorSelected()) {
            $('#anal-type').html(`${OrbitOptionGroup}${RaeOptionGroup}`);
          } else {
            $('#anal-type').html(`${OrbitOptionGroup}`);
          }
          // Reinitialize the Material CSS Code
          const elems = document.querySelectorAll('select');
          (<any>window.M).FormSelect.init(elems);

          $('#analysis-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          $('#menu-analysis').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'analysis',
    cb: (sat: any): void => {
      if (uiManager.isAnalysisMenuOpen) {
        $('#anal-sat').val(sat.sccNum);
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'analysis',
    cb: (): void => {
      $('#analysis-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-analysis').removeClass('bmenu-item-selected');
      isAnalysisMenuOpen = false;
    },
  });
};
export const uiManagerInit = () => {
  $('#left-menus').append(AnalysisSideMenu);
  $('#bottom-icons').append(AnalysisBottomIcon);

  $('#analysis-form').on('submit', function (e: Event) {
    e.preventDefault();
    analysisFormSubmit();
  });
  $('#analysis-bpt').on('submit', function (e: Event) {
    e.preventDefault();
    analysisBptSumbit();
  });

  $('#findCsoBtn').on('click', () => {
    $('#loading-screen').fadeIn(1000, findCsoBtnClick);
  });

  $('#findReentries').on('click', () => {
    $('#loading-screen').fadeIn(1000, findRaBtnClick);
  });

  $('#analysis-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });
};
export const analysisFormSubmit = () => {
  const { sensorManager } = keepTrackApi.programs;
  // const chartType = $('#anal-type').val();
  // const sat = $('#anal-sat').val();
  const sensor = sensorManager.currentSensor[0].shortName;
  if (typeof sensor == 'undefined') {
    $.colorbox({
      html: `<html><body><div><h1>Test</h1></div></body></html>`,
      width: '60%',
      height: '60%',
      closeButton: false,
    });
  } else {
    $.colorbox({
      html: `<html><body><div><h1>Test</h1></div></body></html>`,
      width: '60%',
      height: '60%',
      closeButton: false,
    });
  }
};
export const findCsoBtnClick = () => {
  const { satellite, uiManager } = keepTrackApi.programs;
  const searchStr = satellite.findCloseObjects();
  uiManager.doSearch(searchStr);
  $('#loading-screen').fadeOut('slow');
};
export const findRaBtnClick = () => {
  const { satellite, uiManager } = keepTrackApi.programs;
  const searchStr = satellite.findReentries();
  uiManager.doSearch(searchStr);
  $('#loading-screen').fadeOut('slow');
};
export const analysisBptSumbit = () => {
  const { satellite, sensorManager, uiManager } = keepTrackApi.programs;
  const sats = $('#analysis-bpt-sats').val();
  if (!sensorManager.checkSensorSelected()) {
    uiManager.toast(`You must select a sensor first!`, 'critical');
  } else {
    satellite.findBestPasses(sats, sensorManager.selectedSensor);
  }
};
