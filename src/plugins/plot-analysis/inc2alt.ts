import { EChartsData, GetSatType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import scatterPlotPng from '@public/img/icons/scatter-plot.png';
import * as echarts from 'echarts';
import 'echarts-gl';
import { DetailedSatellite, SpaceObjectType } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class Inc2AltPlots extends KeepTrackPlugin {
  readonly id = 'Inc2AltPlots';
  dependencies_: string[] = [SelectSatManager.name];
  private selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
  }


  bottomIconLabel = 'Inc vs Alt Plot';
  bottomIconImg = scatterPlotPng;
  bottomIconCallback = () => {
    const chartDom = getEl(this.plotCanvasId);

    this.createPlot(Inc2AltPlots.getPlotData(), chartDom);
  };

  plotCanvasId = 'plot-analysis-chart-inc2alt';
  chart: echarts.ECharts;

  helpTitle = 'Inc vs Alt Plot Menu';
  helpBody = keepTrackApi.html`
  <p>
  The Inc vs Alt Plot Menu is used for plotting the inclination vs altitude.
  </p>`;

  sideMenuElementName = 'inc2alt-plots-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="inc2alt-plots-menu" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal plot-analysis-menu-maximized">
    <div id="plot-analysis-content" class="side-menu">
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
        if ((event.data as any)?.id) {
          this.selectSatManager_.selectSat((event.data as any).id);
        }
      });
    }

    // Setup Chart
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
      tooltip: {},
      xAxis: {
        name: 'Inclination',
        type: 'value',
        position: 'bottom',
      },
      yAxis: {
        name: 'Altitude',
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
          min: 80,
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

    keepTrackApi.getCatalogManager().objectCache.forEach((obj) => {
      if (obj.type !== SpaceObjectType.PAYLOAD) {
        return;
      }

      let sat = obj as DetailedSatellite;

      if (sat.period > 250) {
        return;
      }
      sat = keepTrackApi.getCatalogManager().getSat(sat.id, GetSatType.POSITION_ONLY);
      const now = keepTrackApi.getTimeManager().simulationTimeObj;

      if (sat.lla(now).alt < 80) {
        return;
      } // TODO: USE THIS FOR FINDING DECAYS!

      switch (sat.country) {
        case 'United States of America':
        case 'United States':
        case 'US':
          usa.push([sat.lla(now).alt, sat.inclination, sat.period, sat.name, sat.id]);

          return;
        case 'Russian Federation':
        case 'CIS':
        case 'RU':
        case 'SU':
        case 'Russia':
          russia.push([sat.lla(now).alt, sat.inclination, sat.period, sat.name, sat.id]);

          return;
        case 'China':
        case 'China, People\'s Republic of':
        case 'Hong Kong Special Administrative Region, China':
        case 'China (Republic)':
        case 'PRC':
        case 'CN':
          china.push([sat.lla(now).alt, sat.inclination, sat.period, sat.name, sat.id]);

          return;
        default:
          other.push([sat.lla(now).alt, sat.inclination, sat.period, sat.name, sat.id]);

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

export const inc2AltPlotPlugin = new Inc2AltPlots();
