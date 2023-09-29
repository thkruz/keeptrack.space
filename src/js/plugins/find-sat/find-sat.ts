import findSatPng from '@app/img/icons/find2.png';
import { CatalogManager, SatObject, SensorManager, Singletons, UiManager } from '@app/js/interfaces';
import { getEl } from '@app/js/lib/get-el';
import { getUnique } from '@app/js/lib/get-unique';
import { hideLoading, showLoading } from '@app/js/lib/showLoading';
import { errorManagerInstance } from '@app/js/singletons/errorManager';

import { keepTrackContainer } from '@app/js/container';

import { countryCodeList, countryNameList } from '@app/js/catalogs/countries';
import { DotsManager } from '@app/js/singletons/dots-manager';
import { SensorMath } from '@app/js/static/sensor-math';
import { keepTrackApi } from '../../keepTrackApi';
import { RAD2DEG } from '../../lib/constants';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export interface SearchSatParams {
  argPe: number;
  argPeMarg: number;
  az: number;
  azMarg: number;
  bus: string;
  countryCode: string;
  el: number;
  elMarg: number;
  inc: number;
  incMarg: number;
  objType: number;
  payload: string;
  period: number;
  periodMarg: number;
  raan: number;
  raanMarg: number;
  rcs: number;
  rcsMarg: number;
  rng: number;
  rngMarg: number;
  shape: string;
}

interface SearchResults extends SatObject {
  inView: boolean;
  rng: number;
}

export class FindSatPlugin extends KeepTrackPlugin {
  private lastResults = <SearchResults[]>[];

  public static checkAz(posAll: SearchResults[], min: number, max: number) {
    return posAll.filter((pos) => pos.az >= min && pos.az <= max);
  }

  public static checkEl(posAll: SearchResults[], min: number, max: number) {
    return posAll.filter((pos) => pos.el >= min && pos.el <= max);
  }

  public static checkInview(posAll: SearchResults[]) {
    const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
    return posAll.filter((pos) => dotsManagerInstance.inViewData[pos.id] === 1);
  }

  public static checkObjtype(posAll: SearchResults[], objtype: number) {
    return posAll.filter((pos) => pos.type === objtype);
  }

  public static checkRange(posAll: SearchResults[], min: number, max: number) {
    return posAll.filter((pos) => pos.rng >= min && pos.rng <= max);
  }

  public static limitPossibles(possibles: any[], limit: number): any[] {
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
    if (possibles.length >= limit) uiManagerInstance.toast(`Too many results, limited to ${limit}`, 'serious');
    possibles = possibles.slice(0, limit);
    return possibles;
  }

  public static searchSats(searchParams: SearchSatParams): SearchResults[] {
    let { az, el, rng, countryCode, inc, azMarg, elMarg, rngMarg, incMarg, period, periodMarg, rcs, rcsMarg, objType, raan, raanMarg, argPe, argPeMarg, bus, shape, payload } =
      searchParams;

    const isValidAz = !isNaN(az) && isFinite(az);
    const isValidEl = !isNaN(el) && isFinite(el);
    const isValidRange = !isNaN(rng) && isFinite(rng);
    const isValidInc = !isNaN(inc) && isFinite(inc);
    const isValidRaan = !isNaN(raan) && isFinite(raan);
    const isValidArgPe = !isNaN(argPe) && isFinite(argPe);
    const isValidPeriod = !isNaN(period) && isFinite(period);
    const isValidRcs = !isNaN(rcs) && isFinite(rcs);
    const isSpecificCountry = countryCode !== 'All';
    const isSpecificBus = bus !== 'All';
    const isSpecificShape = shape !== 'All';
    const isSpecificPayload = payload !== 'All';
    azMarg = !isNaN(azMarg) && isFinite(azMarg) ? azMarg : 5;
    elMarg = !isNaN(elMarg) && isFinite(elMarg) ? elMarg : 5;
    rngMarg = !isNaN(rngMarg) && isFinite(rngMarg) ? rngMarg : 200;
    incMarg = !isNaN(incMarg) && isFinite(incMarg) ? incMarg : 1;
    periodMarg = !isNaN(periodMarg) && isFinite(periodMarg) ? periodMarg : 0.5;
    rcsMarg = !isNaN(rcsMarg) && isFinite(rcsMarg) ? rcsMarg : rcs / 10;
    raanMarg = !isNaN(raanMarg) && isFinite(raanMarg) ? raanMarg : 1;
    argPeMarg = !isNaN(argPeMarg) && isFinite(argPeMarg) ? argPeMarg : 1;

    if (
      !isValidEl &&
      !isValidRange &&
      !isValidAz &&
      !isValidInc &&
      !isValidPeriod &&
      !isValidRcs &&
      !isValidArgPe &&
      !isValidRaan &&
      !isSpecificCountry &&
      !isSpecificBus &&
      !isSpecificShape &&
      !isSpecificPayload
    ) {
      throw new Error('No Search Criteria Entered');
    }

    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    let res = catalogManagerInstance.satData
      .filter((sat: SatObject) => !sat.static && !sat.missile && sat.active)
      .map((sat: SatObject) => {
        const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);
        if (sensorManagerInstance.currentSensors?.length > 0) {
          const tearr = SensorMath.getTearr(sat, sensorManagerInstance.currentSensors);
          return <SearchResults>{ ...sat, az: tearr.az, el: tearr.el, rng: tearr.rng, inView: tearr.inView };
        } else {
          return <SearchResults>sat;
        }
      });

    res = !isValidInc && !isValidPeriod && (isValidAz || isValidEl || isValidRange) ? FindSatPlugin.checkInview(res) : res;

    res = objType !== 0 ? FindSatPlugin.checkObjtype(res, objType) : res;
    if (isValidAz) res = FindSatPlugin.checkAz(res, az - azMarg, az + azMarg);
    if (isValidEl) res = FindSatPlugin.checkEl(res, el - elMarg, el + elMarg);
    if (isValidRange) res = FindSatPlugin.checkRange(res, rng - rngMarg, rng + rngMarg);
    if (isValidInc) res = FindSatPlugin.checkInc(res, inc - incMarg, inc + incMarg);
    if (isValidRaan) res = FindSatPlugin.checkRaan(res, raan - raanMarg, raan + raanMarg);
    if (isValidArgPe) res = FindSatPlugin.checkArgPe(res, argPe - argPeMarg, argPe + argPeMarg);
    if (isValidPeriod) res = FindSatPlugin.checkPeriod(res, period - periodMarg, period + periodMarg);
    if (isValidRcs) res = FindSatPlugin.checkRcs(res, rcs - rcsMarg, rcs + rcsMarg);
    if (countryCode !== 'All') res = res.filter((sat: SatObject) => countryCode.split('|').includes(sat.country));
    if (bus !== 'All') res = res.filter((sat: SatObject) => sat.bus === bus);
    if (shape !== 'All') res = res.filter((sat: SatObject) => sat.shape === shape);

    if (payload !== 'All') {
      res = res.filter(
        (sat: SatObject) =>
          sat.payload
            ?.split(' ')[0]
            ?.split('-')[0]
            ?.replace(/[^a-zA-Z]/gu, '') === payload
      );
    }

    res = FindSatPlugin.limitPossibles(res, settingsManager.searchLimit);

    let result = '';
    res.forEach((sat: SatObject, i: number) => {
      result += i < res.length - 1 ? `${sat.sccNum},` : `${sat.sccNum}`;
    });

    (<HTMLInputElement>getEl('search')).value = result;
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
    uiManagerInstance.doSearch((<HTMLInputElement>getEl('search')).value);
    return res;
  }

  sideMenuElementName: string = 'findByLooks-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
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
            <div class="input-field col s12 m6 l6">
              <input placeholder="xxx.x" id="fbl-azimuth" type="text">
              <label for="fbl-azimuth" class="active">Azimuth</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input placeholder="5" id="fbl-azimuth-margin" type="text">
              <label for="fbl-azimuth-margin "class="active">Margin</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="XX.X" id="fbl-elevation" type="text">
              <label for="fbl-elevation "class="active">Elevation</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input placeholder="5" id="fbl-elevation-margin" type="text">
              <label for="fbl-elevation-margin "class="active">Margin</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="xxxx.x" id="fbl-range" type="text">
              <label for="fbl-range "class="active">Range</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input placeholder="500" id="fbl-range-margin" type="text">
              <label for="fbl-range-margin "class="active">Margin</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="XX.X" id="fbl-inc" type="text">
              <label for="fbl-inc "class="active">Inclination</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input value="0.5" placeholder="0.5" id="fbl-inc-margin" type="text">
              <label for="fbl-inc-margin "class="active">Margin</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="XX.X" id="fbl-period" type="text">
              <label for="fbl-period "class="active">Period</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input value="10" placeholder="10" id="fbl-period-margin" type="text">
              <label for="fbl-period-margin "class="active">Margin</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="XX.X" id="fbl-rcs" type="text">
              <label for="fbl-rcs "class="active">RCS</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input value="10" placeholder="10" id="fbl-rcs-margin" type="text">
              <label for="fbl-rcs-margin "class="active">Margin</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="XX.X" id="fbl-raan" type="text">
              <label for="fbl-raan "class="active">Right Ascension</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input value="0.5" placeholder="0.5" id="fbl-raan-margin" type="text">
              <label for="fbl-raan-margin "class="active">Margin</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12 m6 l6">
              <input placeholder="XX.X" id="fbl-argPe" type="text">
              <label for="fbl-argPe "class="active">Arg of Perigee</label>
            </div>
            <div class="input-field col s12 m6 l6">
              <input value="0.5" placeholder="0.5" id="fbl-argPe-margin" type="text">
              <label for="fbl-argPe-margin "class="active">Margin</label>
            </div>
          </div>
          <div class="center-align">
            <button id="findByLooks-submit" class="btn btn-ui waves-effect waves-light" type="submit"
              name="action">Find Satellite(s) &#9658;
            </button>
          </div>
        </form>
        <div class="row center-align" style="margin-top:20px;">
          <span id="fbl-error" class="menu-selectable"></span>
        </div>
      </div>
    </div>
  </div>`;

  bottomIconElementName: string = 'menu-find-sat';
  bottomIconImg = findSatPng;
  bottomIconLabel: string = 'Find Satellite';

  helpTitle = `Find Satellite Menu`;

  helpBody = keepTrackApi.html`The Find Satellite Menu is used for finding satellites by orbital parameters or satellite characteristics.
<br><br>
For most parameters, you type in the target value on the left and then a margin of error on the right.
For example, if you wanted to find all satellites in a 51-52 degree inclination, you can type 51.5 in the left box and 0.5 in the right box.
The search will then find all satellites within those inclinations and display them in the search bar.
`;

  public async findByLooksSubmit() {
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);

    const az = parseFloat((<HTMLInputElement>getEl('fbl-azimuth')).value);
    const el = parseFloat((<HTMLInputElement>getEl('fbl-elevation')).value);
    const rng = parseFloat((<HTMLInputElement>getEl('fbl-range')).value);
    const inc = parseFloat((<HTMLInputElement>getEl('fbl-inc')).value);
    const period = parseFloat((<HTMLInputElement>getEl('fbl-period')).value);
    const rcs = parseFloat((<HTMLInputElement>getEl('fbl-rcs')).value);
    const azMarg = parseFloat((<HTMLInputElement>getEl('fbl-azimuth-margin')).value);
    const elMarg = parseFloat((<HTMLInputElement>getEl('fbl-elevation-margin')).value);
    const rngMarg = parseFloat((<HTMLInputElement>getEl('fbl-range-margin')).value);
    const incMarg = parseFloat((<HTMLInputElement>getEl('fbl-inc-margin')).value);
    const periodMarg = parseFloat((<HTMLInputElement>getEl('fbl-period-margin')).value);
    const rcsMarg = parseFloat((<HTMLInputElement>getEl('fbl-rcs-margin')).value);
    const objType = parseInt((<HTMLInputElement>getEl('fbl-type')).value);
    const raan = parseFloat((<HTMLInputElement>getEl('fbl-raan')).value);
    const raanMarg = parseFloat((<HTMLInputElement>getEl('fbl-raan-margin')).value);
    const argPe = parseFloat((<HTMLInputElement>getEl('fbl-argPe')).value);
    const argPeMarg = parseFloat((<HTMLInputElement>getEl('fbl-argPe-margin')).value);
    const countryCode = (<HTMLInputElement>getEl('fbl-country')).value;
    const bus = (<HTMLInputElement>getEl('fbl-bus')).value;
    const payload = (<HTMLInputElement>getEl('fbl-payload')).value;
    const shape = (<HTMLInputElement>getEl('fbl-shape')).value;
    (<HTMLInputElement>getEl('search')).value = ''; // Reset the search first
    try {
      const searchParams = {
        az: az,
        el: el,
        rng: rng,
        inc: inc,
        azMarg,
        elMarg,
        rngMarg,
        incMarg,
        period,
        periodMarg,
        rcs,
        rcsMarg,
        objType,
        raan,
        raanMarg,
        argPe,
        argPeMarg,
        countryCode,
        bus,
        payload,
        shape,
      };
      this.lastResults = FindSatPlugin.searchSats(searchParams);
      if (this.lastResults.length === 0) {
        uiManagerInstance.toast(`No Satellites Found`, 'critical');
      }
    } catch (e) {
      if (e.message === 'No Search Criteria Entered') {
        uiManagerInstance.toast(`No Search Criteria Entered`, 'critical');
      }
    }
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      method: 'uiManagerInit',
      cbName: 'findSat',
      cb: () => {
        getEl('fbl-error').addEventListener('click', function () {
          getEl('fbl-error').style.display = 'none';
        });
      },
    });
    keepTrackApi.register({
      method: 'uiManagerFinal',
      cbName: 'findSat',
      cb: this.uiManagerFinal.bind(this),
    });
  }

  static PLUGIN_NAME: string = 'findSat';
  constructor() {
    super(FindSatPlugin.PLUGIN_NAME);
  }

  public printLastResults() {
    errorManagerInstance.info(this.lastResults.map((sat) => sat.name).join('\n'));
  }

  public uiManagerFinal() {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

    getEl('findByLooks-form').addEventListener('submit', (e: Event) => {
      e.preventDefault();
      showLoading(() => {
        this.findByLooksSubmit();
        hideLoading();
      });
    });

    getUnique(catalogManagerInstance.satData.filter((obj: SatObject) => obj.bus).map((obj) => obj.bus))
      // Sort using lower case
      .sort((a, b) => (<string>a).toLowerCase().localeCompare((<string>b).toLowerCase()))
      .forEach((bus) => {
        getEl('fbl-bus').insertAdjacentHTML('beforeend', `<option value="${bus}">${bus}</option>`);
      });

    countryNameList.forEach((countryName: string) => {
      getEl('fbl-country').insertAdjacentHTML('beforeend', `<option value="${countryCodeList[countryName]}">${countryName}</option>`);
    });

    getUnique(catalogManagerInstance.satData.filter((obj: SatObject) => obj.shape).map((obj) => obj.shape))
      // Sort using lower case
      .sort((a, b) => (<string>a).toLowerCase().localeCompare((<string>b).toLowerCase()))
      .forEach((shape) => {
        getEl('fbl-shape').insertAdjacentHTML('beforeend', `<option value="${shape}">${shape}</option>`);
      });

    const payloadPartials = catalogManagerInstance.satData
      .filter((obj: SatObject) => obj.payload)
      .map((obj) =>
        obj.payload
          .split(' ')[0]
          .split('-')[0]
          .replace(/[^a-zA-Z]/gu, '')
      )
      .filter((obj) => obj.length >= 3);

    getUnique(payloadPartials)
      .sort((a, b) => (<string>a).toLowerCase().localeCompare((<string>b).toLowerCase()))
      .forEach((payload) => {
        if (payload === '') return;
        if (payload.length > 3) {
          getEl('fbl-payload').insertAdjacentHTML('beforeend', `<option value="${payload}">${payload}</option>`);
        }
      });
  }

  private static checkArgPe(possibles: any[], min: number, max: number) {
    return possibles.filter((possible) => possible.argPe * RAD2DEG < max && possible.argPe * RAD2DEG > min);
  }

  private static checkInc(possibles: any[], min: number, max: number) {
    return possibles.filter((possible) => possible.inclination * RAD2DEG < max && possible.inclination * RAD2DEG > min);
  }

  private static checkPeriod(possibles: any[], minPeriod: number, maxPeriod: number) {
    return possibles.filter((possible) => possible.period > minPeriod && possible.period < maxPeriod);
  }

  private static checkRaan(possibles: any[], min: number, max: number) {
    return possibles.filter((possible) => possible.raan * RAD2DEG < max && possible.raan * RAD2DEG > min);
  }

  private static checkRcs(possibles: any[], minRcs: number, maxRcs: number) {
    return possibles.filter((possible) => parseFloat(possible.R) > minRcs && parseFloat(possible.R) < maxRcs);
  }
}

export const findSatPlugin = new FindSatPlugin();
