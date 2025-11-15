import { EChartsData, GetSatType } from '@app/engine/core/interfaces';
import { SatMathApi } from '@app/engine/math/sat-math-api';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { Degrees, DetailedSatellite, SpaceObjectType } from '@ootk/src/main';
import scatterPlot4Png from '@public/img/icons/scatter-plot4.png';
import * as echarts from 'echarts';
import 'echarts-gl';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

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


  bottomIconImg = scatterPlot4Png;
  bottomIconCallback = () => {
    const chartDom = getEl(this.plotCanvasId)!;

    this.createPlot(Lat2LonPlots.getPlotData(), chartDom);
  };

  plotCanvasId = 'plot-analysis-chart-lat2lon';
  chart: echarts.ECharts;

  sideMenuElementName = 'lat2lon-plots-menu';
  sideMenuElementHtml: string = html`
  <div id="lat2lon-plots-menu" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal plot-analysis-menu-maximized">
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
          const data = params.value;
          const color = params.color;
          const name = params.name;

          return `
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
              <div style="display: flex; flex-direction: row; flex-wrap: nowrap; justify-content: space-between; align-items: flex-end;">
                <div style="width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-bottom: 5px;"></div>
                <div style="font-weight: bold;"> ${name}</div>
              </div>
              <div><bold>Latitude:</bold> ${data[1].toFixed(3)}°</div>
              <div><bold>Longitude:</bold> ${data[0].toFixed(3)}°</div>
              <div><bold>Time from now:</bold> ${data[2].toFixed(3)} min</div>
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
      series: data.map((item) => ({
        type: 'line',
        name: item.country,
        data: item.data?.map((dataPoint: [number, number, (number | undefined)?]) => ({
          name: item.name,
          id: item.satId,
          value: [dataPoint[2] ?? 0, dataPoint[1], dataPoint[0]],
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
    const data = [] as EChartsData;

    ServiceLocator.getCatalogManager().objectCache.forEach((obj) => {
      if (obj.type !== SpaceObjectType.PAYLOAD) {
        return;
      }
      let sat = obj as DetailedSatellite;

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

      // Compute LLA for each object
      sat = ServiceLocator.getCatalogManager().getObject(sat.id, GetSatType.POSITION_ONLY) as DetailedSatellite;
      const plotPoints = SatMathApi.getLlaOfCurrentOrbit(sat, 24);
      const plotData: [number, Degrees, Degrees][] = [];

      const now = ServiceLocator.getTimeManager().simulationTimeObj;

      plotPoints.forEach((point) => {
        const pointTime = (point.time - now.getTime()) / 1000 / 60;

        if (pointTime > 1440 || pointTime < 0) {
          return;
        }
        plotData.push([pointTime, point.lat, point.lon]);
      });
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
