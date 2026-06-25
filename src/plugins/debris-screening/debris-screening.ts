import { jumpToTca } from '@app/engine/conjunction/conjunction-row-actions';
import { GetSatType, MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IDragOptions,
  IHelpConfig,
  ISecondaryMenuConfig,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import {
  cappedScreeningCovarianceFromTle,
  CatalogObject,
  CatalogScreener,
  EpochUTC,
  Hours,
  Kilometers,
  Satellite,
  ScreeningResult,
  Seconds,
} from '@ootk/src/main';
import frameInspectPng from '@public/img/icons/frame-inspect.png';
import tableChartPng from '@public/img/icons/table-chart.png';
import type { DsResultRow } from '@app/webworker/debris-screening-messages';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './debris-screening.css';

interface RiskLevel {
  label: string;
  className: string;
}

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.DebrisScreening.${key}` as Parameters<typeof t7e>[0]);

export class DebrisScreening extends KeepTrackPlugin {
  readonly id = 'DebrisScreening';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;
  protected readonly formPrefix_ = 'ds';
  protected readonly sideMenuName_ = 'debris-screening-menu';
  protected readonly secondaryMenuName_ = 'debris-screening-results';

  // Normalized screening results (top 100, sorted by Pc desc) - the single
  // source of truth for both the results table and the CSV export. The sync
  // and Pro worker paths both populate this same shape.
  protected rows_: DsResultRow[] = [];

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
   * Build the v13 side-menu form (inner content only — generateSideMenuHtml_()
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
    return DebrisScreening.RIC_BOX_SIZES_KM
      .map((km) => `<option value="${km}"${km === selectedKm ? ' selected' : ''}>${km} km</option>`)
      .join('');
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
      minWidth: 650,
      maxWidth: 1000,
    };
  }

  private buildSecondaryMenuHtml_(): string {
    return html`
      <div class="debris-screening-results kt-menu-body">
        <section class="kt-section">
          <div class="kt-section-label">${l('sections.results')}</div>
          <div class="ds-header-row">
            <span id="${this.formPrefix_}-results-count" class="ds-results-count">${l('resultsCount').replace('{count}', '0')}</span>
            <button id="${this.secondaryMenuName_}-export" class="btn btn-ui waves-effect waves-light btn-small">
              <i class="material-icons left">file_download</i>${l('exportCsv')}
            </button>
          </div>
          <div class="ds-table-container">
            <table id="${this.formPrefix_}-results-table" class="striped highlight">
              <thead>
                <tr>
                  <th>${l('table.secondary')}</th>
                  <th>${l('table.tca')}</th>
                  <th>${l('table.missKm')}</th>
                  <th>${l('table.rKm')}</th>
                  <th>${l('table.iKm')}</th>
                  <th>${l('table.cKm')}</th>
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
      tips: [l('help.tip1'), l('help.tip2'), l('help.tip3')],
    };
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
    });
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
    const secondaryScc = row.dataset.secondaryScc;
    const tcaMs = row.dataset.tcaMs;

    if (secondaryScc) {
      this.selectSecondarySatelliteByScc_(secondaryScc);
    }

    if (tcaMs) {
      jumpToTca(parseInt(tcaMs, 10));
    }
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

      // Build primary CatalogObject
      const primary: CatalogObject = {
        tle: sat.toTle(),
        name: sat.sccNum,
        radius: 0.01 as Kilometers, // 10m default hard body radius
        covariance,
      };

      // Build secondaries array with orbital shell pre-filtering
      const secondaries: CatalogObject[] = [];

      catalogManager.objectCache.forEach((obj) => {
        // instanceof excludes OemSatellite, which lacks tle1/tle2/apogee/perigee
        // and would throw inside toTle() / the shell-filter math below.
        if (!(obj instanceof Satellite) || obj.id === satId) {
          return;
        }
        const sat2 = obj;

        // Basic orbital shell filtering
        if (sat2.perigee > sat.apogee || sat.perigee > sat2.apogee) {
          return;
        }

        try {
          const secondarySatelliteTle = sat2.toTle();
          const covariance = this.calculateCovarianceFromSatellite(sat2);

          secondaries.push({
            tle: secondarySatelliteTle,
            name: sat2.sccNum,
            radius: 0.005 as Kilometers, // 5m default
            covariance,
          });
        } catch {
          // Skip objects that cannot generate TLEs
        }
      });

      // Build screening options
      const startTime = EpochUTC.fromDateTime(timeManager.simulationTimeObj);
      const endTime = EpochUTC.fromDateTime(
        new Date(timeManager.simulationTimeObj.getTime() + timeVal * 3600 * 1000),
      );

      try {
        const allResults = CatalogScreener.screenOneToMany(primary, secondaries, {
          startTime,
          endTime,
          searchStepSize: 240 as Seconds,
        });

        // Filter by individual RIC components (box filter, not spherical)
        this.rows_ = allResults
          .filter((result) =>
            Math.abs(result.event.radialDistance) <= uVal &&
            Math.abs(result.event.intrackDistance) <= vVal &&
            Math.abs(result.event.crosstrackDistance) <= wVal,
          )
          .sort((a, b) => b.event.probabilityOfCollision! - a.event.probabilityOfCollision!)
          .slice(0, 100)
          .map((result) => DebrisScreening.toRow_(result));

        this.renderRows_(this.rows_);
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

    const headers = ['Secondary', 'TCA (UTC)', 'Miss Distance (km)', 'Radial (km)', 'Intrack (km)', 'Crosstrack (km)', 'Rel Velocity (km/s)', 'Pc', 'Risk Level'];
    const rows = this.rows_.map((row) => {
      const pc = row.probabilityOfCollision ?? undefined;

      return [
        row.secondaryId,
        this.formatTcaMs_(row.tcaMs),
        row.missDistance.toFixed(6),
        row.radialDistance.toFixed(6),
        row.intrackDistance.toFixed(6),
        row.crosstrackDistance.toFixed(6),
        row.relativeVelocity.toFixed(6),
        this.formatPc_(pc),
        this.getRiskLevel_(pc).label,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
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
    const tbody = getEl(`${this.formPrefix_}-results-body`);
    const countEl = getEl(`${this.formPrefix_}-results-count`);

    if (!tbody) {
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const row of rows) {
      fragment.appendChild(this.createResultRow_(row));
    }

    tbody.innerHTML = '';
    tbody.appendChild(fragment);

    if (countEl) {
      countEl.textContent = countText ?? l('resultsCount').replace('{count}', rows.length.toString());
    }
  }

  /** Build one `<tr>` (with the dataset hooks the row-click handler reads). */
  protected createResultRow_(row: DsResultRow): HTMLTableRowElement {
    const pc = row.probabilityOfCollision ?? undefined;
    const risk = this.getRiskLevel_(pc);
    const tr = document.createElement('tr');

    tr.dataset.secondaryScc = row.secondaryId;
    tr.dataset.tcaMs = row.tcaMs.toString();
    tr.innerHTML = `
      <td class="ds-secondary-link">${row.secondaryId}</td>
      <td>${this.formatTcaMs_(row.tcaMs)}</td>
      <td>${row.missDistance.toFixed(3)}</td>
      <td>${row.radialDistance.toFixed(3)}</td>
      <td>${row.intrackDistance.toFixed(3)}</td>
      <td>${row.crosstrackDistance.toFixed(3)}</td>
      <td>${this.formatPc_(pc)}</td>
      <td><span class="ds-risk-badge ${risk.className}">${risk.label}</span></td>
    `;

    return tr;
  }

  protected getRiskLevel_(pc?: number): RiskLevel {
    if (typeof pc !== 'number') {
      return { label: l('riskLevels.unknown'), className: 'risk-unknown' };
    }

    if (pc > 1e-4) {
      return { label: l('riskLevels.critical'), className: 'risk-critical' };
    }
    if (pc > 1e-6) {
      return { label: l('riskLevels.high'), className: 'risk-high' };
    }
    if (pc > 1e-8) {
      return { label: l('riskLevels.medium'), className: 'risk-medium' };
    }

    return { label: l('riskLevels.low'), className: 'risk-low' };
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

  protected selectSecondarySatelliteByScc_(sccNum: string): void {
    const catalogManager = ServiceLocator.getCatalogManager();
    // Pass the string straight through - sccNum2Id handles numeric/alpha-5/extended.
    const id = catalogManager.sccNum2Id(sccNum);

    if (id !== null && id !== -1) {
      PluginRegistry.getPlugin(SelectSatManager)?.setSecondarySat(id);
    }
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
