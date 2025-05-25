import { KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { InputEventType, keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { DEG2RAD, Degrees, DetailedSatellite, Kilometers, RAD2DEG, Radians } from 'ootk';
import { getEl } from '../lib/get-el';

export abstract class UrlManager {
  private static selectedSat_: DetailedSatellite | null = null;
  private static searchString_: string = '';
  private static propRate_: number;

  static {
    keepTrackApi.on(KeepTrackApiEvents.selectSatData, (sat) => {
      if (sat instanceof DetailedSatellite) {
        this.selectedSat_ = sat;
      } else {
        this.selectedSat_ = null;
      }
      this.updateURL();
    });

    keepTrackApi.on(KeepTrackApiEvents.propRateChanged, (propRate) => {
      this.propRate_ = propRate;
      this.updateURL();
    });

    keepTrackApi.on(KeepTrackApiEvents.searchUpdated, (searchString: string) => {
      this.searchString_ = searchString;
      this.updateURL();
    });

    keepTrackApi.on(KeepTrackApiEvents.updateDateTime, () => {
      this.updateURL();
    });

    keepTrackApi.on(InputEventType.KeyDown, (key) => {
      if (key === 'U') {
        this.updateURL();
      }
    });
  }

  static getParams(): string[] {
    let queryStr = window.location.search.substring(1);

    // if queryStr includes '#' it will break params, so we need to remove it and retry
    const hashIndex = window.location.hash.indexOf('#');

    if (hashIndex !== -1) {
      queryStr = window.location.hash.split('#')[1]; // Get the part after the hash
      queryStr = queryStr.split('?')[1]; // Remove any query string after the hash
    }

    // URI Encode all %22 to ensure url is not broken
    const params = queryStr
      .split('%22')
      .map((item, index) => {
        if (index % 2 === 0) {
          return item;
        }

        return encodeURIComponent(item);

      })
      .join('')
      .split('&');

    return params;
  }

  static getKeyValuePairs(): Record<string, string> {
    const params = this.getParams();
    const keyValuePairs: Record<string, string> = {};

    params.forEach((param) => {
      const [key, val] = param.split('=');

      if (key && val) {
        keyValuePairs[key] = decodeURIComponent(val.replace(/\+/gu, ' '));
      }
    });

    return keyValuePairs;
  }

  static parseGetVariables() {
    const kv = this.getKeyValuePairs();

    if (Object.keys(kv).length === 0) {
      return;
    }

    // Do searches first
    if (kv.search && !settingsManager.disableUI) {
      const uiManagerInstance = keepTrackApi.getUiManager();

      uiManagerInstance.doSearch(kv.search);
      if (settingsManager.lastSearchResults.length === 0) {
        keepTrackApi.toast(`Search for "${kv.search}" found nothing!`, ToastMsgType.caution, true);
        uiManagerInstance.searchManager.hideResults();
      }
    }

    // Then Do Other Stuff
    Object.keys(kv).forEach((key) => {
      if (key === 'search') {
        return; // Already handled above
      }
      switch (key) {
        case 'intldes':
          this.handleIntldesParam_(kv[key]);
          break;
        case 'sat':
          this.handleSatParam_(kv[key]);
          break;
        case 'misl':
          this.handleMislParam_(kv[key]);
          break;
        case 'date':
          this.handleDateParam_(kv[key]);
          break;
        case 'pitch':
        case 'yaw':
          this.handlePitchYawParam_(kv.pitch, kv.yaw);
          break;
        case 'lat':
        case 'lon':
          this.handleLatLonParam_(kv.lat, kv.lon, kv.zoom, kv.date ?? null);
          break;
        case 'rate':
          this.handleRateParam_(kv[key]);
          break;
        case 'zoom':
          this.handleZoomParam_(kv[key], kv.camDistBuffer ?? null);
          break;
        default:
          console.warn(`Unknown URL parameter: ${key}`);
      }
    });
  }

  static updateURL() {
    const uiManagerInstance = keepTrackApi.getUiManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const mainCamera = keepTrackApi.getMainCamera();

    if (!uiManagerInstance.searchManager) {
      return;
    }
    if (settingsManager.isDisableUrlBar) {
      return;
    }

    const arr = window.location.href.split('?');
    let url = arr[0];
    const paramSlices = [] as string[];

    if (this.selectedSat_?.sccNum) {
      // TODO: This doesn't work for VIMPEL objects
      const scc = this.selectedSat_.sccNum;

      if (scc !== '') {
        paramSlices.push(`sat=${scc}`);
      }
    }

    if (this.searchString_ !== '') {
      paramSlices.push(`search=${this.searchString_}`);
    }

    if (this.propRate_ < 0.99 || this.propRate_ > 1.01) {
      paramSlices.push(`rate=${this.propRate_}`);
    }

    paramSlices.push(`pitch=${(mainCamera.camPitch * RAD2DEG).toFixed(2)}`);
    paramSlices.push(`yaw=${(mainCamera.camYaw * RAD2DEG).toFixed(2)}`);

    paramSlices.push(`zoom=${mainCamera.zoomLevel()}`);

    if (this.selectedSat_) {
      paramSlices.push(`camDistBuffer=${mainCamera.camDistBuffer}`);
    }

    if (timeManagerInstance.staticOffset < -1000 || timeManagerInstance.staticOffset > 1000) {
      paramSlices.push(`date=${(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset).toString()}`);
    }

    if (paramSlices.length > 0) {
      url += `?${paramSlices.join('&')}`;
    }

    if (url !== window.location.href) {
      setTimeout(() => {
        // Find any # in the URL and replace it with an empty string
        url = url.replace(/#/gu, '');
        window.history.replaceState(null, '', url);
      }, 100);
    }
  }

  private static handleIntldesParam_(val: string) {
    keepTrackApi.on(
      KeepTrackApiEvents.onKeepTrackReady,
      () => {
        const catalogManagerInstance = keepTrackApi.getCatalogManager();
        const urlSatId = catalogManagerInstance.intlDes2id(val.toUpperCase());

        if (urlSatId !== null && catalogManagerInstance.getObject(urlSatId)?.active) {
          keepTrackApi.getPlugin(SelectSatManager)?.selectSat(urlSatId);
        } else {
          keepTrackApi.toast(`International Designator "${val.toUpperCase()}" was not found!`, ToastMsgType.caution, true);
        }
      },
    );
  }

  private static handleSatParam_(val: string) {
    keepTrackApi.on(
      KeepTrackApiEvents.onKeepTrackReady,
      () => {
        const catalogManagerInstance = keepTrackApi.getCatalogManager();
        const urlSatId = catalogManagerInstance.sccNum2Id(parseInt(val));

        if (urlSatId !== null) {
          keepTrackApi.getPlugin(SelectSatManager)?.selectSat(urlSatId);
        } else {
          keepTrackApi.toast(`Satellite "${val.toUpperCase()}" was not found!`, ToastMsgType.caution, true);
        }
      },
    );
  }

  private static handleMislParam_(val: string) {
    const subVal = val.split(',');

    (<HTMLSelectElement>getEl('ms-type')).value = subVal[0].toString();
    (<HTMLSelectElement>getEl('ms-attacker')).value = subVal[1].toString();
    (<HTMLSelectElement>getEl('ms-target')).value = subVal[2].toString();
    (<HTMLButtonElement>getEl('missile')).click();

    keepTrackApi.toast('Missile launched!', ToastMsgType.normal, false);
  }

  private static handleDateParam_(val: string) {
    const timeManagerInstance = keepTrackApi.getTimeManager();

    if (isNaN(parseInt(val))) {
      keepTrackApi.toast(`Date value of "${val}" is not a proper unix timestamp!`, ToastMsgType.caution, true);

      return;
    }

    keepTrackApi.toast('Simulation time will be updated once catalog finishes processing!', ToastMsgType.normal, true);
    setTimeout(() => {
      keepTrackApi.toast('Simulation time updated!', ToastMsgType.normal, true);
      timeManagerInstance.changeStaticOffset(Number(val) - Date.now());
    }, 10000);
  }

  private static handleRateParam_(val: string) {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    let rate = parseFloat(val);

    if (isNaN(rate)) {
      keepTrackApi.toast(`Propagation rate of "${rate}" is not a valid float!`, ToastMsgType.caution, true);

      return;
    }
    rate = Math.min(rate, 1000);
    // could run time backwards, but let's not!
    rate = Math.max(rate, 0);
    timeManagerInstance.changePropRate(Number(rate));
  }

  private static handleZoomParam_(val: string, camDistBuffer: string) {
    keepTrackApi.on(
      KeepTrackApiEvents.onKeepTrackReady,
      () => {
        const zoom = parseFloat(val);
        const camDistBufferValue = parseFloat(camDistBuffer);

        if (isNaN(zoom)) {
          keepTrackApi.toast(`Zoom value of "${val}" is not a valid float!`, ToastMsgType.caution, true);

          return;
        }

        if (zoom < 0.1 || zoom > 100) {
          keepTrackApi.toast(`Zoom value of "${val}" is out of bounds!`, ToastMsgType.caution, true);

          return;
        }

        keepTrackApi.getMainCamera().camZoomSnappedOnSat = false;
        keepTrackApi.getMainCamera().changeZoom(zoom);
        // if camDistBuffer is not a number, set it to just outside the min zoom distance for close zoom
        keepTrackApi.getMainCamera().camDistBuffer = isNaN(camDistBufferValue)
          ? settingsManager.minZoomDistance + 1 as Kilometers
          : camDistBufferValue as Kilometers;
      });
  }

  private static handlePitchYawParam_(pitch: string, yaw: string) {
    const pitchNum = parseFloat(pitch);
    const yawNum = parseFloat(yaw);

    if (isNaN(pitchNum) || isNaN(yawNum)) {
      keepTrackApi.toast('Pitch or Yaw value is not a valid float!', ToastMsgType.caution, true);

      return;
    }
    if (pitchNum < -90 || pitchNum > 90) {
      keepTrackApi.toast('Pitch value is out of bounds!', ToastMsgType.caution, true);

      return;
    }
    if (yawNum < -360 || yawNum > 360) {
      keepTrackApi.toast('Yaw value is out of bounds!', ToastMsgType.caution, true);

      return;
    }
    keepTrackApi.getMainCamera().autoRotate(false);
    keepTrackApi.getMainCamera().camSnap(pitchNum * DEG2RAD as Radians, yawNum * DEG2RAD as Radians);
  }

  private static handleLatLonParam_(lat: string, lon: string, zoom: string, date: string | null) {
    const latNum = parseFloat(lat) as Degrees;
    const lonNum = parseFloat(lon) as Degrees;
    const zoomNum = parseFloat(zoom);


    if (isNaN(zoomNum)) {
      keepTrackApi.toast(`Zoom value of "${zoom}" is not a valid float!`, ToastMsgType.caution, true);

      return;
    }

    if (isNaN(latNum) || isNaN(lonNum)) {
      keepTrackApi.toast('Latitude or Longitude value is not a valid float!', ToastMsgType.caution, true);

      return;
    }

    if (latNum < -90 || latNum > 90 || lonNum < -360 || lonNum > 360) {
      keepTrackApi.toast('Latitude or Longitude value is out of bounds!', ToastMsgType.caution, true);

      return;
    }

    keepTrackApi.getMainCamera().autoRotate(false);

    if (date !== null && !isNaN(parseInt(date))) {
      setTimeout(() => {
        keepTrackApi.getMainCamera().lookAtLatLon(latNum, lonNum, zoomNum);
      }, 10500);
    } else {
      keepTrackApi.getMainCamera().lookAtLatLon(latNum, lonNum, zoomNum);
    }
  }
}
