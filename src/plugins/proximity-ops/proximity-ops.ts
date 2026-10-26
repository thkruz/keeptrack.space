import { SatMath } from '@app/app/analysis/sat-math';
import { ProximityOpsThreadManager } from '@app/app/threads/proximity-ops-thread-manager';
import { drawPairLine, jumpToTca, RemovableLine } from '@app/engine/conjunction/conjunction-row-actions';
import { uncertaintyParentOf } from '@app/engine/conjunction/uncertainty-source';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
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
import { getEl } from '@app/engine/utils/get-el';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { createCsvBlob } from '@app/engine/utils/saveVariable';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import { CatalogSource, Satellite, Seconds } from '@ootk/src/main';
import rpo from '@public/img/icons/rpo.png';
import tableViewPng from '@public/img/icons/table-view.png';
import { ClickDragOptions, KeepTrackPlugin, SideMenuSettingsOptions } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '../settings-menu/settings-menu';
import {
  buildRpoCsvRow,
  CovarianceTleLines,
  DEFAULT_REFINE_TOLERANCE_MS,
  DEFAULT_STEP_SECONDS,
  findClosestApproach as findClosestApproachCore,
  findRpoPairs,
  ProximityOpsEvent,
  partitionCoLocated,
  RPO_CSV_HEADERS,
  RPOType,
  RpoSearchMode,
  RpoSearchParams,
  runAllVsAllGeo,
  runAllVsAllLeo,
  satToData,
} from './proximity-ops-core';
import { DEFAULT_SORT_ASC, DEFAULT_SORT_KEY, RpoSortKey, sortEvents } from './proximity-ops-sort';
import { ProximityOpsTableLabels, renderProximityOpsTable } from './proximity-ops-table';
import './proximity-ops.css';

// Re-export so existing importers of the event shape keep working after the
// search math moved into the pure core module.
export type { ProximityOpsEvent } from './proximity-ops-core';

/**
 * LEO single-satellite pre-filter: candidates must be within this many degrees
 * of the target's inclination AND RAAN. The form note, help text, and empty
 * state all print this value, so the copy cannot drift from the filter.
 */
export const LEO_PLANE_TOLERANCE_DEG = 5;

/**
 * A single-satellite worker search is sent as a series of small runs of this many candidates. The main thread
 * checks the cancel flag between runs, so Cancel stops the search after the current run instead of leaving the
 * worker busy with the whole candidate list (the worker screens one run without yielding).
 */
export const SINGLE_SEARCH_CHUNK_SIZE = 10;

/** Max distance (km) the Use Current Satellite presets fill in, for both regimes. */
export const PRESET_MAX_DISTANCE_KM = 100;

/** The numeric threshold fields: input id and the locale key of the label the rejection toast names. */
const THRESHOLD_FIELDS = [
  { id: 'proximity-ops-maxDis', labelKey: 'plugins.ProximityOps.maxDistThreshold' },
  { id: 'proximity-ops-maxVel', labelKey: 'plugins.ProximityOps.maxRelativeVelocity' },
  { id: 'proximity-ops-duration', labelKey: 'plugins.ProximityOps.searchDuration' },
] as const;

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
  /** Co-orbital candidates screened by the last single-satellite search; null for all-vs-all. */
  private lastCandidateCount_: number | null = null;
  /** True once a search has finished and its results (possibly none) are on screen. */
  private hasCompletedSearch_ = false;
  /** Bumped by every new search and every cancel; a chunked single search stops when its token is stale. */
  private searchToken_ = 0;
  /** Co-located pairs (never more than 1 km apart) dropped from the last results. */
  private hiddenCoLocatedCount_ = 0;
  /** The most recent sat-to-sat line drawn on a results-row click (for replacement). */
  private approachLine_: RemovableLine | null = null;
  /** Active results-table sort column (defaults to chronological by date). */
  private sortKey_: RpoSortKey = DEFAULT_SORT_KEY;
  /** Active results-table sort direction. */
  private sortAsc_ = DEFAULT_SORT_ASC;
  /** Root parents of the analyst clones in the last search, by catalog id: their Pc uses the parent's covariance. */
  private uncertaintyParents_ = new Map<number, Satellite>();

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
          content: t7e('plugins.ProximityOps.help.overview').replace('{deg}', LEO_PLANE_TOLERANCE_DEG.toString()),
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
      tips: [t7e('plugins.ProximityOps.help.tip1'), t7e('plugins.ProximityOps.help.tip2'), t7e('plugins.ProximityOps.help.tip3')],
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
            <input value="" id="proximity-ops-norad" type="text" maxlength="9" />
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
        <div id="proximity-ops-scope-note" class="kt-note proximity-ops-scope-note">${t7e('plugins.ProximityOps.scopeNote').replace('{deg}', LEO_PLANE_TOLERANCE_DEG.toString())}</div>
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
        <div id="proximity-ops-hidden-note" class="kt-note proximity-ops-hidden-note" style="display: none;"></div>
        <div id="proximity-ops-uncertainty-note" class="kt-note" style="display: none;"></div>
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

    // The header button opens the results list, so name it for that (the base plugin labels it "Settings").
    const resultsBtn = getEl('proximityOps-menu-secondary-btn', true);
    const resultsLabel = t7e('plugins.ProximityOps.resultsButton');

    resultsBtn?.querySelector('img')?.setAttribute('alt', resultsLabel);
    resultsBtn?.setAttribute('aria-label', resultsLabel);

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

  /**
   * Runs after the base plugin toggled the menu. Opening it re-shows the last results; closing it (drawer item,
   * Shift+X) must close the results panel too, the same as the header Close button.
   */
  bottomIconCallback = (): void => {
    if (!this.isMenuButtonActive) {
      if (this.isSideMenuSettingsOpen) {
        this.closeSecondaryMenu();
      }

      return;
    }

    if (this.RPOs.length > 0 && !this.isSideMenuSettingsOpen) {
      this.openSecondaryMenu();
    }
  };

  downloadIconCb = () => {
    if (this.RPOs.length === 0) {
      const key = this.hasCompletedSearch_ ? 'plugins.ProximityOps.noRposToDownload' : 'plugins.ProximityOps.runSearchFirst';

      ServiceLocator.getUiManager().toast(t7e(key), ToastMsgType.caution, true);

      return;
    }

    const csvData = this.convertRPOsToCSV_(this.RPOs);
    const blob = createCsvBlob(csvData);
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
      csvRows.push(
        buildRpoCsvRow(rpo)
          .map((v) => `"${v}"`)
          .join(',')
      );
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

    if (!this.validateThresholds_()) {
      // validateThresholds_ already toasted the field it rejected.
      return;
    }

    this.persistInputs_();

    const request = this.gatherSearch_();

    if (!request) {
      // gatherSearch_ already toasted (e.g. the primary satellite was not found).
      return;
    }
    this.applyCovarianceSources_(request);

    // Single-satellite searches only screen the co-orbital candidates (the list includes the primary).
    this.lastCandidateCount_ = request.mode === 'single' ? Math.max(0, request.sats.length - 1) : null;
    this.startNewResults_();

    if (this.canUseWorker_()) {
      if (request.mode === 'single') {
        this.runWorkerSingleSearch_(request);
      } else {
        this.runWorkerSearch_(request);
      }

      return;
    }

    this.finalizeResults_(this.runSearch_(request));
  }

  /**
   * A positive number from a threshold field, or null for anything else (empty, text, zero, negative). Number()
   * rather than parseFloat so "12abc" is rejected instead of read as 12.
   */
  private static parsePositive_(raw: string): number | null {
    const trimmed = raw.trim();

    if (trimmed === '') {
      return null;
    }
    const value = Number(trimmed);

    return Number.isFinite(value) && value > 0 ? value : null;
  }

  /** Reject a threshold that is not a positive number with a toast naming the field. Returns true when all are valid. */
  private validateThresholds_(): boolean {
    for (const field of THRESHOLD_FIELDS) {
      const input = getEl(field.id, true) as HTMLInputElement | null;

      if (input && ProximityOps.parsePositive_(input.value) === null) {
        ServiceLocator.getUiManager().toast(t7e('plugins.ProximityOps.invalidThreshold').replace('{field}', t7e(field.labelKey)), ToastMsgType.caution, true);

        return false;
      }
    }

    return true;
  }

  /** A search is starting: drop the previous results and show "Searching..." so the old count never reads as current. */
  private startNewResults_(): void {
    this.searchToken_++;
    this.hasCompletedSearch_ = false;
    this.RPOs = [];
    this.hiddenCoLocatedCount_ = 0;
    this.populateTable_(this.RPOs);
    this.updateHiddenNote_();
    this.setCountText_(t7e('plugins.ProximityOps.searching'));
  }

  private setCountText_(text: string): void {
    const el = getEl('proximity-ops-count', true);

    if (el) {
      el.textContent = text;
    }
  }

  private canUseWorker_(): boolean {
    return !isThisNode() && !!this.threadManager_ && this.threadManager_.isReady;
  }

  /** Build the (plain-number, clone-safe) search parameters from the current form. */
  private buildParams_(): RpoSearchParams {
    return {
      maxDis: ProximityOps.parsePositive_((<HTMLInputElement>getEl('proximity-ops-maxDis')).value) ?? 0,
      maxVel: ProximityOps.parsePositive_((<HTMLInputElement>getEl('proximity-ops-maxVel')).value) ?? 0,
      durationSec: (ProximityOps.parsePositive_((<HTMLInputElement>getEl('proximity-ops-duration')).value) ?? 0) * 60 ** 2,
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

    const primarySatSccNum = (<HTMLInputElement>getEl('proximity-ops-norad')).value.trim();

    if (primarySatSccNum === '') {
      ServiceLocator.getUiManager().toast(t7e('plugins.ProximityOps.noradRequired'), ToastMsgType.caution, true);

      return null;
    }

    const satelliteId = this.resolvePrimaryId_(primarySatSccNum);

    if (satelliteId === null) {
      ServiceLocator.getUiManager().toast(t7e('plugins.ProximityOps.satNotFound').replace('{sccNum}', primarySatSccNum), ToastMsgType.caution, true);

      return null;
    }

    return {
      mode: 'single',
      sats: this.findSatsById_(satelliteId, type, params.durationSec as Seconds, new Date(params.baseTimeMs)),
      params,
    };
  }

  /**
   * Catalog id of the typed NORAD, or null when no catalogued satellite carries it. JSC Vimpel objects have a
   * zeroed sccNum, so "0" would otherwise resolve to one of them (JSC 9600) and search around an object the user
   * never named; they are not searchable by NORAD here.
   */
  private resolvePrimaryId_(sccNum: string): number | null {
    const satelliteId = this.catalogManagerInstance.sccNum2Id(sccNum);

    if (typeof satelliteId !== 'number') {
      return null;
    }
    const sat = this.catalogManagerInstance.getSat(satelliteId);

    if (!sat || sat.source === CatalogSource.VIMPEL) {
      return null;
    }

    return satelliteId;
  }

  /**
   * An analyst clone (Maneuver tool) knows no more than the object it came from, so its Pc uses its
   * root parent's TLE-derived covariance. Records the parents for the results note and hands their
   * TLE lines to the search (worker or synchronous) by catalog id.
   */
  private applyCovarianceSources_(request: { sats: Satellite[]; params: RpoSearchParams }): void {
    const parents = new Map<number, Satellite>();
    const tles: Record<string, CovarianceTleLines> = {};

    for (const sat of request.sats) {
      const parent = uncertaintyParentOf(sat);

      if (parent) {
        parents.set(sat.id, parent);
        tles[String(sat.id)] = { tle1: parent.tle1, tle2: parent.tle2 };
      }
    }

    this.uncertaintyParents_ = parents;
    if (parents.size > 0) {
      request.params.covarianceTles = tles;
    }
  }

  /** "Uncertainty assumed from parent <name> (<norad>)" for each analyst clone in the reported approaches. */
  private uncertaintyNoteText_(): string {
    const parents = new Map<string, Satellite>();

    for (const rpo of this.RPOs) {
      for (const id of [rpo.sat1Id, rpo.sat2Id]) {
        const parent = this.uncertaintyParents_.get(id);

        if (parent) {
          parents.set(parent.sccNum, parent);
        }
      }
    }

    return [...parents.values()]
      .map((parent) => t7e('plugins.DebrisScreening.uncertaintyAssumedFromParent').replace('{name}', parent.name).replace('{norad}', parent.sccNum))
      .join(' ');
  }

  /** Show the clone note under the results count while a reported approach involves an analyst clone. */
  private updateUncertaintyNote_(): void {
    const el = getEl('proximity-ops-uncertainty-note', true);

    if (!el) {
      return;
    }
    const text = this.uncertaintyNoteText_();

    el.textContent = text;
    el.style.display = text ? '' : 'none';
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
      }
    );
  }

  /**
   * Single-satellite search on the worker, sent as runs of {@link SINGLE_SEARCH_CHUNK_SIZE} candidates. Between
   * runs the main thread yields and checks the search token, so Cancel (or a new search) stops it after the
   * current run and the worker is free for the next search right away.
   */
  private runWorkerSingleSearch_(request: { mode: RpoSearchMode; sats: Satellite[]; params: RpoSearchParams }): void {
    const [primary, ...candidates] = request.sats;
    const token = this.searchToken_;
    const total = candidates.length;
    let events: ProximityOpsEvent[] = [];

    this.setSearchingState_(true);

    const runChunk = (start: number): void => {
      if (token !== this.searchToken_) {
        return;
      }
      if (start >= total || !primary) {
        this.setSearchingState_(false);
        this.finalizeResults_(events);

        return;
      }

      const chunk = candidates.slice(start, start + SINGLE_SEARCH_CHUNK_SIZE);

      this.threadManager_!.startSurvey(
        { mode: 'single', sats: [primary, ...chunk].map(satToData), params: request.params },
        {
          onProgress: (done) => this.updateProgress_(start + done, total),
          onComplete: (chunkEvents) => {
            events = events.concat(chunkEvents);
            this.updateProgress_(start + chunk.length, total);
            // Defer: the thread manager clears its callbacks after onComplete returns, and the gap lets a Cancel run.
            setTimeout(() => runChunk(start + SINGLE_SEARCH_CHUNK_SIZE), 0);
          },
          onError: (message) => {
            this.setSearchingState_(false);
            errorManagerInstance.warn(t7e('plugins.ProximityOps.surveyError').replace('{error}', message));
          },
        }
      );
    };

    runChunk(0);
  }

  /** Cancel an in-progress worker search, reset the submit row and clear the "Searching..." count. */
  private cancelSearch_(): void {
    this.searchToken_++;
    this.threadManager_?.cancelSurvey();
    this.setSearchingState_(false);
    this.setCountText_('');
  }

  /** Sort, render, count, and reveal the results (shared by the sync and worker paths). */
  private finalizeResults_(events: ProximityOpsEvent[]): void {
    // A docked module or a shared TLE is not a rendezvous: hide pairs that never separate, but say how many.
    const { visible, hiddenCount } = partitionCoLocated(events);

    this.RPOs = visible;
    this.hiddenCoLocatedCount_ = hiddenCount;
    this.hasCompletedSearch_ = true;
    // Each new search starts from the default (chronological) sort.
    this.sortKey_ = DEFAULT_SORT_KEY;
    this.sortAsc_ = DEFAULT_SORT_ASC;
    this.applySortAndRender_();
    this.updateCount_(this.RPOs.length);
    this.updateHiddenNote_();
    this.updateUncertaintyNote_();

    if (this.RPOs.length === 0) {
      ServiceLocator.getUiManager().toast(this.emptyResultMessage_(), ToastMsgType.caution, true);
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

  /**
   * Empty-state copy. A single-satellite search names how many co-orbital
   * candidates it screened and points crossing traffic at Debris Screening;
   * all-vs-all surveys keep the plain message.
   */
  private emptyResultMessage_(): string {
    if (this.lastCandidateCount_ === null) {
      return t7e('plugins.ProximityOps.noRposFound');
    }

    return t7e('plugins.ProximityOps.noRposFoundCoorbital').replace('{count}', this.lastCandidateCount_.toString());
  }

  private updateCount_(count: number): void {
    const el = getEl('proximity-ops-count', true);

    if (!el) {
      return;
    }

    if (count === 0) {
      el.textContent = this.emptyResultMessage_();

      return;
    }

    // Closest is the minimum miss distance regardless of the active sort column.
    const closest = this.RPOs.reduce((min, rpo) => Math.min(min, rpo.dist), Infinity);
    const template = count === 1 ? t7e('plugins.ProximityOps.resultCountOne') : t7e('plugins.ProximityOps.resultCount');

    el.textContent = template.replace('{count}', count.toString()).replace('{closest}', closest.toFixed(2));
  }

  /** "N co-located objects hidden" under the count while the last search dropped any. */
  private updateHiddenNote_(): void {
    const el = getEl('proximity-ops-hidden-note', true);

    if (!el) {
      return;
    }
    const count = this.hiddenCoLocatedCount_;
    const text = count === 1 ? t7e('plugins.ProximityOps.coLocatedHiddenOne') : t7e('plugins.ProximityOps.coLocatedHidden').replace('{count}', count.toString());

    el.textContent = count > 0 ? text : '';
    el.style.display = count > 0 ? '' : 'none';
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
   * catalog. Every position is evaluated at `searchDate` (the sim time the search
   * starts at), never the wall clock, so a search at a chosen time screens the sky
   * at that time.
   */
  private findSatsById_(primarySatID: number, type: string, duration: Seconds, searchDate: Date = this.timeManagerInstance.getOffsetTimeObj(0)): Satellite[] {
    const allSats = this.getFilteredSatellites();
    const primarySat = ServiceLocator.getCatalogManager().getSat(primarySatID)!;

    let sats: Satellite[] = [];

    if (type === RPOType.GEO) {
      const lla = primarySat.lla(searchDate);

      if (!lla) {
        errorManagerInstance.error(new Error('No LLA for primary satellite!'), 'ProximityOps');

        return [];
      }

      sats = allSats.filter((sat) => {
        const lla2 = sat.lla(searchDate);

        if (!lla2) {
          return false;
        }

        return (
          sat.tle1 &&
          sat.period > 23 * 60 &&
          /*
           * assuming max drift rate to be 3deg longitude/day then take large enough lon. window to capture
           * all possible "fly-by" RPOs depends on length of search
           */
          180 - Math.abs(Math.abs(lla.lon - lla2.lon) - 180) < (3 * duration) / (24 * 60 ** 2) &&
          sat.id !== primarySatID
        );
      });
    } else if (type === RPOType.LEO) {
      const raan1 = SatMath.normalizeRaan(primarySat, searchDate);

      sats = allSats.filter((sat) => {
        const raan2 = SatMath.normalizeRaan(sat, searchDate);

        return (
          sat.tle1 &&
          180 - Math.abs(Math.abs(primarySat.inclination - sat.inclination) - 180) < LEO_PLANE_TOLERANCE_DEG &&
          360 - Math.abs(Math.abs(raan1 - raan2) - 360) < LEO_PLANE_TOLERANCE_DEG &&
          sat.id !== primarySatID
        );
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
      atWindowStart: l('atWindowStart'),
      atWindowEnd: l('atWindowEnd'),
    };
  }

  /**
   * Handles a results-row click: jumps the clock to the encounter (preserving
   * playback state), selects both satellites, puts GEO orbits in ECF so the
   * relative motion reads clearly (every click sets it, none toggles it back), and
   * draws the sat-to-sat line. Pc is already computed for every row during the
   * search, so nothing is filled here. The secondary menu is left open per the
   * convention.
   */
  private onEventClicked_(event: ProximityOpsEvent): void {
    jumpToTca(new Date(event.date).getTime());

    // Set the secondary first so that the primary shows secondary info in the sat-info-box
    this.selectSatManagerInstance.setSecondarySat(event.sat2Id);
    this.selectSatManagerInstance.selectSat(event.sat1Id);

    const uiManagerInstance = ServiceLocator.getUiManager();

    const primary = this.selectSatManagerInstance.primarySatObj as Satellite | null;

    if (!settingsManager.isOrbitCruncherInEcf && (primary?.perigee ?? 0) > 6000) {
      uiManagerInstance.toast(t7e('plugins.ProximityOps.geoOrbitsEcf'), ToastMsgType.normal);
      settingsManager.isOrbitCruncherInEcf = true;
      SettingsMenuPlugin.syncOnLoad();
    }

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
   * Picking one satellite states the intent to search around it, so All vs All
   * is turned off.
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

    // A single target means a single-satellite search: turn All vs All off (its change handler unlocks the type).
    const avaInput = <HTMLInputElement>getEl('proximity-ops-ava');

    if (avaInput.checked) {
      avaInput.checked = false;
      avaInput.dispatchEvent(new Event('change'));
    }

    // If satellites is not in GEO belt then treat it like LEO
    const isLeo = (satellite.period < 23 * 60 || satellite.period > 25 * 60) && satellite.inclination > 10;

    (<HTMLInputElement>getEl('proximity-ops-type')).value = isLeo ? RPOType.LEO : RPOType.GEO;
    (<HTMLInputElement>getEl('proximity-ops-maxDis')).value = PRESET_MAX_DISTANCE_KM.toString();
    (<HTMLInputElement>getEl('proximity-ops-type')).dispatchEvent(new Event('change'));

    // Vimpel objects have no NORAD to search by: say so instead of writing the message into the field.
    if (satellite.source === CatalogSource.VIMPEL) {
      (<HTMLInputElement>getEl('proximity-ops-norad')).value = '';
      ServiceLocator.getUiManager().toast(t7e('plugins.ProximityOps.vimpelNotSupported'), ToastMsgType.caution, true);

      return;
    }

    // Handle other satellites
    (<HTMLInputElement>getEl('proximity-ops-norad')).value = satellite.sccNum;
  }
}
