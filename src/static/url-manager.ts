import { KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { DetailedSatellite } from 'ootk';
import { getEl } from '../lib/get-el';

export abstract class UrlManager {
  static parseGetVariables() {
    const queryStr = window.location?.search?.substring(1) || '';
    const params = queryStr.split('&');

    if (params.length === 0 || params[0] === '') {
      return;
    }

    // Do Searches First
    UrlManager.getVariableSearch_(params);

    // Then Do Other Stuff
    UrlManager.getVariableActions_(params);
  }

  static updateURL() {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const uiManagerInstance = keepTrackApi.getUiManager();
    const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager);

    if (!uiManagerInstance.searchManager) {
      return;
    }
    const currentSearch = keepTrackApi.getUiManager().searchManager.getCurrentSearch();

    if (settingsManager.isDisableUrlBar) {
      return;
    }

    const arr = window.location.href.split('?');
    let url = arr[0];
    const paramSlices = [];

    const selectedSat = selectSatManagerInstance?.getSelectedSat() as DetailedSatellite;

    if (selectedSat?.isSatellite() && selectedSat.sccNum) {
      // TODO: This doesn't work for VIMPEL objects
      const scc = selectedSat.sccNum;

      if (scc !== '') {
        paramSlices.push(`sat=${scc}`);
      }
    }

    if (currentSearch !== '') {
      paramSlices.push(`search=${currentSearch}`);
    }

    if (timeManagerInstance.propRate < 0.99 || timeManagerInstance.propRate > 1.01) {
      paramSlices.push(`rate=${timeManagerInstance.propRate}`);
    }

    if (timeManagerInstance.staticOffset < -1000 || timeManagerInstance.staticOffset > 1000) {
      paramSlices.push(`date=${(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset).toString()}`);
    }

    if (paramSlices.length > 0) {
      url += `?${paramSlices.join('&')}`;
    }

    if (url !== window.location.href) {
      setTimeout(() => {
        window.history.replaceState(null, '', url);
      }, 100);
    }
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
      event: KeepTrackApiEvents.onKeepTrackReady,
      cbName: 'getVariableSat',
      cb: () => {
        const uiManagerInstance = keepTrackApi.getUiManager();
        const catalogManagerInstance = keepTrackApi.getCatalogManager();
        const urlSatId = catalogManagerInstance.intlDes2id(val.toUpperCase());

        if (urlSatId !== null && catalogManagerInstance.getObject(urlSatId).active) {
          keepTrackApi.getPlugin(SelectSatManager)?.selectSat(urlSatId);
        } else {
          uiManagerInstance.toast(`International Designator "${val.toUpperCase()}" was not found!`, ToastMsgType.caution, true);
        }
      },
    });
  }

  private static handleSatParam_(val: string) {
    keepTrackApi.register({
      event: KeepTrackApiEvents.onKeepTrackReady,
      cbName: 'getVariableSat',
      cb: () => {
        const uiManagerInstance = keepTrackApi.getUiManager();
        const catalogManagerInstance = keepTrackApi.getCatalogManager();
        const urlSatId = catalogManagerInstance.sccNum2Id(parseInt(val));

        if (urlSatId !== null) {
          keepTrackApi.getPlugin(SelectSatManager)?.selectSat(urlSatId);
        } else {
          uiManagerInstance.toast(`Satellite "${val.toUpperCase()}" was not found!`, ToastMsgType.caution, true);
        }
      },
    });
  }

  private static handleMislParam_(val: string) {
    const subVal = val.split(',');

    (<HTMLSelectElement>getEl('ms-type')).value = subVal[0].toString();
    (<HTMLSelectElement>getEl('ms-attacker')).value = subVal[1].toString();
    (<HTMLSelectElement>getEl('ms-target')).value = subVal[2].toString();
    (<HTMLButtonElement>getEl('missile')).click();
    const uiManagerInstance = keepTrackApi.getUiManager();

    uiManagerInstance.toast('Missile launched!', ToastMsgType.normal, false);
  }

  private static handleDateParam_(val: string) {
    const uiManagerInstance = keepTrackApi.getUiManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();

    if (isNaN(parseInt(val))) {
      uiManagerInstance.toast(`Date value of "${val}" is not a proper unix timestamp!`, ToastMsgType.caution, true);

      return;
    }

    uiManagerInstance.toast('Simulation time will be updated once catalog finishes processing!', ToastMsgType.normal, true);
    setTimeout(() => {
      uiManagerInstance.toast('Simulation time updated!', ToastMsgType.normal, true);
    timeManagerInstance.changeStaticOffset(Number(val) - Date.now());
    }, 10000);
  }

  private static handleRateParam_(val: string) {
    const uiManagerInstance = keepTrackApi.getUiManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();
    let rate = parseFloat(val);

    if (isNaN(rate)) {
      uiManagerInstance.toast(`Propagation rate of "${rate}" is not a valid float!`, ToastMsgType.caution, true);

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
        if (settingsManager.lastSearchResults.length === 0) {
          uiManagerInstance.toast(`Search for "${val}" found nothing!`, ToastMsgType.caution, true);
          uiManagerInstance.searchManager.hideResults();
        }
      }
    });
  }
}
