/* eslint-disable camelcase */
import * as echarts from 'echarts';
/* eslint-disable max-lines */
import { EChartsData } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, setInnerHtml, showEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { BaseObject, DetailedSatellite, RADIUS_OF_EARTH } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { EL, SECTIONS } from './sat-info-box-orbit-guard-html';

import { PluginRegistry } from '@app/engine/core/plugin-registry';
import './sat-info-box-orbit-guard.css';

export class SatInfoBoxOrbitGuard extends KeepTrackPlugin {
  readonly id = 'SatInfoBoxOrbitGuard';
  dependencies_: string[] = [SatInfoBox.name];

  private isManeuverSectionCollapsed_ = false;

  private readonly historicalDataAPIEndpoint = 'http://192.34.81.138:8501/orbitguard/historical_data';
  private readonly bearerToken = 'Bearer guruspace5172x2';
  private readonly maneuverDataCache_: Map<string, EChartsData> = new Map();

  private readonly elsetDataColumns = {
    epoch: 0,
    raan: 1,
    inclination: 2,
    argOfPerigee: 3,
    semiMajorAxis: 4,
    semiMajorAxisAlt: 5,
    eccentricity: 6,
    meanMotion: 7,
    period: 8,
  };

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.satInfoBoxInit, () => {
      PluginRegistry.getPlugin(SatInfoBox)!.addElement({ html: this.createManeuverSection_(), order: 7 });
    });
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.selectSatData, this.updateManeuverData_.bind(this));
    EventBus.getInstance().on(EventBusEvent.satInfoBoxAddListeners, this.satInfoBoxAddListeners_.bind(this));
  }

  private createManeuverSection_(): string {
    return html`
      <div id="${SECTIONS.MANEUVER}" class="sat-info-section" style="display:none;">
        <div class="sat-info-section-header" style="position:relative; z-index:2;">
          OrbitGuard
          <span id="${EL.COLLAPSE}" class="section-collapse material-icons" style="position: absolute; right: 0;">expand_less</span>
        </div>
        <div id="${EL.DATA}"></div>
      </div>
    `;
  }

  private async fetchHistoricalPlotData_(sccNum: string): Promise<EChartsData> {
    try {
      const response = await fetch(this.historicalDataAPIEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.bearerToken,
        },
        body: JSON.stringify({
          satNo: [sccNum],
          last_days: 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      const elsets = (data[sccNum]?.elset ?? []).map(((entry) => ({
        epoch: entry.epoch,
        raan: entry.raan,
        inclination: entry.inclination,
        argOfPerigee: entry.argOfPerigee,
        semiMajorAxis: entry.semiMajorAxis,
        semiMajorAxisAlt: entry.semiMajorAxis - RADIUS_OF_EARTH,
        eccentricity: entry.eccentricity,
        meanMotion: entry.meanMotion,
        period: 1440 / entry.period,
      })));
      const eoData = data[sccNum]?.eo ?? [];
      const detection = data[sccNum]?.detection ?? {};

      // values should be arranged the same way as this.elsetDataColumns lists them!
      const values = elsets.map((entry) => [
        entry.epoch,
        entry.raan,
        entry.inclination,
        entry.argOfPerigee,
        entry.semiMajorAxis,
        entry.semiMajorAxisAlt,
        entry.eccentricity,
        entry.meanMotion,
        entry.period,
      ]);
      const eoValues = eoData.map((entry) => [entry.ra, entry.declination, entry.range, entry.epoch]);

      const eventDetails = {
        event_start_timestamp: detection.event_start_timestamp,
        event_end_timestamp: detection.event_end_timestamp,
        maneuver_class: detection.maneuver_class || null,
        maneuver_probability: detection.maneuver_probability || 0,
        oof_detection: detection.oof_detection === 1,
        stability_change_detection: detection.stability_change_detection === 1,
        stability_change_probability: detection.stability_change_probability || 0,
      };

      return [
        { name: `SAT-${sccNum}`, value: values },
        { name: `SAT-${sccNum} EO Data`, value: eoValues },
        { name: `SAT-${sccNum} Event`, value: eventDetails },
      ];
    } catch (err) {
      errorManagerInstance.log(`Error fetching historical orbit data: ${err}`);

      return [];
    }
  }

  // eslint-disable-next-line max-lines-per-function
  private createHistorical2dPlot_(data: EChartsData): void {
    const container = getEl(EL.DATA);

    if (!container) {
      return;
    }

    const chartContainer = document.createElement('div');

    chartContainer.style.display = 'grid';
    chartContainer.style.gridTemplateColumns = '1fr';
    chartContainer.style.gap = '20px';
    chartContainer.style.marginTop = '0';
    chartContainer.style.paddingTop = '0';
    chartContainer.style.overflow = 'hidden';
    chartContainer.style.position = 'relative';
    chartContainer.style.zIndex = '1';
    container.innerHTML = '';
    container.appendChild(chartContainer);

    // ---------- Detection header (centered) ----------
    const detectionItem = data.find((item) => item.name.endsWith('Event')) as { name: string; value } | undefined;

    if (detectionItem?.value) {
      const det = detectionItem.value as {
        event_start_timestamp?: string;
        event_end_timestamp?: string;
        maneuver_class?: string | null;
        maneuver_probability?: number;
        oof_detection?: boolean;
        stability_change_detection?: boolean;
        stability_change_probability?: number;
      };

      const parts: string[] = [];

      if (det.maneuver_class) {
        const p = typeof det.maneuver_probability === 'number' ? Math.round(det.maneuver_probability * 100) : 0;

        parts.push(`${det.maneuver_class} (${p}%)`);
      }
      if (det.oof_detection) {
        parts.push(t7e('SatInfoBoxManeuver.orbitOutOfFamily'));
      }
      if (det.stability_change_detection) {
        const sp = typeof det.stability_change_probability === 'number' ? Math.round(det.stability_change_probability * 100) : 0;

        parts.push(`${t7e('SatInfoBoxManeuver.stabilityChange')} (${sp}%)`);
      }

      const header = document.createElement('div');

      header.style.textAlign = 'center';
      header.style.color = '#fff';
      header.style.margin = '6px 0 4px';
      header.style.fontFamily = 'inherit';

      const eventLine = document.createElement('div');

      eventLine.style.fontSize = '16px';
      eventLine.style.fontWeight = '600';
      eventLine.textContent = parts.length ? parts.join(' • ') : t7e('SatInfoBoxManeuver.noEventDetected');

      const startLine = document.createElement('div');

      startLine.style.fontSize = '12px';
      startLine.style.opacity = '0.9';
      startLine.textContent = `Start: ${det.event_start_timestamp ?? '—'}`;

      const endLine = document.createElement('div');

      endLine.style.fontSize = '12px';
      endLine.style.opacity = '0.9';
      endLine.textContent = `End: ${det.event_end_timestamp ?? '—'}`;

      header.appendChild(eventLine);
      header.appendChild(startLine);
      header.appendChild(endLine);

      // Put header above charts
      chartContainer.appendChild(header);
    }

    // --- Fullscreen helper with toggle callback ---
    const attachFullscreenToggle = (el: HTMLElement, chart: echarts.ECharts, onToggle?: (isFs: boolean) => void) => {
      let isFs = false;
      let prevParent: HTMLElement | null = null;
      let prevNext: ChildNode | null = null;
      let prevStyle = '';
      let prevBodyOverflow = '';
      let keyHandler: ((e: KeyboardEvent) => void) | null = null;
      let resizeHandler: (() => void) | null = null;

      const enterFs = () => {
        if (isFs) {
          return;
        }
        isFs = true;
        prevParent = el.parentElement;
        prevNext = el.nextSibling;
        prevStyle = el.getAttribute('style') || '';
        prevBodyOverflow = document.body.style.overflow;

        document.body.appendChild(el);
        Object.assign(el.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          zIndex: '9999',
          background: '#000',
          margin: '0',
          padding: '0',
          cursor: 'zoom-out',
        } as Partial<CSSStyleDeclaration>);

        document.body.style.overflow = 'hidden';
        onToggle?.(true);
        chart.resize();

        keyHandler = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            exitFs();
          }
        };
        window.addEventListener('keydown', keyHandler);
        resizeHandler = () => chart.resize();
        window.addEventListener('resize', resizeHandler);
      };

      const exitFs = () => {
        if (!isFs) {
          return;
        }
        isFs = false;

        if (prevParent) {
          if (prevNext) {
            prevParent.insertBefore(el, prevNext);
          } else {
            prevParent.appendChild(el);
          }
        }
        el.setAttribute('style', prevStyle);
        document.body.style.overflow = prevBodyOverflow;
        el.style.cursor = 'zoom-in';

        if (keyHandler) {
          window.removeEventListener('keydown', keyHandler);
        }
        if (resizeHandler) {
          window.removeEventListener('resize', resizeHandler);
        }
        keyHandler = null;
        resizeHandler = null;

        onToggle?.(false);
        chart.resize();
      };

      el.style.cursor = 'zoom-in';
      el.addEventListener('click', () => (isFs ? exitFs() : enterFs()));
    };

    // --- Chart factory ---
    const createChart = (chartId: string, title: string, yAxisName: string, yFieldIndex: number, chartData, plotType = 'scatter') => {
      const chartDom = document.createElement('div');

      chartDom.id = chartId;
      chartDom.style.height = '300px';
      chartDom.style.width = '100%';
      chartDom.style.boxSizing = 'border-box';
      chartContainer.appendChild(chartDom);

      const chart = echarts.init(chartDom);
      const rawSeries = chartData.map((entry) => [new Date(entry[this.elsetDataColumns.epoch]).getTime(), entry[yFieldIndex]]);

      // Compact number formatter for non-fullscreen mode
      const shortNum = (v: number): string => {
        if (!isFinite(v)) {
          return '';
        }
        const av = Math.abs(v);

        // Big numbers: compact units
        if (av >= 1e9) {
          return `${(v / 1e9).toFixed(1)}B`;
        }
        if (av >= 1e6) {
          return `${(v / 1e6).toFixed(1)}M`;
        }
        if (av >= 1e3) {
          return `${(v / 1e3).toFixed(1)}k`;
        }

        // Very small numbers: scientific
        if (av > 0 && av < 1e-3) {
          let s = v.toExponential(1).replace('+', '');

          s = s.replace(/\.0+e/u, 'e');

          return s; // e.g., 8e-6
        }

        // 0 < |v| < 1: drop leading zero and cap to 4 decimals -> ".xxxx"
        if (av > 0 && av < 1) {
          const fixed = av.toFixed(4).substring(1); // remove leading "0"


          return (v < 0 ? '-' : '') + fixed; // keep sign
        }

        // Everything else
        let s: string;

        if (av >= 100) {
          s = v.toFixed(0);
        } else if (av >= 10) {
          s = v.toFixed(1);
        } else {
          s = v.toPrecision(3);
        }

        return s.replace(/\.0+$/u, '');
      };

      const tooltipPosition = (point: number[], _params: unknown, _el: unknown, _rect: unknown, size: { contentSize: [number, number] }): [number, number] => {
        const offset = 12;
        let [px, py] = point;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const [tw, th] = size.contentSize;

        px = Math.max(8, Math.min(px + offset, vw - tw - 8));
        py = Math.max(8, Math.min(py + offset, vh - th - 8));

        return [px, py];
      };

      const buildOption = (isFs: boolean): echarts.EChartsOption => {
        const axisNameFont = isFs ? 20 : 14;
        const axisTickFont = isFs ? 16 : 12;
        const symbolSize = isFs ? 10 : 6;

        // fixed margins so all charts have identical plot widths
        const gridLeft = isFs ? 120 : 96;
        const gridRight = isFs ? 50 : 40;
        const gridTop = isFs ? 80 : 60;
        const gridBottom = isFs ? 80 : 60;

        return {
          title: {
            text: title,
            left: 'center',
            textStyle: { fontSize: isFs ? 22 : 16, color: '#fff' },
          },
          animation: false,
          axisPointer: { type: 'cross', label: { show: false } },
          tooltip: {
            trigger: 'axis',
            confine: true,
            backgroundColor: 'rgba(20,20,20,0.92)',
            borderColor: '#444',
            textStyle: { color: '#fff' },
            axisPointer: { type: 'cross' },
            position: tooltipPosition,
            formatter: (p) => {
              const list = Array.isArray(p) ? p : [p];
              const pt = list?.[0];

              if (!pt?.data) {
                return '';
              }
              const t = pt.data[0];
              const v = pt.data[1];
              let valueStr: string;

              if (typeof v === 'number' && isFinite(v)) {
                valueStr = v.toPrecision(6); // full precision on hover
              } else {
                valueStr = 'N/A';
              }


              return `
              <div>
                <b>${pt.seriesName ?? title}</b><br/>
                Time: ${new Date(t).toLocaleString()}<br/>
                Value: ${valueStr}
              </div>
            `;
            },
          },
          xAxis: {
            type: 'time',
            name: 'Epoch (UTC)',
            nameLocation: 'middle',
            nameGap: isFs ? 40 : 28,
            axisLabel: { color: '#fff', fontSize: axisTickFont },
            nameTextStyle: { color: '#fff', fontSize: axisNameFont },
            axisLine: { lineStyle: { color: '#999' } },
            axisPointer: { label: { show: false } },
          },
          yAxis: {
            type: 'value',
            name: yAxisName,
            nameLocation: 'middle',
            nameGap: isFs ? 60 : 45,
            axisLabel: {
              color: '#fff',
              fontSize: axisTickFont,
              margin: 8,
              formatter: (value: number | string): string => (isFs ? String(value) : shortNum(Number(value))),
            },
            nameTextStyle: { color: '#fff', fontSize: axisNameFont },
            axisLine: { lineStyle: { color: '#999' } },
            axisPointer: { label: { show: false } },
            scale: true, // don't force zero into view
            boundaryGap: ['5%', '5%'], // visual padding / auto-fit feel
          },
          grid: {
            top: gridTop,
            bottom: gridBottom,
            left: gridLeft,
            right: gridRight,
            containLabel: false, // keeps plot widths uniform across charts
          },
          series: [
            {
              name: title,
              type: plotType as 'scatter' | 'line',
              large: true,
              largeThreshold: 2000,
              symbolSize,
              hoverLayerThreshold: 3000,
              data: rawSeries,
              clip: true,
            },
          ],
          // dataZoom: [{ type: 'inside' }, { type: 'slider' }],
        };
      };

      chart.setOption(buildOption(false));
      attachFullscreenToggle(chartDom, chart, (isFs) => {
        chart.setOption(buildOption(isFs), true);
      });
    };

    // Elset charts
    const elsetData = data.find((item) => !item.name.includes('EO Data'));

    if (elsetData?.value?.length) {
      createChart('raan-chart', 'RAAN (°)', 'RAAN (°)', this.elsetDataColumns.raan, elsetData.value, 'line');
      createChart('inclination-chart', 'Inclination (°)', 'Inclination (°)', this.elsetDataColumns.inclination, elsetData.value, 'line');
      // createChart('semiMajorAxis-chart', 'Semi-Major Axis (km)', 'Semi-Major Axis (km)', this.elsetDataColumns.semiMajorAxis, elsetData.value, 'line');
      createChart('semiMajorAxisAlt-chart', 'Semi-Major Axis Altitude (km)', 'Semi-Major Axis Altitude (km)', this.elsetDataColumns.semiMajorAxisAlt, elsetData.value, 'line');
      createChart('eccentricity-chart', 'Eccentricity', 'Eccentricity (dimensionless)', this.elsetDataColumns.eccentricity, elsetData.value, 'line');
      createChart('meanMotion-chart', 'Mean Motion (rev/day)', 'Mean Motion (rev/day)', this.elsetDataColumns.meanMotion, elsetData.value, 'line');
    }

    // EO charts
    const eoData = data.find((item) => item.name.includes('EO Data'));

    if (eoData?.value?.length) {
      // createChart('rightAscension-chart', 'Right Ascension (°)', 'Right Ascension (°)', 0, eoData.value);
      // createChart('declination-chart', 'Declination (°)', 'Declination (°)', 1, eoData.value);
      // createChart('range-chart', 'Range (km)', 'Range (km)', 2, eoData.value);
    }
  }

  private updateManeuverData_(obj?: BaseObject) {
    if (!(obj instanceof DetailedSatellite)) {
      hideEl(`${SECTIONS.MANEUVER}`);

      return;
    }

    const sccNum = obj.sccNum;

    setInnerHtml(EL.DATA, '');

    // If data is cached, use it and exit early
    if (this.maneuverDataCache_.has(sccNum)) {
      const cachedData = this.maneuverDataCache_.get(sccNum)!;

      this.processHistoricalData_(cachedData);

      return;
    }

    // Fetch data from server
    this.fetchHistoricalPlotData_(sccNum)
      .then((plotData) => {
        this.maneuverDataCache_.set(sccNum, plotData);
        this.processHistoricalData_(plotData);
      })
      .catch(() => {
        hideEl(`${SECTIONS.MANEUVER}`);
      });
  }

  private processHistoricalData_(plotData: EChartsData): void {
    const elsetLen = plotData.find((it) => !it.name.includes('EO Data'))?.value?.length ?? 0;
    const eoLen = plotData.find((it) => it.name.includes('EO Data'))?.value?.length ?? 0;

    if (elsetLen === 0 && eoLen === 0) {
      hideEl(`${SECTIONS.MANEUVER}`);

      return;
    }

    showEl(`${SECTIONS.MANEUVER}`);
    this.createHistorical2dPlot_(plotData);
  }

  // Manually wire the Maneuver collapse to toggle just the charts area
  private satInfoBoxAddListeners_(): void {
    const section = getEl(SECTIONS.MANEUVER);
    const icon = getEl(EL.COLLAPSE);
    const content = getEl(EL.DATA);

    if (!icon || !content || !section) {
      return;
    }

    icon.addEventListener('click', () => {
      this.isManeuverSectionCollapsed_ = !this.isManeuverSectionCollapsed_;

      if (this.isManeuverSectionCollapsed_) {
        section.classList.add('collapsed');
        icon.classList.add('collapse-closed');
        icon.textContent = 'expand_more';
      } else {
        section.classList.remove('collapsed');
        icon.classList.remove('collapse-closed');
        icon.textContent = 'expand_less';
        // Ensure any existing charts resize properly when re-opened
        content.querySelectorAll<HTMLElement>('div[id$="-chart"]').forEach((div) => {
          try {
            echarts.getInstanceByDom(div)?.resize?.();
          } catch {
            // ignore
          }
        });
      }
    });
  }
}
