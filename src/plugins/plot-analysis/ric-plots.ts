import scatterPlotPng4 from '@app/img/icons/scatter-plot4.png';
import { EChartsData, SatObject } from '@app/js/interfaces';
import { KeepTrackApiEvents, keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { SatMathApi } from '@app/js/singletons/sat-math-api';
import * as echarts from 'echarts';
import 'echarts-gl';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

type EChartsOption = echarts.EChartsOption;

export class RicPlot extends KeepTrackPlugin {
  dependencies: string[] = [SelectSatManager.PLUGIN_NAME];
  bottomIconElementName = 'ric-plots-bottom-icon';
  bottomIconLabel = 'RIC Plot';
  bottomIconImg = scatterPlotPng4;
  isIconDisabledOnLoad = true;
  bottomIconCallback = () => {
    if (keepTrackApi.getCatalogManager().selectedSat === -1) {
      keepTrackApi.getUiManager().toast('Select a Satellite First!', 'critical');
      return;
    }
    if (!keepTrackApi.getCatalogManager().secondarySatObj) {
      keepTrackApi.getUiManager().toast('Select a Secondary Satellite First!', 'critical');
      return;
    }
    if (!this.isMenuButtonActive) return;

    this.createPlot(RicPlot.getPlotData(), getEl(this.plotCanvasId));
  };

  plotCanvasId = 'plot-analysis-chart-ric';
  chart: echarts.ECharts;

  helpTitle = `RIC Plot Menu`;
  helpBody = keepTrackApi.html`
  <p>
  The RIC Plot Menu is used for plotting the RIC position of a satellite over time.
  </p>`;

  sideMenuElementName = 'ric-plots-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="ric-plots-menu" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal plot-analysis-menu-maximized">
    <div id="plot-analysis-content" class="side-menu">
      <div id="${this.plotCanvasId}" class="plot-analysis-chart plot-analysis-menu-maximized"></div>
    </div>
  </div>`;

  static PLUGIN_NAME = 'RIC Plot';
  constructor() {
    super(RicPlot.PLUGIN_NAME);
  }

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.setSecondarySat,
      cbName: this.PLUGIN_NAME,
      cb: (sat: SatObject) => {
        if (!sat || keepTrackApi.getCatalogManager().selectedSat === -1) {
          if (this.isMenuButtonActive) this.hideSideMenus();
          this.setBottomIconToDisabled();
        } else {
          this.setBottomIconToEnabled();
        }
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.PLUGIN_NAME,
      cb: (sat: SatObject) => {
        if (!sat || keepTrackApi.getCatalogManager().secondarySat === -1) {
          if (this.isMenuButtonActive) this.hideSideMenus();
          this.setBottomIconToDisabled();
        } else {
          this.setBottomIconToEnabled();
        }
      },
    });
  }

  createPlot(data: EChartsData, chartDom: HTMLElement) {
    // Dont Load Anything if the Chart is Closed
    if (!this.isMenuButtonActive) return;

    // Delete any old charts and start fresh
    if (this.chart) {
      echarts.dispose(this.chart);
    }
    this.chart = echarts.init(chartDom);

    const X_AXIS = 'Radial';
    const Y_AXIS = 'In-Track';
    const Z_AXIS = 'Cross-Track';
    const app = RicPlot.updateAppObject_(X_AXIS, Y_AXIS, Z_AXIS);

    // Setup Chart
    this.chart.setOption({
      title: {
        text: 'RIC Scatter Plot',
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
              <div>${X_AXIS}: ${data[0].toFixed(2)} km</div>
              <div>${Y_AXIS}: ${data[1].toFixed(2)} km</div>
              <div>${Z_AXIS}: ${data[2].toFixed(2)} km</div>
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
          rotateSensitivity: 10,
          distance: 600,
          zoomSensitivity: 5,
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
    const NUMBER_OF_ORBITS = 1;
    const NUMBER_OF_POINTS = 100;

    const data = [] as EChartsData;
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    if (catalogManagerInstance.selectedSat === -1 || catalogManagerInstance.secondarySat === -1) return [];

    const satP = catalogManagerInstance.getSat(catalogManagerInstance.selectedSat);
    const satS = catalogManagerInstance.secondarySatObj;
    data.push({ name: satP.name, value: [[0, 0, 0]] });
    data.push({ name: satS.name, value: SatMathApi.getRicOfCurrentOrbit(satS, satP, NUMBER_OF_POINTS, NUMBER_OF_ORBITS).map((point) => [point.x, point.y, point.z]) });

    return data;
  }
}

export const ricPlotPlugin = new RicPlot();
