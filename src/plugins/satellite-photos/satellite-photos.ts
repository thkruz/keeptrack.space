import { openColorbox } from '@app/lib/colorbox';
import { getEl } from '@app/lib/get-el';
import { lat2pitch, lon2yaw } from '@app/lib/transforms';

import { KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { errorManagerInstance } from '@app/singletons/errorManager';
import photoManagerPng from '@public/img/icons/photoManager.png';
import { Degrees } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

interface DiscvrResponse {
  centroid_coordinates: {
    lat: Degrees;
    lon: Degrees;
  };
  date: string;
  identifier: string;
  image: string;
}

export class SatellitePhotos extends KeepTrackPlugin {
  static readonly PLUGIN_NAME = 'Satellite Photos';
  constructor() {
    super(SatellitePhotos.PLUGIN_NAME);
  }

  discvrPhotos_: { imageUrl: string; lat: Degrees; lon: Degrees }[] = [];

  bottomIconElementName = 'menu-sat-photos';
  bottomIconLabel = 'Satellite Photos';
  bottomIconImg = photoManagerPng;
  sideMenuElementName: string = 'sat-photo-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="sat-photo-menu" class="side-menu-parent start-hidden text-select">
    <div id="sat-photo-menu-content" class="side-menu">
      <ul id="sat-photo-menu-list">
        <h5 class="center-align">Satellites Imagery List</h5>
        <li id="meteosat9-link" class="link satPhotoRow">MeteoSat 9</li>
        <li id="meteosat11-link" class="link satPhotoRow">MeteoSat 11</li>
        <li id="himawari8-link" class="link satPhotoRow">Himawari 8</li>
        <li id="goes16-link" class="link satPhotoRow">GOES 16</li>
        <li id="goes18-link" class="link satPhotoRow">GOES 18</li>
      </ul>
    </div>
  </div>`;

  helpTitle = 'Satellite Photos Menu';
  helpBody = keepTrackApi.html`The Satellite Photos Menu is used for displaying live photos from select satellites.
  <br><br>
  Note - changes in the image API may cause the wrong satellite to be selected in KeepTrack.`;

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('meteosat9-link').addEventListener('click', () => {
          // IODC is Indian Ocean Data Coverage and is Meteosat 9 as of 2022
          SatellitePhotos.loadPic(28912, 'https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSGIODC_RGBNatColour_LowResolution.jpg');
        });
        getEl('meteosat11-link').addEventListener('click', () => {
          // Meteosat 11 provides 0 deg full earth images every 15 minutes
          SatellitePhotos.loadPic(40732, 'https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSG_RGBNatColour_LowResolution.jpg');
        });
        getEl('himawari8-link').addEventListener('click', () => {
          SatellitePhotos.himawari8();
        });
        getEl('goes16-link').addEventListener('click', () => {
          SatellitePhotos.loadPic(41866, 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/GEOCOLOR/latest.jpg');
        });
        getEl('goes18-link').addEventListener('click', () => {
          SatellitePhotos.loadPic(51850, 'https://cdn.star.nesdis.noaa.gov/GOES18/ABI/FD/GEOCOLOR/latest.jpg');
        });
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.onKeepTrackReady,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        this.initDISCOVR_();
      },
    });
  }

  /**
   * Retrieves natural color images of Earth captured by the DSCOVR satellite and displays them using the DrawManager instance.
   */
  initDISCOVR_(): void {
    const req = new XMLHttpRequest();

    req.open('GET', 'https://epic.gsfc.nasa.gov/api/natural', true);

    req.onload = () => {
      if (req.status >= 200 && req.status < 400) {
        const res = JSON.parse(req.response);

        res.forEach((photo: DiscvrResponse) => {
          const imageUrl = photo.image;
          const dateStr = photo.identifier;
          const year = dateStr.slice(0, 4);
          const month = dateStr.slice(4, 6);
          const day = dateStr.slice(6, 8);
          const lat = photo.centroid_coordinates.lat;
          const lon = photo.centroid_coordinates.lon;

          this.discvrPhotos_.push({
            imageUrl: `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${imageUrl}.png`,
            lat,
            lon,
          });
        });

        for (let i = 1; i < this.discvrPhotos_.length + 1; i++) {
          const html = `<li id="discovr-link${i}" class="link satPhotoRow">DSCOVR Image ${i}</li>`;

          getEl('sat-photo-menu-list').insertAdjacentHTML('beforeend', html);
          getEl(`discovr-link${i}`).addEventListener('click', () => {
            SatellitePhotos.loadPic(-1, this.discvrPhotos_[i - 1].imageUrl);
            keepTrackApi.getMainCamera().camSnap(lat2pitch(this.discvrPhotos_[i - 1].lat), lon2yaw(this.discvrPhotos_[i - 1].lon, keepTrackApi.getTimeManager().simulationTimeObj));
            keepTrackApi.getMainCamera().changeZoom(0.7);
          });
        }
      } else {
        errorManagerInstance.log('https://epic.gsfc.nasa.gov/ request failed!');
        const html = '<li class="link satPhotoRow disabled">DSCOVR Temporarily Unavailable</li>';

        getEl('sat-photo-menu-list').insertAdjacentHTML('beforeend', html);
      }
    };

    req.onerror = function () {
      errorManagerInstance.log('https://epic.gsfc.nasa.gov/ request failed!');
      const html = '<li class="link satPhotoRow disabled">DSCOVR Temporarily Unavailable</li>';

      getEl('sat-photo-menu-list').insertAdjacentHTML('beforeend', html);
    };

    req.send();
  }

  static colorbox = (url: string): void => {
    settingsManager.isPreventColorboxClose = true;
    setTimeout(() => {
      settingsManager.isPreventColorboxClose = false;
    }, 2000);

    openColorbox(url, { image: true });
  };

  static loadPic(satId: number, url: string): void {
    keepTrackApi.getUiManager().searchManager.hideResults();
    keepTrackApi.getPlugin(SelectSatManager)?.selectSat(keepTrackApi.getCatalogManager().sccNum2Id(satId));
    keepTrackApi.getMainCamera().changeZoom(0.7);
    SatellitePhotos.colorbox(url);
  }

  static himawari8(): void {
    keepTrackApi.getPlugin(SelectSatManager)?.selectSat(keepTrackApi.getCatalogManager().sccNum2Id(40267));
    keepTrackApi.getMainCamera().changeZoom(0.7);

    // Propagation time minus 30 minutes so that the pictures have time to become available
    let propTime = keepTrackApi.getTimeManager().simulationTimeObj;

    if (propTime.getTime() < Date.now()) {
      propTime = new Date(propTime.getTime() - 1000 * 60 * 30);
    } else {
      const uiManagerInstance = keepTrackApi.getUiManager();

      uiManagerInstance.toast('Can\'t load pictures from the future. Loading most recent photos.', ToastMsgType.caution);
      propTime = new Date(Date.now() - 1000 * 60 * 30);
    }
    const year = propTime.getUTCFullYear();
    const mon = (propTime.getUTCMonth() + 1).toString().padStart(2, '0'); // NOTE:, this function requires months in range 1-12.
    const day = propTime.getUTCDate().toString().padStart(2, '0');
    const hour = propTime.getUTCHours().toString().padStart(2, '0');
    const min = (Math.floor(propTime.getUTCMinutes() / 10) * 10).toString().padStart(2, '0');

    settingsManager.isPreventColorboxClose = true;
    setTimeout(() => {
      settingsManager.isPreventColorboxClose = false;
    }, 2000);

    openColorbox(`https://himawari8.nict.go.jp/img/D531106/1d/550/${year}/${mon}/${day}/${hour}${min}00_0_0.png`, { image: true });
  }
}

export const satellitePhotosPlugin = new SatellitePhotos();
