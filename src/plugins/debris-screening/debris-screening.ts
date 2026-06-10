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
import { t7e } from '@app/locales/keys';
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
import tableChartPng from '@public/img/icons/table-chart.png';
import { vec3 } from 'gl-matrix';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './debris-screening.css';

interface RiskLevel {
  label: string;
  className: string;
}

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.DebrisScreening.${key}` as Parameters<typeof t7e>[0]);

export class DebrisScreening extends KeepTrackPlugin {
  readonly id = 'DebrisScreening';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;
  protected readonly formPrefix_ = 'ds';
  protected readonly sideMenuName_ = 'debris-screening-menu';
  protected readonly secondaryMenuName_ = 'debris-screening-results';

  // Screening results storage
  protected screeningResults_: ScreeningResult[] = [];

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
      label: l('bottomIconLabel'),
      image: frameInspectPng,
      menuMode: [MenuMode.EVENTS, MenuMode.ALL],
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
      title: l('title'),
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
          <label for="disabled" class="active">${l('sccLabel')}</label>
        </div>
        <div class="input-field col s12">
          <select id="${this.formPrefix_}-time">
            <option value="1" selected>${l('timeOptions.h1')}</option>
            <option value="4">${l('timeOptions.h4')}</option>
            <option value="8">${l('timeOptions.h8')}</option>
            <option value="24">${l('timeOptions.h24')}</option>
            <option value="48">${l('timeOptions.h48')}</option>
            <option value="72">${l('timeOptions.h72')}</option>
          </select>
          <label>${l('timeWindowLabel')}</label>
        </div>
        <div class="input-field col s12">
          <select id="${this.formPrefix_}-u">
            <option value="0.5">0.5 km</option>
            <option value="1" selected>1 km</option>
            <option value="2">2 km</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
          </select>
          <label>${l('uLabel')}</label>
        </div>
        <div class="input-field col s12">
          <select id="${this.formPrefix_}-v">
            <option value="10">10 km</option>
            <option value="25" selected>25 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
          </select>
          <label>${l('vLabel')}</label>
        </div>
        <div class="input-field col s12">
          <select id="${this.formPrefix_}-w">
            <option value="10">10 km</option>
            <option value="25" selected>25 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
          </select>
          <label>${l('wLabel')}</label>
        </div>
        <div id="${this.formPrefix_}-buttons" class="row center-align">
          <button class="btn btn-ui waves-effect waves-light" type="submit" name="action">${l('screenForDebris')} &#9658;</button>
          <button id="${this.formPrefix_}-draw-box" class="btn btn-ui waves-effect waves-light" type="button">
            ${l('drawBox')}
          </button>
          <button id="${this.formPrefix_}-clear-box" class="btn btn-ui waves-effect waves-light" type="button">
            ${l('clearBox')}
          </button>
        </div>
      </form>
    `;
  }

  getSecondaryMenuConfig(): ISecondaryMenuConfig {
    return {
      html: this.buildSecondaryMenuHtml_(),
      zIndex: 3,
      icon: tableChartPng,
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
            <span id="${this.formPrefix_}-results-count" class="ds-results-count">${l('resultsCount').replace('{count}', '0')}</span>
          </div>
          <div class="col s6 right-align">
            <button id="${this.secondaryMenuName_}-export" class="btn btn-ui waves-effect waves-light btn-small">
              <i class="material-icons left">file_download</i>${l('exportCsv')}
            </button>
          </div>
        </div>
        <div class="row ds-table-container">
          <table id="${this.formPrefix_}-results-table" class="striped highlight">
            <thead>
              <tr>
                <th>${l('table.secondary')}</th>
                <th>${l('table.tca')}</th>
                <th>${l('table.missKm')}</th>
                <th>${l('table.rKm')}</th>
                <th>${l('table.iKm')}</th>
                <th>${l('table.cKm')}</th>
                <th>${l('table.pc')}</th>
                <th>${l('table.risk')}</th>
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
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/debris-screening/debris-screening-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: l('help.boxHeading'),
          content: l('help.box'),
        },
        {
          heading: l('help.resultsHeading'),
          content: l('help.results'),
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2'), l('help.tip3')],
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
      const catalogManager = ServiceLocator.getCatalogManager();
      const timeManager = ServiceLocator.getTimeManager();

      const satId = catalogManager.sccNum2Id((<HTMLInputElement>getEl(`${this.formPrefix_}-scc`)).value.trim());
      const timeVal = <Hours>parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-time`)).value);
      const uVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-u`)).value) as Kilometers;
      const vVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-v`)).value) as Kilometers;
      const wVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-w`)).value) as Kilometers;
      const sat = catalogManager.getObject(satId, GetSatType.SKIP_POS_VEL);

      // OemSatellite passes isSatellite() but has no tle1/tle2/apogee/perigee
      // - toTle() and the orbital-shell filter below would both throw.
      if (!(sat instanceof Satellite)) {
        errorManagerInstance.warn(l('errorMsgs.InvalidSatellite'));

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
        // instanceof excludes OemSatellite, which lacks tle1/tle2/apogee/perigee
        // and would throw inside toTle() / the shell-filter math below.
        if (!(obj instanceof Satellite) || obj.id === satId) {
          return;
        }
        const sat2 = obj;

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
        errorManagerInstance.warn(`${l('errorMsgs.ScreeningFailed')}: ${error}`);
      }
    }, 500);
  }

  protected calculateCovarianceFromSatellite(sat: Satellite) {
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
      errorManagerInstance.info(l('errorMsgs.NoResultsToExport'));

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

  protected displayResults_(): void {
    const tbody = getEl(`${this.formPrefix_}-results-body`);
    const countEl = getEl(`${this.formPrefix_}-results-count`);

    if (!tbody || !countEl) {
      return;
    }

    tbody.innerHTML = '';
    countEl.textContent = l('resultsCount').replace('{count}', this.screeningResults_.length.toString());

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

  protected getRiskLevel_(pc?: number): RiskLevel {
    if (typeof pc !== 'number') {
      return { label: l('riskLevels.unknown'), className: 'risk-unknown' };
    }

    if (pc > 1e-4) {
      return { label: l('riskLevels.critical'), className: 'risk-critical' };
    }
    if (pc > 1e-6) {
      return { label: l('riskLevels.high'), className: 'risk-high' };
    }
    if (pc > 1e-8) {
      return { label: l('riskLevels.medium'), className: 'risk-medium' };
    }

    return { label: l('riskLevels.low'), className: 'risk-low' };
  }

  protected formatTca_(tca: EpochUTC): string {
    return tca.toDateTime().toISOString().slice(0, 19).replace('T', ' ');
  }

  protected formatPc_(pc?: number): string {
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
    // Pass the string straight through - sccNum2Id handles numeric/alpha-5/extended.
    const id = catalogManager.sccNum2Id(sccNum);

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
