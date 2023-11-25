import scatterPlotPng from '@app/img/icons/scatter-plot.png';
import { EChartsData, GetSatType, SatObject } from '@app/js/interfaces';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { RAD2DEG } from '@app/js/lib/constants';
import { getEl } from '@app/js/lib/get-el';
import { CoordinateTransforms } from '@app/js/static/coordinate-transforms';
import * as echarts from 'echarts';
import 'echarts-gl';
import { SpaceObjectType } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class Inc2LonPlots extends KeepTrackPlugin {
  dependencies: string[] = [SelectSatManager.PLUGIN_NAME];
  bottomIconElementName = 'inc2lon-plots-bottom-icon';
  bottomIconLabel = 'Inc Vs Lon Plot';
  bottomIconImg = scatterPlotPng;
  bottomIconCallback = () => {
    const chartDom = getEl(this.plotCanvasId);
    this.createPlot(Inc2LonPlots.getPlotData(), chartDom);
  };

  plotCanvasId = 'plot-analysis-chart-inc2lon';
  chart: echarts.ECharts;

  helpTitle = `Inc Vs Lon Plot Menu`;
  helpBody = keepTrackApi.html`
  <p>
    The Inc Vs Lon Plot Menu is used for plotting the inclination vs longitude in the GEO belt.
  </p>`;

  sideMenuElementName = 'inc2lon-plots-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="inc2lon-plots-menu" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal plot-analysis-menu-maximized">
    <div id="plot-analysis-content" class="side-menu">
      <div id="${this.plotCanvasId}" class="plot-analysis-chart plot-analysis-menu-maximized"></div>
    </div>
  </div>`;

  static PLUGIN_NAME = 'Inc Vs Lon Plots';
  constructor() {
    super(Inc2LonPlots.PLUGIN_NAME);
  }

  addHtml(): void {
    super.addHtml();
  }

  createPlot(data: EChartsData, chartDom: HTMLElement) {
    // Dont Load Anything if the Chart is Closed
    if (!this.isMenuButtonEnabled) return;

    // Delete any old charts and start fresh
    if (!this.chart) {
      // Setup Configuration
      this.chart = echarts.init(chartDom);
      this.chart.on('click', (event) => {
        if ((event.data as any)?.id) {
          const catalogManagerInstance = keepTrackApi.getCatalogManager();
          catalogManagerInstance.selectSat((event.data as any).id);
        }
      });
    }

    // Setup Chart
    this.chart.setOption({
      title: {
        text: 'Inclination vs Longitude Scatter Plot',
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
      tooltip: {},
      xAxis: {
        name: 'Longitude',
        type: 'value',
        position: 'bottom',
      },
      yAxis: {
        name: 'Inclination',
        type: 'value',
        position: 'left',
      },
      zAxis: {
        name: 'Period',
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
          min: 1240,
          max: 1640,
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
        data: country.value.map((item: any) => ({
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
    });
  }

  static getPlotData(): EChartsData {
    const china = [];
    const usa = [];
    const russia = [];
    const other = [];

    (<SatObject[]>keepTrackApi.getCatalogManager().satData).forEach((sat) => {
      if (!sat.TLE1 || sat.type !== SpaceObjectType.PAYLOAD) return;
      if (sat.eccentricity > 0.1) return;
      if (sat.period < 1240) return;
      if (sat.period > 1640) return;
      if (sat.inclination * RAD2DEG > 17) return;
      sat = keepTrackApi.getCatalogManager().getSat(sat.id, GetSatType.POSITION_ONLY);
      sat = { ...sat, ...CoordinateTransforms.eci2lla(sat.position, keepTrackApi.getTimeManager().simulationTimeObj) };
      switch (sat.country) {
        case 'United States of America':
        case 'United States':
        case 'US':
          usa.push([sat.inclination * RAD2DEG, sat.lon, sat.period, sat.name, sat.id]);
          return;
        case 'Russian Federation':
        case 'CIS':
        case 'Russia':
          russia.push([sat.inclination * RAD2DEG, sat.lon, sat.period, sat.name, sat.id]);
          return;
        case 'China':
        case `China, People's Republic of`:
        case `Hong Kong Special Administrative Region, China`:
        case 'China (Republic)':
          china.push([sat.inclination * RAD2DEG, sat.lon, sat.period, sat.name, sat.id]);
          return;
        default:
          other.push([sat.inclination * RAD2DEG, sat.lon, sat.period, sat.name, sat.id]);
          return;
      }
    });

    return [
      { name: 'USA', value: usa },
      { name: 'Other', value: other },
      { name: 'Russia', value: russia },
      { name: 'China', value: china },
    ] as EChartsData;
  }
}

export const inc2LonPlotPlugin = new Inc2LonPlots();
