import { GetSatType, KeepTrackApiEvents } from '@app/interfaces';
import { getEl } from '@app/lib/get-el';
import { getUnique } from '@app/lib/get-unique';
import { hideLoading, showLoading } from '@app/lib/showLoading';
import { errorManagerInstance } from '@app/singletons/errorManager';
import findSatPng from '@public/img/icons/find2.png';

import { countryCodeList, countryMapList, countryNameList } from '@app/catalogs/countries';
import { BaseObject, Degrees, DetailedSatellite, Kilometers, Minutes, eci2rae } from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';

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
  raan: Degrees;
  raanMarg: Degrees;
  rcs: number;
  rcsMarg: number;
  rng: Kilometers;
  rngMarg: Kilometers;
  shape: string;
}

export class FindSatPlugin extends KeepTrackPlugin {
  private lastResults = <DetailedSatellite[]>[];

  dragOptions: clickDragOptions = {
    isDraggable: true,
    minWidth: 500,
    maxWidth: 700,
  };

  public static checkAz(posAll: DetailedSatellite[], min: number, max: number) {
    return posAll.filter((pos) => {
      if (!pos.isSatellite() && !pos.isMissile()) return false;

      const rae = eci2rae(
        keepTrackApi.getTimeManager().simulationTimeObj,
        keepTrackApi.getCatalogManager().getSat(pos.id, GetSatType.POSITION_ONLY).position,
        keepTrackApi.getSensorManager().currentSensors[0]
      );
      return rae.az >= min && rae.az <= max;
    });
  }

  public static checkEl(posAll: DetailedSatellite[], min: number, max: number) {
    return posAll.filter((pos) => {
      if (!pos.isSatellite() && !pos.isMissile()) return false;

      const rae = eci2rae(
        keepTrackApi.getTimeManager().simulationTimeObj,
        keepTrackApi.getCatalogManager().getSat(pos.id, GetSatType.POSITION_ONLY).position,
        keepTrackApi.getSensorManager().currentSensors[0]
      );
      return rae.el >= min && rae.el <= max;
    });
  }

  public static checkInview(posAll: DetailedSatellite[]) {
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    return posAll.filter((pos) => dotsManagerInstance.inViewData[pos.id] === 1);
  }

  public static checkObjtype(posAll: DetailedSatellite[], objtype: number) {
    return posAll.filter((pos) => pos.type === objtype);
  }

  public static checkRange(posAll: DetailedSatellite[], min: number, max: number) {
    return posAll.filter((pos) => {
      if (!pos.isSatellite() && !pos.isMissile()) return false;

      const rae = eci2rae(
        keepTrackApi.getTimeManager().simulationTimeObj,
        keepTrackApi.getCatalogManager().getSat(pos.id, GetSatType.POSITION_ONLY).position,
        keepTrackApi.getSensorManager().currentSensors[0]
      );
      return rae.rng >= min && rae.rng <= max;
    });
  }

  public static limitPossibles(possibles: DetailedSatellite[], limit: number): DetailedSatellite[] {
    const uiManagerInstance = keepTrackApi.getUiManager();
    if (possibles.length >= limit) uiManagerInstance.toast(`Too many results, limited to ${limit}`, 'serious');
    possibles = possibles.slice(0, limit);
    return possibles;
  }

  public static searchSats(searchParams: SearchSatParams): DetailedSatellite[] {
    let {
      az,
      el,
      rng,
      countryCode,
      inc,
      azMarg,
      elMarg,
      rngMarg,
      incMarg,
      period,
      periodMarg,
      rcs,
      rcsMarg,
      objType,
      raan: rightAscension,
      raanMarg: rightAscensionMarg,
      argPe,
      argPeMarg,
      bus,
      shape,
      payload,
    } = searchParams;

    const isValidAz = !isNaN(az) && isFinite(az);
    const isValidEl = !isNaN(el) && isFinite(el);
    const isValidRange = !isNaN(rng) && isFinite(rng);
    const isValidInc = !isNaN(inc) && isFinite(inc);
    const isValidRaan = !isNaN(rightAscension) && isFinite(rightAscension);
    const isValidArgPe = !isNaN(argPe) && isFinite(argPe);
    const isValidPeriod = !isNaN(period) && isFinite(period);
    const isValidRcs = !isNaN(rcs) && isFinite(rcs);
    const isSpecificCountry = countryCode !== 'All';
    const isSpecificBus = bus !== 'All';
    const isSpecificShape = shape !== 'All';
    const isSpecificPayload = payload !== 'All';
    azMarg = !isNaN(azMarg) && isFinite(azMarg) ? azMarg : (5 as Degrees);
    elMarg = !isNaN(elMarg) && isFinite(elMarg) ? elMarg : (5 as Degrees);
    rngMarg = !isNaN(rngMarg) && isFinite(rngMarg) ? rngMarg : (200 as Kilometers);
    incMarg = !isNaN(incMarg) && isFinite(incMarg) ? incMarg : (1 as Degrees);
    periodMarg = !isNaN(periodMarg) && isFinite(periodMarg) ? periodMarg : (0.5 as Minutes);
    rcsMarg = !isNaN(rcsMarg) && isFinite(rcsMarg) ? rcsMarg : rcs / 10;
    rightAscensionMarg = !isNaN(rightAscensionMarg) && isFinite(rightAscensionMarg) ? rightAscensionMarg : (1 as Degrees);
    argPeMarg = !isNaN(argPeMarg) && isFinite(argPeMarg) ? argPeMarg : (1 as Degrees);

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

    let res = keepTrackApi.getCatalogManager().getSats();

    res = !isValidInc && !isValidPeriod && (isValidAz || isValidEl || isValidRange) ? FindSatPlugin.checkInview(res) : res;

    res = objType !== 0 ? FindSatPlugin.checkObjtype(res, objType) : res;

    if (isValidAz) res = FindSatPlugin.checkAz(res, az - azMarg, az + azMarg);
    if (isValidEl) res = FindSatPlugin.checkEl(res, el - elMarg, el + elMarg);
    if (isValidRange) res = FindSatPlugin.checkRange(res, rng - rngMarg, rng + rngMarg);
    if (isValidInc) res = FindSatPlugin.checkInc(res, (inc - incMarg) as Degrees, (inc + incMarg) as Degrees);
    if (isValidRaan) res = FindSatPlugin.checkRightAscension(res, (rightAscension - rightAscensionMarg) as Degrees, (rightAscension + rightAscensionMarg) as Degrees);
    if (isValidArgPe) res = FindSatPlugin.checkArgPe(res, (argPe - argPeMarg) as Degrees, (argPe + argPeMarg) as Degrees);
    if (isValidPeriod) res = FindSatPlugin.checkPeriod(res, (period - periodMarg) as Minutes, (period + periodMarg) as Minutes);
    if (isValidRcs) res = FindSatPlugin.checkRcs(res, rcs - rcsMarg, rcs + rcsMarg);
    if (countryCode !== 'All') {
      let country = countryCode.split('|').map((code) => countryMapList[code]);
      // Remove duplicates and undefined
      country = country.filter((item, index) => item && country.indexOf(item) === index);
      res = res.filter((obj: BaseObject) => country.includes((obj as DetailedSatellite).country));
    }
    if (bus !== 'All') res = res.filter((obj: BaseObject) => (obj as DetailedSatellite).bus === bus);
    if (shape !== 'All') res = res.filter((obj: BaseObject) => (obj as DetailedSatellite).shape === shape);

    if (payload !== 'All') {
      res = res.filter(
        (obj: BaseObject) =>
          (obj as DetailedSatellite).payload
            ?.split(' ')[0]
            ?.split('-')[0]
            ?.replace(/[^a-zA-Z]/gu, '') === payload
      );
    }

    res = FindSatPlugin.limitPossibles(res, settingsManager.searchLimit);

    let result = '';
    res.forEach((obj: BaseObject, i: number) => {
      result += i < res.length - 1 ? `${(obj as DetailedSatellite).sccNum},` : `${(obj as DetailedSatellite).sccNum}`;
    });

    (<HTMLInputElement>getEl('search')).value = result;
    const uiManagerInstance = keepTrackApi.getUiManager();
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
    const uiManagerInstance = keepTrackApi.getUiManager();

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
      this.lastResults = FindSatPlugin.searchSats(searchParams as SearchSatParams);
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
      event: KeepTrackApiEvents.uiManagerInit,
      cbName: 'findSat',
      cb: () => {
        getEl('fbl-error').addEventListener('click', function () {
          getEl('fbl-error').style.display = 'none';
        });
      },
    });
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
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
    const satData = keepTrackApi.getCatalogManager().objectCache;

    getEl('findByLooks-form').addEventListener('submit', (e: Event) => {
      e.preventDefault();
      showLoading(() => {
        this.findByLooksSubmit();
        hideLoading();
      });
    });

    getUnique(satData.filter((obj: BaseObject) => (obj as DetailedSatellite)?.bus).map((obj) => (obj as DetailedSatellite).bus))
      // Sort using lower case
      .sort((a, b) => (<string>a).toLowerCase().localeCompare((<string>b).toLowerCase()))
      .forEach((bus) => {
        getEl('fbl-bus').insertAdjacentHTML('beforeend', `<option value="${bus}">${bus}</option>`);
      });

    countryNameList.forEach((countryName: string) => {
      getEl('fbl-country').insertAdjacentHTML('beforeend', `<option value="${countryCodeList[countryName]}">${countryName}</option>`);
    });

    getUnique(satData.filter((obj: BaseObject) => (obj as DetailedSatellite)?.shape).map((obj) => (obj as DetailedSatellite).shape))
      // Sort using lower case
      .sort((a, b) => (<string>a).toLowerCase().localeCompare((<string>b).toLowerCase()))
      .forEach((shape) => {
        getEl('fbl-shape').insertAdjacentHTML('beforeend', `<option value="${shape}">${shape}</option>`);
      });

    const payloadPartials = satData
      .filter((obj: BaseObject) => (obj as DetailedSatellite)?.payload)
      .map((obj) =>
        (obj as DetailedSatellite).payload
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

  private static checkArgPe(possibles: DetailedSatellite[], min: Degrees, max: Degrees) {
    return possibles.filter((possible) => possible.argOfPerigee < max && possible.argOfPerigee > min);
  }

  private static checkInc(possibles: DetailedSatellite[], min: Degrees, max: Degrees) {
    return possibles.filter((possible) => possible.inclination < max && possible.inclination > min);
  }

  private static checkPeriod(possibles: DetailedSatellite[], minPeriod: Minutes, maxPeriod: Minutes) {
    return possibles.filter((possible) => possible.period > minPeriod && possible.period < maxPeriod);
  }

  private static checkRightAscension(possibles: DetailedSatellite[], min: Degrees, max: Degrees) {
    return possibles.filter((possible) => possible.rightAscension < max && possible.rightAscension > min);
  }

  private static checkRcs(possibles: DetailedSatellite[], minRcs: number, maxRcs: number) {
    return possibles.filter((possible) => possible.rcs > minRcs && possible.rcs < maxRcs);
  }
}
