/* eslint-disable prefer-const */
/* eslint-disable complexity */
import { CatalogExporter } from '@app/app/data/catalog-exporter';
import { countryCodeList, countryNameList } from '@app/app/data/catalogs/countries';
import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { getUnique } from '@app/engine/utils/get-unique';
import { hideLoading, showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { BaseObject, Degrees, Hours, Kilometers, Minutes, Satellite, eci2rae } from '@ootk/src/main';
import findSatPng from '@public/img/icons/database-search.png';

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

export class FindSatPlugin extends KeepTrackPlugin {
  readonly id = 'FindSatPlugin';
  private lastResults_ = <Satellite[]>[];
  private hasSearchBeenRun_ = false;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'find-satellite-bottom-icon',
      label: 'Find Satellite',
      image: findSatPng,
      menuMode: [MenuMode.ADVANCED, MenuMode.ALL],
    };
  }


  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'findByLooks-menu',
      title: 'Find Satellite',
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 500,
      maxWidth: 700,
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.FindSatPlugin.title'),
      body: t7e('plugins.FindSatPlugin.helpBody'),
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'F',
        ctrl: true,
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  onDownload(): void {
    if (!this.hasSearchBeenRun_) {
      errorManagerInstance.warn(t7e('plugins.FindSatPlugin.errorMsgs.TryFindingFirst'));

      return;
    }
    CatalogExporter.exportTle2Csv(this.lastResults_);
  }

  private buildSideMenuHtml_(): string {
    const l = (key: string) => t7e(`plugins.FindSatPlugin.labels.${key}` as Parameters<typeof t7e>[0]);

    return html`
      <div id="findByLooks-menu" class="side-menu-parent start-hidden text-select">
        <div id="findByLooks-content" class="side-menu">
          <div class="row">
            <h5 class="center-align">${t7e('plugins.FindSatPlugin.title')}</h5>
            <form id="findByLooks-menu-form">
              <div class="row">
                <div class="input-field col s12">
                  <select value=0 id="fbl-type" type="text">
                    <option value=0>${l('all')}</option>
                    <option value=1>Payload</option>
                    <option value=2>Rocket Body</option>
                    <option value=3>Debris</option>
                  </select>
                  <label for="disabled">${l('objectType')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12">
                  <select value=0 id="fbl-country" type="text">
                    <option value='All'>${l('all')}</option>
                  </select>
                  <label for="disabled">${l('country')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12">
                  <select value=0 id="fbl-bus" type="text">
                    <option value='All'>${l('all')}</option>
                  </select>
                  <label for="disabled">${l('satelliteBus')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12">
                  <select value=0 id="fbl-payload" type="text">
                    <option value='All'>${l('all')}</option>
                  </select>
                  <label for="disabled">${l('payload')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12">
                  <select value=0 id="fbl-shape" type="text">
                    <option value='All'>${l('all')}</option>
                  </select>
                  <label for="disabled">${l('shape')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12">
                  <select value=0 id="fbl-source" type="text">
                    <option value='All'>${l('all')}</option>
                  </select>
                  <label for="disabled">${l('source')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12 m6 l6">
                  <input placeholder="xxx.x" id="fbl-azimuth" type="text">
                  <label for="fbl-azimuth" class="active">${l('azimuth')}</label>
                </div>
                <div class="input-field col s12 m6 l6">
                  <input placeholder="5" id="fbl-azimuth-margin" type="text">
                  <label for="fbl-azimuth-margin" class="active">${l('azimuthMargin')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12 m6 l6">
                  <input placeholder="XX.X" id="fbl-elevation" type="text">
                  <label for="fbl-elevation" class="active">${l('elevation')}</label>
                </div>
                <div class="input-field col s12 m6 l6">
                  <input placeholder="5" id="fbl-elevation-margin" type="text">
                  <label for="fbl-elevation-margin" class="active">${l('elevationMargin')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12 m6 l6">
                  <input placeholder="xxxx.x" id="fbl-range" type="text">
                  <label for="fbl-range" class="active">${l('range')}</label>
                </div>
                <div class="input-field col s12 m6 l6">
                  <input placeholder="500" id="fbl-range-margin" type="text">
                  <label for="fbl-range-margin" class="active">${l('rangeMargin')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12 m6 l6">
                  <input placeholder="XX.X" id="fbl-inc" type="text">
                  <label for="fbl-inc" class="active">${l('inclination')}</label>
                </div>
                <div class="input-field col s12 m6 l6">
                  <input value="0.5" placeholder="0.5" id="fbl-inc-margin" type="text">
                  <label for="fbl-inc-margin" class="active">${l('inclinationMargin')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12 m6 l6">
                  <input placeholder="XX.X" id="fbl-period" type="text">
                  <label for="fbl-period" class="active">${l('period')}</label>
                </div>
                <div class="input-field col s12 m6 l6">
                  <input value="10" placeholder="10" id="fbl-period-margin" type="text">
                  <label for="fbl-period-margin" class="active">${l('periodMargin')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12 m6 l6">
                  <input placeholder="XX.X" id="fbl-tleAge" type="text">
                  <label for="fbl-tleAge" class="active">${l('tleAge')}</label>
                </div>
                <div class="input-field col s12 m6 l6">
                  <input value="1" placeholder="1" id="fbl-tleAge-margin" type="text">
                  <label for="fbl-tleAge-margin" class="active">${l('tleAgeMargin')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12 m6 l6">
                  <input placeholder="XX.X" id="fbl-rcs" type="text">
                  <label for="fbl-rcs" class="active">${l('rcs')}</label>
                </div>
                <div class="input-field col s12 m6 l6">
                  <input value="10" placeholder="10" id="fbl-rcs-margin" type="text">
                  <label for="fbl-rcs-margin" class="active">${l('rcsMargin')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12 m6 l6">
                  <input placeholder="XX.X" id="fbl-raan" type="text">
                  <label for="fbl-raan" class="active">${l('rightAscension')}</label>
                </div>
                <div class="input-field col s12 m6 l6">
                  <input value="0.5" placeholder="0.5" id="fbl-raan-margin" type="text">
                  <label for="fbl-raan-margin" class="active">${l('rightAscensionMargin')}</label>
                </div>
              </div>
              <div class="row">
                <div class="input-field col s12 m6 l6">
                  <input placeholder="XX.X" id="fbl-argPe" type="text">
                  <label for="fbl-argPe" class="active">${l('argOfPerigee')}</label>
                </div>
                <div class="input-field col s12 m6 l6">
                  <input value="0.5" placeholder="0.5" id="fbl-argPe-margin" type="text">
                  <label for="fbl-argPe-margin" class="active">${l('argOfPerigeeMargin')}</label>
                </div>
              </div>
              <div class="row">
                <center>
                  <button id="findByLooks-submit" class="btn btn-ui waves-effect waves-light" type="submit"
                    name="action">${l('findSatellites')} &#9658;
                  </button>
                </center>
              </div>
              <div class="row">
                <center>
                  <button id="findByLooks-export" class="btn btn-ui waves-effect waves-light" type="button"
                    name="action">${l('exportData')} &#9658;
                  </button>
                </center>
              </div>
            </form>
            <div class="row center-align" style="margin-top:20px;">
              <span id="fbl-error" class="menu-selectable"></span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  printLastResults() {
    errorManagerInstance.info(this.lastResults_.map((sat) => sat.name).join('\n'));
  }

  private uiManagerFinal_() {
    const satData = ServiceLocator.getCatalogManager().objectCache;

    getEl('fbl-error')!.addEventListener('click', () => {
      getEl('fbl-error')!.style.display = 'none';
    });

    getEl('findByLooks-menu-form')!.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      showLoading(() => {
        this.findByLooksSubmit_().then(() => {
          hideLoading();
        });
      });
    });

    getUnique(satData.filter((obj: BaseObject) => (obj as Satellite)?.bus).map((obj) => (obj as Satellite).bus))
      // Sort using lower case
      .sort((a, b) => (a).toLowerCase().localeCompare((b).toLowerCase()))
      .forEach((bus) => {
        getEl('fbl-bus')!.insertAdjacentHTML('beforeend', `<option value="${bus}">${bus}</option>`);
      });

    countryNameList.forEach((countryName: string) => {
      getEl('fbl-country')!.insertAdjacentHTML('beforeend', `<option value="${countryCodeList[countryName]}">${countryName}</option>`);
    });

    getUnique(satData.filter((obj: BaseObject) => (obj as Satellite)?.shape).map((obj) => (obj as Satellite).shape))
      // Sort using lower case
      .sort((a, b) => (a).toLowerCase().localeCompare((b).toLowerCase()))
      .forEach((shape) => {
        getEl('fbl-shape')!.insertAdjacentHTML('beforeend', `<option value="${shape}">${shape}</option>`);
      });

    getUnique(satData.filter((obj: BaseObject) => (obj as Satellite)?.source).map((obj) => (obj as Satellite).source))
      // Sort using lower case
      .sort((a, b) => (a).toLowerCase().localeCompare((b).toLowerCase()))
      .forEach((source) => {
        getEl('fbl-source')!.insertAdjacentHTML('beforeend', `<option value="${source}">${source}</option>`);
      });
    const payloadPartials = satData
      .filter((obj: BaseObject) => (obj as Satellite)?.payload)
      .map((obj) =>
        (obj as Satellite).payload
          .split(' ')[0]
          .split('-')[0]
          .replace(/[^a-zA-Z]/gu, ''),
      )
      .filter((obj) => obj.length >= 3);

    getUnique(payloadPartials)
      .sort((a, b) => (a).toLowerCase().localeCompare((b).toLowerCase()))
      .forEach((payload) => {
        if (payload === '') {
          return;
        }
        if (payload.length > 3) {
          getEl('fbl-payload')!.insertAdjacentHTML('beforeend', `<option value="${payload}">${payload}</option>`);
        }
      });

    // Export data
    getEl('findByLooks-export')?.addEventListener('click', () => {
      this.onDownload();
    });
  }

  private findByLooksSubmit_(): Promise<void> {
    this.hasSearchBeenRun_ = true;

    return new Promise(() => {
      const uiManagerInstance = ServiceLocator.getUiManager();

      const az = parseFloat((<HTMLInputElement>getEl('fbl-azimuth')).value);
      const el = parseFloat((<HTMLInputElement>getEl('fbl-elevation')).value);
      const rng = parseFloat((<HTMLInputElement>getEl('fbl-range')).value);
      const inc = parseFloat((<HTMLInputElement>getEl('fbl-inc')).value);
      const period = parseFloat((<HTMLInputElement>getEl('fbl-period')).value);
      const tleAge = parseFloat((<HTMLInputElement>getEl('fbl-tleAge')).value);
      const rcs = parseFloat((<HTMLInputElement>getEl('fbl-rcs')).value);
      const azMarg = parseFloat((<HTMLInputElement>getEl('fbl-azimuth-margin')).value);
      const elMarg = parseFloat((<HTMLInputElement>getEl('fbl-elevation-margin')).value);
      const rngMarg = parseFloat((<HTMLInputElement>getEl('fbl-range-margin')).value);
      const incMarg = parseFloat((<HTMLInputElement>getEl('fbl-inc-margin')).value);
      const periodMarg = parseFloat((<HTMLInputElement>getEl('fbl-period-margin')).value);
      const tleAgeMarg = parseFloat((<HTMLInputElement>getEl('fbl-tleAge-margin')).value);
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
      const source = (<HTMLInputElement>getEl('fbl-source')).value;

      (<HTMLInputElement>getEl('search')).value = ''; // Reset the search first
      try {
        const searchParams = {
          az,
          el,
          rng,
          inc,
          azMarg,
          elMarg,
          rngMarg,
          incMarg,
          period,
          periodMarg,
          tleAge,
          tleAgeMarg,
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
          source,
        };

        this.lastResults_ = FindSatPlugin.searchSats_(searchParams as SearchSatParams);
        if (this.lastResults_.length === 0) {
          uiManagerInstance.toast(t7e('plugins.FindSatPlugin.errorMsgs.NoSatellitesFound'), ToastMsgType.critical);
        }
      } catch (e) {
        if (e.message === 'No Search Criteria Entered') {
          uiManagerInstance.toast(t7e('plugins.FindSatPlugin.errorMsgs.NoSearchCriteriaEntered'), ToastMsgType.critical);
        }
      }
    });
  }

  private static checkAz_(posAll: Satellite[], min: number, max: number) {
    return posAll.filter((pos) => {
      if (!pos.isSatellite() && !pos.isMissile()) {
        return false;
      }

      const currentSatellite = ServiceLocator.getCatalogManager().getSat(pos.id, GetSatType.POSITION_ONLY);

      if (!currentSatellite) {
        return false;
      }

      const rae = eci2rae(
        ServiceLocator.getTimeManager().simulationTimeObj,
        currentSatellite.position,
        ServiceLocator.getSensorManager().currentSensors[0],
      );


      return rae.az >= min && rae.az <= max;
    });
  }

  private static checkEl_(posAll: Satellite[], min: number, max: number) {
    return posAll.filter((pos) => {
      if (!pos.isSatellite() && !pos.isMissile()) {
        return false;
      }

      const currentSatellite = ServiceLocator.getCatalogManager().getSat(pos.id, GetSatType.POSITION_ONLY);

      if (!currentSatellite) {
        return false;
      }

      const rae = eci2rae(
        ServiceLocator.getTimeManager().simulationTimeObj,
        currentSatellite.position,
        ServiceLocator.getSensorManager().currentSensors[0],
      );


      return rae.el >= min && rae.el <= max;
    });
  }

  private static checkInview_(posAll: Satellite[]) {
    const dotsManagerInstance = ServiceLocator.getDotsManager();


    return posAll.filter((pos) => dotsManagerInstance.inViewData[pos.id] === 1);
  }

  private static checkObjtype_(posAll: Satellite[], objtype: number) {
    return posAll.filter((pos) => pos.type === objtype);
  }

  private static checkRange_(posAll: Satellite[], min: number, max: number) {
    return posAll.filter((pos) => {
      if (!pos.isSatellite() && !pos.isMissile()) {
        return false;
      }

      const currentSatellite = ServiceLocator.getCatalogManager().getSat(pos.id, GetSatType.POSITION_ONLY);

      if (!currentSatellite) {
        return false;
      }

      const rae = eci2rae(
        ServiceLocator.getTimeManager().simulationTimeObj,
        currentSatellite.position,
        ServiceLocator.getSensorManager().currentSensors[0],
      );


      return rae.rng >= min && rae.rng <= max;
    });
  }

  private static limitPossibles_(possibles: Satellite[], limit: number): Satellite[] {
    const uiManagerInstance = ServiceLocator.getUiManager();

    if (possibles.length >= limit) {
      const msg = t7e('plugins.FindSatPlugin.errorMsgs.TooManyResults').replace('{limit}', limit.toString());

      uiManagerInstance.toast(msg, ToastMsgType.serious);
    }
    possibles = possibles.slice(0, limit);

    return possibles;
  }

  private static searchSats_(searchParams: SearchSatParams): Satellite[] {
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
      tleAge,
      tleAgeMarg,
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
      source,
    } = searchParams;

    const isValidAz = !isNaN(az) && isFinite(az);
    const isValidEl = !isNaN(el) && isFinite(el);
    const isValidRange = !isNaN(rng) && isFinite(rng);
    const isValidInc = !isNaN(inc) && isFinite(inc);
    const isValidRaan = !isNaN(rightAscension) && isFinite(rightAscension);
    const isValidArgPe = !isNaN(argPe) && isFinite(argPe);
    const isValidPeriod = !isNaN(period) && isFinite(period);
    const isValidTleAge = !isNaN(tleAge) && isFinite(tleAge);
    const isValidRcs = !isNaN(rcs) && isFinite(rcs);
    const isSpecificCountry = countryCode !== 'All';
    const isSpecificBus = bus !== 'All';
    const isSpecificShape = shape !== 'All';
    const isSpecificSource = source !== 'All';
    const isSpecificPayload = payload !== 'All';

    azMarg = !isNaN(azMarg) && isFinite(azMarg) ? azMarg : (5 as Degrees);
    elMarg = !isNaN(elMarg) && isFinite(elMarg) ? elMarg : (5 as Degrees);
    rngMarg = !isNaN(rngMarg) && isFinite(rngMarg) ? rngMarg : (200 as Kilometers);
    incMarg = !isNaN(incMarg) && isFinite(incMarg) ? incMarg : (1 as Degrees);
    periodMarg = !isNaN(periodMarg) && isFinite(periodMarg) ? periodMarg : (0.5 as Minutes);
    tleAgeMarg = !isNaN(tleAgeMarg) && isFinite(tleAgeMarg) ? tleAgeMarg : (1 as Hours);
    rcsMarg = !isNaN(rcsMarg) && isFinite(rcsMarg) ? rcsMarg : rcs / 10;
    rightAscensionMarg = !isNaN(rightAscensionMarg) && isFinite(rightAscensionMarg) ? rightAscensionMarg : (1 as Degrees);
    argPeMarg = !isNaN(argPeMarg) && isFinite(argPeMarg) ? argPeMarg : (1 as Degrees);

    if (
      !isValidEl &&
      !isValidRange &&
      !isValidAz &&
      !isValidInc &&
      !isValidPeriod &&
      !isValidTleAge &&
      !isValidRcs &&
      !isValidArgPe &&
      !isValidRaan &&
      !isSpecificCountry &&
      !isSpecificBus &&
      !isSpecificShape &&
      !isSpecificSource &&
      !isSpecificPayload
    ) {
      throw new Error('No Search Criteria Entered');
    }

    let res = ServiceLocator.getCatalogManager().getSats();

    res = !isValidInc && !isValidPeriod && !isValidTleAge && (isValidAz || isValidEl || isValidRange) ? FindSatPlugin.checkInview_(res) : res;

    res = objType !== 0 ? FindSatPlugin.checkObjtype_(res, objType) : res;

    if (isValidAz) {
      res = FindSatPlugin.checkAz_(res, az - azMarg, az + azMarg);
    }
    if (isValidEl) {
      res = FindSatPlugin.checkEl_(res, el - elMarg, el + elMarg);
    }
    if (isValidRange) {
      res = FindSatPlugin.checkRange_(res, rng - rngMarg, rng + rngMarg);
    }
    if (isValidInc) {
      res = FindSatPlugin.checkInc_(res, (inc - incMarg) as Degrees, (inc + incMarg) as Degrees);
    }
    if (isValidRaan) {
      res = FindSatPlugin.checkRightAscension_(res, (rightAscension - rightAscensionMarg) as Degrees, (rightAscension + rightAscensionMarg) as Degrees);
    }
    if (isValidArgPe) {
      res = FindSatPlugin.checkArgPe_(res, (argPe - argPeMarg) as Degrees, (argPe + argPeMarg) as Degrees);
    }
    if (isValidPeriod) {
      res = FindSatPlugin.checkPeriod_(res, (period - periodMarg) as Minutes, (period + periodMarg) as Minutes);
    }
    if (isValidTleAge) {
      res = FindSatPlugin.checkTleAge_(res, (tleAge - tleAgeMarg) as Hours, (tleAge + tleAgeMarg) as Hours);
    }
    if (isValidRcs) {
      res = FindSatPlugin.checkRcs_(res, rcs - rcsMarg, rcs + rcsMarg);
    }
    if (countryCode !== 'All') {
      let country = countryCode.split('|');
      // Remove duplicates and undefined

      country = country.filter((item, index) => item && country.indexOf(item) === index);
      res = res.filter((obj: BaseObject) => country.includes((obj as Satellite).country));
    }
    if (bus !== 'All') {
      res = res.filter((obj: BaseObject) => (obj as Satellite).bus === bus);
    }
    if (shape !== 'All') {
      res = res.filter((obj: BaseObject) => (obj as Satellite).shape === shape);
    }
    if (source !== 'All') {
      res = res.filter((obj: BaseObject) => (obj as Satellite).source === source);
    }

    if (payload !== 'All') {
      res = res.filter(
        (obj: BaseObject) =>
          (obj as Satellite).payload
            ?.split(' ')[0]
            ?.split('-')[0]
            ?.replace(/[^a-zA-Z]/gu, '') === payload,
      );
    }

    res = FindSatPlugin.limitPossibles_(res, settingsManager.searchLimit);

    let result = '';

    res.forEach((obj: BaseObject, i: number) => {
      result += i < res.length - 1 ? `${(obj as Satellite).sccNum},` : `${(obj as Satellite).sccNum}`;
    });

    (<HTMLInputElement>getEl('search')).value = result;
    const uiManagerInstance = ServiceLocator.getUiManager();

    uiManagerInstance.doSearch((<HTMLInputElement>getEl('search')).value);

    return res;
  }

  private static checkArgPe_(possibles: Satellite[], min: Degrees, max: Degrees) {
    return possibles.filter((possible) => possible.argOfPerigee < max && possible.argOfPerigee > min);
  }

  private static checkInc_(possibles: Satellite[], min: Degrees, max: Degrees) {
    return possibles.filter((possible) => possible.inclination < max && possible.inclination > min);
  }

  private static checkPeriod_(possibles: Satellite[], minPeriod: Minutes, maxPeriod: Minutes) {
    return possibles.filter((possible) => possible.period > minPeriod && possible.period < maxPeriod);
  }

  private static checkTleAge_(possibles: Satellite[], minTleAge_: Hours, maxTleAge: Hours) {
    const minTleAge = minTleAge_ < 0 ? 0 : minTleAge_;
    const now = new Date();

    return possibles.filter((possible) => {
      const ageHours = possible.ageOfElset(now, 'hours');


      return ageHours >= minTleAge && ageHours <= maxTleAge;
    });
  }

  private static checkRightAscension_(possibles: Satellite[], min: Degrees, max: Degrees) {
    return possibles.filter((possible) => possible.rightAscension < max && possible.rightAscension > min);
  }

  private static checkRcs_(possibles: Satellite[], minRcs: number, maxRcs: number) {
    return possibles.filter((possible) => (possible?.rcs ?? -Infinity) > minRcs && (possible?.rcs ?? Infinity) < maxRcs);
  }
}
