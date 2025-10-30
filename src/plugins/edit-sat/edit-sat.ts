import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { StringPad } from '@app/engine/utils/stringPad';
import editSatellitePng from '@public/img/icons/edit-satellite.png';
import { saveAs } from 'file-saver';

import { OrbitFinder } from '@app/app/analysis/orbit-finder';
import { SatMath, StringifiedNumber } from '@app/app/analysis/sat-math';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { TimeManager } from '@app/engine/core/time-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { t7e } from '@app/locales/keys';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { BaseObject, DetailedSatellite, FormatTle, SatelliteRecord, Sgp4, TleLine1, ZoomValue, eci2lla } from '@ootk/src/main';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/sounds';

export class EditSat extends KeepTrackPlugin {
  readonly id = 'EditSat';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  isRequireSatelliteSelected = true;
  isIconDisabled = true;
  isIconDisabledOnLoad = true;

  static readonly elementPrefix = 'es';

  sideMenuElementName = 'editSat-menu';
  sideMenuElementHtml = html`
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
              <input placeholder="Unknown" id="${EditSat.elementPrefix}-country" type="text" />
              <label for="${EditSat.elementPrefix}-country" class="active">Country</label>
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
              <input placeholder="AAAAAAA" id="${EditSat.elementPrefix}-ecen" type="text" maxlength="7" />
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
              <input placeholder="AA.AAAAA" id="${EditSat.elementPrefix}-meanmo" type="text" maxlength="11" />
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


  bottomIconImg = editSatellitePng;
  bottomIconCallback: () => void = (): void => {
    if (!this.isMenuButtonActive) {
      return;
    }
    this.populateSideMenu_();
  };

  dragOptions: ClickDragOptions = {
    isDraggable: true,
  };

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('editSat-newTLE')!.addEventListener('click', this.editSatNewTleClick_.bind(this));

        getEl('editSat')!.addEventListener('submit', (e: Event) => {
          e.preventDefault();
          EditSat.editSatSubmit();
        });

        getEl(`${EditSat.elementPrefix}-per`)!.addEventListener('change', () => {
          const per = (<HTMLInputElement>getEl('es-per')).value;

          if (per === '') {
            return;
          }
          const meanmo = 1440 / parseFloat(per);

          (<HTMLInputElement>getEl('es-meanmo')).value = meanmo.toFixed(4);
        });

        getEl(`${EditSat.elementPrefix}-meanmo`)!.addEventListener('change', () => {
          const meanmo = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meanmo`)).value;

          if (meanmo === '') {
            return;
          }
          const per = (1440 / parseFloat(meanmo)).toFixed(4);

          (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-per`)).value = per;
        });

        getEl('editSat-save')!.addEventListener('click', EditSat.editSatSaveClick);

        getEl('editSat-open')!.addEventListener('click', () => {
          ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
          getEl('editSat-file')!.click();
        });

        getEl('editSat-file')!.addEventListener('change', (evt: Event) => {
          if (!window.FileReader) {
            return;
          } // Browser is not compatible
          EditSat.doReaderActions_(evt);
          evt.preventDefault();
        });

        getEl(`${EditSat.elementPrefix}-error`)!.addEventListener('click', () => {
          getEl(`${EditSat.elementPrefix}-error`)!.style.display = 'none';
        });
      },
    );
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj: BaseObject) => {
        if (!obj) {
          if (this.isMenuButtonActive) {
            this.closeSideMenu();
          }
          this.setBottomIconToDisabled();
        } else if (this.isMenuButtonActive && obj.isSatellite() && (obj as DetailedSatellite).sccNum !== (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value) {
          this.populateSideMenu_();
        }
      },
    );
  }

  isRmbOnSat = true;
  rmbMenuOrder = 2;
  rmbL1ElementName = 'edit-rmb';
  rmbL1Html = html`
  <li class="rmb-menu-item" id=${this.rmbL1ElementName}><a href="#">Edit Sat &#x27A4;</a></li>`;

  rmbCallback = (targetId: string, clickedSat?: number): void => {
    if (typeof clickedSat === 'undefined' || clickedSat === null) {
      throw new Error('clickedSat is undefined');
    }

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
          ServiceLocator.getUiManager().bottomIconPress(<HTMLElement>{ id: this.bottomIconElementName });
        }
        break;
      default:
        break;
    }
  };

  rmbL2ElementName = 'edit-rmb-menu';
  rmbL2Html = html`
    <ul class='dropdown-contents'>
      <li id="set-pri-sat-rmb"><a href="#">Set as Primary Sat</a></li>
      <li id="set-sec-sat-rmb"><a href="#">Set as Secondary Sat</a></li>
      <li id="edit-sat-rmb"><a href="#">Edit Satellite</a></li>
    </ul>`;

  private static doReaderActions_(evt: Event) {
    try {
      const reader = new FileReader();

      reader.onload = EditSat.readerOnLoad_;
      const eventTarget = evt.target as HTMLInputElement;

      reader.readAsText(eventTarget.files![0]);
    } catch (e) {
      errorManagerInstance.error(e, 'doReaderActions', 'Error reading file!');
    }
  }

  private static readerOnLoad_(evt: Event) {
    const eventTarget = evt.target as FileReader;

    if (eventTarget.readyState !== 2) {
      return;
    }
    if (eventTarget.error) {
      errorManagerInstance.warn(t7e('errorMsgs.EditSat.errorReadingFile'));

      return;
    }

    const timeManagerInstance = ServiceLocator.getTimeManager();
    const orbitManagerInstance = ServiceLocator.getOrbitManager();
    const uiManagerInstance = ServiceLocator.getUiManager();

    const object = JSON.parse(<string>eventTarget.result);
    const sccNum = parseInt(StringPad.pad0(object.tle1.substr(2, 5).trim(), 5));
    const sat = ServiceLocator.getCatalogManager().sccNum2Sat(sccNum);

    if (!sat) {
      errorManagerInstance.warn(t7e('errorMsgs.EditSat.satelliteNotFound', { sccNum }));

      return;
    }

    let satrec: SatelliteRecord;

    try {
      satrec = Sgp4.createSatrec(object.tle1, object.tle2);
    } catch (e) {
      errorManagerInstance.error(e, 'edit-sat.ts', 'Error creating satellite record!');

      return;
    }
    if (SatMath.altitudeCheck(satrec, timeManagerInstance.simulationTimeObj) > 1) {
      ServiceLocator.getCatalogManager().satCruncher.postMessage({
        typ: CruncerMessageTypes.SAT_EDIT,
        id: sat.id,
        active: true,
        tle1: object.tle1,
        tle2: object.tle2,
      });
      orbitManagerInstance.changeOrbitBufferData(sat.id, object.tle1, object.tle2);
      sat.active = true;
    } else {
      uiManagerInstance.toast('Failed to propagate satellite. Try different parameters or if you are confident they are correct report this issue.', ToastMsgType.caution, true);
    }
  }

  private populateSideMenu_() {
    const obj = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);

    if (!obj?.isSatellite()) {
      return;
    }

    const sat = obj as DetailedSatellite;

    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value = sat.sccNum;
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-country`)).value = sat.country;

    const inc = sat.inclination.toFixed(4).padStart(8, '0');

    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-inc`)).value = inc;
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-year`)).value = sat.tle1.substr(18, 2);
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-day`)).value = sat.tle1.substr(20, 12);
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meanmo`)).value = sat.tle2.substr(52, 11);
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-per`)).value = (1440 / parseFloat(sat.tle2.substr(52, 11))).toFixed(4);

    const rasc = sat.rightAscension.toFixed(4).padStart(8, '0');

    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-rasc`)).value = rasc;
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-ecen`)).value = sat.eccentricity.toFixed(7).substr(2, 7);

    const argPe = sat.argOfPerigee.toFixed(4).padStart(8, '0');

    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-argPe`)).value = StringPad.pad0(argPe, 8);
    (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meana`)).value = sat.tle2.substr(44 - 1, 7 + 1);
  }

  private editSatNewTleClick_() {
    showLoading(this.editSatNewTleClickFadeIn_.bind(this));
  }

  private editSatNewTleClickFadeIn_() {
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const uiManagerInstance = ServiceLocator.getUiManager();

    try {
      // Update Satellite TLE so that Epoch is Now but ECI position is very very close
      const id = ServiceLocator.getCatalogManager().sccNum2Id(parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value));
      const obj = ServiceLocator.getCatalogManager().getObject(id);

      if (!obj?.isSatellite()) {
        return;
      }

      const mainsat = obj as DetailedSatellite;
      // Launch Points are the Satellites Current Location
      const gmst = ServiceLocator.getTimeManager().gmst;
      const lla = eci2lla(mainsat.position, gmst);
      const launchLon = lla.lon;
      const launchLat = lla.lat;
      const alt = lla.alt;

      const upOrDown = SatMath.getDirection(mainsat, timeManagerInstance.simulationTimeObj);

      if (upOrDown === 'Error') {
        uiManagerInstance.toast('Cannot calculate direction of satellite. Try again later.', ToastMsgType.caution);
      }

      const simulationTimeObj = timeManagerInstance.simulationTimeObj;

      const currentEpoch = TimeManager.currentEpoch(simulationTimeObj);

      mainsat.tle1 = (mainsat.tle1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.tle1.substr(32)) as TleLine1;

      ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

      let TLEs;
      // Ignore argument of perigee for round orbits OPTIMIZE

      if (mainsat.apogee - mainsat.perigee < 300) {
        TLEs = new OrbitFinder(mainsat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj).rotateOrbitToLatLon();
      } else {
        TLEs = new OrbitFinder(mainsat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj, alt).rotateOrbitToLatLon();
      }

      const tle1 = TLEs[0];
      const tle2 = TLEs[1];

      if (tle1 === 'Error') {
        uiManagerInstance.toast(`${tle2}`, ToastMsgType.critical, true);

        return;
      }

      ServiceLocator.getCatalogManager().satCruncher.postMessage({
        typ: CruncerMessageTypes.SAT_EDIT,
        id,
        tle1,
        tle2,
      });
      const orbitManagerInstance = ServiceLocator.getOrbitManager();

      orbitManagerInstance.changeOrbitBufferData(id!, tle1, tle2);
      /*
       *
       * Reload Menu with new TLE
       *
       */
      const obj2 = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);

      if (!obj2.isSatellite()) {
        return;
      }

      const sat = obj2 as DetailedSatellite;

      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value = sat.sccNum;
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-country`)).value = sat.country;

      const inc = sat.inclination.toFixed(4).padStart(8, '0');

      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-inc`)).value = StringPad.pad0(inc, 8);
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-year`)).value = sat.tle1.substr(18, 2);
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-day`)).value = sat.tle1.substr(20, 12);
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meanmo`)).value = sat.tle2.substr(52, 11);
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-per`)).value = (1440 / parseFloat(sat.tle2.substr(52, 11))).toFixed(4);

      const rasc = sat.rightAscension.toFixed(4).padStart(8, '0');

      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-rasc`)).value = rasc;
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-ecen`)).value = sat.eccentricity.toFixed(7).substr(2, 7);

      const argPe = sat.argOfPerigee.toFixed(4).padStart(8, '0');

      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-argPe`)).value = argPe;
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meana`)).value = sat.tle2.substr(44 - 1, 7 + 1);
    } catch (error) {
      errorManagerInstance.warn(error);
    }
  }

  private static editSatSubmit() {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    getEl(`${EditSat.elementPrefix}-error`)!.style.display = 'none';
    const scc = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value;
    const satId = catalogManagerInstance.sccNum2Id(parseInt(scc));

    if (satId === null) {
      errorManagerInstance.info('Not a Real Satellite');
    }
    const obj = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY);

    if (!obj?.isSatellite()) {
      return;
    }

    const sat = obj as DetailedSatellite;
    const country = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-country`)).value;
    const intl = sat.tle1.substr(9, 8);
    const inc = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSat.elementPrefix}-inc`)).value;
    const meanmo = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meanmo`)).value;
    const rasc = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSat.elementPrefix}-rasc`)).value;
    const ecen = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-ecen`)).value;
    const argPe = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSat.elementPrefix}-argPe`)).value;
    const meana = <StringifiedNumber>(<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meana`)).value;
    const epochyr = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-year`)).value;
    const epochday = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-day`)).value;

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

    if (SatMath.altitudeCheck(satrec, ServiceLocator.getTimeManager().simulationTimeObj) > 1) {
      catalogManagerInstance.satCruncher.postMessage({
        typ: CruncerMessageTypes.SAT_EDIT,
        id: satId,
        active: true,
        tle1,
        tle2,
      });
      const orbitManagerInstance = ServiceLocator.getOrbitManager();

      orbitManagerInstance.changeOrbitBufferData(satId!, tle1, tle2);
      sat.active = true;
      sat.editTle(tle1, tle2);
      sat.country = country;
      ServiceLocator.getMainCamera().state.zoomTarget = ZoomValue.GEO;
    } else {
      ServiceLocator.getUiManager().toast('Failed to propagate satellite. Try different parameters or if you are confident they are correct report this issue.',
        ToastMsgType.caution, true);
    }
  }

  private static editSatSaveClick(e: Event) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    ServiceLocator.getSoundManager()?.play(SoundNames.EXPORT);

    try {
      const scc = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value;
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
    } catch {
      // intentionally left blank
    }
    e.preventDefault();
  }
}
