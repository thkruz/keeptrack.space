
import editPng from '@public/img/icons/edit.png';
import { DetailedSatellite, DetailedSatelliteParams, EciVec3, FormatTle, SatelliteRecord, Sgp4 } from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

import { GetSatType, KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { getEl } from '@app/lib/get-el';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { SatMath, StringifiedNumber } from '@app/static/sat-math';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { saveAs } from 'file-saver';
import i18next from 'i18next';


export class CreateSat extends KeepTrackPlugin {
  readonly id = 'CreateSat';
  dependencies_ = [SelectSatManager.name];


  constructor() {
    super();
  }

  isRequireSatelliteSelected = false;
  isIconDisabledOnLoad = false;
  isIconDisabled = false;

  static readonly elementPrefix = 'cs';

  bottomIconImg = editPng;

  sideMenuElementName = 'createSat-menu';
  sideMenuElementHtml = keepTrackApi.html`
    <div id="createSat-menu" class="side-menu-parent start-hidden text-select">
      <div id="createSat-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Create Satellite</h5>
          <form id="createSat">
            <div class="input-field col s12">
              <input value="AAAAA" id="${CreateSat.elementPrefix}-scc" type="text" maxlength="5" />
              <label for="${CreateSat.elementPrefix}-scc" class="active">Satellite SCC#</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="Unknown" id="${CreateSat.elementPrefix}-country" type="text" />
              <label for="${CreateSat.elementPrefix}-country" class="active">Country</label>
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
              <input placeholder="" id="${CreateSat.elementPrefix}-per" type="text" maxlength="11" />
              <label for="${CreateSat.elementPrefix}-per" class="active">Period</label>
            </div>
            <div class="input-field col s13">
              <input placeholder="" id="${CreateSat.elementPrefix}-src" type="text" maxlength="11" />
              <label for="${CreateSat.elementPrefix}-src" class="active">Data source</label>
            </div>
            <div class="input-field col s14">
              <input placeholder="" id="${CreateSat.elementPrefix}-name" type="text" maxlength="11" />
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

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: 'createSat',
      cb: () => {

        getEl(`${CreateSat.elementPrefix}-per`).addEventListener('change', () => {
          const per = (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-per`)).value;

          if (per === '') {
            return;
          }
          const meanmo = 1440 / parseFloat(per);

          (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-meanmo`)).value = meanmo.toFixed(8);
        });

        getEl(`${CreateSat.elementPrefix}-meanmo`).addEventListener('change', () => {
          const meanmo = (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-meanmo`)).value;

          if (meanmo === '') {
            return;
          }
          const per = (1440 / parseFloat(meanmo)).toFixed(8);

          (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-per`)).value = per;
        });

        getEl('createSat-submit').addEventListener('click', () => {
          CreateSat.createSatSubmit();
        });

        getEl('createSat-save').addEventListener('click', CreateSat.exportTLE);

        this.populateSideMenu_();
      },
    });
  }

  private populateSideMenu_() {

    (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-scc`)).value = '90000';
    (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-country`)).value = 'France';

    const defaultInc = 0;
    const inc = defaultInc.toFixed(4).padStart(8, '0');

    const date = new Date(keepTrackApi.getTimeManager().simulationTimeObj);

    const year = date.getFullYear().toString().slice(2, 4);
    const day = this.getUTCDayOfYear(date).toString();

    (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-inc`)).value = inc;
    (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-year`)).value = year;
    (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-day`)).value = day;


    const defalutRasc = 0;
    const rasc = defalutRasc.toFixed(1);

    const defaultEcc = 0;
    const ecc = defaultEcc.toFixed(1);

    const defaultMa = 0;
    const ma = defaultMa.toFixed(1);

    (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-rasc`)).value = rasc;
    (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-ecen`)).value = ecc;
    (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-meana`)).value = ma;

    const defaultArgPe = 0;
    const argPe = defaultArgPe.toFixed(1);

    (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-argPe`)).value = argPe;

    const defaultSouce = 'Trust me Bro';
    const defaultName = 'New Satellite';

    (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-src`)).value = defaultSouce;
    (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-name`)).value = defaultName;
  }

  private static createSatSubmit() {

    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    getEl(`${CreateSat.elementPrefix}-error`).style.display = 'none';
    // const scc = '90000'
    const scc = (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-scc`)).value;

    const satId = catalogManagerInstance.sccNum2Id(parseInt(scc));
    const orbitManagerInstance = keepTrackApi.getOrbitManager();

    const obj = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY);

    if (!obj.isSatellite()) {
      return;
    }

    const sat = obj as DetailedSatellite;
    const country = (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-country`)).value;
    const inc = <StringifiedNumber>(<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-inc`)).value;
    const meanmo = <StringifiedNumber>(<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-meanmo`)).value;
    const rasc = <StringifiedNumber>(<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-rasc`)).value;
    const ecen = (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-ecen`)).value;
    const argPe = <StringifiedNumber>(<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-argPe`)).value;
    const meana = <StringifiedNumber>(<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-meana`)).value;
    const epochyr = (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-year`)).value;
    const epochday = (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-day`)).value;
    const source = (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-src`)).value;
    const name = (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-name`)).value;
    const intl = `${epochyr}69B`;

    const { tle1: tle1_, tle2: tle2_ } = FormatTle.createTle({ sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc });
    const tle1 = tle1_;
    const tle2 = tle2_;

    let satrec: SatelliteRecord;

    try {
      satrec = Sgp4.createSatrec(tle1, tle2);
    } catch (e) {
      errorManagerInstance.error(e, 'edit-sat.ts', 'Error creating satellite record!');

      return;
    }

    if (SatMath.altitudeCheck(satrec, keepTrackApi.getTimeManager().simulationTimeObj) > 1) {

      if (tle1 === 'Error') {
        errorManagerInstance.error(new Error(tle2), 'create-sat.ts', i18next.t('errorMsgs.Breakup.ErrorCreatingBreakup'));

        return;
      }

      const spg4vec = Sgp4.propagate(satrec, 0);
      const pos = spg4vec.position as EciVec3;
      const vel = spg4vec.velocity as EciVec3;

      const info: DetailedSatelliteParams = {
        id: satId,
        country,
        tle1,
        tle2,
        name,
      };

      // const newSat = new DetailedSatellite(info);

      const newSat = new DetailedSatellite({
        ...info,
        ...{
          position: pos,
          velocity: vel,
          source,
        },
      });

      console.log(newSat);

      catalogManagerInstance.objectCache[satId] = newSat;

      try {
        catalogManagerInstance.satCruncher.postMessage({
          typ: CruncerMessageTypes.SAT_EDIT,
          active: true,
          id: satId,
          tle1,
          tle2,
        });
      } catch (e) {
        errorManagerInstance.error(e, 'create-sat.ts', 'Sat Cruncher message failed');
      }

      try {
        orbitManagerInstance.changeOrbitBufferData(satId, tle1, tle2);
      } catch (e) {
        errorManagerInstance.error(e, 'create-sat.ts', 'Changing orbit buffer data failed');
      }

      keepTrackApi.getUiManager().doSearch(`${scc}`);
    } else {
      keepTrackApi.getUiManager().toast('Failed to propagate satellite. Try different parameters or if you are confident they are correct report this issue.', ToastMsgType.caution, true);
    }
  }

  private static exportTLE(e: Event) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    try {
      const scc = (<HTMLInputElement>getEl(`${CreateSat.elementPrefix}-scc`)).value;
      const satId = catalogManagerInstance.sccNum2Id(parseInt(scc));
      const sat = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY) as DetailedSatellite;
      const sat2 = {
        tle1: sat.tle1,
        tle2: sat.tle2,
      };
      const variable = JSON.stringify(sat2);
      const blob = new Blob([variable], {
        type: 'text/plain;charset=utf-8',
      });

      saveAs(blob, `${scc}.tle`);
    } catch (error) {
      // intentionally left blank
    }
    e.preventDefault();
  }

  private isLeapYear(date: Date): boolean {
    const year = date.getUTCFullYear();

    if ((year & 3) !== 0) {
      return false;
    }

    return year % 100 !== 0 || year % 400 === 0;
  }

  private getUTCDayOfYear(doy: Date) {
    const mn = doy.getUTCMonth();
    const dn = doy.getUTCDate();
    const dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let dayInYear = 365;
    let dayOfYear = dayCount[mn] + dn;

    if (mn > 1 && this.isLeapYear(doy)) {
      dayOfYear++;
      dayInYear++;
    }

    return dayOfYear % dayInYear;
  }


}
