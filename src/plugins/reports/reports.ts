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
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import type { BurnSummary, MissionImpact, ScreeningDiff } from '@app/engine/conjunction/analysis-state';
import { GetSatType, MenuMode } from '@app/engine/core/interfaces';
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
import { DebrisScreening } from '../debris-screening/debris-screening';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import {
  AnalysisEnv,
  analystParentSccNum,
  CONJUNCTION_DEFAULT_HALF_WIDTH_SEC,
  CONJUNCTION_HALF_WIDTH_OPTIONS_SEC,
  generateConjunctionReport,
  generateManeuverReport,
  generateScreeningCompareReport,
} from './conjunction-report-core';
import { buildDownloadPayload, buildPreviewText, ReportFormat } from './report-formatter';
import {
  addWindowEdgePasses,
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
import { diffScreeningRuns, pickScreeningRunPair, ScreeningRunInput } from './screening-diff';
import './reports.css';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.ReportsPlugin.${key}` as Parameters<typeof t7e>[0]);

/**
 * An object a report can be generated for. Full TLE-backed satellites support
 * every report; ephemeris objects (OEM trajectories such as Pro launch
 * simulations) and ballistic missiles (e.g. interceptors) support the reports
 * that only sample position over time.
 */
export type ReportTarget = Satellite | OemSatellite | MissileObject;

/** Reports that only sample position/time (LLA, ECI, sun/eclipse) work on any target. */
const REPORT_FORMATS: readonly ReportFormat[] = ['text', 'csv', 'json'];

const supportsPositionSampling = (obj: ReportTarget): boolean => obj instanceof Satellite || obj instanceof OemSatellite || obj instanceof MissileObject;

/** Reports that need an orbit (COES) exclude ballistic missiles. */
const supportsOrbitalElements = (obj: ReportTarget): boolean => obj instanceof Satellite || obj instanceof OemSatellite;

/** The context a report generator receives: the time window, injected app state, and the report epoch. */
export interface ReportContext {
  options: ReportOptions;
  deps: ReportCoreDeps;
  /** The simulation time the report is generated at (used in the metadata header). */
  generatedAt: Date;
  /** The selected secondary object, when one is selected. */
  secondary?: Satellite | null;
  /** Half-width (s) of the closest-approach search window around the sim time. */
  conjunctionHalfWidthSec?: number;
}

/** Menu card a report row is listed in. */
export type ReportSection = 'orbit' | 'sensor' | 'conjunction';

/**
 * Duck-typed accessor the Reports plugin reads from the Debris Screening plugin
 * for its retained runs, newest first. See README.md for the exact contract.
 */
interface RetainedScreeningRunsSource {
  getRecentScreeningRuns?: () => readonly ScreeningRunInput[];
}

/** Duck-typed shape of one Maneuver tool burn record (src/plugins-pro/maneuver/burn-history.ts BurnRecord). */
interface BurnRecordLike {
  epochMs: number;
  frame?: string;
  inputDvMs?: { x: number; y: number; z: number };
  magnitudeMs: number;
  source?: string;
  label?: string;
}

/** Duck-typed accessor the Reports plugin reads from the Maneuver plugin. See README.md. */
interface BurnHistorySource {
  getBurnChain?: (sccNum: string) => { records: readonly BurnRecordLike[] } | null;
}

/** Plugin id of the (Pro) Maneuver plugin that owns the burn history. */
const MANEUVER_PLUGIN_ID = 'ManeuverPlugin';

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
  /** Menu card the row is listed in (default: 'sensor' when requiresSensor, else 'orbit'). */
  section?: ReportSection;
  /**
   * Why the report cannot run right now (e.g. "Select a secondary object first"),
   * or null when it can. Shown as the disabled row's tooltip and in the card note.
   */
  unavailableReason?: (obj: ReportTarget) => string | null;
  /**
   * Whether this report can run on the given selected object. Defaults to full
   * TLE-backed satellites only; position-sampling reports also accept ephemeris
   * (OEM) objects and ballistic missiles.
   */
  isSupported?: (obj: ReportTarget) => boolean;
  /**
   * Generate the report data
   * @param sat The selected report target (gated by {@link isSupported})
   * @param sensor The selected sensor (if required)
   * @param ctx The report context (time window, injected dependencies, epoch)
   * @returns The report data to be written
   */
  generate(sat: ReportTarget, sensor: DetailedSensor | null, ctx: ReportContext): ReportData;
}

/** Persisted shape for the last-used output options (StorageKey.REPORTS_SETTINGS). */
interface ReportsSettings {
  windowSec?: number;
  stepSec?: number;
  format?: ReportFormat;
  conjHalfWidthSec?: number;
}

/** Selectable look-ahead windows, in seconds. */
const WINDOW_OPTIONS_SEC = [24 * 60 * 60, 3 * 24 * 60 * 60, 7 * 24 * 60 * 60, 14 * 24 * 60 * 60];
/** Selectable sampling steps, in seconds. */
const STEP_OPTIONS_SEC = [10, 30, 60, 300];

export class ReportsPlugin extends KeepTrackPlugin {
  readonly id = 'ReportsPlugin';
  dependencies_ = [SelectSatManager.name];
  protected readonly selectSatManager_: SelectSatManager;

  /**
   * Static registry of all available report generators
   * Other plugins can register their reports by calling ReportsPlugin.registerReport()
   */
  private static readonly reportRegistry_: Map<string, ReportGenerator> = new Map();

  /** Current output options (restored from persistence in uiManagerFinal_). */
  private windowSec_: number = REPORT_DEFAULTS.windowSec;
  private stepSec_: number = REPORT_DEFAULTS.stepSec;
  private format_: ReportFormat = 'text';
  protected conjHalfWidthSec_: number = CONJUNCTION_DEFAULT_HALF_WIDTH_SEC;

  /**
   * Start minute shared by back-to-back reports. Without it a running clock moves the floored
   * start between two reports made seconds apart (LLA at 17:45, Sun/Eclipse at 17:46 for the
   * "same" inputs). It only chains reports made in quick succession: a report more than
   * {@link START_ANCHOR_MAX_GAP_MS_} of real time after the previous one, or more than
   * {@link START_ANCHOR_MAX_DRIFT_MS_} of sim time after the anchor, starts at the current minute,
   * so leaving the menu open never backdates a later report. Cleared when the menu opens or the
   * user jumps the clock.
   */
  private startAnchor_: { startMs: number; lastRealMs: number } | null = null;
  private static readonly START_ANCHOR_MAX_GAP_MS_ = 2 * 60 * 1000;
  private static readonly START_ANCHOR_MAX_DRIFT_MS_ = 5 * 60 * 1000;

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
    // Default toggle behavior handled by base class. Screening runs and the
    // secondary can change while the menu is closed, so refresh the rows.
    this.updateReportAvailability_();
    // A new menu session starts from the current clock
    this.startAnchor_ = null;
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
          heading: l('help.conjunctionHeading'),
          content: l('help.conjunction'),
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
          const target = ReportsPlugin.asReportTarget_(this.selectSatManager_?.primarySatObj);

          if (!target || !ReportsPlugin.isReportSupported_(report, target) || ReportsPlugin.safeReason_(report, target) !== null) {
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
        isAvailable: () => ReportsPlugin.asReportTarget_(this.selectSatManager_?.primarySatObj) !== null,
      },
      ...reportCommands,
    ];
  }

  // =========================================================================
  // Side menu HTML (v13 card UI)
  // =========================================================================

  /**
   * Select labels carry no `for` attribute on purpose: Materialize v2's
   * FormSelect moves a `for`-linked label inside its generated wrapper, and the
   * destroy() that every re-init (initMaterialSelects / refreshMaterialSelect)
   * runs first deletes that wrapper, label included.
   */
  private buildSideMenuHtml_(): string {
    const reports = ReportsPlugin.getRegisteredReports();
    const orbitReports = reports.filter((r) => ReportsPlugin.sectionOf_(r) === 'orbit');
    const sensorReports = reports.filter((r) => ReportsPlugin.sectionOf_(r) === 'sensor');
    const conjunctionReports = reports.filter((r) => ReportsPlugin.sectionOf_(r) === 'conjunction');

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
            <div class="kt-section-label">${l('sections.conjunction')}</div>
            ${ReportsPlugin.buildActionRows_(conjunctionReports)}
            <div class="kt-note" id="reports-conj-note"></div>
          </section>
          <section class="kt-section">
            <div class="kt-section-label">${l('sections.options')}</div>
            <div class="kt-field-row">
              <div class="input-field col s12">
                <select id="reports-window">${this.buildWindowOptions_()}</select>
                <label>${l('options.window')}</label>
              </div>
            </div>
            <div class="kt-field-row">
              <div class="input-field col s6">
                <select id="reports-step">${this.buildStepOptions_()}</select>
                <label>${l('options.step')}</label>
              </div>
              <div class="input-field col s6">
                <select id="reports-format">${this.buildFormatOptions_()}</select>
                <label>${l('options.format')}</label>
              </div>
            </div>
            <div class="kt-field-row">
              <div class="input-field col s12">
                <select id="reports-conj-window">${this.buildConjWindowOptions_()}</select>
                <label>${l('options.conjWindow')}</label>
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
        <button id="${report.id}-btn" type="button" class="kt-action waves-effect" kt-tooltip="${report.description || report.name}">
          <span class="kt-action-label">${report.name}</span>
        </button>
      `
      )
      .join('');
  }

  /** Menu card a report belongs in. */
  private static sectionOf_(report: ReportGenerator): ReportSection {
    return report.section ?? (report.requiresSensor ? 'sensor' : 'orbit');
  }

  private buildConjWindowOptions_(): string {
    return CONJUNCTION_HALF_WIDTH_OPTIONS_SEC.map((sec) => {
      const hours = sec / 3600;
      const label = l('options.plusMinusHours')
        .replace('{hours}', hours.toString())
        .replace('{span}', (2 * hours).toString());

      return `<option value="${sec}" ${sec === this.conjHalfWidthSec_ ? 'selected' : ''}>${label}</option>`;
    }).join('');
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
    return REPORT_FORMATS.map((fmt) => `<option value="${fmt}" ${fmt === this.format_ ? 'selected' : ''}>${l(`options.format_${fmt}`)}</option>`).join('');
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => this.uiManagerFinal_());
    EventBus.getInstance().on(EventBusEvent.setSensor, () => this.updateReportAvailability_());
    EventBus.getInstance().on(EventBusEvent.resetSensor, () => this.updateReportAvailability_());
    EventBus.getInstance().on(EventBusEvent.selectSatData, () => this.updateReportAvailability_());
    EventBus.getInstance().on(EventBusEvent.setSecondarySat, () => this.updateReportAvailability_());
    // A clock jump is a new set of inputs: the next report re-anchors its start
    EventBus.getInstance().on(EventBusEvent.staticOffsetChange, () => {
      this.startAnchor_ = null;
    });
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
    getEl('reports-conj-window', true)?.addEventListener('change', () => this.readOptionsFromForm_());

    initMaterialSelects(getEl('reports-menu', true) ?? document.body);
    this.updateReportAvailability_();
  }

  /**
   * Enables/disables the report rows for the current selection: sensor-requiring
   * reports need a sensor, and every report needs the selected object to support
   * it (e.g. COES is disabled while a ballistic missile is selected). Also
   * toggles the sensor-requirement note.
   */
  private updateReportAvailability_(): void {
    const hasSensor = (() => {
      try {
        return ServiceLocator.getSensorManager().isSensorSelected();
      } catch {
        return false;
      }
    })();
    const target = ReportsPlugin.asReportTarget_(this.selectSatManager_?.primarySatObj);

    const conjReasons = new Set<string>();

    ReportsPlugin.getRegisteredReports().forEach((r) => {
      const btn = getEl(`${r.id}-btn`, true) as HTMLButtonElement | null;

      if (btn) {
        const missingSensor = !!r.requiresSensor && !hasSensor;
        // With nothing selected the menu cannot be opened anyway, so leave the
        // rows enabled rather than flashing every button disabled.
        const unsupported = target !== null && !ReportsPlugin.isReportSupported_(r, target);
        const reason = target !== null && !unsupported ? ReportsPlugin.safeReason_(r, target) : null;

        btn.disabled = missingSensor || unsupported || reason !== null;
        // The tooltip says why a row is disabled, else what it does.
        btn.setAttribute('kt-tooltip', reason ?? r.description ?? r.name);
        if (reason && ReportsPlugin.sectionOf_(r) === 'conjunction') {
          conjReasons.add(reason);
        }
      }
    });

    const note = getEl('reports-sensor-note', true);

    if (note) {
      note.style.display = hasSensor ? 'none' : 'block';
    }

    const conjNote = getEl('reports-conj-note', true);

    if (conjNote) {
      // One line per reason, so several missing prerequisites stay readable.
      conjNote.replaceChildren(
        ...[...conjReasons].map((reason) => {
          const line = document.createElement('div');

          line.textContent = reason;

          return line;
        })
      );
      conjNote.style.display = conjReasons.size > 0 ? 'block' : 'none';
    }
  }

  /** A report's unavailable reason; a throwing predicate counts as available so one bad report cannot break the menu. */
  private static safeReason_(report: ReportGenerator, target: ReportTarget): string | null {
    try {
      return report.unavailableReason?.(target) ?? null;
    } catch {
      return null;
    }
  }

  // =========================================================================
  // Options persistence
  // =========================================================================

  protected readOptionsFromForm_(): void {
    const windowEl = getEl('reports-window', true) as HTMLSelectElement | null;
    const stepEl = getEl('reports-step', true) as HTMLSelectElement | null;
    const formatEl = getEl('reports-format', true) as HTMLSelectElement | null;
    const conjEl = getEl('reports-conj-window', true) as HTMLSelectElement | null;

    if (windowEl) {
      this.windowSec_ = parseInt(windowEl.value, 10) || REPORT_DEFAULTS.windowSec;
    }
    if (conjEl) {
      this.conjHalfWidthSec_ = parseInt(conjEl.value, 10) || CONJUNCTION_DEFAULT_HALF_WIDTH_SEC;
    }
    if (stepEl) {
      this.stepSec_ = parseInt(stepEl.value, 10) || REPORT_DEFAULTS.stepSec;
    }
    if (formatEl && REPORT_FORMATS.includes(formatEl.value as ReportFormat)) {
      this.format_ = formatEl.value as ReportFormat;
    }

    this.persistOptions_();
  }

  private persistOptions_(): void {
    const settings: ReportsSettings = { windowSec: this.windowSec_, stepSec: this.stepSec_, format: this.format_, conjHalfWidthSec: this.conjHalfWidthSec_ };

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
        if (typeof settings.conjHalfWidthSec === 'number' && (CONJUNCTION_HALF_WIDTH_OPTIONS_SEC as readonly number[]).includes(settings.conjHalfWidthSec)) {
          this.conjHalfWidthSec_ = settings.conjHalfWidthSec;
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

    const conjEl = getEl('reports-conj-window', true) as HTMLSelectElement | null;

    if (conjEl) {
      conjEl.value = this.conjHalfWidthSec_.toString();
    }
  }

  // =========================================================================
  // Report generation
  // =========================================================================

  /** Narrow an arbitrary selected object to a report target, or null. */
  private static asReportTarget_(obj: unknown): ReportTarget | null {
    return obj instanceof Satellite || obj instanceof OemSatellite || obj instanceof MissileObject ? obj : null;
  }

  /** Whether a report can run on the given target (default: full satellites only). */
  private static isReportSupported_(report: ReportGenerator, obj: ReportTarget): boolean {
    return report.isSupported ? report.isSupported(obj) : obj instanceof Satellite;
  }

  /**
   * Generic report generation method that works with any registered report
   */
  private generateReport_(report: ReportGenerator): void {
    // Re-read the form so the report always uses the window/step/format the
    // user currently sees, even if a styled-select change event was missed.
    this.readOptionsFromForm_();

    const sat = this.getSat_();

    if (!sat) {
      return;
    }

    if (!ReportsPlugin.isReportSupported_(report, sat)) {
      errorManagerInstance.warn(l('errorMsgs.notSupportedForObject'));

      return;
    }

    const reason = ReportsPlugin.safeReason_(report, sat);

    if (reason) {
      errorManagerInstance.warn(reason);

      return;
    }

    let sensor: DetailedSensor | null = null;

    if (report.requiresSensor) {
      sensor = this.getSensor_();
      if (!sensor) {
        return;
      }
    }

    let reportData: ReportData;

    try {
      reportData = report.generate(sat, sensor, this.buildContext_(sat));
    } catch (error) {
      errorManagerInstance.warn(`${l('errorMsgs.generationFailed')}: ${error instanceof Error ? error.message : String(error)}`);

      return;
    }

    this.writeReport_(reportData);
  }

  /** Assembles the report context: time window, injected dependencies, and report epoch. */
  protected buildContext_(sat: ReportTarget): ReportContext {
    // The report Date keeps seconds; the tables still start on the whole minute.
    const generatedAt = this.getStartTime_();
    const startTime = new Date(this.resolveStartMs_(generatedAt));
    const options: ReportOptions = { startTime, windowSec: this.windowSec_, stepSec: this.stepSec_ };

    return {
      options,
      deps: this.buildCoreDeps_(sat),
      generatedAt,
      secondary: this.getSecondary_(),
      conjunctionHalfWidthSec: this.conjHalfWidthSec_,
    };
  }

  /**
   * First sample time (whole minute) for a report generated at `generatedAt`. Reuses the
   * anchor for back-to-back reports (see {@link startAnchor_}) so the same settings start on
   * the same sample even with the clock running; otherwise starts at the current minute.
   */
  private resolveStartMs_(generatedAt: Date): number {
    const simMs = generatedAt.getTime();
    const realMs = Date.now();
    const anchor = this.startAnchor_;

    if (
      anchor &&
      simMs >= anchor.startMs &&
      simMs - anchor.startMs <= ReportsPlugin.START_ANCHOR_MAX_DRIFT_MS_ &&
      realMs - anchor.lastRealMs <= ReportsPlugin.START_ANCHOR_MAX_GAP_MS_
    ) {
      anchor.lastRealMs = realMs;

      return anchor.startMs;
    }

    const floored = new Date(simMs);

    floored.setUTCSeconds(0, 0);
    this.startAnchor_ = { startMs: floored.getTime(), lastRealMs: realMs };

    return floored.getTime();
  }

  /**
   * Builds the application-state dependencies the pure generators need. Everything
   * is computed lazily inside the closures so non-sensor reports (e.g. COES) never
   * trigger the satrec/pass machinery.
   */
  private buildCoreDeps_(sat: ReportTarget): ReportCoreDeps {
    return {
      // Pass finding needs a satrec, so it only exists for TLE-backed satellites;
      // sensor reports are gated to those, this guard just keeps the closure total.
      findPasses: (sensor, opts) => (sat instanceof Satellite ? this.findReportPasses_(sat, sensor, opts) : []),
      sunStatusAt: (date) => ReportsPlugin.sunStatusAt_(sat, date),
    };
  }

  /**
   * Passes for the AER and Visibility Windows reports: the rise-to-set passes plus the
   * windows clipped by the report interval. An object that never sets (GEO) yields one
   * `continuous` window spanning the whole interval instead of an empty table.
   */
  protected findReportPasses_(sat: Satellite, sensor: DetailedSensor, opts: ReportOptions): ReportPass[] {
    const satrec = ServiceLocator.getCatalogManager().calcSatrec(sat);
    const sampleAt = (date: Date) => {
      const rae = SatMath.getRae(date, satrec, sensor, true);

      if (rae.el === null) {
        return null;
      }

      return { inView: SatMath.checkIsInView(sensor, rae as Parameters<typeof SatMath.checkIsInView>[1]), el: rae.el };
    };

    return addWindowEdgePasses(this.findPasses_(sat, sensor, opts), opts, Math.min(opts.stepSec, 30), sampleAt);
  }

  /** Finds in-view passes via the shared best-pass finder, mapping rows to {@link ReportPass}. */
  protected findPasses_(sat: Satellite, sensor: DetailedSensor, opts: ReportOptions): ReportPass[] {
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
  private static sunStatusAt_(sat: ReportTarget, date: Date): { illumination: SunIllumination; sunAngleDeg: number } | null {
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

        // The default support gate restricts this report to full satellites.
        return generateAerReport(sat as Satellite, sensor, ctx.options, ctx.deps, ctx.generatedAt);
      },
    });

    ReportsPlugin.registerReport({
      id: 'lla-report',
      name: l('reports.lla.name'),
      description: l('reports.lla.description'),
      requiresSensor: false,
      isSupported: supportsPositionSampling,
      generate: (sat, _sensor, ctx) => generateLlaReport(sat, ctx.options, ctx.generatedAt),
    });

    ReportsPlugin.registerReport({
      id: 'eci-report',
      name: l('reports.eci.name'),
      description: l('reports.eci.description'),
      requiresSensor: false,
      isSupported: supportsPositionSampling,
      generate: (sat, _sensor, ctx) => generateEciReport(sat, ctx.options, ctx.generatedAt),
    });

    ReportsPlugin.registerReport({
      id: 'coes-report',
      name: l('reports.coes.name'),
      description: l('reports.coes.description'),
      requiresSensor: false,
      isSupported: supportsOrbitalElements,
      // MissileObject.toJ2000 throws; the isSupported gate keeps missiles out.
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

        // The default support gate restricts this report to full satellites.
        return generateVisibilityWindowsReport(sat as Satellite, sensor, ctx.options, ctx.deps, ctx.generatedAt);
      },
    });

    ReportsPlugin.registerReport({
      id: 'sun-eclipse-report',
      name: l('reports.sunEclipse.name'),
      description: l('reports.sunEclipse.description'),
      requiresSensor: false,
      isSupported: supportsPositionSampling,
      generate: (sat, _sensor, ctx) => generateSunEclipseReport(sat, ctx.options, ctx.deps, ctx.generatedAt),
    });

    this.registerConjunctionReports_();
  }

  // =========================================================================
  // Conjunction and maneuver reports
  // =========================================================================

  /** Registers the Conjunction Report, the Maneuver Report and the screening comparison. */
  private registerConjunctionReports_(): void {
    ReportsPlugin.registerReport({
      id: 'conjunction-report',
      name: l('reports.conjunction.name'),
      description: l('reports.conjunction.description'),
      section: 'conjunction',
      unavailableReason: (obj) => {
        const secondary = this.getSecondary_();

        return !secondary || (obj instanceof Satellite && secondary.id === obj.id) ? l('reasons.selectSecondary') : null;
      },
      generate: (sat, sensor, ctx) => {
        const secondary = ctx.secondary;

        if (!(sat instanceof Satellite) || !secondary) {
          throw new Error(l('reasons.selectSecondary'));
        }
        const halfWidthSec = ctx.conjunctionHalfWidthSec ?? CONJUNCTION_DEFAULT_HALF_WIDTH_SEC;

        return generateConjunctionReport({
          primary: sat,
          secondary,
          env: this.buildAnalysisEnv_(ctx),
          halfWidthSec,
          missionImpact: this.buildMissionImpact_([sat], ctx.generatedAt, halfWidthSec, sensor),
        });
      },
    });

    ReportsPlugin.registerReport({
      id: 'maneuver-report',
      name: l('reports.maneuver.name'),
      description: l('reports.maneuver.description'),
      section: 'conjunction',
      unavailableReason: (obj) => (obj instanceof Satellite && analystParentSccNum(obj) !== null ? null : l('reasons.selectAnalyst')),
      generate: (sat, sensor, ctx) => this.generateManeuverReport_(sat, sensor, ctx),
    });

    ReportsPlugin.registerReport({
      id: 'screening-compare-report',
      name: l('reports.screeningCompare.name'),
      description: l('reports.screeningCompare.description'),
      section: 'conjunction',
      // Compares two stored runs; it does not depend on the selected object.
      isSupported: () => true,
      unavailableReason: () => (this.getRetainedScreeningRuns_().length < 2 ? l('reasons.needTwoRuns') : null),
      generate: (_sat, _sensor, ctx) => this.generateScreeningCompare_(ctx),
    });
  }

  /** App-side inputs every analysis needs (epoch, version, Pc settings). */
  protected buildAnalysisEnv_(ctx: ReportContext): AnalysisEnv {
    const k = settingsManager.covarianceConfidenceLevel;

    return {
      analysisEpoch: ctx.generatedAt,
      wallClock: new Date(),
      appVersion: __VERSION__,
      covarianceConfidenceLevel: typeof k === 'number' ? k : 1,
      primaryHardBodyRadiusKm: DebrisScreening.PRIMARY_HARD_BODY_RADIUS_KM,
      secondaryHardBodyRadiusKm: DebrisScreening.SECONDARY_HARD_BODY_RADIUS_KM,
    };
  }

  /**
   * Mission-impact block: the selected sensor's passes for each object over the
   * conjunction window. The rest of the block is a placeholder for the composed report.
   */
  private buildMissionImpact_(sats: Satellite[], epoch: Date, halfWidthSec: number, sensor: DetailedSensor | null): MissionImpact {
    const activeSensor = sensor ?? this.getSelectedSensorQuiet_();

    if (!activeSensor) {
      return { sensorName: null, passWindows: null, notes: ['No sensor selected; select a sensor to list pass windows.'] };
    }

    const opts: ReportOptions = { startTime: new Date(epoch.getTime() - halfWidthSec * 1000), windowSec: 2 * halfWidthSec, stepSec: 30 };
    const passWindows = sats.flatMap((sat) => {
      try {
        return this.findPasses_(sat, activeSensor, opts).map((p) => ({
          noradId: sat.sccNum || null,
          aosIso: p.aos.toISOString(),
          losIso: p.los.toISOString(),
          maxElevationDeg: p.maxEl,
        }));
      } catch {
        return [];
      }
    });

    return { sensorName: activeSensor.name, passWindows, notes: [] };
  }

  private generateManeuverReport_(sat: ReportTarget, sensor: DetailedSensor | null, ctx: ReportContext): ReportData {
    const parentScc = analystParentSccNum(sat);

    if (!(sat instanceof Satellite) || !parentScc) {
      throw new Error(l('reasons.selectAnalyst'));
    }

    const parent = this.findSatellite_(parentScc);

    if (!parent) {
      throw new Error(l('errorMsgs.parentNotFound').replace('{scc}', parentScc));
    }

    const halfWidthSec = ctx.conjunctionHalfWidthSec ?? CONJUNCTION_DEFAULT_HALF_WIDTH_SEC;
    // Matched by object and window, so the two runs may be in either order.
    const pair = pickScreeningRunPair(this.getRetainedScreeningRuns_(), parent.sccNum, sat.sccNum);
    let screeningDiff: ScreeningDiff | null = null;
    let reason: string | null = null;

    if (pair) {
      screeningDiff = diffScreeningRuns(pair.pre, pair.post, {
        excludeSecondaryIds: this.lineageExclusions_(parent.sccNum, [sat.sccNum]),
        nameOf: (id) => this.secondaryName_(id),
        source: 'debris-screening-runs',
      });
    } else {
      reason = l('reasons.screeningRunsMissing').replace('{parent}', parent.sccNum).replace('{analyst}', sat.sccNum);
    }

    const secondary = ctx.secondary && ctx.secondary.id !== sat.id && ctx.secondary.id !== parent.id ? ctx.secondary : null;

    return generateManeuverReport({
      parent,
      analyst: sat,
      env: this.buildAnalysisEnv_(ctx),
      burns: this.readBurnHistory_(sat.sccNum),
      secondary,
      halfWidthSec,
      screeningDiff,
      screeningDiffUnavailableReason: reason,
      missionImpact: this.buildMissionImpact_([parent, sat], ctx.generatedAt, halfWidthSec, sensor),
    });
  }

  /** Diff of the two most recent Debris Screening runs (older = pre, newer = post). */
  private generateScreeningCompare_(ctx: ReportContext): ReportData {
    const [newer, older] = this.getRetainedScreeningRuns_();

    if (!newer || !older) {
      throw new Error(l('reasons.needTwoRuns'));
    }

    const pre = this.findSatellite_(older.primaryId);
    const post = this.findSatellite_(newer.primaryId);
    const preRoot = analystParentSccNum(pre) ?? older.primaryId;
    const postRoot = analystParentSccNum(post) ?? newer.primaryId;
    // Runs of one family (parent and its analyst clones): the mutual rows are a
    // clone flying with its parent, not a conjunction, so leave them out.
    const excludeSecondaryIds = preRoot === postRoot ? this.lineageExclusions_(preRoot, [older.primaryId, newer.primaryId]) : [];
    const diff = diffScreeningRuns(older, newer, {
      excludeSecondaryIds,
      nameOf: (id) => this.secondaryName_(id),
      source: 'debris-screening-runs',
    });

    return generateScreeningCompareReport({ diff, env: this.buildAnalysisEnv_(ctx), objects: { pre, post } });
  }

  /**
   * Secondaries to leave out of a parent-vs-analyst diff: the parent, the given
   * analyst ids, and every other analyst object derived from the same parent.
   */
  protected lineageExclusions_(parentScc: string, analystSccs: string[]): string[] {
    const ids = new Set<string>([parentScc, ...analystSccs]);

    try {
      for (const obj of ServiceLocator.getCatalogManager().objectCache) {
        if (obj instanceof Satellite && obj.sccNum && analystParentSccNum(obj) === parentScc) {
          ids.add(obj.sccNum);
        }
      }
    } catch {
      // No catalog (tests, early boot): the explicit ids are enough.
    }

    return [...ids];
  }

  /** The Debris Screening plugin's retained runs, newest first (empty when the accessor is missing). */
  protected getRetainedScreeningRuns_(): readonly ScreeningRunInput[] {
    const source = PluginRegistry.getPlugin(DebrisScreening) as unknown as RetainedScreeningRunsSource | null;

    try {
      return source?.getRecentScreeningRuns?.() ?? [];
    } catch {
      return [];
    }
  }

  /** Burns that produced an analyst object, from the Maneuver plugin, or null when unavailable. */
  protected readBurnHistory_(sccNum: string): BurnSummary[] | null {
    const plugin = PluginRegistry.plugins.find((p) => p.id === MANEUVER_PLUGIN_ID) as unknown as BurnHistorySource | undefined;

    try {
      const chain = plugin?.getBurnChain?.(sccNum);

      if (!chain || chain.records.length === 0) {
        return null;
      }

      return chain.records.map((r) => ({
        epochIso: new Date(r.epochMs).toISOString(),
        frame: r.frame === 'eci' || r.frame === 'ric' ? r.frame : 'unknown',
        inputDeltaVMs: r.inputDvMs ? [r.inputDvMs.x, r.inputDvMs.y, r.inputDvMs.z] : [0, 0, 0],
        magnitudeMs: r.magnitudeMs,
        source: r.source ?? 'unknown',
        label: r.label ?? null,
      }));
    } catch {
      return null;
    }
  }

  /** Looks up a TLE-backed catalog object by NORAD number. */
  protected findSatellite_(scc: string): Satellite | null {
    try {
      const catalogManager = ServiceLocator.getCatalogManager();
      const id = catalogManager.sccNum2Id(scc);

      if (id === null || id === -1) {
        return null;
      }
      const obj = catalogManager.getObject(id, GetSatType.EXTRA_ONLY);

      return obj instanceof Satellite ? obj : null;
    } catch {
      return null;
    }
  }

  protected secondaryName_(scc: string): string {
    return scc ? (this.findSatellite_(scc)?.name ?? '') : '';
  }

  /** The selected secondary, when it is a TLE-backed satellite. */
  protected getSecondary_(): Satellite | null {
    const secondary = this.selectSatManager_?.secondarySatObj;

    return secondary instanceof Satellite ? secondary : null;
  }

  /** The selected sensor, without the "select a sensor" toast. */
  private getSelectedSensorQuiet_(): DetailedSensor | null {
    try {
      const sensorManager = ServiceLocator.getSensorManager();

      return sensorManager.isSensorSelected() ? (sensorManager.currentSensors[0] ?? null) : null;
    } catch {
      return null;
    }
  }

  // =========================================================================
  // Output
  // =========================================================================

  private writeReport_(data: ReportData): void {
    const win = window.open('', data.filename);

    if (!win) {
      // biome-ignore lint/suspicious/noAlert: blocking alert is deliberate so the popup-blocked message is seen even if the toast UI is unavailable; asserted by reports.test.ts
      alert(t7e('errorMsgs.Reports.popupBlocker'));

      return;
    }

    const payload = buildDownloadPayload(data, this.format_);
    // The window shows the chosen format: text keeps the metadata header and
    // aligned table, CSV/JSON show exactly what the download and copy produce.
    const preview = this.format_ === 'text' ? buildPreviewText(data) : payload.content;
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

    // Whole seconds: the report Date prints them (the tables round to the minute in buildContext_).
    time.setMilliseconds(0);

    return time;
  }

  private getSat_(): ReportTarget | null {
    const sat = ReportsPlugin.asReportTarget_(this.selectSatManager_.primarySatObj);

    if (!sat) {
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
