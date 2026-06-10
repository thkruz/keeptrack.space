import { openColorbox } from '@app/engine/utils/colorbox';
import { getEl } from '@app/engine/utils/get-el';
import { lat2pitch, lon2yaw } from '@app/engine/utils/transforms';

import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import { Degrees } from '@ootk/src/main';
import satellitePng from '@public/img/icons/satellite.png';
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
  requiresInternet = true;
  protected dependencies_: string[] = [SelectSatManager.name];
  protected discvrPhotos_: { imageUrl: string; lat: Degrees; lon: Degrees }[] = [];

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'menu-sat-photo',
      label: t7e('plugins.SatellitePhotos.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: satellitePng,
      menuMode: [MenuMode.DISPLAY, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'sat-photo-menu',
      title: t7e('plugins.SatellitePhotos.title' as Parameters<typeof t7e>[0]),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 200,
      maxWidth: 400,
    };
  }

  private buildSideMenuHtml_(): string {
    return html`
      <div id="sat-photo-menu" class="side-menu-parent start-hidden">
        <div id="sat-photo-menu-content" class="side-menu">
          <ul id="sat-photo-menu-list">
            <li id="meteosat9-link" class="menu-selectable">MeteoSat 9</li>
            <li id="meteosat11-link" class="menu-selectable">MeteoSat 11</li>
            <li id="himawari8-link" class="menu-selectable">Himawari 8</li>
            <li id="goes16-link" class="menu-selectable">GOES 16</li>
            <li id="goes18-link" class="menu-selectable">GOES 18</li>
            <li id="elektro3-link" class="menu-selectable">Elektro-L 2</li>
          </ul>
        </div>
      </div>
    `;
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.SatellitePhotos.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.SatellitePhotos.help.overview'),
          image: {
            src: 'img/help/satellite-photos/satellite-photos-menu.png',
            alt: t7e('plugins.SatellitePhotos.help.imgAlt'),
            caption: t7e('plugins.SatellitePhotos.help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.SatellitePhotos.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.SatellitePhotos.help.tip1'),
        t7e('plugins.SatellitePhotos.help.tip2'),
      ],
      shortcuts: [{ keys: ['H'], description: t7e('plugins.SatellitePhotos.help.shortcutToggle') }],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'H',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      this.uiManagerFinal_.bind(this),
    );

    EventBus.getInstance().on(
      EventBusEvent.onKeepTrackReady,
      () => {
        this.initDISCOVR_();
      },
    );
  }

  private uiManagerFinal_(): void {
    getEl('meteosat9-link', true)?.addEventListener('click', () => {
      // IODC is Indian Ocean Data Coverage and is Meteosat 9 as of 2022
      SatellitePhotos.loadPic_(28912, 'https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSGIODC_RGBNatColour_LowResolution.jpg');
    });
    getEl('meteosat11-link', true)?.addEventListener('click', () => {
      // Meteosat 11 provides 0 deg full earth images every 15 minutes
      SatellitePhotos.loadPic_(40732, 'https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSG_RGBNatColour_LowResolution.jpg');
    });
    getEl('himawari8-link', true)?.addEventListener('click', () => {
      SatellitePhotos.himawari8_();
    });
    getEl('goes16-link', true)?.addEventListener('click', () => {
      SatellitePhotos.loadPic_(41866, 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/GEOCOLOR/latest.jpg');
    });
    getEl('goes18-link', true)?.addEventListener('click', () => {
      SatellitePhotos.loadPic_(51850, 'https://cdn.star.nesdis.noaa.gov/GOES18/ABI/FD/GEOCOLOR/latest.jpg');
    });
    getEl('elektro3-link', true)?.addEventListener('click', () => {
      this.loadElektro_();
    });
  }

  // =========================================================================
  // Elektro-L 2 time-based image loading
  // =========================================================================

  private loadElektro_(): void {
    const timeManager = ServiceLocator.getTimeManager();
    const simulationTime = timeManager.simulationTimeObj;
    const realTime = Date.now();

    if (realTime - simulationTime.getTime() < 0) {
      this.loadElektroFuture_(simulationTime, realTime);

      return;
    }

    this.loadElektroPastOrPresent_(simulationTime, realTime);
  }

  private loadElektroFuture_(simulationTime: Date, realTime: number): void {
    const closestTime = new Date(simulationTime);

    closestTime.setHours(closestTime.getHours() + 24);
    closestTime.setMinutes(closestTime.getMinutes() - 30);
    closestTime.setSeconds(0);

    if ((closestTime.getTime() + 30 * 60 * 1000) - realTime > 0) {
      closestTime.setMinutes(closestTime.getMinutes() - 30);
    }

    const formattedDate = closestTime.toISOString().slice(0, 10).replace(/-/gu, '');
    const closestTimeUTCString = SatellitePhotos.formatUtcTime_(closestTime);

    SatellitePhotos.loadPic_(41105,
      `https://electro.ntsomz.ru/i/splash/${formattedDate}-${(closestTime.getUTCHours() + 3).toString().padStart(2, '0')}00.jpg`,
      `Electro-L 2 at ${closestTimeUTCString} UTC`,
    );
  }

  private loadElektroPastOrPresent_(simulationTime: Date, realTime: number): void {
    let closestTime: Date;

    if (realTime - simulationTime.getTime() > 24 * 60 * 60 * 1000) {
      closestTime = new Date(realTime);
    } else {
      closestTime = new Date(simulationTime);
    }

    closestTime.setMinutes(Math.floor(closestTime.getMinutes() / 30) * 30);
    closestTime.setSeconds(0);

    if (realTime - closestTime.getTime() > 24 * 60 * 60 * 1000) {
      closestTime.setMinutes(closestTime.getMinutes() + 30);
    }

    if ((closestTime.getTime() + 60 * 60 * 1000) - realTime > 0) {
      closestTime.setMinutes(closestTime.getMinutes() - 60);
    }

    const formattedDate = closestTime.toISOString().slice(0, 10).replace(/-/gu, '');
    const closestTimeUTCString = SatellitePhotos.formatUtcTime_(closestTime);

    SatellitePhotos.loadPic_(41105,
      `https://electro.ntsomz.ru/i/splash/${formattedDate}-${(closestTime.getUTCHours() + 3).toString().padStart(2, '0')}00.jpg`,
      `Electro-L 2 at ${closestTimeUTCString} UTC`,
    );
  }

  private static formatUtcTime_(date: Date): string {
    return date.toLocaleString('en-UK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });
  }

  // =========================================================================
  // DSCOVR image loading
  // =========================================================================

  private initDISCOVR_(): void {
    fetch('https://epic.gsfc.nasa.gov/api/natural')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
      })
      .then((res: DiscvrResponse[]) => {
        res.forEach((photo) => {
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

        this.addDiscvrLinks_();
      })
      .catch(() => {
        errorManagerInstance.log('https://epic.gsfc.nasa.gov/ request failed!');
        const unavailableHtml = `<li class="menu-selectable disabled">${t7e('plugins.SatellitePhotos.labels.dscovrUnavailable')}</li>`;

        getEl('sat-photo-menu-list', true)?.insertAdjacentHTML('beforeend', unavailableHtml);
      });
  }

  private addDiscvrLinks_(): void {
    const listEl = getEl('sat-photo-menu-list', true);

    if (!listEl) {
      return;
    }

    for (let i = 1; i < this.discvrPhotos_.length + 1; i++) {
      const linkHtml = `<li id="discovr-link${i}" class="menu-selectable">${t7e('plugins.SatellitePhotos.labels.dscovrImage').replace('{index}', i.toString())}</li>`;

      listEl.insertAdjacentHTML('beforeend', linkHtml);
      getEl(`discovr-link${i}`, true)?.addEventListener('click', () => {
        const camera = ServiceLocator.getMainCamera();
        const timeManager = ServiceLocator.getTimeManager();

        SatellitePhotos.loadPic_(-1, this.discvrPhotos_[i - 1].imageUrl);
        camera.camSnap(
          lat2pitch(this.discvrPhotos_[i - 1].lat),
          lon2yaw(this.discvrPhotos_[i - 1].lon, timeManager.simulationTimeObj),
        );
        camera.changeZoom(0.7);
      });
    }
  }

  // =========================================================================
  // Shared utilities
  // =========================================================================

  private static colorbox_(url: string, title?: string): void {
    settingsManager.isPreventColorboxClose = true;
    setTimeout(() => {
      settingsManager.isPreventColorboxClose = false;
    }, 2000);

    openColorbox(url, {
      title: title || t7e('plugins.SatellitePhotos.defaultImageTitle' as Parameters<typeof t7e>[0]),
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
    const catalogManager = ServiceLocator.getCatalogManager();
    const camera = ServiceLocator.getMainCamera();
    const timeManager = ServiceLocator.getTimeManager();

    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(catalogManager.sccNum2Id(40267) ?? -1);
    camera.changeZoom(0.7);

    // Propagation time minus 30 minutes so that the pictures have time to become available
    let propTime = timeManager.simulationTimeObj;

    if (propTime.getTime() < Date.now()) {
      propTime = new Date(propTime.getTime() - 1000 * 60 * 30);
    } else {
      const uiManagerInstance = ServiceLocator.getUiManager();

      uiManagerInstance.toast(
        t7e('plugins.SatellitePhotos.errorMsgs.FuturePictures' as Parameters<typeof t7e>[0]),
        ToastMsgType.caution,
      );
      propTime = new Date(Date.now() - 1000 * 60 * 30);
    }
    const year = propTime.getUTCFullYear();
    const mon = (propTime.getUTCMonth() + 1).toString().padStart(2, '0');
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
