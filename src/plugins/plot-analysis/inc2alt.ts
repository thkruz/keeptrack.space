import { GetSatType, MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { CatalogSource, PayloadStatus, Satellite, SpaceObjectType } from '@ootk/src/main';
import waterfall2Png from '@public/img/icons/waterfall2.png';
import * as echarts from 'echarts';
import 'echarts-gl';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './inc2alt.css';

// Constellation detection patterns
const CONSTELLATION_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'Starlink', regex: /STARLINK/iu },
  { name: 'OneWeb', regex: /ONEWEB/iu },
  { name: 'Iridium', regex: /IRIDIUM/iu },
  { name: 'Orbcomm', regex: /ORBCOMM/iu },
  { name: 'Globalstar', regex: /GLOBALSTAR/iu },
  { name: 'Planet', regex: /FLOCK|DOVE|SKYSAT|PELICAN/iu },
  { name: 'Spire', regex: /LEMUR|SPIRE/iu },
];

/**
 * Detect constellation from satellite name
 */
const detectConstellation = (name: string): string => {
  for (const pattern of CONSTELLATION_PATTERNS) {
    if (pattern.regex.test(name)) {
      return pattern.name;
    }
  }

  return 'Other';
};

/** Extended data tuple: [inclination, altitude, period, name, id, raan, eccentricity, country] */
type Inc2AltDataItem = [number, number, number, string, number, number, number, string];

interface Inc2AltConstellationData {
  name: string;
  value: Inc2AltDataItem[];
}

/** Filter settings for the Inc2Alt scatter plot */
export interface Inc2AltFilters {
  activePayloads: boolean;
  inactivePayloads: boolean;
  rocketBodies: boolean;
  debris: boolean;
  celestrak: boolean;
  vimpel: boolean;
  minAltitude: number;
  maxAltitude: number;
  minInclination: number;
  maxInclination: number;
  maxPeriod: number;
}

export class Inc2AltPlots extends KeepTrackPlugin {
  readonly id = 'Inc2AltPlots';
  dependencies_: string[] = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager;
  }

  // =========================================================================
  // Plugin-specific properties
  // =========================================================================

  protected readonly plotCanvasId_ = 'plot-analysis-chart-inc2alt';
  chart: echarts.ECharts | null = null;
  private resizeHandler_: (() => void) | null = null;

  protected currentFilters_: Inc2AltFilters = {
    activePayloads: true,
    inactivePayloads: false,
    rocketBodies: false,
    debris: false,
    celestrak: true,
    vimpel: false,
    minAltitude: 70,
    maxAltitude: 3000,
    minInclination: 0,
    maxInclination: 180,
    maxPeriod: 250,
  };

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'inc2alt-plots-icon',
      label: t7e('plugins.Inc2AltPlots.bottomIconLabel'),
      image: waterfall2Png,
      menuMode: [MenuMode.ANALYSIS, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'inc2alt-plots-menu',
      title: t7e('plugins.Inc2AltPlots.title'),
      html: this.buildSideMenuHtml_(),
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.Inc2AltPlots.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.Inc2AltPlots.help.overview'),
          image: {
            src: 'img/help/plot-analysis/inc2alt-menu.png',
            alt: t7e('plugins.Inc2AltPlots.help.imgAlt'),
            caption: t7e('plugins.Inc2AltPlots.help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.Inc2AltPlots.help.howToUse'),
        },
      ],
      tips: [t7e('plugins.Inc2AltPlots.help.tip1'), t7e('plugins.Inc2AltPlots.help.tip2')],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'I',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  private buildSideMenuHtml_(): string {
    const innerHtml = html`
      <div id="${this.plotCanvasId_}" class="plot-analysis-chart plot-analysis-menu-maximized"></div>
      <div id="inc2alt-stats">
        <div id="inc2alt-total-count">--</div>
        <div id="inc2alt-constellation-counts"></div>
      </div>
    `;

    // When a secondary menu exists (pro), generateSideMenuHtml_() in the base plugin
    // wraps sideMenuElementHtml in the standard side-menu template. Without a secondary
    // menu (OSS), the raw HTML is inserted directly, so we must include the wrapper.
    if ('getSecondaryMenuConfig' in this) {
      return innerHtml;
    }

    return html`
      <div id="inc2alt-plots-menu" class="side-menu-parent start-hidden plot-analysis-menu-normal">
        <div id="plot-analysis-content" class="side-menu">
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

    this.refreshPlot_();
  }

  refreshPlot_(): void {
    if (!this.isMenuButtonActive) {
      return;
    }

    const chartDom = getEl(this.plotCanvasId_);

    if (!chartDom) {
      return;
    }

    const plotData = this.getPlotData();

    this.createPlot(plotData, chartDom);
    this.updateStatistics_(plotData);
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

  protected updateStatistics_(data: Inc2AltConstellationData[]): void {
    const totalEl = getEl('inc2alt-total-count');
    const countsEl = getEl('inc2alt-constellation-counts');

    if (!totalEl || !countsEl) {
      return;
    }

    // Calculate total
    let total = 0;
    const counts: { name: string; count: number }[] = [];

    data.forEach((group) => {
      const count = group.value?.length || 0;

      total += count;
      if (count > 0) {
        counts.push({ name: group.name, count });
      }
    });

    // Sort by count descending
    counts.sort((a, b) => b.count - a.count);

    // Update total
    totalEl.textContent = `${t7e('plugins.Inc2AltPlots.labels.totalLeoPayloads' as Parameters<typeof t7e>[0])}: ${total}`;

    // Update constellation breakdown using DOM API
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

  // Bridge for legacy event system
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  createPlot(data: Inc2AltConstellationData[], chartDom: HTMLElement) {
    // Dont Load Anything if the Chart is Closed
    if (!this.isMenuButtonActive) {
      return;
    }

    // Delete any old charts and start fresh
    if (this.chart) {
      echarts.dispose(this.chart);
    }
    this.chart = echarts.init(chartDom);
    this.chart.on('click', (event) => {
      const eventData = event.data as { id?: number };

      if (eventData?.id) {
        this.selectSatManager_.selectSat(eventData.id);
      }
    });

    // Setup resize handler
    if (this.resizeHandler_) {
      window.removeEventListener('resize', this.resizeHandler_);
    }
    this.resizeHandler_ = () => this.chart?.resize();
    window.addEventListener('resize', this.resizeHandler_);

    // Setup Chart - use notMerge to ensure colors reset properly on reopen
    this.chart.setOption({
      title: {
        text: 'Inclination vs Altitude Scatter Plot',
        textStyle: {
          fontSize: 16,
          color: '#fff',
        },
      },
      legend: {
        show: true,
        textStyle: {
          color: '#fff',
        },
      },
      tooltip: {
        formatter: (params) => {
          const d = params.data as {
            name: string;
            value: number[];
            constellation: string;
            country: string;
            raan: number;
            ecc: number;
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
              <div><b>Constellation:</b> ${d.constellation}</div>
              <div><b>Country:</b> ${d.country || 'Unknown'}</div>
              <div><b>Altitude:</b> ${d.value[0].toFixed(0)} km</div>
              <div><b>Inclination:</b> ${d.value[1].toFixed(2)}°</div>
              <div><b>Period:</b> ${d.value[2].toFixed(1)} min</div>
              <div><b>RAAN:</b> ${d.raan?.toFixed(1) ?? 'N/A'}°</div>
              <div><b>Eccentricity:</b> ${d.ecc?.toFixed(5) ?? 'N/A'}</div>
            </div>
          `;
        },
      },
      xAxis: {
        name: 'Altitude (km)',
        type: 'value',
        position: 'bottom',
      },
      yAxis: {
        name: 'Inclination (°)',
        type: 'value',
        position: 'left',
      },
      zAxis: {
        name: 'Period (min)',
        type: 'value',
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          start: -180,
          end: 180,
        },
        {
          type: 'slider',
          show: true,
          yAxisIndex: [0],
          left: '93%',
          start: 0,
          end: 65,
        },
        {
          type: 'inside',
          xAxisIndex: [0],
          start: -180,
          end: 180,
        },
        {
          type: 'inside',
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
          min: 60,
          max: 250,
          itemWidth: 30,
          itemHeight: 500,
          calculable: true,
          precision: 0.05,
          text: ['Period (min)'],
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
      series: data.map((group) => ({
        type: 'scatter',
        name: group.name,
        data: group.value?.map((item) => ({
          name: item[3],
          id: item[4],
          value: [item[1], item[0], item[2]],
          raan: item[5],
          ecc: item[6],
          country: item[7],
          constellation: group.name,
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

  getPlotData(): Inc2AltConstellationData[] {
    // Group by constellation instead of country
    const constellations: Record<string, Inc2AltDataItem[]> = {
      Starlink: [],
      OneWeb: [],
      Iridium: [],
      Orbcomm: [],
      Globalstar: [],
      Planet: [],
      Spire: [],
      Other: [],
    };

    const catalogManager = ServiceLocator.getCatalogManager();
    const now = ServiceLocator.getTimeManager().simulationTimeObj;
    const filters = this.currentFilters_;
    const allowedTypes = Inc2AltPlots.buildAllowedTypes_(filters);

    catalogManager.objectCache.forEach((obj) => {
      if (!allowedTypes.has(obj.type)) {
        return;
      }

      // For payloads, check active/inactive status
      if (obj.type === SpaceObjectType.PAYLOAD) {
        const sat = obj as Satellite;
        const isActive = sat.status === PayloadStatus.OPERATIONAL;

        if (isActive && !filters.activePayloads) {
          return;
        }
        if (!isActive && !filters.inactivePayloads) {
          return;
        }
      }

      let sat = obj as Satellite;

      if (sat.period > filters.maxPeriod) {
        return;
      }
      if (sat.inclination < filters.minInclination || sat.inclination > filters.maxInclination) {
        return;
      }

      // Source filter
      if (sat.source === CatalogSource.VIMPEL && !filters.vimpel) {
        return;
      }
      if (sat.source !== CatalogSource.VIMPEL && !filters.celestrak) {
        return;
      }

      const satWithPos = catalogManager.getSat(sat.id, GetSatType.POSITION_ONLY);

      if (!satWithPos) {
        return;
      }

      sat = satWithPos;

      const alt = sat.lla(now)?.alt ?? 0;

      if (alt < filters.minAltitude || alt > filters.maxAltitude) {
        return;
      }

      const constellation = detectConstellation(sat.name);

      // [inclination, altitude, period, name, id, raan, eccentricity, country]
      constellations[constellation].push([
        sat.inclination,
        alt,
        sat.period,
        sat.name,
        sat.id,
        sat.rightAscension,
        sat.eccentricity,
        sat.country,
      ]);
    });

    // Return constellations with satellites, putting "Other" last
    return [
      { name: 'Starlink', value: constellations.Starlink },
      { name: 'OneWeb', value: constellations.OneWeb },
      { name: 'Iridium', value: constellations.Iridium },
      { name: 'Orbcomm', value: constellations.Orbcomm },
      { name: 'Globalstar', value: constellations.Globalstar },
      { name: 'Planet', value: constellations.Planet },
      { name: 'Spire', value: constellations.Spire },
      { name: 'Other', value: constellations.Other },
    ];
  }

  static buildAllowedTypes_(filters: Inc2AltFilters): Set<SpaceObjectType> {
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
}
