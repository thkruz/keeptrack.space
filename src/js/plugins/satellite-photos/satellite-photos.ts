import { openColorbox } from '@app/js/lib/colorbox';
import { getEl } from '@app/js/lib/get-el';
import { lat2pitch, lon2yaw } from '@app/js/lib/transforms';

import photoManagerPng from '@app/img/icons/photoManager.png';
import { keepTrackApi, KeepTrackApiEvents } from '@app/js/keepTrackApi';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class SatellitePhotos extends KeepTrackPlugin {
  bottomIconElementName = 'menu-sat-photos';
  bottomIconLabel = 'SatellitePhotos';
  bottomIconImg = photoManagerPng;
  sideMenuElementName: string = 'sat-photo-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="sat-photo-menu" class="side-menu-parent start-hidden text-select">
    <div id="sat-photo-menu-content" class="side-menu">
      <ul>
        <h5 class="center-align">Satellites Imagery List</h5>
        <li id="meteosat8-link" class="link satPhotoRow">MeteoSat 8</li>
        <li id="meteosat11-link" class="link satPhotoRow">MeteoSat 11</li>
        <li id="himawari8-link" class="link satPhotoRow">Himawari 8</li>
        <li id="discovr-link" class="link satPhotoRow">DSCOVR</li>
        <li id="goes1-link" class="link satPhotoRow">GOES 1</li>
      </ul>
    </div>
  </div>`;

  helpTitle = `Satellite Photos Menu`;
  helpBody = keepTrackApi.html`The Satellite Photos Menu is used for displaying live photos from select satellites.
  <br><br>
  Note - changes in the image API may cause the wrong satellite to be selected in KeepTrack.`;

  static PLUGIN_NAME = 'Satellite Photos';
  constructor() {
    super(SatellitePhotos.PLUGIN_NAME);
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('meteosat8-link').addEventListener('click', () => {
          SatellitePhotos.loadPic(10489, `https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSGIODC_RGBNatColour_LowResolution.jpg`);
        });
        getEl('meteosat11-link').addEventListener('click', () => {
          SatellitePhotos.loadPic(40732, `https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSG_RGBNatColour_LowResolution.jpg`);
        });
        getEl('himawari8-link').addEventListener('click', () => {
          SatellitePhotos.himawari8();
        });
        getEl('discovr-link').addEventListener('click', () => {
          SatellitePhotos.discovr();
        });
        getEl('goes1-link').addEventListener('click', () => {
          SatellitePhotos.loadPic(8366, `https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/GEOCOLOR/latest.jpg`);
        });
      },
    });
  }

  /**
   * Retrieves natural color images of Earth captured by the DSCOVR satellite and displays them using the DrawManager instance.
   */
  static discovr(): void {
    const request = new XMLHttpRequest();
    request.open('GET', `https://epic.gsfc.nasa.gov/api/natural`, true);

    request.onload = () => {
      SatellitePhotos.dscovrLoaded(request);
    };

    request.onerror = function () {
      console.debug('https://epic.gsfc.nasa.gov/ request failed!');
    };

    keepTrackApi.getCatalogManager().selectSat(-1);
    request.send();
  }

  static dscovrLoaded(req: any): void {
    if (req.status >= 200 && req.status < 400) {
      // Success!
      const response = JSON.parse(req.response);
      const imageUrl = response[0].image;
      const dateStr = response[0].identifier;
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(4, 6);
      const day = dateStr.slice(6, 8);
      const hour = dateStr.slice(8, 10);
      const min = dateStr.slice(10, 12);
      const sec = dateStr.slice(12, 14);

      // Hours are in EST? Daylight savings time might make this break
      const dateObj = new Date(Date.UTC(year, month - 1, day, hour - 4, min, sec));

      keepTrackApi.getMainCamera().camSnap(lat2pitch(response[0].centroid_coordinates.lat), lon2yaw(response[0].centroid_coordinates.lon, dateObj));
      keepTrackApi.getMainCamera().changeZoom(0.7);

      SatellitePhotos.colorbox(`https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${imageUrl}.png`);
    }
  }

  static colorbox = (url: string): void => {
    settingsManager.isPreventColorboxClose = true;
    setTimeout(function () {
      settingsManager.isPreventColorboxClose = false;
    }, 2000);

    openColorbox(url, { image: true });
  };

  static loadPic(satId: number, url: string): void {
    keepTrackApi.getCatalogManager().selectSat(keepTrackApi.getCatalogManager().getSatFromObjNum(satId).id);
    keepTrackApi.getMainCamera().changeZoom(0.7);
    SatellitePhotos.colorbox(url);
  }

  static himawari8(): void {
    keepTrackApi.getCatalogManager().selectSat(keepTrackApi.getCatalogManager().getSatFromObjNum(40267).id);
    keepTrackApi.getMainCamera().changeZoom(0.7);

    // Propagation time minus 30 minutes so that the pictures have time to become available
    let propTime = keepTrackApi.getTimeManager().simulationTimeObj;
    if (propTime.getTime() < Date.now()) {
      propTime = new Date(propTime.getTime() - 1000 * 60 * 30);
    } else {
      const uiManagerInstance = keepTrackApi.getUiManager();
      uiManagerInstance.toast(`Can't load pictures from the future. Loading most recent photos.`, 'caution');
      propTime = new Date(Date.now() - 1000 * 60 * 30);
    }
    const year = propTime.getUTCFullYear();
    const mon = (propTime.getUTCMonth() + 1).toString().padStart(2, '0'); // NOTE:, this function requires months in range 1-12.
    const day = propTime.getUTCDate().toString().padStart(2, '0');
    const hour = propTime.getUTCHours().toString().padStart(2, '0');
    const min = (Math.floor(propTime.getUTCMinutes() / 10) * 10).toString().padStart(2, '0');

    settingsManager.isPreventColorboxClose = true;
    setTimeout(function () {
      settingsManager.isPreventColorboxClose = false;
    }, 2000);

    openColorbox(`https://himawari8.nict.go.jp/img/D531106/1d/550/${year}/${mon}/${day}/${hour}${min}00_0_0.png`, { image: true });
  }
}

export const satellitePhotosPlugin = new SatellitePhotos();
