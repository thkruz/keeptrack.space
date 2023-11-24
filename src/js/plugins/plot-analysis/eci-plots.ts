import scatterPlotPng2 from '@app/img/icons/scatter-plot2.png';
import { SatObject } from '@app/js/interfaces';
import { KeepTrackApiEvents, keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { SatMathApi } from '@app/js/singletons/sat-math-api';
import * as echarts from 'echarts';
import 'echarts-gl';
import { EciVec3 } from 'ootk';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

type EChartsOption = echarts.EChartsOption;

export class EciPlots extends KeepTrackPlugin {
  dependencies: string[] = [SelectSatManager.PLUGIN_NAME];
  bottomIconElementName = 'eci-plots-bottom-icon';
  bottomIconLabel = 'ECI Plots';
  bottomIconImg = scatterPlotPng2;
  bottomIconCallback = () => {
    const chartDom = getEl('plot-analysis-chart-eci');
    this.createEciScatterPlot(EciPlots.getEciScatterData(), chartDom);
  };

  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  chart: echarts.ECharts;

  helpTitle = `ECI Plots Menu`;
  helpBody = keepTrackApi.html`
  <p>
    The ECI Plots menu allows you to plot the position of a satellite in Earth Centered Inertial (ECI) coordinates.
    This is useful for visualizing the position of a satellite in space.
  </p>`;

  sideMenuElementName = 'eci-plots-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="eci-plots-menu" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal">
    <div id="plot-analysis-content" class="side-menu">
      <div id="plot-analysis-chart-eci" class="plot-analysis-chart"></div>
    </div>
  </div>`;

  dragOptions: clickDragOptions = {
    minWidth: 500,
    maxWidth: 1200,
  };

  static PLUGIN_NAME = 'ECI Plots';
  constructor() {
    super(EciPlots.PLUGIN_NAME);
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
          const chartDom = getEl('plot-analysis-chart-eci');
          this.createEciScatterPlot(EciPlots.getEciScatterData(), chartDom);
        }
      },
    });
  }

  createEciScatterPlot(data, chartDom: HTMLElement) {
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

    // Get the Data
    const dataRange = data.reduce((range, sat) => {
      const minDataX = sat.value.reduce((min: number, item: EciVec3) => Math.min(min, item[0]), Infinity);
      const maxDataX = sat.value.reduce((max: number, item: EciVec3) => Math.max(max, item[0]), -Infinity);
      const minDataY = sat.value.reduce((min: number, item: EciVec3) => Math.min(min, item[1]), Infinity);
      const maxDataY = sat.value.reduce((max: number, item: EciVec3) => Math.max(max, item[1]), -Infinity);
      const minDataZ = sat.value.reduce((min: number, item: EciVec3) => Math.min(min, item[2]), Infinity);
      const maxDataZ = sat.value.reduce((max: number, item: EciVec3) => Math.max(max, item[2]), -Infinity);
      const minData = Math.round(Math.min(minDataX, minDataY, minDataZ) / 1000) * 1000;
      const maxData = Math.round(Math.max(maxDataX, maxDataY, maxDataZ) / 1000) * 1000;
      const _dataRange = Math.max(maxData, Math.abs(minData));
      return Math.max(range, _dataRange);
    }, 0);

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
        min: -dataRange,
        max: dataRange,
      },
      yAxis3D: {
        name: app.config.yAxis3D,
        type: 'value',
        min: -dataRange,
        max: dataRange,
      },
      zAxis3D: {
        name: app.config.zAxis3D,
        type: 'value',
        min: -dataRange,
        max: dataRange,
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

  static getEciScatterData() {
    const NUMBER_OF_POINTS = 100;
    const data = [];
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    let sat = catalogManagerInstance.getSat(catalogManagerInstance.selectedSat);
    data.push({ name: sat.name, value: SatMathApi.getEciOfCurrentOrbit(sat, NUMBER_OF_POINTS).map((point) => [point.x, point.y, point.z]) });
    const lastSat = catalogManagerInstance.lastSelectedSat();
    if (lastSat !== -1) {
      sat = catalogManagerInstance.getSat(lastSat);
      data.push({ name: sat.name, value: SatMathApi.getEciOfCurrentOrbit(sat, NUMBER_OF_POINTS).map((point) => [point.x, point.y, point.z]) });
    }

    return data;
  }
}

export const eciPlotsPlugin = new EciPlots();
