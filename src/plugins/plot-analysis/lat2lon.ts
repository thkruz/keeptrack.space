import { SatMath } from '@app/app/analysis/sat-math';
import { GetSatType, MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { eci2lla, RAD2DEG, Satellite, SpaceObjectType, TemeVec3 } from '@ootk/src/main';
import scatterPlot4Png from '@public/img/icons/scatter-plot4.png';
import * as echarts from 'echarts';
import 'echarts-gl';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import i18next from 'i18next';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './lat2lon.css';

interface SatPoint {
  name: string;
  satId: number;
  value: [number, number];
}

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

  menuMode: MenuMode[] = [MenuMode.ANALYSIS, MenuMode.ALL];

  bottomIconImg = scatterPlot4Png;
  bottomIconCallback = () => {
    const chartDom = getEl(this.plotCanvasId)!;
    // The plot is a snapshot: take one sim time and use it for both the positions and the subtitle.
    const snapshotTime = ServiceLocator.getTimeManager().getOffsetTimeObj(0);

    this.createPlot(Lat2LonPlots.getPlotData(snapshotTime), chartDom, snapshotTime);
  };

  plotCanvasId = 'plot-analysis-chart-lat2lon';
  chart: echarts.ECharts;

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.Lat2LonPlots.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.Lat2LonPlots.help.overview'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.Lat2LonPlots.help.howToUse'),
        },
      ],
      tips: [t7e('plugins.Lat2LonPlots.help.tip1')],
    };
  }

  sideMenuElementName = 'lat2lon-plots-menu';
  sideMenuElementHtml: string = html`
  <div id="lat2lon-plots-menu" class="side-menu-parent start-hidden kt-ui-v13">
    <div id="plot-analysis-content" class="side-menu">
      <div id="${this.plotCanvasId}" class="plot-analysis-chart plot-analysis-menu-maximized"></div>
    </div>
  </div>`;

  addHtml(): void {
    super.addHtml();
  }

  /** Chart subtitle naming the snapshot sim time in UTC, e.g. "Snapshot at 2026-10-26 12:00:00 UTC". */
  static snapshotSubtitle(snapshotTime: Date): string {
    const utc = snapshotTime.toISOString().replace('T', ' ').slice(0, 19);

    return t7e('plugins.Lat2LonPlots.chart.snapshotTime').replace('{time}', utc);
  }

  createPlot(data: Record<string, SatPoint[]>, chartDom: HTMLElement, snapshotTime: Date = ServiceLocator.getTimeManager().getOffsetTimeObj(0)) {
    // Dont Load Anything if the Chart is Closed
    if (!this.isMenuButtonActive) {
      return;
    }

    // Delete any old charts and start fresh
    if (!this.chart) {
      // Setup Configuration
      this.chart = echarts.init(chartDom);
      this.chart.on('click', (event) => {
        const point = event.data as SatPoint | undefined;

        if (point?.satId) {
          this.selectSatManager_.selectSat(point.satId);
        }
      });
    }

    // Setup Chart
    this.chart.setOption({
      animation: false,
      title: {
        text: t7e('plugins.Lat2LonPlots.chart.title'),
        subtext: Lat2LonPlots.snapshotSubtitle(snapshotTime),
        textStyle: {
          fontSize: 16,
          color: '#fff',
        },
        subtextStyle: {
          color: '#ccc',
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
          const point = params.data as SatPoint;
          const color = params.color;

          return `
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
              <div style="display: flex; flex-direction: row; flex-wrap: nowrap; justify-content: space-between; align-items: flex-end;">
                <div style="width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-bottom: 5px;"></div>
                <div style="font-weight: bold;"> ${point.name}</div>
              </div>
              <div><bold>${t7e('plugins.Lat2LonPlots.chart.latitude')}:</bold> ${point.value[1].toFixed(3)}°</div>
              <div><bold>${t7e('plugins.Lat2LonPlots.chart.longitude')}:</bold> ${point.value[0].toFixed(3)}°</div>
            </div>
          `;
        },
      },
      xAxis: {
        name: t7e('plugins.Lat2LonPlots.chart.xAxis'),
        type: 'value',
        position: 'bottom',
      },
      yAxis: {
        name: t7e('plugins.Lat2LonPlots.chart.yAxis'),
        type: 'value',
        position: 'left',
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
      series: Object.entries(data).map(([country, points]) => ({
        type: 'scatter',
        name: country,
        large: true,
        data: points,
        symbolSize: 8,
        emphasis: {
          itemStyle: {
            color: '#fff',
          },
        },
      })),
    });
  }

  /** Localized country name for an ISO 3166 region code, falling back to English when Intl lacks it. */
  private static regionNameResolver_(): (isoCode: string, fallback: string) => string {
    let displayNames: Intl.DisplayNames | null = null;

    try {
      displayNames = new Intl.DisplayNames([i18next.language || 'en'], { type: 'region' });
    } catch {
      displayNames = null;
    }

    return (isoCode, fallback) => displayNames?.of(isoCode) ?? fallback;
  }

  /**
   * Subpoint and osculating inclination of a satellite at one time, both from the same SGP4 state.
   * Null when there is no Earth-orbit state to plot: a failed propagation (SatMath.getEci returns a
   * zero vector), a deep-space probe without a TLE, or any non-finite result.
   */
  static propagatedSubpoint(sat: Satellite, now: Date): { lat: number; lon: number; inclinationDeg: number } | null {
    const { position, velocity } = SatMath.getEci(sat, now);

    if (!position || !velocity) {
      return null;
    }
    const isZero = position.x === 0 && position.y === 0 && position.z === 0;

    if (isZero || ![position.x, position.y, position.z, velocity.x, velocity.y, velocity.z].every(Number.isFinite)) {
      return null;
    }

    const { gmst } = SatMath.calculateTimeVariables(now);
    const lla = eci2lla(position as TemeVec3, gmst);
    // Inclination of the propagated orbit plane: h = r x v, i = acos(h_z / |h|).
    const hx = position.y * velocity.z - position.z * velocity.y;
    const hy = position.z * velocity.x - position.x * velocity.z;
    const hz = position.x * velocity.y - position.y * velocity.x;
    const inclinationDeg = Math.atan2(Math.hypot(hx, hy), hz) * RAD2DEG;

    if (!Number.isFinite(lla.lat) || !Number.isFinite(lla.lon) || !Number.isFinite(inclinationDeg)) {
      return null;
    }

    return { lat: lla.lat, lon: lla.lon, inclinationDeg };
  }

  static getPlotData(now: Date = ServiceLocator.getTimeManager().getOffsetTimeObj(0)): Record<string, SatPoint[]> {
    const catalogManager = ServiceLocator.getCatalogManager();
    const countryData: Record<string, SatPoint[]> = {};
    const regionName = Lat2LonPlots.regionNameResolver_();
    const otherLabel = t7e('plugins.Lat2LonPlots.chart.other');

    catalogManager.objectCache.forEach((obj) => {
      if (obj.type !== SpaceObjectType.PAYLOAD) {
        return;
      }
      let sat = obj as Satellite;

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

      // Get current position (single orbit point)
      sat = catalogManager.getObject(sat.id, GetSatType.POSITION_ONLY) as Satellite;
      const lla = sat ? Lat2LonPlots.propagatedSubpoint(sat, now) : null;

      // No finite subpoint (deep-space probes, failed propagation): nothing to plot.
      if (!lla) {
        return;
      }

      /*
       * The TLE inclination above is the mean value at the TLE epoch. A stale GEO TLE (EKRAN 5: epoch
       * 1994, i = 11.3 deg) propagated decades forward has a very different plane, so re-check the
       * inclination of the same propagated state that gives the plotted subpoint.
       */
      if (lla.inclinationDeg > Lat2LonPlots.maxInclination_) {
        return;
      }

      let country = '';

      switch (sat.country) {
        case 'US':
          country = regionName('US', 'USA');
          break;
        case 'F':
          country = regionName('FR', 'France');
          break;
        case 'RU':
        case 'USSR':
          country = regionName('RU', 'Russia');
          break;
        case 'CN':
          country = regionName('CN', 'China');
          break;
        case 'IN':
          country = regionName('IN', 'India');
          break;
        case 'J':
          country = regionName('JP', 'Japan');
          break;
        default:
          country = otherLabel;
          break;
      }

      if (!countryData[country]) {
        countryData[country] = [];
      }
      countryData[country].push({
        name: sat.name,
        satId: sat.id,
        value: [lla.lon, lla.lat],
      });
    });

    return countryData;
  }
}
