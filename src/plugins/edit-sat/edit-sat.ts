import { GetSatType, KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { RAD2DEG } from '@app/lib/constants';
import { getEl } from '@app/lib/get-el';
import { showLoading } from '@app/lib/showLoading';
import { StringPad } from '@app/lib/stringPad';
import { errorManagerInstance } from '@app/singletons/errorManager';
import editPng from '@public/img/icons/edit.png';
import { saveAs } from 'file-saver';

import { OrbitFinder } from '@app/singletons/orbit-finder';
import { TimeManager } from '@app/singletons/time-manager';
import { CoordinateTransforms } from '@app/static/coordinate-transforms';
import { FormatTle } from '@app/static/format-tle';
import { SatMath, StringifiedNumber } from '@app/static/sat-math';
import { SatelliteRecord, Sgp4, TleLine1 } from 'ootk';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class EditSat extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Edit Sat';
  dependencies = [SelectSatManager.PLUGIN_NAME];
  private selectSatManager_: SelectSatManager;

  constructor() {
    super(EditSat.PLUGIN_NAME);
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
  }

  isRequireSatelliteSelected = true;
  isIconDisabled = true;
  isIconDisabledOnLoad = true;

  helpTitle = `Edit Satellite Menu`;
  helpBody = keepTrackApi.html`The Edit Satellite Menu is used to edit the satellite data.
    <br><br>
    <ul>
       <li>
           Satellite SCC# - A unique number assigned to each satellite by the US Space Force.
       </li>
         <li>
            Epoch Year - The year of the satellite's last orbital update.
        </li>
        <li>
            Epoch Day - The day of the year of the satellite's last orbital update.
        </li>
        <li>
            Inclination - The angle between the satellite's orbital plane and the equatorial plane.
        </li>
        <li>
            Right Ascension - The angle between the ascending node and the satellite's position at the time of the last orbital update.
        </li>
        <li>
            Eccentricity - The amount by which the satellite's orbit deviates from a perfect circle.
        </li>
        <li>
            Argument of Perigee - The angle between the ascending node and the satellite's closest point to the earth.
        </li>
        <li>
            Mean Anomaly - The angle between the satellite's position at the time of the last orbital update and the satellite's closest point to the earth.
        </li>
        <li>
            Mean Motion - The rate at which the satellite's mean anomaly changes.
        </li>
    </ul>`;

  sideMenuElementName = 'editSat-menu';
  sideMenuElementHtml = keepTrackApi.html`
    <div id="editSat-menu" class="side-menu-parent start-hidden text-select">
      <div id="editSat-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Edit Satellite</h5>
          <form id="editSat">
            <div class="input-field col s12">
              <input disabled value="AAAAA" id="${EditSat.elementPrefix}-scc" type="text" maxlength="5" />
              <label for="disabled" class="active">Satellite SCC#</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA" id="${EditSat.elementPrefix}-year" type="text" maxlength="2" />
              <label for="${EditSat.elementPrefix}-year" class="active">Epoch Year</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAAAAAA" id="${EditSat.elementPrefix}-day" type="text" maxlength="12" />
              <label for="${EditSat.elementPrefix}-day" class="active">Epoch Day</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="${EditSat.elementPrefix}-inc" type="text" maxlength="8" />
              <label for="${EditSat.elementPrefix}-inc" class="active">Inclination</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="${EditSat.elementPrefix}-rasc" type="text" maxlength="8" />
              <label for="${EditSat.elementPrefix}-rasc" class="active">Right Ascension</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA.AAAAAAAA" id="${EditSat.elementPrefix}-ecen" type="text" maxlength="7" />
              <label for="${EditSat.elementPrefix}-ecen" class="active">Eccentricity</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA.AAAAAAAA" id="${EditSat.elementPrefix}-argPe" type="text" maxlength="8" />
              <label for="${EditSat.elementPrefix}-argPe" class="active">Argument of Perigee</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="${EditSat.elementPrefix}-meana" type="text" maxlength="8" />
              <label for="${EditSat.elementPrefix}-meana" class="active">Mean Anomaly</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="${EditSat.elementPrefix}-meanmo" type="text" maxlength="11" />
              <label for="${EditSat.elementPrefix}-meanmo" class="active">Mean Motion</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="" id="${EditSat.elementPrefix}-per" type="text" maxlength="11" />
              <label for="${EditSat.elementPrefix}-per" class="active">Period</label>
            </div>
            <div class="center-align row">
              <button id="editSat-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Update Satellite &#9658;</button>
            </div>
            <div class="center-align row">
              <button id="editSat-newTLE" class="btn btn-ui waves-effect waves-light" type="button" name="action">Update Epoch to Now &#9658;</button>
            </div>
            <div class="center-align row">
              <button id="editSat-save" class="btn btn-ui waves-effect waves-light" type="button" name="action">Save TLE &#9658;</button>
            </div>
            <div class="center-align row">
              <button id="editSat-open" class="btn btn-ui waves-effect waves-light" type="button" name="action">Load TLE &#9658;</button>
              <input id="editSat-file" class="start-hidden" type="file" name="files[]" />
            </div>
          </form>
        </div>
        <div id="${EditSat.elementPrefix}-error" class="center-align menu-selectable start-hidden">
          <h6 class="center-align">Error</h6>
        </div>
      </div>
    </div>
    `;

  bottomIconElementName = 'editSat-icon';
  bottomIconImg = editPng;
  bottomIconLabel = 'Edit Satellite';
  bottomIconCallback: () => void = (): void => {
    if (!this.isMenuButtonActive) return;
    this.populateSideMenu_();
  };

  dragOptions: clickDragOptions = {
    isDraggable: true,
  };

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: 'editSat',
      cb: () => {
        getEl('editSat-newTLE').addEventListener('click', this.editSatNewTleClick_.bind(this));

        getEl('editSat').addEventListener('submit', function (e: Event) {
          e.preventDefault();
          EditSat.editSatSubmit();
        });

        getEl(`${EditSat.elementPrefix}-per`).addEventListener('change', function () {
          const per = (<HTMLInputElement>getEl('es-per')).value;
          if (per === '') return;
          const meanmo = 1440 / parseFloat(per);
          (<HTMLInputElement>getEl('es-meanmo')).value = meanmo.toFixed(8);
        });

        getEl(`${EditSat.elementPrefix}-meanmo`).addEventListener('change', function () {
          const meanmo = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meanmo`)).value;
          if (meanmo === '') return;
          const per = (1440 / parseFloat(meanmo)).toFixed(8);
          (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-per`)).value = per;
        });

        getEl(`editSat-save`).addEventListener('click', EditSat.editSatSaveClick);

        getEl(`editSat-open`).addEventListener('click', function () {
          getEl(`editSat-file`).click();
        });

        getEl(`editSat-file`).addEventListener('change', function (evt: Event) {
          if (!window.FileReader) return; // Browser is not compatible
          EditSat.doReaderActions_(evt);
          evt.preventDefault();
        });

        getEl(`${EditSat.elementPrefix}-error`).addEventListener('click', function () {
          getEl(`${EditSat.elementPrefix}-error`).style.display = 'none';
        });
      },
    });
  }

  static elementPrefix = 'es';

  isRmbOnSat = true;
  rmbMenuOrder = 2;
  rmbL1ElementName = `edit-rmb`;
  rmbL1Html = keepTrackApi.html`
  <li class="rmb-menu-item" id=${this.rmbL1ElementName}><a href="#">Edit Sat &#x27A4;</a></li>`;

  rmbCallback = (targetId: string, clickedSat?: number): void => {
    if (typeof clickedSat === 'undefined' || clickedSat === null) throw new Error('clickedSat is undefined');

    switch (targetId) {
      case 'set-pri-sat-rmb':
        this.selectSatManager_.selectSat(clickedSat);
        break;
      case 'set-sec-sat-rmb':
        this.selectSatManager_.setSecondarySat(clickedSat);
        break;
      case 'edit-sat-rmb':
        this.selectSatManager_.selectSat(clickedSat);
        if (!this.isMenuButtonActive) {
          keepTrackApi.getUiManager().bottomIconPress(<HTMLElement>{ id: this.bottomIconElementName });
        }
        break;
      default:
        break;
    }
  };

  rmbL2ElementName = 'edit-rmb-menu';
  rmbL2Html = keepTrackApi.html`
    <ul class='dropdown-contents'>
      <li id="set-pri-sat-rmb"><a href="#">Set as Primary Sat</a></li>
      <li id="set-sec-sat-rmb"><a href="#">Set as Secondary Sat</a></li>
      <li id="edit-sat-rmb"><a href="#">Edit Satellite</a></li>
    </ul>`;

  private static doReaderActions_(evt: Event) {
    try {
      const reader = new FileReader();
      reader.onload = EditSat.readerOnLoad_;
      reader.readAsText((<any>evt.target).files[0]);
    } catch (e) {
      errorManagerInstance.error(e, 'doReaderActions', 'Error reading file!');
    }
  }

  private static readerOnLoad_(evt: any) {
    if (evt.target.readyState !== 2) return;
    if (evt.target.error) {
      errorManagerInstance.warn('Error while reading file!');
      return;
    }

    const timeManagerInstance = keepTrackApi.getTimeManager();
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    const uiManagerInstance = keepTrackApi.getUiManager();

    const object = JSON.parse(<string>evt.target.result);
    const sccNum = parseInt(StringPad.pad0(object.TLE1.substr(2, 5).trim(), 5));
    const sat = keepTrackApi.getCatalogManager().getSatFromSccNum(sccNum);

    let satrec: SatelliteRecord;
    try {
      satrec = Sgp4.createSatrec(object.TLE1, object.TLE2);
    } catch (e) {
      errorManagerInstance.error(e, 'edit-sat.ts', 'Error creating satellite record!');
      return;
    }
    if (SatMath.altitudeCheck(satrec, timeManagerInstance.simulationTimeObj) > 1) {
      keepTrackApi.getCatalogManager().satCruncher.postMessage({
        typ: 'satEdit',
        id: sat.id,
        active: true,
        TLE1: object.TLE1,
        TLE2: object.TLE2,
      });
      orbitManagerInstance.changeOrbitBufferData(sat.id, object.TLE1, object.TLE2);
      sat.active = true;
    } else {
      uiManagerInstance.toast('Failed to propagate satellite. Try different parameters or if you are confident they are correct report this issue.', 'caution', true);
    }
  }

  private populateSideMenu_() {
    const sat = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value = sat.sccNum;

    const inc = (sat.inclination * RAD2DEG).toFixed(4).padStart(8, '0');
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-inc`)).value = inc;
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-year`)).value = sat.TLE1.substr(18, 2);
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-day`)).value = sat.TLE1.substr(20, 12);
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meanmo`)).value = sat.TLE2.substr(52, 11);
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-per`)).value = (1440 / parseFloat(sat.TLE2.substr(52, 11))).toFixed(4);

    const rasc = (sat.raan * RAD2DEG).toFixed(4).padStart(8, '0');
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-rasc`)).value = rasc;
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-ecen`)).value = sat.eccentricity.toFixed(7).substr(2, 7);

    const argPe = (sat.argPe * RAD2DEG).toFixed(4).padStart(8, '0');
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-argPe`)).value = StringPad.pad0(argPe, 8);
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meana`)).value = sat.TLE2.substr(44 - 1, 7 + 1);
  }

  private editSatNewTleClick_() {
    showLoading(this.editSatNewTleClickFadeIn_.bind(this));
  }

  private editSatNewTleClickFadeIn_() {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const uiManagerInstance = keepTrackApi.getUiManager();

    try {
      // Update Satellite TLE so that Epoch is Now but ECI position is very very close
      const satId = keepTrackApi.getCatalogManager().getIdFromSccNum(parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value));
      const mainsat = keepTrackApi.getCatalogManager().getSat(satId);

      // Launch Points are the Satellites Current Location
      const lla = CoordinateTransforms.eci2lla(mainsat.position, timeManagerInstance.simulationTimeObj);
      let launchLon = lla.lon;
      let launchLat = lla.lat;
      let alt = lla.alt;

      const upOrDown = SatMath.getDirection(mainsat, timeManagerInstance.simulationTimeObj);
      if (upOrDown === 'Error') {
        uiManagerInstance.toast('Cannot calculate direction of satellite. Try again later.', 'caution');
      }

      const simulationTimeObj = timeManagerInstance.simulationTimeObj;

      const currentEpoch = TimeManager.currentEpoch(simulationTimeObj);
      mainsat.TLE1 = (mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32)) as TleLine1;

      keepTrackApi.getMainCamera().isAutoPitchYawToTarget = false;

      let TLEs;
      // Ignore argument of perigee for round orbits OPTIMIZE
      if (mainsat.apogee - mainsat.perigee < 300) {
        TLEs = new OrbitFinder(mainsat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj).rotateOrbitToLatLon();
      } else {
        TLEs = new OrbitFinder(mainsat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj, alt).rotateOrbitToLatLon();
      }

      const TLE1 = TLEs[0];
      const TLE2 = TLEs[1];

      if (TLE1 === 'Error') {
        uiManagerInstance.toast(`${TLE2}`, 'critical', true);
        return;
      }

      keepTrackApi.getCatalogManager().satCruncher.postMessage({
        typ: 'satEdit',
        id: satId,
        TLE1: TLE1,
        TLE2: TLE2,
      });
      const orbitManagerInstance = keepTrackApi.getOrbitManager();
      orbitManagerInstance.changeOrbitBufferData(satId, TLE1, TLE2);
      //
      // Reload Menu with new TLE
      //
      const sat = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value = sat.sccNum;

      const inc = (sat.inclination * RAD2DEG).toFixed(4).padStart(8, '0');

      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-inc`)).value = StringPad.pad0(inc, 8);
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-year`)).value = sat.TLE1.substr(18, 2);
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-day`)).value = sat.TLE1.substr(20, 12);
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meanmo`)).value = sat.TLE2.substr(52, 11);
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-per`)).value = (1440 / parseFloat(sat.TLE2.substr(52, 11))).toFixed(4);

      const rasc = (sat.raan * RAD2DEG).toFixed(4).padStart(8, '0');

      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-rasc`)).value = rasc;
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-ecen`)).value = sat.eccentricity.toFixed(7).substr(2, 7);

      const argPe = (sat.argPe * RAD2DEG).toFixed(4).padStart(8, '0');

      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-argPe`)).value = argPe;
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meana`)).value = sat.TLE2.substr(44 - 1, 7 + 1);
    } catch (error) {
      errorManagerInstance.warn(error);
    }
  }

  private static editSatSubmit() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const uiManagerInstance = keepTrackApi.getUiManager();

    getEl(`${EditSat.elementPrefix}-error`).style.display = 'none';
    const scc = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value;
    const satId = catalogManagerInstance.getIdFromSccNum(parseInt(scc));
    if (satId === null) {
      errorManagerInstance.info('Not a Real Satellite');
    }
    const sat = catalogManagerInstance.getSat(satId, GetSatType.EXTRA_ONLY);
    const intl = sat.TLE1.substr(9, 8);
    let inc = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSat.elementPrefix}-inc`)).value;
    let meanmo = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meanmo`)).value;
    let rasc = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSat.elementPrefix}-rasc`)).value;
    const ecen = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-ecen`)).value;
    let argPe = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSat.elementPrefix}-argPe`)).value;
    let meana = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meana`)).value;
    const epochyr = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-year`)).value;
    const epochday = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-day`)).value;

    const { TLE1, TLE2 } = FormatTle.createTle({ sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc });

    let satrec: SatelliteRecord;
    try {
      satrec = Sgp4.createSatrec(TLE1, TLE2);
    } catch (e) {
      errorManagerInstance.error(e, 'edit-sat.ts', 'Error creating satellite record!');
      return;
    }
    if (SatMath.altitudeCheck(satrec, timeManagerInstance.simulationTimeObj) > 1) {
      catalogManagerInstance.satCruncher.postMessage({
        typ: 'satEdit',
        id: satId,
        active: true,
        TLE1: TLE1,
        TLE2: TLE2,
      });
      const orbitManagerInstance = keepTrackApi.getOrbitManager();
      orbitManagerInstance.changeOrbitBufferData(satId, TLE1, TLE2);
      sat.active = true;

      // Prevent caching of old TLEs
      sat.satrec = null;
    } else {
      uiManagerInstance.toast('Failed to propagate satellite. Try different parameters or if you are confident they are correct report this issue.', 'caution', true);
    }
  }

  private static editSatSaveClick(e: Event) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    try {
      const scc = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value;
      const satId = catalogManagerInstance.getIdFromSccNum(parseInt(scc));
      const sat = catalogManagerInstance.getSat(satId, GetSatType.EXTRA_ONLY);
      const sat2 = {
        TLE1: sat.TLE1,
        TLE2: sat.TLE2,
      };
      const variable = JSON.stringify(sat2);
      const blob = new Blob([variable], {
        type: 'text/plain;charset=utf-8',
      });
      saveAs(blob, scc + '.tle');
    } catch (error) {
      // intentionally left blank
    }
    e.preventDefault();
  }
}
