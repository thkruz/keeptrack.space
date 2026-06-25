import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { getEl } from '@app/engine/utils/get-el';

import { SatMath, StringifiedNumber } from '@app/app/analysis/sat-math';
import { ProximityOpsThreadManager } from '@app/app/threads/proximity-ops-thread-manager';
import { drawPairLine, jumpToTca, RemovableLine } from '@app/engine/conjunction/conjunction-row-actions';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { IHelpConfig, IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import { CatalogSource, Satellite, Seconds } from '@ootk/src/main';
import rpo from '@public/img/icons/rpo.png';
import tableViewPng from '@public/img/icons/table-view.png';
import { ClickDragOptions, KeepTrackPlugin, SideMenuSettingsOptions } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '../settings-menu/settings-menu';
import {
  buildRpoCsvRow, DEFAULT_REFINE_TOLERANCE_MS, DEFAULT_STEP_SECONDS, findClosestApproach as findClosestApproachCore,
  findRpoPairs, ProximityOpsEvent, RPO_CSV_HEADERS, RpoSearchMode, RPOType, RpoSearchParams,
  runAllVsAllGeo, runAllVsAllLeo, satToData,
} from './proximity-ops-core';
import { DEFAULT_SORT_ASC, DEFAULT_SORT_KEY, RpoSortKey, sortEvents } from './proximity-ops-sort';
import { ProximityOpsTableLabels, renderProximityOpsTable } from './proximity-ops-table';
import './proximity-ops.css';

// Re-export so existing importers of the event shape keep working after the
// search math moved into the pure core module.
export type { ProximityOpsEvent } from './proximity-ops-core';

/** Persisted shape for the last-used search inputs (StorageKey.PROXIMITY_OPS_SETTINGS). */
interface ProximityOpsSettings {
  maxDis: string;
  maxVel: string;
  duration: string;
  type: RPOType;
  ava: boolean;
  payloadOnly: boolean;
  noVimpel: boolean;
}

export class ProximityOps extends KeepTrackPlugin {
  readonly id = 'ProximityOps';
  dependencies_ = [SelectSatManager.name];

  menuMode: MenuMode[] = [MenuMode.EVENTS, MenuMode.ALL];

  private readonly timeManagerInstance = ServiceLocator.getTimeManager()!;
  private readonly selectSatManagerInstance = PluginRegistry.getPlugin(SelectSatManager)!;
  private readonly catalogManagerInstance = ServiceLocator.getCatalogManager()!;

  private threadManager_: ProximityOpsThreadManager | null = null;
  /** True while an all-vs-all worker survey is running (the submit row acts as Cancel). */
  private isSearching_ = false;
  /** The most recent sat-to-sat line drawn on a results-row click (for replacement). */
  private approachLine_: RemovableLine | null = null;
  /** Active results-table sort column (defaults to chronological by date). */
  private sortKey_: RpoSortKey = DEFAULT_SORT_KEY;
  /** Active results-table sort direction. */
  private sortAsc_ = DEFAULT_SORT_ASC;

  // Wide enough for the two-line title plus the title-bar icons.
  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 420,
    maxWidth: 470,
  };

  dragOptionsSecondary: ClickDragOptions = {
    isDraggable: true,
    minWidth: 600,
    maxWidth: 1250,
  };

  RPOs: ProximityOpsEvent[] = [];
  bottomIconImg = rpo;
  bottomIconLabel = t7e('plugins.ProximityOps.bottomIconLabel');
  // The secondary menu is a results table, not settings, so use a table icon.
  secondaryMenuIcon = tableViewPng;

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.ProximityOps.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.ProximityOps.help.overview'),
          image: {
            src: 'img/help/proximity-ops/proximity-ops-menu.png',
            alt: t7e('plugins.ProximityOps.help.imgAlt'),
            caption: t7e('plugins.ProximityOps.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.ProximityOps.help.modesHeading'),
          content: t7e('plugins.ProximityOps.help.modes'),
        },
        {
          heading: t7e('plugins.ProximityOps.help.resultsHeading'),
          content: t7e('plugins.ProximityOps.help.results'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.ProximityOps.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.ProximityOps.help.tip1'),
        t7e('plugins.ProximityOps.help.tip2'),
        t7e('plugins.ProximityOps.help.tip3'),
      ],
      shortcuts: [{ keys: ['X'], description: t7e('plugins.ProximityOps.help.shortcutToggle') }],
    };
  }

  sideMenuElementName = 'proximityOps-menu';
  sideMenuElementHtml = html`
    <form id="proximityOps-menu-form" class="kt-menu-body">
      <section class="kt-section">
        <div class="kt-section-label">${t7e('plugins.ProximityOps.sections.target')}</div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <input value="0" id="proximity-ops-norad" type="text" maxlength="9" />
            <label for="proximity-ops-norad" class="active">${t7e('plugins.ProximityOps.noradId')}</label>
          </div>
        </div>
        <button id="proximity-ops-use-current" type="button" class="kt-action waves-effect">
          <span class="kt-action-label">${t7e('plugins.ProximityOps.useCurrentSat')}</span>
        </button>
      </section>

      <section class="kt-section">
        <div class="kt-section-label">${t7e('plugins.ProximityOps.sections.thresholds')}</div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <input placeholder="100" value="100" id="proximity-ops-maxDis" type="text" maxlength="5" />
            <label for="proximity-ops-maxDis" class="active">${t7e('plugins.ProximityOps.maxDistThreshold')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <input placeholder="0.1" value="0.1" id="proximity-ops-maxVel" type="text" maxlength="5" />
            <label for="proximity-ops-maxVel" class="active">${t7e('plugins.ProximityOps.maxRelativeVelocity')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <input placeholder="24" value="24" id="proximity-ops-duration" type="text" maxlength="5" />
            <label for="proximity-ops-duration" class="active">${t7e('plugins.ProximityOps.searchDuration')}</label>
          </div>
        </div>
      </section>

      <section class="kt-section">
        <div class="kt-section-label">${t7e('plugins.ProximityOps.sections.orbitRegime')}</div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <select id="proximity-ops-type" type="text">
              <option value="GEO" selected>${t7e('plugins.ProximityOps.geoText')}</option>
              <option value="LEO">${t7e('plugins.ProximityOps.leoText')}</option>
            </select>
            <label for="proximity-ops-type">${t7e('plugins.ProximityOps.orbitType')}</label>
          </div>
        </div>

        <div class="input-field col s12">
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="${t7e('plugins.ProximityOps.geoAllVsAllTooltip')}">
              <input id="proximity-ops-ava" type="checkbox"/>
              <span class="lever"></span>
              ${t7e('plugins.ProximityOps.geoAllVsAll')}
            </label>
          </div>
        </div>

        <div class="input-field col s12">
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="${t7e('plugins.ProximityOps.comparePayloadsOnlyTooltip')}">
              <input id="proximity-ops-payload-only" type="checkbox"/>
              <span class="lever"></span>
              ${t7e('plugins.ProximityOps.comparePayloadsOnly')}
            </label>
          </div>
        </div>

        <div class="input-field col s12">
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="${t7e('plugins.ProximityOps.ignoreVimpelRsoTooltip')}">
              <input id="proximity-ops-no-vimpel" type="checkbox"/>
              <span class="lever"></span>
              ${t7e('plugins.ProximityOps.ignoreVimpelRso')}
            </label>
          </div>
        </div>
      </section>

      <button id="proximity-ops-submit" class="kt-action waves-effect waves-light" type="submit" name="action">
        <span class="kt-action-label">${t7e('plugins.ProximityOps.submitButton')}</span>
      </button>

      <div id="proximity-ops-progress-section" class="proximity-ops-progress-section" style="display:none;">
        <div class="proximity-ops-progress-track">
          <div id="proximity-ops-progress-bar" class="proximity-ops-progress-bar" style="width:0%;"></div>
        </div>
        <div id="proximity-ops-progress-label" class="proximity-ops-progress-label">0%</div>
      </div>
    </form>
    `;

  sideMenuSecondaryHtml: string = html`
    <div class="proximity-ops-secondary">
      <section class="kt-section">
        <div class="kt-section-label">${t7e('plugins.ProximityOps.titleSecondary')}</div>
        <div id="proximity-ops-count" class="proximity-ops-count"></div>
        <div class="proximity-ops-table-container">
          <table id="proximity-ops-table" class="striped-light"></table>
        </div>
      </section>
    </div>`;
  sideMenuSecondaryOptions: SideMenuSettingsOptions = {
    width: 1200,
    leftOffset: null,
    zIndex: 3,
  };

  addJs(): void {
    super.addJs();

    this.threadManager_ = new ProximityOpsThreadManager([]);
    this.threadManager_.init();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  private uiManagerFinal_(): void {
    getEl('proximityOps-menu')?.classList.add('kt-ui-v13');
    getEl('proximityOps-menu-secondary')?.classList.add('kt-ui-v13');

    const menuRoot = getEl('proximityOps-menu');

    initMaterialSelects(menuRoot ?? document.body);

    this.restoreInputs_();

    // Set the primary from the currently-selected satellite on demand (the search
    // otherwise just reads the typed NORAD ID - no live selection required).
    getEl('proximity-ops-use-current')?.addEventListener('click', () => this.useCurrentSatellite_());

    // Keep the orbit type and "all vs all" toggle mutually consistent: all-vs-all
    // is GEO/LEO specific, and checking it locks the regime to a single survey.
    getEl('proximity-ops-type')!.addEventListener('change', () => {
      const orbitTypeInput = <HTMLSelectElement>getEl('proximity-ops-type');
      const rpoAvailabilityInput = <HTMLInputElement>getEl('proximity-ops-ava');

      if (rpoAvailabilityInput.checked && orbitTypeInput.value !== RPOType.GEO) {
        rpoAvailabilityInput.checked = false;
        rpoAvailabilityInput.dispatchEvent(new Event('change'));
      }
    });

    getEl('proximity-ops-ava')!.addEventListener('change', () => {
      const isAllVsAllChecked = (<HTMLInputElement>getEl('proximity-ops-ava')).checked;
      const orbitTypeInput = <HTMLSelectElement>getEl('proximity-ops-type');

      if (isAllVsAllChecked) {
        orbitTypeInput.value = RPOType.GEO;
        orbitTypeInput.setAttribute('disabled', 'true');
      } else {
        orbitTypeInput.removeAttribute('disabled');
      }

      orbitTypeInput.dispatchEvent(new Event('change'));
    });

    // Delegated click handler on the results table: a header cell sorts, a body
    // row jumps to the encounter (the table is rebuilt each search / sort).
    getEl('proximity-ops-table')?.addEventListener('click', (e: MouseEvent) => {
      const th = (<HTMLElement>e.target).closest('th[data-sort-key]');

      if (th) {
        this.onSortHeaderClicked_((<HTMLElement>th).dataset.sortKey as RpoSortKey);

        return;
      }

      const tr = (<HTMLElement>e.target).closest('tr[data-row]');

      if (!tr) {
        return;
      }

      const row = parseInt((<HTMLElement>tr).dataset.row ?? '', 10);

      if (Number.isNaN(row)) {
        return;
      }

      const event = this.RPOs[row];

      if (event) {
        this.onEventClicked_(event);
      }
    });
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'X',
        callback: () => {
          this.bottomMenuClicked();
        },
      },
    ];
  }

  bottomIconCallback = (): void => {
    if (this.RPOs.length > 0 && !this.isSideMenuSettingsOpen) {
      this.openSecondaryMenu();
    }
  };

  downloadIconCb = () => {

    if (this.RPOs.length === 0) {
      ServiceLocator.getUiManager().toast(t7e('plugins.ProximityOps.noRposToDownload'), ToastMsgType.caution, true);

      return;
    }

    const csvData = this.convertRPOsToCSV_(this.RPOs);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);

    let name: string;

    if ((<HTMLInputElement>getEl('proximity-ops-ava')).checked) {
      name = `All-vs-All-${(<HTMLInputElement>getEl('proximity-ops-type')).value}`;
    } else {
      name = (<HTMLInputElement>getEl('proximity-ops-norad')).value;
    }

    // Set the download attribute with a dynamically generated filename
    link.download = `${new Date().toISOString().slice(0, 19)}-RPOs-${name}.csv`;

    // Simulate a click on the link to trigger the download
    link.click();
  };

  private convertRPOsToCSV_(rpoArray: ProximityOpsEvent[]) {
    const csvRows: string[] = [RPO_CSV_HEADERS.join(',')];

    rpoArray.forEach((rpo) => {
      csvRows.push(buildRpoCsvRow(rpo).map((v) => `"${v}"`).join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Form submit handler (auto-wired by the base plugin). While a search is
   * running the submit row acts as a Cancel button; otherwise it gathers the
   * candidates and runs the search off-thread on the worker (the submit row
   * shows progress + Cancel, so there is no blocking modal). When no worker is
   * available - Node tests, or a browser without worker support - it falls back
   * to a synchronous run.
   */
  onFormSubmit(): void {
    if (this.isSearching_) {
      this.cancelSearch_();

      return;
    }

    this.persistInputs_();

    const request = this.gatherSearch_();

    if (!request) {
      // gatherSearch_ already toasted (e.g. the primary satellite was not found).
      return;
    }

    if (this.canUseWorker_()) {
      this.runWorkerSearch_(request);

      return;
    }

    this.finalizeResults_(this.runSearch_(request));
  }

  private canUseWorker_(): boolean {
    return !isThisNode() && !!this.threadManager_ && this.threadManager_.isReady;
  }

  /** Build the (plain-number, clone-safe) search parameters from the current form. */
  private buildParams_(): RpoSearchParams {
    return {
      maxDis: parseFloat(<StringifiedNumber>(<HTMLInputElement>getEl('proximity-ops-maxDis')).value) || 0,
      maxVel: parseFloat(<StringifiedNumber>(<HTMLInputElement>getEl('proximity-ops-maxVel')).value) || 0,
      durationSec: (parseFloat(<StringifiedNumber>(<HTMLInputElement>getEl('proximity-ops-duration')).value) || 0) * 60 ** 2,
      baseTimeMs: this.timeManagerInstance.getOffsetTimeObj(0).getTime(),
      stepSeconds: DEFAULT_STEP_SECONDS,
      refineToleranceMs: DEFAULT_REFINE_TOLERANCE_MS,
      confidenceLevel: settingsManager.covarianceConfidenceLevel,
    };
  }

  /**
   * Resolve the current form into a runnable search request: the mode, the
   * candidate satellites (real catalog objects), and the parameters. Returns
   * null (after toasting) when a single-satellite search names a primary that is
   * not in the catalog. The same request feeds both the worker and the
   * synchronous fallback, so the two paths can never diverge.
   */
  private gatherSearch_(): { mode: RpoSearchMode; sats: Satellite[]; params: RpoSearchParams } | null {
    const isAva = (<HTMLInputElement>getEl('proximity-ops-ava')).checked;
    const type = (<HTMLInputElement>getEl('proximity-ops-type')).value as RPOType;
    const params = this.buildParams_();

    if (isAva) {
      return {
        mode: type === RPOType.LEO ? 'ava-leo' : 'ava-geo',
        sats: this.getFilteredSatellites(),
        params,
      };
    }

    const primarySatSccNum = (<HTMLInputElement>getEl('proximity-ops-norad')).value;
    const satelliteId = this.catalogManagerInstance.sccNum2Id(primarySatSccNum);

    if (!satelliteId) {
      ServiceLocator.getUiManager().toast(
        t7e('plugins.ProximityOps.satNotFound').replace('{sccNum}', primarySatSccNum),
        ToastMsgType.caution, true,
      );

      return null;
    }

    return {
      mode: 'single',
      sats: this.findSatsById_(satelliteId, type, params.durationSec as Seconds),
      params,
    };
  }

  /** Synchronous search over real catalog satellites (no-worker fallback + unit tests). */
  private runSearch_(request: { mode: RpoSearchMode; sats: Satellite[]; params: RpoSearchParams }): ProximityOpsEvent[] {
    const { mode, sats, params } = request;

    switch (mode) {
      case 'ava-geo':
        return runAllVsAllGeo(sats, params);
      case 'ava-leo':
        return runAllVsAllLeo(sats, params);
      default:
        return findRpoPairs(sats, params, new Date(params.baseTimeMs), false);
    }
  }

  /**
   * Run the gathered search off-thread. The submit row becomes Cancel + a
   * progress percentage, so the main thread never blocks and there is no modal.
   */
  private runWorkerSearch_(request: { mode: RpoSearchMode; sats: Satellite[]; params: RpoSearchParams }): void {
    this.setSearchingState_(true);

    this.threadManager_!.startSurvey(
      { mode: request.mode, sats: request.sats.map(satToData), params: request.params },
      {
        onProgress: (done, total) => this.updateProgress_(done, total),
        onComplete: (events) => {
          this.setSearchingState_(false);
          this.finalizeResults_(events);
        },
        onError: (message) => {
          this.setSearchingState_(false);
          errorManagerInstance.warn(t7e('plugins.ProximityOps.surveyError').replace('{error}', message));
        },
      },
    );
  }

  /** Cancel an in-progress worker search and reset the submit row. */
  private cancelSearch_(): void {
    this.threadManager_?.cancelSurvey();
    this.setSearchingState_(false);
  }

  /** Sort, render, count, and reveal the results (shared by the sync and worker paths). */
  private finalizeResults_(events: ProximityOpsEvent[]): void {
    this.RPOs = events;
    // Each new search starts from the default (chronological) sort.
    this.sortKey_ = DEFAULT_SORT_KEY;
    this.sortAsc_ = DEFAULT_SORT_ASC;
    this.applySortAndRender_();
    this.updateCount_(this.RPOs.length);

    if (this.RPOs.length === 0) {
      ServiceLocator.getUiManager().toast(t7e('plugins.ProximityOps.noRposFound'), ToastMsgType.caution, true);
    }

    // Keep the results panel open on completion so the count / empty-state shows.
    if (!this.isSideMenuSettingsOpen) {
      this.openSecondaryMenu();
    }
  }

  /**
   * Re-order `this.RPOs` by the active sort column and re-render. The rendered
   * order is kept identical to `this.RPOs` so the delegated row-click handler
   * (keyed on `data-row`) and the CSV export stay aligned with the table.
   */
  private applySortAndRender_(): void {
    this.RPOs = sortEvents(this.RPOs, this.sortKey_, this.sortAsc_);
    this.populateTable_(this.RPOs);
  }

  /** Handle a results-table header click: toggle direction on the active column, else sort the new one ascending. */
  private onSortHeaderClicked_(key: RpoSortKey): void {
    if (this.sortKey_ === key) {
      this.sortAsc_ = !this.sortAsc_;
    } else {
      this.sortKey_ = key;
      this.sortAsc_ = true;
    }

    this.applySortAndRender_();
  }

  private setActionLabel_(text: string): void {
    const label = getEl('proximity-ops-submit', true)?.querySelector('.kt-action-label');

    if (label) {
      label.textContent = text;
    }
  }

  private setSearchingState_(searching: boolean): void {
    this.isSearching_ = searching;

    const section = getEl('proximity-ops-progress-section', true);

    if (section) {
      section.style.display = searching ? 'flex' : 'none';
    }
    if (!searching) {
      this.updateProgressBar_(0);
    }

    getEl('proximity-ops-submit', true)?.classList.toggle('proximity-ops-cancel', searching);
    this.setActionLabel_(searching ? t7e('plugins.ProximityOps.cancelButton') : t7e('plugins.ProximityOps.submitButton'));
  }

  private updateProgress_(done: number, total: number): void {
    this.updateProgressBar_(total > 0 ? Math.round((done / total) * 100) : 0);
  }

  /** Move the visible progress bar (track fill + percentage label) to `pct`. */
  private updateProgressBar_(pct: number): void {
    const bar = getEl('proximity-ops-progress-bar', true);
    const label = getEl('proximity-ops-progress-label', true);

    if (bar) {
      bar.style.width = `${pct}%`;
    }
    if (label) {
      label.textContent = `${pct}%`;
    }
  }

  private updateCount_(count: number): void {
    const el = getEl('proximity-ops-count', true);

    if (!el) {
      return;
    }

    if (count === 0) {
      el.textContent = t7e('plugins.ProximityOps.noRposFound');

      return;
    }

    // Closest is the minimum miss distance regardless of the active sort column.
    const closest = this.RPOs.reduce((min, rpo) => Math.min(min, rpo.dist), Infinity);

    el.textContent = t7e('plugins.ProximityOps.resultCount')
      .replace('{count}', count.toString())
      .replace('{closest}', closest.toFixed(2));
  }

  /** Persist the current search inputs so they are restored next session. */
  private persistInputs_(): void {
    const settings: ProximityOpsSettings = {
      maxDis: (<HTMLInputElement>getEl('proximity-ops-maxDis')).value,
      maxVel: (<HTMLInputElement>getEl('proximity-ops-maxVel')).value,
      duration: (<HTMLInputElement>getEl('proximity-ops-duration')).value,
      type: (<HTMLInputElement>getEl('proximity-ops-type')).value as RPOType,
      ava: (<HTMLInputElement>getEl('proximity-ops-ava')).checked,
      payloadOnly: (<HTMLInputElement>getEl('proximity-ops-payload-only')).checked,
      noVimpel: (<HTMLInputElement>getEl('proximity-ops-no-vimpel')).checked,
    };

    PersistenceManager.getInstance().saveItem(StorageKey.PROXIMITY_OPS_SETTINGS, JSON.stringify(settings));
  }

  /** Restore the last-used search inputs (thresholds, orbit type, toggles). */
  private restoreInputs_(): void {
    const raw = PersistenceManager.getInstance().getItem(StorageKey.PROXIMITY_OPS_SETTINGS);

    if (!raw) {
      return;
    }

    let settings: Partial<ProximityOpsSettings>;

    try {
      settings = JSON.parse(raw) as Partial<ProximityOpsSettings>;
    } catch {
      return;
    }

    const setValue = (id: string, value: string | undefined) => {
      const el = getEl(id, true) as HTMLInputElement | null;

      if (el && typeof value === 'string') {
        el.value = value;
      }
    };
    const setChecked = (id: string, value: boolean | undefined) => {
      if (typeof value === 'boolean') {
        const el = getEl(id, true) as HTMLInputElement | null;

        if (el) {
          el.checked = value;
        }
      }
    };

    setValue('proximity-ops-maxDis', settings.maxDis);
    setValue('proximity-ops-maxVel', settings.maxVel);
    setValue('proximity-ops-duration', settings.duration);
    if (settings.type === RPOType.GEO || settings.type === RPOType.LEO) {
      setValue('proximity-ops-type', settings.type);
    }
    setChecked('proximity-ops-payload-only', settings.payloadOnly);
    setChecked('proximity-ops-no-vimpel', settings.noVimpel);
    setChecked('proximity-ops-ava', settings.ava);

    // Re-sync the regime lock and the styled <select> with the restored values.
    getEl('proximity-ops-ava', true)?.dispatchEvent(new Event('change'));
  }

  /**
   * Step 3 of the RPO search process (single-satellite mode).
   *
   * Finds the satellites related to a primary satellite based on the orbit type
   * and duration, with the primary as the first element. GEO filters on longitude
   * proximity and orbital period; LEO filters on inclination and RAAN proximity.
   * Stays on the main thread because it uses `SatMath.normalizeRaan` and the live
   * catalog.
   */
  private findSatsById_(primarySatID: number, type: string, duration: Seconds): Satellite[] {
    const allSats = this.getFilteredSatellites();
    const primarySat = ServiceLocator.getCatalogManager().getSat(primarySatID)!;

    let sats: Satellite[] = [];

    if (type === RPOType.GEO) {
      const lla = primarySat.lla();

      if (!lla) {
        errorManagerInstance.error(new Error('No LLA for primary satellite!'), 'ProximityOps');

        return [];
      }

      sats = allSats
        .filter((sat) => {
          const lla2 = sat.lla();

          if (!lla2) {
            return false;
          }

          return sat.tle1 &&
            sat.period > 23 * 60 &&
            /*
             * assuming max drift rate to be 3deg longitude/day then take large enough lon. window to capture
             * all possible "fly-by" RPOs depends on length of search
             */
            (180 - Math.abs(Math.abs(lla.lon - lla2.lon) - 180)) < 3 * duration / (24 * 60 ** 2) &&
            sat.id !== primarySatID;
        });
    } else if (type === RPOType.LEO) {
      const nowDate = ServiceLocator.getTimeManager().getOffsetTimeObj(0);

      const raan1 = SatMath.normalizeRaan(primarySat, nowDate);

      sats = allSats
        .filter((sat) => {
          const raan2 = SatMath.normalizeRaan(sat, nowDate);

          return sat.tle1 &&
            (180 - Math.abs(Math.abs(primarySat.inclination - sat.inclination) - 180)) < 5 &&
            (360 - Math.abs(Math.abs(raan1 - raan2) - 360)) < 5 &&
            sat.id !== primarySatID;
        });
    } else {
      errorManagerInstance.error(new Error('Unknown orbit type!'), 'ProximityOps');
    }

    sats.unshift(primarySat);

    return sats;
  }

  /** Thin wrapper around the pure core closest-approach search (kept as a stable public entry point). */
  findClosestApproach(sat1: Satellite, sat2: Satellite, start: Date, duration: Seconds): ProximityOpsEvent {
    return findClosestApproachCore(sat1, sat2, start, duration);
  }

  /**
   * Retrieves a filtered list of satellites based on the "Payload Only" and
   * "No Vimpel" toggles, in a single pass when either is active.
   */
  private getFilteredSatellites(): Satellite[] {
    let allSats = ServiceLocator.getCatalogManager().getSats();
    const isPayloadOnlyChecked = (<HTMLInputElement>getEl('proximity-ops-payload-only')).checked;
    const isVimpelChecked = (<HTMLInputElement>getEl('proximity-ops-no-vimpel')).checked;

    if (isPayloadOnlyChecked || isVimpelChecked) {
      allSats = allSats.filter((sat) => {
        if (isPayloadOnlyChecked && !sat.isPayload()) {
          return false;
        }
        if (isVimpelChecked && sat.source === CatalogSource.VIMPEL) {
          return false;
        }

        return true;
      });
    }

    return allSats;
  }

  /** Render the results into the secondary-menu table (clears any prior rows). */
  private populateTable_(events: ProximityOpsEvent[]): void {
    const tbl = <HTMLTableElement>getEl('proximity-ops-table', true);

    if (!tbl) {
      return;
    }

    renderProximityOpsTable(tbl, events, 'proximity-ops-event', this.tableLabels_(), { key: this.sortKey_, asc: this.sortAsc_ });
  }

  private tableLabels_(): ProximityOpsTableLabels {
    const l = (key: string) => t7e(`plugins.ProximityOps.table.${key}` as Parameters<typeof t7e>[0]);

    return {
      target: l('target'),
      targetName: l('targetName'),
      chaser: l('chaser'),
      chaserName: l('chaserName'),
      relDistance: l('relDistance'),
      radial: l('radial'),
      intrack: l('intrack'),
      crosstrack: l('crosstrack'),
      relVelocity: l('relVelocity'),
      pc: l('pc'),
      date: l('date'),
    };
  }

  /**
   * Handles a results-row click: jumps the clock to the encounter (preserving
   * playback state), selects both satellites, switches GEO orbits to ECF so the
   * relative motion reads clearly, and draws the sat-to-sat line. Pc is already
   * computed for every row during the search, so nothing is filled here. The
   * secondary menu is left open per the convention.
   */
  private onEventClicked_(event: ProximityOpsEvent): void {
    jumpToTca(new Date(event.date).getTime());

    // Set the secondary first so that the primary shows secondary info in the sat-info-box
    this.selectSatManagerInstance.setSecondarySat(event.sat2Id);
    this.selectSatManagerInstance.selectSat(event.sat1Id);

    const uiManagerInstance = ServiceLocator.getUiManager();

    if (!settingsManager.isOrbitCruncherInEcf && (this.selectSatManagerInstance.primarySatObj as Satellite).perigee > 6000) {
      uiManagerInstance.toast(t7e('plugins.ProximityOps.geoOrbitsEcf'), ToastMsgType.normal);
      settingsManager.isOrbitCruncherInEcf = true;
    } else if (settingsManager.isOrbitCruncherInEcf) {
      uiManagerInstance.toast(t7e('plugins.ProximityOps.geoOrbitsEci'), ToastMsgType.standby);
      settingsManager.isOrbitCruncherInEcf = false;
    }
    SettingsMenuPlugin.syncOnLoad();

    uiManagerInstance.doSearch(`${event.sat1SccNum},${event.sat2SccNum}`);

    // Best-effort enhancement - never let it break the time jump / selection.
    this.drawApproachLine_(event);
  }

  /** Draw (replacing any prior) the line between the target and chaser at the encounter. */
  private drawApproachLine_(event: ProximityOpsEvent): void {
    try {
      const catalog = this.catalogManagerInstance;

      this.approachLine_ = drawPairLine(this.approachLine_, catalog.getSat(event.sat1Id), catalog.getSat(event.sat2Id));
    } catch {
      // Line rendering is a non-critical enhancement.
    }
  }

  /**
   * "Use Current Satellite" handler: copies the currently-selected satellite into
   * the NORAD field (and its orbit preset), or toasts if nothing is selected.
   * Keeps the primary explicit so the search never requires a live selection.
   */
  private useCurrentSatellite_(): void {
    const satellite = this.selectSatManagerInstance.getSelectedSat() as Satellite;

    if (!satellite?.isSatellite()) {
      ServiceLocator.getUiManager().toast(t7e('plugins.ProximityOps.noSatSelected'), ToastMsgType.caution, true);

      return;
    }

    this.updateNoradId_();
  }

  /**
   * Updates the NORAD ID and related fields based on the currently selected
   * satellite: picks the LEO or GEO preset (orbit type + max distance), then
   * fills the NORAD ID, or a "not supported" note for VIMPEL objects.
   */
  private updateNoradId_() {
    const satellite = PluginRegistry.getPlugin(SelectSatManager)!.getSelectedSat() as Satellite;

    if (!satellite?.isSatellite()) {
      return;
    }

    // If satellites is not in GEO belt then treat it like LEO
    if ((satellite.period < 23 * 60 || satellite.period > 25 * 60) && satellite.inclination > 10) {
      (<HTMLInputElement>getEl('proximity-ops-type')).value = RPOType.LEO;
      (<HTMLInputElement>getEl('proximity-ops-maxDis')).value = '5000';
    } else {
      (<HTMLInputElement>getEl('proximity-ops-type')).value = RPOType.GEO;
      (<HTMLInputElement>getEl('proximity-ops-maxDis')).value = '100';
    }
    (<HTMLInputElement>getEl('proximity-ops-type')).dispatchEvent(new Event('change'));

    // Handle Vimpel satellites
    if (satellite.source === CatalogSource.VIMPEL) {
      (<HTMLInputElement>getEl('proximity-ops-norad')).value = t7e('plugins.ProximityOps.vimpelNotSupported');

      return;
    }

    // Handle other satellites
    (<HTMLInputElement>getEl('proximity-ops-norad')).value = satellite.sccNum;
  }
}
