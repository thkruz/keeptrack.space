import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import {
  ClassicalElements,
  DEG2RAD,
  Degrees,
  EpochUTC,
  Geodetic,
  ITRF,
  J2000,
  Kilometers,
  KilometersPerSecond,
  RadecGeocentric,
  Radians,
  RaeVec3,
  Satellite,
  TEME,
  Vector3D,
  eci2rae,
  rae2eci,
} from '@ootk/src/main';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import calculatorPng from '@public/img/icons/calculator.png';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './calculator.css';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.Calculator.${key}` as Parameters<typeof t7e>[0]);

enum CoordFrame {
  J2000 = 'J2000',
  ITRF = 'ITRF',
  TEME = 'TEME',
  LLA = 'LLA',
  RAE = 'RAE',
  RADEC = 'RaDec',
  CLASSICAL = 'Classical',
}

enum OutputFormat {
  FIXED_4 = '4',
  FIXED_6 = '6',
  FIXED_8 = '8',
  SCIENTIFIC = 'sci',
  DMS = 'dms',
}

interface FieldDef {
  id: string;
  label: string;
  unit: string;
  default: string;
  readonly?: boolean;
  isAngle?: boolean;
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

const CARTESIAN_FRAMES: CoordFrame[] = [CoordFrame.J2000, CoordFrame.ITRF, CoordFrame.TEME];

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
  private lastJ2000_: J2000 | null = null;
  private lastEpoch_: EpochUTC | null = null;
  private lastRae_: RaeVec3<Kilometers, Degrees> | null = null;
  private sensorUsedInCalculation_: DetailedSensor | null = null;
  private showVelocity_ = false;

  sideMenuElementHtml = html`
    <div id="calculator-content">
      <form id="calculator-form">
        <div class="row calc-control-row">
          <div class="input-field col s12">
            <label for="calc-input-frame">${l('labels.inputFrame')}</label>
            <select id="calc-input-frame">
              ${Object.values(CoordFrame).map((f) =>
    `<option value="${f}" ${f === CoordFrame.J2000 ? 'selected' : ''}>${coordFrameLabel(f)}</option>`,
  ).join('')}
            </select>
          </div>
        </div>

        <div class="center-align row" id="calc-load-sat-row">
          <button id="calc-load-sat-btn" class="btn btn-ui waves-effect waves-light" type="button">${l('labels.loadSelectedSatellite')}</button>
        </div>

        <div id="calc-input-fields"></div>

        <div id="calc-velocity-toggle" class="row" style="display:none;">
          <div class="col s12">
            <label>
              <input type="checkbox" id="calc-show-velocity" />
              <span>${l('labels.includeVelocity')}</span>
            </label>
          </div>
        </div>

        <div id="calc-velocity-fields" style="display:none;"></div>

        <div class="center-align row" style="margin: 1rem 0rem 0rem 0rem;">
          <button id="calc-convert-btn" class="btn btn-ui waves-effect waves-light" type="submit">${l('labels.convert')} &#9658;</button>
        </div>
      </form>

      <div class="row calc-control-row">
        <div class="input-field col s12">
          <label for="calc-output-format">${l('labels.outputFormat')}</label>
          <select id="calc-output-format">
            <option value="4" selected>${l('formats.fixed4')}</option>
            <option value="6">${l('formats.fixed6')}</option>
            <option value="8">${l('formats.fixed8')}</option>
            <option value="sci">${l('formats.scientific')}</option>
            <option value="dms">${l('formats.dms')}</option>
          </select>
        </div>
      </div>

      <div id="calc-output-sections"></div>

      <div id="calc-draw-line-row" class="center-align row" style="display:none;">
        <button id="calc-draw-line-btn" class="btn btn-ui waves-effect waves-light" type="button">${l('labels.drawLine')}</button>
      </div>
    </div>
  `;

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        this.setupEventListeners_();
        this.rebuildInputFields_();
        this.rebuildOutputSections_();
        // Render the frame/format selects as themed Materialize dropdowns (native
        // <select> popups can't be themed and show an OS-blue hover).
        initMaterialSelects(getEl('calculator-menu') ?? document.body);
      },
    );
  }

  private setupEventListeners_(): void {
    getEl('calc-input-frame')?.addEventListener('change', () => {
      this.currentInputFrame_ = (getEl('calc-input-frame') as HTMLSelectElement).value as CoordFrame;
      this.lastJ2000_ = null;
      this.rebuildInputFields_();
      this.rebuildOutputSections_();
    });

    getEl('calc-output-format')?.addEventListener('change', () => {
      this.outputFormat_ = (getEl('calc-output-format') as HTMLSelectElement).value as OutputFormat;
      if (this.lastJ2000_ && this.lastEpoch_) {
        this.populateOutputs_(this.lastJ2000_);
      }
    });

    getEl('calc-show-velocity')?.addEventListener('change', () => {
      this.showVelocity_ = (getEl('calc-show-velocity') as HTMLInputElement).checked;
      const velFields = getEl('calc-velocity-fields');

      if (velFields) {
        velFields.style.display = this.showVelocity_ ? 'block' : 'none';
      }
    });

    getEl('calc-convert-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.convert_();
    });

    getEl('calc-draw-line-btn')?.addEventListener('click', () => {
      this.drawLine_();
    });

    getEl('calc-load-sat-btn')?.addEventListener('click', () => {
      this.loadSelectedSatellite_();
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
    const container = getEl('calc-input-fields');

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
    const velToggle = getEl('calc-velocity-toggle');
    const velFields = getEl('calc-velocity-fields');

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
      const sensorInput = getEl('calc-in-sensor') as HTMLInputElement | null;

      if (sensorInput) {
        sensorInput.value = sensor?.name ?? l('msgs.noSensorSelected');
      }
    }
  }

  private rebuildVelocityFields_(): void {
    const container = getEl('calc-velocity-fields');

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
    const container = getEl('calc-output-sections');

    if (!container) {
      return;
    }

    const outputFrames = Object.values(CoordFrame).filter((f) => f !== this.currentInputFrame_);

    container.innerHTML = outputFrames.map((frame) => {
      const fields = this.getOutputFieldDefs_(frame);

      return `<div class="calc-output-section" id="calc-out-${frame.toLowerCase()}-section">
        <div class="center-align calc-section-header">${coordFrameLabel(frame)}</div>
        ${fields.map((f) => {
        const unitSuffix = f.unit ? ` (${f.unit})` : '';

        return `<div class="row calc-output-row">
            <div class="col s5 calc-output-label">${f.label}${unitSuffix}</div>
            <div class="col s7 calc-output-value" id="calc-out-${f.id}">-</div>
          </div>`;
      }).join('')}
      </div>`;
    }).join('');

    // Reset draw line visibility
    const drawLineRow = getEl('calc-draw-line-row');

    if (drawLineRow) {
      drawLineRow.style.display = 'none';
    }
  }

  // ── Formatting ──

  private formatValue_(value: number, isAngle = false): string {
    switch (this.outputFormat_) {
      case OutputFormat.FIXED_4:
        return value.toFixed(4);
      case OutputFormat.FIXED_6:
        return value.toFixed(6);
      case OutputFormat.FIXED_8:
        return value.toFixed(8);
      case OutputFormat.SCIENTIFIC:
        return value.toExponential(6);
      case OutputFormat.DMS:
        return isAngle ? Calculator.toDms_(value) : value.toFixed(4);
      default:
        return value.toFixed(4);
    }
  }

  private static toDms_(degrees: number): string {
    const sign = degrees < 0 ? '-' : '';
    const abs = Math.abs(degrees);
    const d = Math.floor(abs);
    const mFloat = (abs - d) * 60;
    const m = Math.floor(mFloat);
    const s = (mFloat - m) * 60;

    return `${sign}${d}\u00B0 ${m}' ${s.toFixed(2)}"`;
  }

  // ── Input Reading ──

  private readNumericInput_(fieldId: string, fieldName: string): number {
    const el = getEl(fieldId) as HTMLInputElement | null;

    if (!el) {
      throw new Error(`Field ${fieldName} not found`);
    }

    const val = Number(el.value);

    if (isNaN(val)) {
      throw new Error(`Invalid input for ${fieldName}: "${el.value}" is not a number.`);
    }

    return val;
  }

  private readCartesianInputs_(): { position: Vector3D<Kilometers>; velocity: Vector3D<KilometersPerSecond> } {
    const x = this.readNumericInput_('calc-in-x', 'X') as Kilometers;
    const y = this.readNumericInput_('calc-in-y', 'Y') as Kilometers;
    const z = this.readNumericInput_('calc-in-z', 'Z') as Kilometers;
    const position = new Vector3D<Kilometers>(x, y, z);

    let velocity = Vector3D.origin as Vector3D<KilometersPerSecond>;

    if (this.showVelocity_ && CARTESIAN_FRAMES.includes(this.currentInputFrame_)) {
      const vx = this.readNumericInput_('calc-in-vx', 'Vx') as KilometersPerSecond;
      const vy = this.readNumericInput_('calc-in-vy', 'Vy') as KilometersPerSecond;
      const vz = this.readNumericInput_('calc-in-vz', 'Vz') as KilometersPerSecond;

      velocity = new Vector3D<KilometersPerSecond>(vx, vy, vz);
    }

    return { position, velocity };
  }

  private readGeodeticInputs_(): { lat: Degrees; lon: Degrees; alt: Kilometers } {
    const lat = this.readNumericInput_('calc-in-lat', 'Latitude') as Degrees;
    const lon = this.readNumericInput_('calc-in-lon', 'Longitude') as Degrees;
    const alt = this.readNumericInput_('calc-in-alt', 'Altitude') as Kilometers;

    return { lat, lon, alt };
  }

  private readRaeInputs_(): { rae: RaeVec3<Kilometers, Degrees>; sensor: DetailedSensor } {
    const sensor = ServiceLocator.getSensorManager().currentSensors[0];

    if (!sensor) {
      throw new Error('RAE conversion requires a sensor to be selected.');
    }

    const rng = this.readNumericInput_('calc-in-r', 'Range') as Kilometers;
    const az = this.readNumericInput_('calc-in-a', 'Azimuth') as Degrees;
    const el = this.readNumericInput_('calc-in-e', 'Elevation') as Degrees;

    return {
      rae: { rng, az, el } as RaeVec3<Kilometers, Degrees>,
      sensor: new DetailedSensor(sensor),
    };
  }

  private readClassicalInputs_(epoch: EpochUTC): ClassicalElements {
    const sma = this.readNumericInput_('calc-in-sma', 'Semi-major Axis') as Kilometers;
    const ecc = this.readNumericInput_('calc-in-ecc', 'Eccentricity');
    const inc = this.readNumericInput_('calc-in-inc', 'Inclination');
    const raan = this.readNumericInput_('calc-in-raan', 'RAAN');
    const argpe = this.readNumericInput_('calc-in-argpe', 'Arg. Perigee');
    const nu = this.readNumericInput_('calc-in-nu', 'True Anomaly');

    return new ClassicalElements({
      epoch,
      semimajorAxis: sma,
      eccentricity: ecc,
      inclination: (inc * DEG2RAD) as Radians,
      rightAscension: (raan * DEG2RAD) as Radians,
      argPerigee: (argpe * DEG2RAD) as Radians,
      trueAnomaly: (nu * DEG2RAD) as Radians,
    });
  }

  // ── Conversion Engine ──

  private convert_(): void {
    try {
      const timeManager = ServiceLocator.getTimeManager();
      const epoch = EpochUTC.fromDateTime(timeManager.simulationTimeObj);
      const j2000 = this.inputToJ2000_(epoch);

      this.lastJ2000_ = j2000;
      this.lastEpoch_ = epoch;
      this.populateOutputs_(j2000);
    } catch (err) {
      errorManagerInstance.warn(`Conversion failed: ${(err as Error).message}`);
    }
  }

  private inputToJ2000_(epoch: EpochUTC): J2000 {
    const zeroVel = Vector3D.origin as Vector3D<KilometersPerSecond>;

    switch (this.currentInputFrame_) {
      case CoordFrame.J2000: {
        const { position, velocity } = this.readCartesianInputs_();

        return new J2000(epoch, position, velocity);
      }
      case CoordFrame.ITRF: {
        const { position, velocity } = this.readCartesianInputs_();

        return new ITRF(epoch, position, velocity).toJ2000();
      }
      case CoordFrame.TEME: {
        const { position, velocity } = this.readCartesianInputs_();

        return new TEME(epoch, position, velocity).toJ2000();
      }
      case CoordFrame.LLA: {
        const { lat, lon, alt } = this.readGeodeticInputs_();

        return Geodetic.fromDegrees(lat, lon, alt).toITRF(epoch).toJ2000();
      }
      case CoordFrame.RAE: {
        const { rae, sensor } = this.readRaeInputs_();
        const gmst = ServiceLocator.getTimeManager().gmst;
        const eci = rae2eci(rae, sensor.lla(), gmst);

        return new J2000(epoch,
          new Vector3D<Kilometers>(eci.x, eci.y, eci.z),
          zeroVel,
        );
      }
      case CoordFrame.RADEC: {
        const ra = this.readNumericInput_('calc-in-ra', 'Right Ascension');
        const dec = this.readNumericInput_('calc-in-dec', 'Declination');
        const range = this.readNumericInput_('calc-in-range', 'Range') as Kilometers;
        const radec = RadecGeocentric.fromDegrees(epoch, ra as Degrees, dec as Degrees, range);
        const pos = radec.position(range);

        return new J2000(epoch, pos, zeroVel);
      }
      case CoordFrame.CLASSICAL: {
        return this.readClassicalInputs_(epoch).toJ2000();
      }
      default:
        throw new Error(`Unknown input frame: ${this.currentInputFrame_}`);
    }
  }

  private populateOutputs_(j2000: J2000): void {
    const fmt = (v: number, isAngle = false) => this.formatValue_(v, isAngle);
    const set = (id: string, value: string) => {
      const el = getEl(`calc-out-${id}`);

      if (el) {
        el.textContent = value;
      }
    };

    // J2000
    if (this.currentInputFrame_ !== CoordFrame.J2000) {
      set('j2000-x', fmt(j2000.position.x));
      set('j2000-y', fmt(j2000.position.y));
      set('j2000-z', fmt(j2000.position.z));
      set('j2000-vx', fmt(j2000.velocity.x));
      set('j2000-vy', fmt(j2000.velocity.y));
      set('j2000-vz', fmt(j2000.velocity.z));
    }

    // ITRF
    if (this.currentInputFrame_ !== CoordFrame.ITRF) {
      const itrf = j2000.toITRF();

      set('itrf-x', fmt(itrf.position.x));
      set('itrf-y', fmt(itrf.position.y));
      set('itrf-z', fmt(itrf.position.z));
      set('itrf-vx', fmt(itrf.velocity.x));
      set('itrf-vy', fmt(itrf.velocity.y));
      set('itrf-vz', fmt(itrf.velocity.z));
    }

    // TEME
    if (this.currentInputFrame_ !== CoordFrame.TEME) {
      const teme = j2000.toTEME();

      set('teme-x', fmt(teme.position.x));
      set('teme-y', fmt(teme.position.y));
      set('teme-z', fmt(teme.position.z));
      set('teme-vx', fmt(teme.velocity.x));
      set('teme-vy', fmt(teme.velocity.y));
      set('teme-vz', fmt(teme.velocity.z));
    }

    // LLA (Geodetic)
    if (this.currentInputFrame_ !== CoordFrame.LLA) {
      const geodetic = j2000.toITRF().toGeodetic();

      set('lla-lat', fmt(geodetic.latDeg, true));
      set('lla-lon', fmt(geodetic.lonDeg, true));
      set('lla-alt', fmt(geodetic.alt));
    }

    // RAE
    this.populateRaeOutput_(j2000, fmt, set);

    // RA/Dec (Geocentric)
    if (this.currentInputFrame_ !== CoordFrame.RADEC) {
      const radec = RadecGeocentric.fromStateVector(j2000);

      set('radec-ra', fmt(radec.rightAscensionDegrees, true));
      set('radec-dec', fmt(radec.declinationDegrees, true));
      set('radec-range', fmt(j2000.position.magnitude()));
    }

    // Classical Elements
    if (this.currentInputFrame_ !== CoordFrame.CLASSICAL) {
      this.populateClassicalOutput_(j2000, fmt, set);
    }
  }

  private populateRaeOutput_(
    j2000: J2000,
    fmt: (v: number, isAngle?: boolean) => string,
    set: (id: string, value: string) => void,
  ): void {
    if (this.currentInputFrame_ === CoordFrame.RAE) {
      return;
    }

    const sensor = ServiceLocator.getSensorManager().currentSensors[0];

    if (sensor) {
      const teme = j2000.toTEME();
      const rae = eci2rae(
        ServiceLocator.getTimeManager().simulationTimeObj,
        { x: teme.position.x, y: teme.position.y, z: teme.position.z },
        sensor,
      );

      this.sensorUsedInCalculation_ = new DetailedSensor(sensor);
      this.lastRae_ = { rng: rae.rng, az: rae.az, el: rae.el } as RaeVec3<Kilometers, Degrees>;

      set('rae-sensor', sensor.name);
      set('rae-r', fmt(rae.rng));
      set('rae-a', fmt(rae.az, true));
      set('rae-e', fmt(rae.el, true));

      const drawLineRow = getEl('calc-draw-line-row');

      if (drawLineRow) {
        drawLineRow.style.display = 'block';
      }
    } else {
      this.lastRae_ = null;
      set('rae-sensor', l('msgs.noSensorSelected'));
      set('rae-r', '-');
      set('rae-a', '-');
      set('rae-e', '-');
    }
  }

  private populateClassicalOutput_(
    j2000: J2000,
    fmt: (v: number, isAngle?: boolean) => string,
    set: (id: string, value: string) => void,
  ): void {
    const velMag = j2000.velocity.magnitude();

    if (velMag < 0.001) {
      const noVel = l('msgs.needsVelocity');

      set('ce-sma', noVel);
      set('ce-ecc', noVel);
      set('ce-inc', noVel);
      set('ce-raan', noVel);
      set('ce-argpe', noVel);
      set('ce-nu', noVel);
      set('ce-period', noVel);
      set('ce-apogee', noVel);
      set('ce-perigee', noVel);

      return;
    }

    const ce = j2000.toClassicalElements();

    set('ce-sma', fmt(ce.semimajorAxis));
    set('ce-ecc', ce.eccentricity.toFixed(7));
    set('ce-inc', fmt(ce.inclinationDegrees, true));
    set('ce-raan', fmt(ce.rightAscensionDegrees, true));
    set('ce-argpe', fmt(ce.argPerigeeDegrees, true));
    set('ce-nu', fmt(ce.trueAnomalyDegrees, true));
    set('ce-period', fmt(ce.period));
    set('ce-apogee', fmt(ce.apogee));
    set('ce-perigee', fmt(ce.perigee));
  }

  // ── Draw Line ──

  private drawLine_(): void {
    if (!this.lastRae_ || !this.sensorUsedInCalculation_) {
      errorManagerInstance.warn('No RAE data available. Run a conversion first with a sensor selected.');

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
      errorManagerInstance.warn('No satellite selected.');

      return;
    }

    const sat = ServiceLocator.getCatalogManager().getObject(selectSatManager.selectedSat);

    if (!sat || !sat.isSatellite()) {
      errorManagerInstance.warn('Selected object is not a satellite.');

      return;
    }

    const timeManager = ServiceLocator.getTimeManager();
    const pv = (sat as Satellite).eci(timeManager.simulationTimeObj);

    if (!pv) {
      errorManagerInstance.warn('Could not propagate satellite to current time.');

      return;
    }

    // Satellite.eci() returns TEME. Convert to the currently selected input frame.
    const epoch = EpochUTC.fromDateTime(timeManager.simulationTimeObj);
    const teme = new TEME(epoch,
      new Vector3D<Kilometers>(pv.position.x, pv.position.y, pv.position.z),
      new Vector3D<KilometersPerSecond>(pv.velocity.x, pv.velocity.y, pv.velocity.z),
    );
    const j2000 = teme.toJ2000();

    this.populateInputFieldsFromJ2000_(j2000);
  }

  private populateInputFieldsFromJ2000_(j2000: J2000): void {
    const setInput = (id: string, value: string) => {
      const el = getEl(`calc-in-${id}`) as HTMLInputElement | null;

      if (el) {
        el.value = value;
      }
    };

    const f4 = (v: number) => v.toFixed(4);

    switch (this.currentInputFrame_) {
      case CoordFrame.J2000: {
        setInput('x', f4(j2000.position.x));
        setInput('y', f4(j2000.position.y));
        setInput('z', f4(j2000.position.z));
        this.enableVelocityAndSet_(j2000.velocity);
        break;
      }
      case CoordFrame.ITRF: {
        const itrf = j2000.toITRF();

        setInput('x', f4(itrf.position.x));
        setInput('y', f4(itrf.position.y));
        setInput('z', f4(itrf.position.z));
        this.enableVelocityAndSet_(itrf.velocity);
        break;
      }
      case CoordFrame.TEME: {
        const teme = j2000.toTEME();

        setInput('x', f4(teme.position.x));
        setInput('y', f4(teme.position.y));
        setInput('z', f4(teme.position.z));
        this.enableVelocityAndSet_(teme.velocity);
        break;
      }
      case CoordFrame.LLA: {
        const geo = j2000.toITRF().toGeodetic();

        setInput('lat', f4(geo.latDeg));
        setInput('lon', f4(geo.lonDeg));
        setInput('alt', f4(geo.alt));
        break;
      }
      case CoordFrame.RAE: {
        const sensor = ServiceLocator.getSensorManager().currentSensors[0];

        if (!sensor) {
          errorManagerInstance.warn(l('msgs.noSensorForRae'));

          return;
        }
        const teme = j2000.toTEME();
        const rae = eci2rae(
          ServiceLocator.getTimeManager().simulationTimeObj,
          { x: teme.position.x, y: teme.position.y, z: teme.position.z },
          sensor,
        );

        setInput('sensor', sensor.name);
        setInput('r', f4(rae.rng));
        setInput('a', f4(rae.az));
        setInput('e', f4(rae.el));
        break;
      }
      case CoordFrame.RADEC: {
        const radec = RadecGeocentric.fromStateVector(j2000);

        setInput('ra', f4(radec.rightAscensionDegrees));
        setInput('dec', f4(radec.declinationDegrees));
        setInput('range', f4(j2000.position.magnitude()));
        break;
      }
      case CoordFrame.CLASSICAL: {
        const ce = ClassicalElements.fromStateVector(j2000);

        setInput('sma', f4(ce.semimajorAxis));
        setInput('ecc', ce.eccentricity.toFixed(7));
        setInput('inc', f4(ce.inclinationDegrees));
        setInput('raan', f4(ce.rightAscensionDegrees));
        setInput('argpe', f4(ce.argPerigeeDegrees));
        setInput('nu', f4(ce.trueAnomalyDegrees));
        break;
      }
      default:
        break;
    }

    // Auto-convert after loading
    this.convert_();
  }

  private enableVelocityAndSet_(vel: Vector3D<KilometersPerSecond>): void {
    // Enable velocity toggle
    this.showVelocity_ = true;
    const checkbox = getEl('calc-show-velocity') as HTMLInputElement | null;

    if (checkbox) {
      checkbox.checked = true;
    }

    const velFields = getEl('calc-velocity-fields');

    if (velFields) {
      velFields.style.display = 'block';
    }

    const f4 = (v: number) => v.toFixed(4);
    const setInput = (id: string, value: string) => {
      const el = getEl(`calc-in-${id}`) as HTMLInputElement | null;

      if (el) {
        el.value = value;
      }
    };

    setInput('vx', f4(vel.x));
    setInput('vy', f4(vel.y));
    setInput('vz', f4(vel.z));
  }
}
