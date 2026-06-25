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
import { IMAGERY_SOURCES, ImagerySource } from './imagery-sources';
import './satellite-photos.css';

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

  /** DSCOVR (Deep Space Climate Observatory), the source of the EPIC whole-Earth images. */
  private static readonly DSCOVR_SCC = 40390;

  /** Imagery sources for the DSCOVR EPIC archive, built lazily on first menu open. */
  protected discvrSources_: ImagerySource[] = [];
  /** Guards the one-time DSCOVR fetch so it only fires when the menu is first opened. */
  private isDiscvrRequested_ = false;
  /** The last source the user opened, used by the Refresh action. */
  private lastSource_: ImagerySource | null = null;

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
    const geoRows = IMAGERY_SOURCES.map((source) => SatellitePhotos.actionRow_(source.id, source.label)).join('');

    return html`
      <div id="sat-photo-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="sat-photo-menu-content" class="side-menu">
          <section class="kt-section">
            <div class="kt-section-label">${t7e('plugins.SatellitePhotos.sections.geostationary')}</div>
            <div id="sat-photo-geo-list">${geoRows}</div>
          </section>
          <section class="kt-section" id="sat-photo-dscovr-section">
            <div class="kt-section-label">${t7e('plugins.SatellitePhotos.sections.dscovr')}</div>
            <div id="sat-photo-dscovr-list">
              <div class="kt-note">${t7e('plugins.SatellitePhotos.labels.dscovrLoading')}</div>
            </div>
          </section>
          <button type="button" id="sat-photo-refresh" class="kt-action waves-effect" style="display:none;">
            <span class="kt-action-label">${t7e('plugins.SatellitePhotos.labels.refresh')}</span>
          </button>
        </div>
      </div>
    `;
  }

  private static actionRow_(id: string, label: string): string {
    return `<button type="button" id="${id}-link" class="kt-action waves-effect sat-photo-link" data-source-id="${id}">` +
      `<span class="kt-action-label">${label}</span></button>`;
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
  }

  private uiManagerFinal_(): void {
    getEl('sat-photo-menu-content', true)?.addEventListener('click', (evt: Event) => {
      const row = (evt.target as HTMLElement).closest('.sat-photo-link') as HTMLElement | null;

      if (!row) {
        return;
      }

      const source = this.findSource_(row.dataset.sourceId);

      if (source) {
        this.loadSource_(source);
      }
    });

    getEl('sat-photo-refresh', true)?.addEventListener('click', () => this.refreshLatest_());
  }

  /** The DSCOVR feed is only fetched the first time the user opens the menu. */
  onSideMenuOpen(): void {
    if (this.isDiscvrRequested_) {
      return;
    }
    this.isDiscvrRequested_ = true;
    this.initDscovr_();
  }

  private findSource_(id?: string): ImagerySource | undefined {
    if (!id) {
      return undefined;
    }

    return IMAGERY_SOURCES.find((source) => source.id === id) ?? this.discvrSources_.find((source) => source.id === id);
  }

  // =========================================================================
  // Image loading
  // =========================================================================

  private loadSource_(source: ImagerySource, bustCache = false): void {
    const timeManager = ServiceLocator.getTimeManager();
    const uiManager = ServiceLocator.getUiManager();
    const camera = ServiceLocator.getMainCamera();
    const result = source.buildImage(timeManager.simulationTimeObj, Date.now());

    this.lastSource_ = source;
    uiManager.searchManager.hideResults();

    if (source.sccNum !== null) {
      const id = ServiceLocator.getCatalogManager().sccNum2Id(source.sccNum) ?? -1;

      PluginRegistry.getPlugin(SelectSatManager)?.selectSat(id);
    }

    if (result.snap) {
      camera.camSnap(lat2pitch(result.snap.lat), lon2yaw(result.snap.lon, timeManager.simulationTimeObj));
    }
    camera.changeZoom(0.7);

    if (result.isFuture) {
      uiManager.toast(
        t7e('plugins.SatellitePhotos.errorMsgs.FuturePictures' as Parameters<typeof t7e>[0]),
        ToastMsgType.caution,
      );
    }

    const title = result.timestampUtc
      ? t7e('plugins.SatellitePhotos.labels.imageAtUtc')
        .replace('{name}', source.label)
        .replace('{time}', result.timestampUtc)
      : source.label;

    let { url } = result;

    if (bustCache) {
      url += `${url.includes('?') ? '&' : '?'}_=${Date.now()}`;
    }

    SatellitePhotos.openImage_(url, title);
    this.showRefresh_();
  }

  private static openImage_(url: string, title: string): void {
    settingsManager.isPreventColorboxClose = true;
    setTimeout(() => {
      settingsManager.isPreventColorboxClose = false;
    }, 2000);

    openColorbox(url, { title, image: true });
  }

  private showRefresh_(): void {
    const btn = getEl('sat-photo-refresh', true);

    if (btn) {
      btn.style.display = 'flex';
    }
  }

  private refreshLatest_(): void {
    if (!this.lastSource_) {
      return;
    }
    this.loadSource_(this.lastSource_, true);
  }

  // =========================================================================
  // DSCOVR EPIC image loading
  // =========================================================================

  private initDscovr_(): void {
    fetch('https://epic.gsfc.nasa.gov/api/natural')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
      })
      .then((res: DiscvrResponse[]) => {
        this.discvrSources_ = res.map((photo, idx) => SatellitePhotos.buildDscovrSource_(photo, idx + 1));
        this.renderDscovrRows_();
      })
      .catch(() => {
        errorManagerInstance.log('https://epic.gsfc.nasa.gov/ request failed!');
        this.setDscovrNote_(t7e('plugins.SatellitePhotos.labels.dscovrUnavailable'));
      });
  }

  private static buildDscovrSource_(photo: DiscvrResponse, index: number): ImagerySource {
    const dateStr = photo.identifier;
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const url = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${photo.image}.png`;
    const { lat, lon } = photo.centroid_coordinates;

    return {
      id: `dscovr${index}`,
      label: t7e('plugins.SatellitePhotos.labels.dscovrImage').replace('{index}', index.toString()),
      sccNum: SatellitePhotos.DSCOVR_SCC,
      buildImage: () => ({ url, snap: { lat, lon } }),
    };
  }

  private renderDscovrRows_(): void {
    const listEl = getEl('sat-photo-dscovr-list', true);

    if (!listEl) {
      return;
    }

    if (this.discvrSources_.length === 0) {
      this.setDscovrNote_(t7e('plugins.SatellitePhotos.labels.dscovrUnavailable'));

      return;
    }

    listEl.innerHTML = this.discvrSources_.map((source) => SatellitePhotos.actionRow_(source.id, source.label)).join('');
  }

  private setDscovrNote_(text: string): void {
    const listEl = getEl('sat-photo-dscovr-list', true);

    if (listEl) {
      listEl.innerHTML = `<div class="kt-note">${text}</div>`;
    }
  }
}
