import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SatMathApi } from '@app/engine/math/sat-math-api';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite } from '@ootk/src/main';
import scatterPlot3Png from '@public/img/icons/scatter-plot3.png';
import * as echarts from 'echarts';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { assessRelationship, RicAssessment, RicRelationship } from './ric-plots-assessment';
import { buildRicChartOption, RicChartLabels, RicPoint } from './ric-plots-chart';
import './ric-plots.css';

export class RicPlot extends KeepTrackPlugin {
  readonly id = 'RicPlot';
  dependencies_: string[] = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  isIconDisabled = true;
  isIconDisabledOnLoad = true;

  menuMode: MenuMode[] = [MenuMode.ANALYSIS, MenuMode.ALL];

  bottomIconImg = scatterPlot3Png;
  bottomIconCallback = () => {
    if (this.selectSatManager_.selectedSat === -1) {
      ServiceLocator.getUiManager().toast(t7e('errorMsgs.SelectSatelliteFirst'), ToastMsgType.critical);

      return;
    }
    if (!this.selectSatManager_.secondarySatObj) {
      ServiceLocator.getUiManager().toast(t7e('errorMsgs.SelectSecondarySatellite'), ToastMsgType.critical);

      return;
    }
    if (!this.isMenuButtonActive) {
      return;
    }

    this.createPlot(this.getPlotData(), getEl(this.plotCanvasId)!);
  };

  plotCanvasId = 'plot-analysis-chart-ric';
  chart: echarts.ECharts;
  private resizeHandler_: (() => void) | null = null;

  static readonly MIN_ORBITS = 1;
  static readonly MAX_ORBITS = 10;
  static readonly DEFAULT_ORBITS = 5;
  orbitsSelectId = 'ric-orbits-select';
  assessmentId = 'ric-assessment';
  private orbits_ = RicPlot.DEFAULT_ORBITS;

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.RicPlot.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.RicPlot.help.overview'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.RicPlot.help.howToUse'),
        },
      ],
      tips: [t7e('plugins.RicPlot.help.tip1')],
    };
  }

  sideMenuElementName = 'ric-plots-menu';
  sideMenuElementHtml: string = html`
  <div id="ric-plots-menu" class="side-menu-parent start-hidden plot-analysis-menu-normal kt-ui-v13">
    <div id="plot-analysis-content" class="side-menu">
      <div class="ric-plots-controls">
        <div class="input-field ric-orbits-field">
          <select id="${this.orbitsSelectId}">
            ${Array.from(
    { length: RicPlot.MAX_ORBITS - RicPlot.MIN_ORBITS + 1 },
    (_, i) => RicPlot.MIN_ORBITS + i,
  )
    .map((n) => `<option value="${n}"${n === RicPlot.DEFAULT_ORBITS ? ' selected' : ''}>${n}</option>`)
    .join('')}
          </select>
          <label>${t7e('plugins.RicPlot.orbitsLabel')}</label>
        </div>
        <div class="ric-plots-info">
          <div class="ric-sat-ids">
            <span class="ric-sat-id ric-sat-primary" id="ric-sat-primary"></span>
            <span class="ric-sat-id ric-sat-secondary" id="ric-sat-secondary"></span>
          </div>
          <div id="${this.assessmentId}" class="ric-assessment"></div>
        </div>
      </div>
      <div id="${this.plotCanvasId}" class="plot-analysis-chart plot-analysis-menu-maximized"></div>
    </div>
  </div>`;

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => this.uiManagerFinal_());

    EventBus.getInstance().on(
      EventBusEvent.setSecondarySat,
      (obj: BaseObject | null) => {
        if (!obj || this.selectSatManager_.selectedSat === -1) {
          if (this.isMenuButtonActive) {
            this.hideSideMenus();
          }
          this.setBottomIconToDisabled();
        } else {
          this.setBottomIconToEnabled();
        }
      },
    );

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj: BaseObject) => {
        if (!obj || this.selectSatManager_.secondarySat === -1) {
          if (this.isMenuButtonActive) {
            this.hideSideMenus();
          }
          this.setBottomIconToDisabled();
        } else {
          this.setBottomIconToEnabled();
        }
      },
    );
  }

  private uiManagerFinal_(): void {
    const select = getEl(this.orbitsSelectId) as HTMLSelectElement | null;

    select?.addEventListener('change', (e) => {
      const value = Number.parseInt((e.target as HTMLSelectElement).value, 10);

      if (Number.isNaN(value)) {
        return;
      }
      this.orbits_ = value;
      if (this.isMenuButtonActive) {
        this.createPlot(this.getPlotData(), getEl(this.plotCanvasId)!);
      }
    });

    initMaterialSelects(getEl(this.sideMenuElementName, true) ?? document.body);
  }

  private getChartLabels_(): RicChartLabels {
    return {
      radial: t7e('plugins.RicPlot.chart.radial'),
      inTrack: t7e('plugins.RicPlot.chart.inTrack'),
      crossTrack: t7e('plugins.RicPlot.chart.crossTrack'),
      range: t7e('plugins.RicPlot.chart.range'),
      timeAxis: t7e('plugins.RicPlot.chart.timeAxis'),
      distanceAxis: t7e('plugins.RicPlot.chart.distanceAxis'),
      empty: t7e('plugins.RicPlot.chart.empty'),
      unitKm: t7e('plugins.RicPlot.chart.unitKm'),
      unitMin: t7e('plugins.RicPlot.chart.unitMin'),
    };
  }

  createPlot(points: RicPoint[], chartDom: HTMLElement) {
    // Dont Load Anything if the Chart is Closed
    if (!this.isMenuButtonActive) {
      return;
    }

    // Delete any old charts and start fresh
    if (this.chart) {
      echarts.dispose(this.chart);
    }
    this.chart = echarts.init(chartDom);

    // Keep the fullscreen chart filling the menu when the window is resized.
    if (this.resizeHandler_) {
      window.removeEventListener('resize', this.resizeHandler_);
    }
    this.resizeHandler_ = () => this.chart?.resize();
    window.addEventListener('resize', this.resizeHandler_);

    this.updateInfo_(points);
    this.chart.setOption(buildRicChartOption(points, this.getChartLabels_()));
  }

  /** Fill the header with the two satellite numbers and the relationship badge. */
  private updateInfo_(points: RicPoint[]): void {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const satP = catalogManagerInstance.getObject(this.selectSatManager_.selectedSat) as Satellite | null;
    const satS = this.selectSatManager_.secondarySatObj;

    const primaryEl = getEl('ric-sat-primary', true);
    const secondaryEl = getEl('ric-sat-secondary', true);
    const assessmentEl = getEl(this.assessmentId, true);

    if (primaryEl) {
      primaryEl.textContent = satP ? `${t7e('plugins.RicPlot.labels.primary')}: ${satP.name} (${satP.sccNum})` : '';
    }
    if (secondaryEl) {
      secondaryEl.textContent = satS ? `${t7e('plugins.RicPlot.labels.secondary')}: ${satS.name} (${satS.sccNum})` : '';
    }

    if (!assessmentEl) {
      return;
    }

    if (!satP || !satS) {
      assessmentEl.textContent = '';
      delete assessmentEl.dataset.relationship;

      return;
    }

    const maxRangeKm = points.reduce((max, p) => Math.max(max, p.range), 0);
    const assessment = assessRelationship({
      inc1: satP.inclination,
      raan1: satP.rightAscension,
      period1: satP.period,
      inc2: satS.inclination,
      raan2: satS.rightAscension,
      period2: satS.period,
      maxRangeKm,
    });

    assessmentEl.dataset.relationship = assessment.relationship;
    assessmentEl.innerHTML = this.renderAssessment_(assessment);
  }

  private static readonly RELATIONSHIP_LABEL_KEYS: Record<RicRelationship, string> = {
    'closely-spaced': 'plugins.RicPlot.assessment.closelySpaced',
    'co-orbital': 'plugins.RicPlot.assessment.coOrbital',
    'co-planar': 'plugins.RicPlot.assessment.coPlanar',
    unrelated: 'plugins.RicPlot.assessment.unrelated',
    unknown: 'plugins.RicPlot.assessment.unknown',
  };

  private renderAssessment_(assessment: RicAssessment): string {
    const label = t7e(RicPlot.RELATIONSHIP_LABEL_KEYS[assessment.relationship] as Parameters<typeof t7e>[0]);
    const title = t7e('plugins.RicPlot.assessment.title');

    if (assessment.relationship === 'unknown') {
      return `<span class="ric-assessment-label">${title}: ${label}</span>`;
    }

    const planeTxt = `Δ${t7e('plugins.RicPlot.assessment.plane')} ${assessment.planeAngleDeg.toFixed(1)}°`;
    const periodTxt = `ΔP ${assessment.periodDiffPct.toFixed(1)}%`;
    const rangeTxt = `${t7e('plugins.RicPlot.chart.range')} ${assessment.maxRangeKm.toFixed(0)} ${t7e('plugins.RicPlot.chart.unitKm')}`;

    return `
      <span class="ric-assessment-label">${title}: ${label}</span>
      <span class="ric-assessment-metrics">${planeTxt} · ${periodTxt} · ${rangeTxt}</span>`;
  }

  getPlotData(): RicPoint[] {
    const NUMBER_OF_ORBITS = this.orbits_;
    const POINTS_PER_ORBIT = 100;
    const NUMBER_OF_POINTS = POINTS_PER_ORBIT * NUMBER_OF_ORBITS;

    if (this.selectSatManager_.selectedSat === -1 || this.selectSatManager_.secondarySat === -1) {
      return [];
    }

    const satP = ServiceLocator.getCatalogManager().getObject(this.selectSatManager_.selectedSat) as Satellite;
    const satS = this.selectSatManager_.secondarySatObj;

    if (!satP || !satS) {
      errorManagerInstance.warn('Missing satellite data for RIC plot');

      return [];
    }

    const now = ServiceLocator.getTimeManager().simulationTimeObj.getTime();
    const ricPoints = SatMathApi.getRicOfCurrentOrbit(satS, satP, NUMBER_OF_POINTS, NUMBER_OF_ORBITS);

    return ricPoints.map((point: { x: number, y: number, z: number }, idx: number) => {
      // Mirror the time offset used inside getRicOfCurrentOrbit (idx * period * orbits / points)
      // so the time axis matches the propagated samples and spans the full 5-orbit window.
      const offsetMin = idx * satS.period * NUMBER_OF_ORBITS / NUMBER_OF_POINTS;
      const range = Math.hypot(point.x, point.y, point.z);

      return {
        t: offsetMin,
        r: point.x,
        i: point.y,
        c: point.z,
        range,
        iso: new Date(now + offsetMin * 60 * 1000).toISOString(),
      };
    });
  }
}
