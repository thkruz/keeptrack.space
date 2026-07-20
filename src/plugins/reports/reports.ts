/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * reports.ts is a plugin for generating quick reports in text format of various
 * satellite and sensor data
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { SatMath, SunStatus } from '@app/app/analysis/sat-math';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { IBottomIconConfig, ICommandPaletteCommand, IHelpConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { Kilometers, Satellite, TemeVec3 } from '@ootk/src/main';
import analysisPng from '@public/img/icons/reports.png';

import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { BestPassDeps, findPassesForSat } from '../best-pass/best-pass-calculator';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { buildDownloadPayload, buildPreviewText, ReportFormat } from './report-formatter';
import {
  generateAerReport,
  generateCoesReport,
  generateEciReport,
  generateLlaReport,
  generateSunEclipseReport,
  generateVisibilityWindowsReport,
  REPORT_DEFAULTS,
  ReportCoreDeps,
  ReportData,
  ReportOptions,
  ReportPass,
  SunIllumination,
} from './reports-core';
import './reports.css';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.ReportsPlugin.${key}` as Parameters<typeof t7e>[0]);

/** The context a report generator receives: the time window, injected app state, and the report epoch. */
export interface ReportContext {
  options: ReportOptions;
  deps: ReportCoreDeps;
  /** The simulation time the report is generated at (used in the metadata header). */
  generatedAt: Date;
}

/**
 * Interface for a report generator that can be registered with the ReportsPlugin
 */
export interface ReportGenerator {
  /** Unique identifier for this report */
  id: string;
  /** Display name for the report button */
  name: string;
  /** Description of what the report contains */
  description?: string;
  /** Whether this report requires a sensor to be selected */
  requiresSensor?: boolean;
  /**
   * Generate the report data
   * @param sat The selected satellite
   * @param sensor The selected sensor (if required)
   * @param ctx The report context (time window, injected dependencies, epoch)
   * @returns The report data to be written
   */
  generate(sat: Satellite, sensor: DetailedSensor | null, ctx: ReportContext): ReportData;
}

/** Persisted shape for the last-used output options (StorageKey.REPORTS_SETTINGS). */
interface ReportsSettings {
  windowSec?: number;
  stepSec?: number;
  format?: ReportFormat;
}

/** Selectable look-ahead windows, in seconds. */
const WINDOW_OPTIONS_SEC = [24 * 60 * 60, 3 * 24 * 60 * 60, 7 * 24 * 60 * 60, 14 * 24 * 60 * 60];
/** Selectable sampling steps, in seconds. */
const STEP_OPTIONS_SEC = [10, 30, 60, 300];

export class ReportsPlugin extends KeepTrackPlugin {
  readonly id = 'ReportsPlugin';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  /**
   * Static registry of all available report generators
   * Other plugins can register their reports by calling ReportsPlugin.registerReport()
   */
  private static readonly reportRegistry_: Map<string, ReportGenerator> = new Map();

  /** Current output options (restored from persistence in uiManagerFinal_). */
  private windowSec_: number = REPORT_DEFAULTS.windowSec;
  private stepSec_: number = REPORT_DEFAULTS.stepSec;
  private format_: ReportFormat = 'text';

  /**
   * Register a new report generator
   * This can be called by any plugin to add custom reports
   * @param report The report generator to register
   */
  static registerReport(report: ReportGenerator): void {
    if (ReportsPlugin.reportRegistry_.has(report.id)) {
      errorManagerInstance.warn(`Report with id "${report.id}" is already registered. Overwriting.`);
    }
    ReportsPlugin.reportRegistry_.set(report.id, report);
  }

  /**
   * Unregister a report generator
   * @param reportId The id of the report to unregister
   */
  static unregisterReport(reportId: string): void {
    ReportsPlugin.reportRegistry_.delete(reportId);
  }

  /**
   * Get all registered reports
   */
  static getRegisteredReports(): ReportGenerator[] {
    return Array.from(ReportsPlugin.reportRegistry_.values());
  }

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor

    // Register built-in reports
    this.registerBuiltInReports_();
  }

  isRequireSatelliteSelected = true;
  isIconDisabled = true;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'reports-bottom-icon',
      label: t7e('plugins.ReportsPlugin.bottomIconLabel'),
      image: analysisPng,
      menuMode: [MenuMode.ANALYSIS, MenuMode.ALL],
      isDisabledOnLoad: true,
    };
  }

  // Bridge for legacy event system (per CLAUDE.md)
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  onBottomIconClick(): void {
    // Default toggle behavior handled by base class
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'reports-menu',
      title: t7e('plugins.ReportsPlugin.title'),
      html: this.buildSideMenuHtml_(),
      dragOptions: {
        isDraggable: false,
        minWidth: 320,
      },
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.ReportsPlugin.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/reports/reports-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: l('help.typesHeading'),
          content: l('help.types'),
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2')],
    };
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = 'Analysis';

    const reportCommands: ICommandPaletteCommand[] = ReportsPlugin.getRegisteredReports().map((report) => ({
      id: `ReportsPlugin.${report.id}`,
      label: l('commands.generateReport').replace('{name}', report.name),
      category,
      callback: () => this.generateReport_(report),
      isAvailable: () => {
        try {
          if (!this.selectSatManager_?.primarySatObj?.isSatellite()) {
            return false;
          }
          if (report.requiresSensor && !ServiceLocator.getSensorManager().isSensorSelected()) {
            return false;
          }

          return true;
        } catch {
          return false;
        }
      },
    }));

    return [
      {
        id: 'ReportsPlugin.open',
        label: l('commands.open'),
        category,
        callback: () => this.bottomMenuClicked(),
        isAvailable: () => !!this.selectSatManager_?.primarySatObj?.isSatellite?.(),
      },
      ...reportCommands,
    ];
  }

  // =========================================================================
  // Side menu HTML (v13 card UI)
  // =========================================================================

  private buildSideMenuHtml_(): string {
    const reports = ReportsPlugin.getRegisteredReports();
    const orbitReports = reports.filter((r) => !r.requiresSensor);
    const sensorReports = reports.filter((r) => r.requiresSensor);

    return html`
      <div id="reports-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="reports-content" class="side-menu">
          <section class="kt-section">
            <div class="kt-section-label">${l('sections.orbitPosition')}</div>
            ${ReportsPlugin.buildActionRows_(orbitReports)}
          </section>
          <section class="kt-section">
            <div class="kt-section-label">${l('sections.sensor')}</div>
            <div class="kt-note" id="reports-sensor-note">${l('sensorNote')}</div>
            ${ReportsPlugin.buildActionRows_(sensorReports)}
          </section>
          <section class="kt-section">
            <div class="kt-section-label">${l('sections.options')}</div>
            <div class="kt-field-row">
              <div class="input-field col s12">
                <select id="reports-window">${this.buildWindowOptions_()}</select>
                <label for="reports-window">${l('options.window')}</label>
              </div>
            </div>
            <div class="kt-field-row">
              <div class="input-field col s6">
                <select id="reports-step">${this.buildStepOptions_()}</select>
                <label for="reports-step">${l('options.step')}</label>
              </div>
              <div class="input-field col s6">
                <select id="reports-format">${this.buildFormatOptions_()}</select>
                <label for="reports-format">${l('options.format')}</label>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  private static buildActionRows_(reports: ReportGenerator[]): string {
    return reports
      .map(
        (report) => html`
        <button id="${report.id}-btn" type="button" class="kt-action waves-effect" title="${report.description || report.name}">
          <span class="kt-action-label">${report.name}</span>
        </button>
      `
      )
      .join('');
  }

  private buildWindowOptions_(): string {
    return WINDOW_OPTIONS_SEC.map((sec) => {
      const days = sec / (24 * 60 * 60);

      return `<option value="${sec}" ${sec === this.windowSec_ ? 'selected' : ''}>${l('options.days').replace('{days}', days.toString())}</option>`;
    }).join('');
  }

  private buildStepOptions_(): string {
    return STEP_OPTIONS_SEC.map(
      (sec) => `<option value="${sec}" ${sec === this.stepSec_ ? 'selected' : ''}>${l('options.seconds').replace('{seconds}', sec.toString())}</option>`
    ).join('');
  }

  private buildFormatOptions_(): string {
    const formats: ReportFormat[] = ['text', 'csv', 'json'];

    return formats.map((fmt) => `<option value="${fmt}" ${fmt === this.format_ ? 'selected' : ''}>${l(`options.format_${fmt}`)}</option>`).join('');
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => this.uiManagerFinal_());
    EventBus.getInstance().on(EventBusEvent.setSensor, () => this.updateSensorReportsState_());
    EventBus.getInstance().on(EventBusEvent.resetSensor, () => this.updateSensorReportsState_());
  }

  private uiManagerFinal_(): void {
    this.restoreOptions_();

    // Attach click handlers for every registered report button.
    ReportsPlugin.getRegisteredReports().forEach((report) => {
      getEl(`${report.id}-btn`, true)?.addEventListener('click', () => this.generateReport_(report));
    });

    // Persist + apply the output options whenever they change.
    getEl('reports-window', true)?.addEventListener('change', () => this.readOptionsFromForm_());
    getEl('reports-step', true)?.addEventListener('change', () => this.readOptionsFromForm_());
    getEl('reports-format', true)?.addEventListener('change', () => this.readOptionsFromForm_());

    initMaterialSelects(getEl('reports-menu', true) ?? document.body);
    this.updateSensorReportsState_();
  }

  /** Enables/disables the sensor-requiring report rows and toggles the requirement note. */
  private updateSensorReportsState_(): void {
    const hasSensor = (() => {
      try {
        return ServiceLocator.getSensorManager().isSensorSelected();
      } catch {
        return false;
      }
    })();

    ReportsPlugin.getRegisteredReports()
      .filter((r) => r.requiresSensor)
      .forEach((r) => {
        const btn = getEl(`${r.id}-btn`, true) as HTMLButtonElement | null;

        if (btn) {
          btn.disabled = !hasSensor;
        }
      });

    const note = getEl('reports-sensor-note', true);

    if (note) {
      note.style.display = hasSensor ? 'none' : 'block';
    }
  }

  // =========================================================================
  // Options persistence
  // =========================================================================

  private readOptionsFromForm_(): void {
    const windowEl = getEl('reports-window', true) as HTMLSelectElement | null;
    const stepEl = getEl('reports-step', true) as HTMLSelectElement | null;
    const formatEl = getEl('reports-format', true) as HTMLSelectElement | null;

    if (windowEl) {
      this.windowSec_ = parseInt(windowEl.value, 10) || REPORT_DEFAULTS.windowSec;
    }
    if (stepEl) {
      this.stepSec_ = parseInt(stepEl.value, 10) || REPORT_DEFAULTS.stepSec;
    }
    if (formatEl) {
      this.format_ = formatEl.value as ReportFormat;
    }

    this.persistOptions_();
  }

  private persistOptions_(): void {
    const settings: ReportsSettings = { windowSec: this.windowSec_, stepSec: this.stepSec_, format: this.format_ };

    PersistenceManager.getInstance().saveItem(StorageKey.REPORTS_SETTINGS, JSON.stringify(settings));
  }

  private restoreOptions_(): void {
    const raw = PersistenceManager.getInstance().getItem(StorageKey.REPORTS_SETTINGS);

    if (raw) {
      try {
        const settings = JSON.parse(raw) as ReportsSettings;

        if (typeof settings.windowSec === 'number') {
          this.windowSec_ = settings.windowSec;
        }
        if (typeof settings.stepSec === 'number') {
          this.stepSec_ = settings.stepSec;
        }
        if (settings.format) {
          this.format_ = settings.format;
        }
      } catch {
        // Ignore corrupt settings and fall back to defaults.
      }
    }

    // Reflect the restored values in the form controls.
    const windowEl = getEl('reports-window', true) as HTMLSelectElement | null;
    const stepEl = getEl('reports-step', true) as HTMLSelectElement | null;
    const formatEl = getEl('reports-format', true) as HTMLSelectElement | null;

    if (windowEl) {
      windowEl.value = this.windowSec_.toString();
    }
    if (stepEl) {
      stepEl.value = this.stepSec_.toString();
    }
    if (formatEl) {
      formatEl.value = this.format_;
    }
  }

  // =========================================================================
  // Report generation
  // =========================================================================

  /**
   * Generic report generation method that works with any registered report
   */
  private generateReport_(report: ReportGenerator): void {
    const sat = this.getSat_();

    if (!sat) {
      return;
    }

    let sensor: DetailedSensor | null = null;

    if (report.requiresSensor) {
      sensor = this.getSensor_();
      if (!sensor) {
        return;
      }
    }

    const reportData = report.generate(sat, sensor, this.buildContext_(sat));

    this.writeReport_(reportData);
  }

  /** Assembles the report context: time window, injected dependencies, and report epoch. */
  private buildContext_(sat: Satellite): ReportContext {
    const startTime = this.getStartTime_();
    const options: ReportOptions = { startTime, windowSec: this.windowSec_, stepSec: this.stepSec_ };

    return { options, deps: this.buildCoreDeps_(sat), generatedAt: startTime };
  }

  /**
   * Builds the application-state dependencies the pure generators need. Everything
   * is computed lazily inside the closures so non-sensor reports (e.g. COES) never
   * trigger the satrec/pass machinery.
   */
  private buildCoreDeps_(sat: Satellite): ReportCoreDeps {
    return {
      findPasses: (sensor, opts) => this.findPasses_(sat, sensor, opts),
      sunStatusAt: (date) => ReportsPlugin.sunStatusAt_(sat, date),
    };
  }

  /** Finds in-view passes via the shared best-pass finder, mapping rows to {@link ReportPass}. */
  private findPasses_(sat: Satellite, sensor: DetailedSensor, opts: ReportOptions): ReportPass[] {
    const catalogManager = ServiceLocator.getCatalogManager();
    const satrec = catalogManager.calcSatrec(sat);
    const scene = ServiceLocator.getScene();
    const deps: BestPassDeps = {
      baseTimeMs: opts.startTime.getTime(),
      getRae: (date, sr, sen) => SatMath.getRae(date, sr, sen),
      checkIsInView: (sen, rae) => SatMath.checkIsInView(sen, rae as Parameters<typeof SatMath.checkIsInView>[1]),
      sunEciKm: () => ({
        x: scene.sun.position[0] as Kilometers,
        y: scene.sun.position[1] as Kilometers,
        z: scene.sun.position[2] as Kilometers,
      }),
    };

    // Detect passes with a coarse step (short LEO passes are minutes long); the
    // finer per-sample resolution for AER is applied separately via opts.stepSec.
    const { passes } = findPassesForSat(
      sat.sccNum,
      satrec,
      sensor,
      {
        lengthDays: opts.windowSec / (24 * 60 * 60),
        intervalSec: Math.min(opts.stepSec, 30),
        maxResults: 1000,
      },
      deps
    );

    return passes.map((row) => ({
      aos: row.START_DATE as Date,
      los: row.STOP_DATE as Date,
      maxEl: parseFloat((row.MAXIMUM_ELEVATION as string) ?? '0'),
      maxElTime: new Date(row.MAXIMUM_ELEVATION_DTG as number),
    }));
  }

  /** Computes the satellite's sun-illumination state and sun angle at a given time. */
  private static sunStatusAt_(sat: Satellite, date: Date): { illumination: SunIllumination; sunAngleDeg: number } | null {
    const stateVector = sat.eci(date);

    if (!stateVector) {
      return null;
    }

    const sunPosArr = ServiceLocator.getScene().sun.getEci(date);
    const sunPos = { x: sunPosArr[0], y: sunPosArr[1], z: sunPosArr[2] } as TemeVec3<Kilometers>;
    const status = SatMath.calculateIsInSun(stateVector, sunPos);
    const sunAngleDeg = SatMath.sunSatEarthAngle(stateVector.position, sunPos);

    const illuminationMap: Record<SunStatus, SunIllumination> = {
      [SunStatus.SUN]: 'sun',
      [SunStatus.PENUMBRAL]: 'penumbral',
      [SunStatus.UMBRAL]: 'umbral',
    } as Record<SunStatus, SunIllumination>;

    return { illumination: illuminationMap[status] ?? 'unknown', sunAngleDeg };
  }

  /**
   * Register all built-in reports
   * This is called during construction
   */
  private registerBuiltInReports_(): void {
    ReportsPlugin.registerReport({
      id: 'aer-report',
      name: l('reports.aer.name'),
      description: l('reports.aer.description'),
      requiresSensor: true,
      generate: (sat, sensor, ctx) => {
        if (!sensor) {
          throw new Error('Sensor is required for AER report');
        }

        return generateAerReport(sat, sensor, ctx.options, ctx.deps, ctx.generatedAt);
      },
    });

    ReportsPlugin.registerReport({
      id: 'lla-report',
      name: l('reports.lla.name'),
      description: l('reports.lla.description'),
      requiresSensor: false,
      generate: (sat, _sensor, ctx) => generateLlaReport(sat, ctx.options, ctx.generatedAt),
    });

    ReportsPlugin.registerReport({
      id: 'eci-report',
      name: l('reports.eci.name'),
      description: l('reports.eci.description'),
      requiresSensor: false,
      generate: (sat, _sensor, ctx) => generateEciReport(sat, ctx.options, ctx.generatedAt),
    });

    ReportsPlugin.registerReport({
      id: 'coes-report',
      name: l('reports.coes.name'),
      description: l('reports.coes.description'),
      requiresSensor: false,
      generate: (sat, _sensor, ctx) => generateCoesReport(sat, ctx.generatedAt),
    });

    ReportsPlugin.registerReport({
      id: 'visibility-windows-report',
      name: l('reports.visibilityWindows.name'),
      description: l('reports.visibilityWindows.description'),
      requiresSensor: true,
      generate: (sat, sensor, ctx) => {
        if (!sensor) {
          throw new Error('Sensor is required for Visibility Windows report');
        }

        return generateVisibilityWindowsReport(sat, sensor, ctx.options, ctx.deps, ctx.generatedAt);
      },
    });

    ReportsPlugin.registerReport({
      id: 'sun-eclipse-report',
      name: l('reports.sunEclipse.name'),
      description: l('reports.sunEclipse.description'),
      requiresSensor: false,
      generate: (sat, _sensor, ctx) => generateSunEclipseReport(sat, ctx.options, ctx.deps, ctx.generatedAt),
    });
  }

  // =========================================================================
  // Output
  // =========================================================================

  private writeReport_(data: ReportData): void {
    const win = window.open('', data.filename);

    if (!win) {
      // eslint-disable-next-line no-alert
      alert(t7e('errorMsgs.Reports.popupBlocker'));

      return;
    }

    const preview = buildPreviewText(data);
    const payload = buildDownloadPayload(data, this.format_);
    const blob = new Blob([payload.content], { type: payload.mime });
    const url = URL.createObjectURL(blob);

    win.document.open();
    win.document.close();

    const downloadLink = win.document.createElement('a');

    downloadLink.href = url;
    downloadLink.download = `${data.filename}.${payload.ext}`;
    downloadLink.textContent = t7e('plugins.ReportsPlugin.downloadButton' as Parameters<typeof t7e>[0]);
    win.document.body.appendChild(downloadLink);

    const copyButton = win.document.createElement('button');

    copyButton.textContent = t7e('plugins.ReportsPlugin.copyButton' as Parameters<typeof t7e>[0]);
    copyButton.style.marginLeft = '12px';
    copyButton.addEventListener('click', () => {
      // Clipboard may be unavailable (insecure context); ignore sync and async failures.
      (win.navigator?.clipboard ?? navigator.clipboard)?.writeText(payload.content)?.catch(() => {
        // Ignore clipboard write rejection.
      });
    });
    win.document.body.appendChild(copyButton);
    win.document.body.appendChild(win.document.createElement('br'));

    const pre = win.document.createElement('pre');

    pre.textContent = preview;
    win.document.body.appendChild(pre);

    win.document.title = data.filename;
    // Revoke the object URL when the report window closes so it is not leaked.
    win.addEventListener?.('unload', () => URL.revokeObjectURL(url));
  }

  private getStartTime_(): Date {
    const time = ServiceLocator.getTimeManager().getOffsetTimeObj(0);

    time.setMilliseconds(0);
    time.setSeconds(0);

    return time;
  }

  private getSat_(): Satellite | null {
    const sat = this.selectSatManager_.primarySatObj as Satellite;

    if (!sat) {
      errorManagerInstance.warn(t7e('errorMsgs.SelectSatelliteFirst'));

      return null;
    }

    if (!(sat instanceof Satellite)) {
      errorManagerInstance.warn(t7e('errorMsgs.SelectSatelliteFirst'));

      return null;
    }

    return sat;
  }

  private getSensor_(): DetailedSensor | null {
    const sensorManager = ServiceLocator.getSensorManager();

    if (!sensorManager.isSensorSelected()) {
      errorManagerInstance.warn(t7e('errorMsgs.SelectSensorFirst'));

      return null;
    }

    const sensor = sensorManager.currentSensors[0];

    return sensor;
  }
}
