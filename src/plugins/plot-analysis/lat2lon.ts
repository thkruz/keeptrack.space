import { GetSatType, MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SatMathApi } from '@app/engine/math/sat-math-api';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { Satellite, SpaceObjectType } from '@ootk/src/main';
import scatterPlot4Png from '@public/img/icons/scatter-plot4.png';
import * as echarts from 'echarts';
import 'echarts-gl';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './lat2lon.css';

interface SatPoint {
  name: string;
  satId: number;
  value: [number, number];
}

export class Lat2LonPlots extends KeepTrackPlugin {
  readonly id = 'Lat2LonPlots';
  dependencies_: string[] = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  private static readonly maxEccentricity_ = 0.1;
  private static readonly minSatellitePeriod_ = 1240;
  private static readonly maxSatellitePeriod_ = 1640;
  private static readonly maxInclination_ = 17;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  menuMode: MenuMode[] = [MenuMode.ANALYSIS, MenuMode.ALL];

  bottomIconImg = scatterPlot4Png;
  bottomIconCallback = () => {
    const chartDom = getEl(this.plotCanvasId)!;

    this.createPlot(Lat2LonPlots.getPlotData(), chartDom);
  };

  plotCanvasId = 'plot-analysis-chart-lat2lon';
  chart: echarts.ECharts;

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.Lat2LonPlots.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.Lat2LonPlots.help.overview'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.Lat2LonPlots.help.howToUse'),
        },
      ],
      tips: [t7e('plugins.Lat2LonPlots.help.tip1')],
    };
  }

  sideMenuElementName = 'lat2lon-plots-menu';
  sideMenuElementHtml: string = html`
  <div id="lat2lon-plots-menu" class="side-menu-parent start-hidden kt-ui-v13">
    <div id="plot-analysis-content" class="side-menu">
      <div id="${this.plotCanvasId}" class="plot-analysis-chart plot-analysis-menu-maximized"></div>
    </div>
  </div>`;

  addHtml(): void {
    super.addHtml();
  }

  createPlot(data: Record<string, SatPoint[]>, chartDom: HTMLElement) {
    // Dont Load Anything if the Chart is Closed
    if (!this.isMenuButtonActive) {
      return;
    }

    // Delete any old charts and start fresh
    if (!this.chart) {
      // Setup Configuration
      this.chart = echarts.init(chartDom);
      this.chart.on('click', (event) => {
        const point = event.data as SatPoint | undefined;

        if (point?.satId) {
          this.selectSatManager_.selectSat(point.satId);
        }
      });
    }

    // Setup Chart
    this.chart.setOption({
      animation: false,
      title: {
        text: 'Latitude vs Longitude Plot',
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
          const point = params.data as SatPoint;
          const color = params.color;

          return `
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
              <div style="display: flex; flex-direction: row; flex-wrap: nowrap; justify-content: space-between; align-items: flex-end;">
                <div style="width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-bottom: 5px;"></div>
                <div style="font-weight: bold;"> ${point.name}</div>
              </div>
              <div><bold>Latitude:</bold> ${point.value[1].toFixed(3)}°</div>
              <div><bold>Longitude:</bold> ${point.value[0].toFixed(3)}°</div>
            </div>
          `;
        },
      },
      xAxis: {
        name: 'Longitude (°)',
        type: 'value',
        position: 'bottom',
      },
      yAxis: {
        name: 'Latitude (°)',
        type: 'value',
        position: 'left',
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
          start: -50,
          end: 50,
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
          start: -50,
          end: 50,
        },
      ],
      series: Object.entries(data).map(([country, points]) => ({
        type: 'scatter',
        name: country,
        large: true,
        data: points,
        symbolSize: 8,
        emphasis: {
          itemStyle: {
            color: '#fff',
          },
        },
      })),
    });
  }

  static getPlotData(): Record<string, SatPoint[]> {
    const catalogManager = ServiceLocator.getCatalogManager();
    const countryData: Record<string, SatPoint[]> = {};

    catalogManager.objectCache.forEach((obj) => {
      if (obj.type !== SpaceObjectType.PAYLOAD) {
        return;
      }
      let sat = obj as Satellite;

      // Only GEO objects
      if (sat.eccentricity > Lat2LonPlots.maxEccentricity_) {
        return;
      }
      if (sat.period < Lat2LonPlots.minSatellitePeriod_) {
        return;
      }
      if (sat.period > Lat2LonPlots.maxSatellitePeriod_) {
        return;
      }
      if (sat.inclination > Lat2LonPlots.maxInclination_) {
        return;
      }

      // Get current position (single orbit point)
      sat = catalogManager.getObject(sat.id, GetSatType.POSITION_ONLY) as Satellite;
      const llaPoints = SatMathApi.getLlaOfCurrentOrbit(sat, 1);

      if (!llaPoints || llaPoints.length === 0) {
        return;
      }
      const lla = llaPoints[0];

      let country = '';

      switch (sat.country) {
        case 'US':
          country = 'USA';
          break;
        case 'F':
          country = 'France';
          break;
        case 'RU':
        case 'USSR':
          country = 'Russia';
          break;
        case 'CN':
          country = 'China';
          break;
        case 'IN':
          country = 'India';
          break;
        case 'J':
          country = 'Japan';
          break;
        default:
          country = 'Other';
          break;
      }

      if (!countryData[country]) {
        countryData[country] = [];
      }
      countryData[country].push({
        name: sat.name,
        satId: sat.id,
        value: [lla.lon, lla.lat],
      });
    });

    return countryData;
  }
}
