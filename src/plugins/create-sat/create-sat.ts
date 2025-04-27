import addSatellitePnng from '@public/img/icons/add-satellite.png';
import {
  DetailedSatellite,
  DetailedSatelliteParams,
  EciVec3,
  FormatTle,
  KilometersPerSecond,
  SatelliteRecord,
  Sgp4,
} from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

import { countryCodeList, countryNameList } from '@app/catalogs/countries';
import { GetSatType, KeepTrackApiEvents, MenuMode, ToastMsgType } from '@app/interfaces';
import { getEl } from '@app/lib/get-el';
import { t7e } from '@app/locales/keys';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { SatMath } from '@app/static/sat-math';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { saveAs } from 'file-saver';

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
}

/**
 * CreateSat plugin for creating and editing satellites
 */
export class CreateSat extends KeepTrackPlugin {
  readonly id = 'CreateSat';
  dependencies_ = [SelectSatManager.name];

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

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
  sideMenuElementHtml = keepTrackApi.html`
    <div id="createSat-menu" class="side-menu-parent start-hidden text-select">
      <div id="createSat-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Create Satellite</h5>
          <form id="createSat">
            <div class="input-field col s12">
              <input value="90000" id="${CreateSat.elementPrefix}-scc" type="text" maxlength="5" />
              <label for="${CreateSat.elementPrefix}-scc" class="active">Satellite SCC#</label>
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
        <div id="${CreateSat.elementPrefix}-error" class="center-align menu-selectable start-hidden">
          <h6 class="center-align">Error</h6>
        </div>
      </div>
    </div>
  `;

  /**
   * Add HTML and register events
   */
  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: 'createSat',
      cb: () => this.uiManagerFinal_(),
    });
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

        (getEl(`${CreateSat.elementPrefix}-meanmo`) as HTMLInputElement).value = meanmo.toFixed(4);
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

        (getEl(`${CreateSat.elementPrefix}-per`) as HTMLInputElement).value = per;
      } catch (error) {
        errorManagerInstance.error(error as Error, 'create-sat.ts', 'Error converting mean motion to period');
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
    const date = new Date(keepTrackApi.getTimeManager().simulationTimeObj);
    const year = date.getFullYear().toString().slice(2, 4);
    const currentJday = this.getUTCDayOfYear_(date);
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

  /**
   * Create and submit a new satellite
   */
  private static createSatSubmit_(): void {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    const errorElement = getEl(`${CreateSat.elementPrefix}-error`)!;

    // Hide any previous error
    errorElement.style.display = 'none';

    // Get all input values
    const inputParams = CreateSat.getTleInputs_();

    try {
      // Convert SCC to internal ID
      const satId = catalogManagerInstance.sccNum2Id(parseInt(inputParams.scc)) ?? -1;
      const obj = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY);

      if (!obj?.isSatellite()) {
        keepTrackApi.getUiManager().toast(
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
        scc: inputParams.scc,
      });

      // Check if TLE generation failed
      if (tle1 === 'Error') {
        errorManagerInstance.error(
          new Error(tle2),
          'create-sat.ts',
          t7e('errorMsgs.CreateSat.errorCreatingSat'),
        );

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
      if (SatMath.altitudeCheck(satrec, keepTrackApi.getTimeManager().simulationTimeObj) <= 1) {
        keepTrackApi.getUiManager().toast(
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
      keepTrackApi.getUiManager().doSearch(inputParams.scc);

      // Show success message
      keepTrackApi.getUiManager().toast(
        `Satellite ${inputParams.name} (${inputParams.scc}) created successfully`,
        ToastMsgType.normal,
        true,
      );

    } catch (error) {
      errorManagerInstance.error(error as Error, 'create-sat.ts', 'Failed to create satellite');
      keepTrackApi.getUiManager().toast('Failed to create satellite', ToastMsgType.error, true);
    }
  }

  /**
   * Export TLE to a file
   */
  private static exportTLE_(e: Event): void {
    e.preventDefault();

    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    try {
      const scc = (getEl(`${CreateSat.elementPrefix}-scc`) as HTMLInputElement).value;
      const satId = catalogManagerInstance.sccNum2Id(parseInt(scc));
      const sat = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY) as DetailedSatellite;

      if (!sat || !sat.tle1 || !sat.tle2) {
        keepTrackApi.getUiManager().toast('No valid TLE to export', ToastMsgType.error, true);

        return;
      }

      // Format TLE data
      const tleText = `${sat.tle1}\n${sat.tle2}`;
      const blob = new Blob([tleText], {
        type: 'text/plain;charset=utf-8',
      });

      saveAs(blob, `${scc}.tle`);
      keepTrackApi.getUiManager().toast('TLE exported successfully', ToastMsgType.normal, true);
    } catch (error) {
      errorManagerInstance.error(error as Error, 'create-sat.ts', 'Failed to export TLE');
      keepTrackApi.getUiManager().toast('Failed to export TLE', ToastMsgType.error, true);
    }
  }

  /**
   * Check if a year is a leap year
   */
  private isLeapYear_(date: Date): boolean {
    const year = date.getUTCFullYear();

    if ((year & 3) !== 0) {
      return false;
    }

    return year % 100 !== 0 || year % 400 === 0;
  }

  /**
   * Get the day of year (1-366)
   */
  private getUTCDayOfYear_(date: Date): number {
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let dayOfYear = dayCount[month] + day;

    // Adjust for leap year
    if (month > 1 && this.isLeapYear_(date)) {
      dayOfYear++;
    }

    // Ensure value is between 1-366
    const maxDays = this.isLeapYear_(date) ? 366 : 365;


    return Math.min(dayOfYear, maxDays);
  }
}
