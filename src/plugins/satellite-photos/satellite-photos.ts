import { openColorbox } from '@app/engine/utils/colorbox';
import { getEl } from '@app/engine/utils/get-el';
import { lat2pitch, lon2yaw } from '@app/engine/utils/transforms';

import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { Degrees } from '@ootk/src/main';
import photoManagerPng from '@public/img/icons/photoManager.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
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
  readonly id = 'SatellitePhotos';
  protected dependencies_: string[] = [SelectSatManager.name];
  discvrPhotos_: { imageUrl: string; lat: Degrees; lon: Degrees }[] = [];

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = photoManagerPng;
  sideMenuElementName: string = 'sat-photo-menu';
  sideMenuElementHtml: string = html`
  <div id="sat-photo-menu" class="side-menu-parent start-hidden text-select">
    <div id="sat-photo-menu-content" class="side-menu">
      <ul id="sat-photo-menu-list">
        <h5 class="center-align">Satellites Imagery List</h5>
        <li id="meteosat9-link" class="link satPhotoRow">MeteoSat 9</li>
        <li id="meteosat11-link" class="link satPhotoRow">MeteoSat 11</li>
        <li id="himawari8-link" class="link satPhotoRow">Himawari 8</li>
        <li id="goes16-link" class="link satPhotoRow">GOES 16</li>
        <li id="goes18-link" class="link satPhotoRow">GOES 18</li>
        <li id="elektro3-link" class="link satPhotoRow">Elektro-L 2</li>
      </ul>
    </div>
  </div>`;

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('meteosat9-link')!.addEventListener('click', () => {
          // IODC is Indian Ocean Data Coverage and is Meteosat 9 as of 2022
          SatellitePhotos.loadPic_(28912, 'https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSGIODC_RGBNatColour_LowResolution.jpg');
        });
        getEl('meteosat11-link')!.addEventListener('click', () => {
          // Meteosat 11 provides 0 deg full earth images every 15 minutes
          SatellitePhotos.loadPic_(40732, 'https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSG_RGBNatColour_LowResolution.jpg');
        });
        getEl('himawari8-link')!.addEventListener('click', () => {
          SatellitePhotos.himawari8_();
        });
        getEl('goes16-link')!.addEventListener('click', () => {
          SatellitePhotos.loadPic_(41866, 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/GEOCOLOR/latest.jpg');
        });
        getEl('goes18-link')!.addEventListener('click', () => {
          SatellitePhotos.loadPic_(51850, 'https://cdn.star.nesdis.noaa.gov/GOES18/ABI/FD/GEOCOLOR/latest.jpg');
        });
        getEl('elektro3-link')!.addEventListener('click', () => {
          /*
           * We can only access the latest 24 hours of images based on REAL time
           * not simulation time. If beyond the last 24 hours or in the future,
           * change to the closest available image.
           *
           * Images are uploaded in 30 minute intervals in this format https://electro.ntsomz.ru/i/splash/20250813-1400.jpg
           *
           * The time is in UTC+3, so we need to convert the simulation time to UTC+3
           */

          const simulationTime = ServiceLocator.getTimeManager().simulationTimeObj;
          const realTime = new Date().getTime();

          if (realTime - simulationTime.getTime() < 0) {
            // Change to the closest available image.
            const closestTime = new Date(simulationTime);

            closestTime.setHours(closestTime.getHours() + 24);
            closestTime.setMinutes(closestTime.getMinutes() - 30);
            closestTime.setSeconds(0);
            const formattedDate = closestTime.toISOString().slice(0, 10).replace(/-/gu, '');

            /*
             * Verify closest time is not in the future (add a 30 minute buffer
             * for upload/update times)
             */
            if ((closestTime.getTime() + 30 * 60 * 1000) - realTime > 0) {
              // Subtract 30 minutes
              closestTime.setMinutes(closestTime.getMinutes() - 30);
            }
            const closestTimeUTCString = closestTime.toLocaleString('en-UK', {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'UTC',
            });

            SatellitePhotos.loadPic_(41105,
              `https://electro.ntsomz.ru/i/splash/${formattedDate}-${(closestTime.getUTCHours() + 3).toString().padStart(2, '0')}00.jpg`,
              `Electro-L 2 at ${closestTimeUTCString} UTC`,
            );

            return;
          }

          // Find the closest 30 minute interval
          let closestTime: Date;

          if (realTime - simulationTime.getTime() > 24 * 60 * 60 * 1000) {
            closestTime = new Date(realTime);
          } else {
            closestTime = new Date(simulationTime);
          }

          closestTime.setMinutes(Math.floor(closestTime.getMinutes() / 30) * 30);
          closestTime.setSeconds(0);
          const formattedDate = closestTime.toISOString().slice(0, 10).replace(/-/gu, '');

          // Verify closest time is within the last 24 hours
          if (realTime - closestTime.getTime() > 24 * 60 * 60 * 1000) {
            // Add 30 minutes
            closestTime.setMinutes(closestTime.getMinutes() + 30);
          }

          /*
           * Verify closest time is not in the future (add a 30 minute buffer
           * for upload/update times)
           */
          if ((closestTime.getTime() + 60 * 60 * 1000) - realTime > 0) {
            // Subtract 60 minutes
            closestTime.setMinutes(closestTime.getMinutes() - 60);
          }
          // Format the closest time for display in a more user-friendly way
          const closestTimeUTCString = closestTime.toLocaleString('en-UK', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC',
          });

          SatellitePhotos.loadPic_(41105,
            `https://electro.ntsomz.ru/i/splash/${formattedDate}-${(closestTime.getUTCHours() + 3).toString().padStart(2, '0')}00.jpg`,
            `Electro-L 2 at ${closestTimeUTCString} UTC`,
          );
        });
      },
    );

    EventBus.getInstance().on(
      EventBusEvent.onKeepTrackReady,
      () => {
        this.initDISCOVR_();
      },
    );
  }

  /**
   * Retrieves natural color images of Earth captured by the DSCOVR satellite and displays them using the DrawManager instance.
   */
  private initDISCOVR_(): void {
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

          getEl('sat-photo-menu-list')!.insertAdjacentHTML('beforeend', html);
          getEl(`discovr-link${i}`)!.addEventListener('click', () => {
            SatellitePhotos.loadPic_(-1, this.discvrPhotos_[i - 1].imageUrl);
            ServiceLocator.getMainCamera().camSnap(
              lat2pitch(this.discvrPhotos_[i - 1].lat),
              lon2yaw(this.discvrPhotos_[i - 1].lon, ServiceLocator.getTimeManager().simulationTimeObj),
            );
            ServiceLocator.getMainCamera().changeZoom(0.7);
          });
        }
      } else {
        errorManagerInstance.log('https://epic.gsfc.nasa.gov/ request failed!');
        const html = '<li class="link satPhotoRow disabled">DSCOVR Temporarily Unavailable</li>';

        getEl('sat-photo-menu-list')!.insertAdjacentHTML('beforeend', html);
      }
    };

    req.onerror = () => {
      errorManagerInstance.log('https://epic.gsfc.nasa.gov/ request failed!');
      const html = '<li class="link satPhotoRow disabled">DSCOVR Temporarily Unavailable</li>';

      getEl('sat-photo-menu-list')!.insertAdjacentHTML('beforeend', html);
    };

    req.send();
  }

  private static colorbox_(url: string, title?: string): void {
    settingsManager.isPreventColorboxClose = true;
    setTimeout(() => {
      settingsManager.isPreventColorboxClose = false;
    }, 2000);

    openColorbox(url, {
      title: title || 'Latest Satellite Photo',
      image: true,
    });
  }

  private static loadPic_(satId: number, url: string, title?: string): void {
    ServiceLocator.getUiManager().searchManager.hideResults();
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(ServiceLocator.getCatalogManager().sccNum2Id(satId) ?? -1);
    ServiceLocator.getMainCamera().changeZoom(0.7);
    SatellitePhotos.colorbox_(url, title);
  }

  private static himawari8_(): void {
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(ServiceLocator.getCatalogManager().sccNum2Id(40267) ?? -1);
    ServiceLocator.getMainCamera().changeZoom(0.7);

    // Propagation time minus 30 minutes so that the pictures have time to become available
    let propTime = ServiceLocator.getTimeManager().simulationTimeObj;

    if (propTime.getTime() < Date.now()) {
      propTime = new Date(propTime.getTime() - 1000 * 60 * 30);
    } else {
      const uiManagerInstance = ServiceLocator.getUiManager();

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

