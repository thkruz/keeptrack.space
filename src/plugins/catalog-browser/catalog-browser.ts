import { apiFetch } from '@app/app/data/api-fetch';
import { CatalogLoader, JsSat, KeepTrackTLEFile } from '@app/app/data/catalog-loader';
import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { settingsManager } from '@app/settings/settings';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  ICommandPaletteCapable,
  ICommandPaletteCommand,
  IDragOptions,
  IHelpConfig,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { hideAsyncIndicator, showAsyncIndicator } from '@app/engine/utils/asyncIndicator';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { Satellite } from '@ootk/src/main';
import satelliteAltPng from '@public/img/icons/satellite-alt.png';
import { CatalogBrowserData } from './catalog-browser-data';
import type { CatalogBrowserConfiguration } from './catalog-browser-settings';
import './catalog-browser.css';

type T7eKey = Parameters<typeof t7e>[0];

const CELESTRAK_GP_URL = 'https://celestrak.org/NORAD/elements/gp.php';
const CELESTRAK_SUP_GP_URL = 'https://celestrak.org/NORAD/elements/supplemental/sup-gp.php';

export class CatalogBrowserPlugin extends KeepTrackPlugin implements ICommandPaletteCapable {
  readonly id = 'CatalogBrowserPlugin';
  dependencies_: string[] = [];

  private isLoading_ = false;
  private orbitalDataOnly_ = false;

  private get hideKeepTrackCatalogs_(): boolean {
    return (settingsManager.plugins?.CatalogBrowserPlugin as CatalogBrowserConfiguration | undefined)?.hideKeepTrackCatalogs ?? false;
  }
  /** Cached full catalog metadata for "Orbital Only" merges */
  private cachedCatalog_: KeepTrackTLEFile[] | null = null;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'menu-catalog-browser',
      label: t7e('plugins.CatalogBrowserPlugin.bottomIconLabel' as T7eKey),
      image: satelliteAltPng,
      menuMode: [MenuMode.CATALOG, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'catalog-browser-menu',
      title: t7e('plugins.CatalogBrowserPlugin.title' as T7eKey),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 250,
      maxWidth: 400,
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.CatalogBrowserPlugin.title' as T7eKey),
      body: t7e('plugins.CatalogBrowserPlugin.helpBody' as T7eKey),
    };
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = t7e('plugins.CatalogBrowserPlugin.commands.category' as T7eKey);
    const commands: ICommandPaletteCommand[] = [];

    if (!this.hideKeepTrackCatalogs_) {
      commands.push(
        {
          id: 'CatalogBrowserPlugin.load.default',
          label: `Load Catalog: ${t7e('plugins.CatalogBrowserPlugin.entries.defaultCatalog' as T7eKey)}`,
          category,
          callback: () => this.loadKeepTrackCatalog_('DEFAULT'),
        },
        {
          id: 'CatalogBrowserPlugin.load.celestrak-only',
          label: `Load Catalog: ${t7e('plugins.CatalogBrowserPlugin.entries.celestrakOnly' as T7eKey)}`,
          category,
          callback: () => this.loadKeepTrackCatalog_('CELESTRAK_ONLY'),
        },
        {
          id: 'CatalogBrowserPlugin.load.vimpel-only',
          label: `Load Catalog: ${t7e('plugins.CatalogBrowserPlugin.entries.vimpelOnly' as T7eKey)}`,
          category,
          callback: () => this.loadKeepTrackCatalog_('VIMPEL_ONLY'),
        },
      );
    }

    for (const cat of CatalogBrowserData.categories) {
      for (const entry of cat.entries) {
        const label = t7e(`plugins.CatalogBrowserPlugin.entries.${entry.nameKey}` as T7eKey);

        commands.push({
          id: `CatalogBrowserPlugin.load.${entry.id}`,
          label: `Load Catalog: ${label}`,
          category,
          callback: () => this.fetchAndLoadCatalog_(entry.queryParam),
        });
      }
    }

    return commands;
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      this.uiManagerFinal_.bind(this),
    );
  }

  private uiManagerFinal_(): void {
    const toggle = getEl('cb-orbital-data-only') as HTMLInputElement | null;
    const modeDesc = getEl('cb-mode-description');

    toggle?.addEventListener('change', () => {
      this.orbitalDataOnly_ = toggle.checked;
      if (modeDesc) {
        modeDesc.textContent = toggle.checked
          ? t7e('plugins.CatalogBrowserPlugin.labels.orbitalOnlyDesc' as T7eKey)
          : t7e('plugins.CatalogBrowserPlugin.labels.allDataDesc' as T7eKey);
      }
    });

    const listEl = getEl('cb-catalog-list');

    listEl?.addEventListener('click', (evt: Event) => {
      const target = (evt.target as HTMLElement).closest('.cb-catalog-item') as HTMLElement | null;

      if (!target || this.isLoading_) {
        return;
      }

      const queryParam = target.dataset.query;

      if (!queryParam) {
        return;
      }

      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);

      if (queryParam === 'DEFAULT' || queryParam === 'CELESTRAK_ONLY' || queryParam === 'VIMPEL_ONLY') {
        this.loadKeepTrackCatalog_(queryParam);
      } else {
        this.fetchAndLoadCatalog_(queryParam);
      }
    });
  }

  // =========================================================================
  // Core logic
  // =========================================================================

  private async loadKeepTrackCatalog_(mode: 'DEFAULT' | 'CELESTRAK_ONLY' | 'VIMPEL_ONLY'): Promise<void> {
    if (this.isLoading_) {
      return;
    }

    this.isLoading_ = true;
    showAsyncIndicator();
    const uiManager = ServiceLocator.getUiManager();

    try {
      this.cachedCatalog_ = null;

      if (mode === 'CELESTRAK_ONLY') {
        settingsManager.isEnableJscCatalog = false;
        try {
          await CatalogLoader.load();
        } finally {
          settingsManager.isEnableJscCatalog = true;
        }
      } else if (mode === 'VIMPEL_ONLY') {
        const resp = await apiFetch(settingsManager.dataSources.vimpel);

        if (!resp.ok) {
          throw new Error(`Vimpel fetch returned HTTP ${resp.status}`);
        }
        const vimpelData = await resp.json() as JsSat[];

        // Route through the JSC Vimpel pipeline (not raw-TLE reload) so altIds,
        // labels, and object types match the initial-boot processing.
        await CatalogLoader.reloadVimpelCatalog(vimpelData);
      } else {
        await CatalogLoader.load();
      }

      let toastSuffix: string;

      if (mode === 'DEFAULT') {
        toastSuffix = 'defaultLoaded';
      } else if (mode === 'CELESTRAK_ONLY') {
        toastSuffix = 'celestrakLoaded';
      } else {
        toastSuffix = 'vimpelLoaded';
      }

      uiManager.toast(
        t7e(`plugins.CatalogBrowserPlugin.toasts.${toastSuffix}` as T7eKey),
        ToastMsgType.normal,
      );
    } catch (error) {
      errorManagerInstance.error(error, 'CatalogBrowserPlugin');
      uiManager.toast(
        t7e('plugins.CatalogBrowserPlugin.errorMsgs.DefaultFailed' as T7eKey),
        ToastMsgType.critical,
      );
    } finally {
      this.isLoading_ = false;
      hideAsyncIndicator();
    }
  }

  private async fetchAndLoadCatalog_(queryParam: string): Promise<void> {
    if (this.isLoading_) {
      return;
    }

    this.isLoading_ = true;
    showAsyncIndicator();
    const uiManager = ServiceLocator.getUiManager();

    try {
      const url = this.buildCelesTrackUrl_(queryParam);
      const response = await fetch(url);

      if (!response.ok) {
        const err = new Error(`CelesTrak returned HTTP ${response.status}`) as Error & { status?: number };

        err.status = response.status;
        throw err;
      }

      const tleContent = await response.text();

      if (!tleContent.trim()) {
        throw new Error('Empty response from CelesTrak');
      }

      if (this.orbitalDataOnly_) {
        this.ensureCatalogCached_();
        const merged = this.mergeWithCache_(tleContent);

        await CatalogLoader.reloadCatalogFromData(merged);
      } else {
        this.cachedCatalog_ = null;
        await CatalogLoader.reloadCatalog(tleContent);
      }

      uiManager.toast(
        t7e('plugins.CatalogBrowserPlugin.toasts.loaded' as T7eKey)
          .replace('{catalog}', queryParam.split('=')[1]),
        ToastMsgType.normal,
      );
    } catch (error) {
      const { messageKey, toastType, isTransient } = this.classifyFetchError_(error);

      if (!isTransient) {
        errorManagerInstance.error(error as Error, 'CatalogBrowserPlugin', undefined, { skipToast: true });
      }

      uiManager.toast(
        t7e(messageKey),
        toastType,
      );
    } finally {
      this.isLoading_ = false;
      hideAsyncIndicator();
    }
  }

  private classifyFetchError_(error: unknown): { messageKey: T7eKey; toastType: ToastMsgType; isTransient: boolean } {
    const status = (error as { status?: number } | null)?.status;

    if (status === 403) {
      return {
        messageKey: 'plugins.CatalogBrowserPlugin.errorMsgs.Forbidden' as T7eKey,
        toastType: ToastMsgType.caution,
        isTransient: true,
      };
    }
    if (status === 429) {
      return {
        messageKey: 'plugins.CatalogBrowserPlugin.errorMsgs.RateLimited' as T7eKey,
        toastType: ToastMsgType.caution,
        isTransient: true,
      };
    }
    if (typeof status === 'number' && status >= 500) {
      return {
        messageKey: 'plugins.CatalogBrowserPlugin.errorMsgs.ServerError' as T7eKey,
        toastType: ToastMsgType.caution,
        isTransient: true,
      };
    }
    if (error instanceof TypeError) {
      return {
        messageKey: 'plugins.CatalogBrowserPlugin.errorMsgs.NetworkError' as T7eKey,
        toastType: ToastMsgType.critical,
        isTransient: false,
      };
    }

    return {
      messageKey: 'plugins.CatalogBrowserPlugin.errorMsgs.FetchFailed' as T7eKey,
      toastType: ToastMsgType.critical,
      isTransient: false,
    };
  }

  /**
   * Snapshots the current full catalog so "Orbital Only" merges always
   * have access to all satellite metadata, even after previous swaps.
   */
  private ensureCatalogCached_(): void {
    if (this.cachedCatalog_) {
      return;
    }

    const catalogManager = ServiceLocator.getCatalogManager();

    this.cachedCatalog_ = [];

    for (const obj of catalogManager.objectCache) {
      if (!obj.isSatellite()) {
        continue;
      }
      const sat = obj as Satellite;

      this.cachedCatalog_.push({
        tle1: sat.tle1,
        tle2: sat.tle2,
        name: sat.name,
        altName: sat.altName,
        country: sat.country,
        owner: sat.owner,
        mission: sat.mission,
        purpose: sat.purpose,
        type: sat.type,
        bus: sat.bus,
        configuration: sat.configuration,
        dryMass: sat.dryMass,
        equipment: sat.equipment,
        lifetime: sat.lifetime,
        manufacturer: sat.manufacturer,
        motor: sat.motor,
        payload: sat.payload,
        power: sat.power,
        shape: sat.shape,
        span: sat.span,
        launchDate: sat.launchDate,
        launchMass: sat.launchMass,
        launchSite: sat.launchSite,
        launchPad: sat.launchPad,
        launchVehicle: sat.launchVehicle,
        length: sat.length,
        diameter: sat.diameter,
        rcs: typeof sat.rcs === 'number' ? sat.rcs.toString() : null,
        vmag: sat.vmag ?? null,
        status: sat.status,
        altId: sat.altId,
        sccNum: sat.sccNum,
      });
    }
  }

  /**
   * Merges incoming TLE text against the cached full catalog.
   * Satellites in the cache that match incoming SCCs get updated TLEs.
   * Incoming satellites not in the cache are added with minimal metadata.
   */
  private mergeWithCache_(tleContent: string): KeepTrackTLEFile[] {
    const asciiCatalog = CatalogLoader.parseTceContent(tleContent);
    const incomingMap = new Map<string, { TLE1: string; TLE2: string; ON?: string }>();

    for (const entry of asciiCatalog) {
      // canonicalSccKey strips leading zeros so a zero-padded incoming SCC
      // ("025544") still matches the display-canonical cached.sccNum ("25544"),
      // and returns null for malformed SCCs (Satnogs-style corruption) or IDs
      // beyond TLE alpha-5 capacity instead of throwing — skip those rather
      // than crashing the whole merge.
      const scc6 = CatalogLoader.canonicalSccKey(entry.SCC);

      if (scc6 === null) {
        continue;
      }
      incomingMap.set(scc6, entry);
    }

    const merged: KeepTrackTLEFile[] = [];
    const matchedSccs = new Set<string>();

    for (const cached of this.cachedCatalog_!) {
      const scc = cached.sccNum!;
      const incoming = incomingMap.get(scc);

      if (!incoming) {
        continue;
      }

      matchedSccs.add(scc);
      merged.push({
        ...cached,
        tle1: incoming.TLE1 as typeof cached.tle1,
        tle2: incoming.TLE2 as typeof cached.tle2,
      });
    }

    // Add incoming satellites not found in the cache
    for (const [scc6, entry] of incomingMap) {
      if (matchedSccs.has(scc6)) {
        continue;
      }
      merged.push({
        tle1: entry.TLE1 as KeepTrackTLEFile['tle1'],
        tle2: entry.TLE2 as KeepTrackTLEFile['tle2'],
        name: entry.ON ?? 'Unknown',
      });
    }

    return merged;
  }

  private buildCelesTrackUrl_(queryParam: string): string {
    const baseUrl = queryParam.startsWith('FILE=')
      ? CELESTRAK_SUP_GP_URL
      : CELESTRAK_GP_URL;

    return `${baseUrl}?${queryParam}&FORMAT=3LE`;
  }

  // =========================================================================
  // Side menu HTML
  // =========================================================================

  private buildSideMenuHtml_(): string {
    return html`
      <div id="catalog-browser-menu" class="side-menu-parent start-hidden">
        <div class="side-menu">
          <div class="cb-toggle-row">
            <div class="switch">
              <label for="cb-orbital-data-only">
                <span class="cb-toggle-label">${t7e('plugins.CatalogBrowserPlugin.labels.allData' as T7eKey)}</span>
                <input id="cb-orbital-data-only" type="checkbox" />
                <span class="lever"></span>
                <span class="cb-toggle-label">${t7e('plugins.CatalogBrowserPlugin.labels.orbitalOnly' as T7eKey)}</span>
              </label>
            </div>
          </div>
          <div class="cb-info-note">
            <span id="cb-mode-description">${t7e('plugins.CatalogBrowserPlugin.labels.allDataDesc' as T7eKey)}</span>
          </div>
          <div class="divider"></div>
          <div id="cb-catalog-list" class="cb-catalog-list">
            ${this.buildCatalogListHtml_()}
          </div>
        </div>
      </div>
    `;
  }

  private buildCatalogListHtml_(): string {
    const categories = CatalogBrowserData.categories;
    const catLabel = (key: string) =>
      t7e(`plugins.CatalogBrowserPlugin.categories.${key}` as T7eKey);
    const entryLabel = (key: string) =>
      t7e(`plugins.CatalogBrowserPlugin.entries.${key}` as T7eKey);

    let listHtml = '';

    // KeepTrack catalogs at the top (hidden when hideKeepTrackCatalogs is set)
    if (!this.hideKeepTrackCatalogs_) {
      listHtml += `<div class="cb-category-header">${catLabel('keeptrack')}</div>`;
      listHtml += '<ul>';
      listHtml += '<li class="menu-selectable cb-catalog-item" ' +
        'data-query="DEFAULT" data-id="default">' +
        `<span class="cb-item-name">${entryLabel('defaultCatalog')}</span>` +
        '</li>';
      listHtml += '<li class="menu-selectable cb-catalog-item" ' +
        'data-query="CELESTRAK_ONLY" data-id="celestrak-only">' +
        `<span class="cb-item-name">${entryLabel('celestrakOnly')}</span>` +
        '</li>';
      listHtml += '<li class="menu-selectable cb-catalog-item" ' +
        'data-query="VIMPEL_ONLY" data-id="vimpel-only">' +
        `<span class="cb-item-name">${entryLabel('vimpelOnly')}</span>` +
        '</li>';
      listHtml += '</ul>';
    }

    for (const cat of categories) {
      listHtml += `<div class="cb-category-header">${catLabel(cat.nameKey)}</div>`;
      listHtml += '<ul>';

      for (const entry of cat.entries) {
        const isSupGp = entry.queryParam.startsWith('FILE=');
        const chipClass = isSupGp ? 'cb-chip cb-chip-supgp' : 'cb-chip cb-chip-gp';
        const chipText = isSupGp ? 'SupGP' : 'GP';

        listHtml += '<li class="menu-selectable cb-catalog-item" ' +
          `data-query="${entry.queryParam}" ` +
          `data-id="${entry.id}">` +
          `<span class="cb-item-name">${entryLabel(entry.nameKey)}</span>` +
          `<span class="${chipClass}">${chipText}</span>` +
          '</li>';
      }

      listHtml += '</ul>';
    }

    return listHtml;
  }
}
