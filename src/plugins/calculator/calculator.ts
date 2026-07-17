import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import {
  Degrees,
  EpochUTC,
  J2000,
  Kilometers,
  KilometersPerSecond,
  RaeVec3,
  Satellite,
  TEME,
  Vector3D,
} from '@ootk/src/main';
import calculatorPng from '@public/img/icons/calculator.png';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import {
  CARTESIAN_FRAMES,
  CoordFrame,
  ConversionContext,
  FrameInputValues,
  FrameOutputs,
  OutputFormat,
  formatValue,
  frameInputToJ2000,
  j2000ToAllFrames,
  j2000ToFrameValues,
  validateFrameInput,
} from './calculator-core';
import './calculator.css';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.Calculator.${key}` as Parameters<typeof t7e>[0]);

/** Error messages thrown by calculator-core that map to a locale key under errorMsgs.*. */
const CORE_ERROR_KEYS = new Set(['noSensorForRae']);

interface FieldDef {
  id: string;
  label: string;
  unit: string;
  default: string;
  readonly?: boolean;
  isAngle?: boolean;
}

interface CalculatorSettings {
  inputFrame: CoordFrame;
  outputFormat: OutputFormat;
  showVelocity: boolean;
  values: Record<string, string>;
}

/*
 * Frame labels resolve lazily so t7e is not evaluated at module parse time,
 * before localization has loaded.
 */
const coordFrameLabel = (frame: CoordFrame): string => {
  switch (frame) {
    case CoordFrame.J2000:
      return 'J2000 (ECI)';
    case CoordFrame.ITRF:
      return 'ITRF (ECEF)';
    case CoordFrame.TEME:
      return 'TEME';
    case CoordFrame.LLA:
      return l('frames.geodeticLla');
    case CoordFrame.RAE:
      return l('frames.raeTopocentric');
    case CoordFrame.RADEC:
      return l('frames.raDecGeocentric');
    case CoordFrame.CLASSICAL:
      return l('frames.classicalElements');
    default:
      return frame;
  }
};

export class Calculator extends KeepTrackPlugin {
  readonly id = 'Calculator';
  protected dependencies_ = [];
  bottomIconImg = calculatorPng;
  bottomIconElementName = 'menu-calculator';

  menuMode: MenuMode[] = [MenuMode.TOOLS, MenuMode.ALL];

  sideMenuElementName = 'calculator-menu';

  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 350,
  };

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/calculator/calculator-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: l('help.framesHeading'),
          content: l('help.frames'),
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2'), l('help.tip3')],
    };
  }

  private currentInputFrame_: CoordFrame = CoordFrame.J2000;
  private outputFormat_: OutputFormat = OutputFormat.FIXED_4;
  private lastOutputs_: FrameOutputs | null = null;
  private lastRae_: RaeVec3<Kilometers, Degrees> | null = null;
  private sensorUsedInCalculation_: DetailedSensor | null = null;
  private showVelocity_ = false;

  sideMenuElementHtml = html`
    <div id="calculator-content">
      <form id="calculator-form">
        <section class="kt-section">
          <div class="kt-section-label">${l('sections.input')}</div>
          <div class="input-field kt-field-row calc-control-row">
            <select id="calc-input-frame">
              ${Object.values(CoordFrame).map((f) =>
    `<option value="${f}" ${f === CoordFrame.J2000 ? 'selected' : ''}>${coordFrameLabel(f)}</option>`,
  ).join('')}
            </select>
            <label for="calc-input-frame">${l('labels.inputFrame')}</label>
          </div>

          <button id="calc-load-sat-btn" class="kt-action calc-load-action waves-effect waves-light" type="button">
            <span class="kt-action-label">${l('labels.loadSelectedSatellite')}</span>
          </button>

          <div id="calc-input-fields"></div>

          <div id="calc-velocity-toggle" class="row calc-velocity-row" style="display:none;">
            <label>
              <input type="checkbox" id="calc-show-velocity" />
              <span>${l('labels.includeVelocity')}</span>
            </label>
          </div>

          <div id="calc-velocity-fields" style="display:none;"></div>
        </section>

        <button id="calc-convert-btn" class="kt-action calc-standalone-action waves-effect waves-light" type="button">
          <span class="kt-action-label">${l('labels.convert')}</span>
        </button>
      </form>

      <section class="kt-section">
        <div class="kt-section-label">${l('labels.outputFormat')}</div>
        <div class="input-field kt-field-row calc-control-row">
          <select id="calc-output-format">
            <option value="4" selected>${l('formats.fixed4')}</option>
            <option value="6">${l('formats.fixed6')}</option>
            <option value="8">${l('formats.fixed8')}</option>
            <option value="sci">${l('formats.scientific')}</option>
            <option value="dms">${l('formats.dms')}</option>
          </select>
          <label for="calc-output-format">${l('labels.outputFormat')}</label>
        </div>
        <div id="calc-epoch-readout" class="calc-epoch" style="display:none;"></div>
      </section>

      <div id="calc-output-sections"></div>

      <button id="calc-copy-btn" class="kt-action calc-standalone-action waves-effect waves-light" type="button" style="display:none;">
        <span class="kt-action-label">${l('labels.copyResults')}</span>
      </button>

      <div id="calc-draw-line-row" style="display:none;">
        <button id="calc-draw-line-btn" class="kt-action calc-standalone-action waves-effect waves-light" type="button">
          <span class="kt-action-label">${l('labels.drawLine')}</span>
        </button>
      </div>
    </div>
  `;

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        // The wrapper root is generated by the base plugin, so opt it into v13 styling here.
        getEl(this.sideMenuElementName, true)?.classList.add('kt-ui-v13');
        this.restoreSettings_();
        this.setupEventListeners_();
        this.rebuildInputFields_();
        this.rebuildOutputSections_();
        // Render the frame/format selects as themed Materialize dropdowns (native
        // <select> popups can't be themed and show an OS-blue hover).
        initMaterialSelects(getEl(this.sideMenuElementName, true) ?? document.body);
      },
    );
  }

  private setupEventListeners_(): void {
    getEl('calc-input-frame')?.addEventListener('change', () => {
      this.currentInputFrame_ = (getEl('calc-input-frame') as HTMLSelectElement).value as CoordFrame;
      this.lastOutputs_ = null;
      this.rebuildInputFields_();
      this.rebuildOutputSections_();
      this.persistSettings_();
    });

    getEl('calc-output-format')?.addEventListener('change', () => {
      this.outputFormat_ = (getEl('calc-output-format') as HTMLSelectElement).value as OutputFormat;
      // Re-render from the stored numeric result; no recomputation (which would re-read the
      // clock and silently mix epochs between the conversion and the format change).
      if (this.lastOutputs_) {
        this.renderOutputs_();
      }
      this.persistSettings_();
    });

    getEl('calc-show-velocity')?.addEventListener('change', () => {
      this.showVelocity_ = (getEl('calc-show-velocity') as HTMLInputElement).checked;
      const velFields = getEl('calc-velocity-fields', true);

      if (velFields) {
        velFields.style.display = this.showVelocity_ ? 'block' : 'none';
      }
    });

    getEl('calc-convert-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.convert_();
    });

    getEl('calc-copy-btn')?.addEventListener('click', () => {
      this.copyResults_();
    });

    getEl('calc-draw-line-btn')?.addEventListener('click', () => {
      this.drawLine_();
    });

    getEl('calc-load-sat-btn')?.addEventListener('click', () => {
      this.loadSelectedSatellite_();
    });

    // Click any output value to copy it.
    getEl('calc-output-sections')?.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.calc-output-value') as HTMLElement | null;

      if (target && target.textContent && target.textContent !== '-') {
        this.copyText_(target.textContent);
      }
    });
  }

  // ── Field Definitions ──

  private getInputFieldDefs_(frame: CoordFrame): FieldDef[] {
    switch (frame) {
      case CoordFrame.J2000:
      case CoordFrame.ITRF:
      case CoordFrame.TEME:
        return [
          { id: 'x', label: `${frame} X`, unit: 'km', default: '6778' },
          { id: 'y', label: `${frame} Y`, unit: 'km', default: '0' },
          { id: 'z', label: `${frame} Z`, unit: 'km', default: '0' },
        ];
      case CoordFrame.LLA:
        return [
          { id: 'lat', label: l('labels.latitude'), unit: 'deg', default: '0', isAngle: true },
          { id: 'lon', label: l('labels.longitude'), unit: 'deg', default: '0', isAngle: true },
          { id: 'alt', label: l('labels.altitude'), unit: 'km', default: '400' },
        ];
      case CoordFrame.RAE:
        return [
          { id: 'sensor', label: l('labels.sensor'), unit: '', default: '', readonly: true },
          { id: 'r', label: l('labels.range'), unit: 'km', default: '3000' },
          { id: 'a', label: l('labels.azimuth'), unit: 'deg', default: '45', isAngle: true },
          { id: 'e', label: l('labels.elevation'), unit: 'deg', default: '30', isAngle: true },
        ];
      case CoordFrame.RADEC:
        return [
          { id: 'ra', label: l('labels.rightAscension'), unit: 'deg', default: '0', isAngle: true },
          { id: 'dec', label: l('labels.declination'), unit: 'deg', default: '0', isAngle: true },
          { id: 'range', label: l('labels.range'), unit: 'km', default: '6778' },
        ];
      case CoordFrame.CLASSICAL:
        return [
          { id: 'sma', label: l('labels.semiMajorAxis'), unit: 'km', default: '6778' },
          { id: 'ecc', label: l('labels.eccentricity'), unit: '', default: '0.001' },
          { id: 'inc', label: l('labels.inclination'), unit: 'deg', default: '51.6', isAngle: true },
          { id: 'raan', label: l('labels.raan'), unit: 'deg', default: '0', isAngle: true },
          { id: 'argpe', label: l('labels.argPerigee'), unit: 'deg', default: '0', isAngle: true },
          { id: 'nu', label: l('labels.trueAnomaly'), unit: 'deg', default: '0', isAngle: true },
        ];
      default:
        return [];
    }
  }

  private getVelocityFieldDefs_(): FieldDef[] {
    return [
      { id: 'vx', label: 'Vx', unit: 'km/s', default: '0' },
      { id: 'vy', label: 'Vy', unit: 'km/s', default: '7.67' },
      { id: 'vz', label: 'Vz', unit: 'km/s', default: '0' },
    ];
  }

  private getOutputFieldDefs_(frame: CoordFrame): FieldDef[] {
    switch (frame) {
      case CoordFrame.J2000:
      case CoordFrame.ITRF:
      case CoordFrame.TEME:
        return [
          { id: `${frame.toLowerCase()}-x`, label: 'X', unit: 'km', default: '' },
          { id: `${frame.toLowerCase()}-y`, label: 'Y', unit: 'km', default: '' },
          { id: `${frame.toLowerCase()}-z`, label: 'Z', unit: 'km', default: '' },
          { id: `${frame.toLowerCase()}-vx`, label: 'Vx', unit: 'km/s', default: '' },
          { id: `${frame.toLowerCase()}-vy`, label: 'Vy', unit: 'km/s', default: '' },
          { id: `${frame.toLowerCase()}-vz`, label: 'Vz', unit: 'km/s', default: '' },
        ];
      case CoordFrame.LLA:
        return [
          { id: 'lla-lat', label: l('labels.latitude'), unit: 'deg', default: '', isAngle: true },
          { id: 'lla-lon', label: l('labels.longitude'), unit: 'deg', default: '', isAngle: true },
          { id: 'lla-alt', label: l('labels.altitude'), unit: 'km', default: '' },
        ];
      case CoordFrame.RAE:
        return [
          { id: 'rae-sensor', label: l('labels.sensor'), unit: '', default: '' },
          { id: 'rae-r', label: l('labels.range'), unit: 'km', default: '' },
          { id: 'rae-a', label: l('labels.azimuth'), unit: 'deg', default: '', isAngle: true },
          { id: 'rae-e', label: l('labels.elevation'), unit: 'deg', default: '', isAngle: true },
        ];
      case CoordFrame.RADEC:
        return [
          { id: 'radec-ra', label: l('labels.rightAscension'), unit: 'deg', default: '', isAngle: true },
          { id: 'radec-dec', label: l('labels.declination'), unit: 'deg', default: '', isAngle: true },
          { id: 'radec-range', label: l('labels.range'), unit: 'km', default: '' },
        ];
      case CoordFrame.CLASSICAL:
        return [
          { id: 'ce-sma', label: l('labels.semiMajorAxis'), unit: 'km', default: '' },
          { id: 'ce-ecc', label: l('labels.eccentricity'), unit: '', default: '' },
          { id: 'ce-inc', label: l('labels.inclination'), unit: 'deg', default: '', isAngle: true },
          { id: 'ce-raan', label: l('labels.raan'), unit: 'deg', default: '', isAngle: true },
          { id: 'ce-argpe', label: l('labels.argPerigee'), unit: 'deg', default: '', isAngle: true },
          { id: 'ce-nu', label: l('labels.trueAnomaly'), unit: 'deg', default: '', isAngle: true },
          { id: 'ce-period', label: l('labels.period'), unit: 'min', default: '' },
          { id: 'ce-apogee', label: l('labels.apogeeAlt'), unit: 'km', default: '' },
          { id: 'ce-perigee', label: l('labels.perigeeAlt'), unit: 'km', default: '' },
        ];
      default:
        return [];
    }
  }

  // ── DOM Rendering ──

  private rebuildInputFields_(): void {
    const container = getEl('calc-input-fields', true);

    if (!container) {
      return;
    }

    const fields = this.getInputFieldDefs_(this.currentInputFrame_);

    container.innerHTML = fields.map((f) => {
      const unitSuffix = f.unit ? ` (${f.unit})` : '';

      return `<div class="row">
        <div class="input-field col s12">
          <input value="${f.default}" id="calc-in-${f.id}" type="text" ${f.readonly ? 'readonly' : ''} />
          <label for="calc-in-${f.id}" class="active">${f.label}${unitSuffix}</label>
        </div>
      </div>`;
    }).join('');

    // Velocity toggle visibility
    const isCartesian = CARTESIAN_FRAMES.includes(this.currentInputFrame_);
    const velToggle = getEl('calc-velocity-toggle', true);
    const velFields = getEl('calc-velocity-fields', true);

    if (velToggle) {
      velToggle.style.display = isCartesian ? 'block' : 'none';
    }
    if (velFields) {
      if (isCartesian) {
        this.rebuildVelocityFields_();
        velFields.style.display = this.showVelocity_ ? 'block' : 'none';
      } else {
        velFields.style.display = 'none';
      }
    }

    // Auto-populate sensor name for RAE
    if (this.currentInputFrame_ === CoordFrame.RAE) {
      const sensor = ServiceLocator.getSensorManager().currentSensors[0];
      const sensorInput = getEl('calc-in-sensor', true) as HTMLInputElement | null;

      if (sensorInput) {
        sensorInput.value = sensor?.name ?? l('msgs.noSensorSelected');
      }
    }

    // Apply any persisted field values now that the inputs exist.
    this.applyPendingRestore_();
  }

  private rebuildVelocityFields_(): void {
    const container = getEl('calc-velocity-fields', true);

    if (!container) {
      return;
    }

    const fields = this.getVelocityFieldDefs_();

    container.innerHTML = fields.map((f) => `<div class="row">
        <div class="input-field col s12">
          <input value="${f.default}" id="calc-in-${f.id}" type="text" />
          <label for="calc-in-${f.id}" class="active">${f.label} (${f.unit})</label>
        </div>
      </div>`).join('');
  }

  private rebuildOutputSections_(): void {
    const container = getEl('calc-output-sections', true);

    if (!container) {
      return;
    }

    const outputFrames = Object.values(CoordFrame).filter((f) => f !== this.currentInputFrame_);

    container.innerHTML = outputFrames.map((frame) => {
      const fields = this.getOutputFieldDefs_(frame);

      return `<section class="kt-section calc-output-section" id="calc-out-${frame.toLowerCase()}-section">
        <div class="kt-section-label">${coordFrameLabel(frame)}</div>
        ${fields.map((f) => {
        const unitSuffix = f.unit ? ` (${f.unit})` : '';

        return `<div class="row calc-output-row">
            <div class="col s5 calc-output-label">${f.label}${unitSuffix}</div>
            <div class="col s7 calc-output-value" id="calc-out-${f.id}" title="${l('labels.clickToCopy')}">-</div>
          </div>`;
      }).join('')}
      </section>`;
    }).join('');

    // Reset post-conversion controls.
    this.setDisplay_('calc-draw-line-row', false);
    this.setDisplay_('calc-copy-btn', false);
  }

  // ── Formatting (thin wrapper over calculator-core) ──

  private formatValue_(value: number, isAngle = false): string {
    return formatValue(value, this.outputFormat_, isAngle);
  }

  // ── Input Reading ──

  private readNumericInput_(fieldId: string, fieldName: string): number {
    const el = getEl(fieldId, true) as HTMLInputElement | null;

    if (!el) {
      throw new Error(l('errorMsgs.fieldNotFound').replace('{field}', fieldName));
    }

    const val = Number(el.value);

    if (isNaN(val)) {
      throw new Error(l('errorMsgs.invalidInput').replace('{field}', fieldName).replace('{value}', el.value));
    }

    return val;
  }

  /** Read every editable field for the active frame into a parsed numeric bag. */
  private readInputs_(frame: CoordFrame): FrameInputValues {
    const values: FrameInputValues = {};

    for (const f of this.getInputFieldDefs_(frame)) {
      if (f.readonly) {
        continue;
      }
      values[f.id] = this.readNumericInput_(`calc-in-${f.id}`, f.label);
    }

    if (CARTESIAN_FRAMES.includes(frame) && this.showVelocity_) {
      for (const f of this.getVelocityFieldDefs_()) {
        values[f.id] = this.readNumericInput_(`calc-in-${f.id}`, f.label);
      }
    }

    return values;
  }

  private buildContext_(epoch: EpochUTC): ConversionContext {
    const timeManager = ServiceLocator.getTimeManager();
    const rawSensor = ServiceLocator.getSensorManager().currentSensors[0];

    return {
      epoch,
      date: timeManager.simulationTimeObj,
      gmst: timeManager.gmst,
      sensor: rawSensor ? new DetailedSensor(rawSensor) : null,
    };
  }

  // ── Conversion Engine ──

  private convert_(): void {
    try {
      const timeManager = ServiceLocator.getTimeManager();
      const epoch = EpochUTC.fromDateTime(timeManager.simulationTimeObj);
      const values = this.readInputs_(this.currentInputFrame_);
      const validationError = validateFrameInput(this.currentInputFrame_, values);

      if (validationError) {
        errorManagerInstance.warn(l(`errorMsgs.${validationError}`));

        return;
      }

      const ctx = this.buildContext_(epoch);
      const j2000 = frameInputToJ2000(this.currentInputFrame_, values, ctx);

      this.lastOutputs_ = j2000ToAllFrames(j2000, this.currentInputFrame_, ctx);
      this.renderOutputs_();
      this.updateEpochReadout_(timeManager.simulationTimeObj);
      this.setDisplay_('calc-copy-btn', true);
      this.persistSettings_();
    } catch (err) {
      const message = (err as Error).message;

      errorManagerInstance.warn(CORE_ERROR_KEYS.has(message)
        ? l(`errorMsgs.${message}`)
        : l('errorMsgs.conversionFailed').replace('{error}', message));
    }
  }

  private renderOutputs_(): void {
    if (!this.lastOutputs_) {
      return;
    }

    const o = this.lastOutputs_;
    const fmt = (v: number, isAngle = false) => this.formatValue_(v, isAngle);
    const set = (id: string, value: string) => {
      const el = getEl(`calc-out-${id}`, true);

      if (el) {
        el.textContent = value;
      }
    };
    const setCartesian = (prefix: string, c: FrameOutputs['j2000']) => {
      if (!c) {
        return;
      }
      set(`${prefix}-x`, fmt(c.x));
      set(`${prefix}-y`, fmt(c.y));
      set(`${prefix}-z`, fmt(c.z));
      set(`${prefix}-vx`, fmt(c.vx));
      set(`${prefix}-vy`, fmt(c.vy));
      set(`${prefix}-vz`, fmt(c.vz));
    };

    setCartesian('j2000', o.j2000);
    setCartesian('itrf', o.itrf);
    setCartesian('teme', o.teme);

    if (o.lla) {
      set('lla-lat', fmt(o.lla.lat, true));
      set('lla-lon', fmt(o.lla.lon, true));
      set('lla-alt', fmt(o.lla.alt));
    }

    if (o.rae !== undefined) {
      this.renderRae_(o.rae, fmt, set);
    }

    if (o.radec) {
      set('radec-ra', fmt(o.radec.ra, true));
      set('radec-dec', fmt(o.radec.dec, true));
      set('radec-range', fmt(o.radec.range));
    }

    if (o.classical !== undefined) {
      this.renderClassical_(o.classical, fmt, set);
    }
  }

  private renderRae_(
    rae: FrameOutputs['rae'],
    fmt: (v: number, isAngle?: boolean) => string,
    set: (id: string, value: string) => void,
  ): void {
    if (!rae) {
      this.lastRae_ = null;
      this.sensorUsedInCalculation_ = null;
      set('rae-sensor', l('msgs.noSensorSelected'));
      set('rae-r', '-');
      set('rae-a', '-');
      set('rae-e', '-');
      this.setDisplay_('calc-draw-line-row', false);

      return;
    }

    this.lastRae_ = { rng: rae.range, az: rae.az, el: rae.el } as RaeVec3<Kilometers, Degrees>;
    this.sensorUsedInCalculation_ = this.buildContext_(EpochUTC.fromDateTime(ServiceLocator.getTimeManager().simulationTimeObj)).sensor ?? null;

    set('rae-sensor', rae.sensorName);
    set('rae-r', fmt(rae.range));
    set('rae-a', fmt(rae.az, true));
    set('rae-e', fmt(rae.el, true));
    this.setDisplay_('calc-draw-line-row', true);
  }

  private renderClassical_(
    classical: FrameOutputs['classical'],
    fmt: (v: number, isAngle?: boolean) => string,
    set: (id: string, value: string) => void,
  ): void {
    if (classical === 'needsVelocity') {
      const noVel = l('msgs.needsVelocity');

      for (const id of ['ce-sma', 'ce-ecc', 'ce-inc', 'ce-raan', 'ce-argpe', 'ce-nu', 'ce-period', 'ce-apogee', 'ce-perigee']) {
        set(id, noVel);
      }

      return;
    }

    set('ce-sma', fmt(classical.sma));
    set('ce-ecc', classical.ecc.toFixed(7));
    set('ce-inc', fmt(classical.inc, true));
    set('ce-raan', fmt(classical.raan, true));
    set('ce-argpe', fmt(classical.argpe, true));
    set('ce-nu', fmt(classical.nu, true));
    set('ce-period', fmt(classical.period));
    set('ce-apogee', fmt(classical.apogee));
    set('ce-perigee', fmt(classical.perigee));
  }

  private updateEpochReadout_(date: Date): void {
    const el = getEl('calc-epoch-readout', true);

    if (el) {
      el.textContent = `${l('labels.epoch')}: ${date.toISOString()}`;
      el.style.display = 'block';
    }
  }

  private setDisplay_(id: string, visible: boolean): void {
    const el = getEl(id, true);

    if (el) {
      el.style.display = visible ? 'block' : 'none';
    }
  }

  // ── Copy ──

  private copyResults_(): void {
    if (!this.lastOutputs_) {
      return;
    }

    const lines: string[] = [];
    const o = this.lastOutputs_;
    const fmt = (v: number, isAngle = false) => this.formatValue_(v, isAngle);
    const pushCart = (frame: CoordFrame, c: FrameOutputs['j2000']) => {
      if (!c) {
        return;
      }
      lines.push(`${coordFrameLabel(frame)}: X=${fmt(c.x)} Y=${fmt(c.y)} Z=${fmt(c.z)} Vx=${fmt(c.vx)} Vy=${fmt(c.vy)} Vz=${fmt(c.vz)}`);
    };

    pushCart(CoordFrame.J2000, o.j2000);
    pushCart(CoordFrame.ITRF, o.itrf);
    pushCart(CoordFrame.TEME, o.teme);
    if (o.lla) {
      lines.push(`${coordFrameLabel(CoordFrame.LLA)}: Lat=${fmt(o.lla.lat, true)} Lon=${fmt(o.lla.lon, true)} Alt=${fmt(o.lla.alt)}`);
    }
    if (o.rae) {
      lines.push(`${coordFrameLabel(CoordFrame.RAE)} [${o.rae.sensorName}]: R=${fmt(o.rae.range)} A=${fmt(o.rae.az, true)} E=${fmt(o.rae.el, true)}`);
    }
    if (o.radec) {
      lines.push(`${coordFrameLabel(CoordFrame.RADEC)}: RA=${fmt(o.radec.ra, true)} Dec=${fmt(o.radec.dec, true)} Range=${fmt(o.radec.range)}`);
    }
    if (o.classical && o.classical !== 'needsVelocity') {
      const c = o.classical;

      lines.push(`${coordFrameLabel(CoordFrame.CLASSICAL)}: a=${fmt(c.sma)} e=${c.ecc.toFixed(7)} i=${fmt(c.inc, true)} RAAN=${fmt(c.raan, true)} argPe=${fmt(c.argpe, true)} nu=${fmt(c.nu, true)}`);
    }

    this.copyText_(lines.join('\n'));
  }

  private copyText_(text: string): void {
    navigator.clipboard?.writeText(text).then(
      () => ServiceLocator.getUiManager().toast(l('msgs.copied'), ToastMsgType.normal),
      () => errorManagerInstance.warn(l('errorMsgs.copyFailed')),
    );
  }

  // ── Draw Line ──

  private drawLine_(): void {
    if (!this.lastRae_ || !this.sensorUsedInCalculation_) {
      errorManagerInstance.warn(l('errorMsgs.noRaeData'));

      return;
    }

    ServiceLocator.getLineManager().createSensorToRae(
      this.sensorUsedInCalculation_,
      this.lastRae_,
    );
  }

  // ── Load Selected Satellite ──

  private loadSelectedSatellite_(): void {
    const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

    if (!selectSatManager || selectSatManager.selectedSat === -1) {
      errorManagerInstance.warn(l('errorMsgs.noSatelliteSelected'));

      return;
    }

    const sat = ServiceLocator.getCatalogManager().getObject(selectSatManager.selectedSat);

    if (!sat || !sat.isSatellite()) {
      errorManagerInstance.warn(l('errorMsgs.notASatellite'));

      return;
    }

    const timeManager = ServiceLocator.getTimeManager();
    const pv = (sat as Satellite).eci(timeManager.simulationTimeObj);

    if (!pv) {
      errorManagerInstance.warn(l('errorMsgs.couldNotPropagate'));

      return;
    }

    // Satellite.eci() returns TEME. Convert to J2000, then into the selected input frame.
    const epoch = EpochUTC.fromDateTime(timeManager.simulationTimeObj);
    const teme = new TEME(epoch,
      new Vector3D<Kilometers>(pv.position.x, pv.position.y, pv.position.z),
      new Vector3D<KilometersPerSecond>(pv.velocity.x, pv.velocity.y, pv.velocity.z),
    );

    this.populateInputFieldsFromJ2000_(teme.toJ2000());
  }

  private populateInputFieldsFromJ2000_(j2000: J2000): void {
    const ctx = this.buildContext_(j2000.epoch);

    let values: FrameInputValues;

    try {
      values = j2000ToFrameValues(j2000, this.currentInputFrame_, ctx);
    } catch (err) {
      const message = (err as Error).message;

      errorManagerInstance.warn(CORE_ERROR_KEYS.has(message) ? l(`errorMsgs.${message}`) : message);

      return;
    }

    const setInput = (id: string, value: number) => {
      const el = getEl(`calc-in-${id}`, true) as HTMLInputElement | null;

      if (el) {
        el.value = value.toFixed(4);
      }
    };

    for (const [id, value] of Object.entries(values)) {
      setInput(id, value);
    }

    // Cartesian frames carry velocity; surface the fields so the values are visible.
    if (CARTESIAN_FRAMES.includes(this.currentInputFrame_) && ('vx' in values)) {
      this.enableVelocity_();
    }

    // Auto-convert after loading.
    this.convert_();
  }

  private enableVelocity_(): void {
    this.showVelocity_ = true;
    const checkbox = getEl('calc-show-velocity', true) as HTMLInputElement | null;

    if (checkbox) {
      checkbox.checked = true;
    }
    this.setDisplay_('calc-velocity-fields', true);
  }

  // ── Persistence ──

  private persistSettings_(): void {
    const values: Record<string, string> = {};

    for (const f of [...this.getInputFieldDefs_(this.currentInputFrame_), ...this.getVelocityFieldDefs_()]) {
      const el = getEl(`calc-in-${f.id}`, true) as HTMLInputElement | null;

      if (el && !f.readonly) {
        values[f.id] = el.value;
      }
    }

    const settings: CalculatorSettings = {
      inputFrame: this.currentInputFrame_,
      outputFormat: this.outputFormat_,
      showVelocity: this.showVelocity_,
      values,
    };

    try {
      localStorage.setItem(StorageKey.CALCULATOR_SETTINGS, JSON.stringify(settings));
    } catch {
      // Persistence is best-effort; ignore quota/availability errors.
    }
  }

  private restoreSettings_(): void {
    let settings: CalculatorSettings | null = null;

    try {
      const raw = localStorage.getItem(StorageKey.CALCULATOR_SETTINGS);

      settings = raw ? JSON.parse(raw) as CalculatorSettings : null;
    } catch {
      settings = null;
    }

    if (!settings || !Object.values(CoordFrame).includes(settings.inputFrame)) {
      return;
    }

    this.currentInputFrame_ = settings.inputFrame;
    this.outputFormat_ = settings.outputFormat;
    this.showVelocity_ = settings.showVelocity ?? false;

    const frameSelect = getEl('calc-input-frame', true) as HTMLSelectElement | null;
    const formatSelect = getEl('calc-output-format', true) as HTMLSelectElement | null;

    if (frameSelect) {
      frameSelect.value = settings.inputFrame;
    }
    if (formatSelect) {
      formatSelect.value = settings.outputFormat;
    }

    const velCheckbox = getEl('calc-show-velocity', true) as HTMLInputElement | null;

    if (velCheckbox) {
      velCheckbox.checked = this.showVelocity_;
    }

    // rebuildInputFields_ (called after this in addJs) recreates the inputs; defer value
    // restoration to a microtask so it runs against the freshly built fields.
    this.pendingRestoreValues_ = settings.values ?? null;
  }

  private pendingRestoreValues_: Record<string, string> | null = null;

  /** Apply persisted input values; called by rebuildInputFields_ after it builds the fields. */
  private applyPendingRestore_(): void {
    if (!this.pendingRestoreValues_) {
      return;
    }

    for (const [id, value] of Object.entries(this.pendingRestoreValues_)) {
      const el = getEl(`calc-in-${id}`, true) as HTMLInputElement | null;

      if (el) {
        el.value = value;
      }
    }
    this.pendingRestoreValues_ = null;
  }
}
