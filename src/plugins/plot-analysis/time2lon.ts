import { EChartsData, GetSatType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { SatMathApi } from '@app/singletons/sat-math-api';
import linePlotPng from '@public/img/icons/line-plot.png';
import * as echarts from 'echarts';
import 'echarts-gl';
import { DetailedSatellite, SpaceObjectType } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class Time2LonPlots extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Time vs Lon Plots';
  dependencies: string[] = [SelectSatManager.PLUGIN_NAME];
  private selectSatManager_: SelectSatManager;

  constructor() {
    super(Time2LonPlots.PLUGIN_NAME);
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
  }

  bottomIconElementName = 'time2lon-plots-bottom-icon';
  bottomIconLabel = 'Time vs Lon Plot';
  bottomIconImg = linePlotPng;
  bottomIconCallback = () => {
    const chartDom = getEl(this.plotCanvasId);
    this.createPlot(Time2LonPlots.getPlotData(), chartDom);
  };

  plotCanvasId = 'plot-analysis-chart-time2lon';
  chart: echarts.ECharts;

  helpTitle = `Time Vs Lon Plot Menu`;
  helpBody = keepTrackApi.html`
  <p>
    The Time vs Lon Plot Menu is used for plotting the time vs longitude in the GEO belt.
  </p>`;

  sideMenuElementName = 'time2lon-plots-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="time2lon-plots-menu" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal plot-analysis-menu-maximized">
    <div id="plot-analysis-content" class="side-menu">
      <div id="${this.plotCanvasId}" class="plot-analysis-chart plot-analysis-menu-maximized"></div>
    </div>
  </div>`;

  addHtml(): void {
    super.addHtml();
  }

  createPlot(data: EChartsData, chartDom: HTMLElement) {
    // Dont Load Anything if the Chart is Closed
    if (!this.isMenuButtonActive) return;

    // Delete any old charts and start fresh
    if (!this.chart) {
      // Setup Configuration
      this.chart = echarts.init(chartDom);
      this.chart.on('click', (event) => {
        if ((event.data as any)?.id) {
          this.selectSatManager_.selectSat((event.data as any).id);
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
      tooltip: {},
      xAxis: {
        name: 'Longitude',
        type: 'value',
        position: 'bottom',
      },
      yAxis: {
        name: 'Time',
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
      // visualMap: [
      //   {
      //     left: 'left',
      //     top: '10%',
      //     dimension: 2,
      //     min: 0,
      //     max: 18,
      //     itemWidth: 30,
      //     itemHeight: 500,
      //     calculable: true,
      //     precision: 0.05,
      //     text: ['Mean Motion'],
      //     textGap: 30,
      //     textStyle: {
      //       color: '#fff',
      //     },
      //     inRange: {
      //       // symbolSize: [10, 70],
      //     },
      //     outOfRange: {
      //       // symbolSize: [10, 70],
      //       opacity: 0,
      //       symbol: 'none',
      //     },
      //     controller: {
      //       inRange: {
      //         color: ['#41577c'],
      //       },
      //       outOfRange: {
      //         color: ['#999'],
      //       },
      //     },
      //   },
      // ],
      series: data.map((item) => ({
        type: 'line',
        name: item.name,
        data: item.data.map((dataPoint: any) => ({
          name: item.country,
          id: item.satId,
          value: [dataPoint[1], dataPoint[0]],
        })),
        // symbolSize: 8,
        // itemStyle: {
        // borderWidth: 1,
        // borderColor: 'rgba(255,255,255,0.8)',
        // },
        emphasis: {
          itemStyle: {
            color: '#fff',
          },
        },
      })),
    });
  }

  static getPlotData(): EChartsData {
    const objData = keepTrackApi.getCatalogManager().objectCache;
    const timeManagerInstance = keepTrackApi.getTimeManager();

    const now = timeManagerInstance.simulationTimeObj.getTime();

    const data = [] as EChartsData;
    objData.forEach((obj) => {
      if (obj.type !== SpaceObjectType.PAYLOAD) return;

      let sat = obj as DetailedSatellite;

      if (sat.eccentricity > 0.1) return;
      if (sat.period < 1240) return;
      if (sat.period > 1640) return;
      switch (sat.country) {
        case 'United States of America':
        case 'United States':
        case 'US':
        case 'Russian Federation':
        case 'CIS':
        case 'Russia':
        case 'China':
        case `China, People's Republic of`:
        case `Hong Kong Special Administrative Region, China`:
        case 'China (Republic)':
          break;
        default:
          return;
      }
      sat = keepTrackApi.getCatalogManager().getObject(sat.id, GetSatType.POSITION_ONLY) as DetailedSatellite;
      const plotPoints = SatMathApi.getLlaOfCurrentOrbit(sat, 24);
      const plotData = [];
      plotPoints.forEach((point) => {
        const pointTime = (point.time - now) / 1000 / 60;
        if (pointTime > 1440 || pointTime < 0) return;
        plotData.push([pointTime, point.lon]);
      });
      data.push({
        name: sat.name,
        satId: sat.id,
        country: sat.country,
        data: plotData,
      });
    });
    return data;
  }
}

export const time2LonPlotsPlugin = new Time2LonPlots();
