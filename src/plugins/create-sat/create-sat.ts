import {
  DetailedSatellite,
  DetailedSatelliteParams,
  EciVec3,
  FormatTle,
  KilometersPerSecond,
  SatelliteRecord,
  Sgp4,
  Tle,
} from '@ootk/src/main';
import addSatellitePnng from '@public/img/icons/add-satellite.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

import { SatMath } from '@app/app/analysis/sat-math';
import { countryCodeList, countryNameList } from '@app/app/data/catalogs/countries';
import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { saveAs } from 'file-saver';
import { ServiceLocator } from '@app/engine/core/service-locator';

/**
 * Interface for TLE input parameters
 */
interface TleInputParams {
  scc: string;
  type: string;
  country: string;
  inc: string;
  meanmo: string;
  rasc: string;
  ecen: string;
  argPe: string;
  meana: string;
  epochyr: string;
  epochday: string;
  source: string;
  name: string;
  period: string;
}

/**
 * CreateSat plugin for creating and editing satellites
 */
export class CreateSat extends KeepTrackPlugin {
  readonly id = 'CreateSat';
  dependencies_ = [SelectSatManager.name];

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  isRequireSatelliteSelected = false;
  isIconDisabledOnLoad = false;
  isIconDisabled = false;

  static readonly elementPrefix = 'createSat';
  bottomIconImg = addSatellitePnng;
  sideMenuElementName = 'createSat-menu';

  constructor() {
    super();
  }

  /**
   * HTML template for the side menu
   */
  sideMenuElementHtml = html`
    <div id="createSat-menu" class="side-menu-parent start-hidden text-select">
      <div id="createSat-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Create Satellite</h5>
          <form id="createSat">
            <div class="input-field col s12">
              <input value="90000" id="${CreateSat.elementPrefix}-scc" type="text" maxlength="5" />
              <label for="${CreateSat.elementPrefix}-scc" class="active">Satellite NORAD ID (90000-99999)</label>
            </div>
            <div class="input-field col s12">
              <select value=1 id="${CreateSat.elementPrefix}-type" type="text">
                <option value=1>Payload</option>
                <option value=2>Rocket Body</option>
                <option value=3>Debris</option>
                <option value=4>Special</option>
              </select>
              <label for="${CreateSat.elementPrefix}-type">Object Type</label>
            </div>
            <div class="input-field col s12">
              <select value="TBD" id="${CreateSat.elementPrefix}-country" type="text">
                <option value="TBD">Unknown</option>
              </select>
              <label for="${CreateSat.elementPrefix}-country">Country</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA" id="${CreateSat.elementPrefix}-year" type="text" maxlength="2" />
              <label for="${CreateSat.elementPrefix}-year" class="active">Epoch Year</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAAAAAA" id="${CreateSat.elementPrefix}-day" type="text" maxlength="12" />
              <label for="${CreateSat.elementPrefix}-day" class="active">Epoch Day</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="${CreateSat.elementPrefix}-inc" type="text" maxlength="8" />
              <label for="${CreateSat.elementPrefix}-inc" class="active">Inclination</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="${CreateSat.elementPrefix}-rasc" type="text" maxlength="8" />
              <label for="${CreateSat.elementPrefix}-rasc" class="active">Right Ascension</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA.AAAAAAAA" id="${CreateSat.elementPrefix}-ecen" type="text" maxlength="7" />
              <label for="${CreateSat.elementPrefix}-ecen" class="active">Eccentricity</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA.AAAAAAAA" id="${CreateSat.elementPrefix}-argPe" type="text" maxlength="8" />
              <label for="${CreateSat.elementPrefix}-argPe" class="active">Argument of Perigee</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="${CreateSat.elementPrefix}-meana" type="text" maxlength="8" />
              <label for="${CreateSat.elementPrefix}-meana" class="active">Mean Anomaly</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="${CreateSat.elementPrefix}-meanmo" type="text" maxlength="11" />
              <label for="${CreateSat.elementPrefix}-meanmo" class="active">Mean Motion</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA.AAAA" id="${CreateSat.elementPrefix}-per" type="text" maxlength="11" />
              <label for="${CreateSat.elementPrefix}-per" class="active">Period</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="" id="${CreateSat.elementPrefix}-src" type="text" maxlength="24" />
              <label for="${CreateSat.elementPrefix}-src" class="active">Data source</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="" id="${CreateSat.elementPrefix}-name" type="text" maxlength="24" />
              <label for="${CreateSat.elementPrefix}-name" class="active">Satellite Name</label>
            </div>
            <div class="center-align row">
              <button id="createSat-submit" class="btn btn-ui waves-effect waves-light" type="button" name="action">Create Satellite &#9658;</button>
            </div>
            <div class="center-align row">
              <button id="createSat-save" class="btn btn-ui waves-effect waves-light" type="button" name="action">Save TLE &#9658;</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  /**
   * Add HTML and register events
   */
  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  /**
   * Initialize all event listeners for the UI
   */
  private uiManagerFinal_(): void {
    // Period and mean motion converter
    this.setupPeriodMeanMotionConverters_();

    // Submit and save buttons
    getEl('createSat-submit')!.addEventListener('click', CreateSat.createSatSubmit_);
    getEl('createSat-save')!.addEventListener('click', CreateSat.exportTLE_);

    countryNameList.forEach((countryName: string) => {
      let countryCode = countryCodeList[countryName];

      if (typeof countryCode === 'string' && countryCode.includes('|')) {
        countryCode = countryCode.split('|')[0];
      }

      getEl(`${CreateSat.elementPrefix}-country`)!.insertAdjacentHTML('beforeend', `<option value="${countryCode}">${countryName}</option>`);
    });

    // Populate default values
    this.populateSideMenu_();
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
      } catch (error) {
        errorManagerInstance.error(error as Error, 'create-sat.ts', 'Error converting period to mean motion');
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
        errorManagerInstance.warn(`Error converting mean motion to period: ${error}`);
      }
    });
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
  private populateSideMenu_(): void {
    // Set default inclination
    const defaultInc = 0;
    const inc = defaultInc.toFixed(4).padStart(8, '0');

    (getEl(`${CreateSat.elementPrefix}-inc`) as HTMLInputElement).value = inc;

    // Set date-related values
    const date = new Date(ServiceLocator.getTimeManager().simulationTimeObj);
    const year = date.getFullYear().toString().slice(2, 4);
    const currentJday = ServiceLocator.getTimeManager().getUTCDayOfYear(date);
    const currentTime = (date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds()) / 86400;
    const day = (currentJday + currentTime).toFixed(8).padStart(12, '0');


    (getEl(`${CreateSat.elementPrefix}-year`) as HTMLInputElement).value = year;
    (getEl(`${CreateSat.elementPrefix}-day`) as HTMLInputElement).value = day;

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

  private static validateInputs_(inputParams: TleInputParams): string | null {
    // Validate NORAD ID
    if (!(/^\d{5}$/u).test(inputParams.scc) || parseInt(inputParams.scc, 10) < 90000 || parseInt(inputParams.scc, 10) > 99999) {
      return 'Invalid NORAD ID. Must be a 5-digit number between 90000 and 99999.';
    }
    // Validate type
    if (!['1', '2', '3', '4'].includes(inputParams.type)) {
      return 'Invalid type. Must be 1 (Payload), 2 (Rocket Body), 3 (Debris), or 4 (Special).';
    }
    // Validate country
    if (!inputParams.country) {
      return 'Invalid country. Must be selected from the list.';
    }
    // Validate epoch year
    if (!(/^\d{2}$/u).test(inputParams.epochyr)) {
      return 'Invalid epoch year. Must be a 2-digit number.';
    }
    // Validate epoch day
    if (!(/^\d{3}\.\d{8}$/u).test(inputParams.epochday)) {
      return 'Invalid epoch day. Must be in the format NNN.NNNNNNNN (e.g., 001.00000000).';
    }
    // Validate inclination
    if (!(/^\d{3}\.\d{4}$/u).test(inputParams.inc)) {
      return 'Invalid inclination. Must be in the format NNN.NNNN (e.g., 000.0000).';
    }
    // Validate right ascension
    if (!(/^\d{3}\.\d{4}$/u).test(inputParams.rasc)) {
      return 'Invalid right ascension. Must be in the format NNN.NNNN (e.g., 000.0000).';
    }
    // Validate eccentricity
    if (!(/^\d{7}$/u).test(inputParams.ecen)) {
      return 'Invalid eccentricity. Must be a 7-digit number (e.g., 0000000).';
    }
    // Validate argument of perigee
    if (!(/^\d{3}\.\d{4}$/u).test(inputParams.argPe)) {
      return 'Invalid argument of perigee. Must be in the format NNN.NNNN (e.g., 000.0000).';
    }
    // Validate mean anomaly
    if (!(/^\d{3}\.\d{4}$/u).test(inputParams.meana)) {
      return 'Invalid mean anomaly. Must be in the format NNN.NNNN (e.g., 000.0000).';
    }
    // Validate mean motion
    if (!(/^\d{2}\.\d{5}$/u).test(inputParams.meanmo)) {
      return 'Invalid mean motion. Must be in the format NN.NNNNN (e.g., 16.00000).';
    }
    // Validate period
    if (!(/^\d{2,4}\.\d{4}$/u).test(inputParams.period)) {
      return 'Invalid period. Must be in the format NN.NNNN to NNNN.NNNN (e.g., 90.0000, 9999.9999) with 8 digits total.';
    }
    // Validate source
    if (!inputParams.source || inputParams.source.trim() === '') {
      return 'Invalid source. Must not be empty.';
    }
    // Validate name
    if (!inputParams.name || inputParams.name.trim() === '') {
      return 'Invalid name. Must not be empty.';
    }

    // All validations passed
    return null;
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
   * Create and submit a new satellite
   */
  private static createSatSubmit_(): void {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    // Attempt to fix formatting issues
    CreateSat.fixInputFormatting_();

    // Get all input values
    const inputParams = CreateSat.getTleInputs_();

    // Validate inputs
    const invalidMsg = CreateSat.validateInputs_(inputParams);

    if (invalidMsg) {
      ServiceLocator.getUiManager().toast(`Invalid input parameters: ${invalidMsg}`, ToastMsgType.error, true);

      return;
    }

    try {
      // Convert SCC to internal ID
      const satId = catalogManagerInstance.sccNum2Id(parseInt(inputParams.scc)) ?? -1;
      const obj = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY);

      if (!obj?.isSatellite()) {
        ServiceLocator.getUiManager().toast(
          'Invalid satellite object',
          ToastMsgType.error,
          true,
        );

        return;
      }

      const sat = obj as DetailedSatellite;
      const country = inputParams.country;
      const type = parseInt(inputParams.type);
      const intl = `${inputParams.epochyr}69B`; // International designator
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
        errorManagerInstance.warn(t7e('errorMsgs.CreateSat.errorCreatingSat'));

        return;
      }

      // Create satellite record from TLE
      let satrec: SatelliteRecord;

      try {
        satrec = Sgp4.createSatrec(tle1, tle2);
      } catch (e) {
        errorManagerInstance.error(e as Error, 'create-sat.ts', 'Error creating satellite record!');

        return;
      }

      // Validate altitude is reasonable
      if (SatMath.altitudeCheck(satrec, ServiceLocator.getTimeManager().simulationTimeObj) <= 1) {
        ServiceLocator.getUiManager().toast(
          'Failed to propagate satellite. Try different parameters or report this issue if parameters are correct.',
          ToastMsgType.caution,
          true,
        );

        return;
      }

      // Propagate satellite to get position and velocity
      const spg4vec = Sgp4.propagate(satrec, 0);
      const pos = spg4vec.position as EciVec3;
      const vel = spg4vec.velocity as EciVec3<KilometersPerSecond>;

      // Create new satellite object
      const info: DetailedSatelliteParams = {
        id: satId,
        type,
        country,
        tle1,
        tle2,
        name: inputParams.name,
      };

      const newSat = new DetailedSatellite({
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
        catalogManagerInstance.satCruncher.postMessage({
          typ: CruncerMessageTypes.SAT_EDIT,
          active: true,
          id: satId,
          tle1,
          tle2,
        });
      } catch (e) {
        errorManagerInstance.error(e as Error, 'create-sat.ts', 'Sat Cruncher message failed');
      }

      // Update orbit buffer
      try {
        orbitManagerInstance.changeOrbitBufferData(satId, tle1, tle2);
      } catch (e) {
        errorManagerInstance.error(e as Error, 'create-sat.ts', 'Changing orbit buffer data failed');
      }

      // Search for the new satellite
      ServiceLocator.getUiManager().doSearch(inputParams.scc);

      // Show success message
      ServiceLocator.getUiManager().toast(
        `Satellite ${inputParams.name} (${inputParams.scc}) created successfully`,
        ToastMsgType.normal,
        true,
      );

    } catch (error) {
      errorManagerInstance.warn(`Failed to create satellite: ${error}`);
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
      const satId = catalogManagerInstance.sccNum2Id(parseInt(scc));
      const sat = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY) as DetailedSatellite;

      if (!sat || !sat.tle1 || !sat.tle2) {
        ServiceLocator.getUiManager().toast('No valid TLE to export', ToastMsgType.error, true);

        return;
      }

      // Format TLE data
      const tleText = `${sat.tle1}\n${sat.tle2}`;
      const blob = new Blob([tleText], {
        type: 'text/plain;charset=utf-8',
      });

      saveAs(blob, `${scc}.tle`);
      ServiceLocator.getUiManager().toast('TLE exported successfully', ToastMsgType.normal, true);
    } catch (error) {
      errorManagerInstance.error(error as Error, 'create-sat.ts', 'Failed to export TLE');
      ServiceLocator.getUiManager().toast('Failed to export TLE', ToastMsgType.error, true);
    }
  }
}
