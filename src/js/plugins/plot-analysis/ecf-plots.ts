import scatterPlotPng3 from '@app/img/icons/scatter-plot3.png';
import { SatObject } from '@app/js/interfaces';
import { KeepTrackApiEvents, keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { SatMathApi } from '@app/js/singletons/sat-math-api';
import * as echarts from 'echarts';
import 'echarts-gl';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

type EChartsOption = echarts.EChartsOption;

export class EcfPlots extends KeepTrackPlugin {
  dependencies: string[] = [SelectSatManager.PLUGIN_NAME];
  bottomIconElementName = 'ecf-plots-bottom-icon';
  bottomIconLabel = 'ECF Plots';
  bottomIconImg = scatterPlotPng3;
  bottomIconCallback = () => {
    const chartDom = getEl('plot-analysis-chart-ecf');
    this.createEcfScatterPlot(EcfPlots.getEcfScatterData(), chartDom);
  };

  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  chart: echarts.ECharts;

  helpTitle = `ECF Plots Menu`;
  helpBody = keepTrackApi.html`
  <p>
    The ECF Plots menu allows you to plot the position of a satellite in Earth Centered Fixed (ECF) coordinates.
    This is useful for visualizing the position of a satellite in space.
  </p>`;

  sideMenuElementName = 'ecf-plots-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="ecf-plots-menu" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal">
    <div id="plot-analysis-content" class="side-menu">
      <div id="plot-analysis-chart-ecf" class="plot-analysis-chart"></div>
    </div>
  </div>`;

  dragOptions: clickDragOptions = {
    minWidth: 500,
    maxWidth: 1200,
  };

  static PLUGIN_NAME = 'ECF Plots';
  constructor() {
    super(EcfPlots.PLUGIN_NAME);
  }

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.PLUGIN_NAME,
      cb: (sat: SatObject) => {
        // Skip this if there is no satellite object because the menu isn't open
        if (sat === null || typeof sat === 'undefined') {
          this.hideSideMenus();
        } else {
          const chartDom = getEl('plot-analysis-chart-ecf');
          this.createEcfScatterPlot(EcfPlots.getEcfScatterData(), chartDom);
        }
      },
    });
  }

  createEcfScatterPlot(data, chartDom: HTMLElement) {
    // Dont Load Anything if the Chart is Closed
    if (!this.isMenuButtonEnabled) return;

    // Delete any old charts and start fresh
    if (this.chart) {
      echarts.dispose(this.chart);
    }

    // Setup Configuration
    const app = {
      config: {
        xAxis3D: 'X',
        yAxis3D: 'Y',
        zAxis3D: 'Z',
      },
      configParameters: {} as EChartsOption,
    };

    this.chart = echarts.init(chartDom);
    const schema = [
      { name: 'X', index: 0 },
      { name: 'Y', index: 1 },
      { name: 'Z', index: 2 },
    ];
    const fieldIndices = schema.reduce(function (obj, item): {} {
      obj[item.name] = item.index;
      return obj;
    }, {});
    let fieldNames = schema.map((item) => item.name);
    fieldNames = fieldNames.slice(2, fieldNames.length - 2);
    ['xAxis3D', 'yAxis3D', 'zAxis3D', 'color', 'symbolSize'].forEach((fieldName) => {
      app.configParameters[fieldName] = {
        options: fieldNames,
      };
    });

    // Setup Chart
    this.chart.setOption({
      tooltip: {
        formatter: (params) => {
          const data = params.value;
          const color = params.color;
          // Create a small circle to show the color of the satellite
          return `
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
              <div style="display: flex; flex-direction: row; flex-wrap: nowrap; justify-content: space-between; align-items: flex-end;">
                <div style="width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-bottom: 5px;"></div>
                <div style="font-weight: bold;"> ${params.seriesName}</div>
              </div>
              <div>X: ${data[0].toFixed(2)} km</div>
              <div>Y: ${data[1].toFixed(2)} km</div>
              <div>Z: ${data[2].toFixed(2)} km</div>
            </div>
          `;
        },
      },
      xAxis3D: {
        name: app.config.xAxis3D,
        type: 'value',
      },
      yAxis3D: {
        name: app.config.yAxis3D,
        type: 'value',
      },
      zAxis3D: {
        name: app.config.zAxis3D,
        type: 'value',
      },
      grid3D: {
        axisLine: {
          lineStyle: {
            color: '#fff',
          },
        },
        axisPointer: {
          lineStyle: {
            color: '#ffbd67',
          },
        },
        viewControl: {
          rotateSensitivity: 5,
          distance: 200,
          zoomSensitivity: 2,
        },
      },
      series: data.map((sat) => ({
        type: 'scatter3D',
        name: sat.name,
        dimensions: [app.config.xAxis3D, app.config.yAxis3D, app.config.zAxis3D],
        data: sat.value.map((item: any, idx: number) => ({
          itemStyle: {
            opacity: 1 - idx / sat.value.length, // opacity by time
          },
          value: [item[fieldIndices[app.config.xAxis3D]], item[fieldIndices[app.config.yAxis3D]], item[fieldIndices[app.config.zAxis3D]]],
        })),
        symbolSize: 12,
        // symbol: 'triangle',
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

  static getEcfScatterData() {
    const NUMBER_OF_POINTS = 100;
    const data = [];
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    let sat = catalogManagerInstance.getSat(catalogManagerInstance.selectedSat);
    data.push({ name: sat.name, value: SatMathApi.getEcfOfCurrentOrbit(sat, NUMBER_OF_POINTS).map((point) => [point.x, point.y, point.z]) });
    const lastSat = catalogManagerInstance.lastSelectedSat();
    if (lastSat !== -1) {
      sat = catalogManagerInstance.getSat(lastSat);
      data.push({ name: sat.name, value: SatMathApi.getEcfOfCurrentOrbit(sat, NUMBER_OF_POINTS).map((point) => [point.x, point.y, point.z]) });
    }

    return data;
  }
}

export const ecfPlotsPlugin = new EcfPlots();
