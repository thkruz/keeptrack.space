import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCapable, ICommandPaletteCommand, IDragOptions, IHelpConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { saveCsv } from '@app/engine/utils/saveVariable';
import { showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { Satellite } from '@ootk/src/main';
import scatterPlotPng from '@public/img/icons/scatter-plot.png';
import * as echarts from 'echarts';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { buildCsvRows, buildGabbardData, calcYearsBetween, FragmentSortKey, SortDir, sortFragments, summarizeEvent } from './breakup-analysis-core';
import { BreakupLabels, buildEventInfoCard, buildEventListTable, buildFragmentTable, buildStatsCard, FRAGMENT_DEFAULT_MAX_ROWS } from './breakup-analysis-table';
import './breakup-analysis.css';
import { BREAKUP_EVENTS, BreakupEvent } from './breakup-events';
import { buildGabbardOption } from './breakup-gabbard-chart';

// Re-export so existing importers keep a single entry point.
export { BREAKUP_EVENTS, BreakupEvent };

export class BreakupAnalysis extends KeepTrackPlugin implements ICommandPaletteCapable {
  readonly id = 'BreakupAnalysis';
  dependencies_ = [];

  private selectedEventId_: string | null = null;
  private debrisResults_: Satellite[] = [];
  private sortKey_: FragmentSortKey = 'perigee';
  private sortDir_: SortDir = 'asc';
  private showAllFragments_ = false;
  /** Search limit before this plugin bumped it, so it can be restored. null when not bumped. */
  private priorSearchLimit_: number | null = null;
  private gabbardChart_: echarts.ECharts | null = null;
  private resizeHandler_: (() => void) | null = null;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'breakup-analysis-bottom-icon',
      label: t7e('plugins.BreakupAnalysis.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: scatterPlotPng,
      menuMode: [MenuMode.ANALYSIS, MenuMode.ALL],
    };
  }

  onBottomIconClick(): void {
    if (!this.isMenuButtonActive) {
      return;
    }

    if (!this.selectedEventId_) {
      this.showEventList_();
    }
  }

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  /** Restore globe state when the menu is closed (not just on the Back button). */
  onBottomIconDeselect(): void {
    this.restoreSearchLimit_();
    this.disposeChart_();
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = t7e('plugins.BreakupAnalysis.title' as Parameters<typeof t7e>[0]);

    return [
      {
        id: 'BreakupAnalysis.open',
        label: t7e('plugins.BreakupAnalysis.commands.open' as Parameters<typeof t7e>[0]),
        category,
        callback: () => this.bottomMenuClicked(),
      },
      {
        id: 'BreakupAnalysis.export',
        label: t7e('plugins.BreakupAnalysis.commands.export' as Parameters<typeof t7e>[0]),
        category,
        callback: () => this.exportCsv_(),
        isAvailable: () => this.debrisResults_.length > 0,
      },
    ];
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'breakup-analysis-menu',
      title: t7e('plugins.BreakupAnalysis.title' as Parameters<typeof t7e>[0]),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 400,
      maxWidth: 800,
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.BreakupAnalysis.title' as Parameters<typeof t7e>[0]),
      body: t7e('plugins.BreakupAnalysis.helpBody' as Parameters<typeof t7e>[0]),
    };
  }

  // =========================================================================
  // Localized labels
  // =========================================================================

  private getLabels_(): BreakupLabels {
    const l = (key: string) => t7e(`plugins.BreakupAnalysis.${key}` as Parameters<typeof t7e>[0]);

    return {
      event: l('labels.event'),
      date: l('labels.date'),
      cause: l('labels.cause'),
      altKm: l('labels.altKm'),
      estDebris: l('labels.estDebris'),
      parentObject: l('labels.parentObject'),
      country: l('labels.country'),
      orbitType: l('labels.orbitType'),
      breakupAltitude: l('labels.breakupAltitude'),
      launchDate: l('labels.launchDate'),
      breakupDate: l('labels.breakupDate'),
      timeToBreakup: l('labels.timeToBreakup'),
      years: l('labels.years'),
      km: l('labels.km'),
      debrisStatistics: l('sections.debrisStatistics'),
      trackedDebris: l('labels.trackedDebris'),
      estimatedTotal: l('labels.estimatedTotal'),
      trackingRatio: l('labels.trackingRatio'),
      typeBreakdown: l('labels.typeBreakdown'),
      fragmentDispersion: l('sections.fragmentDispersion'),
      parameter: l('labels.parameter'),
      min: l('labels.min'),
      max: l('labels.max'),
      mean: l('labels.mean'),
      spread: l('labels.spread'),
      perigeeParam: l('labels.perigeeParam'),
      apogeeParam: l('labels.apogeeParam'),
      eccentricityParam: l('labels.eccentricityParam'),
      inclinationParam: l('labels.inclinationParam'),
      noTrackedDebris: l('labels.noTrackedDebris'),
      trackedFragments: l('sections.trackedFragments'),
      showingOf: l('labels.showingOf'),
      norad: l('labels.norad'),
      name: l('labels.name'),
      type: l('labels.type'),
      perigee: l('labels.perigee'),
      apogee: l('labels.apogee'),
      incDeg: l('labels.incDeg'),
      ecc: l('labels.ecc'),
    };
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  private uiManagerFinal_(): void {
    getEl('breakup-analysis-event-list', true)?.addEventListener('click', (evt: MouseEvent) => {
      const row = (evt.target as HTMLElement).closest('[data-event-id]') as HTMLElement | null;
      const eventId = row?.dataset.eventId;

      if (eventId) {
        showLoading(() => this.selectEvent_(eventId));
      }
    });

    getEl('breakup-analysis-back-btn', true)?.addEventListener('click', () => {
      this.showEventList_();
    });

    getEl('breakup-analysis-jump-btn', true)?.addEventListener('click', () => {
      this.jumpToBreakupDate_();
    });

    getEl('breakup-analysis-parent-btn', true)?.addEventListener('click', () => {
      this.selectParent_();
    });

    getEl('breakup-analysis-export-btn', true)?.addEventListener('click', () => {
      this.exportCsv_();
    });

    getEl('breakup-analysis-showall-btn', true)?.addEventListener('click', () => {
      this.showAllFragments_ = !this.showAllFragments_;
      this.renderDispersion_();
      this.updateShowAllButton_();
    });

    // One delegated listener on the persistent fragment container handles both
    // row selection and header-driven sorting (avoids the per-render listener
    // accumulation the old code had).
    getEl('breakup-analysis-dispersion', true)?.addEventListener('click', (evt: MouseEvent) => {
      this.onDispersionClick_(evt);
    });
  }

  // =========================================================================
  // Side Menu HTML
  // =========================================================================

  private buildSideMenuHtml_(): string {
    const labels = this.getLabels_();
    const s = (key: string) => t7e(`plugins.BreakupAnalysis.sections.${key}` as Parameters<typeof t7e>[0]);
    const a = (key: string) => t7e(`plugins.BreakupAnalysis.actions.${key}` as Parameters<typeof t7e>[0]);

    return html`
      <div id="breakup-analysis-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="breakup-analysis-content" class="side-menu">
          <div id="breakup-analysis-event-list">
            <section class="kt-section">
              <div class="kt-section-label">${s('events')}</div>
              ${buildEventListTable(BREAKUP_EVENTS, labels)}
            </section>
          </div>
          <div id="breakup-analysis-detail" style="display:none;">
            <button id="breakup-analysis-back-btn" type="button" class="kt-action waves-effect">
              <span class="kt-action-label">${a('backToEvents')}</span>
            </button>
            <div id="breakup-analysis-event-info"></div>
            <div id="breakup-analysis-stats"></div>
            <section id="breakup-analysis-gabbard-section" class="kt-section" style="display:none;">
              <div class="kt-section-label">${s('gabbardDiagram')}</div>
              <div id="breakup-analysis-gabbard" class="breakup-gabbard-chart"></div>
            </section>
            <section id="breakup-analysis-dispersion" class="kt-section"></section>
            <section class="kt-section">
              <div class="kt-section-label">${s('actions')}</div>
              <button id="breakup-analysis-jump-btn" type="button" class="kt-action waves-effect">
                <span class="kt-action-label">${a('jumpToDate')}</span>
              </button>
              <button id="breakup-analysis-parent-btn" type="button" class="kt-action waves-effect">
                <span class="kt-action-label">${a('selectParent')}</span>
              </button>
              <button id="breakup-analysis-export-btn" type="button" class="kt-action waves-effect">
                <span class="kt-action-label">${a('exportCsv')}</span>
              </button>
              <button id="breakup-analysis-showall-btn" type="button" class="kt-action waves-effect" style="display:none;">
                <span class="kt-action-label">${a('showAll')}</span>
              </button>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Event selection and analysis
  // =========================================================================

  private selectEvent_(eventId: string): void {
    const event = BREAKUP_EVENTS.find((e) => e.id === eventId);

    if (!event) {
      return;
    }

    this.selectedEventId_ = eventId;
    this.showAllFragments_ = false;
    this.sortKey_ = 'perigee';
    this.sortDir_ = 'asc';
    this.debrisResults_ = sortFragments(this.findDebrisForEvent_(event), this.sortKey_, this.sortDir_);

    this.renderEventDetail_(event);
    this.filterDebrisOnGlobe_();

    const listEl = getEl('breakup-analysis-event-list', true);
    const detailEl = getEl('breakup-analysis-detail', true);

    if (listEl) {
      listEl.style.display = 'none';
    }
    if (detailEl) {
      detailEl.style.display = 'block';
    }
  }

  private showEventList_(): void {
    this.selectedEventId_ = null;
    this.debrisResults_ = [];
    this.disposeChart_();

    const listEl = getEl('breakup-analysis-event-list', true);
    const detailEl = getEl('breakup-analysis-detail', true);

    if (listEl) {
      listEl.style.display = 'block';
    }
    if (detailEl) {
      detailEl.style.display = 'none';
    }

    this.restoreSearchLimit_();
    ServiceLocator.getUiManager().doSearch('');
  }

  private findDebrisForEvent_(event: BreakupEvent): Satellite[] {
    const catalogManager = ServiceLocator.getCatalogManager();
    const results: Satellite[] = [];
    const numSats = catalogManager.numSatellites;

    for (let i = 0; i < numSats; i++) {
      const obj = catalogManager.objectCache[i];

      if (!obj || !obj.isSatellite()) {
        continue;
      }

      const sat = obj as Satellite;

      if (!sat.intlDes || !sat.active) {
        continue;
      }

      if (sat.intlDes.startsWith(event.intlDesPrefix)) {
        results.push(sat);
      }
    }

    return results;
  }

  private filterDebrisOnGlobe_(): void {
    if (this.debrisResults_.length === 0) {
      return;
    }

    if (this.debrisResults_.length > settingsManager.searchLimit) {
      // Remember the prior limit exactly once so closing/back restores it.
      if (this.priorSearchLimit_ === null) {
        this.priorSearchLimit_ = settingsManager.searchLimit;
      }
      settingsManager.searchLimit = this.debrisResults_.length;
    }

    const sccNums = this.debrisResults_.map((s) => s.sccNum).join(',');

    ServiceLocator.getUiManager().doSearch(sccNums);
  }

  /** Restore the search limit the plugin bumped in {@link filterDebrisOnGlobe_}. */
  private restoreSearchLimit_(): void {
    if (this.priorSearchLimit_ !== null) {
      settingsManager.searchLimit = this.priorSearchLimit_;
      this.priorSearchLimit_ = null;
    }
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  private renderEventDetail_(event: BreakupEvent): void {
    const labels = this.getLabels_();

    this.renderEventInfo_(event, labels);
    this.renderStats_(event, labels);
    this.renderDispersion_();
    this.renderGabbard_();
    this.updateShowAllButton_();
  }

  private renderEventInfo_(event: BreakupEvent, labels: BreakupLabels): void {
    const infoEl = getEl('breakup-analysis-event-info', true);

    if (!infoEl) {
      return;
    }

    const yearsToBreakup = calcYearsBetween(event.launchDate, event.breakupDate);

    infoEl.innerHTML = buildEventInfoCard(event, yearsToBreakup, labels);
  }

  private renderStats_(event: BreakupEvent, labels: BreakupLabels): void {
    const statsEl = getEl('breakup-analysis-stats', true);

    if (!statsEl) {
      return;
    }

    statsEl.innerHTML = buildStatsCard(summarizeEvent(event, this.debrisResults_), labels);
  }

  private renderDispersion_(): void {
    const dispEl = getEl('breakup-analysis-dispersion', true);

    if (!dispEl) {
      return;
    }

    if (this.debrisResults_.length === 0) {
      dispEl.innerHTML = '';
      dispEl.style.display = 'none';

      return;
    }

    dispEl.style.display = 'block';
    dispEl.innerHTML = buildFragmentTable(
      this.debrisResults_,
      {
        sortKey: this.sortKey_,
        sortDir: this.sortDir_,
        showAll: this.showAllFragments_,
        maxRows: FRAGMENT_DEFAULT_MAX_ROWS,
      },
      this.getLabels_()
    );
  }

  private renderGabbard_(): void {
    const section = getEl('breakup-analysis-gabbard-section', true);
    const chartDom = getEl('breakup-analysis-gabbard', true);

    if (!section || !chartDom) {
      return;
    }

    const data = buildGabbardData(this.debrisResults_);

    if (data.apogee.length === 0) {
      section.style.display = 'none';
      this.disposeChart_();

      return;
    }

    section.style.display = 'block';

    const g = (key: string) => t7e(`plugins.BreakupAnalysis.gabbard.${key}` as Parameters<typeof t7e>[0]);
    const option = buildGabbardOption(data, {
      apogee: g('apogee'),
      perigee: g('perigee'),
      periodAxis: g('periodAxis'),
      altitudeAxis: g('altitudeAxis'),
    });

    // Defer init + setOption to the next frame: the card was switched to
    // display:block in this same tick, so measuring now gives a near-zero width
    // and echarts wraps the legend into a vertical stack (and that wrap sticks
    // even after a later resize). One frame later the card is laid out and the
    // chart sizes against its real width.
    requestAnimationFrame(() => {
      const dom = getEl('breakup-analysis-gabbard', true);

      if (!dom || this.selectedEventId_ === null) {
        return;
      }

      if (!this.gabbardChart_) {
        this.gabbardChart_ = echarts.init(dom);
        this.resizeHandler_ = () => this.gabbardChart_?.resize();
        window.addEventListener('resize', this.resizeHandler_);
      }

      this.gabbardChart_.setOption(option, true);
      this.gabbardChart_.resize();
    });
  }

  private disposeChart_(): void {
    if (this.resizeHandler_) {
      window.removeEventListener('resize', this.resizeHandler_);
      this.resizeHandler_ = null;
    }
    if (this.gabbardChart_) {
      echarts.dispose(this.gabbardChart_);
      this.gabbardChart_ = null;
    }
  }

  // =========================================================================
  // Fragment table interaction (delegated)
  // =========================================================================

  private onDispersionClick_(evt: MouseEvent): void {
    const target = evt.target as HTMLElement;
    const header = target.closest('[data-sort-key]') as HTMLElement | null;

    if (header) {
      this.applySort_(header.dataset.sortKey as FragmentSortKey);

      return;
    }

    const row = target.closest('[data-scc]') as HTMLElement | null;
    const scc = row?.dataset.scc;

    if (scc) {
      const catalogManager = ServiceLocator.getCatalogManager();
      const satId = catalogManager.sccNum2Id(scc);

      if (satId !== null) {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(satId);
      }
    }
  }

  /** Sort fragments by a column; clicking the active column flips direction. */
  private applySort_(key: FragmentSortKey): void {
    if (this.sortKey_ === key) {
      this.sortDir_ = this.sortDir_ === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey_ = key;
      this.sortDir_ = 'asc';
    }

    this.debrisResults_ = sortFragments(this.debrisResults_, this.sortKey_, this.sortDir_);
    this.renderDispersion_();
  }

  // =========================================================================
  // Actions
  // =========================================================================

  /** Jump the simulation clock to the event's breakup date, preserving playback state. */
  private jumpToBreakupDate_(): void {
    const event = BREAKUP_EVENTS.find((e) => e.id === this.selectedEventId_);

    if (!event) {
      return;
    }

    const targetMs = new Date(`${event.breakupDate}T00:00:00Z`).getTime();

    if (!Number.isFinite(targetMs)) {
      return;
    }

    ServiceLocator.getTimeManager().changeStaticOffset(targetMs - Date.now());
  }

  /** Select the parent object on the globe if it is present in the catalog. */
  private selectParent_(): void {
    const event = BREAKUP_EVENTS.find((e) => e.id === this.selectedEventId_);

    if (!event) {
      return;
    }

    const satId = ServiceLocator.getCatalogManager().sccNum2Id(event.parentNoradId.toString());

    if (satId !== null) {
      PluginRegistry.getPlugin(SelectSatManager)?.selectSat(satId);
    } else {
      ServiceLocator.getUiManager().toast(t7e('plugins.BreakupAnalysis.errorMsgs.parentNotFound' as Parameters<typeof t7e>[0]), ToastMsgType.caution);
    }
  }

  private exportCsv_(): void {
    if (this.debrisResults_.length === 0) {
      ServiceLocator.getUiManager().toast(t7e('plugins.BreakupAnalysis.errorMsgs.noDataToExport' as Parameters<typeof t7e>[0]), ToastMsgType.caution);

      return;
    }

    const event = BREAKUP_EVENTS.find((e) => e.id === this.selectedEventId_);
    const name = `breakup-${event?.id ?? 'fragments'}`;

    saveCsv(buildCsvRows(this.debrisResults_), name);
  }

  private updateShowAllButton_(): void {
    const btn = getEl('breakup-analysis-showall-btn', true);
    const labelEl = btn?.querySelector('.kt-action-label');

    if (!btn || !labelEl) {
      return;
    }

    // Only relevant once the list overflows the default cap.
    if (this.debrisResults_.length <= FRAGMENT_DEFAULT_MAX_ROWS) {
      btn.style.display = 'none';

      return;
    }

    btn.style.display = 'flex';
    labelEl.textContent = this.showAllFragments_
      ? t7e('plugins.BreakupAnalysis.actions.showFewer' as Parameters<typeof t7e>[0])
      : t7e('plugins.BreakupAnalysis.actions.showAll' as Parameters<typeof t7e>[0]);
  }
}
