import { EChartsData, GetSatType, MenuMode } from '@app/engine/core/interfaces';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { DetailedSatellite, SpaceObjectType } from '@ootk/src/main';
import waterfall2Png from '@public/img/icons/waterfall2.png';
import * as echarts from 'echarts';
import 'echarts-gl';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class Inc2AltPlots extends KeepTrackPlugin {
  readonly id = 'Inc2AltPlots';
  dependencies_: string[] = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  bottomIconImg = waterfall2Png;
  bottomIconCallback = () => {
    if (!this.isMenuButtonActive) {
      return;
    }
    const chartDom = getEl(this.plotCanvasId)!;

    this.createPlot(Inc2AltPlots.getPlotData(), chartDom);
  };

  menuMode: MenuMode[] = [MenuMode.ANALYSIS, MenuMode.ALL];

  plotCanvasId = 'plot-analysis-chart-inc2alt';
  chart: echarts.ECharts;

  sideMenuElementName = 'inc2alt-plots-menu';
  sideMenuElementHtml: string = html`
  <div id="inc2alt-plots-menu" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal plot-analysis-menu-maximized">
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
          const data = params.value;
          const color = params.color;
          const name = params.name;

          return `
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
              <div style="display: flex; flex-direction: row; flex-wrap: nowrap; justify-content: space-between; align-items: flex-end;">
                <div style="width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-bottom: 5px;"></div>
                <div style="font-weight: bold;"> ${name}</div>
              </div>
              <div><bold>Inclination:</bold> ${data[1].toFixed(3)}°</div>
              <div><bold>Altitude:</bold> ${data[0].toFixed(3)} km</div>
              <div><bold>Period:</bold> ${data[2].toFixed(2)} min</div>
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
    });
  }

  static getPlotData(): EChartsData {
    const china = [] as unknown as [number, number, number, string, number][];
    const usa = [] as unknown as [number, number, number, string, number][];
    const france = [] as unknown as [number, number, number, string, number][];
    const russia = [] as unknown as [number, number, number, string, number][];
    const other = [] as unknown as [number, number, number, string, number][];

    ServiceLocator.getCatalogManager().objectCache.forEach((obj) => {
      if (obj.type !== SpaceObjectType.PAYLOAD) {
        return;
      }

      let sat = obj as DetailedSatellite;

      if (sat.period > 250) {
        return;
      }

      sat = ServiceLocator.getCatalogManager().getSat(sat.id, GetSatType.POSITION_ONLY)!;
      const now = ServiceLocator.getTimeManager().simulationTimeObj;

      const alt = sat.lla(now)?.alt ?? 0;

      if (alt < 70) {
        return;
      } // TODO: USE THIS FOR FINDING DECAYS!

      switch (sat.country) {
        case 'United States of America':
        case 'United States':
        case 'US':
        case 'USA':
          usa.push([sat.inclination, alt, sat.period, sat.name, sat.id]);

          return;
        case 'France':
        case 'FR':
        case 'F':
          france.push([sat.inclination, alt, sat.period, sat.name, sat.id]);

          return;

        case 'Russian Federation':
        case 'CIS':
        case 'RU':
        case 'SU':
        case 'Russia':
          russia.push([sat.inclination, alt, sat.period, sat.name, sat.id]);

          return;
        case 'China':
        case 'China, People\'s Republic of':
        case 'Hong Kong Special Administrative Region, China':
        case 'China (Republic)':
        case 'PRC':
        case 'CN':
          china.push([sat.inclination, alt, sat.period, sat.name, sat.id]);

          return;
        default:
          other.push([sat.inclination, alt, sat.period, sat.name, sat.id]);

      }
    });

    return [
      { name: 'France', value: france },
      { name: 'USA', value: usa },
      { name: 'Other', value: other },
      { name: 'Russia', value: russia },
      { name: 'China', value: china },
    ] as unknown as EChartsData;
  }
}
