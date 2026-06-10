import { getCountryMapList } from '@app/app/data/catalogs/countries';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { CatalogSource, PayloadStatus, Satellite, SpaceObjectType } from '@ootk/src/main';
import barChart4BarsPng from '@public/img/icons/bar-chart-4-bars.png';
import * as echarts from 'echarts';
import 'echarts-gl';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './inc2lon.css';

type T7eKey = Parameters<typeof t7e>[0];

/** Data tuple: [inclination, longitude, period, name, id] */
type Inc2LonDataItem = [number, number, number, string, number];

interface Inc2LonCountryData {
  name: string;
  value: Inc2LonDataItem[];
}

/** Filter settings for the inclination vs longitude scatter plot */
export interface Inc2LonFilters {
  activePayloads: boolean;
  inactivePayloads: boolean;
  rocketBodies: boolean;
  debris: boolean;
  celestrak: boolean;
  vimpel: boolean;
  minInclination: number;
  maxInclination: number;
  maxEccentricity: number;
  minPeriod: number;
  maxPeriod: number;
}

export class Inc2LonPlots extends KeepTrackPlugin {
  readonly id = 'Inc2LonPlots';
  dependencies_: string[] = [SelectSatManager.name];
  isRenderPausedOnOpen = true;

  private readonly selectSatManager_: SelectSatManager;
  private readonly plotCanvasId_ = 'plot-analysis-chart-inc2lon';
  chart: echarts.ECharts | null = null;
  private resizeHandler_: (() => void) | null = null;

  protected currentFilters_: Inc2LonFilters = {
    activePayloads: true,
    inactivePayloads: false,
    rocketBodies: false,
    debris: false,
    celestrak: true,
    vimpel: false,
    minInclination: 0,
    maxInclination: 17,
    maxEccentricity: 0.1,
    minPeriod: 1240,
    maxPeriod: 1640,
  };

  private readonly logo_ = new Image();
  private readonly secondaryLogo_ = new Image();

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
      elementName: 'inc2lon-plots-icon',
      label: t7e('plugins.Inc2LonPlots.bottomIconLabel' as T7eKey),
      image: barChart4BarsPng,
      menuMode: [MenuMode.ANALYSIS, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'inc2lon-plots-menu',
      title: t7e('plugins.Inc2LonPlots.title' as T7eKey),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.Inc2LonPlots.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.Inc2LonPlots.help.overview'),
          image: {
            src: 'img/help/plot-analysis/inc2lon-menu.png',
            alt: t7e('plugins.Inc2LonPlots.help.imgAlt'),
            caption: t7e('plugins.Inc2LonPlots.help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.Inc2LonPlots.help.howToUse'),
        },
      ],
      tips: [t7e('plugins.Inc2LonPlots.help.tip1'), t7e('plugins.Inc2LonPlots.help.tip2')],
      shortcuts: [{ keys: ['G'], description: t7e('plugins.Inc2LonPlots.help.shortcutToggle') }],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'g',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: false,
    };
  }

  private buildSideMenuHtml_(): string {
    const innerHtml = html`
      <div id="${this.plotCanvasId_}" class="inc2lon-chart-container"></div>
    `;

    // When a secondary menu exists (pro), generateSideMenuHtml_() in the base plugin
    // wraps sideMenuElementHtml in the standard side-menu template. Without a secondary
    // menu (OSS), the raw HTML is inserted directly, so we must include the wrapper.
    if ('getSecondaryMenuConfig' in this) {
      return innerHtml;
    }

    return html`
      <div id="inc2lon-plots-menu" class="side-menu-parent start-hidden">
        <div id="inc2lon-plots-menu-content" class="side-menu">
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

  // Bridge for legacy event system
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  // =========================================================================
  // Chart setup
  // =========================================================================

  private initChart_(chartDom: HTMLElement): void {
    if (this.chart) {
      echarts.dispose(this.chart);
    }
    this.chart = echarts.init(chartDom);
    this.chart.on('click', (event) => {
      const eventData = event.data as { id?: number };

      if (typeof eventData?.id === 'number') {
        this.selectSatManager_.selectSat(eventData.id);
      }
    });

    if (this.resizeHandler_) {
      window.removeEventListener('resize', this.resizeHandler_);
    }
    this.resizeHandler_ = () => this.chart?.resize();
    window.addEventListener('resize', this.resizeHandler_);
  }

  refreshPlot_(): void {
    if (!this.chart || !this.isMenuButtonActive) {
      return;
    }

    this.chart.showLoading({
      text: 'Computing satellite positions...',
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
    });
  }

  private renderChart_(data: Inc2LonCountryData[]): void {
    if (!this.chart || !this.isMenuButtonActive) {
      return;
    }

    this.chart.setOption({
      animation: false,
      title: {
        text: 'GEO Inclination vs Longitude Scatter Plot',
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
        formatter: (params) => {
          const d = params.data as {
            name: string;
            value: number[];
          };

          if (!d?.value) {
            return '';
          }

          const color = params.color;

          return `
            <div style="text-align: left;">
              <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-right: 5px;"></div>
                <span style="font-weight: bold;">${d.name}</span>
              </div>
              <div><b>Inclination:</b> ${d.value[1].toFixed(3)}\u00B0</div>
              <div><b>Longitude:</b> ${d.value[0].toFixed(3)}\u00B0</div>
              <div><b>Period:</b> ${d.value[2].toFixed(2)} min</div>
            </div>
          `;
        },
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
        name: 'Inclination (\u00B0)',
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
          start: -180,
          end: 180,
        },
        {
          type: 'slider' as const,
          show: true,
          yAxisIndex: [0],
          left: '93%',
          start: 0,
          end: 65,
        },
        {
          type: 'inside' as const,
          xAxisIndex: [0],
          start: -180,
          end: 180,
        },
        {
          type: 'inside' as const,
          yAxisIndex: [0],
          start: 0,
          end: 65,
        },
      ],
      visualMap: [
        {
          left: 'left',
          top: '10%',
          dimension: 2,
          min: this.currentFilters_.minPeriod,
          max: this.currentFilters_.maxPeriod,
          itemWidth: 30,
          itemHeight: 500,
          calculable: true,
          precision: 0.05,
          text: ['Period (minutes)'],
          textGap: 30,
          textStyle: {
            color: '#fff',
          },
          inRange: {
            // symbolSize: [10, 70],
          },
          outOfRange: {
            // symbolSize: [10, 70],
            opacity: 0,
            symbol: 'none',
          },
          controller: {
            inRange: {
              color: ['#41577c'],
            },
            outOfRange: {
              color: ['#999'],
            },
          },
        },
      ],
      series: data.map((country) => ({
        type: 'scatter',
        name: country.name,
        data: country.value?.map((item) => ({
          name: item[3],
          id: item[4],
          value: [item[1], item[0], item[2]],
        })),
        symbolSize: 12,
        itemStyle: {
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.8)',
        },
        emphasis: {
          itemStyle: {
            color: '#fff',
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

      ctx.drawImage(chartImg, 0, 0);

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

      link.download = 'inc2lon-scatter.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    chartImg.src = chartDataUrl;
  }

  // =========================================================================
  // Async data gathering (chunked to prevent UI jank)
  // =========================================================================

  private getPlotDataAsync_(filters: Inc2LonFilters): Promise<Inc2LonCountryData[]> {
    return new Promise((resolve) => {
      const catalogManager = ServiceLocator.getCatalogManager();
      const now = ServiceLocator.getTimeManager().simulationTimeObj;
      const objData = catalogManager.objectCache;
      const allowedTypes = Inc2LonPlots.buildAllowedTypes_(filters);

      // Pre-filter to find matching object indices
      const matchingIndices: number[] = [];

      for (let i = 0; i < objData.length; i++) {
        const obj = objData[i];

        if (!obj.isSatellite()) {
          continue;
        }
        if (!allowedTypes.has(obj.type)) {
          continue;
        }

        const sat = obj as Satellite;

        // For payloads, check active/inactive status
        if (obj.type === SpaceObjectType.PAYLOAD) {
          const isActive = sat.status === PayloadStatus.OPERATIONAL;

          if (isActive && !filters.activePayloads) {
            continue;
          }
          if (!isActive && !filters.inactivePayloads) {
            continue;
          }
        }

        if (sat.eccentricity > filters.maxEccentricity) {
          continue;
        }
        if (sat.period < filters.minPeriod) {
          continue;
        }
        if (sat.period > filters.maxPeriod) {
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

        matchingIndices.push(i);
      }

      // Build dynamic top-N country lookup
      const countryCounts: Record<string, number> = {};

      for (const idx of matchingIndices) {
        const sat = objData[idx] as Satellite;

        countryCounts[sat.country] = (countryCounts[sat.country] || 0) + 1;
      }
      const topCountries = Inc2LonPlots.buildTopCountries_(countryCounts);

      // Group data by country display name
      const countryBuckets = new Map<string, Inc2LonDataItem[]>();
      let offset = 0;

      const processChunk = () => {
        const end = Math.min(offset + Inc2LonPlots.chunkSize_, matchingIndices.length);

        for (let i = offset; i < end; i++) {
          const sat = objData[matchingIndices[i]] as Satellite;
          const lla = sat.lla(now);

          if (!lla) {
            continue;
          }

          const displayName = topCountries.get(sat.country) ?? 'Other';

          if (!countryBuckets.has(displayName)) {
            countryBuckets.set(displayName, []);
          }
          countryBuckets.get(displayName)!.push([sat.inclination, lla.lon, sat.period, sat.name, sat.id]);
        }

        offset = end;

        if (offset < matchingIndices.length && this.isMenuButtonActive) {
          setTimeout(processChunk, 0);
        } else {
          const result: Inc2LonCountryData[] = [];

          for (const [name, value] of countryBuckets) {
            result.push({ name, value });
          }
          resolve(result);
        }
      };

      processChunk();
    });
  }

  static buildAllowedTypes_(filters: Inc2LonFilters): Set<SpaceObjectType> {
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
    const topCodes = sorted.slice(0, Inc2LonPlots.topCountryCount_).map(([code]) => code);
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

}
