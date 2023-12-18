import editPng from '@app/img/icons/edit.png';
import { keepTrackApi, KeepTrackApiEvents } from '@app/js/keepTrackApi';
import { RAD2DEG } from '@app/js/lib/constants';
import { getEl } from '@app/js/lib/get-el';
import { showLoading } from '@app/js/lib/showLoading';
import { StringPad } from '@app/js/lib/stringPad';
import { errorManagerInstance } from '@app/js/singletons/errorManager';
import { saveAs } from 'file-saver';

import { GetSatType } from '@app/js/interfaces';
import { OrbitFinder } from '@app/js/singletons/orbit-finder';
import { TimeManager } from '@app/js/singletons/time-manager';
import { CoordinateTransforms } from '@app/js/static/coordinate-transforms';
import { FormatTle } from '@app/js/static/format-tle';
import { SatMath, StringifiedNumber } from '@app/js/static/sat-math';
import { SatelliteRecord, Sgp4, TleLine1 } from 'ootk';
import { clickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';

export class EditSatPlugin extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Edit Sat';
  constructor() {
    super(EditSatPlugin.PLUGIN_NAME);
  }

  isRequireSatelliteSelected: boolean = true;
  isIconDisabledOnLoad: boolean = true;

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

  sideMenuElementName: string = 'editSat-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
    <div id="editSat-menu" class="side-menu-parent start-hidden text-select">
      <div id="editSat-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Edit Satellite</h5>
          <form id="editSat">
            <div class="input-field col s12">
              <input disabled value="AAAAA" id="${EditSatPlugin.elementPrefix}-scc" type="text" maxlength="5" />
              <label for="disabled" class="active">Satellite SCC#</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA" id="${EditSatPlugin.elementPrefix}-year" type="text" maxlength="2" />
              <label for="${EditSatPlugin.elementPrefix}-year" class="active">Epoch Year</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAAAAAA" id="${EditSatPlugin.elementPrefix}-day" type="text" maxlength="12" />
              <label for="${EditSatPlugin.elementPrefix}-day" class="active">Epoch Day</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="${EditSatPlugin.elementPrefix}-inc" type="text" maxlength="8" />
              <label for="${EditSatPlugin.elementPrefix}-inc" class="active">Inclination</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="${EditSatPlugin.elementPrefix}-rasc" type="text" maxlength="8" />
              <label for="${EditSatPlugin.elementPrefix}-rasc" class="active">Right Ascension</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA.AAAAAAAA" id="${EditSatPlugin.elementPrefix}-ecen" type="text" maxlength="7" />
              <label for="${EditSatPlugin.elementPrefix}-ecen" class="active">Eccentricity</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA.AAAAAAAA" id="${EditSatPlugin.elementPrefix}-argPe" type="text" maxlength="8" />
              <label for="${EditSatPlugin.elementPrefix}-argPe" class="active">Argument of Perigee</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="${EditSatPlugin.elementPrefix}-meana" type="text" maxlength="8" />
              <label for="${EditSatPlugin.elementPrefix}-meana" class="active">Mean Anomaly</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="${EditSatPlugin.elementPrefix}-meanmo" type="text" maxlength="11" />
              <label for="${EditSatPlugin.elementPrefix}-meanmo" class="active">Mean Motion</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="" id="${EditSatPlugin.elementPrefix}-per" type="text" maxlength="11" />
              <label for="${EditSatPlugin.elementPrefix}-per" class="active">Period</label>
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
        <div id="${EditSatPlugin.elementPrefix}-error" class="center-align menu-selectable start-hidden">
          <h6 class="center-align">Error</h6>
        </div>
      </div>
    </div>
    `;

  bottomIconElementName: string = 'editSat-icon';
  bottomIconImg = editPng;
  bottomIconLabel = 'Edit Satellite';
  bottomIconCallback: () => void = (): void => {
    if (!this.isMenuButtonActive) return;
    EditSatPlugin.populateSideMenu();
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
        getEl('editSat-newTLE').addEventListener('click', EditSatPlugin.editSatNewTleClick);

        getEl('editSat').addEventListener('submit', function (e: Event) {
          e.preventDefault();
          EditSatPlugin.editSatSubmit();
        });

        getEl(`${EditSatPlugin.elementPrefix}-per`).addEventListener('change', function () {
          const per = (<HTMLInputElement>getEl('es-per')).value;
          if (per === '') return;
          const meanmo = 1440 / parseFloat(per);
          (<HTMLInputElement>getEl('es-meanmo')).value = meanmo.toFixed(8);
        });

        getEl(`${EditSatPlugin.elementPrefix}-meanmo`).addEventListener('change', function () {
          const meanmo = (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-meanmo`)).value;
          if (meanmo === '') return;
          const per = (1440 / parseFloat(meanmo)).toFixed(8);
          (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-per`)).value = per;
        });

        getEl(`editSat-save`).addEventListener('click', EditSatPlugin.editSatSaveClick);

        getEl(`editSat-open`).addEventListener('click', function () {
          getEl(`editSat-file`).click();
        });

        getEl(`editSat-file`).addEventListener('change', function (evt: Event) {
          if (!window.FileReader) return; // Browser is not compatible
          EditSatPlugin.doReaderActions(evt);
          evt.preventDefault();
        });

        getEl(`${EditSatPlugin.elementPrefix}-error`).addEventListener('click', function () {
          getEl(`${EditSatPlugin.elementPrefix}-error`).style.display = 'none';
        });
      },
    });
  }

  static elementPrefix: string = 'es';

  isRmbOnSat = true;
  rmbMenuOrder = 2;
  rmbL1ElementName: string = `edit-rmb`;
  rmbL1Html: string = keepTrackApi.html`
  <li class="rmb-menu-item" id=${this.rmbL1ElementName}><a href="#">Edit Sat &#x27A4;</a></li>`;

  rmbCallback = (targetId: string, clickedSat?: number): void => {
    if (typeof clickedSat === 'undefined' || clickedSat === null) throw new Error('clickedSat is undefined');

    switch (targetId) {
      case 'set-pri-sat-rmb':
        keepTrackApi.getCatalogManager().selectSat(clickedSat);
        break;
      case 'set-sec-sat-rmb':
        keepTrackApi.getCatalogManager().setSecondarySat(clickedSat);
        break;
      case 'edit-sat-rmb':
        keepTrackApi.getCatalogManager().setSelectedSat(clickedSat);
        if (!this.isMenuButtonActive) {
          keepTrackApi.getUiManager().bottomIconPress(<HTMLElement>{ id: 'menu-editSat' });
        }
        break;
      default:
        break;
    }
  };

  rmbL2ElementName: string = 'edit-rmb-menu';
  rmbL2Html: string = keepTrackApi.html`
    <ul class='dropdown-contents'>
      <li id="set-pri-sat-rmb"><a href="#">Set as Primary Sat</a></li>
      <li id="set-sec-sat-rmb"><a href="#">Set as Secondary Sat</a></li>
      <li id="edit-sat-rmb"><a href="#">Edit Satellite</a></li>
    </ul>`;

  static doReaderActions(evt: Event) {
    try {
      const reader = new FileReader();
      reader.onload = EditSatPlugin.readerOnLoad;
      reader.readAsText((<any>evt.target).files[0]);
    } catch (e) {
      errorManagerInstance.error(e, 'doReaderActions', 'Error reading file!');
    }
  }

  static readerOnLoad(evt: any) {
    if (evt.target.readyState !== 2) return;
    if (evt.target.error) {
      errorManagerInstance.warn('Error while reading file!');
      return;
    }

    const timeManagerInstance = keepTrackApi.getTimeManager();
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    const uiManagerInstance = keepTrackApi.getUiManager();

    const object = JSON.parse(<string>evt.target.result);
    const scc = parseInt(StringPad.pad0(object.TLE1.substr(2, 5).trim(), 5));
    const satId = keepTrackApi.getCatalogManager().getIdFromObjNum(scc);
    const sat = keepTrackApi.getCatalogManager().getSat(satId, GetSatType.EXTRA_ONLY);

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

  static populateSideMenu() {
    const sat = keepTrackApi.getCatalogManager().getSat(keepTrackApi.getCatalogManager().selectedSat, GetSatType.EXTRA_ONLY);
    (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-scc`)).value = sat.sccNum;

    const inc: string = StringPad.pad0((sat.inclination * RAD2DEG).toFixed(4), 8);

    (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-inc`)).value = StringPad.pad0(inc, 8);
    (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-year`)).value = sat.TLE1.substr(18, 2);
    (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-day`)).value = sat.TLE1.substr(20, 12);
    (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-meanmo`)).value = sat.TLE2.substr(52, 11);
    (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-per`)).value = (1440 / parseFloat(sat.TLE2.substr(52, 11))).toFixed(4);

    const rasc: string = StringPad.pad0((sat.raan * RAD2DEG).toFixed(4), 8);

    (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-rasc`)).value = StringPad.pad0(rasc, 8);
    (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-ecen`)).value = sat.eccentricity.toFixed(7).substr(2, 7);

    const argPe: string = StringPad.pad0((sat.argPe * RAD2DEG).toFixed(4), 8);

    (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-argPe`)).value = StringPad.pad0(argPe, 8);
    (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-meana`)).value = sat.TLE2.substr(44 - 1, 7 + 1);
  }

  static editSatNewTleClick() {
    showLoading(EditSatPlugin.editSatNewTleClickFadeIn);
  }

  static editSatNewTleClickFadeIn() {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const uiManagerInstance = keepTrackApi.getUiManager();

    try {
      // Update Satellite TLE so that Epoch is Now but ECI position is very very close
      const satId = keepTrackApi.getCatalogManager().getIdFromObjNum(parseInt((<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-scc`)).value));
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
      const sat = keepTrackApi.getCatalogManager().getSat(keepTrackApi.getCatalogManager().selectedSat, GetSatType.EXTRA_ONLY);
      (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-scc`)).value = sat.sccNum;

      const inc: string = StringPad.pad0((sat.inclination * RAD2DEG).toFixed(4), 8);

      (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-inc`)).value = StringPad.pad0(inc, 8);
      (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-year`)).value = sat.TLE1.substr(18, 2);
      (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-day`)).value = sat.TLE1.substr(20, 12);
      (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-meanmo`)).value = sat.TLE2.substr(52, 11);
      (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-per`)).value = (1440 / parseFloat(sat.TLE2.substr(52, 11))).toFixed(4);

      const rasc: string = StringPad.pad0((sat.raan * RAD2DEG).toFixed(4), 8);

      (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-rasc`)).value = StringPad.pad0(rasc, 8);
      (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-ecen`)).value = sat.eccentricity.toFixed(7).substr(2, 7);

      const argPe: string = StringPad.pad0((sat.argPe * RAD2DEG).toFixed(4), 8);

      (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-argPe`)).value = StringPad.pad0(argPe, 8);
      (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-meana`)).value = sat.TLE2.substr(44 - 1, 7 + 1);
    } catch (error) {
      errorManagerInstance.warn(error);
    }
  }

  static editSatSubmit() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const uiManagerInstance = keepTrackApi.getUiManager();

    getEl(`${EditSatPlugin.elementPrefix}-error`).style.display = 'none';
    const scc = (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-scc`)).value;
    const satId = catalogManagerInstance.getIdFromObjNum(parseInt(scc));
    if (satId === null) {
      errorManagerInstance.info('Not a Real Satellite');
    }
    const sat = catalogManagerInstance.getSat(satId, GetSatType.EXTRA_ONLY);
    const intl = sat.TLE1.substr(9, 8);
    let inc = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-inc`)).value;
    let meanmo = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-meanmo`)).value;
    let rasc = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-rasc`)).value;
    const ecen = (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-ecen`)).value;
    let argPe = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-argPe`)).value;
    let meana = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-meana`)).value;
    const epochyr = (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-year`)).value;
    const epochday = (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-day`)).value;

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

  static editSatSaveClick(e: Event) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    try {
      const scc = (<HTMLInputElement>getEl(`${EditSatPlugin.elementPrefix}-scc`)).value;
      const satId = catalogManagerInstance.getIdFromObjNum(parseInt(scc));
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

export const editSatPlugin = new EditSatPlugin();
