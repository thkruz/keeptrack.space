import { EChartsData, GetSatType } from '@app/engine/core/interfaces';
import { SatMathApi } from '@app/engine/math/sat-math-api';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { Degrees, DetailedSatellite, SpaceObjectType } from '@ootk/src/main';
import waterfallPng from '@public/img/icons/waterfall.png';
import * as echarts from 'echarts';
import 'echarts-gl';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class Time2LonPlots extends KeepTrackPlugin {
  readonly id = 'Time2LonPlots';
  dependencies_: string[] = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  bottomIconImg = waterfallPng;
  bottomIconCallback = () => {
    if (!this.isMenuButtonActive) {
      return;
    }
    const chartDom = getEl(this.plotCanvasId)!;

    this.createPlot(Time2LonPlots.getPlotData(), chartDom);
  };

  plotCanvasId = 'plot-analysis-chart-time2lon';
  chart: echarts.ECharts;

  sideMenuElementName = 'time2lon-plots-menu';
  sideMenuElementHtml: string = html`
  <div id="time2lon-plots-menu" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal plot-analysis-menu-maximized">
    <div id="plot-analysis-content" class="side-menu" style="height: 80%">
      <div id="${this.plotCanvasId}" class="plot-analysis-chart plot-analysis-menu-maximized"></div>
    </div>
  </div>`;

  addHtml(): void {
    super.addHtml();
  }

  createPlot(data: EChartsData, chartDom: HTMLElement) {
    // Dont Load Anything if the Chart is Closed
    if (!this.isMenuButtonActive) {
      return;
    }

    // Delete any old charts and start fresh
    if (!this.chart) {
      // Setup Configuration
      this.chart = echarts.init(chartDom);
      this.chart.on('click', (event) => {
        if ((event.data as unknown as { id: number })?.id > -1) {
          this.selectSatManager_.selectSat((event.data as unknown as { id: number })?.id);
        }
      });
    }

    // Setup Chart
    this.chart.setOption({
      title: {
        text: 'Time vs Longitude Plot',
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
        formatter: (params: { value: number[]; color: string; name: string; }) => {
          const data = params.value;
          const color = params.color;
          const name = params.name;

          return `
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
              <div style="display: flex; flex-direction: row; flex-wrap: nowrap; justify-content: space-between; align-items: flex-end;">
                <div style="width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-bottom: 5px;"></div>
                <div style="font-weight: bold;"> ${name}</div>
              </div>
              <div><bold>Time from now:</bold> ${data[1].toFixed(2)} min</div>
              <div><bold>Longitude:</bold> ${data[0].toFixed(3)}°</div>
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
        name: 'Time from now (min)',
        type: 'value',
        position: 'left',
      },
      zAxis: {
        name: 'Mean Motion',
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
          end: 1440,
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
          end: 1440,
        },
      ],
      /*
       * visualMap: [
       *   {
       *     left: 'left',
       *     top: '10%',
       *     dimension: 2,
       *     min: 0,
       *     max: 18,
       *     itemWidth: 30,
       *     itemHeight: 500,
       *     calculable: true,
       *     precision: 0.05,
       *     text: ['Mean Motion'],
       *     textGap: 30,
       *     textStyle: {
       *       color: '#fff',
       *     },
       *     inRange: {
       *       // symbolSize: [10, 70],
       *     },
       *     outOfRange: {
       *       // symbolSize: [10, 70],
       *       opacity: 0,
       *       symbol: 'none',
       *     },
       *     controller: {
       *       inRange: {
       *         color: ['#41577c'],
       *       },
       *       outOfRange: {
       *         color: ['#999'],
       *       },
       *     },
       *   },
       * ],
       */
      series: data.map((item) => ({
        type: 'line',
        name: item.country,
        data: item.data?.map((dataPoint: {
          0: number;
          1: number;
        }) => ({
          name: item.name,
          id: item.satId,
          value: [dataPoint[1], dataPoint[0]],
        })),
        /*
         * symbolSize: 8,
         * itemStyle: {
         * borderWidth: 1,
         * borderColor: 'rgba(255,255,255,0.8)',
         * },
         */
        emphasis: {
          itemStyle: {
            color: '#fff',
          },
        },
      })),
    });
  }

  static getPlotData(): EChartsData {
    const objData = ServiceLocator.getCatalogManager().objectCache;
    const timeManagerInstance = ServiceLocator.getTimeManager();

    const now = timeManagerInstance.simulationTimeObj.getTime();

    const data = [] as EChartsData;

    objData.forEach((obj) => {
      if (obj.type !== SpaceObjectType.PAYLOAD) {
        return;
      }

      let sat = obj as DetailedSatellite;

      // Taking only GEO objects
      if (sat.eccentricity > 0.1) {
        return;
      }
      if (sat.period < 1240) {
        return;
      }
      if (sat.period > 1640) {
        return;
      }

      sat = ServiceLocator.getCatalogManager().getObject(sat.id, GetSatType.POSITION_ONLY) as DetailedSatellite;
      const plotPoints = SatMathApi.getLlaOfCurrentOrbit(sat, 24);
      const plotData: [number, Degrees][] = [];

      plotPoints.forEach((point) => {
        const pointTime = (point.time - now) / 1000 / 60;

        if (pointTime > 1440 || pointTime < 0) {
          return;
        }
        plotData.push([pointTime, point.lon]);
      });
      let country = '';

      switch (sat.country) {
        case 'United States of America':
        case 'United States':
        case 'US':
        case 'USA':
          country = 'USA';
          break;

        case 'France':
        case 'FR':
          country = 'France';
          break;

        case 'Russian Federation':
        case 'CIS':
        case 'RU':
        case 'SU':
        case 'Russia':
          country = 'Russia';
          break;

        case 'China':
        case 'China, People\'s Republic of':
        case 'Hong Kong Special Administrative Region, China':
        case 'China (Republic)':
        case 'PRC':
        case 'CN':
          country = 'China';
          break;
        case 'Japan':
        case 'JPN':
          country = 'Japan';
          break;
        case 'India':
        case 'IND':
          country = 'India';
          break;
        default:
          country = 'Other';
          break;
      }
      data.push({
        name: sat.name,
        satId: sat.id,
        country,
        data: plotData,
      });
    });

    return data;
  }
}
