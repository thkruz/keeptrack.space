import { GetSatType, MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IDragOptions,
  IHelpConfig,
  ISecondaryMenuConfig,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import {
  CatalogObject,
  CatalogScreener,
  CovarianceFrame,
  createSampleCovarianceFromTle,
  EpochUTC,
  Hours,
  Kilometers,
  Matrix,
  Satellite,
  ScreeningResult,
  Seconds,
  StateCovariance,
} from '@ootk/src/main';
import frameInspectPng from '@public/img/icons/frame-inspect.png';
import { vec3 } from 'gl-matrix';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './debris-screening.css';

interface RiskLevel {
  label: string;
  className: string;
}

export class DebrisScreening extends KeepTrackPlugin {
  readonly id = 'DebrisScreening';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;
  private readonly formPrefix_ = 'ds';
  private readonly sideMenuName_ = 'debris-screening-menu';
  private readonly secondaryMenuName_ = 'debris-screening-results';

  // Screening results storage
  private screeningResults_: ScreeningResult[] = [];

  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager;
  }

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'debris-screening-bottom-icon',
      label: 'Debris Screening',
      image: frameInspectPng,
      menuMode: [MenuMode.ANALYSIS, MenuMode.ALL],
      isDisabledOnLoad: true,
    };
  }

  /**
   * Called when the bottom icon is clicked.
   */
  onBottomIconClick(): void {
    if (!this.verifySatelliteSelected()) {
      return;
    }

    if (this.isMenuButtonActive) {
      this.updateSccNumInMenu_();
    }
  }

  // Bridge for legacy event system (per CLAUDE.md)
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: this.sideMenuName_,
      title: 'Debris Screening',
      html: this.buildSideMenuHtml_(),
      dragOptions: {
        isDraggable: true,
        minWidth: 200,
        maxWidth: 600,
      },
    };
  }

  private buildSideMenuHtml_(): string {
    // Note: When using secondary menu, generateSideMenuHtml_() wraps this content
    // So we only provide the form content, not the wrapper divs
    return html`
      <form id="${this.sideMenuName_}-form">
        <div class="input-field col s12">
          <input disabled value="00005" id="${this.formPrefix_}-scc" type="text" />
          <label for="disabled" class="active">Satellite SCC#</label>
        </div>
        <div class="input-field col s12">
          <select id="${this.formPrefix_}-time">
            <option value="1" selected>1 Hour</option>
            <option value="4">4 Hours</option>
            <option value="8">8 Hours</option>
            <option value="24">24 Hours</option>
            <option value="48">48 Hours</option>
            <option value="72">72 Hours</option>
          </select>
          <label>Time Window</label>
        </div>
        <div class="input-field col s12">
          <select id="${this.formPrefix_}-u">
            <option value="0.5">0.5 km</option>
            <option value="1" selected>1 km</option>
            <option value="2">2 km</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
          </select>
          <label>U (Radial)</label>
        </div>
        <div class="input-field col s12">
          <select id="${this.formPrefix_}-v">
            <option value="10">10 km</option>
            <option value="25" selected>25 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
          </select>
          <label>V (In-track)</label>
        </div>
        <div class="input-field col s12">
          <select id="${this.formPrefix_}-w">
            <option value="10">10 km</option>
            <option value="25" selected>25 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
          </select>
          <label>W (Cross-track)</label>
        </div>
        <div id="${this.formPrefix_}-buttons" class="row center-align">
          <button class="btn btn-ui waves-effect waves-light" type="submit" name="action">Screen for Debris &#9658;</button>
          <button id="${this.formPrefix_}-draw-box" class="btn btn-ui waves-effect waves-light" type="button">
            Draw Box
          </button>
          <button id="${this.formPrefix_}-clear-box" class="btn btn-ui waves-effect waves-light" type="button">
            Clear Box
          </button>
        </div>
      </form>
    `;
  }

  getSecondaryMenuConfig(): ISecondaryMenuConfig {
    return {
      html: this.buildSecondaryMenuHtml_(),
      zIndex: 3,
      icon: 'table_chart',
      dragOptions: this.getSecondaryDragOptions_(),
    };
  }

  private getSecondaryDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 650,
      maxWidth: 1000,
    };
  }

  private buildSecondaryMenuHtml_(): string {
    return html`
      <div class="debris-screening-results">
        <div class="row ds-header-row">
          <div class="col s6">
            <span id="${this.formPrefix_}-results-count" class="ds-results-count">0 conjunctions found</span>
          </div>
          <div class="col s6 right-align">
            <button id="${this.secondaryMenuName_}-export" class="btn btn-ui waves-effect waves-light btn-small">
              <i class="material-icons left">file_download</i>Export CSV
            </button>
          </div>
        </div>
        <div class="row ds-table-container">
          <table id="${this.formPrefix_}-results-table" class="striped highlight">
            <thead>
              <tr>
                <th>Secondary</th>
                <th>TCA</th>
                <th>Miss (km)</th>
                <th>R (km)</th>
                <th>I (km)</th>
                <th>C (km)</th>
                <th>Pc</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody id="${this.formPrefix_}-results-body">
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: 'Debris Screening',
      body: html`
        The Debris Screening tool screens a selected satellite against the catalog to identify potential conjunctions.
        <br /><br />
        Configure the assessment time window and click 'Screen for Debris' to run the analysis. Results will be displayed in a table showing:
        <ul style="margin-left: 40px;">
          <li><b>TCA</b> - Time of Closest Approach</li>
          <li><b>Miss Distance</b> - Total and RIC components (Radial, In-track, Cross-track)</li>
          <li><b>Pc</b> - Probability of Collision</li>
          <li><b>Risk Level</b> - Critical/High/Medium/Low based on Pc</li>
        </ul>
        Click on any row to select the secondary satellite and jump to the TCA time. Export results to CSV using the download button.
      `,
    };
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      // Export button handler
      getEl(`${this.secondaryMenuName_}-export`)?.addEventListener('click', () => {
        this.onDownload();
      });

      // Draw search box button
      getEl(`${this.formPrefix_}-draw-box`)?.addEventListener('click', () => {
        this.drawSearchBox_();
      });

      // Clear search box button
      getEl(`${this.formPrefix_}-clear-box`)?.addEventListener('click', () => {
        this.clearSearchBox_();
      });

      // Results table row click handler - select satellite and jump to TCA
      getEl(`${this.formPrefix_}-results-body`)?.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const row = target.closest('tr');

        if (row) {
          const secondaryScc = row.dataset.secondaryScc;
          const tcaMs = row.dataset.tcaMs;

          if (secondaryScc) {
            this.selectSecondarySatelliteByScc_(secondaryScc);
          }

          if (tcaMs) {
            const timeManager = ServiceLocator.getTimeManager();
            const tcaTime = parseInt(tcaMs);

            timeManager.changeStaticOffset(tcaTime - Date.now());
          }
        }
      });
    });
  }

  // =========================================================================
  // Public methods
  // =========================================================================

  onFormSubmit(): void {
    showLoading(() => {
      console.log('Debris Screening: Form submitted');
      const catalogManager = ServiceLocator.getCatalogManager();
      const timeManager = ServiceLocator.getTimeManager();

      const satId = catalogManager.sccNum2Id(parseInt((<HTMLInputElement>getEl(`${this.formPrefix_}-scc`)).value));
      const timeVal = <Hours>parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-time`)).value);
      const uVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-u`)).value) as Kilometers;
      const vVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-v`)).value) as Kilometers;
      const wVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-w`)).value) as Kilometers;
      const sat = catalogManager.getObject(satId, GetSatType.SKIP_POS_VEL) as Satellite;

      if (!sat) {
        errorManagerInstance.warn('Invalid satellite selected');

        return;
      }

      const covariance = this.calculateCovarianceFromSatellite(sat);

      // Build primary CatalogObject
      const primary: CatalogObject = {
        tle: sat.toTle(),
        name: sat.sccNum,
        radius: 0.01 as Kilometers, // 10m default hard body radius
        covariance,
      };

      // Build secondaries array with orbital shell pre-filtering
      const secondaries: CatalogObject[] = [];

      catalogManager.objectCache.forEach((obj) => {
        if (!obj.isSatellite() || obj.id === satId) {
          return;
        }
        const sat2 = obj as Satellite;

        // Basic orbital shell filtering
        if (sat2.perigee > sat.apogee || sat.perigee > sat2.apogee) {
          return;
        }

        try {
          const secondarySatelliteTle = sat2.toTle();
          const covariance = this.calculateCovarianceFromSatellite(sat);

          secondaries.push({
            tle: secondarySatelliteTle,
            name: sat2.sccNum,
            radius: 0.005 as Kilometers, // 5m default
            covariance,
          });
        } catch {
          // Skip objects that cannot generate TLEs
        }
      });

      // Build screening options
      const startTime = EpochUTC.fromDateTime(timeManager.simulationTimeObj);
      const endTime = EpochUTC.fromDateTime(
        new Date(timeManager.simulationTimeObj.getTime() + timeVal * 3600 * 1000),
      );

      try {
        const allResults = CatalogScreener.screenOneToMany(primary, secondaries, {
          startTime,
          endTime,
          searchStepSize: 240 as Seconds,
        });

        // Filter by individual RIC components (box filter, not spherical)
        this.screeningResults_ = allResults
          .filter((result) =>
            Math.abs(result.event.radialDistance) <= uVal &&
            Math.abs(result.event.intrackDistance) <= vVal &&
            Math.abs(result.event.crosstrackDistance) <= wVal,
          )
          .sort((a, b) => b.event.probabilityOfCollision! - a.event.probabilityOfCollision!)
          .slice(0, 100);

        this.displayResults_();
        this.openSecondaryMenu();
      } catch (error) {
        errorManagerInstance.warn(`Screening failed: ${error}`);
      }
    }, 500);
  }

  private calculateCovarianceFromSatellite(sat: Satellite) {
    let covMatrix = createSampleCovarianceFromTle(sat.tle1, sat.tle2).matrix.elements;

    // Cap radii at 1200 km (radial), 1000 km (cross-track), and 5000 km (in-track) to avoid huge bubbles
    covMatrix[0][0] = Math.min(Math.sqrt(covMatrix[0][0]) * settingsManager.covarianceConfidenceLevel, 1200); // Radial
    covMatrix[1][1] = Math.min(Math.sqrt(covMatrix[2][2]) * settingsManager.covarianceConfidenceLevel, 1000); // Cross-track
    covMatrix[2][2] = Math.min(Math.sqrt(covMatrix[1][1]) * settingsManager.covarianceConfidenceLevel, 5000); // In-track

    if (!covMatrix[0][0] || !covMatrix[1][1] || !covMatrix[2][2]) {
      errorManagerInstance.log('SelectSatManager.selectSatObject_: Invalid covariance matrix');
      covMatrix = vec3.fromValues(1200, 1000, 5000) as unknown as number[][];
    }

    const covariance = new StateCovariance(new Matrix(covMatrix), CovarianceFrame.ECI);


    return covariance;
  }

  onDownload(): void {
    if (this.screeningResults_.length === 0) {
      errorManagerInstance.info('No results to export');

      return;
    }

    const headers = ['Secondary', 'TCA (UTC)', 'Miss Distance (km)', 'Radial (km)', 'Intrack (km)', 'Crosstrack (km)', 'Rel Velocity (km/s)', 'Pc', 'Risk Level'];
    const rows = this.screeningResults_.map((result) => {
      const event = result.event;
      const risk = this.getRiskLevel_(event.probabilityOfCollision);

      return [
        result.secondaryId,
        this.formatTca_(event.tca),
        event.missDistance.toFixed(6),
        event.radialDistance.toFixed(6),
        event.intrackDistance.toFixed(6),
        event.crosstrackDistance.toFixed(6),
        event.relativeVelocity.toFixed(6),
        this.formatPc_(event.probabilityOfCollision),
        risk.label,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    const primaryScc = (<HTMLInputElement>getEl(`${this.formPrefix_}-scc`)).value;

    link.download = `debris-screening-${primaryScc}-${new Date().toISOString().slice(0, 19)}.csv`;
    link.click();
  }

  // =========================================================================
  // Private methods
  // =========================================================================

  private updateSccNumInMenu_(): void {
    const catalogManager = ServiceLocator.getCatalogManager();
    const sat = catalogManager.getObject(this.selectSatManager_.selectedSat, GetSatType.EXTRA_ONLY) as Satellite;

    if (sat) {
      (<HTMLInputElement>getEl(`${this.formPrefix_}-scc`)).value = sat.sccNum;
    }
  }

  private displayResults_(): void {
    const tbody = getEl(`${this.formPrefix_}-results-body`);
    const countEl = getEl(`${this.formPrefix_}-results-count`);

    if (!tbody || !countEl) {
      return;
    }

    tbody.innerHTML = '';
    countEl.textContent = `${this.screeningResults_.length} conjunctions found`;

    this.screeningResults_.forEach((result) => {
      const event = result.event;
      const risk = this.getRiskLevel_(event.probabilityOfCollision);
      const tcaMs = event.tca.toDateTime().getTime();

      const tr = document.createElement('tr');

      tr.dataset.secondaryScc = result.secondaryId;
      tr.dataset.tcaMs = tcaMs.toString();
      tr.innerHTML = `
        <td class="ds-secondary-link">${result.secondaryId}</td>
        <td>${this.formatTca_(event.tca)}</td>
        <td>${event.missDistance.toFixed(3)}</td>
        <td>${event.radialDistance.toFixed(3)}</td>
        <td>${event.intrackDistance.toFixed(3)}</td>
        <td>${event.crosstrackDistance.toFixed(3)}</td>
        <td>${this.formatPc_(event.probabilityOfCollision)}</td>
        <td><span class="ds-risk-badge ${risk.className}">${risk.label}</span></td>
      `;

      tbody.appendChild(tr);
    });
  }

  private getRiskLevel_(pc?: number): RiskLevel {
    if (typeof pc !== 'number') {
      return { label: 'N/A', className: 'risk-unknown' };
    }

    if (pc > 1e-4) {
      return { label: 'Critical', className: 'risk-critical' };
    }
    if (pc > 1e-6) {
      return { label: 'High', className: 'risk-high' };
    }
    if (pc > 1e-8) {
      return { label: 'Medium', className: 'risk-medium' };
    }

    return { label: 'Low', className: 'risk-low' };
  }

  private formatTca_(tca: EpochUTC): string {
    return tca.toDateTime().toISOString().slice(0, 19).replace('T', ' ');
  }

  private formatPc_(pc?: number): string {
    if (typeof pc !== 'number') {
      return 'N/A';
    }
    if (pc < 1e-12) {
      return '<1e-12';
    }

    return pc.toExponential(2);
  }

  private selectSecondarySatelliteByScc_(sccNum: string): void {
    const catalogManager = ServiceLocator.getCatalogManager();
    const id = catalogManager.sccNum2Id(parseInt(sccNum));

    if (id !== null && id !== -1) {
      PluginRegistry.getPlugin(SelectSatManager)?.setSecondarySat(id);
    }
  }

  private drawSearchBox_(): void {
    const scene = ServiceLocator.getScene();

    const uVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-u`)).value) as Kilometers;
    const vVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-v`)).value) as Kilometers;
    const wVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-w`)).value) as Kilometers;

    scene.searchBox.setCubeSize(uVal, vVal, wVal);
  }

  private clearSearchBox_(): void {
    const scene = ServiceLocator.getScene();

    scene.searchBox.setCubeSize(0 as Kilometers, 0 as Kilometers, 0 as Kilometers);
  }
}
