import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { clickAndDragWidth, getEl, showLoading, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import { AnalysisBottomIcon } from './components/AnalysisBottomIcon';
import { AnalysisSideMenu } from './components/AnalysisSideMenu';
import { OrbitOptionGroup, RaeOptionGroup } from './components/TrendAnalysis';

/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * analysis.ts is a plugin for viewing trend data on TLEs and calculating best
 * pass times.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
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

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'analysis',
    cb: uiManagerFinal,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'analysis',
    cb: (iconName: string): void => {
      if (iconName === 'menu-analysis') {
        if (isAnalysisMenuOpen) {
          isAnalysisMenuOpen = false;
          getEl('menu-analysis').classList.remove('bmenu-item-selected');
          uiManager.hideSideMenus();
          return;
        } else {
          uiManager.hideSideMenus();
          isAnalysisMenuOpen = true;
          if (objectManager.selectedSat != -1) {
            const sat: SatObject = satSet.getSat(objectManager.selectedSat);
            (<HTMLInputElement>getEl('anal-sat')).value = sat.sccNum;
          }
          if (sensorManager.checkSensorSelected()) {
            getEl('anal-type').innerHTML = `${OrbitOptionGroup}${RaeOptionGroup}`;
          } else {
            getEl('anal-type').innerHTML = `${OrbitOptionGroup}`;
          }
          // Reinitialize the Material CSS Code
          const elems = document.querySelectorAll('select');
          (<any>window.M).FormSelect.init(elems);

          slideInRight(getEl('analysis-menu'), 1000);
          getEl('menu-analysis').classList.add('bmenu-item-selected');
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
        (<HTMLInputElement>getEl('anal-sat')).value = sat.sccNum;
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'analysis',
    cb: (): void => {
      slideOutLeft(getEl('analysis-menu'), 1000);
      getEl('menu-analysis').classList.remove('bmenu-item-selected');
      isAnalysisMenuOpen = false;
    },
  });
};
export const uiManagerInit = () => {
  getEl('left-menus').insertAdjacentHTML('beforeend', AnalysisSideMenu);
  getEl('bottom-icons').insertAdjacentHTML('beforeend', AnalysisBottomIcon);
};

export const uiManagerFinal = () => {
  getEl('analysis-form').addEventListener('submit', function (e: Event) {
    e.preventDefault();
    analysisFormSubmit();
  });
  getEl('analysis-bpt').addEventListener('submit', function (e: Event) {
    e.preventDefault();
    analysisBptSumbit();
  });

  getEl('findCsoBtn').addEventListener('click', () => {
    showLoading(findCsoBtnClick);
  });

  getEl('findReentries').addEventListener('click', () => {
    showLoading(findRaBtnClick);
  });

  clickAndDragWidth(getEl('analysis-menu'));
};

export const analysisFormSubmit = () => {
  // const { sensorManager } = keepTrackApi.programs;
  // const chartType = (<HTMLInputElement>getEl('anal-type')).value;
  // const sat = (<HTMLInputElement>getEl('anal-sat')).value;
  // const sensor = sensorManager.currentSensor[0].shortName;
  // if (typeof sensor == 'undefined') {
  //   $.colorbox({
  //     html: `<html><body><div><h1>Test</h1></div></body></html>`,
  //     width: '60%',
  //     height: '60%',
  //     closeButton: false,
  //   });
  // } else {
  //   $.colorbox({
  //     html: `<html><body><div><h1>Test</h1></div></body></html>`,
  //     width: '60%',
  //     height: '60%',
  //     closeButton: false,
  //   });
  // }
};
export const findCsoBtnClick = () => {
  const { satellite, uiManager } = keepTrackApi.programs;
  const searchStr = satellite.findCloseObjects();
  uiManager.doSearch(searchStr);
};
export const findRaBtnClick = () => {
  const { satellite, uiManager } = keepTrackApi.programs;
  const searchStr = satellite.findReentries();
  uiManager.doSearch(searchStr);
};
export const analysisBptSumbit = () => {
  const { satellite, sensorManager, uiManager } = keepTrackApi.programs;
  const sats = (<HTMLInputElement>getEl('analysis-bpt-sats')).value;
  if (!sensorManager.checkSensorSelected()) {
    uiManager.toast(`You must select a sensor first!`, 'critical');
  } else {
    satellite.findBestPasses(sats, sensorManager.selectedSensor);
  }
};
