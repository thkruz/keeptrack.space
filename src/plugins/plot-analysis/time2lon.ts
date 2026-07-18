import { getCountryMapList } from '@app/app/data/catalogs/countries';
import { Time2LonThreadManager } from '@app/app/threads/time2lon-thread-manager';
import { GetSatType, MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SatMathApi } from '@app/engine/math/sat-math-api';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, IDragOptions, IHelpConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import type { T2lSatData } from '@app/webworker/time2lon-messages';
import { Satellite, SpaceObjectType } from '@ootk/src/main';
import waterfallPng from '@public/img/icons/waterfall.png';
import * as echarts from 'echarts';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { PlotWatermark } from './plot-download';
import { buildChartOption, Time2LonChartLabels } from './time2lon-chart';
import { buildAllowedTypes, buildSatLine, buildTopCountries, computeOrbits, isSatelliteAllowed, Time2LonFilters, Time2LonSatLine } from './time2lon-core';
import './time2lon.css';

type T7eKey = Parameters<typeof t7e>[0];

export type { Time2LonDataPoint, Time2LonFilters, Time2LonSatLine } from './time2lon-core';

/** A catalog object that passed the filters, paired with its objectCache index and display country. */
interface Time2LonCandidate {
  index: number;
  sat: Satellite;
  country: string;
}

export class Time2LonPlots extends KeepTrackPlugin {
  readonly id = 'Time2LonPlots';
  dependencies_: string[] = [SelectSatManager.name];
  isRenderPausedOnOpen = true;

  private readonly selectSatManager_: SelectSatManager;
  private readonly plotCanvasId_ = 'plot-analysis-chart-time2lon';
  chart: echarts.ECharts | null = null;
  private resizeHandler_: (() => void) | null = null;
  /** Tracks the container's size so the canvas follows the menu's open animation (otherwise it inits too wide and the edge sliders clip). */
  private resizeObserver_: ResizeObserver | null = null;

  /** Off-thread propagation; null until first opened. Sync fallback runs when unavailable. */
  private threadManager_: Time2LonThreadManager | null = null;
  /** Lines accumulated from worker chunks; rendered on completion. */
  private streamBuffer_: Time2LonSatLine[] = [];

  protected currentFilters_: Time2LonFilters = {
    activePayloads: true,
    inactivePayloads: false,
    rocketBodies: false,
    debris: false,
    celestrak: true,
    vimpel: false,
    minInclination: 0,
    maxInclination: 10,
    maxEccentricity: 0.1,
    minPeriod: 1340,
    maxPeriod: 1540,
    samplePoints: 24,
    maxTimeMin: 1440,
  };

  private readonly watermark_ = new PlotWatermark();

  private static readonly chunkSize_ = 50;
  private static readonly topCountryCount_ = 15;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager;
    this.downloadIconCb = () => {
      if (this.chart) {
        this.watermark_.download(this.chart, 'time2lon-waterfall.png');
      }
    };
  }

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'time2lon-plots-icon',
      label: t7e('plugins.Time2LonPlots.bottomIconLabel' as T7eKey),
      image: waterfallPng,
      menuMode: [MenuMode.ANALYSIS, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'time2lon-plots-menu',
      title: t7e('plugins.Time2LonPlots.title' as T7eKey),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.Time2LonPlots.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.Time2LonPlots.help.overview'),
          image: {
            src: 'img/help/plot-analysis/time2lon-menu.png',
            alt: t7e('plugins.Time2LonPlots.help.imgAlt'),
            caption: t7e('plugins.Time2LonPlots.help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.Time2LonPlots.help.howToUse'),
        },
      ],
      tips: [t7e('plugins.Time2LonPlots.help.tip1'), t7e('plugins.Time2LonPlots.help.tip2')],
    };
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: false,
    };
  }

  private buildSideMenuHtml_(): string {
    const innerHtml = html`
      <section class="kt-section">
        <div class="kt-section-label">${t7e('plugins.Time2LonPlots.labels.statistics' as T7eKey)}</div>
        <div id="time2lon-stats">
          <div id="time2lon-total-count">--</div>
          <div id="time2lon-country-counts"></div>
        </div>
      </section>
      <div id="${this.plotCanvasId_}" class="time2lon-chart-container"></div>
    `;

    // When a secondary menu exists (pro), generateSideMenuHtml_() in the base plugin
    // wraps sideMenuElementHtml in the standard side-menu template (and the Pro plugin
    // adds the kt-ui-v13 marker to the generated root in uiManagerFinal). Without a
    // secondary menu (OSS), the raw HTML is inserted directly, so we include the wrapper
    // and the marker here.
    if ('getSecondaryMenuConfig' in this) {
      return innerHtml;
    }

    return html`
      <div id="time2lon-plots-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="time2lon-plots-menu-content" class="side-menu">
          ${innerHtml}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  addJs(): void {
    super.addJs();
    this.ensureThreadManager_();
  }

  /** Lazily creates the propagation worker once (kept alive across opens). */
  private ensureThreadManager_(): void {
    if (this.threadManager_) {
      return;
    }
    // Single-purpose worker; the registry array is unused (lifecycle is local).
    this.threadManager_ = new Time2LonThreadManager([]);
    this.threadManager_.init();
  }

  // =========================================================================
  // Event handlers
  // =========================================================================

  onBottomIconClick(): void {
    if (!this.isMenuButtonActive) {
      return;
    }

    const chartDom = getEl(this.plotCanvasId_);

    if (!chartDom) {
      return;
    }

    this.initChart_(chartDom);
    this.refreshPlot_();
  }

  onBottomIconDeselect(): void {
    this.threadManager_?.cancelTime2Lon();
    if (this.resizeObserver_) {
      this.resizeObserver_.disconnect();
      this.resizeObserver_ = null;
    }
    if (this.resizeHandler_) {
      window.removeEventListener('resize', this.resizeHandler_);
      this.resizeHandler_ = null;
    }
    if (this.chart) {
      echarts.dispose(this.chart);
      this.chart = null;
    }
  }

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  refreshPlot_(): void {
    if (!this.chart || !this.isMenuButtonActive) {
      return;
    }

    this.chart.showLoading({
      text: t7e('plugins.Time2LonPlots.chart.loading' as T7eKey),
      color: '#4fc3f7',
      textColor: '#fff',
      maskColor: 'rgba(0, 0, 0, 0.7)',
    });

    this.computePlot_();
  }

  /** Dispatches the computation to the worker when ready, otherwise the sync fallback. */
  private computePlot_(): void {
    this.ensureThreadManager_();

    if (this.threadManager_?.isReady) {
      this.runWorkerCompute_(this.currentFilters_);

      return;
    }

    this.runSyncCompute_(this.currentFilters_);
  }

  /** Off-thread propagation: streams per-satellite lines, renders on completion. */
  private runWorkerCompute_(filters: Time2LonFilters): void {
    const nowMs = ServiceLocator.getTimeManager().simulationTimeObj.getTime();
    const candidates = this.gatherCandidates_(filters);
    const sats: T2lSatData[] = [];

    for (const candidate of candidates) {
      const { sat } = candidate;

      if (!sat.tle1 || !sat.tle2) {
        continue;
      }

      sats.push({
        satId: sat.id,
        satName: sat.name,
        country: candidate.country,
        tle1: sat.tle1,
        tle2: sat.tle2,
        periodMin: sat.period,
      });
    }

    this.streamBuffer_ = [];

    this.threadManager_!.startTime2Lon(
      { sats, nowMs, samplePoints: filters.samplePoints, maxTimeMin: filters.maxTimeMin },
      {
        onChunk: (line) => {
          if (line) {
            this.streamBuffer_.push(line);
          }
        },
        onProgress: () => {
          // Lines are rendered together on completion; no incremental redraw.
        },
        onComplete: () => {
          if (!this.isMenuButtonActive || !this.chart) {
            return;
          }
          this.chart.hideLoading();
          this.renderChart_(this.streamBuffer_);
          this.updateStatistics_(this.streamBuffer_);
          this.streamBuffer_ = [];
        },
        onError: (message) => {
          this.chart?.hideLoading();
          errorManagerInstance.warn(`${t7e('plugins.Time2LonPlots.title' as T7eKey)}: ${message}`);
        },
      }
    );
  }

  /** Synchronous main-thread computation (used when the worker is unavailable). */
  private runSyncCompute_(filters: Time2LonFilters): void {
    this.getPlotDataAsync_(filters).then((data) => {
      if (!this.isMenuButtonActive || !this.chart) {
        return;
      }
      this.chart.hideLoading();
      this.renderChart_(data);
      this.updateStatistics_(data);
    });
  }

  // =========================================================================
  // Chart setup
  // =========================================================================

  private initChart_(chartDom: HTMLElement): void {
    if (this.chart) {
      echarts.dispose(this.chart);
    }
    this.chart = echarts.init(chartDom);
    this.chart.on('click', (event) => {
      const eventData = event.data as { satId?: number };

      if (typeof eventData?.satId === 'number') {
        this.selectSatManager_.selectSat(eventData.satId);
      }
    });

    if (this.resizeHandler_) {
      window.removeEventListener('resize', this.resizeHandler_);
    }
    this.resizeHandler_ = () => this.chart?.resize();
    window.addEventListener('resize', this.resizeHandler_);

    // The menu animates open after the chart is created, so the container keeps
    // growing for ~1s. Without tracking that, echarts keeps the initial (too
    // wide/tall) canvas and the edge zoom sliders render past the menu's clipped
    // bounds. A ResizeObserver re-fits the canvas as the container settles.
    this.resizeObserver_?.disconnect();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver_ = new ResizeObserver(() => this.chart?.resize());
      this.resizeObserver_.observe(chartDom);
    }
  }

  private renderChart_(data: Time2LonSatLine[]): void {
    if (!this.chart || !this.isMenuButtonActive) {
      return;
    }

    // Data arrives after the menu has finished opening, so re-fit the canvas to
    // the now-settled container before drawing (covers environments without a
    // ResizeObserver).
    this.chart.resize();
    this.chart.setOption(buildChartOption(data, this.getChartLabels_()), true);
  }

  /** Resolves the chart's user-facing strings once per render. */
  private getChartLabels_(): Time2LonChartLabels {
    const l = (key: string) => t7e(`plugins.Time2LonPlots.chart.${key}` as T7eKey);

    return {
      title: l('title'),
      xAxis: l('xAxis'),
      yAxis: l('yAxis'),
      tooltipCountry: l('tooltipCountry'),
      tooltipLongitude: l('tooltipLongitude'),
      tooltipTime: l('tooltipTime'),
      unitMin: t7e('plugins.Time2LonPlots.labels.unitMin' as T7eKey),
      empty: l('empty'),
    };
  }

  // =========================================================================
  // Data gathering
  // =========================================================================

  /** Screens the catalog and resolves each survivor's top-N display country. */
  private gatherCandidates_(filters: Time2LonFilters): Time2LonCandidate[] {
    const catalogManager = ServiceLocator.getCatalogManager();
    const objData = catalogManager.objectCache;
    const allowedTypes = buildAllowedTypes(filters);
    const matched: { index: number; sat: Satellite }[] = [];

    for (let i = 0; i < objData.length; i++) {
      const obj = objData[i];

      if (!obj.isSatellite()) {
        continue;
      }

      const sat = obj as Satellite;

      if (!isSatelliteAllowed(sat, filters, allowedTypes)) {
        continue;
      }

      matched.push({ index: i, sat });
    }

    const countryCounts: Record<string, number> = {};

    for (const { sat } of matched) {
      countryCounts[sat.country] = (countryCounts[sat.country] || 0) + 1;
    }
    const topCountries = buildTopCountries(countryCounts, getCountryMapList() as Record<string, string>, Time2LonPlots.topCountryCount_);

    return matched.map(({ index, sat }) => ({ index, sat, country: topCountries.get(sat.country) ?? 'Other' }));
  }

  /**
   * Synchronous, chunked data gathering used as the worker fallback. Kept as a
   * separate method (and reused by the sync path) so the filtering + multi-orbit
   * sampling is testable without a worker.
   */
  getPlotDataAsync_(filters: Time2LonFilters): Promise<Time2LonSatLine[]> {
    return new Promise((resolve) => {
      const catalogManager = ServiceLocator.getCatalogManager();
      const nowMs = ServiceLocator.getTimeManager().simulationTimeObj.getTime();
      const candidates = this.gatherCandidates_(filters);
      const satLines: Time2LonSatLine[] = [];
      let offset = 0;

      const processChunk = () => {
        const end = Math.min(offset + Time2LonPlots.chunkSize_, candidates.length);

        for (let i = offset; i < end; i++) {
          const candidate = candidates[i];
          const sat = catalogManager.getObject(candidate.index, GetSatType.POSITION_ONLY) as Satellite;
          const orbits = computeOrbits(filters.maxTimeMin, sat.period);
          const totalPoints = filters.samplePoints * orbits;
          const llaPoints = SatMathApi.getLlaOfCurrentOrbit(sat, totalPoints, orbits);
          const line = buildSatLine({ satId: sat.id, satName: sat.name, country: candidate.country }, llaPoints, nowMs, filters.maxTimeMin);

          if (line) {
            satLines.push(line);
          }
        }

        offset = end;

        if (offset < candidates.length && this.isMenuButtonActive) {
          setTimeout(processChunk, 0);
        } else {
          resolve(satLines);
        }
      };

      processChunk();
    });
  }

  static buildAllowedTypes_(filters: Time2LonFilters): Set<SpaceObjectType> {
    return buildAllowedTypes(filters);
  }

  /**
   * Count objects per country code, pick the top N, and return a Map from raw
   * country code to human-readable display name. Codes outside the top N map to
   * 'Other'. Thin wrapper over the core helper that supplies the country map.
   */
  static buildTopCountries_(countryCounts: Record<string, number>): Map<string, string> {
    return buildTopCountries(countryCounts, getCountryMapList() as Record<string, string>, Time2LonPlots.topCountryCount_);
  }

  // =========================================================================
  // Statistics
  // =========================================================================

  private updateStatistics_(data: Time2LonSatLine[]): void {
    const totalEl = getEl('time2lon-total-count');
    const countsEl = getEl('time2lon-country-counts');

    if (!totalEl || !countsEl) {
      return;
    }

    const countByCountry: Record<string, number> = {};

    data.forEach((sat) => {
      countByCountry[sat.country] = (countByCountry[sat.country] || 0) + 1;
    });

    const counts = Object.entries(countByCountry)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    totalEl.textContent = `${t7e('plugins.Time2LonPlots.labels.objectsShown' as T7eKey)}: ${data.length}`;

    countsEl.textContent = '';
    counts.forEach((c) => {
      const span = document.createElement('span');
      const bold = document.createElement('b');

      bold.textContent = `${c.name}:`;
      span.appendChild(bold);
      span.appendChild(document.createTextNode(` ${c.count}`));
      countsEl.appendChild(span);
    });
  }
}
