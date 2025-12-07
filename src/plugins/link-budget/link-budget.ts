/* eslint-disable camelcase */
/**
 * Link Budget Plugin
 * Provides RF link budget analysis for satellite-ground station communications
 */

import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ClickDragOptions, KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { saveCsv } from '@app/engine/utils/saveVariable';
import { showLoading } from '@app/engine/utils/showLoading';
import { Degrees, Satellite, eci2rae, EpochUTC, Seconds } from '@ootk/src/main';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import satcomPng from '@public/img/icons/satcom.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import {
  calculateLinkBudget,
  DEFAULT_PARAMS,
  LinkBudgetParams,
  LinkBudgetResult,
} from './link-budget-math';

interface PassSample {
  time: Date;
  elevation: number;
  range: number;
  dataRate: number;
  linkMargin: number;
  isViable: boolean;
}

interface PassAnalysis {
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  maxElevation: number;
  avgDataRate: number;
  maxDataRate: number;
  totalDataVolume: number; // MB
  samples: PassSample[];
}

export class LinkBudgetPlugin extends KeepTrackPlugin {
  readonly id = 'LinkBudgetPlugin';
  dependencies_ = [SelectSatManager.name];

  private readonly selectSatManager_: SelectSatManager;
  private params_: LinkBudgetParams = { ...DEFAULT_PARAMS };
  private currentResult_: LinkBudgetResult | null = null;
  private passAnalysis_: PassAnalysis | null = null;
  private isAutoUpdate_ = false;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager;
  }

  menuMode: MenuMode[] = [MenuMode.EXPERIMENTAL, MenuMode.ALL];

  isRequireSatelliteSelected = true;
  isRequireSensorSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  bottomIconImg = satcomPng;
  bottomIconCallback: () => void = () => {
    this.updateLinkBudget_();
  };

  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 450,
    maxWidth: 700,
  };

  sideMenuElementName: string = 'link-budget-menu';
  sideMenuElementHtml: string = html`
    <div class="row">
      <h5 class="center-align">Communication Link Budget</h5>
    </div>

    <div class="row" style="margin-bottom: 5px;">
      <div class="col s12">
        <div style="background: #1a2332; padding: 8px; border-radius: 4px;">
          <div style="font-size: 11px; color: #88ccff;">Selected Satellite:</div>
          <div id="link-sat-name" style="font-weight: bold; color: #fff;">-</div>
        </div>
      </div>
    </div>

    <div class="row" style="margin-bottom: 5px;">
      <div class="col s12">
        <div style="background: #1a2332; padding: 8px; border-radius: 4px;">
          <div style="font-size: 11px; color: #88ccff;">Selected Sensor:</div>
          <div id="link-sensor-name" style="font-weight: bold; color: #fff;">-</div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col s12">
        <h6 class="center-align" style="margin-top: 15px; margin-bottom: 10px;">Link Parameters</h6>
      </div>
    </div>

    <form id="link-params-form">
      <div class="row" style="margin-bottom: 5px;">
        <div class="input-field col s6">
          <input id="link-freq-down" type="number" value="2200" step="1" />
          <label for="link-freq-down" class="active">Downlink (MHz)</label>
        </div>
        <div class="input-field col s6">
          <input id="link-freq-up" type="number" value="2025" step="1" />
          <label for="link-freq-up" class="active">Uplink (MHz)</label>
        </div>
      </div>

      <div class="row" style="margin-bottom: 5px;">
        <div class="input-field col s6">
          <input id="link-data-rate" type="number" value="9600" step="100" />
          <label for="link-data-rate" class="active">Data Rate (bps)</label>
        </div>
        <div class="input-field col s6">
          <input id="link-bandwidth" type="number" value="100000" step="1000" />
          <label for="link-bandwidth" class="active">Bandwidth (Hz)</label>
        </div>
      </div>

      <div class="row center-align" style="margin-top: 15px;">
        <button id="link-calc-btn" class="btn btn-ui waves-effect waves-light" type="button">
          Calculate Link Budget &#9658;
        </button>
        <button id="link-pass-btn" class="btn btn-ui waves-effect waves-light" type="button" style="margin-left: 10px;">
          Analyze Next Pass &#9658;
        </button>
      </div>
    </form>

    <div id="link-current-status" style="display: none;">
      <div class="row">
        <div class="col s12">
          <h6 class="center-align" style="margin-top: 20px; margin-bottom: 10px;">Current Geometry</h6>
        </div>
      </div>

      <div class="row" style="margin-bottom: 5px;">
        <div class="col s12">
          <table class="striped-light centered" style="font-size: 12px;">
            <tbody>
              <tr>
                <td style="text-align: right; width: 50%;">Range:</td>
                <td id="link-range" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Elevation:</td>
                <td id="link-elevation" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Azimuth:</td>
                <td id="link-azimuth" style="text-align: left; font-weight: bold;">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="row">
        <div class="col s12">
          <h6 class="center-align" style="margin-top: 15px; margin-bottom: 10px;">
            <span id="link-downlink-title">Downlink Budget</span>
          </h6>
        </div>
      </div>

      <div class="row" style="margin-bottom: 5px;">
        <div class="col s12">
          <table class="striped-light centered" style="font-size: 11px;">
            <tbody>
              <tr>
                <td style="text-align: right; width: 55%;">EIRP:</td>
                <td id="link-dl-eirp" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Path Loss:</td>
                <td id="link-dl-fspl" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Rx Antenna:</td>
                <td id="link-dl-rxgain" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Total Losses:</td>
                <td id="link-dl-losses" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr style="border-top: 1px solid #444;">
                <td style="text-align: right;">Rx Power:</td>
                <td id="link-dl-rxpower" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">G/T:</td>
                <td id="link-dl-gt" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">C/N0:</td>
                <td id="link-dl-cno" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Link Margin:</td>
                <td id="link-dl-margin" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Data Rate:</td>
                <td id="link-dl-datarate" style="text-align: left; font-weight: bold;">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="row">
        <div class="col s12">
          <h6 class="center-align" style="margin-top: 15px; margin-bottom: 10px;">
            <span id="link-uplink-title">Uplink Budget</span>
          </h6>
        </div>
      </div>

      <div class="row" style="margin-bottom: 5px;">
        <div class="col s12">
          <table class="striped-light centered" style="font-size: 11px;">
            <tbody>
              <tr>
                <td style="text-align: right; width: 55%;">EIRP:</td>
                <td id="link-ul-eirp" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Path Loss:</td>
                <td id="link-ul-fspl" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Rx Antenna:</td>
                <td id="link-ul-rxgain" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Total Losses:</td>
                <td id="link-ul-losses" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr style="border-top: 1px solid #444;">
                <td style="text-align: right;">Rx Power:</td>
                <td id="link-ul-rxpower" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">C/N0:</td>
                <td id="link-ul-cno" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Link Margin:</td>
                <td id="link-ul-margin" style="text-align: left; font-weight: bold;">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="link-pass-analysis" style="display: none;">
      <div class="row">
        <div class="col s12">
          <h6 class="center-align" style="margin-top: 20px; margin-bottom: 10px;">Next Pass Analysis</h6>
        </div>
      </div>

      <div class="row" style="margin-bottom: 5px;">
        <div class="col s12">
          <table class="striped-light centered" style="font-size: 12px;">
            <tbody>
              <tr>
                <td style="text-align: right; width: 50%;">Start Time:</td>
                <td id="pass-start-time" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Duration:</td>
                <td id="pass-duration" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Max Elevation:</td>
                <td id="pass-max-el" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Avg Data Rate:</td>
                <td id="pass-avg-rate" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr>
                <td style="text-align: right;">Max Data Rate:</td>
                <td id="pass-max-rate" style="text-align: left; font-weight: bold;">-</td>
              </tr>
              <tr style="border-top: 1px solid #444;">
                <td style="text-align: right; font-size: 13px;">Total Data Volume:</td>
                <td id="pass-total-data" style="text-align: left; font-weight: bold; font-size: 14px; color: #4CAF50;">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="row center-align" style="margin-top: 15px;">
        <button id="pass-export-btn" class="btn btn-ui waves-effect waves-light" type="button">
          Export Pass Data (CSV) &#9658;
        </button>
      </div>
    </div>
  `;

  sideMenuSecondaryHtml: string = html`
    <div class="row">
      <h6 class="center-align">Satellite Parameters</h6>
    </div>

    <div class="row" style="margin-bottom: 5px;">
      <div class="input-field col s6">
        <input id="sat-tx-power" type="number" value="5" step="0.1" />
        <label for="sat-tx-power" class="active">Tx Power (W)</label>
      </div>
      <div class="input-field col s6">
        <input id="sat-tx-gain" type="number" value="3" step="0.5" />
        <label for="sat-tx-gain" class="active">Tx Gain (dBi)</label>
      </div>
    </div>

    <div class="row" style="margin-bottom: 5px;">
      <div class="input-field col s12">
        <input id="sat-rx-gain" type="number" value="2" step="0.5" />
        <label for="sat-rx-gain" class="active">Rx Gain (dBi)</label>
      </div>
    </div>

    <div class="row">
      <h6 class="center-align">Ground Station Parameters</h6>
    </div>

    <div class="row" style="margin-bottom: 5px;">
      <div class="input-field col s6">
        <input id="gs-tx-power" type="number" value="100" step="10" />
        <label for="gs-tx-power" class="active">Tx Power (W)</label>
      </div>
      <div class="input-field col s6">
        <input id="gs-tx-gain" type="number" value="15" step="0.5" />
        <label for="gs-tx-gain" class="active">Tx Gain (dBi)</label>
      </div>
    </div>

    <div class="row" style="margin-bottom: 5px;">
      <div class="input-field col s6">
        <input id="gs-rx-gain" type="number" value="15" step="0.5" />
        <label for="gs-rx-gain" class="active">Rx Gain (dBi)</label>
      </div>
      <div class="input-field col s6">
        <input id="gs-sys-temp" type="number" value="150" step="10" />
        <label for="gs-sys-temp" class="active">Sys Temp (K)</label>
      </div>
    </div>

    <div class="row">
      <h6 class="center-align">Link Settings</h6>
    </div>

    <div class="row" style="margin-bottom: 5px;">
      <div class="input-field col s6">
        <input id="link-eb-no" type="number" value="10" step="0.5" />
        <label for="link-eb-no" class="active">Eb/N0 Req (dB)</label>
      </div>
      <div class="input-field col s6">
        <input id="link-coding-gain" type="number" value="0" step="0.5" />
        <label for="link-coding-gain" class="active">Coding Gain (dB)</label>
      </div>
    </div>

    <div class="row">
      <h6 class="center-align">Atmospheric Losses</h6>
    </div>

    <div class="row" style="margin-bottom: 5px;">
      <div class="input-field col s6">
        <input id="link-atm-loss" type="number" value="0.5" step="0.1" />
        <label for="link-atm-loss" class="active">Atmospheric (dB)</label>
      </div>
      <div class="input-field col s6">
        <input id="link-rain-fade" type="number" value="0" step="0.5" />
        <label for="link-rain-fade" class="active">Rain Fade (dB)</label>
      </div>
    </div>

    <div class="row" style="margin-bottom: 5px;">
      <div class="input-field col s6">
        <input id="link-pol-loss" type="number" value="0.5" step="0.1" />
        <label for="link-pol-loss" class="active">Polarization (dB)</label>
      </div>
      <div class="input-field col s6">
        <input id="link-point-loss" type="number" value="0.5" step="0.1" />
        <label for="link-point-loss" class="active">Pointing (dB)</label>
      </div>
    </div>

    <div class="row" style="margin-bottom: 5px;">
      <div class="input-field col s12">
        <input id="link-misc-loss" type="number" value="1" step="0.1" />
        <label for="link-misc-loss" class="active">Misc Losses (dB)</label>
      </div>
    </div>

    <div class="switch row">
      <label>
        <input id="link-auto-update" type="checkbox" />
        <span class="lever"></span>
        Auto-update with time
      </label>
    </div>

    <div class="row center-align" style="margin-top: 15px;">
      <button id="link-preset-uhf" class="btn btn-ui waves-effect waves-light" style="margin: 2px; font-size: 10px;">UHF</button>
      <button id="link-preset-s" class="btn btn-ui waves-effect waves-light" style="margin: 2px; font-size: 10px;">S-Band</button>
      <button id="link-preset-x" class="btn btn-ui waves-effect waves-light" style="margin: 2px; font-size: 10px;">X-Band</button>
    </div>
  `;

  sideMenuSecondaryOptions = {
    width: 350,
    leftOffset: null,
    zIndex: 10,
  };

  downloadIconCb = () => {
    if (!this.passAnalysis_) {
      return;
    }

    this.exportPassData_();
  };

  addJs(): void {
    super.addJs();

    // Form submission handler
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      getEl('link-params-form')?.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        this.updateLinkBudget_();
      });

      getEl('link-calc-btn')?.addEventListener('click', (e: Event) => {
        e.preventDefault();
        this.updateLinkBudget_();
      });

      // Pass analysis button
      getEl('link-pass-btn')?.addEventListener('click', () => {
        this.analyzeNextPass_();
      });

      // Export pass data button
      getEl('pass-export-btn')?.addEventListener('click', () => {
        this.exportPassData_();
      });

      // Auto-update toggle
      getEl('link-auto-update')?.addEventListener('change', (e: Event) => {
        this.isAutoUpdate_ = (e.target as HTMLInputElement).checked;
      });

      // Preset buttons
      getEl('link-preset-uhf')?.addEventListener('click', () => this.applyPreset_('UHF'));
      getEl('link-preset-s')?.addEventListener('click', () => this.applyPreset_('S'));
      getEl('link-preset-x')?.addEventListener('click', () => this.applyPreset_('X'));
    });

    // Listen for time updates
    EventBus.getInstance().on(EventBusEvent.update, () => {
      if (this.isAutoUpdate_ && this.isMenuButtonActive) {
        this.updateLinkBudget_();
      }
    });

    // Listen for satellite selection changes
    EventBus.getInstance().on(EventBusEvent.selectSatData, () => {
      if (this.isMenuButtonActive) {
        this.updateSatelliteName_();
      }
    });

    // Listen for sensor changes
    EventBus.getInstance().on(EventBusEvent.setSensor, () => {
      if (this.isMenuButtonActive) {
        this.updateSensorName_();
      }
    });
  }

  /**
   * Read parameters from UI inputs
   */
  private readParamsFromUI_(): void {
    // Main form
    this.params_.satFreqDown = parseFloat((getEl('link-freq-down') as HTMLInputElement)?.value || '2200');
    this.params_.satFreqUp = parseFloat((getEl('link-freq-up') as HTMLInputElement)?.value || '2025');
    this.params_.dataRate = parseFloat((getEl('link-data-rate') as HTMLInputElement)?.value || '9600');
    this.params_.bandwidth = parseFloat((getEl('link-bandwidth') as HTMLInputElement)?.value || '100000');

    // Secondary menu (satellite)
    this.params_.satTxPower = parseFloat((getEl('sat-tx-power') as HTMLInputElement)?.value || '5');
    this.params_.satTxGain = parseFloat((getEl('sat-tx-gain') as HTMLInputElement)?.value || '3');
    this.params_.satRxGain = parseFloat((getEl('sat-rx-gain') as HTMLInputElement)?.value || '2');

    // Ground station
    this.params_.gsTxPower = parseFloat((getEl('gs-tx-power') as HTMLInputElement)?.value || '100');
    this.params_.gsTxGain = parseFloat((getEl('gs-tx-gain') as HTMLInputElement)?.value || '15');
    this.params_.gsRxGain = parseFloat((getEl('gs-rx-gain') as HTMLInputElement)?.value || '15');
    this.params_.gsSystemTemp = parseFloat((getEl('gs-sys-temp') as HTMLInputElement)?.value || '150');
    this.params_.gsNoiseFigure = parseFloat((getEl('link-eb-no') as HTMLInputElement)?.value || '2');

    // Link settings
    this.params_.ebNoRequired = parseFloat((getEl('link-eb-no') as HTMLInputElement)?.value || '10');
    this.params_.codingGain = parseFloat((getEl('link-coding-gain') as HTMLInputElement)?.value || '0');

    // Losses
    this.params_.atmosphericLoss = parseFloat((getEl('link-atm-loss') as HTMLInputElement)?.value || '0.5');
    this.params_.rainFade = parseFloat((getEl('link-rain-fade') as HTMLInputElement)?.value || '0');
    this.params_.polarizationLoss = parseFloat((getEl('link-pol-loss') as HTMLInputElement)?.value || '0.5');
    this.params_.pointingLoss = parseFloat((getEl('link-point-loss') as HTMLInputElement)?.value || '0.5');
    this.params_.miscLoss = parseFloat((getEl('link-misc-loss') as HTMLInputElement)?.value || '1');
  }

  /**
   * Update satellite name display
   */
  private updateSatelliteName_(): void {
    const sat = this.selectSatManager_.getSelectedSat();

    if (sat && !(sat instanceof MissileObject)) {
      const nameEl = getEl('link-sat-name');

      if (nameEl) {
        nameEl.textContent = sat.name || `NORAD ${sat.sccNum}`;
      }
    }
  }

  /**
   * Update sensor name display
   */
  private updateSensorName_(): void {
    const sensor = ServiceLocator.getSensorManager().getSensor();

    if (sensor) {
      const nameEl = getEl('link-sensor-name');

      if (nameEl) {
        nameEl.textContent = sensor.objName || sensor.name;
      }
    }
  }

  /**
   * Calculate and display current link budget
   */
  private updateLinkBudget_(): void {
    const sat = this.selectSatManager_.getSelectedSat();
    const sensor = ServiceLocator.getSensorManager().getSensor();

    if (!sat || !sensor || sat instanceof MissileObject) {
      return;
    }

    // Update displays
    this.updateSatelliteName_();
    this.updateSensorName_();

    // Read parameters from UI
    this.readParamsFromUI_();

    // Get current time
    const timeManager = ServiceLocator.getTimeManager();
    const simulationTime = timeManager.simulationTimeObj;

    // Get satellite position
    const eci = sat.eci(simulationTime);

    if (!eci) {
      return;
    }

    // Calculate range, azimuth, elevation
    const rae = eci2rae(simulationTime, eci.position, sensor);
    const range = rae.rng;
    const elevation = rae.el;
    const azimuth = rae.az;

    // Calculate link budget
    this.currentResult_ = calculateLinkBudget(range, elevation, azimuth, this.params_);

    // Display results
    this.displayResults_(this.currentResult_);

    // Show results section
    const statusEl = getEl('link-current-status');

    if (statusEl) {
      statusEl.style.display = 'block';
    }
  }

  /**
   * Display link budget results in UI
   */
  private displayResults_(result: LinkBudgetResult): void {
    // Geometry
    this.setElText_('link-range', `${result.geometry.range.toFixed(1)} km`);
    this.setElText_('link-elevation', `${result.geometry.elevation.toFixed(2)}°`);
    this.setElText_('link-azimuth', `${result.geometry.azimuth.toFixed(2)}°`);

    // Downlink
    this.setElText_('link-dl-eirp', `${result.downlink.eirp.toFixed(1)} dBm`);
    this.setElText_('link-dl-fspl', `${result.downlink.fspl.toFixed(1)} dB`);
    this.setElText_('link-dl-rxgain', `${this.params_.gsRxGain.toFixed(1)} dBi`);
    this.setElText_('link-dl-losses', `${result.downlink.totalLosses.toFixed(1)} dB`);
    this.setElText_('link-dl-rxpower', `${result.downlink.receivedPower.toFixed(1)} dBm`);
    this.setElText_('link-dl-gt', `${result.downlink.gt.toFixed(1)} dB/K`);
    this.setElText_('link-dl-cno', `${result.downlink.cno.toFixed(1)} dB-Hz`);

    const dlMarginEl = getEl('link-dl-margin');

    if (dlMarginEl) {
      const marginText = `${result.downlink.linkMargin.toFixed(1)} dB`;
      const statusIcon = result.downlink.linkMargin > 3 ? ' ✓'
        : result.downlink.linkMargin > 0 ? ' ⚠' : ' ✗';

      dlMarginEl.textContent = marginText + statusIcon;
      dlMarginEl.style.color = result.downlink.linkMargin > 3 ? '#4CAF50'
        : result.downlink.linkMargin > 0 ? '#FFC107' : '#F44336';
    }

    this.setElText_('link-dl-datarate', `${result.downlink.dataRate.toFixed(3)} Mbps`);

    // Uplink
    this.setElText_('link-ul-eirp', `${result.uplink.eirp.toFixed(1)} dBm`);
    this.setElText_('link-ul-fspl', `${result.uplink.fspl.toFixed(1)} dB`);
    this.setElText_('link-ul-rxgain', `${this.params_.satRxGain.toFixed(1)} dBi`);
    this.setElText_('link-ul-losses', `${result.uplink.totalLosses.toFixed(1)} dB`);
    this.setElText_('link-ul-rxpower', `${result.uplink.receivedPower.toFixed(1)} dBm`);
    this.setElText_('link-ul-cno', `${result.uplink.cno.toFixed(1)} dB-Hz`);

    const ulMarginEl = getEl('link-ul-margin');

    if (ulMarginEl) {
      const marginText = `${result.uplink.linkMargin.toFixed(1)} dB`;
      const statusIcon = result.uplink.linkMargin > 3 ? ' ✓'
        : result.uplink.linkMargin > 0 ? ' ⚠' : ' ✗';

      ulMarginEl.textContent = marginText + statusIcon;
      ulMarginEl.style.color = result.uplink.linkMargin > 3 ? '#4CAF50'
        : result.uplink.linkMargin > 0 ? '#FFC107' : '#F44336';
    }

    // Update section titles with status
    const dlTitleEl = getEl('link-downlink-title');

    if (dlTitleEl) {
      const status = result.isViable && result.downlink.linkMargin > 0 ? '✓ ' : '✗ ';

      dlTitleEl.textContent = `${status}Downlink Budget`;
      dlTitleEl.style.color = result.isViable && result.downlink.linkMargin > 0 ? '#4CAF50' : '#F44336';
    }

    const ulTitleEl = getEl('link-uplink-title');

    if (ulTitleEl) {
      const status = result.isViable && result.uplink.linkMargin > 0 ? '✓ ' : '✗ ';

      ulTitleEl.textContent = `${status}Uplink Budget`;
      ulTitleEl.style.color = result.isViable && result.uplink.linkMargin > 0 ? '#4CAF50' : '#F44336';
    }
  }

  /**
   * Analyze next pass and calculate data volume
   */
  // eslint-disable-next-line require-await
  private async analyzeNextPass_(): Promise<void> {
    const sat = this.selectSatManager_.getSelectedSat();
    const sensor = ServiceLocator.getSensorManager().getSensor();

    if (!sat || !sensor || sat instanceof MissileObject) {
      return;
    }

    showLoading(() => {
      this.readParamsFromUI_();

      const timeManager = ServiceLocator.getTimeManager();
      const currentTime = timeManager.simulationTimeObj;

      // Find next pass (simple algorithm - look forward in time)
      const passData = this.findNextPass_(sat, sensor, new EpochUTC(currentTime.getTime() / 1000 as Seconds));

      if (!passData) {
        getEl('link-pass-analysis')!.innerHTML = html`
          <div class="row">
            <div class="col s12 center-align" style="color: #F44336; padding: 20px;">
              No pass found in next 24 hours
            </div>
          </div>
        `;
        getEl('link-pass-analysis')!.style.display = 'block';

        return;
      }

      this.passAnalysis_ = passData;
      this.displayPassAnalysis_(passData);

      // Show pass analysis section
      const passEl = getEl('link-pass-analysis');

      if (passEl) {
        passEl.style.display = 'block';
      }
    });
  }

  /**
   * Find next satellite pass over sensor
   */
  private findNextPass_(sat: Satellite, sensor: DetailedSensor, startTime: EpochUTC): PassAnalysis | null {
    const dt = 10; // Sample every 10 seconds
    const maxLookAhead = 24 * 3600; // Look ahead 24 hours
    const minElevation = sensor.minEl || 10 as Degrees;

    const samples: PassSample[] = [];
    let passStartTime: Date | null = null;
    let passEndTime: Date | null = null;
    let inPass = false;
    let maxElevation = 0;

    // Scan forward in time
    for (let t = 0; t < maxLookAhead; t += dt) {
      const time = startTime.roll(t as Seconds);
      const eci = sat.eci(time.toDateTime());

      if (!eci) {
        continue;
      }
      const rae = eci2rae(time.toDateTime(), eci.position, sensor);

      const isVisible = (rae.el as number) >= (minElevation as number);

      if (isVisible && !inPass) {
        // Pass start
        passStartTime = time.toDateTime();
        inPass = true;
      }

      if (inPass) {
        // Calculate link budget for this sample
        const result = calculateLinkBudget(rae.rng, rae.el, rae.az, this.params_);

        samples.push({
          time: time.toDateTime(),
          elevation: rae.el as number,
          range: rae.rng as number,
          dataRate: result.downlink.dataRate,
          linkMargin: result.downlink.linkMargin,
          isViable: result.isViable,
        });

        maxElevation = Math.max(maxElevation, rae.el as number);
      }

      if (!isVisible && inPass) {
        // Pass end
        passEndTime = time.toDateTime();

        break;
      }
    }

    if (!passStartTime || !passEndTime || samples.length === 0) {
      return null;
    }

    // Calculate statistics
    const duration = (passEndTime.getTime() - passStartTime.getTime()) / 1000;
    const viableSamples = samples.filter((s) => s.isViable);

    const avgDataRate = viableSamples.length > 0
      ? viableSamples.reduce((sum, s) => sum + s.dataRate, 0) / viableSamples.length
      : 0;

    const maxDataRate = viableSamples.length > 0
      ? Math.max(...viableSamples.map((s) => s.dataRate))
      : 0;

    // Calculate total data volume (integrate data rate over time)
    let totalDataVolume = 0;

    for (let i = 1; i < viableSamples.length; i++) {
      const dt = (viableSamples[i].time.getTime() - viableSamples[i - 1].time.getTime()) / 1000;
      const avgRate = (viableSamples[i].dataRate + viableSamples[i - 1].dataRate) / 2;

      totalDataVolume += avgRate * dt;
    }

    // Convert from Mb to MB
    totalDataVolume /= 8;

    return {
      startTime: passStartTime,
      endTime: passEndTime,
      duration,
      maxElevation,
      avgDataRate,
      maxDataRate,
      totalDataVolume,
      samples,
    };
  }

  /**
   * Display pass analysis results
   */
  private displayPassAnalysis_(pass: PassAnalysis): void {
    // Format start time
    const startTimeStr = `${pass.startTime.toISOString().replace('T', ' ').substring(0, 19)} UTC`;

    // Format duration
    const minutes = Math.floor(pass.duration / 60);
    const seconds = Math.floor(pass.duration % 60);
    const durationStr = `${minutes}m ${seconds}s`;

    this.setElText_('pass-start-time', startTimeStr);
    this.setElText_('pass-duration', durationStr);
    this.setElText_('pass-max-el', `${pass.maxElevation.toFixed(1)}°`);
    this.setElText_('pass-avg-rate', `${pass.avgDataRate.toFixed(3)} Mbps`);
    this.setElText_('pass-max-rate', `${pass.maxDataRate.toFixed(3)} Mbps`);
    this.setElText_('pass-total-data', `${pass.totalDataVolume.toFixed(1)} MB`);
  }

  /**
   * Export pass data to CSV
   */
  private exportPassData_(): void {
    if (!this.passAnalysis_) {
      return;
    }

    const sat = this.selectSatManager_.getSelectedSat();
    const sensor = ServiceLocator.getSensorManager().getSensor();

    // Build CSV data as array of records expected by saveCsv
    const items: Array<Record<string, unknown>> = this.passAnalysis_.samples.map((sample) => ({
      Time_UTC: sample.time.toISOString(),
      Elevation_deg: Number(sample.elevation.toFixed(2)),
      Range_km: Number(sample.range.toFixed(1)),
      Data_Rate_Mbps: Number(sample.dataRate.toFixed(3)),
      Link_Margin_dB: Number(sample.linkMargin.toFixed(1)),
      Link_Viable: sample.isViable ? 'Yes' : 'No',
    }));

    // Filename (saveCsv will append .csv if needed)
    const filename = `link-budget-${sat?.name || 'sat'}-${sensor?.objName || 'sensor'}-${this.passAnalysis_.startTime.toISOString().substring(0, 10)}`;

    saveCsv(items, filename);
  }

  /**
   * Apply frequency preset
   */
  private applyPreset_(band: string): void {
    let freqDown = 0;
    let freqUp = 0;

    switch (band) {
      case 'UHF':
        freqDown = 401;
        freqUp = 435;
        break;
      case 'S':
        freqDown = 2200;
        freqUp = 2025;
        break;
      case 'X':
        freqDown = 8400;
        freqUp = 7900;
        break;
      default:
        return;
    }

    (getEl('link-freq-down') as HTMLInputElement).value = freqDown.toString();
    (getEl('link-freq-up') as HTMLInputElement).value = freqUp.toString();
  }

  /**
   * Helper to set element text content
   */
  private setElText_(id: string, text: string): void {
    const el = getEl(id);

    if (el) {
      el.textContent = text;
    }
  }
}
