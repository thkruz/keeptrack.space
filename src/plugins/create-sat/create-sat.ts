import { SatMath } from '@app/app/analysis/sat-math';
import { countryCodeList, countryNameList, getCountryDisplayName } from '@app/app/data/catalogs/countries';
import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { IBottomIconConfig, IHelpConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { ModalConfirm } from '@app/engine/ui/modal-confirm';
import { buildSideMenuTabsHtml, initSideMenuTabs, SideMenuTabDef, selectSideMenuTab, updateSideMenuTabIndicator } from '@app/engine/ui/side-menu-tabs';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { escapeHtml } from '@app/engine/utils/escape-html';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { FormatTle, KilometersPerSecond, newtonM, Satellite, SatelliteParams, SatelliteRecord, Sgp4, TemeVec3, Tle } from '@ootk/src/main';
import addSatellitePnng from '@public/img/icons/add-satellite.png';
import { saveAs } from 'file-saver';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { OrbitPreview } from '../shared/orbit-preview';
import { applyOrbitPreset, applySunSyncInclination, buildPreviewTleFromForm, cloneSelectedSatellite, getFreeAnalystScc } from './create-sat-actions';
import { warnOnTleChecksumMismatch } from './create-sat-checksum';
import { buildCreateSatHelp } from './create-sat-help';
import { buildAdvancedTabHtml, buildBasicTabHtml, createSatActionButton } from './create-sat-menu-html';
import { dateToEpochFields, OrbitPresetId } from './create-sat-orbits';
import {
  FormErrorReporter,
  FormFieldError,
  fieldErrorFromException,
  TleInputParams,
  validateAdvancedFields,
  validateBasicFields,
  wireInlineValidation,
} from './create-sat-validation';
import './create-sat.css';

type T7eKey = Parameters<typeof t7e>[0];

/** Basic-tab field suffixes (after the element prefix). */
const BASIC_FIELDS = ['basic-scc', 'basic-name', 'basic-inc', 'basic-apogee', 'basic-perigee'] as const;

/** Advanced-tab field suffixes that submit-time errors can mark. */
const ADVANCED_FIELDS = ['scc', 'type', 'country', 'name', 'src', 'year', 'day', 'inc', 'rasc', 'ecen', 'argPe', 'meana', 'meanmo', 'per'] as const;

/** Everything the shared create path needs from either form. */
interface CreateRequest {
  params: TleInputParams;
  /** Raw TLE international designator (cols 10-17). */
  intl: string;
  /** Serializes the form so a replacement confirmation can detect edits made while it was open. */
  snapshot: () => string;
  /** Runs the same form's submit again once the user confirms a replacement. */
  resubmit: (confirmed: Satellite) => void;
  /** Shows a field error the composer or parser found after validation passed. */
  onFieldError: (error: FormFieldError) => void;
}

/**
 * CreateSat plugin for creating and editing satellites
 */
export class CreateSat extends KeepTrackPlugin {
  readonly id = 'CreateSat';
  dependencies_ = [SelectSatManager.name];

  isRequireSatelliteSelected = false;

  static readonly elementPrefix = 'createSat';

  /** Live "ghost orbit" preview drawn while the user edits the element set. */
  protected readonly orbitPreview_ = new OrbitPreview();

  // Orbital mechanics constants
  private static readonly EARTH_RADIUS_KM_ = 6378.137;
  private static readonly EARTH_MU_ = 398600.4418; // km³/s²

  constructor() {
    super();
  }

  dragOptions: ClickDragOptions = {
    isDraggable: true,
    maxWidth: 700,
    minWidth: 500,
  };

  // =========================================================================
  // Orbital calculation methods
  // =========================================================================

  /**
   * Calculate orbital elements from apogee/perigee altitudes
   */
  static calculateFromAltitudes(
    apogeeAlt: number,
    perigeeAlt: number
  ): {
    eccentricity: number;
    semimajorAxis: number;
    meanMotion: number;
  } {
    const Ra = apogeeAlt + CreateSat.EARTH_RADIUS_KM_; // Apogee radius
    const Rp = perigeeAlt + CreateSat.EARTH_RADIUS_KM_; // Perigee radius
    const a = (Ra + Rp) / 2; // Semi-major axis
    const e = (Ra - Rp) / (Ra + Rp); // Eccentricity

    // Mean motion in rev/day
    const n = (Math.sqrt(CreateSat.EARTH_MU_ / (a * a * a)) * 86400) / (2 * Math.PI);

    return { eccentricity: e, semimajorAxis: a, meanMotion: n };
  }

  /**
   * Calculate derived parameters from mean motion and eccentricity. The
   * velocity is the two-body speed at epoch: the mean anomaly gives the
   * eccentric anomaly (Kepler's equation), that gives the radius, and vis-viva
   * gives the speed there (perigee speed when the mean anomaly is 0).
   */
  static calculateDerivedParams(
    meanMotion: number,
    eccentricity: number,
    meanAnomalyDeg = 0
  ): {
    apogee: number;
    perigee: number;
    semimajorAxis: number;
    velocity: number;
  } {
    // Mean motion (rev/day) to semi-major axis
    const n = (meanMotion * 2 * Math.PI) / 86400; // rad/s
    const a = (CreateSat.EARTH_MU_ / (n * n)) ** (1 / 3); // km

    const apogee = a * (1 + eccentricity) - CreateSat.EARTH_RADIUS_KM_;
    const perigee = a * (1 - eccentricity) - CreateSat.EARTH_RADIUS_KM_;
    const eccentricAnomaly = newtonM(eccentricity, (meanAnomalyDeg * Math.PI) / 180).e0;
    const radius = a * (1 - eccentricity * Math.cos(eccentricAnomaly));
    const velocity = Math.sqrt(CreateSat.EARTH_MU_ * (2 / radius - 1 / a)); // vis-viva

    return { apogee, perigee, semimajorAxis: a, velocity };
  }

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'create-satellite-bottom-icon',
      label: t7e('plugins.CreateSat.bottomIconLabel'),
      image: addSatellitePnng,
      menuMode: [MenuMode.CREATE, MenuMode.ALL],
      isDisabledOnLoad: false,
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'createSat-menu',
      title: t7e('plugins.CreateSat.title'),
      html: this.buildSideMenuHtml_(),
      width: 600,
    };
  }

  getHelpConfig(): IHelpConfig {
    return buildCreateSatHelp();
  }

  /**
   * HTML template for the side menu (v13+ "FAANG card" layout).
   */
  protected buildSideMenuHtml_(): string {
    const tabsHtml = buildSideMenuTabsHtml('createSat-tabs', this.getTabDefs_());

    return html`
    <div id="createSat-menu" class="side-menu-parent start-hidden kt-ui-v13">
      <div id="createSat-content" class="side-menu" style="scrollbar-gutter: stable;">
        ${this.buildSideMenuExtras_()}
        <div class="row">
          ${tabsHtml}
        </div>
      </div>
    </div>
  `;
  }

  /**
   * Tab definitions for the side menu. Pro overrides this to append the TLE
   * Import tab, rather than string-rewriting the rendered base HTML.
   */
  protected getTabDefs_(): SideMenuTabDef[] {
    return [
      { id: 'createSat-basic-tab', label: t7e('plugins.CreateSat.tabs.basic' as T7eKey), content: this.buildBasicTabHtml_() },
      { id: 'createSat-advanced-tab', label: t7e('plugins.CreateSat.tabs.advanced' as T7eKey), content: this.buildAdvancedTabHtml_() },
    ];
  }

  /**
   * Extra markup injected inside the side-menu container, before the tab row.
   * Empty in OSS; Pro overrides it to add the drag-and-drop file dropzone.
   */
  protected buildSideMenuExtras_(): string {
    return '';
  }

  /**
   * A full-width v13 action row (label left, chevron added via CSS). Kept as a
   * static so the Pro subclass can build matching rows (e.g. the TLE tab).
   */
  protected static actionButton_(id: string, label: string, opts: { submit?: boolean; disabled?: boolean } = {}): string {
    return createSatActionButton(id, label, opts);
  }

  /** Basic tab: build an orbit from altitudes + inclination. */
  protected buildBasicTabHtml_(): string {
    return buildBasicTabHtml();
  }

  /** Advanced tab: full TLE element set with a live calculated-params readout. */
  protected buildAdvancedTabHtml_(): string {
    return buildAdvancedTabHtml();
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  // Bridge for onBottomIconClick to connect to legacy event system
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  /**
   * Called when the bottom icon is clicked and the side menu becomes visible.
   * Updates the Materialize tabs indicator which requires the element to be visible.
   */
  onBottomIconClick(): void {
    updateSideMenuTabIndicator('createSat-tabs');
    // An untouched Advanced epoch follows the simulation clock, not the menu-build time.
    CreateSat.syncAutoEpoch_();
    // Defer so isMenuButtonActive has settled before drawing the preview orbit.
    setTimeout(() => this.updatePreview_(), 0);
  }

  /**
   * Add HTML and register events
   */
  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
    // Drop the preview orbit whenever the side menu closes.
    EventBus.getInstance().on(EventBusEvent.hideSideMenus, () => this.orbitPreview_.clear());
  }

  /**
   * Initialize all event listeners for the UI
   */
  protected uiManagerFinal_(): void {
    initSideMenuTabs('createSat-tabs');

    // Period and mean motion converter
    this.setupPeriodMeanMotionConverters_();

    // Setup derived parameter updates for Advanced tab
    this.setupDerivedParamsUpdates_();

    // Submit and save buttons for Advanced tab (wrapped so the click event is not taken as a confirmed object)
    getEl('createSat-submit')!.addEventListener('click', () => CreateSat.createSatSubmit_());
    getEl('createSat-save')!.addEventListener('click', CreateSat.exportTLE_);

    // Submit button for Basic tab
    getEl('createSat-basic-submit')!.addEventListener('click', () => this.createSatBasicSubmit_());

    // Values stay the catalog codes; only the option text follows the UI language.
    countryNameList
      .map((countryName: string) => {
        let countryCode = countryCodeList[countryName];

        if (typeof countryCode === 'string' && countryCode.includes('|')) {
          countryCode = countryCode.split('|')[0];
        }

        return { countryCode, label: getCountryDisplayName(countryName) };
      })
      .sort((a, b) => a.label.localeCompare(b.label))
      .forEach(({ countryCode, label }) => {
        getEl(`${CreateSat.elementPrefix}-country`)!.insertAdjacentHTML('beforeend', `<option value="${countryCode}">${label}</option>`);
      });

    // Presets, clone, sun-sync, live preview, and inline validation
    this.wireAdvancedTools_();

    // Populate default values
    this.populateSideMenu_();
    this.populateBasicTabDefaults_();

    // Submit-time error reporting: all errors at once, each cleared as it is fixed.
    CreateSat.basicErrors_ = new FormErrorReporter(CreateSat.elementPrefix, `${CreateSat.elementPrefix}-basic-error`, BASIC_FIELDS, () =>
      validateBasicFields(CreateSat.readBasicInputs_())
    );
    CreateSat.advancedErrors_ = new FormErrorReporter(CreateSat.elementPrefix, `${CreateSat.elementPrefix}-error`, ADVANCED_FIELDS, () =>
      CreateSat.validateInputs_(CreateSat.getTleInputs_())
    );
    CreateSat.basicErrors_.wire();
    CreateSat.advancedErrors_.wire();

    // Trigger initial derived params calculation
    getEl(`${CreateSat.elementPrefix}-meanmo`)?.dispatchEvent(new Event('input'));
  }

  /**
   * Wire the Advanced-tab power tools: orbit presets, clone-selected, the
   * sun-synchronous inclination helper, the live orbit preview, and per-field
   * inline validation.
   */
  private wireAdvancedTools_(): void {
    const p = CreateSat.elementPrefix;
    const uiManager = ServiceLocator.getUiManager();

    getEl(`${p}-preset`)?.addEventListener('change', (e) => {
      const id = (e.target as HTMLSelectElement).value as OrbitPresetId;

      if (id) {
        applyOrbitPreset(p, id);
        this.updatePreview_();
      }
    });

    getEl(`${p}-clone`)?.addEventListener('click', () => {
      if (cloneSelectedSatellite(p)) {
        updateSideMenuTabIndicator('createSat-tabs');
        this.updatePreview_();
      } else {
        uiManager.toast(t7e('plugins.CreateSat.errorMsgs.noSatSelected' as T7eKey), ToastMsgType.caution, true);
      }
    });

    getEl(`${p}-sso`)?.addEventListener('click', () => {
      if (applySunSyncInclination(p)) {
        this.updatePreview_();
      } else {
        uiManager.toast(t7e('plugins.CreateSat.errorMsgs.invalidMeanMotion' as T7eKey), ToastMsgType.caution, true);
      }
    });

    // Redraw the ghost orbit as the element set changes.
    for (const id of ['inc', 'rasc', 'ecen', 'argPe', 'meana', 'meanmo', 'per', 'year', 'day']) {
      getEl(`${p}-${id}`)?.addEventListener('input', () => this.updatePreview_());
    }

    wireInlineValidation(p);
  }

  /** Redraw (or clear) the live ghost-orbit preview from the current form. */
  protected updatePreview_(): void {
    if (!this.isMenuButtonActive) {
      this.orbitPreview_.clear();

      return;
    }

    const tle = buildPreviewTleFromForm(CreateSat.elementPrefix);

    if (tle) {
      this.orbitPreview_.update(tle.tle1, tle.tle2);
    } else {
      this.orbitPreview_.clear();
    }
  }

  /**
   * Setup event listeners to update derived parameters in real-time
   */
  private setupDerivedParamsUpdates_(): void {
    const updateDerived = (): void => {
      const meanmoEl = getEl(`${CreateSat.elementPrefix}-meanmo`) as HTMLInputElement;
      const ecenEl = getEl(`${CreateSat.elementPrefix}-ecen`) as HTMLInputElement;

      if (!meanmoEl || !ecenEl) {
        return;
      }

      const meanmo = parseFloat(meanmoEl.value);
      const ecen = parseFloat(ecenEl.value) / 1e7;
      const meana = parseFloat((getEl(`${CreateSat.elementPrefix}-meana`, true) as HTMLInputElement | null)?.value ?? '');

      if (isNaN(meanmo) || isNaN(ecen) || meanmo <= 0 || ecen < 0 || ecen >= 1) {
        return;
      }

      const derived = CreateSat.calculateDerivedParams(meanmo, ecen, isNaN(meana) ? 0 : meana);

      const apogeeEl = getEl(`${CreateSat.elementPrefix}-calc-apogee`) as HTMLInputElement;
      const perigeeEl = getEl(`${CreateSat.elementPrefix}-calc-perigee`) as HTMLInputElement;
      const smaEl = getEl(`${CreateSat.elementPrefix}-calc-sma`) as HTMLInputElement;
      const velocityEl = getEl(`${CreateSat.elementPrefix}-calc-velocity`) as HTMLInputElement;

      if (apogeeEl) {
        apogeeEl.value = derived.apogee.toFixed(1);
      }
      if (perigeeEl) {
        perigeeEl.value = derived.perigee.toFixed(1);
      }
      if (smaEl) {
        smaEl.value = derived.semimajorAxis.toFixed(1);
      }
      if (velocityEl) {
        velocityEl.value = derived.velocity.toFixed(3);
      }
    };

    getEl(`${CreateSat.elementPrefix}-meanmo`)?.addEventListener('input', updateDerived);
    getEl(`${CreateSat.elementPrefix}-ecen`)?.addEventListener('input', updateDerived);
    // The epoch velocity depends on where the satellite is on its orbit.
    getEl(`${CreateSat.elementPrefix}-meana`)?.addEventListener('input', updateDerived);

    // Also update on change events for when the period<->meanmo converter runs
    getEl(`${CreateSat.elementPrefix}-meanmo`)?.addEventListener('change', updateDerived);
    getEl(`${CreateSat.elementPrefix}-ecen`)?.addEventListener('change', updateDerived);
  }

  /**
   * Populate Basic tab with default values
   */
  private populateBasicTabDefaults_(): void {
    CreateSat.basicErrors_?.report([]);
    (getEl(`${CreateSat.elementPrefix}-basic-scc`) as HTMLInputElement).value = '90000';
    (getEl(`${CreateSat.elementPrefix}-basic-name`) as HTMLInputElement).value = 'New Satellite';
    (getEl(`${CreateSat.elementPrefix}-basic-inc`) as HTMLInputElement).value = '51.6';
    (getEl(`${CreateSat.elementPrefix}-basic-apogee`) as HTMLInputElement).value = '400';
    (getEl(`${CreateSat.elementPrefix}-basic-perigee`) as HTMLInputElement).value = '400';
  }

  /** Submit-time error reporters for the two forms (set up in uiManagerFinal_). */
  protected static basicErrors_: FormErrorReporter | null = null;
  protected static advancedErrors_: FormErrorReporter | null = null;

  /** Raw Basic-tab values. */
  private static readBasicInputs_(): { scc: string; name: string; inc: string; apogee: string; perigee: string } {
    const v = (suffix: string): string => (getEl(`${CreateSat.elementPrefix}-basic-${suffix}`, true) as HTMLInputElement | null)?.value ?? '';

    return { scc: v('scc'), name: v('name'), inc: v('inc'), apogee: v('apogee'), perigee: v('perigee') };
  }

  /**
   * Build the full element set for a Basic orbit. The Basic tab owns its own
   * state: right ascension, argument of perigee and mean anomaly are 0, the
   * object is a payload with an unknown country, and the epoch is the
   * simulation time at submit. Nothing is read from (or written to) the
   * Advanced tab.
   */
  static buildBasicParams(input: { scc: string; name: string; inc: number; apogee: number; perigee: number }, epoch: Date): TleInputParams {
    const { eccentricity, meanMotion } = CreateSat.calculateFromAltitudes(input.apogee, input.perigee);
    const { year, day } = dateToEpochFields(epoch);

    return {
      scc: input.scc.trim().padStart(5, '0'),
      type: '1',
      country: 'TBD',
      inc: input.inc.toFixed(4).padStart(8, '0'),
      meanmo: meanMotion.toFixed(5).padStart(8, '0'),
      rasc: '000.0000',
      ecen: Math.round(eccentricity * 1e7)
        .toString()
        .padStart(7, '0')
        .slice(0, 7),
      argPe: '000.0000',
      meana: '000.0000',
      epochyr: year,
      epochday: day,
      source: 'User Created',
      name: input.name.trim() || 'New Satellite',
      period: (1440 / meanMotion).toFixed(4).padStart(8, '0'),
    };
  }

  /**
   * Create satellite from Basic tab inputs
   */
  private createSatBasicSubmit_(confirmedObject?: Satellite): void {
    const raw = CreateSat.readBasicInputs_();
    const errors = validateBasicFields(raw);

    CreateSat.basicErrors_?.report(errors);
    if (errors.length > 0) {
      return;
    }

    const params = CreateSat.buildBasicParams(
      { scc: raw.scc, name: raw.name, inc: parseFloat(raw.inc), apogee: parseFloat(raw.apogee), perigee: parseFloat(raw.perigee) },
      new Date(ServiceLocator.getTimeManager().simulationTimeObj)
    );

    CreateSat.submitTle_(
      {
        params,
        intl: `${params.epochyr}69B`,
        // The epoch follows the clock, so it is not part of the identity a confirmation protects.
        snapshot: () => JSON.stringify(CreateSat.readBasicInputs_()),
        resubmit: (sat) => this.createSatBasicSubmit_(sat),
        // Basic validation covers every value it derives, so this is only a backstop.
        onFieldError: (error) => ServiceLocator.getUiManager().toast(error.message, ToastMsgType.error, true),
      },
      confirmedObject
    );
  }

  /**
   * Setup period and mean motion converter event listeners
   */
  private setupPeriodMeanMotionConverters_(): void {
    // Period to Mean Motion conversion
    getEl(`${CreateSat.elementPrefix}-per`)!.addEventListener('change', () => {
      const perInput = getEl(`${CreateSat.elementPrefix}-per`) as HTMLInputElement;
      const per = perInput.value;

      if (per === '') {
        return;
      }

      try {
        const meanmo = 1440 / parseFloat(per);

        (getEl(`${CreateSat.elementPrefix}-meanmo`) as HTMLInputElement).value = meanmo.toFixed(5).padStart(8, '0');
        /*
         * Also reformat the input just in case the user entered a value with
         * more than 5 decimal places
         */
        perInput.value = parseFloat(per).toFixed(4).padStart(8, '0');
        // A programmatic value change fires no event; tell the derived readouts (they listen for input).
        getEl(`${CreateSat.elementPrefix}-meanmo`)?.dispatchEvent(new Event('input'));
      } catch (error) {
        errorManagerInstance.error(error as Error, 'create-sat.ts', t7e('plugins.CreateSat.errorMsgs.periodToMeanMotionFailed' as T7eKey));
      }
    });

    // Mean Motion to Period conversion
    getEl(`${CreateSat.elementPrefix}-meanmo`)!.addEventListener('change', () => {
      const meanmoInput = getEl(`${CreateSat.elementPrefix}-meanmo`) as HTMLInputElement;
      const meanmo = meanmoInput.value;

      if (meanmo === '') {
        return;
      }

      try {
        const per = (1440 / parseFloat(meanmo)).toFixed(4);

        (getEl(`${CreateSat.elementPrefix}-per`) as HTMLInputElement).value = per.padStart(8, '0');

        /*
         * Also reformat the input just in case the user entered a value with
         * more than 4 decimal places
         */
        meanmoInput.value = parseFloat(meanmo).toFixed(5).padStart(8, '0');
      } catch (error) {
        errorManagerInstance.warn(t7e('plugins.CreateSat.errorMsgs.meanMotionToPeriodFailed' as T7eKey).replace('{error}', String(error)));
      }
    });
  }

  /**
   * Find the lowest free analyst slot SCC (90000-99999), or null if all are in
   * use. Delegates to the shared helper; kept as a static so the Pro subclass
   * and tests can reference (and stub) it.
   */
  protected static getFreeAnalystScc_(): string | null {
    return getFreeAnalystScc();
  }

  /**
   * Get all TLE input values from form
   */
  private static getTleInputs_(): TleInputParams {
    return {
      scc: (getEl(`${CreateSat.elementPrefix}-scc`) as HTMLInputElement).value,
      type: (getEl(`${CreateSat.elementPrefix}-type`) as HTMLInputElement).value,
      country: (getEl(`${CreateSat.elementPrefix}-country`) as HTMLInputElement).value,
      inc: (getEl(`${CreateSat.elementPrefix}-inc`) as HTMLInputElement).value,
      meanmo: (getEl(`${CreateSat.elementPrefix}-meanmo`) as HTMLInputElement).value,
      rasc: (getEl(`${CreateSat.elementPrefix}-rasc`) as HTMLInputElement).value,
      ecen: (getEl(`${CreateSat.elementPrefix}-ecen`) as HTMLInputElement).value,
      argPe: (getEl(`${CreateSat.elementPrefix}-argPe`) as HTMLInputElement).value,
      meana: (getEl(`${CreateSat.elementPrefix}-meana`) as HTMLInputElement).value,
      epochyr: (getEl(`${CreateSat.elementPrefix}-year`) as HTMLInputElement).value,
      epochday: (getEl(`${CreateSat.elementPrefix}-day`) as HTMLInputElement).value,
      source: (getEl(`${CreateSat.elementPrefix}-src`) as HTMLInputElement).value,
      name: (getEl(`${CreateSat.elementPrefix}-name`) as HTMLInputElement).value,
      period: (getEl(`${CreateSat.elementPrefix}-per`) as HTMLInputElement).value,
    };
  }

  /**
   * Populate the form with default values
   */
  protected populateSideMenu_(): void {
    // Set default inclination
    const defaultInc = 0;
    const inc = defaultInc.toFixed(4).padStart(8, '0');

    (getEl(`${CreateSat.elementPrefix}-inc`) as HTMLInputElement).value = inc;

    // The default epoch is "automatic": it follows the simulation clock until the user (or an import) sets one.
    getEl(`${CreateSat.elementPrefix}-day`, true)?.removeAttribute(CreateSat.AUTO_EPOCH_ATTR_);
    CreateSat.syncAutoEpoch_();

    // Set orbital parameters with reasonable defaults
    (getEl(`${CreateSat.elementPrefix}-rasc`) as HTMLInputElement).value = '000.0000';
    (getEl(`${CreateSat.elementPrefix}-ecen`) as HTMLInputElement).value = '0000000';
    (getEl(`${CreateSat.elementPrefix}-meana`) as HTMLInputElement).value = '000.0000';
    (getEl(`${CreateSat.elementPrefix}-argPe`) as HTMLInputElement).value = '000.0000';
    (getEl(`${CreateSat.elementPrefix}-meanmo`) as HTMLInputElement).value = '16.00000';
    (getEl(`${CreateSat.elementPrefix}-per`) as HTMLInputElement).value = '90.00000';

    // Set metadata
    (getEl(`${CreateSat.elementPrefix}-src`) as HTMLInputElement).value = 'User Created';
    (getEl(`${CreateSat.elementPrefix}-name`) as HTMLInputElement).value = 'New Satellite';
  }

  /** Attribute on the epoch-day input holding the last automatic "year|day" value. */
  private static readonly AUTO_EPOCH_ATTR_ = 'data-auto-epoch';

  /**
   * Move an automatic Advanced epoch to the current simulation time. The epoch
   * is automatic while the fields still hold the value this method last wrote;
   * once the user types an epoch, or a clone or import writes one, it is left
   * alone.
   */
  protected static syncAutoEpoch_(): void {
    const yearEl = getEl(`${CreateSat.elementPrefix}-year`, true) as HTMLInputElement | null;
    const dayEl = getEl(`${CreateSat.elementPrefix}-day`, true) as HTMLInputElement | null;

    if (!yearEl || !dayEl) {
      return;
    }

    const lastAuto = dayEl.getAttribute(CreateSat.AUTO_EPOCH_ATTR_);

    if (lastAuto !== null && lastAuto !== `${yearEl.value}|${dayEl.value}`) {
      return;
    }

    const { year, day } = dateToEpochFields(new Date(ServiceLocator.getTimeManager().simulationTimeObj));

    yearEl.value = year;
    dayEl.value = day;
    dayEl.setAttribute(CreateSat.AUTO_EPOCH_ATTR_, `${year}|${day}`);
  }

  /** Every invalid Advanced field (empty when the form can be submitted). */
  private static validateInputs_(inputParams: TleInputParams): FormFieldError[] {
    return validateAdvancedFields(inputParams);
  }

  /**
   * Ensure input formatting is correct to pass validation
   */
  private static fixInputFormatting_(): void {
    const sccInput = getEl(`${CreateSat.elementPrefix}-scc`) as HTMLInputElement;
    const scc = sccInput.value.trim().padStart(5, '0');

    sccInput.value = scc;

    const yearInput = getEl(`${CreateSat.elementPrefix}-year`) as HTMLInputElement;
    let year = yearInput.value.trim().replace(/\D/gu, '').slice(-2); // Only digits, last 2

    year = year.padStart(2, '0'); // Must be 2 digits

    yearInput.value = year;

    const dayInput = getEl(`${CreateSat.elementPrefix}-day`) as HTMLInputElement;
    let day = dayInput.value.trim();

    // Ensure day is in the format NNN.NNNNNNNN (e.g., 001.00000000)
    const dayNum = parseFloat(day);

    if (!isNaN(dayNum)) {
      // Always 3 integer digits, 8 decimals
      day = dayNum.toFixed(8).padStart(12, '0');
    } else {
      // fallback: pad left to 12 chars
      day = day.padStart(12, '0');
    }

    dayInput.value = day;

    const incInput = getEl(`${CreateSat.elementPrefix}-inc`) as HTMLInputElement;
    let inc = incInput.value.trim();
    const incNum = parseFloat(inc);

    // Ensure inclination is in the format NNN.NNNN (e.g., 000.0000)
    if (!isNaN(incNum)) {
      inc = incNum.toFixed(4).padStart(8, '0');
    } else {
      inc = inc.padStart(8, '0');
    }

    incInput.value = inc;

    const rascInput = getEl(`${CreateSat.elementPrefix}-rasc`) as HTMLInputElement;
    let rasc = rascInput.value.trim();
    const rascNum = parseFloat(rasc);

    // Ensure right ascension is in the format NNN.NNNN (e.g., 000.0000)
    if (!isNaN(rascNum)) {
      rasc = rascNum.toFixed(4).padStart(8, '0');
    } else {
      rasc = rasc.padStart(8, '0');
    }

    rascInput.value = rasc;

    const ecenInput = getEl(`${CreateSat.elementPrefix}-ecen`) as HTMLInputElement;
    let ecen = ecenInput.value.trim();

    /*
     * Ensure eccentricity is a 7-digit number (e.g., 0000000)
     * Remove any decimal point and pad with zeros
     */
    ecen = ecen.replace('.', '').replace(/\D/gu, '').padStart(7, '0').slice(0, 7);

    ecenInput.value = ecen;

    const argPeInput = getEl(`${CreateSat.elementPrefix}-argPe`) as HTMLInputElement;
    let argPe = argPeInput.value.trim();
    const argPeNum = parseFloat(argPe);

    // Ensure argument of perigee is in the format NNN.NNNN (e.g., 000.0000)
    if (!isNaN(argPeNum)) {
      argPe = argPeNum.toFixed(4).padStart(8, '0');
    } else {
      argPe = argPe.padStart(8, '0');
    }

    argPeInput.value = argPe;

    const meanaInput = getEl(`${CreateSat.elementPrefix}-meana`) as HTMLInputElement;
    let meana = meanaInput.value.trim();
    const meanaNum = parseFloat(meana);

    // Ensure mean anomaly is in the format NNN.NNNN (e.g., 000.0000)
    if (!isNaN(meanaNum)) {
      meana = meanaNum.toFixed(4).padStart(8, '0');
    } else {
      meana = meana.padStart(8, '0');
    }

    meanaInput.value = meana;

    const meanmoInput = getEl(`${CreateSat.elementPrefix}-meanmo`) as HTMLInputElement;
    // Ensure mean motion is in the format NN.NNNNN (e.g., 16.00000)
    let meanmo = meanmoInput.value.trim();
    const meanmoNum = parseFloat(meanmo);

    if (!isNaN(meanmoNum)) {
      meanmo = meanmoNum.toFixed(5).padStart(8, '0');
    } else {
      meanmo = meanmo.padStart(8, '0');
    }
    meanmoInput.value = meanmo;

    const periodInput = getEl(`${CreateSat.elementPrefix}-per`) as HTMLInputElement;
    let period = periodInput.value.trim();

    // Ensure period is a valid number and format as NNNN.NNNN (8 digits total, pad left if needed)
    const periodNum = parseFloat(period);

    if (!isNaN(periodNum)) {
      // Always 4 decimals, pad integer part to at least 2 digits (e.g., 90.0000, 9999.9999)
      period = periodNum.toFixed(4);
      // Pad left so total length is 8 (for 2 int digits) or 9 (for 3+ int digits)
      if (period.length < 8) {
        period = period.padStart(8, '0');
      }
    } else {
      period = period.padStart(8, '0');
    }

    periodInput.value = period;

    const sourceInput = getEl(`${CreateSat.elementPrefix}-src`) as HTMLInputElement;
    const source = sourceInput.value.trim();

    sourceInput.value = source;

    const nameInput = getEl(`${CreateSat.elementPrefix}-name`) as HTMLInputElement;
    const name = nameInput.value.trim();

    nameInput.value = name;

    // Ensure type is a valid number
    const typeInput = getEl(`${CreateSat.elementPrefix}-type`) as HTMLInputElement;
    const type = parseInt(typeInput.value, 10);

    if (isNaN(type) || type < 1 || type > 4) {
      typeInput.value = '1'; // Default to Payload if invalid
    } else {
      typeInput.value = type.toString();
    }
  }

  /**
   * Create a satellite from the Advanced tab (also the target of the Pro
   * TLE/OMM/STK imports, which fill the Advanced fields first).
   */
  protected static createSatSubmit_(confirmedObject?: Satellite): void {
    // An untouched epoch means "now": take the simulation time at submit.
    CreateSat.syncAutoEpoch_();

    // Attempt to fix formatting issues
    CreateSat.fixInputFormatting_();

    // Get all input values
    const inputParams = CreateSat.getTleInputs_();

    // Validate inputs: every invalid field is reported at once, inline.
    const errors = CreateSat.validateInputs_(inputParams);

    if (errors.length > 0) {
      CreateSat.reportAdvancedErrors_(errors);

      return;
    }
    CreateSat.advancedErrors_?.report([]);

    // Preserve the imported international designator (set on the hidden field by
    // the TLE/STK flows); fall back to a synthesized one for manual entry.
    const readIntl = (): string | undefined => (getEl(`${CreateSat.elementPrefix}-intl`, true) as HTMLInputElement | null)?.value;

    CreateSat.submitTle_(
      {
        params: inputParams,
        intl: readIntl()?.trim() || `${inputParams.epochyr}69B`,
        snapshot: () => JSON.stringify([CreateSat.getTleInputs_(), readIntl()]),
        resubmit: (sat) => CreateSat.createSatSubmit_(sat),
        onFieldError: (error) => CreateSat.reportAdvancedErrors_([error]),
      },
      confirmedObject
    );
  }

  /**
   * Show Advanced-form errors inline. Imports submit from other tabs, so bring
   * the Advanced tab forward where the marked fields are. Without the menu UI
   * (no reporter), fall back to a toast.
   */
  private static reportAdvancedErrors_(errors: FormFieldError[]): void {
    if (CreateSat.advancedErrors_) {
      CreateSat.advancedErrors_.report(errors);
      selectSideMenuTab('createSat-tabs', 'createSat-advanced-tab');
    } else {
      ServiceLocator.getUiManager().toast(errors.map((error) => error.message).join(' '), ToastMsgType.error, true);
    }
  }

  /**
   * Shared create path for both forms: compose the TLE, confirm a replacement,
   * and install the satellite in its analyst slot.
   */
  private static submitTle_(request: CreateRequest, confirmedObject?: Satellite): void {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const orbitManagerInstance = ServiceLocator.getOrbitManager();
    const inputParams = request.params;

    try {
      // Convert SCC to internal ID. sccNum2Id accepts the string form directly
      // (numeric / alpha-5 / extended); parseInt would drop alpha-5 IDs.
      const satId = catalogManagerInstance.sccNum2Id(inputParams.scc) ?? -1;
      const obj = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY);

      if (!obj?.isSatellite()) {
        ServiceLocator.getUiManager().toast(t7e('plugins.CreateSat.errorMsgs.invalidSatObject' as T7eKey), ToastMsgType.error, true);

        return;
      }

      const sat = obj as Satellite;

      if ((sat.active || sat.country !== 'ANALSAT') && confirmedObject !== sat) {
        const oldTle1 = sat.tle1;
        const oldTle2 = sat.tle2;
        const oldIdentity = JSON.stringify([sat.name, sat.country, sat.active]);
        const formSnapshot = request.snapshot();
        let used = false;

        ModalConfirm.getInstance().open(
          () => {
            if (used) {
              return;
            }
            used = true;
            const current = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY);
            const unchanged =
              current === sat &&
              sat.tle1 === oldTle1 &&
              sat.tle2 === oldTle2 &&
              JSON.stringify([sat.name, sat.country, sat.active]) === oldIdentity &&
              request.snapshot() === formSnapshot;

            if (!unchanged) {
              ServiceLocator.getUiManager().toast(t7e('plugins.CreateSat.confirm.changed' as T7eKey), ToastMsgType.caution);

              return;
            }
            request.resubmit(sat);
          },
          {
            title: t7e('plugins.CreateSat.confirm.title' as T7eKey),
            message: t7e('plugins.CreateSat.confirm.message' as T7eKey)
              .replace('{name}', escapeHtml(sat.name ?? ''))
              .replace('{scc}', escapeHtml(inputParams.scc)),
            confirmText: t7e('plugins.CreateSat.confirm.replace' as T7eKey),
            cancelText: t7e('plugins.CreateSat.confirm.cancel' as T7eKey),
            isDestructive: true,
          }
        );

        return;
      }

      const country = inputParams.country;
      const type = parseInt(inputParams.type);
      const intl = request.intl;
      const scc = inputParams.scc.replace(/^0+/u, '');
      const convertedScc = Tle.convert6DigitToA5(scc); // Convert SCC to A5 format

      // Create TLE from parameters
      const { tle1, tle2 } = FormatTle.createTle({
        sat,
        inc: inputParams.inc,
        meanmo: inputParams.meanmo,
        rasc: inputParams.rasc,
        argPe: inputParams.argPe,
        meana: inputParams.meana,
        ecen: inputParams.ecen,
        epochyr: inputParams.epochyr,
        epochday: inputParams.epochday,
        intl,
        scc: convertedScc,
      });

      // Check if TLE generation failed
      if (tle1 === 'Error') {
        errorManagerInstance.warn(t7e('plugins.CreateSat.errorMsgs.errorCreatingSat'));

        return;
      }

      /*
       * Caution (non-blocking) if either submitted line's trailing mod-10
       * checksum digit does not match the computed value. FormatTle.createTle
       * stamps fresh checksums today, so this guards the import flows and any
       * future composer change rather than normal manual entry.
       */
      warnOnTleChecksumMismatch(tle1, tle2);

      // Create satellite record from TLE
      let satrec: SatelliteRecord;

      try {
        satrec = Sgp4.createSatrec(tle1, tle2);
      } catch (e) {
        errorManagerInstance.error(e as Error, 'create-sat.ts', t7e('plugins.CreateSat.errorMsgs.satrecFailed' as T7eKey));

        return;
      }

      // Validate altitude is reasonable
      if (SatMath.altitudeCheck(satrec, ServiceLocator.getTimeManager().simulationTimeObj) <= 1) {
        ServiceLocator.getUiManager().toast(t7e('plugins.CreateSat.errorMsgs.propagationFailed' as T7eKey), ToastMsgType.caution, true);

        return;
      }

      // Propagate satellite to get position and velocity
      const spg4vec = Sgp4.propagate(satrec, 0);
      const pos = spg4vec.position as TemeVec3;
      const vel = spg4vec.velocity as TemeVec3<KilometersPerSecond>;

      // Create new satellite object
      const info: SatelliteParams = {
        id: satId,
        type,
        country,
        tle1,
        tle2,
        name: inputParams.name,
      };

      const newSat = new Satellite({
        ...info,
        ...{
          position: pos,
          velocity: vel,
          source: inputParams.source,
        },
      });

      // Add to catalog
      catalogManagerInstance.objectCache[satId] = newSat;

      // Update satellite cruncher
      try {
        catalogManagerInstance.satCruncherThread.sendSatEdit(satId, tle1, tle2, true);
      } catch (e) {
        errorManagerInstance.error(e as Error, 'create-sat.ts', t7e('plugins.CreateSat.errorMsgs.cruncherFailed' as T7eKey));
      }

      // Update orbit buffer
      try {
        orbitManagerInstance.changeOrbitBufferData(satId, tle1, tle2);
      } catch (e) {
        errorManagerInstance.error(e as Error, 'create-sat.ts', t7e('plugins.CreateSat.errorMsgs.orbitBufferFailed' as T7eKey));
      }

      // Seed the render buffers so the immediate search below does not read
      // the placeholder 0,0,0 position as "Decayed"
      catalogManagerInstance.seedDotPosition(satId);

      // Replacing the selected object puts a new instance in the same slot; re-select it so the
      // object panel shows the new satellite instead of the replaced one.
      const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

      if (selectSatManager?.selectedSat === satId) {
        selectSatManager.selectSat(satId);
      }

      // Search for the new satellite
      ServiceLocator.getUiManager().doSearch(inputParams.scc);

      // Show success message
      ServiceLocator.getUiManager().toast(
        t7e('plugins.CreateSat.successMsgs.satCreated' as T7eKey)
          .replace('{name}', inputParams.name)
          .replace('{scc}', inputParams.scc),
        ToastMsgType.normal,
        true
      );
    } catch (error) {
      // ootk rejects an out-of-range element with a ParseError; name the field and its range instead.
      const fieldError = fieldErrorFromException(error);

      if (fieldError) {
        request.onFieldError(fieldError);

        return;
      }
      const reason = error instanceof Error ? error.message : String(error);

      errorManagerInstance.warn(t7e('plugins.CreateSat.errorMsgs.createFailed' as T7eKey).replace('{error}', reason));
    }
  }

  /**
   * Export TLE to a file
   */
  private static exportTLE_(e: Event): void {
    e.preventDefault();

    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    try {
      const scc = (getEl(`${CreateSat.elementPrefix}-scc`) as HTMLInputElement).value;
      // sccNum2Id accepts the string directly; parseInt would drop alpha-5 IDs.
      const satId = catalogManagerInstance.sccNum2Id(scc);
      const sat = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY) as Satellite;

      if (!sat || !sat.tle1 || !sat.tle2) {
        ServiceLocator.getUiManager().toast(t7e('plugins.CreateSat.errorMsgs.noValidTle' as T7eKey), ToastMsgType.error, true);

        return;
      }

      // Format TLE data
      const tleText = `${sat.tle1}\n${sat.tle2}`;
      const blob = new Blob([tleText], {
        type: 'text/plain;charset=utf-8',
      });

      saveAs(blob, `${scc}.tle`);
      ServiceLocator.getUiManager().toast(t7e('plugins.CreateSat.successMsgs.tleExported' as T7eKey), ToastMsgType.normal, true);
    } catch (error) {
      errorManagerInstance.error(error as Error, 'create-sat.ts', t7e('plugins.CreateSat.errorMsgs.exportFailed' as T7eKey));
      ServiceLocator.getUiManager().toast(t7e('plugins.CreateSat.errorMsgs.exportFailed' as T7eKey), ToastMsgType.error, true);
    }
  }
}
