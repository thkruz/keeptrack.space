import scatterPlotPng2 from '@app/img/icons/scatter-plot2.png';
import { EChartsData, EciArr3, SatObject } from '@app/js/interfaces';
import { KeepTrackApiEvents, keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { SatMathApi } from '@app/js/singletons/sat-math-api';
import * as echarts from 'echarts';
import 'echarts-gl';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

type EChartsOption = echarts.EChartsOption;

export class EciPlot extends KeepTrackPlugin {
  dependencies: string[] = [SelectSatManager.PLUGIN_NAME];
  bottomIconElementName = 'eci-plots-bottom-icon';
  bottomIconLabel = 'ECI Plots';
  bottomIconImg = scatterPlotPng2;
  bottomIconCallback = () => {
    if (!this.isMenuButtonEnabled) return;

    this.createPlot(EciPlot.getPlotData(), getEl(this.plotCanvasId));
  };

  plotCanvasId = 'plot-analysis-chart-eci';
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
  <div id="eci-plots-menu" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal plot-analysis-menu-maximized">
    <div id="plot-analysis-content" class="side-menu">
      <div id="${this.plotCanvasId}" class="plot-analysis-chart plot-analysis-menu-maximized"></div>
    </div>
  </div>`;

  dragOptions: clickDragOptions = {
    minWidth: 500,
    maxWidth: 1200,
  };

  static PLUGIN_NAME = 'ECI Plots';
  constructor() {
    super(EciPlot.PLUGIN_NAME);
  }

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.PLUGIN_NAME,
      cb: (sat: SatObject) => {
        // This runs no matter what
        if (sat) {
          this.setBottomIconToEnabled();
        } else {
          this.setBottomIconToDisabled();
        }
        if (!this.isMenuButtonEnabled) return;

        // This runs if the menu is open
        if (!sat) {
          this.hideSideMenus();
        } else {
          const chartDom = getEl(this.plotCanvasId);
          this.createPlot(EciPlot.getPlotData(), chartDom);
        }
      },
    });
  }

  createPlot(data: EChartsData, chartDom: HTMLElement) {
    // Dont Load Anything if the Chart is Closed
    if (!this.isMenuButtonEnabled) return;

    // Delete any old charts and start fresh
    if (this.chart) {
      echarts.dispose(this.chart);
    }
    this.chart = echarts.init(chartDom);

    const X_AXIS = 'X';
    const Y_AXIS = 'Y';
    const Z_AXIS = 'Z';
    const app = EciPlot.updateAppObject_(X_AXIS, Y_AXIS, Z_AXIS);

    // Get the Data
    const dataRange = data.reduce((range, sat) => {
      const minDataX = sat.value.reduce((min: number, item: EciArr3) => Math.min(min, item[0]), Infinity);
      const maxDataX = sat.value.reduce((max: number, item: EciArr3) => Math.max(max, item[0]), -Infinity);
      const minDataY = sat.value.reduce((min: number, item: EciArr3) => Math.min(min, item[1]), Infinity);
      const maxDataY = sat.value.reduce((max: number, item: EciArr3) => Math.max(max, item[1]), -Infinity);
      const minDataZ = sat.value.reduce((min: number, item: EciArr3) => Math.min(min, item[2]), Infinity);
      const maxDataZ = sat.value.reduce((max: number, item: EciArr3) => Math.max(max, item[2]), -Infinity);
      const minData = Math.round(Math.min(minDataX, minDataY, minDataZ) / 1000) * 1000;
      const maxData = Math.round(Math.max(maxDataX, maxDataY, maxDataZ) / 1000) * 1000;
      const _dataRange = Math.max(maxData, Math.abs(minData));
      return Math.max(range, _dataRange);
    }, 0);

    // Setup Chart
    this.chart.setOption({
      title: {
        text: 'Earth Centered Inertial (ECI) Plot',
        textStyle: {
          fontSize: 16,
          color: '#fff',
        },
      },
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
      legend: {
        show: true,
        textStyle: {
          color: '#fff',
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
          rotateSensitivity: [5, 15],
          // distance: 200,
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
          value: [item[app.fieldIndices[app.config.xAxis3D]], item[app.fieldIndices[app.config.yAxis3D]], item[app.fieldIndices[app.config.zAxis3D]]],
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

  private static updateAppObject_(X_AXIS: string, Y_AXIS: string, Z_AXIS: string) {
    // Setup Configuration
    const app = {
      config: {
        xAxis3D: X_AXIS,
        yAxis3D: Y_AXIS,
        zAxis3D: Z_AXIS,
      },
      fieldIndices: {},
      configParameters: {} as EChartsOption,
    };

    const schema = [
      { name: X_AXIS, index: 0 },
      { name: Y_AXIS, index: 1 },
      { name: Z_AXIS, index: 2 },
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
    app.fieldIndices = fieldIndices;

    return app;
  }

  static getPlotData(): EChartsData {
    const NUMBER_OF_POINTS = 100;
    const data = [] as EChartsData;
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    const curSatObj = catalogManagerInstance.getSat(catalogManagerInstance.selectedSat);
    data.push({ name: curSatObj.name, value: SatMathApi.getEciOfCurrentOrbit(curSatObj, NUMBER_OF_POINTS).map((point) => [point.x, point.y, point.z]) });

    const secSatObj = catalogManagerInstance.secondarySatObj;
    if (secSatObj) {
      data.push({ name: secSatObj.name, value: SatMathApi.getEciOfCurrentOrbit(secSatObj, NUMBER_OF_POINTS).map((point) => [point.x, point.y, point.z]) });
    }

    const lastSatId = catalogManagerInstance.lastSelectedSat();
    if (lastSatId !== -1) {
      const lastSatObj = catalogManagerInstance.getSat(lastSatId);
      data.push({ name: lastSatObj.name, value: SatMathApi.getEciOfCurrentOrbit(lastSatObj, NUMBER_OF_POINTS).map((point) => [point.x, point.y, point.z]) });
    }

    return data;
  }
}

export const eciPlotsPlugin = new EciPlot();
