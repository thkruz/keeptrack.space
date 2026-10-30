import { apiFetch } from '@app/app/data/api-fetch';
import { CatalogLoader, JsSat, KeepTrackTLEFile } from '@app/app/data/catalog-loader';
import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCapable, ICommandPaletteCommand, IDragOptions, IHelpConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { hideAsyncIndicator, showAsyncIndicator } from '@app/engine/utils/asyncIndicator';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import { Satellite } from '@ootk/src/main';
import satelliteAltPng from '@public/img/icons/satellite-alt.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { CatalogBrowserData, CatalogEntry } from './catalog-browser-data';
import type { CatalogBrowserConfiguration } from './catalog-browser-settings';
import { CelesTrakNoDataError } from './celestrak-no-data-error';
import './catalog-browser.css';

type T7eKey = Parameters<typeof t7e>[0];

const CELESTRAK_GP_URL = 'https://celestrak.org/NORAD/elements/gp.php';
const CELESTRAK_SUP_GP_URL = 'https://celestrak.org/NORAD/elements/supplemental/sup-gp.php';

/** Upper bound on waiting for the propagation worker after a live catalog swap. */
const CATALOG_READY_TIMEOUT_MS = 30000;

type KeepTrackCatalogMode = 'DEFAULT' | 'CELESTRAK_ONLY' | 'VIMPEL_ONLY';

/** Row id, display-name key, success toast key and failure toast key for each KeepTrack catalog. */
const KEEPTRACK_CATALOGS: Readonly<Record<KeepTrackCatalogMode, { id: string; nameKey: string; toastKey: string; errorKey: string }>> = {
  DEFAULT: { id: 'default', nameKey: 'defaultCatalog', toastKey: 'defaultLoaded', errorKey: 'DefaultFailed' },
  CELESTRAK_ONLY: { id: 'celestrak-only', nameKey: 'celestrakOnly', toastKey: 'celestrakLoaded', errorKey: 'CelestrakFailed' },
  VIMPEL_ONLY: { id: 'vimpel-only', nameKey: 'vimpelOnly', toastKey: 'vimpelLoaded', errorKey: 'VimpelFailed' },
};

export class CatalogBrowserPlugin extends KeepTrackPlugin implements ICommandPaletteCapable {
  readonly id = 'CatalogBrowserPlugin';
  dependencies_: string[] = [];

  private isLoading_ = false;
  private orbitalDataOnly_ = false;
  /** data-id of the catalog row that is currently loaded, or null when another tool swapped the catalog. */
  private currentCatalogId_: string | null = KEEPTRACK_CATALOGS.DEFAULT.id;

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
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.CatalogBrowserPlugin.help.overview' as T7eKey),
          image: {
            src: 'img/help/catalog-browser/catalog-browser-menu.png',
            alt: t7e('plugins.CatalogBrowserPlugin.help.imgAlt' as T7eKey),
            caption: t7e('plugins.CatalogBrowserPlugin.help.imgCaption' as T7eKey),
          },
        },
        {
          heading: t7e('plugins.CatalogBrowserPlugin.help.modesHeading' as T7eKey),
          content: t7e('plugins.CatalogBrowserPlugin.help.modes' as T7eKey),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.CatalogBrowserPlugin.help.howToUse' as T7eKey),
        },
      ],
      tips: [
        t7e('plugins.CatalogBrowserPlugin.help.tip1' as T7eKey),
        t7e('plugins.CatalogBrowserPlugin.help.tip2' as T7eKey),
        t7e('plugins.CatalogBrowserPlugin.help.tip3' as T7eKey),
      ],
    };
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = t7e('plugins.CatalogBrowserPlugin.commands.category' as T7eKey);
    const commands: ICommandPaletteCommand[] = [];

    if (!this.hideKeepTrackCatalogs_) {
      commands.push(
        {
          id: 'CatalogBrowserPlugin.load.default',
          label: t7e('plugins.CatalogBrowserPlugin.commands.loadCatalog' as T7eKey).replace('{name}', t7e('plugins.CatalogBrowserPlugin.entries.defaultCatalog' as T7eKey)),
          category,
          callback: () => this.loadKeepTrackCatalog_('DEFAULT'),
        },
        {
          id: 'CatalogBrowserPlugin.load.celestrak-only',
          label: t7e('plugins.CatalogBrowserPlugin.commands.loadCatalog' as T7eKey).replace('{name}', t7e('plugins.CatalogBrowserPlugin.entries.celestrakOnly' as T7eKey)),
          category,
          callback: () => this.loadKeepTrackCatalog_('CELESTRAK_ONLY'),
        },
        {
          id: 'CatalogBrowserPlugin.load.vimpel-only',
          label: t7e('plugins.CatalogBrowserPlugin.commands.loadCatalog' as T7eKey).replace('{name}', t7e('plugins.CatalogBrowserPlugin.entries.vimpelOnly' as T7eKey)),
          category,
          callback: () => this.loadKeepTrackCatalog_('VIMPEL_ONLY'),
        }
      );
    }

    for (const cat of CatalogBrowserData.categories) {
      for (const entry of cat.entries) {
        const label = t7e(`plugins.CatalogBrowserPlugin.entries.${entry.nameKey}` as T7eKey);

        commands.push({
          id: `CatalogBrowserPlugin.load.${entry.id}`,
          label: t7e('plugins.CatalogBrowserPlugin.commands.loadCatalog' as T7eKey).replace('{name}', label),
          category,
          callback: () => this.fetchAndLoadCatalog_(entry),
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

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));

    // Another tool (Catalog Management, Historic Catalog, scenarios) replaced the catalog:
    // no row describes what is loaded any more.
    EventBus.getInstance().on(EventBusEvent.catalogReloaded, () => {
      if (!this.isLoading_) {
        this.setCurrentCatalog_(null);
      }
    });
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
        const entry = CatalogBrowserPlugin.findEntry_(queryParam);

        if (entry) {
          this.fetchAndLoadCatalog_(entry);
        }
      }
    });

    this.renderCurrentCatalog_();
  }

  private static findEntry_(queryParam: string): CatalogEntry | null {
    for (const cat of CatalogBrowserData.categories) {
      const entry = cat.entries.find((e) => e.queryParam === queryParam);

      if (entry) {
        return entry;
      }
    }

    return null;
  }

  // =========================================================================
  // Core logic
  // =========================================================================

  private async loadKeepTrackCatalog_(mode: KeepTrackCatalogMode): Promise<void> {
    if (this.isLoading_) {
      return;
    }

    this.isLoading_ = true;
    showAsyncIndicator();
    const uiManager = ServiceLocator.getUiManager();
    const catalog = KEEPTRACK_CATALOGS[mode];
    const wasMenuOpen = this.isMenuButtonActive;
    let readyWait: { ready: Promise<void>; cancel: () => void } | null = null;

    try {
      this.cachedCatalog_ = null;
      // Vimpel Only needs its data before the swap starts; a failed fetch leaves the catalog alone.
      const vimpelData = mode === 'VIMPEL_ONLY' ? await CatalogBrowserPlugin.fetchVimpel_() : null;

      // Every KeepTrack catalog swap ends with catalogReloaded once the worker has positions for
      // the new catalog (CatalogLoader.load included), so all three report success only then.
      this.prepareForSwap_();
      readyWait = this.waitForCatalogReloaded_();

      if (vimpelData) {
        // Route through the JSC Vimpel pipeline (not raw-TLE reload) so altIds,
        // labels, and object types match the initial-boot processing.
        await CatalogLoader.reloadVimpelCatalog(vimpelData);
      } else if (mode === 'CELESTRAK_ONLY') {
        settingsManager.isEnableJscCatalog = false;
        try {
          await CatalogLoader.load();
        } finally {
          settingsManager.isEnableJscCatalog = true;
        }
      } else {
        await CatalogLoader.load();
      }
      await readyWait.ready;

      this.setCurrentCatalog_(catalog.id);
      uiManager.toast(t7e(`plugins.CatalogBrowserPlugin.toasts.${catalog.toastKey}` as T7eKey), ToastMsgType.normal);
    } catch (error) {
      readyWait?.cancel();
      // The localized toast below replaces the raw (English) error message.
      errorManagerInstance.error(error, 'CatalogBrowserPlugin', undefined, { skipToast: true });
      uiManager.toast(t7e(`plugins.CatalogBrowserPlugin.errorMsgs.${catalog.errorKey}` as T7eKey), ToastMsgType.critical);
    } finally {
      this.isLoading_ = false;
      hideAsyncIndicator();
      this.restoreMenu_(wasMenuOpen);
    }
  }

  private static async fetchVimpel_(): Promise<JsSat[]> {
    const resp = await apiFetch(settingsManager.dataSources.vimpel);

    if (!resp.ok) {
      throw new Error(`Vimpel fetch returned HTTP ${resp.status}`);
    }

    return (await resp.json()) as JsSat[];
  }

  private async fetchAndLoadCatalog_(entry: CatalogEntry): Promise<void> {
    if (this.isLoading_) {
      return;
    }

    this.isLoading_ = true;
    showAsyncIndicator();
    const uiManager = ServiceLocator.getUiManager();
    const wasMenuOpen = this.isMenuButtonActive;
    let readyWait: { ready: Promise<void>; cancel: () => void } | null = null;

    try {
      const url = this.buildCelesTrackUrl_(entry.queryParam);
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

      if (!CatalogLoader.isTleContent(tleContent)) {
        throw new CelesTrakNoDataError(tleContent);
      }

      if (this.orbitalDataOnly_) {
        this.ensureCatalogCached_();
        const merged = this.mergeWithCache_(tleContent);

        this.prepareForSwap_();
        readyWait = this.waitForCatalogReloaded_();
        await CatalogLoader.reloadCatalogFromData(merged);
      } else {
        this.cachedCatalog_ = null;
        this.prepareForSwap_();
        readyWait = this.waitForCatalogReloaded_();
        await CatalogLoader.reloadCatalog(tleContent);
      }

      // The swap resolves before the propagation worker has positions for the new
      // catalog; until then every object sits at 0,0,0 and cannot be selected.
      await readyWait.ready;

      this.setCurrentCatalog_(entry.id);
      const name = t7e(`plugins.CatalogBrowserPlugin.entries.${entry.nameKey}` as T7eKey);

      uiManager.toast(t7e('plugins.CatalogBrowserPlugin.toasts.loaded' as T7eKey).replace('{catalog}', name), ToastMsgType.normal);
    } catch (error) {
      readyWait?.cancel();
      const { messageKey, toastType, isTransient } = this.classifyFetchError_(error);

      if (!isTransient) {
        errorManagerInstance.error(error as Error, 'CatalogBrowserPlugin', undefined, { skipToast: true });
      }

      uiManager.toast(t7e(messageKey), toastType);
    } finally {
      this.isLoading_ = false;
      hideAsyncIndicator();
      this.restoreMenu_(wasMenuOpen);
    }
  }

  /**
   * Runs right before the catalog is replaced. Object ids are positions in the
   * catalog, so a selection or search result kept across the swap would point at
   * an unrelated object: clear the primary and secondary selection and the search.
   */
  private prepareForSwap_(): void {
    const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

    if (selectSatManager) {
      if (selectSatManager.secondarySat !== -1) {
        selectSatManager.setSecondarySat(-1, true);
      }
      selectSatManager.selectSat(-1);
    }

    this.clearSearch_();
  }

  /** Empties #search and its result rows without closing the side menus (closeSearch would). */
  private clearSearch_(): void {
    const searchManager = ServiceLocator.getUiManager().searchManager;
    const searchInput = getEl('search', true) as HTMLInputElement | null;

    if (searchInput) {
      searchInput.value = '';
    }

    try {
      searchManager?.doSearch('');
    } catch (error) {
      errorManagerInstance.log(error);
    }

    getEl('search-results', true)?.replaceChildren();
  }

  /**
   * Resolves on the next catalogReloaded (the propagation worker has positions
   * for the new catalog), or after a timeout so a stuck worker cannot wedge the menu.
   * Register before starting the swap; cancel() when the swap fails.
   */
  private waitForCatalogReloaded_(): { ready: Promise<void>; cancel: () => void } {
    const eventBus = EventBus.getInstance();
    let isDone = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let resolveReady: () => void = () => {
      // Replaced by the promise executor below.
    };
    const ready = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    const finish = (isInsideEmit: boolean): void => {
      if (isDone) {
        return;
      }
      isDone = true;
      if (timer) {
        clearTimeout(timer);
      }
      if (isInsideEmit) {
        // Unregister after the current emit loop so splicing does not skip the next listener.
        queueMicrotask(() => eventBus.unregister(EventBusEvent.catalogReloaded, onReloaded));
      } else {
        eventBus.unregister(EventBusEvent.catalogReloaded, onReloaded);
      }
      resolveReady();
    };
    const onReloaded = (): void => finish(true);

    eventBus.on(EventBusEvent.catalogReloaded, onReloaded);
    timer = setTimeout(() => finish(false), CATALOG_READY_TIMEOUT_MS);

    return { ready, cancel: () => finish(false) };
  }

  /** Deselecting during a swap can close side menus; reopen this one if it was open before. */
  private restoreMenu_(wasMenuOpen: boolean): void {
    if (wasMenuOpen && !this.isMenuButtonActive && this.bottomIconElementName) {
      EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, this.bottomIconElementName);
    }
  }

  private setCurrentCatalog_(catalogId: string | null): void {
    this.currentCatalogId_ = catalogId;
    this.renderCurrentCatalog_();
  }

  /** Marks the row of the loaded catalog (class, aria-current and a "Current" chip). */
  private renderCurrentCatalog_(): void {
    const listEl = getEl('cb-catalog-list', true);

    if (!listEl) {
      return;
    }

    for (const chip of Array.from(listEl.querySelectorAll('.cb-chip-current'))) {
      chip.remove();
    }

    for (const row of Array.from(listEl.querySelectorAll<HTMLElement>('.cb-catalog-item'))) {
      const isCurrent = this.currentCatalogId_ !== null && row.dataset.id === this.currentCatalogId_;

      row.classList.toggle('cb-catalog-item-current', isCurrent);

      if (isCurrent) {
        row.setAttribute('aria-current', 'true');
        const chip = document.createElement('span');

        chip.className = 'cb-chip cb-chip-current';
        chip.textContent = t7e('plugins.CatalogBrowserPlugin.labels.current' as T7eKey);
        row.querySelector('.kt-action-label')?.after(chip);
      } else {
        row.removeAttribute('aria-current');
      }
    }
  }

  private classifyFetchError_(error: unknown): { messageKey: T7eKey; toastType: ToastMsgType; isTransient: boolean } {
    const status = (error as { status?: number } | null)?.status;

    if (error instanceof CelesTrakNoDataError) {
      return {
        messageKey: 'plugins.CatalogBrowserPlugin.errorMsgs.NoData' as T7eKey,
        toastType: ToastMsgType.caution,
        isTransient: true,
      };
    }
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
      // beyond TLE alpha-5 capacity instead of throwing - skip those rather
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
    const baseUrl = queryParam.startsWith('FILE=') ? CELESTRAK_SUP_GP_URL : CELESTRAK_GP_URL;

    return `${baseUrl}?${queryParam}&FORMAT=3LE`;
  }

  // =========================================================================
  // Side menu HTML
  // =========================================================================

  private buildSideMenuHtml_(): string {
    return html`
      <div id="catalog-browser-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div class="side-menu">
          <section class="kt-section">
            <div class="kt-section-label">${t7e('plugins.CatalogBrowserPlugin.labels.loadMode' as T7eKey)}</div>
            <div class="switch cb-toggle-row">
              <label for="cb-orbital-data-only">
                <span class="cb-toggle-label">${t7e('plugins.CatalogBrowserPlugin.labels.allData' as T7eKey)}</span>
                <input id="cb-orbital-data-only" type="checkbox" />
                <span class="lever"></span>
                <span class="cb-toggle-label">${t7e('plugins.CatalogBrowserPlugin.labels.orbitalOnly' as T7eKey)}</span>
              </label>
            </div>
            <div id="cb-mode-description" class="kt-note">${t7e('plugins.CatalogBrowserPlugin.labels.allDataDesc' as T7eKey)}</div>
          </section>
          <div id="cb-catalog-list" class="cb-catalog-list">
            ${this.buildCatalogListHtml_()}
          </div>
        </div>
      </div>
    `;
  }

  private buildCatalogListHtml_(): string {
    const categories = CatalogBrowserData.categories;
    const catLabel = (key: string) => t7e(`plugins.CatalogBrowserPlugin.categories.${key}` as T7eKey);
    const entryLabel = (key: string) => t7e(`plugins.CatalogBrowserPlugin.entries.${key}` as T7eKey);

    let listHtml = '';

    // KeepTrack catalogs at the top (hidden when hideKeepTrackCatalogs is set)
    if (!this.hideKeepTrackCatalogs_) {
      listHtml += this.buildCategoryCard_(
        catLabel('keeptrack'),
        [
          this.buildCatalogRow_('DEFAULT', 'default', entryLabel('defaultCatalog')),
          this.buildCatalogRow_('CELESTRAK_ONLY', 'celestrak-only', entryLabel('celestrakOnly')),
          this.buildCatalogRow_('VIMPEL_ONLY', 'vimpel-only', entryLabel('vimpelOnly')),
        ].join('')
      );
    }

    for (const cat of categories) {
      const rows = cat.entries
        .map((entry) => {
          const isSupGp = entry.queryParam.startsWith('FILE=');
          const chipClass = isSupGp ? 'cb-chip cb-chip-supgp' : 'cb-chip cb-chip-gp';
          const chipText = isSupGp ? 'SupGP' : 'GP';
          const chip = `<span class="${chipClass}">${chipText}</span>`;

          return this.buildCatalogRow_(entry.queryParam, entry.id, entryLabel(entry.nameKey), chip);
        })
        .join('');

      listHtml += this.buildCategoryCard_(catLabel(cat.nameKey), rows);
    }

    return listHtml;
  }

  /** Wrap a set of catalog action rows in a titled v13 section card. */
  private buildCategoryCard_(title: string, rows: string): string {
    return html`
      <section class="kt-section">
        <div class="kt-section-label">${title}</div>
        ${rows}
      </section>
    `;
  }

  /** A single full-width v13 action row for one catalog (label + optional chip + chevron). */
  private buildCatalogRow_(query: string, id: string, label: string, chip = ''): string {
    return (
      '<button type="button" class="kt-action waves-effect cb-catalog-item" ' +
      `data-query="${query}" data-id="${id}">` +
      `<span class="kt-action-label">${label}</span>${chip}` +
      '</button>'
    );
  }
}
