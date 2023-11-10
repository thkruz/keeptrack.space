import { GetSatType } from '@app/js/interfaces';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '../lib/get-el';

export abstract class UrlManager {
  static parseGetVariables() {
    const queryStr = window.location?.search?.substring(1) || '';
    const params = queryStr.split('&');
    if (params.length === 0 || params[0] === '') return;

    // Do Searches First
    UrlManager.getVariableSearch_(params);

    // Then Do Other Stuff
    UrlManager.getVariableActions_(params);
  }

  static updateURL() {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const uiManagerInstance = keepTrackApi.getUiManager();

    if (!uiManagerInstance.searchManager) return;
    const currentSearch = uiManagerInstance.searchManager.getCurrentSearch();

    if (settingsManager.isDisableUrlBar) return;

    const arr = window.location.href.split('?');
    let url = arr[0];
    const paramSlices = [];

    if (catalogManagerInstance.selectedSat !== -1 && typeof catalogManagerInstance.getSat(catalogManagerInstance.selectedSat, GetSatType.EXTRA_ONLY).sccNum != 'undefined') {
      paramSlices.push('sat=' + catalogManagerInstance.getSat(catalogManagerInstance.selectedSat, GetSatType.EXTRA_ONLY).sccNum);
    }
    if (currentSearch !== '') {
      paramSlices.push('search=' + currentSearch);
    }
    if (timeManagerInstance.propRate < 0.99 || timeManagerInstance.propRate > 1.01) {
      paramSlices.push('rate=' + timeManagerInstance.propRate);
    }

    if (timeManagerInstance.staticOffset < -1000 || timeManagerInstance.staticOffset > 1000) {
      paramSlices.push('date=' + (timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset).toString());
    }

    if (paramSlices.length > 0) {
      url += '?' + paramSlices.join('&');
    }

    window.history.replaceState(null, '', url);
  }

  /**
   * Parses the URL parameters and performs actions based on the parameter key.
   * @param params - An array of URL parameters.
   */
  private static getVariableActions_(params: string[]) {
    const actions = {
      intldes: (val: string) => UrlManager.handleIntldesParam_(val),
      sat: (val: string) => UrlManager.handleSatParam_(val),
      misl: (val: string) => UrlManager.handleMislParam_(val),
      date: (val: string) => UrlManager.handleDateParam_(val),
      rate: (val: string) => UrlManager.handleRateParam_(val),
    };
    params.forEach((param) => {
      const [key, val] = param.split('=');
      if (actions[key]) {
        actions[key](val);
      }
    });
  }

  private static handleIntldesParam_(val: string) {
    keepTrackApi.register({
      event: 'onKeepTrackReady',
      cbName: 'getVariableSat',
      cb: () => {
        const uiManagerInstance = keepTrackApi.getUiManager();
        const catalogManagerInstance = keepTrackApi.getCatalogManager();
        const urlSatId = catalogManagerInstance.getIdFromIntlDes(val.toUpperCase());
        if (urlSatId !== null && catalogManagerInstance.getSat(urlSatId).active) {
          catalogManagerInstance.setSelectedSat(urlSatId);
        } else {
          uiManagerInstance.toast(`International Designator "${val.toUpperCase()}" was not found!`, 'caution', true);
        }
      },
    });
  }

  private static handleSatParam_(val: string) {
    keepTrackApi.register({
      event: 'onKeepTrackReady',
      cbName: 'getVariableSat',
      cb: () => {
        const uiManagerInstance = keepTrackApi.getUiManager();
        const catalogManagerInstance = keepTrackApi.getCatalogManager();
        const urlSatId = catalogManagerInstance.getIdFromObjNum(parseInt(val));
        if (urlSatId !== null) {
          catalogManagerInstance.setSelectedSat(urlSatId);
        } else {
          uiManagerInstance.toast(`Satellite "${val.toUpperCase()}" was not found!`, 'caution', true);
        }
      },
    });
  }

  private static handleMislParam_(val: string) {
    var subVal = val.split(',');
    (<HTMLSelectElement>getEl('ms-type')).value = subVal[0].toString();
    (<HTMLSelectElement>getEl('ms-attacker')).value = subVal[1].toString();
    (<HTMLSelectElement>getEl('ms-target')).value = subVal[2].toString();
    (<HTMLButtonElement>getEl('missile')).click();
    const uiManagerInstance = keepTrackApi.getUiManager();
    uiManagerInstance.toast(`Missile launched!`, 'normal', false);
  }

  private static handleDateParam_(val: string) {
    const uiManagerInstance = keepTrackApi.getUiManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();
    if (isNaN(parseInt(val))) {
      uiManagerInstance.toast(`Date value of "${val}" is not a proper unix timestamp!`, 'caution', true);
      return;
    }
    timeManagerInstance.changeStaticOffset(Number(val) - Date.now());
  }

  private static handleRateParam_(val: string) {
    const uiManagerInstance = keepTrackApi.getUiManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();
    var rate = parseFloat(val);
    if (isNaN(rate)) {
      uiManagerInstance.toast(`Propagation rate of "${rate}" is not a valid float!`, 'caution', true);
      return;
    }
    rate = Math.min(rate, 1000);
    // could run time backwards, but let's not!
    rate = Math.max(rate, 0);
    timeManagerInstance.changePropRate(Number(rate));
  }

  /**
   * Parses the search parameter from the URL and performs a search if the search parameter is present.
   * @param params - An array of URL parameters.
   */
  private static getVariableSearch_(params: string[]) {
    params.forEach((param) => {
      const [key, val] = param.split('=');

      if (key === 'search' && !settingsManager.disableUI) {
        const decodedVal = decodeURIComponent(val.replace(/\+/gu, ' '));

        const uiManagerInstance = keepTrackApi.getUiManager();
        uiManagerInstance.doSearch(decodedVal);
        if (settingsManager.lastSearchResults.length == 0) {
          uiManagerInstance.toast(`Search for "${val}" found nothing!`, 'caution', true);
          uiManagerInstance.searchManager.hideResults();
        }
      }
    });
  }
}
