import { getCountryMapList } from '@app/app/data/catalogs/countries';
import { GetSatType, MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SatMathApi } from '@app/engine/math/sat-math-api';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, IDragOptions, IHelpConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { CatalogSource, PayloadStatus, Satellite, SpaceObjectType } from '@ootk/src/main';
import waterfallPng from '@public/img/icons/waterfall.png';
import * as echarts from 'echarts';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './time2lon.css';

type T7eKey = Parameters<typeof t7e>[0];

/** A single data point: [longitude, timeFromNowMinutes] with metadata */
type Time2LonDataPoint = {
  value: [number, number];
  satName: string;
  satId: number;
};

/** Per-satellite line data, grouped by country name for legend */
interface Time2LonSatLine {
  satName: string;
  satId: number;
  country: string;
  points: Time2LonDataPoint[];
}

/** Filter settings for the waterfall plot */
export interface Time2LonFilters {
  activePayloads: boolean;
  inactivePayloads: boolean;
  rocketBodies: boolean;
  debris: boolean;
  celestrak: boolean;
  vimpel: boolean;
  minInclination: number;
  maxInclination: number;
  samplePoints: number;
  maxTimeMin: number;
}

export class Time2LonPlots extends KeepTrackPlugin {
  readonly id = 'Time2LonPlots';
  dependencies_: string[] = [SelectSatManager.name];
  isRenderPausedOnOpen = true;

  private readonly selectSatManager_: SelectSatManager;
  private readonly plotCanvasId_ = 'plot-analysis-chart-time2lon';
  chart: echarts.ECharts | null = null;
  private resizeHandler_: (() => void) | null = null;

  protected currentFilters_: Time2LonFilters = {
    activePayloads: true,
    inactivePayloads: false,
    rocketBodies: false,
    debris: false,
    celestrak: true,
    vimpel: false,
    minInclination: 0,
    maxInclination: 10,
    samplePoints: 24,
    maxTimeMin: 1440,
  };

  private readonly logo_ = new Image();
  private readonly secondaryLogo_ = new Image();

  private static readonly maxEccentricity_ = 0.1;
  private static readonly minSatellitePeriod_ = 1340;
  private static readonly maxSatellitePeriod_ = 1540;
  private static readonly chunkSize_ = 50;
  private static readonly topCountryCount_ = 15;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager;
    this.downloadIconCb = () => this.onDownload_();

    this.logo_.src = `${settingsManager.installDirectory}img/logo-primary.png`;
    if (settingsManager.isShowSecondaryLogo) {
      this.secondaryLogo_.src = `${settingsManager.installDirectory}img/logo-secondary.png`;
    }
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
      <div id="time2lon-stats">
        <div id="time2lon-total-count">--</div>
        <div id="time2lon-country-counts"></div>
      </div>
      <div id="${this.plotCanvasId_}" class="time2lon-chart-container"></div>
    `;

    // When a secondary menu exists (pro), generateSideMenuHtml_() in the base plugin
    // wraps sideMenuElementHtml in the standard side-menu template. Without a secondary
    // menu (OSS), the raw HTML is inserted directly, so we must include the wrapper.
    if ('getSecondaryMenuConfig' in this) {
      return innerHtml;
    }

    return html`
      <div id="time2lon-plots-menu" class="side-menu-parent start-hidden">
        <div id="time2lon-plots-menu-content" class="side-menu">
          ${innerHtml}
        </div>
      </div>
    `;
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
      text: 'Computing orbit data...',
      color: '#4fc3f7',
      textColor: '#fff',
      maskColor: 'rgba(0, 0, 0, 0.7)',
    });

    this.getPlotDataAsync_(this.currentFilters_).then((data) => {
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
  }

  private renderChart_(data: Time2LonSatLine[]): void {
    if (!this.chart || !this.isMenuButtonActive) {
      return;
    }

    this.chart.setOption({
      animation: false,
      title: {
        text: 'Time vs Longitude (Waterfall) Plot',
        textStyle: {
          fontSize: 16,
          color: '#fff',
        },
      },
      legend: {
        show: true,
        top: 30,
        textStyle: {
          color: '#fff',
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: { data?: Time2LonDataPoint; color?: string; seriesName?: string; seriesId?: string }) => {
          const d = params.data;

          if (!d?.value) {
            return '';
          }

          const satName = (d as Time2LonDataPoint)?.satName ?? '';

          return `
            <div style="text-align: left;">
              <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="width: 10px; height: 10px; background-color: ${params.color};
                  border-radius: 50%; margin-right: 5px;"></div>
                <span style="font-weight: bold;">${satName}</span>
              </div>
              <div><b>Country:</b> ${params.seriesName}</div>
              <div><b>Longitude:</b> ${d.value[0].toFixed(3)}\u00B0</div>
              <div><b>Time from now:</b> ${d.value[1].toFixed(2)} min</div>
            </div>
          `;
        },
      },
      grid: {
        bottom: 100,
      },
      xAxis: {
        name: 'Longitude (\u00B0)',
        type: 'value' as const,
        position: 'bottom',
        nameLocation: 'middle',
        nameGap: 35,
        axisLabel: { color: '#999' },
        nameTextStyle: { color: '#fff', fontSize: 14 },
      },
      yAxis: {
        name: 'Time from now (min)',
        type: 'value' as const,
        position: 'left',
        nameLocation: 'middle',
        nameGap: 50,
        axisLabel: { color: '#999' },
        nameTextStyle: { color: '#fff', fontSize: 14 },
      },
      dataZoom: [
        {
          type: 'slider' as const,
          show: true,
          xAxisIndex: [0],
          startValue: -5,
          endValue: 5,
          maxValueSpan: 10,
        },
        {
          type: 'slider' as const,
          show: true,
          yAxisIndex: [0],
          left: '93%',
          start: 0,
          end: 100,
        },
        {
          type: 'inside' as const,
          xAxisIndex: [0],
          maxValueSpan: 10,
        },
        {
          type: 'inside' as const,
          yAxisIndex: [0],
        },
      ],
      series: data.map((sat) => ({
        type: 'line' as const,
        name: sat.country,
        id: sat.satId.toString(),
        data: sat.points,
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: { width: 1 },
        itemStyle: { opacity: 1 },
        emphasis: {
          focus: 'series' as const,
          itemStyle: { opacity: 1 },
          lineStyle: {
            color: '#fff',
            width: 3,
          },
        },
      })),
    }, true);
  }

  private onDownload_(): void {
    if (!this.chart) {
      return;
    }

    const chartDataUrl = this.chart.getDataURL({
      type: 'png',
      backgroundColor: '#1f1f1f',
      pixelRatio: 2,
    });

    const chartImg = new Image();

    chartImg.onload = () => {
      const canvas = document.createElement('canvas');

      canvas.width = chartImg.width;
      canvas.height = chartImg.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return;
      }

      // Draw chart
      ctx.drawImage(chartImg, 0, 0);

      // Draw logo watermark in top-left corner
      const paddingX = 40;
      const paddingY = 50;
      const logoHeight = Math.max(40, canvas.height * 0.06);

      if (!settingsManager.copyrightOveride && this.logo_.complete && this.logo_.naturalWidth > 0) {
        const logoWidth = this.logo_.width * (logoHeight / this.logo_.height);

        if (settingsManager.isShowSecondaryLogo && this.secondaryLogo_.complete && this.secondaryLogo_.naturalWidth > 0) {
          const secLogoWidth = this.secondaryLogo_.width * (logoHeight / this.secondaryLogo_.height);

          ctx.drawImage(this.secondaryLogo_, paddingX, paddingY, secLogoWidth, logoHeight);
          ctx.drawImage(this.logo_, paddingX + secLogoWidth + paddingX, paddingY, logoWidth, logoHeight);
        } else {
          ctx.drawImage(this.logo_, paddingX, paddingY, logoWidth, logoHeight);
        }
      }

      const link = document.createElement('a');

      link.download = 'time2lon-waterfall.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    chartImg.src = chartDataUrl;
  }

  // =========================================================================
  // Async data gathering (chunked to prevent UI jank)
  // =========================================================================

  private getPlotDataAsync_(filters: Time2LonFilters): Promise<Time2LonSatLine[]> {
    return new Promise((resolve) => {
      const catalogManager = ServiceLocator.getCatalogManager();
      const timeManager = ServiceLocator.getTimeManager();
      const now = timeManager.simulationTimeObj.getTime();
      const objData = catalogManager.objectCache;
      const allowedTypes = Time2LonPlots.buildAllowedTypes_(filters);

      // Pre-filter to find GEO-regime object indices matching type filters
      const geoIndices: number[] = [];

      for (let i = 0; i < objData.length; i++) {
        const obj = objData[i];

        if (!obj.isSatellite()) {
          continue;
        }
        if (!allowedTypes.has(obj.type)) {
          continue;
        }

        // For payloads, check active/inactive status
        if (obj.type === SpaceObjectType.PAYLOAD) {
          const sat = obj as Satellite;
          const isActive = sat.status === PayloadStatus.OPERATIONAL;

          if (isActive && !filters.activePayloads) {
            continue;
          }
          if (!isActive && !filters.inactivePayloads) {
            continue;
          }
        }

        const sat = obj as Satellite;

        if (sat.eccentricity > Time2LonPlots.maxEccentricity_) {
          continue;
        }
        if (sat.period < Time2LonPlots.minSatellitePeriod_) {
          continue;
        }
        if (sat.period > Time2LonPlots.maxSatellitePeriod_) {
          continue;
        }
        if (sat.inclination < filters.minInclination || sat.inclination > filters.maxInclination) {
          continue;
        }

        // Source filter
        if (sat.source === CatalogSource.VIMPEL && !filters.vimpel) {
          continue;
        }
        if (sat.source !== CatalogSource.VIMPEL && !filters.celestrak) {
          continue;
        }

        geoIndices.push(i);
      }

      // Build dynamic top-N country lookup from filtered objects
      const countryCounts: Record<string, number> = {};

      for (const idx of geoIndices) {
        const sat = objData[idx] as Satellite;

        countryCounts[sat.country] = (countryCounts[sat.country] || 0) + 1;
      }
      const topCountries = Time2LonPlots.buildTopCountries_(countryCounts);

      const satLines: Time2LonSatLine[] = [];
      let offset = 0;

      const processChunk = () => {
        const end = Math.min(offset + Time2LonPlots.chunkSize_, geoIndices.length);

        for (let i = offset; i < end; i++) {
          const sat = catalogManager.getObject(geoIndices[i], GetSatType.POSITION_ONLY) as Satellite;
          const plotPoints = SatMathApi.getLlaOfCurrentOrbit(sat, filters.samplePoints);
          const points: Time2LonDataPoint[] = [];

          plotPoints.forEach((point) => {
            const timeMin = (point.time - now) / 1000 / 60;

            if (timeMin > filters.maxTimeMin || timeMin < 0) {
              return;
            }

            points.push({ value: [point.lon as number, timeMin], satName: sat.name, satId: sat.id });
          });

          if (points.length > 0) {
            satLines.push({
              satName: sat.name,
              satId: sat.id,
              country: topCountries.get(sat.country) ?? 'Other',
              points,
            });
          }
        }

        offset = end;

        if (offset < geoIndices.length && this.isMenuButtonActive) {
          setTimeout(processChunk, 0);
        } else {
          resolve(satLines);
        }
      };

      processChunk();
    });
  }

  static buildAllowedTypes_(filters: Time2LonFilters): Set<SpaceObjectType> {
    const types = new Set<SpaceObjectType>();

    if (filters.activePayloads || filters.inactivePayloads) {
      types.add(SpaceObjectType.PAYLOAD);
    }
    if (filters.rocketBodies) {
      types.add(SpaceObjectType.ROCKET_BODY);
    }
    if (filters.debris) {
      types.add(SpaceObjectType.DEBRIS);
    }

    return types;
  }

  /**
   * Count objects per country code, pick the top N, and return
   * a Map from raw country code to human-readable display name.
   * Codes outside the top N map to 'Other'.
   */
  static buildTopCountries_(countryCounts: Record<string, number>): Map<string, string> {
    const sorted = Object.entries(countryCounts)
      .sort(([, a], [, b]) => b - a);

    const countryMap = getCountryMapList() as Record<string, string>;
    const topCodes = sorted.slice(0, Time2LonPlots.topCountryCount_).map(([code]) => code);
    const lookup = new Map<string, string>();

    for (const code of topCodes) {
      lookup.set(code, countryMap[code] ?? code);
    }

    // Everything else maps to 'Other'
    for (const [code] of sorted) {
      if (!lookup.has(code)) {
        lookup.set(code, 'Other');
      }
    }

    return lookup;
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

    totalEl.textContent = `${t7e('plugins.Time2LonPlots.labels.totalGeoPayloads' as T7eKey)}: ${data.length}`;

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
