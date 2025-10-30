import { EChartsData, MenuMode } from '@app/engine/core/interfaces';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { DetailedSatellite, SpaceObjectType } from '@ootk/src/main';
import barChart4BarsPng from '@public/img/icons/bar-chart-4-bars.png';
import * as echarts from 'echarts';
import 'echarts-gl';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class Inc2LonPlots extends KeepTrackPlugin {
  readonly id = 'Inc2LonPlots';
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

  bottomIconImg = barChart4BarsPng;
  bottomIconCallback = () => {
    const chartDom = getEl(this.plotCanvasId)!;

    this.createPlot(Inc2LonPlots.getPlotData(), chartDom);
  };

  menuMode: MenuMode[] = [MenuMode.ANALYSIS, MenuMode.ALL];

  plotCanvasId = 'plot-analysis-chart-inc2lon';
  chart: echarts.ECharts;

  sideMenuElementName = 'inc2lon-plots-menu';
  sideMenuElementHtml: string = html`
  <div id="inc2lon-plots-menu" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal plot-analysis-menu-maximized">
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
        text: 'GEO Inclination vs Longitude Scatter Plot',
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
              <div><bold>Longitude:</bold> ${data[0].toFixed(3)}°</div>
              <div><bold>Period:</bold> ${data[2].toFixed(2)} min</div>
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
    const india = [] as unknown as [number, number, number, string, number][];
    const japan = [] as unknown as [number, number, number, string, number][];
    const other = [] as unknown as [number, number, number, string, number][];

    ServiceLocator.getCatalogManager().objectCache.forEach((obj) => {
      if (obj.type !== SpaceObjectType.PAYLOAD) {
        return;
      }
      const sat = obj as DetailedSatellite;

      // Only GEO objects
      if (sat.eccentricity > Inc2LonPlots.maxEccentricity_) {
        return;
      }
      if (sat.period < Inc2LonPlots.minSatellitePeriod_) {
        return;
      }
      if (sat.period > Inc2LonPlots.maxSatellitePeriod_) {
        return;
      }
      if (sat.inclination > Inc2LonPlots.maxInclination_) {
        return;
      }

      // Update Position
      const now = ServiceLocator.getTimeManager().simulationTimeObj;
      const lla = sat.lla(now);

      switch (sat.country) {
        case 'US':
          usa.push([sat.inclination, lla.lon, sat.period, sat.name, sat.id]);

          return;
        case 'RU':
        case 'USSR':
          russia.push([sat.inclination, lla.lon, sat.period, sat.name, sat.id]);

          return;
        case 'F':
          france.push([sat.inclination, lla.lon, sat.period, sat.name, sat.id]);

          return;

        case 'CN':
          china.push([sat.inclination, lla.lon, sat.period, sat.name, sat.id]);

          return;
        case 'IN':
          india.push([sat.inclination, lla.lon, sat.period, sat.name, sat.id]);

          return;

        case 'J':
          japan.push([sat.inclination, lla.lon, sat.period, sat.name, sat.id]);

          return;
        default:
          other.push([sat.inclination, lla.lon, sat.period, sat.name, sat.id]);

      }
    });

    return [
      { name: 'France', value: france },
      { name: 'USA', value: usa },
      { name: 'Other', value: other },
      { name: 'Russia', value: russia },
      { name: 'China', value: china },
      { name: 'India', value: india },
      { name: 'Japan', value: japan },
    ] as unknown as EChartsData;
  }
}
