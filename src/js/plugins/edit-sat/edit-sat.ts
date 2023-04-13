import editPng from '@app/img/icons/edit.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { createError } from '@app/js/errorManager/errorManager';
import { RAD2DEG } from '@app/js/lib/constants';
import { clickAndDragWidth, getEl, saveAs, shake, showLoading, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import { stringPad } from '@app/js/lib/stringPad';
import { ObjectManager } from '@app/js/objectManager/objectManager';
import { StringifiedNubmer } from '@app/js/satMath/tle/tleFormater';
import { CatalogManager } from '@app/js/satSet/satSet';
import { toast } from '@app/js/uiManager/ui/toast';
import { helpBodyTextEdit, helpTitleTextEdit } from './help';

let isEditSatMenuOpen = false;
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'editSat',
    cb: () => uiManagerInit(),
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'editSat',
    cb: uiManagerFinal,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'editSat',
    cb: (iconName: string): void => bottomMenuClick(iconName),
  });

  keepTrackApi.register({
    method: 'rmbMenuActions',
    cbName: 'editSat',
    cb: (iconName: string, clickedSat: number): void => rmbMenuActions(iconName, clickedSat),
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'editSat',
    cb: (): void => hideSideMenus(),
  });

  keepTrackApi.register({
    method: 'onHelpMenuClick',
    cbName: 'editSat',
    cb: onHelpMenuClick,
  });
};

export const onHelpMenuClick = (): boolean => {
  if (isEditSatMenuOpen) {
    keepTrackApi.programs.adviceManager.showAdvice(helpTitleTextEdit, helpBodyTextEdit);
    return true;
  }
  return false;
};

export const uiManagerInit = (): void => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
    <div id="editSat-menu" class="side-menu-parent start-hidden text-select">
      <div id="editSat-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Edit Satellite</h5>
          <form id="editSat">
            <div class="input-field col s12">
              <input disabled value="AAAAA" id="es-scc" type="text" maxlength="5" />
              <label for="disabled" class="active">Satellite SCC#</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA" id="es-year" type="text" maxlength="2" />
              <label for="es-year" class="active">Epoch Year</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAAAAAA" id="es-day" type="text" maxlength="12" />
              <label for="es-day" class="active">Epoch Day</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="es-inc" type="text" maxlength="8" />
              <label for="es-inc" class="active">Inclination</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="es-rasc" type="text" maxlength="8" />
              <label for="es-rasc" class="active">Right Ascension</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA.AAAAAAAA" id="es-ecen" type="text" maxlength="7" />
              <label for="es-ecen" class="active">Eccentricity</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA.AAAAAAAA" id="es-argPe" type="text" maxlength="8" />
              <label for="es-argPe" class="active">Argument of Perigee</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="es-meana" type="text" maxlength="8" />
              <label for="es-meana" class="active">Mean Anomaly</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="es-meanmo" type="text" maxlength="11" />
              <label for="es-meanmo" class="active">Mean Motion</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="" id="es-per" type="text" maxlength="11" />
              <label for="es-per" class="active">Period</label>
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
        <div id="es-error" class="center-align menu-selectable start-hidden">
          <h6 class="center-align">Error</h6>
        </div>
      </div>
    </div>
    `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
    <div id="menu-editSat" class="bmenu-item bmenu-item-disabled">
      <img
        alt="edit"
        src="${editPng}"/>
      <span class="bmenu-title">Edit Satellite</span>
      <div class="status-icon"></div>
    </div>
  `
  );
};

export const uiManagerFinal = (): void => {
  clickAndDragWidth(getEl('editSat-menu'));
  getEl('editSat-newTLE').addEventListener('click', editSatNewTleClick);

  getEl('editSat').addEventListener('submit', function (e: Event) {
    e.preventDefault();
    editSatSubmit();
  });

  getEl('es-per').addEventListener('change', function () {
    const per = (<HTMLInputElement>getEl('es-per')).value;
    if (per === '') return;
    const meanmo = 1440 / parseFloat(per);
    (<HTMLInputElement>getEl('es-meanmo')).value = meanmo.toFixed(8);
  });

  getEl('es-meanmo').addEventListener('change', function () {
    const meanmo = (<HTMLInputElement>getEl('es-meanmo')).value;
    if (meanmo === '') return;
    const per = (1440 / parseFloat(meanmo)).toFixed(8);
    (<HTMLInputElement>getEl('es-per')).value = per;
  });

  getEl('editSat-save').addEventListener('click', editSatSaveClick);

  getEl('editSat-open').addEventListener('click', function () {
    getEl('editSat-file').click();
  });

  getEl('editSat-file').addEventListener('change', function (evt: Event) {
    if (!window.FileReader) return; // Browser is not compatible
    doReaderActions(evt);
    evt.preventDefault();
  });

  getEl('es-error').addEventListener('click', function () {
    getEl('es-error').style.display = 'none';
  });
};

export const doReaderActions = (evt: Event) => {
  try {
    const reader = new FileReader();
    reader.onload = readerOnLoad;
    reader.readAsText((<any>evt.target).files[0]);
  } catch (e) {
    createError(e, 'doReaderActions');
  }
};

export const readerOnLoad = (evt: any) => {
  const { satellite, timeManager, orbitManager, satSet } = keepTrackApi.programs;
  if (evt.target.readyState !== 2) return;
  if (evt.target.error) {
    console.log('error');
    return;
  }

  const object = JSON.parse(<string>evt.target.result);
  const scc = parseInt(stringPad.pad0(object.TLE1.substr(2, 5).trim(), 5));
  const satId = satSet.getIdFromObjNum(scc);
  const sat = satSet.getSatExtraOnly(satId);
  if (satellite.altitudeCheck(object.TLE1, object.TLE2, timeManager.simulationTimeObj) > 1) {
    satSet.satCruncher.postMessage({
      typ: 'satEdit',
      id: sat.id,
      active: true,
      TLE1: object.TLE1,
      TLE2: object.TLE2,
    });
    orbitManager.updateOrbitBuffer(sat.id, true, object.TLE1, object.TLE2);
    sat.active = true;
  } else {
    toast('Failed to propagate satellite. Try different parameters or if you are confident they are correct report this issue.', 'caution', true);
  }
};

export const bottomMenuClick = (iconName: string) => {
  const { uiManager, satSet, objectManager } = keepTrackApi.programs;
  if (iconName === 'menu-editSat') {
    if (isEditSatMenuOpen) {
      isEditSatMenuOpen = false;
      uiManager.hideSideMenus();
      return;
    } else {
      if (objectManager.selectedSat !== -1) {
        if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
        uiManager.hideSideMenus();
        slideInRight(getEl('editSat-menu'), 1000);
        getEl('menu-editSat').classList.add('bmenu-item-selected');
        isEditSatMenuOpen = true;
        populateSideMenu({ satSet, objectManager });
      } else {
        toast(`Select a Satellite First!`, 'caution');
        shake(getEl('menu-editSat'));
      }
    }
    return;
  }
};

const populateSideMenu = ({ satSet, objectManager }: { satSet: CatalogManager; objectManager: ObjectManager }) => {
  const sat = satSet.getSatExtraOnly(objectManager.selectedSat);
  (<HTMLInputElement>getEl('es-scc')).value = sat.sccNum;

  const inc: string = stringPad.pad0((sat.inclination * RAD2DEG).toFixed(4), 8);

  (<HTMLInputElement>getEl('es-inc')).value = stringPad.pad0(inc, 8);
  (<HTMLInputElement>getEl('es-year')).value = sat.TLE1.substr(18, 2);
  (<HTMLInputElement>getEl('es-day')).value = sat.TLE1.substr(20, 12);
  (<HTMLInputElement>getEl('es-meanmo')).value = sat.TLE2.substr(52, 11);
  (<HTMLInputElement>getEl('es-per')).value = (1440 / parseFloat(sat.TLE2.substr(52, 11))).toFixed(4);

  const rasc: string = stringPad.pad0((sat.raan * RAD2DEG).toFixed(4), 8);

  (<HTMLInputElement>getEl('es-rasc')).value = stringPad.pad0(rasc, 8);
  (<HTMLInputElement>getEl('es-ecen')).value = sat.eccentricity.toFixed(7).substr(2, 7);

  const argPe: string = stringPad.pad0((sat.argPe * RAD2DEG).toFixed(4), 8);

  (<HTMLInputElement>getEl('es-argPe')).value = stringPad.pad0(argPe, 8);
  (<HTMLInputElement>getEl('es-meana')).value = sat.TLE2.substr(44 - 1, 7 + 1);
};

export const rmbMenuActions = (iconName: string, clickedSat: number) => {
  const { uiManager, objectManager } = keepTrackApi.programs;
  if (iconName === 'edit-sat-rmb') {
    if (typeof clickedSat === 'undefined' || clickedSat === null) throw new Error('clickedSat is undefined');

    objectManager.setSelectedSat(clickedSat);
    if (!isEditSatMenuOpen) {
      uiManager.bottomIconPress({ id: 'menu-editSat' });
    }
    return;
  }
};

export const hideSideMenus = () => {
  slideOutLeft(getEl('editSat-menu'), 1000);
  getEl('menu-editSat').classList.remove('bmenu-item-selected');
  isEditSatMenuOpen = false;
};

export const editSatNewTleClick = () => {
  showLoading(editSatNewTleClickFadeIn);
};

export const editSatNewTleClickFadeIn = () => {
  const { satellite, satSet, timeManager, objectManager, orbitManager } = keepTrackApi.programs;
  try {
    // Update Satellite TLE so that Epoch is Now but ECI position is very very close
    const satId = satSet.getIdFromObjNum(parseInt((<HTMLInputElement>getEl('es-scc')).value));
    const mainsat = satSet.getSat(satId);

    // Launch Points are the Satellites Current Location
    const TEARR = mainsat.getTEARR();
    let launchLat, launchLon, alt;
    launchLon = satellite.degreesLong(TEARR.lon);
    launchLat = satellite.degreesLat(TEARR.lat);
    alt = TEARR.alt;

    const upOrDown = mainsat.getDirection();

    const simulationTimeObj = timeManager.simulationTimeObj;

    const currentEpoch = satellite.currentEpoch(simulationTimeObj);
    mainsat.TLE1 = mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32);

    keepTrackApi.programs.mainCamera.isCamSnapMode = false;

    let TLEs;
    // Ignore argument of perigee for round orbits OPTIMIZE
    if (mainsat.apogee - mainsat.perigee < 300) {
      TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, simulationTimeObj);
    } else {
      TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, simulationTimeObj, alt);
    }

    const TLE1 = TLEs[0];
    const TLE2 = TLEs[1];

    if (TLE1 === 'Error') {
      toast(`${TLE2}`, 'critical', true);
      return;
    }

    satSet.satCruncher.postMessage({
      typ: 'satEdit',
      id: satId,
      TLE1: TLE1,
      TLE2: TLE2,
    });
    orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);
    //
    // Reload Menu with new TLE
    //
    const sat = satSet.getSatExtraOnly(objectManager.selectedSat);
    (<HTMLInputElement>getEl('es-scc')).value = sat.sccNum;

    const inc: string = stringPad.pad0((sat.inclination * RAD2DEG).toFixed(4), 8);

    (<HTMLInputElement>getEl('es-inc')).value = stringPad.pad0(inc, 8);
    (<HTMLInputElement>getEl('es-year')).value = sat.TLE1.substr(18, 2);
    (<HTMLInputElement>getEl('es-day')).value = sat.TLE1.substr(20, 12);
    (<HTMLInputElement>getEl('es-meanmo')).value = sat.TLE2.substr(52, 11);
    (<HTMLInputElement>getEl('es-per')).value = (1440 / parseFloat(sat.TLE2.substr(52, 11))).toFixed(4);

    const rasc: string = stringPad.pad0((sat.raan * RAD2DEG).toFixed(4), 8);

    (<HTMLInputElement>getEl('es-rasc')).value = stringPad.pad0(rasc, 8);
    (<HTMLInputElement>getEl('es-ecen')).value = sat.eccentricity.toFixed(7).substr(2, 7);

    const argPe: string = stringPad.pad0((sat.argPe * RAD2DEG).toFixed(4), 8);

    (<HTMLInputElement>getEl('es-argPe')).value = stringPad.pad0(argPe, 8);
    (<HTMLInputElement>getEl('es-meana')).value = sat.TLE2.substr(44 - 1, 7 + 1);
  } catch (error) {
    console.debug(error);
  }
};

export const editSatSubmit = () => {
  const { satellite, satSet, timeManager, orbitManager } = keepTrackApi.programs;
  getEl('es-error').style.display = 'none';
  const scc = (<HTMLInputElement>getEl('es-scc')).value;
  const satId = satSet.getIdFromObjNum(parseInt(scc));
  if (satId === null) {
    console.log('Not a Real Satellite');
  }
  const sat = satSet.getSatExtraOnly(satId);
  const intl = sat.TLE1.substr(9, 8);
  let inc = <StringifiedNubmer>(<HTMLInputElement>getEl('es-inc')).value;
  let meanmo = <StringifiedNubmer>(<HTMLInputElement>getEl('es-meanmo')).value;
  let rasc = <StringifiedNubmer>(<HTMLInputElement>getEl('es-rasc')).value;
  const ecen = (<HTMLInputElement>getEl('es-ecen')).value;
  let argPe = <StringifiedNubmer>(<HTMLInputElement>getEl('es-argPe')).value;
  let meana = <StringifiedNubmer>(<HTMLInputElement>getEl('es-meana')).value;
  const epochyr = (<HTMLInputElement>getEl('es-year')).value;
  const epochday = (<HTMLInputElement>getEl('es-day')).value;

  const { TLE1, TLE2 } = satellite.createTle({ sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc });

  if (satellite.altitudeCheck(TLE1, TLE2, timeManager.simulationTimeObj) > 1) {
    satSet.satCruncher.postMessage({
      typ: 'satEdit',
      id: satId,
      active: true,
      TLE1: TLE1,
      TLE2: TLE2,
    });
    orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);
    sat.active = true;

    // Prevent caching of old TLEs
    sat.satrec = null;
  } else {
    toast('Failed to propagate satellite. Try different parameters or if you are confident they are correct report this issue.', 'caution', true);
  }
};

export const editSatSaveClick = (e: Event) => {
  const { satSet } = keepTrackApi.programs;
  try {
    const scc = (<HTMLInputElement>getEl('es-scc')).value;
    const satId = satSet.getIdFromObjNum(parseInt(scc));
    const sat = satSet.getSatExtraOnly(satId);
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
};
