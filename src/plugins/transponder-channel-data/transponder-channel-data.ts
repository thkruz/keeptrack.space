import { apiFetch } from '@app/app/data/api-fetch';
import { GroupType } from '@app/app/data/object-group';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { fileExcelPng, KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { saveCsv, saveXlsx } from '@app/engine/utils/saveVariable';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite } from '@ootk/src/main';
import transponderChannelDataPng from '@public/img/icons/sat-channel-freq.png';
import { SatConstellations } from '../sat-constellations/sat-constellations';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import {
  buildExportRows,
  ChannelColumnKey,
  ChannelInfo,
  CHANNEL_COLUMNS,
  dedupeChannels,
  filterChannels,
  SortDirection,
  sortChannels,
} from './transponder-channel-data-core';
import './transponder-channel-data.css';
import { TV_SATELLITE_SCC_NUMS } from './tv-satellites';

type StatusKind = 'loading' | 'empty' | 'noMatch' | 'error';

export class TransponderChannelData extends KeepTrackPlugin {
  readonly id = 'TransponderChannelData';
  dependencies_ = [];
  requiresInternet = true;
  downloadIconSrc = fileExcelPng;

  private readonly satsWithChannels_: readonly string[] = TV_SATELLITE_SCC_NUMS;

  isIconDisabled = true;

  // Initial side-menu width (wide enough for the 9-column table). This is the
  // lever the base wrapper uses for the rendered width; the drag handle then
  // resizes between the dragOptions min/max. Must NOT be set via a CSS
  // `!important` rule, which would freeze the drag (it beats the inline width
  // the drag handle writes).
  sideMenuSecondaryOptions = {
    width: 1030,
    leftOffset: null,
    zIndex: 3,
  };

  private lastLoadedSat_ = -1;
  /** Full deduped result set for the current satellite (pre-filter/sort). */
  private rawData_: ChannelInfo[] = [];
  /** The rows currently displayed (filtered + sorted) — what export emits. */
  private dataCache_: ChannelInfo[] = [];
  private filterQuery_ = '';
  private sortKey_: ChannelColumnKey | null = null;
  private sortDir_: SortDirection = 'asc';

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'menu-transponderChannelData',
      label: t7e('plugins.TransponderChannelData.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: transponderChannelDataPng,
      menuMode: [MenuMode.TOOLS, MenuMode.ALL],
      isDisabledOnLoad: true,
    };
  }

  onBottomIconClick(): void {
    const selectedSat = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

    if (
      !selectedSat ||
      selectedSat.id === -1 ||
      !selectedSat.isSatellite() ||
      !this.satsWithChannels_.includes((selectedSat as Satellite).sccNum)
    ) {
      errorManagerInstance.warn(t7e('plugins.TransponderChannelData.errorMsgs.NoChannelInfo' as Parameters<typeof t7e>[0]));

      return;
    }

    if (!this.isMenuButtonActive) {
      return;
    }

    this.loadChannelData_();
  }

  // Bridge for legacy event system (per CLAUDE.md)
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'TransponderChannelData-menu',
      title: t7e('plugins.TransponderChannelData.title' as Parameters<typeof t7e>[0]),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 600,
      maxWidth: 1200,
    };
  }

  private buildSideMenuHtml_(): string {
    const l = (key: string) => t7e(`plugins.TransponderChannelData.labels.${key}` as Parameters<typeof t7e>[0]);
    const attribution = t7e('plugins.TransponderChannelData.attribution' as Parameters<typeof t7e>[0]);

    return html`
      <section class="kt-section">
        <div class="kt-section-label">${l('controls')}</div>
        <div class="kt-field-row tcd-filter-row">
          <div class="input-field col s12">
            <input id="TransponderChannelData-filter" type="text" autocomplete="off" />
            <label for="TransponderChannelData-filter">${l('filterPlaceholder')}</label>
          </div>
        </div>
        <div class="tcd-export-row">
          <button id="TransponderChannelData-export-xlsx" class="kt-action waves-effect" type="button">
            <span class="kt-action-label">${l('exportXlsx')}</span>
          </button>
          <button id="TransponderChannelData-export-csv" class="kt-action waves-effect" type="button">
            <span class="kt-action-label">${l('exportCsv')}</span>
          </button>
        </div>
      </section>
      <section class="kt-section">
        <div class="kt-section-label">${l('channels')}</div>
        <div id="TransponderChannelData-status" class="tcd-status"></div>
        <div class="tcd-table-wrap">
          <table id="TransponderChannelData-table" class="tcd-table"></table>
        </div>
        <sub class="tcd-attribution">${attribution}</sub>
      </section>
    `;
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.TransponderChannelData.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.TransponderChannelData.help.overview'),
          image: {
            src: 'img/help/transponder-channel-data/transponder-channel-data-menu.png',
            alt: t7e('plugins.TransponderChannelData.help.imgAlt'),
            caption: t7e('plugins.TransponderChannelData.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.TransponderChannelData.help.columnsHeading'),
          content: t7e('plugins.TransponderChannelData.help.columns'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.TransponderChannelData.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.TransponderChannelData.help.tip1'),
        t7e('plugins.TransponderChannelData.help.tip2'),
      ],
      shortcuts: [{ keys: ['T'], description: t7e('plugins.TransponderChannelData.help.shortcutToggle') }],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'T',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  onDownload(): void {
    this.exportData_('xlsx');
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerInit,
      () => {
        // addConstellation now accepts (number | string)[] for SCC_NUM groups,
        // so we can pass the raw sccNum strings - alpha-5 / extended IDs in
        // the list would resolve correctly via sccNum2Id.
        PluginRegistry.getPlugin(SatConstellations)?.addConstellation(
          t7e('plugins.TransponderChannelData.constellationName'),
          GroupType.SCC_NUM,
          [...this.satsWithChannels_],
        );
      },
    );
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj: BaseObject) => {
        if (
          !obj ||
          obj.id === -1 ||
          !obj.isSatellite() ||
          !this.satsWithChannels_.includes((obj as Satellite).sccNum)
        ) {
          if (this.isMenuButtonActive) {
            this.closeSideMenu();
          }
          this.setBottomIconToDisabled();
        } else {
          this.setBottomIconToEnabled();

          if (this.isMenuButtonActive && this.lastLoadedSat_ !== obj.id) {
            this.loadChannelData_();
          }
        }
      },
    );
  }

  private uiManagerFinal_(): void {
    // The side-menu wrapper is generated by the base class, so opt the generated
    // root into the v13 card UI here (same approach as Close Objects).
    getEl('TransponderChannelData-menu', true)?.classList.add('kt-ui-v13');

    const filterInput = getEl('TransponderChannelData-filter', true) as HTMLInputElement | null;

    filterInput?.addEventListener('input', () => {
      this.filterQuery_ = filterInput.value;
      this.renderTable_();
    });

    getEl('TransponderChannelData-export-xlsx', true)?.addEventListener('click', () => this.exportData_('xlsx'));
    getEl('TransponderChannelData-export-csv', true)?.addEventListener('click', () => this.exportData_('csv'));

    // Delegated column-header sorting (the <th>s are rebuilt on every render).
    getEl('TransponderChannelData-table', true)?.addEventListener('click', (evt: MouseEvent) => {
      const th = (evt.target as HTMLElement).closest('th[data-sort-key]') as HTMLElement | null;
      const key = th?.dataset.sortKey as ChannelColumnKey | undefined;

      if (key) {
        this.toggleSort_(key);
      }
    });
  }

  // =========================================================================
  // Private methods
  // =========================================================================

  private toggleSort_(key: ChannelColumnKey): void {
    if (this.sortKey_ === key) {
      this.sortDir_ = this.sortDir_ === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey_ = key;
      this.sortDir_ = 'asc';
    }
    this.renderTable_();
  }

  private async loadChannelData_(): Promise<void> {
    const selectedObj = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

    if (!selectedObj?.isSatellite()) {
      errorManagerInstance.warn(t7e('plugins.TransponderChannelData.errorMsgs.NotSatellite' as Parameters<typeof t7e>[0]));

      return;
    }

    const selectedSat = selectedObj as Satellite;

    // Reset view state for the newly selected satellite.
    this.rawData_ = [];
    this.dataCache_ = [];
    this.filterQuery_ = '';
    this.sortKey_ = null;
    this.sortDir_ = 'asc';

    const filterInput = getEl('TransponderChannelData-filter', true) as HTMLInputElement | null;

    if (filterInput) {
      filterInput.value = '';
    }

    this.showStatus_('loading');

    const data = await this.fetchChannels_(selectedSat);

    if (data === null) {
      // Fetch failed for both name and altName.
      this.showStatus_('error');
      errorManagerInstance.warn(
        (t7e('plugins.TransponderChannelData.errorMsgs.FetchFailed' as Parameters<typeof t7e>[0]) as string)
          .replace('{name}', selectedSat.name)
          .replace('{altName}', selectedSat.altName),
      );

      // Leave lastLoadedSat_ unset so re-selecting the satellite retries.
      return;
    }

    this.rawData_ = dedupeChannels(data);
    this.lastLoadedSat_ = selectedSat.id;
    this.renderTable_();
  }

  /**
   * Fetches the channel list for a satellite, trying the primary name then the
   * alternate name. Returns the raw array, or `null` if every attempt failed.
   */
  private async fetchChannels_(sat: Satellite): Promise<ChannelInfo[] | null> {
    const primary = await this.fetchChannelsForName_(sat.name);

    if (primary !== null) {
      return primary;
    }

    if (sat.altName && sat.altName !== sat.name) {
      return this.fetchChannelsForName_(sat.altName);
    }

    return null;
  }

  private async fetchChannelsForName_(name: string): Promise<ChannelInfo[] | null> {
    try {
      const resp = await apiFetch(`https://api.keeptrack.space/v4/channels/${encodeURIComponent(name)}`);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      return await resp.json() as ChannelInfo[];
    } catch {
      return null;
    }
  }

  private renderTable_(): void {
    const filtered = filterChannels(this.rawData_, this.filterQuery_);
    const rows = this.sortKey_ ? sortChannels(filtered, this.sortKey_, this.sortDir_) : filtered;

    this.dataCache_ = rows;

    const tbl = getEl('TransponderChannelData-table', true) as HTMLTableElement | null;

    if (!tbl) {
      return;
    }

    tbl.innerHTML = '';

    if (this.rawData_.length === 0) {
      this.showStatus_('empty');

      return;
    }

    if (rows.length === 0) {
      this.showStatus_('noMatch');

      return;
    }

    this.hideStatus_();

    this.buildHeader_(tbl);

    rows.forEach((info) => {
      const row = tbl.insertRow();

      CHANNEL_COLUMNS.forEach((col) => {
        const cell = row.insertCell();

        cell.textContent = (info[col.key] ?? '').toString();
      });
    });
  }

  private buildHeader_(tbl: HTMLTableElement): void {
    const header = tbl.createTHead();
    const headerRow = header.insertRow();

    CHANNEL_COLUMNS.forEach((col) => {
      const th = document.createElement('th');

      th.textContent = t7e(`plugins.TransponderChannelData.table.${col.localeKey}` as Parameters<typeof t7e>[0]);
      th.dataset.sortKey = col.key;
      th.classList.add('tcd-sortable');

      if (this.sortKey_ === col.key) {
        th.classList.add(this.sortDir_ === 'asc' ? 'tcd-sort-asc' : 'tcd-sort-desc');
      }

      headerRow.appendChild(th);
    });
  }

  private showStatus_(kind: StatusKind): void {
    const statusEl = getEl('TransponderChannelData-status', true);
    const tbl = getEl('TransponderChannelData-table', true);

    if (!statusEl) {
      return;
    }

    const keyByKind: Record<StatusKind, string> = {
      loading: 'statusLoading',
      empty: 'statusEmpty',
      noMatch: 'statusNoMatch',
      error: 'statusError',
    };

    statusEl.textContent = t7e(`plugins.TransponderChannelData.labels.${keyByKind[kind]}` as Parameters<typeof t7e>[0]);
    statusEl.style.display = 'block';

    if (tbl) {
      tbl.innerHTML = '';
    }
  }

  private hideStatus_(): void {
    const statusEl = getEl('TransponderChannelData-status', true);

    if (statusEl) {
      statusEl.style.display = 'none';
    }
  }

  private exportData_(format: 'csv' | 'xlsx'): void {
    if (this.dataCache_.length === 0) {
      return;
    }

    const rows = buildExportRows(this.dataCache_);

    if (format === 'csv') {
      saveCsv(rows, 'channel-info');
    } else {
      saveXlsx(rows, 'channel-info').catch((e) =>
        errorManagerInstance.error(e, 'TransponderChannelData', 'Error saving xlsx!'),
      );
    }
  }
}
