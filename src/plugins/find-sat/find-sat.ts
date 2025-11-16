import { CatalogExporter } from '@app/app/data/catalog-exporter';
import { countryCodeList, countryNameList } from '@app/app/data/catalogs/countries';
import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { getUnique } from '@app/engine/utils/get-unique';
import { hideLoading, showLoading } from '@app/engine/utils/showLoading';
import { BaseObject, Degrees, DetailedSatellite, Hours, Kilometers, Minutes, RaeVec, eci2rae } from '@ootk/src/main';
import findSatPng from '@public/img/icons/database-search.png';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';

export interface SearchSatParams {
  argPe: Degrees;
  argPeMarg: Degrees;
  az: Degrees;
  azMarg: Degrees;
  bus: string;
  countryCode: string;
  el: Degrees;
  elMarg: Degrees;
  inc: Degrees;
  incMarg: Degrees;
  objType: number;
  payload: string;
  period: Minutes;
  periodMarg: Minutes;
  tleAge: Hours;
  tleAgeMarg: Hours;
  raan: Degrees;
  raanMarg: Degrees;
  rcs: number;
  rcsMarg: number;
  rng: Kilometers;
  rngMarg: Kilometers;
  shape: string;
  source: string;
}

/**
 * Default margins for search parameters when not specified
 */
const DEFAULT_MARGINS = {
  azimuth: 5 as Degrees,
  elevation: 5 as Degrees,
  range: 200 as Kilometers,
  inclination: 1 as Degrees,
  period: 0.5 as Minutes,
  tleAge: 1 as Hours,
  rightAscension: 1 as Degrees,
  argOfPerigee: 1 as Degrees,
} as const;

/**
 * Minimum payload length for filtering
 */
const MIN_PAYLOAD_LENGTH = 3;

/**
 * Type for RAE (Range, Azimuth, Elevation) properties
 */
type RaeProperty = 'az' | 'el' | 'rng';

/**
 * Type for satellite orbital properties
 */
type SatelliteProperty = 'inclination' | 'argOfPerigee' | 'rightAscension' | 'period';

/**
 * Utility Functions
 */

/**
 * Checks if a number is valid (not NaN and finite)
 */
const isValidNumber = (value: number): boolean => !isNaN(value) && isFinite(value);

/**
 * Parses a float input value and returns it if valid, otherwise returns the default
 */
const parseFloatOrDefault = (value: string, defaultValue: number): number => {
  const parsed = parseFloat(value);

  return isValidNumber(parsed) ? parsed : defaultValue;
};

/**
 * Gets satellite position and converts to RAE coordinates
 */
const getSatelliteRae = (sat: DetailedSatellite): RaeVec | null => {
  if (!sat.isSatellite() && !sat.isMissile()) {
    return null;
  }

  const catalogManager = ServiceLocator.getCatalogManager();
  const currentSatellite = catalogManager.getSat(sat.id, GetSatType.POSITION_ONLY);

  if (!currentSatellite) {
    return null;
  }

  const timeManager = ServiceLocator.getTimeManager();
  const sensorManager = ServiceLocator.getSensorManager();

  return eci2rae(timeManager.simulationTimeObj, currentSatellite.position, sensorManager.currentSensors[0]);
};

/**
 * Sorts strings case-insensitively
 */
const caseInsensitiveSort = (a: string, b: string): number => a.toLowerCase().localeCompare(b.toLowerCase());

/**
 * Extracts payload partial from satellite payload string
 */
const extractPayloadPartial = (payload: string): string =>
  payload
    .split(' ')[0]
    .split('-')[0]
    .replace(/[^a-zA-Z]/gu, '');

/**
 * FindSatPlugin provides advanced satellite search functionality based on multiple criteria
 * including orbital parameters, physical characteristics, and location-based filtering.
 *
 * Key Features:
 * - Search by azimuth, elevation, and range (RAE coordinates)
 * - Filter by orbital parameters (inclination, period, RAAN, argument of perigee)
 * - Filter by physical characteristics (RCS, shape, bus type)
 * - Filter by metadata (country, source, payload type)
 * - Export search results to CSV
 */
export class FindSatPlugin extends KeepTrackPlugin {
  readonly id = 'FindSatPlugin';
  private lastResults_: DetailedSatellite[] = [];
  private hasSearchBeenRun_ = false;

  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 500,
    maxWidth: 700,
  };

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];
  bottomIconImg = findSatPng;
  sideMenuElementName = 'findByLooks-menu';
  sideMenuElementHtml: string = html`
  <div id="findByLooks-menu" class="side-menu-parent start-hidden text-select">
    <div id="findByLooks-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Find Satellite</h5>
        <form id="findByLooks-form">
          <div class="row">
            <div class="input-field col s12">
              <select value=0 id="fbl-type" type="text">
                <option value=0>All</option>
                <option value=1>Payload</option>
                <option value=2>Rocket Body</option>
                <option value=3>Debris</option>
              </select>
              <label for="disabled">Object Type</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <select value=0 id="fbl-country" type="text">
                <option value='All'>All</option>
              </select>
              <label for="disabled">Country</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <select value=0 id="fbl-bus" type="text">
                <option value='All'>All</option>
              </select>
              <label for="disabled">Satellite Bus</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <select value=0 id="fbl-payload" type="text">
                <option value='All'>All</option>
              </select>
              <label for="disabled">Payload</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <select value=0 id="fbl-shape" type="text">
                <option value='All'>All</option>
              </select>
              <label for="disabled">Shape</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <select value=0 id="fbl-source" type="text">
                <option value='All'>All</option>
              </select>
              <label for="disabled">Source</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="xxx.x" id="fbl-azimuth" type="text">
              <label for="fbl-azimuth" class="active">Azimuth (deg)</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input placeholder="5" id="fbl-azimuth-margin" type="text">
              <label for="fbl-azimuth-margin "class="active">Margin (deg)</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="XX.X" id="fbl-elevation" type="text">
              <label for="fbl-elevation "class="active">Elevation (deg)</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input placeholder="5" id="fbl-elevation-margin" type="text">
              <label for="fbl-elevation-margin "class="active">Margin (deg)</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="xxxx.x" id="fbl-range" type="text">
              <label for="fbl-range "class="active">Range (km)</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input placeholder="500" id="fbl-range-margin" type="text">
              <label for="fbl-range-margin "class="active">Margin (km)</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="XX.X" id="fbl-inc" type="text">
              <label for="fbl-inc "class="active">Inclination (deg)</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input value="0.5" placeholder="0.5" id="fbl-inc-margin" type="text">
              <label for="fbl-inc-margin "class="active">Margin (deg)</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="XX.X" id="fbl-period" type="text">
              <label for="fbl-period "class="active">Period (min)</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input value="10" placeholder="10" id="fbl-period-margin" type="text">
              <label for="fbl-period-margin "class="active">Margin (min)</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="XX.X" id="fbl-tleAge" type="text">
              <label for="fbl-tleAge "class="active">TLE Age (hours)</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input value="1" placeholder="1" id="fbl-tleAge-margin" type="text">
              <label for="fbl-tleAge-margin "class="active">Margin (hours)</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="XX.X" id="fbl-rcs" type="text">
              <!-- RCS in meters squared -->
              <label for="fbl-rcs "class="active">RCS (m<sup>2</sup>)</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input value="10" placeholder="10" id="fbl-rcs-margin" type="text">
              <label for="fbl-rcs-margin "class="active">Margin (m<sup>2</sup>)</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="XX.X" id="fbl-raan" type="text">
              <label for="fbl-raan "class="active">Right Ascension (deg)</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input value="0.5" placeholder="0.5" id="fbl-raan-margin" type="text">
              <label for="fbl-raan-margin "class="active">Margin (deg)</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="XX.X" id="fbl-argPe" type="text">
              <label for="fbl-argPe "class="active">Arg of Perigee (deg)</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input value="0.5" placeholder="0.5" id="fbl-argPe-margin" type="text">
              <label for="fbl-argPe-margin "class="active">Margin (deg)</label>
            </div>
          </div>
          <div class="row">
          <center>
            <button id="findByLooks-submit" class="btn btn-ui waves-effect waves-light" type="submit"
              name="action">Find Satellite(s) &#9658;
              </button>
            </center>
          </div>
          <div class="row">
          <center>
          <button id="findByLooks-export" class="btn btn-ui waves-effect waves-light" type="button"
            name="action">Export data &#9658;
            </button>
          </center>
          </div>
        </form>
        <div class="row center-align" style="margin-top:20px;">
          <span id="fbl-error" class="menu-selectable"></span>
        </div>
      </div>
    </div>
  </div>`;

  /**
   * Initializes the plugin and sets up event listeners
   */
  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  /**
   * Prints the last search results to the console
   */
  printLastResults(): void {
    errorManagerInstance.info(this.lastResults_.map((sat) => sat.name).join('\n'));
  }

  /**
   * Populates a dropdown with unique values from satellite data
   */
  private populateDropdown_(
    elementId: string,
    satellites: BaseObject[],
    propertyExtractor: (sat: DetailedSatellite) => string,
    filter?: (value: string) => boolean,
  ): void {
    const values = satellites
      .filter((obj: BaseObject) => {
        const sat = obj as DetailedSatellite;
        const value = propertyExtractor(sat);

        return value !== undefined && value !== null && value !== '';
      })
      .map((obj) => propertyExtractor(obj as DetailedSatellite));

    const uniqueValues = getUnique(values).sort(caseInsensitiveSort);

    uniqueValues.forEach((value) => {
      if (filter && !filter(value)) {
        return;
      }
      getEl(elementId)!.insertAdjacentHTML('beforeend', `<option value="${value}">${value}</option>`);
    });
  }

  /**
   * Populates country dropdown with country names and codes
   */
  private populateCountryDropdown_(): void {
    countryNameList.forEach((countryName: string) => {
      const countryCode = countryCodeList[countryName];

      getEl('fbl-country')!.insertAdjacentHTML('beforeend', `<option value="${countryCode}">${countryName}</option>`);
    });
  }

  /**
   * Populates payload dropdown with extracted payload partials
   */
  private populatePayloadDropdown_(satellites: BaseObject[]): void {
    const payloadPartials = satellites
      .filter((obj: BaseObject) => (obj as DetailedSatellite)?.payload)
      .map((obj) => extractPayloadPartial((obj as DetailedSatellite).payload))
      .filter((partial) => partial.length >= MIN_PAYLOAD_LENGTH);

    const uniquePayloads = getUnique(payloadPartials).sort(caseInsensitiveSort);

    uniquePayloads.forEach((payload) => {
      if (payload && payload.length > MIN_PAYLOAD_LENGTH) {
        getEl('fbl-payload')!.insertAdjacentHTML('beforeend', `<option value="${payload}">${payload}</option>`);
      }
    });
  }

  /**
   * Sets up event listeners and initializes dropdowns
   */
  private uiManagerFinal_(): void {
    const satData = ServiceLocator.getCatalogManager().objectCache;

    // Error message click handler
    getEl('fbl-error')!.addEventListener('click', () => {
      getEl('fbl-error')!.style.display = 'none';
    });

    // Form submit handler
    getEl('findByLooks-form')!.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      showLoading(() => {
        this.findByLooksSubmit_().then(() => {
          hideLoading();
        });
      });
    });

    // Populate dropdowns
    this.populateDropdown_('fbl-bus', satData, (sat) => sat.bus);
    this.populateCountryDropdown_();
    this.populateDropdown_('fbl-shape', satData, (sat) => sat.shape);
    this.populateDropdown_('fbl-source', satData, (sat) => sat.source);
    this.populatePayloadDropdown_(satData);

    // Export button handler
    getEl('findByLooks-export')?.addEventListener('click', () => {
      if (!this.hasSearchBeenRun_) {
        errorManagerInstance.warn('Try finding satellites first!');

        return;
      }
      CatalogExporter.exportTle2Csv(this.lastResults_);
    });
  }

  /**
   * Parses form input values and returns search parameters
   */
  private parseFormInputs_(): SearchSatParams {
    return {
      az: parseFloat((<HTMLInputElement>getEl('fbl-azimuth')).value) as Degrees,
      el: parseFloat((<HTMLInputElement>getEl('fbl-elevation')).value) as Degrees,
      rng: parseFloat((<HTMLInputElement>getEl('fbl-range')).value) as Kilometers,
      inc: parseFloat((<HTMLInputElement>getEl('fbl-inc')).value) as Degrees,
      period: parseFloat((<HTMLInputElement>getEl('fbl-period')).value) as Minutes,
      tleAge: parseFloat((<HTMLInputElement>getEl('fbl-tleAge')).value) as Hours,
      rcs: parseFloat((<HTMLInputElement>getEl('fbl-rcs')).value),
      azMarg: parseFloat((<HTMLInputElement>getEl('fbl-azimuth-margin')).value) as Degrees,
      elMarg: parseFloat((<HTMLInputElement>getEl('fbl-elevation-margin')).value) as Degrees,
      rngMarg: parseFloat((<HTMLInputElement>getEl('fbl-range-margin')).value) as Kilometers,
      incMarg: parseFloat((<HTMLInputElement>getEl('fbl-inc-margin')).value) as Degrees,
      periodMarg: parseFloat((<HTMLInputElement>getEl('fbl-period-margin')).value) as Minutes,
      tleAgeMarg: parseFloat((<HTMLInputElement>getEl('fbl-tleAge-margin')).value) as Hours,
      rcsMarg: parseFloat((<HTMLInputElement>getEl('fbl-rcs-margin')).value),
      objType: parseInt((<HTMLInputElement>getEl('fbl-type')).value, 10),
      raan: parseFloat((<HTMLInputElement>getEl('fbl-raan')).value) as Degrees,
      raanMarg: parseFloat((<HTMLInputElement>getEl('fbl-raan-margin')).value) as Degrees,
      argPe: parseFloat((<HTMLInputElement>getEl('fbl-argPe')).value) as Degrees,
      argPeMarg: parseFloat((<HTMLInputElement>getEl('fbl-argPe-margin')).value) as Degrees,
      countryCode: (<HTMLInputElement>getEl('fbl-country')).value,
      bus: (<HTMLInputElement>getEl('fbl-bus')).value,
      payload: (<HTMLInputElement>getEl('fbl-payload')).value,
      shape: (<HTMLInputElement>getEl('fbl-shape')).value,
      source: (<HTMLInputElement>getEl('fbl-source')).value,
    };
  }

  /**
   * Handles form submission and executes satellite search
   */
  private findByLooksSubmit_(): Promise<void> {
    this.hasSearchBeenRun_ = true;

    return new Promise((resolve, reject) => {
      try {
        const uiManager = ServiceLocator.getUiManager();
        const searchParams = this.parseFormInputs_();

        // Reset the search input
        (<HTMLInputElement>getEl('search')).value = '';

        // Execute search
        this.lastResults_ = FindSatPlugin.searchSats_(searchParams);

        // Show feedback to user
        if (this.lastResults_.length === 0) {
          uiManager.toast('No Satellites Found', ToastMsgType.critical);
        } else {
          uiManager.toast(`Found ${this.lastResults_.length} satellite(s)`, ToastMsgType.normal);
        }

        resolve();
      } catch (error) {
        const uiManager = ServiceLocator.getUiManager();

        if (error instanceof Error && error.message === 'No Search Criteria Entered') {
          uiManager.toast('No Search Criteria Entered', ToastMsgType.critical);
        } else {
          uiManager.toast('An error occurred during search', ToastMsgType.critical);
          errorManagerInstance.error(error, 'FindSatPlugin.findByLooksSubmit_', 'Error during satellite search');
        }

        reject(error);
      }
    });
  }

  /**
   * Generic filter for RAE (Range, Azimuth, Elevation) based properties
   * Consolidates checkAz_, checkEl_, and checkRange_ into a single method
   */
  private static filterByRaeProperty_(
    satellites: DetailedSatellite[],
    property: RaeProperty,
    min: number,
    max: number,
  ): DetailedSatellite[] {
    return satellites.filter((sat) => {
      const rae = getSatelliteRae(sat);

      if (!rae) {
        return false;
      }

      return rae[property] >= min && rae[property] <= max;
    });
  }

  /**
   * Filters satellites that are currently in view
   */
  private static checkInview_(satellites: DetailedSatellite[]): DetailedSatellite[] {
    const dotsManager = ServiceLocator.getDotsManager();

    return satellites.filter((sat) => dotsManager.inViewData[sat.id] === 1);
  }

  /**
   * Filters satellites by object type
   */
  private static checkObjtype_(satellites: DetailedSatellite[], objtype: number): DetailedSatellite[] {
    return satellites.filter((sat) => sat.type === objtype);
  }

  /**
   * Limits search results to a maximum number and notifies user if truncated
   */
  private static limitPossibles_(results: DetailedSatellite[], limit: number): DetailedSatellite[] {
    const uiManager = ServiceLocator.getUiManager();

    if (results.length > limit) {
      uiManager.toast(`Too many results, limited to ${limit}`, ToastMsgType.serious);

      return results.slice(0, limit);
    }

    return results;
  }

  /**
   * Validates search parameters and applies default margins where needed
   */
  private static validateSearchParams_(params: SearchSatParams): {
    validations: Record<string, boolean>;
    margins: SearchSatParams;
  } {
    const {
      az,
      el,
      rng,
      inc,
      period,
      tleAge,
      rcs,
      raan,
      argPe,
      countryCode,
      bus,
      shape,
      source,
      payload,
    } = params;

    // Validate numeric parameters
    const validations = {
      isValidAz: isValidNumber(az),
      isValidEl: isValidNumber(el),
      isValidRange: isValidNumber(rng),
      isValidInc: isValidNumber(inc),
      isValidRaan: isValidNumber(raan),
      isValidArgPe: isValidNumber(argPe),
      isValidPeriod: isValidNumber(period),
      isValidTleAge: isValidNumber(tleAge),
      isValidRcs: isValidNumber(rcs),
      isSpecificCountry: countryCode !== 'All',
      isSpecificBus: bus !== 'All',
      isSpecificShape: shape !== 'All',
      isSpecificSource: source !== 'All',
      isSpecificPayload: payload !== 'All',
    };

    // Apply default margins where not specified
    const margins = {
      ...params,
      azMarg: isValidNumber(params.azMarg) ? params.azMarg : DEFAULT_MARGINS.azimuth,
      elMarg: isValidNumber(params.elMarg) ? params.elMarg : DEFAULT_MARGINS.elevation,
      rngMarg: isValidNumber(params.rngMarg) ? params.rngMarg : DEFAULT_MARGINS.range,
      incMarg: isValidNumber(params.incMarg) ? params.incMarg : DEFAULT_MARGINS.inclination,
      periodMarg: isValidNumber(params.periodMarg) ? params.periodMarg : DEFAULT_MARGINS.period,
      tleAgeMarg: isValidNumber(params.tleAgeMarg) ? params.tleAgeMarg : DEFAULT_MARGINS.tleAge,
      rcsMarg: isValidNumber(params.rcsMarg) ? params.rcsMarg : rcs / 10,
      raanMarg: isValidNumber(params.raanMarg) ? params.raanMarg : DEFAULT_MARGINS.rightAscension,
      argPeMarg: isValidNumber(params.argPeMarg) ? params.argPeMarg : DEFAULT_MARGINS.argOfPerigee,
    };

    return { validations, margins };
  }

  /**
   * Main search function that filters satellites based on provided parameters
   */
  private static searchSats_(searchParams: SearchSatParams): DetailedSatellite[] {
    const { validations, margins } = FindSatPlugin.validateSearchParams_(searchParams);

    const {
      az,
      el,
      rng,
      inc,
      period,
      tleAge,
      rcs,
      raan: rightAscension,
      argPe,
      azMarg,
      elMarg,
      rngMarg,
      incMarg,
      periodMarg,
      tleAgeMarg,
      rcsMarg,
      raanMarg: rightAscensionMarg,
      argPeMarg,
      countryCode,
      bus,
      shape,
      payload,
      source,
      objType,
    } = margins;

    const {
      isValidAz,
      isValidEl,
      isValidRange,
      isValidInc,
      isValidRaan,
      isValidArgPe,
      isValidPeriod,
      isValidTleAge,
      isValidRcs,
      isSpecificCountry,
      isSpecificBus,
      isSpecificShape,
      isSpecificSource,
      isSpecificPayload,
    } = validations;

    // Check if at least one search criterion is provided
    const hasAnyCriteria = Object.values(validations).some((valid) => valid);

    if (!hasAnyCriteria) {
      throw new Error('No Search Criteria Entered');
    }

    let res = ServiceLocator.getCatalogManager().getSats();

    res = !isValidInc && !isValidPeriod && !isValidTleAge && (isValidAz || isValidEl || isValidRange) ? FindSatPlugin.checkInview_(res) : res;

    res = objType !== 0 ? FindSatPlugin.checkObjtype_(res, objType) : res;

    if (isValidAz) {
      res = FindSatPlugin.filterByRaeProperty_(res, 'az', az - azMarg, az + azMarg);
    }
    if (isValidEl) {
      res = FindSatPlugin.filterByRaeProperty_(res, 'el', el - elMarg, el + elMarg);
    }
    if (isValidRange) {
      res = FindSatPlugin.filterByRaeProperty_(res, 'rng', rng - rngMarg, rng + rngMarg);
    }
    if (isValidInc) {
      res = FindSatPlugin.filterBySatelliteProperty_(res, 'inclination', inc - incMarg, inc + incMarg);
    }
    if (isValidRaan) {
      res = FindSatPlugin.filterBySatelliteProperty_(res, 'rightAscension', rightAscension - rightAscensionMarg, rightAscension + rightAscensionMarg);
    }
    if (isValidArgPe) {
      res = FindSatPlugin.filterBySatelliteProperty_(res, 'argOfPerigee', argPe - argPeMarg, argPe + argPeMarg);
    }
    if (isValidPeriod) {
      res = FindSatPlugin.filterBySatelliteProperty_(res, 'period', period - periodMarg, period + periodMarg);
    }
    if (isValidTleAge) {
      res = FindSatPlugin.checkTleAge_(res, (tleAge - tleAgeMarg) as Hours, (tleAge + tleAgeMarg) as Hours);
    }
    if (isValidRcs) {
      res = FindSatPlugin.checkRcs_(res, rcs - rcsMarg, rcs + rcsMarg);
    }
    // Filter by country (supports multiple countries separated by '|')
    if (isSpecificCountry) {
      const countries = countryCode
        .split('|')
        .filter((item, index, arr) => item && arr.indexOf(item) === index); // Remove duplicates and empty strings

      res = res.filter((sat) => countries.includes(sat.country));
    }

    // Filter by bus type
    if (isSpecificBus) {
      res = res.filter((sat) => sat.bus === bus);
    }

    // Filter by shape
    if (isSpecificShape) {
      res = res.filter((sat) => sat.shape === shape);
    }

    // Filter by source
    if (isSpecificSource) {
      res = res.filter((sat) => sat.source === source);
    }

    // Filter by payload (matches payload prefix)
    if (isSpecificPayload) {
      res = res.filter((sat) => extractPayloadPartial(sat.payload || '') === payload);
    }

    // Limit results to prevent performance issues
    res = FindSatPlugin.limitPossibles_(res, settingsManager.searchLimit);

    // Format results and trigger search UI
    FindSatPlugin.displaySearchResults_(res);

    return res;
  }

  /**
   * Displays search results in the UI by populating the search box
   */
  private static displaySearchResults_(results: DetailedSatellite[]): void {
    const searchInput = <HTMLInputElement>getEl('search');
    const uiManager = ServiceLocator.getUiManager();

    // Create comma-separated list of satellite SCC numbers
    const sccNumbers = results.map((sat) => sat.sccNum).join(',');

    searchInput.value = sccNumbers;
    uiManager.doSearch(sccNumbers);
  }

  /**
   * Generic filter for satellite orbital properties
   * Consolidates checkInc_, checkArgPe_, checkRightAscension_, and checkPeriod_
   */
  private static filterBySatelliteProperty_(
    satellites: DetailedSatellite[],
    property: SatelliteProperty,
    min: number,
    max: number,
  ): DetailedSatellite[] {
    return satellites.filter((sat) => {
      const value = sat[property];

      return value > min && value < max;
    });
  }

  /**
   * Filters satellites by TLE age
   */
  private static checkTleAge_(satellites: DetailedSatellite[], minTleAge_: Hours, maxTleAge: Hours): DetailedSatellite[] {
    const minTleAge = Math.max(0, minTleAge_);
    const now = new Date();

    return satellites.filter((sat) => {
      const ageHours = sat.ageOfElset(now);

      return ageHours >= minTleAge && ageHours <= maxTleAge;
    });
  }

  /**
   * Filters satellites by RCS (Radar Cross Section)
   */
  private static checkRcs_(satellites: DetailedSatellite[], minRcs: number, maxRcs: number): DetailedSatellite[] {
    return satellites.filter((sat) => {
      const rcs = sat.rcs ?? NaN;

      // Handle satellites with no RCS data
      if (isNaN(rcs)) {
        return false;
      }

      return rcs > minRcs && rcs < maxRcs;
    });
  }
}
