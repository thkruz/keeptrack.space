import { jumpToTca } from '@app/engine/conjunction/conjunction-row-actions';
import { GetSatType, MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, IDragOptions, IHelpConfig, ISecondaryMenuConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { createCsvBlob } from '@app/engine/utils/saveVariable';
import { showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import type { DsResultRow } from '@app/webworker/debris-screening-messages';
import {
  CatalogObject,
  CatalogScreener,
  cappedScreeningCovarianceFromTle,
  DEFAULT_SHELL_PAD_KM,
  EpochUTC,
  Hours,
  Kilometers,
  Satellite,
  ScreeningResult,
  Seconds,
} from '@ootk/src/main';
import frameInspectPng from '@public/img/icons/frame-inspect.png';
import tableChartPng from '@public/img/icons/table-chart.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './debris-screening.css';

interface RiskLevel {
  label: string;
  className: string;
}

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.DebrisScreening.${key}` as Parameters<typeof t7e>[0]);
/** English variant for CSV values, which stay English for machine parsing. */
const lEn = (key: string): string => t7e(`plugins.DebrisScreening.${key}` as Parameters<typeof t7e>[0], { lng: 'en' });

/** Quote a CSV field when it contains a delimiter, quote, or newline. */
const csvField = (value: string): string => (/[",\n]/u.test(value) ? `"${value.replace(/"/gu, '""')}"` : value);

/**
 * Fields an analyst satellite may carry to name the catalog object it was
 * derived from. The maneuver plugin writes `derivedFromSccNum`; the other two
 * are accepted aliases. Read duck-typed so this works with any producer.
 */
interface AnalystLineage {
  derivedFromSccNum?: unknown;
  parentSccNum?: unknown;
  derivedFrom?: unknown;
}

/**
 * One completed screening run, as returned by
 * `DebrisScreening.getRecentScreeningRuns()` (read duck-typed by the Reports plugin).
 */
export interface DebrisScreeningRun {
  /** Screening key of the primary (its NORAD number when it has one). */
  primaryId: string;
  /** Screened window start, ms since the Unix epoch (null when unknown). */
  startTimeMs: number | null;
  /** Screened window end, ms since the Unix epoch (null when unknown). */
  endTimeMs: number | null;
  /** RIC search box half-widths (km), null when the caller did not record them. */
  boxKm?: { radial: number; intrack: number; crosstrack: number } | null;
  rows: DsResultRow[];
}

export class DebrisScreening extends KeepTrackPlugin {
  readonly id = 'DebrisScreening';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;
  protected readonly formPrefix_ = 'ds';
  protected readonly sideMenuName_ = 'debris-screening-menu';
  protected readonly secondaryMenuName_ = 'debris-screening-results';

  /**
   * Hard-body radii (km) used for every screened pair; no per-object size data
   * is used. Both screening paths read these, and the results footnote prints
   * them, so the on-screen Pc inputs can never drift from the computation.
   */
  static readonly PRIMARY_HARD_BODY_RADIUS_KM = 0.01;
  static readonly SECONDARY_HARD_BODY_RADIUS_KM = 0.005;

  // Normalized screening results (top 100, sorted by Pc desc) - the single
  // source of truth for both the results table and the CSV export. The sync
  // and Pro worker paths both populate this same shape.
  protected rows_: DsResultRow[] = [];

  /**
   * Screening key (the row's `secondaryId`) to catalog id, recorded when the
   * secondaries are gathered. Lets a row select objects that have no NORAD
   * number (JSC Vimpel) and pins duplicate-sccNum entries to the screened one.
   */
  protected secondaryIdMap_ = new Map<string, number>();
  /** Screening keys of the primary's parent objects (analyst satellite lineage). */
  protected lineageKeys_ = new Set<string>();
  /** Whether rows for the primary's parent object are shown (hidden by default). */
  protected isParentRowShown_ = false;
  /** Last rows/count passed to renderRows_, so the parent toggle can re-render. */
  private lastRender_: { rows: DsResultRow[]; countText?: string } = { rows: [] };
  /**
   * Completed screening runs, newest first, capped at MAX_RETAINED_RUNS. Kept
   * across target changes so the Reports plugin can diff a parent's run
   * against its analyst clone's run.
   */
  private recentRuns_: DebrisScreeningRun[] = [];

  /** Rows kept by the synchronous screen (highest Pc first). */
  static readonly MAX_ROWS = 100;

  /** How many completed runs getRecentScreeningRuns() retains. */
  static readonly MAX_RETAINED_RUNS = 5;

  /**
   * Radial pad (km) of the apogee / perigee pre-filter for a U / V / W box
   * (half-widths). A secondary inside the box is at most the box half-diagonal
   * from the primary, so its altitude differs from the primary's by at most
   * that much; DEFAULT_SHELL_PAD_KM adds the mean-to-osculating margin (Hoots
   * et al. 1984). Without the box term a 500 km box silently dropped every
   * object whose shell sat more than 10 km above or below the primary's
   * (scenario 3: ION SCV-017 and STARLINK-6240, 110 and 120 km from 63218).
   */
  static shellPadKm(uKm: number, vKm: number, wKm: number): Kilometers {
    return (Math.hypot(uKm, vKm, wKm) + DEFAULT_SHELL_PAD_KM) as Kilometers;
  }

  /** Whether two altitude bands (perigee / apogee altitudes, km), widened by `padKm`, overlap. */
  static shellsCanMeet(primary: { perigee: number; apogee: number }, secondary: { perigee: number; apogee: number }, padKm: number): boolean {
    return !(secondary.perigee - padKm > primary.apogee || primary.perigee - padKm > secondary.apogee);
  }

  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager;
  }

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'conjunction-screen-icon',
      label: l('bottomIconLabel'),
      image: frameInspectPng,
      menuMode: [MenuMode.CONJUNCTIONS, MenuMode.ALL],
      isDisabledOnLoad: true,
    };
  }

  /**
   * Called when the bottom icon is clicked.
   */
  onBottomIconClick(): void {
    if (!this.verifySatelliteSelected()) {
      return;
    }

    if (this.isMenuButtonActive) {
      this.updateSccNumInMenu_();
    }
  }

  // Bridge for legacy event system (per CLAUDE.md)
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: this.sideMenuName_,
      title: l('title'),
      html: this.buildSideMenuHtml_(),
      dragOptions: {
        isDraggable: true,
        minWidth: 200,
        maxWidth: 600,
      },
    };
  }

  /**
   * Build the v13 side-menu form (inner content only; generateSideMenuHtml_()
   * wraps it because this plugin has a secondary menu; the kt-ui-v13 marker is
   * applied to the generated root in the uiManagerFinal handler). Split into
   * section bodies so Pro subclasses can inject extra controls per card.
   */
  protected buildSideMenuHtml_(): string {
    return html`
      <form id="${this.sideMenuName_}-form" class="kt-menu-body">
        ${this.wrapSection_(l('sections.parameters'), this.parametersBody_())}
        ${this.wrapSection_(l('sections.searchBox'), this.searchBoxBody_())}
        ${this.actionRow_(`${this.formPrefix_}-submit`, l('screenForDebris'), { submit: true })}
      </form>
    `;
  }

  /** "Parameters" card body: target SCC (read-only) and the screening window. */
  protected parametersBody_(): string {
    return html`
      <div class="kt-field-row">
        <div class="input-field col s12">
          <input disabled value="00005" id="${this.formPrefix_}-scc" type="text" />
          <label for="${this.formPrefix_}-scc" class="active">${l('sccLabel')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <select id="${this.formPrefix_}-time">
            <option value="1" selected>${l('timeOptions.h1')}</option>
            <option value="4">${l('timeOptions.h4')}</option>
            <option value="8">${l('timeOptions.h8')}</option>
            <option value="24">${l('timeOptions.h24')}</option>
            <option value="48">${l('timeOptions.h48')}</option>
            <option value="72">${l('timeOptions.h72')}</option>
            <option value="96">${l('timeOptions.d4')}</option>
            <option value="168">${l('timeOptions.d7')}</option>
          </select>
          <label>${l('timeWindowLabel')}</label>
        </div>
      </div>
    `;
  }

  /** "RIC Search Box" card body: U/V/W extents plus the draw/clear box actions. */
  protected searchBoxBody_(): string {
    return html`
      <div class="kt-field-row">
        <div class="input-field col s4">
          <select id="${this.formPrefix_}-u">${this.ricBoxOptions_(1)}</select>
          <label>${l('uLabel')}</label>
        </div>
        <div class="input-field col s4">
          <select id="${this.formPrefix_}-v">${this.ricBoxOptions_(25)}</select>
          <label>${l('vLabel')}</label>
        </div>
        <div class="input-field col s4">
          <select id="${this.formPrefix_}-w">${this.ricBoxOptions_(25)}</select>
          <label>${l('wLabel')}</label>
        </div>
      </div>
      <div class="kt-divider"></div>
      ${this.actionRow_(`${this.formPrefix_}-draw-box`, l('drawBox'))}
      ${this.actionRow_(`${this.formPrefix_}-clear-box`, l('clearBox'))}
    `;
  }

  /** Uniform RIC box-size options (km) shared by U/V/W, from small extents up to 500 km. */
  private static readonly RIC_BOX_SIZES_KM: readonly number[] = [0.5, 1, 2, 5, 10, 25, 50, 100, 200, 500];

  /** Build the shared U/V/W `<option>` list with `selectedKm` pre-selected. */
  private ricBoxOptions_(selectedKm: number): string {
    return DebrisScreening.RIC_BOX_SIZES_KM.map((km) => `<option value="${km}"${km === selectedKm ? ' selected' : ''}>${km} km</option>`).join('');
  }

  /** Wrap a section's controls in a titled v13 card (uppercase label + bordered surface). */
  protected wrapSection_(title: string, body: string): string {
    return html`
      <section class="kt-section">
        <div class="kt-section-label">${title}</div>
        ${body}
      </section>
    `;
  }

  /** A full-width v13 action row (label left; trailing chevron is a CSS pseudo-element). */
  protected actionRow_(id: string, label: string, opts: { submit?: boolean; disabled?: boolean } = {}): string {
    const type = opts.submit ? 'submit' : 'button';
    const disabled = opts.disabled ? ' disabled' : '';

    return html`
      <button id="${id}" type="${type}" class="kt-action waves-effect"${disabled}>
        <span class="kt-action-label">${label}</span>
      </button>
    `;
  }

  /**
   * Set the label on a `.kt-action` row without clobbering the chevron (which is
   * a CSS pseudo-element on the button, not in the label span).
   */
  protected setActionLabel_(id: string, label: string): void {
    const labelEl = getEl(id)?.querySelector('.kt-action-label');

    if (labelEl) {
      labelEl.textContent = label;
    }
  }

  getSecondaryMenuConfig(): ISecondaryMenuConfig {
    return {
      html: this.buildSecondaryMenuHtml_(),
      zIndex: 3,
      icon: tableChartPng,
      dragOptions: this.getSecondaryDragOptions_(),
    };
  }

  private getSecondaryDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 840,
      maxWidth: 1100,
    };
  }

  protected buildSecondaryMenuHtml_(): string {
    return html`
      <div class="debris-screening-results kt-menu-body">
        <section class="kt-section">
          <div class="kt-section-label">${l('sections.results')}</div>
          <div class="ds-header-row">
            <span id="${this.formPrefix_}-results-count" class="ds-results-count">${l('notScreened')}</span>
            <label id="${this.formPrefix_}-parent-toggle" class="ds-parent-toggle" style="display: none;">
              <input id="${this.formPrefix_}-show-parent" type="checkbox" class="filled-in" />
              <span id="${this.formPrefix_}-show-parent-label">${l('showParentRows').replace('{count}', '0')}</span>
            </label>
            <button id="${this.secondaryMenuName_}-export" class="btn btn-ui waves-effect waves-light btn-small">
              <i class="material-icons left">file_download</i>${l('exportCsv')}
            </button>
          </div>
          <div class="ds-notes">
            <div id="${this.formPrefix_}-ric-convention" class="kt-note ds-note">${l('ricConvention')}</div>
            <div id="${this.formPrefix_}-pc-inputs" class="kt-note ds-note">${this.pcInputsText_()}</div>
          </div>
          <div class="ds-table-container">
            <table id="${this.formPrefix_}-results-table" class="striped highlight">
              <thead>
                <tr>
                  <th>${l('table.secondary')}</th>
                  <th>${l('table.secondaryName')}</th>
                  <th>${l('table.secondaryCospar')}</th>
                  <th>${l('table.tca')}</th>
                  <th>${l('table.missKm')}</th>
                  <th>${l('table.rKm')}</th>
                  <th>${l('table.iKm')}</th>
                  <th>${l('table.cKm')}</th>
                  <th>${l('table.relVelocity')}</th>
                  <th>${l('table.pc')}</th>
                  <th>${l('table.risk')}</th>
                </tr>
              </thead>
              <tbody id="${this.formPrefix_}-results-body">
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/debris-screening/debris-screening-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: l('help.boxHeading'),
          content: l('help.box'),
        },
        {
          heading: l('help.resultsHeading'),
          content: l('help.results'),
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2'), l('help.tip3'), l('ricConvention')],
    };
  }

  /**
   * Footnote naming the Pc inputs, built from the same constants and setting
   * the screening paths use (hard-body radii, covariance confidence level).
   */
  protected pcInputsText_(): string {
    const primaryM = DebrisScreening.PRIMARY_HARD_BODY_RADIUS_KM * 1000;
    const secondaryM = DebrisScreening.SECONDARY_HARD_BODY_RADIUS_KM * 1000;
    const sigma = settingsManager.covarianceConfidenceLevel;

    return l('pcInputs')
      .replace('{hbr}', (primaryM + secondaryM).toString())
      .replace('{primary}', primaryM.toString())
      .replace('{secondary}', secondaryM.toString())
      .replace('{sigma}', (typeof sigma === 'number' ? sigma : 1).toString());
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      // Mark the side menu and its generated secondary (results) menu as v13+ so
      // the shared kt-* card styling applies; the wrappers are generated, so the
      // marker can't be authored in the HTML. Then style the screening selects.
      getEl(this.sideMenuName_)?.classList.add('kt-ui-v13');
      getEl(`${this.sideMenuName_}-secondary`)?.classList.add('kt-ui-v13');
      initMaterialSelects(getEl(this.sideMenuName_) ?? document.body);

      // Export button handler
      getEl(`${this.secondaryMenuName_}-export`)?.addEventListener('click', () => {
        this.onDownload();
      });

      // Draw search box button
      getEl(`${this.formPrefix_}-draw-box`)?.addEventListener('click', () => {
        this.drawSearchBox_();
      });

      // Clear search box button
      getEl(`${this.formPrefix_}-clear-box`)?.addEventListener('click', () => {
        this.clearSearchBox_();
      });

      // Results table row click handler - select satellite and jump to TCA
      getEl(`${this.formPrefix_}-results-body`)?.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const row = target.closest('tr');

        if (row) {
          this.onResultsRowClick_(row);
        }
      });

      // "Show parent row" toggle for analyst-satellite screens
      getEl(`${this.formPrefix_}-show-parent`)?.addEventListener('change', (e: Event) => {
        this.setParentRowShown_((e.target as HTMLInputElement).checked);
      });
    });

    // Keep the read-only SCC# field on the selected satellite while the menu
    // is open, instead of only refreshing it when the menu is reopened.
    EventBus.getInstance().on(EventBusEvent.selectSatData, (obj: unknown) => {
      this.onSelectSatData_(obj);
    });

    EventBus.getInstance().on(EventBusEvent.bottomMenuClick, (iconName: string) => {
      this.onOtherMenuOpened_(iconName);
    });
  }

  /**
   * Z-order rule for the results panel: another plugin's side menu opened after
   * it closes it. Side menus stack above secondary panels (engine CSS), so a
   * results panel left open would otherwise sit half under the new menu. Plugins
   * without a side menu (toggles) leave the panel alone.
   */
  protected onOtherMenuOpened_(iconName: string): void {
    if (iconName === this.bottomIconElementName || !this.isSideMenuSettingsOpen) {
      return;
    }
    const other = PluginRegistry.plugins.find((plugin) => plugin.bottomIconElementName === iconName);

    if (other?.sideMenuElementName) {
      this.closeSecondaryMenu();
    }
  }

  /**
   * Selection-changed handler. No-op while the menu is closed (the field is
   * refreshed on open). When the primary changes to a different satellite, the
   * SCC# field follows it and any results computed for the old target are
   * cleared so a table for object A is never read as object B.
   */
  protected onSelectSatData_(obj: unknown): void {
    if (!this.isMenuButtonActive || !(obj instanceof Satellite)) {
      return;
    }

    const sccInput = getEl(`${this.formPrefix_}-scc`) as HTMLInputElement | null;

    if (!sccInput || sccInput.value === obj.sccNum) {
      return;
    }

    sccInput.value = obj.sccNum;
    this.onTargetChanged_();
  }

  /**
   * Called when the screening target changes while the menu is open. Drops the
   * stale results (table, count, and CSV export source). Subclasses with
   * in-flight screening runs override this to cancel them as well.
   */
  /**
   * The last MAX_RETAINED_RUNS completed screening runs, newest first. Each
   * entry holds its own copy of the rows, so later runs never mutate it.
   */
  getRecentScreeningRuns(): readonly DebrisScreeningRun[] {
    return this.recentRuns_;
  }

  /**
   * Retain a completed run for getRecentScreeningRuns(), evicting the oldest past the cap.
   * Runs are keyed by object and window (start, end, box): a re-run of the same object over
   * the same window replaces the earlier run instead of taking another slot, so repeated
   * parent runs can no longer evict the analyst run a maneuver diff needs.
   */
  protected recordScreeningRun_(
    primary: Satellite,
    startTimeMs: number | null,
    endTimeMs: number | null,
    rows: readonly DsResultRow[],
    boxKm: DebrisScreeningRun['boxKm'] = null
  ): void {
    const run: DebrisScreeningRun = {
      primaryId: DebrisScreening.screeningKey(primary),
      startTimeMs,
      endTimeMs,
      boxKm,
      rows: rows.map((row) => ({ ...row })),
    };
    const sameBox = (a: DebrisScreeningRun['boxKm'], b: DebrisScreeningRun['boxKm']): boolean =>
      !a || !b || (a.radial === b.radial && a.intrack === b.intrack && a.crosstrack === b.crosstrack);
    const isSameKey = (other: DebrisScreeningRun): boolean =>
      other.primaryId === run.primaryId && other.startTimeMs === run.startTimeMs && other.endTimeMs === run.endTimeMs && sameBox(other.boxKm, run.boxKm);

    this.recentRuns_ = [run, ...this.recentRuns_.filter((other) => !isSameKey(other))].slice(0, DebrisScreening.MAX_RETAINED_RUNS);
  }

  protected onTargetChanged_(): void {
    this.rows_ = [];
    // Nothing has run for the new target yet, so do not claim an empty result.
    this.renderRows_(this.rows_, l('notScreened'));
  }

  /**
   * Handles a click on a results-table row: selects the secondary satellite
   * and jumps the simulation to the time of closest approach.
   *
   * Subclasses (e.g. DebrisScreeningPro) override this to customize the
   * behavior; only one handler is ever attached, so overriding here replaces
   * the base behavior instead of stacking a second listener.
   */
  protected onResultsRowClick_(row: HTMLTableRowElement): void {
    const tcaMs = row.dataset.tcaMs;

    this.selectSecondaryFromRow_(row);

    if (tcaMs) {
      jumpToTca(parseInt(tcaMs, 10));
    }
  }

  /** Show or hide the rows for the primary's parent object and re-render. */
  protected setParentRowShown_(isShown: boolean): void {
    this.isParentRowShown_ = isShown;
    this.renderRows_(this.lastRender_.rows, this.lastRender_.countText);
  }

  /**
   * Start a screening run for `primary`: forget the previous run's key map and
   * record the primary's lineage so its parent's row can be tagged and hidden.
   */
  protected beginScreeningRun_(primary: Satellite): void {
    this.secondaryIdMap_ = new Map();
    this.lineageKeys_ = this.getLineageSccNums_(primary);
    this.isParentRowShown_ = false;

    const toggle = getEl(`${this.formPrefix_}-show-parent`, true) as HTMLInputElement | null;

    if (toggle) {
      toggle.checked = false;
    }
  }

  /**
   * NORAD numbers of the catalog objects the primary was derived from. An
   * analyst satellite records its parent on the object as `derivedFromSccNum`
   * (`parentSccNum` and `derivedFrom` are accepted aliases). Subclasses may
   * add other lineage sources.
   */
  protected getLineageSccNums_(primary: Satellite): Set<string> {
    const keys = new Set<string>();
    const lineage = primary as unknown as AnalystLineage;

    for (const value of [lineage.derivedFromSccNum, lineage.parentSccNum, lineage.derivedFrom]) {
      if (typeof value === 'string' && value.length > 0 && value !== primary.sccNum) {
        keys.add(value);
      }
    }

    return keys;
  }

  /**
   * Stable key used as the row's `secondaryId`: the NORAD number when the object
   * has one, else `JSC <altId>` for JSC Vimpel objects, else `#<catalog id>`.
   */
  static screeningKey(sat: Satellite): string {
    if (typeof sat.sccNum === 'string' && sat.sccNum.length > 0 && !/^0+$/u.test(sat.sccNum)) {
      return sat.sccNum;
    }

    if (sat.altId) {
      return `JSC ${sat.altId}`;
    }

    return `#${sat.id}`;
  }

  /** Record a secondary for this run and return its screening key. */
  protected registerSecondary_(sat: Satellite): string {
    const key = DebrisScreening.screeningKey(sat);

    this.secondaryIdMap_.set(key, sat.id);

    return key;
  }

  /**
   * Resolve a row's screening key to a catalog id: first the id recorded at
   * screening time (verified to still hold the same object), then a NORAD
   * lookup for keys that are NORAD numbers. Returns null when neither works.
   */
  protected resolveSecondaryId_(key: string): number | null {
    const catalogManager = ServiceLocator.getCatalogManager();
    const mappedId = this.secondaryIdMap_.get(key);

    if (typeof mappedId === 'number') {
      const obj = catalogManager.getObject(mappedId, GetSatType.EXTRA_ONLY);

      if (obj instanceof Satellite && DebrisScreening.screeningKey(obj) === key) {
        return mappedId;
      }
    }

    if (key.startsWith('JSC ') || key.startsWith('#')) {
      return null;
    }

    // sccNum2Id handles numeric/alpha-5/extended directly.
    const id = catalogManager.sccNum2Id(key);

    return id !== null && id !== -1 ? id : null;
  }

  /** Catalog object for a row's secondary, or null when it can no longer be resolved. */
  protected secondaryObject_(key: string): Satellite | null {
    const id = this.resolveSecondaryId_(key);

    if (id === null) {
      return null;
    }

    const obj = ServiceLocator.getCatalogManager().getObject(id, GetSatType.EXTRA_ONLY);

    return obj instanceof Satellite ? obj : null;
  }

  /** Catalog name for a row's secondary, or '' when it can no longer be resolved. */
  protected secondaryName_(key: string): string {
    return this.secondaryObject_(key)?.name ?? '';
  }

  /**
   * COSPAR / international designator for a row's secondary, or '' when the
   * object cannot be resolved or has none (the catalog stores 'none' for those).
   */
  protected secondaryCospar_(key: string): string {
    const intlDes = this.secondaryObject_(key)?.intlDes ?? '';

    return intlDes === 'none' ? '' : intlDes;
  }

  /**
   * Select the row's secondary object. Rows without a key (none rendered by
   * this plugin) are ignored; a key that no longer resolves gets a toast that
   * says why nothing was selected instead of failing silently.
   */
  protected selectSecondaryFromRow_(row: HTMLTableRowElement): boolean {
    const key = row.dataset.secondaryKey ?? row.dataset.secondaryScc ?? '';

    if (!key) {
      return false;
    }

    const id = this.resolveSecondaryId_(key);

    if (id === null) {
      errorManagerInstance.warn(l('errorMsgs.SecondaryNotSelectable').replace('{id}', key));

      return false;
    }

    PluginRegistry.getPlugin(SelectSatManager)?.setSecondarySat(id);

    return true;
  }

  // =========================================================================
  // Public methods
  // =========================================================================

  onFormSubmit(): void {
    showLoading(() => {
      const catalogManager = ServiceLocator.getCatalogManager();
      const timeManager = ServiceLocator.getTimeManager();

      const satId = catalogManager.sccNum2Id((<HTMLInputElement>getEl(`${this.formPrefix_}-scc`)).value.trim());
      const timeVal = <Hours>parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-time`)).value);
      const uVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-u`)).value) as Kilometers;
      const vVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-v`)).value) as Kilometers;
      const wVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-w`)).value) as Kilometers;
      const sat = catalogManager.getObject(satId, GetSatType.SKIP_POS_VEL);

      // OemSatellite passes isSatellite() but has no tle1/tle2/apogee/perigee
      // - toTle() and the orbital-shell filter below would both throw.
      if (!(sat instanceof Satellite)) {
        errorManagerInstance.warn(l('errorMsgs.InvalidSatellite'));

        return;
      }

      const covariance = this.calculateCovarianceFromSatellite(sat);

      this.beginScreeningRun_(sat);

      // Build primary CatalogObject
      const primary: CatalogObject = {
        tle: sat.toTle(),
        name: sat.sccNum,
        radius: DebrisScreening.PRIMARY_HARD_BODY_RADIUS_KM as Kilometers,
        covariance,
      };

      // Build secondaries array with orbital shell pre-filtering, padded by the box size
      const secondaries: CatalogObject[] = [];
      const shellPad = DebrisScreening.shellPadKm(uVal, vVal, wVal);

      catalogManager.objectCache.forEach((obj) => {
        // instanceof excludes OemSatellite, which lacks tle1/tle2/apogee/perigee
        // and would throw inside toTle() / the shell-filter math below.
        if (!(obj instanceof Satellite) || obj.id === satId) {
          return;
        }
        const sat2 = obj;

        // Basic orbital shell filtering: only shells that can reach the box
        if (!DebrisScreening.shellsCanMeet(sat, sat2, shellPad)) {
          return;
        }

        try {
          const secondarySatelliteTle = sat2.toTle();
          const covariance = this.calculateCovarianceFromSatellite(sat2);

          secondaries.push({
            tle: secondarySatelliteTle,
            // NORAD number, or a display id for objects without one (JSC Vimpel)
            name: this.registerSecondary_(sat2),
            radius: DebrisScreening.SECONDARY_HARD_BODY_RADIUS_KM as Kilometers,
            covariance,
          });
        } catch {
          // Skip objects that cannot generate TLEs
        }
      });

      // Build screening options
      const startTimeMs = timeManager.simulationTimeObj.getTime();
      const endTimeMs = startTimeMs + timeVal * 3600 * 1000;
      const startTime = EpochUTC.fromDateTime(new Date(startTimeMs));
      const endTime = EpochUTC.fromDateTime(new Date(endTimeMs));

      try {
        const allResults = CatalogScreener.screenOneToMany(primary, secondaries, {
          startTime,
          endTime,
          searchStepSize: 240 as Seconds,
          // Coarse-to-fine keeps the synchronous fallback usable on multi-day windows
          tcaSearchMode: 'coarse-to-fine',
          // ootk's own shell filter defaults to a 10 km pad; widen it to the box as above
          shellPad,
        });

        // Filter by individual RIC components (box filter, not spherical)
        const inBox = allResults.filter(
          (result) => Math.abs(result.event.radialDistance) <= uVal && Math.abs(result.event.intrackDistance) <= vVal && Math.abs(result.event.crosstrackDistance) <= wVal
        );

        this.rows_ = inBox
          .sort((a, b) => b.event.probabilityOfCollision! - a.event.probabilityOfCollision!)
          .slice(0, DebrisScreening.MAX_ROWS)
          .map((result) => DebrisScreening.toRow_(result));

        this.recordScreeningRun_(sat, startTimeMs, endTimeMs, this.rows_, { radial: uVal, intrack: vVal, crosstrack: wVal });

        // Say so when the row cap cut the list instead of reading as the whole result.
        this.renderRows_(
          this.rows_,
          inBox.length > DebrisScreening.MAX_ROWS
            ? l('resultsCapped').replace('{limit}', DebrisScreening.MAX_ROWS.toString()).replace('{total}', inBox.length.toString())
            : undefined
        );
        this.openSecondaryMenu();
      } catch (error) {
        errorManagerInstance.warn(`${l('errorMsgs.ScreeningFailed')}: ${error}`);
      }
    }, 500);
  }

  protected calculateCovarianceFromSatellite(sat: Satellite) {
    // Caps radii (radial/cross-track/in-track) so a bad TLE can't produce a huge
    // bubble; shared with the screening worker via ootk to avoid logic drift.
    return cappedScreeningCovarianceFromTle(sat.tle1, sat.tle2, settingsManager.covarianceConfidenceLevel);
  }

  onDownload(): void {
    if (this.rows_.length === 0) {
      errorManagerInstance.info(l('errorMsgs.NoResultsToExport'));

      return;
    }

    const headers = [
      'Secondary',
      'Secondary Name',
      'Secondary COSPAR',
      'TCA (UTC)',
      'Miss Distance (km)',
      'Radial (km)',
      'Intrack (km)',
      'Crosstrack (km)',
      'Rel Velocity (km/s)',
      'Pc',
      'Risk Level',
      'Note',
    ];
    // Export what the table shows: a hidden parent row stays out so the CSV matches the count.
    const rows = this.rows_
      .filter((row) => this.isParentRowShown_ || !this.isParentRow_(row))
      .map((row) => {
        const pc = row.probabilityOfCollision ?? undefined;

        return [
          csvField(row.secondaryId),
          csvField(this.secondaryName_(row.secondaryId)),
          csvField(this.secondaryCospar_(row.secondaryId)),
          this.formatTcaMs_(row.tcaMs),
          row.missDistance.toFixed(6),
          // Signed RIC (secondary minus primary, primary RIC frame), the CCSDS / CDM convention.
          row.radialDistance.toFixed(6),
          row.intrackDistance.toFixed(6),
          row.crosstrackDistance.toFixed(6),
          row.relativeVelocity.toFixed(6),
          this.formatPc_(pc),
          this.getRiskLevel_(pc, true).label,
          this.isParentRow_(row) ? csvField(lEn('parentTag')) : '',
        ].join(',');
      });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = createCsvBlob(csv);
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    const primaryScc = (<HTMLInputElement>getEl(`${this.formPrefix_}-scc`)).value;

    link.download = `debris-screening-${primaryScc}-${new Date().toISOString().slice(0, 19)}.csv`;
    link.click();
  }

  // =========================================================================
  // Private methods
  // =========================================================================

  private updateSccNumInMenu_(): void {
    const catalogManager = ServiceLocator.getCatalogManager();
    const sat = catalogManager.getObject(this.selectSatManager_.selectedSat, GetSatType.EXTRA_ONLY) as Satellite;

    if (sat) {
      (<HTMLInputElement>getEl(`${this.formPrefix_}-scc`)).value = sat.sccNum;
    }
  }

  /**
   * Normalize an ootk ScreeningResult (sync path) into the plain-number row
   * shape shared with the Pro worker path.
   */
  protected static toRow_(result: ScreeningResult): DsResultRow {
    const event = result.event;

    return {
      secondaryId: result.secondaryId,
      tcaMs: event.tca.toDateTime().getTime(),
      missDistance: event.missDistance,
      radialDistance: event.radialDistance,
      intrackDistance: event.intrackDistance,
      crosstrackDistance: event.crosstrackDistance,
      relativeVelocity: event.relativeVelocity,
      probabilityOfCollision: event.probabilityOfCollision ?? null,
      riskScore: result.riskScore,
    };
  }

  /**
   * Render a set of result rows into the secondary-menu table. Shared by the
   * sync path, the Pro progressive stream, and the Pro finalizer so the row
   * markup lives in exactly one place.
   * @param rows Normalized result rows to display
   * @param countText Optional override for the count label (e.g. progress text);
   * defaults to the standard "N conjunctions found" message.
   */
  protected renderRows_(rows: DsResultRow[], countText?: string): void {
    this.lastRender_ = { rows, countText };
    const tbody = getEl(`${this.formPrefix_}-results-body`);
    const countEl = getEl(`${this.formPrefix_}-results-count`);

    if (!tbody) {
      return;
    }

    const parentRowCount = rows.filter((row) => this.isParentRow_(row)).length;
    const visibleRows = this.isParentRowShown_ ? rows : rows.filter((row) => !this.isParentRow_(row));
    const fragment = document.createDocumentFragment();

    for (const row of visibleRows) {
      fragment.appendChild(this.createResultRow_(row));
    }

    tbody.innerHTML = '';
    tbody.appendChild(fragment);

    if (countEl) {
      countEl.textContent = countText ?? l('resultsCount').replace('{count}', visibleRows.length.toString());
    }

    this.updateParentToggle_(parentRowCount);

    const pcInputsEl = getEl(`${this.formPrefix_}-pc-inputs`, true);

    if (pcInputsEl) {
      // The confidence level is a live setting; keep the footnote in step with it.
      pcInputsEl.textContent = this.pcInputsText_();
    }
  }

  /** True when the row's secondary is a parent of the screened analyst satellite. */
  protected isParentRow_(row: DsResultRow): boolean {
    return this.lineageKeys_.has(row.secondaryId);
  }

  /** Show the "Show parent row" toggle only while the results contain a parent row. */
  private updateParentToggle_(parentRowCount: number): void {
    const toggle = getEl(`${this.formPrefix_}-parent-toggle`, true);
    const label = getEl(`${this.formPrefix_}-show-parent-label`, true);

    if (toggle) {
      toggle.style.display = parentRowCount > 0 ? '' : 'none';
    }

    if (label) {
      label.textContent = l('showParentRows').replace('{count}', parentRowCount.toString());
    }
  }

  /** Build one `<tr>` (with the dataset hooks the row-click handler reads). */
  protected createResultRow_(row: DsResultRow): HTMLTableRowElement {
    const pc = row.probabilityOfCollision ?? undefined;
    const risk = this.getRiskLevel_(pc);
    const tr = document.createElement('tr');
    const id = this.resolveSecondaryId_(row.secondaryId);

    tr.dataset.secondaryKey = row.secondaryId;
    if (id !== null) {
      tr.dataset.secondaryCatalogId = id.toString();
    }
    tr.dataset.tcaMs = row.tcaMs.toString();

    const addCell = (text: string, className?: string): HTMLTableCellElement => {
      const td = document.createElement('td');

      td.textContent = text;
      if (className) {
        td.className = className;
      }
      tr.appendChild(td);

      return td;
    };

    addCell(row.secondaryId, 'ds-secondary-link');
    const nameCell = addCell(id === null ? l('notInCatalog') : this.secondaryName_(row.secondaryId), 'ds-secondary-name');

    if (this.isParentRow_(row)) {
      tr.classList.add('ds-parent-row');
      const tag = document.createElement('span');

      tag.className = 'ds-parent-tag';
      tag.textContent = l('parentTag');
      nameCell.appendChild(tag);
    }

    addCell(id === null ? '' : this.secondaryCospar_(row.secondaryId), 'ds-secondary-cospar');
    addCell(this.formatTcaMs_(row.tcaMs));
    addCell(row.missDistance.toFixed(3));
    // Signed RIC (secondary minus primary, primary RIC frame), matching Satellite Close Approaches.
    addCell(row.radialDistance.toFixed(3));
    addCell(row.intrackDistance.toFixed(3));
    addCell(row.crosstrackDistance.toFixed(3));
    addCell(row.relativeVelocity.toFixed(3));
    addCell(this.formatPc_(pc));

    const riskCell = addCell('');
    const badge = document.createElement('span');

    badge.className = `ds-risk-badge ${risk.className}`;
    badge.textContent = risk.label;
    riskCell.appendChild(badge);

    return tr;
  }

  protected getRiskLevel_(pc?: number, isExport = false): RiskLevel {
    const tr = isExport ? lEn : l;

    if (typeof pc !== 'number') {
      return { label: tr('riskLevels.unknown'), className: 'risk-unknown' };
    }

    if (pc > 1e-4) {
      return { label: tr('riskLevels.critical'), className: 'risk-critical' };
    }
    if (pc > 1e-6) {
      return { label: tr('riskLevels.high'), className: 'risk-high' };
    }
    if (pc > 1e-8) {
      return { label: tr('riskLevels.medium'), className: 'risk-medium' };
    }

    return { label: tr('riskLevels.low'), className: 'risk-low' };
  }

  protected formatTcaMs_(tcaMs: number): string {
    return new Date(tcaMs).toISOString().slice(0, 19).replace('T', ' ');
  }

  protected formatPc_(pc?: number): string {
    if (typeof pc !== 'number') {
      return 'N/A';
    }
    if (pc < 1e-12) {
      return '<1e-12';
    }

    return pc.toExponential(2);
  }

  private drawSearchBox_(): void {
    const scene = ServiceLocator.getScene();

    const uVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-u`)).value) as Kilometers;
    const vVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-v`)).value) as Kilometers;
    const wVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-w`)).value) as Kilometers;

    scene.searchBox.setCubeSize(uVal, vVal, wVal);
  }

  private clearSearchBox_(): void {
    const scene = ServiceLocator.getScene();

    scene.searchBox.setCubeSize(0 as Kilometers, 0 as Kilometers, 0 as Kilometers);
  }
}
