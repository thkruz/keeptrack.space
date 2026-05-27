import { CameraType } from '@app/engine/camera/camera-type';
import { SatMath, StringifiedNumber } from '@app/app/analysis/sat-math';
import { SoundNames } from '@app/engine/audio/sounds';
import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { TimeManager } from '@app/engine/core/time-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import {
  IBottomIconConfig,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { StringPad } from '@app/engine/utils/stringPad';
import { t7e } from '@app/locales/keys';
import { BaseObject, FormatTle, OrbitFinder, Satellite, SatelliteRecord, Sgp4, TleLine1, ZoomValue, eci2lla } from '@ootk/src/main';
import editSatellitePng from '@public/img/icons/edit-satellite.png';
import { saveAs } from 'file-saver';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

type T7eKey = Parameters<typeof t7e>[0];

export class EditSat extends KeepTrackPlugin {
  readonly id = 'EditSat';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager;
  }

  static readonly elementPrefix = 'es';

  isRequireSatelliteSelected = true;
  isIconDisabled = true;
  isIconDisabledOnLoad = true;

  // =========================================================================
  // Composition-based configuration
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'edit-satellite-bottom-icon',
      label: t7e('plugins.EditSat.bottomIconLabel' as T7eKey),
      image: editSatellitePng,
      menuMode: [MenuMode.CREATE, MenuMode.ALL],
      isDisabledOnLoad: true,
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'E',
        callback: () => {
          const ct = ServiceLocator.getMainCamera().cameraType;

          if (ct === CameraType.FPS || ct === CameraType.SATELLITE_FIRST_PERSON || ct === CameraType.ASTRONOMY) {
 return;
}
          this.bottomMenuClicked();
        },
      },
    ];
  }

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  onBottomIconClick(): void {
    if (!this.isMenuButtonActive) {
      return;
    }
    this.populateSideMenu_();
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'editSat-menu',
      title: t7e('plugins.EditSat.title' as T7eKey),
      html: this.buildSideMenuHtml_(),
      dragOptions: {
        isDraggable: true,
        minWidth: 320,
        maxWidth: 500,
      },
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.EditSat.title' as T7eKey),
      body: t7e('plugins.EditSat.helpBody' as T7eKey),
    };
  }

  // =========================================================================
  // Context menu (legacy properties + bridge)
  // =========================================================================

  isRmbOnSat = true;
  rmbMenuOrder = 2;
  rmbL1ElementName = 'edit-rmb';
  rmbL1Html = html`
  <li class="rmb-menu-item" id=${this.rmbL1ElementName}><a href="#">${t7e('plugins.EditSat.contextMenu.editSat' as T7eKey)} &#x27A4;</a></li>`;

  rmbCallback = (targetId: string, clickedSat?: number): void => {
    this.onContextMenuAction_(targetId, clickedSat);
  };

  protected onContextMenuAction_(targetId: string, clickedSatId?: number): void {
    if (typeof clickedSatId === 'undefined' || clickedSatId === null) {
      throw new Error('clickedSat is undefined');
    }

    switch (targetId) {
      case 'set-pri-sat-rmb':
        this.selectSatManager_.selectSat(clickedSatId);
        break;
      case 'set-sec-sat-rmb':
        this.selectSatManager_.setSecondarySat(clickedSatId);
        break;
      case 'edit-sat-rmb':
        this.selectSatManager_.selectSat(clickedSatId);
        if (!this.isMenuButtonActive) {
          ServiceLocator.getUiManager().bottomIconPress(<HTMLElement>{ id: this.bottomIconElementName });
        }
        break;
      default:
        break;
    }
  }

  rmbL2ElementName = 'edit-rmb-menu';
  rmbL2Html = html`
    <ul class='dropdown-contents'>
      <li id="set-pri-sat-rmb"><a href="#">${t7e('plugins.EditSat.contextMenu.setPrimarySat' as T7eKey)}</a></li>
      <li id="set-sec-sat-rmb"><a href="#">${t7e('plugins.EditSat.contextMenu.setSecondarySat' as T7eKey)}</a></li>
      <li id="edit-sat-rmb"><a href="#">${t7e('plugins.EditSat.contextMenu.editSatellite' as T7eKey)}</a></li>
    </ul>`;

  // =========================================================================
  // HTML
  // =========================================================================

  protected buildSideMenuHtml_(): string {
    const p = EditSat.elementPrefix;
    const l = (key: string) => t7e(`plugins.EditSat.labels.${key}` as T7eKey);
    const b = (key: string) => t7e(`plugins.EditSat.buttons.${key}` as T7eKey);

    return html`
      <div class="row">
        <form id="editSat-menu-form">
          <div class="input-field col s12">
            <input disabled value="AAAAA" id="${p}-scc" type="text" maxlength="9" />
            <label for="disabled" class="active">${l('scc')}</label>
          </div>
          <div class="input-field col s12">
            <input placeholder="Unknown" id="${p}-country" type="text" />
            <label for="${p}-country" class="active">${l('country')}</label>
          </div>
          <div class="input-field col s12">
            <input placeholder="AA" id="${p}-year" type="text" maxlength="2" />
            <label for="${p}-year" class="active">${l('epochYear')}</label>
          </div>
          <div class="input-field col s12">
            <input placeholder="AAA.AAAAAAAA" id="${p}-day" type="text" maxlength="12" />
            <label for="${p}-day" class="active">${l('epochDay')}</label>
          </div>
          <div class="input-field col s12">
            <input placeholder="AAA.AAAA" id="${p}-inc" type="text" maxlength="8" />
            <label for="${p}-inc" class="active">${l('inclination')}</label>
          </div>
          <div class="input-field col s12">
            <input placeholder="AAA.AAAA" id="${p}-rasc" type="text" maxlength="8" />
            <label for="${p}-rasc" class="active">${l('rightAscension')}</label>
          </div>
          <div class="input-field col s12">
            <input placeholder="AAAAAAA" id="${p}-ecen" type="text" maxlength="7" />
            <label for="${p}-ecen" class="active">${l('eccentricity')}</label>
          </div>
          <div class="input-field col s12">
            <input placeholder="AA.AAAAAAAA" id="${p}-argPe" type="text" maxlength="8" />
            <label for="${p}-argPe" class="active">${l('argOfPerigee')}</label>
          </div>
          <div class="input-field col s12">
            <input placeholder="AAA.AAAA" id="${p}-meana" type="text" maxlength="8" />
            <label for="${p}-meana" class="active">${l('meanAnomaly')}</label>
          </div>
          <div class="input-field col s12">
            <input placeholder="AA.AAAAA" id="${p}-meanmo" type="text" maxlength="11" />
            <label for="${p}-meanmo" class="active">${l('meanMotion')}</label>
          </div>
          <div class="input-field col s12">
            <input placeholder="" id="${p}-per" type="text" maxlength="11" />
            <label for="${p}-per" class="active">${l('period')}</label>
          </div>
          <div class="center-align row">
            <button id="editSat-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">${b('updateSatellite')} &#9658;</button>
          </div>
          <div class="center-align row">
            <button id="editSat-newTLE" class="btn btn-ui waves-effect waves-light" type="button" name="action">${b('updateEpoch')} &#9658;</button>
          </div>
          <div class="center-align row">
            <button id="editSat-save" class="btn btn-ui waves-effect waves-light" type="button" name="action">${b('saveTle')} &#9658;</button>
          </div>
          <div class="center-align row">
            <button id="editSat-open" class="btn btn-ui waves-effect waves-light" type="button" name="action">${b('loadTle')} &#9658;</button>
            <input id="editSat-file" class="start-hidden" type="file" name="files[]" />
          </div>
        </form>
      </div>
      <div id="${p}-error" class="center-align menu-selectable start-hidden">
        <h6 class="center-align">${l('error')}</h6>
      </div>
    `;
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  protected uiManagerFinal_(): void {
    const p = EditSat.elementPrefix;

    getEl('editSat-newTLE')!.addEventListener('click', this.editSatNewTleClick_.bind(this));

    getEl('editSat-menu-form')!.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      EditSat.editSatSubmit_();
    });

    getEl(`${p}-per`)!.addEventListener('change', () => {
      const per = (<HTMLInputElement>getEl(`${p}-per`)).value;

      if (per === '') {
        return;
      }
      const meanmo = 1440 / parseFloat(per);

      (<HTMLInputElement>getEl(`${p}-meanmo`)).value = meanmo.toFixed(4);
    });

    getEl(`${p}-meanmo`)!.addEventListener('change', () => {
      const meanmo = (<HTMLInputElement>getEl(`${p}-meanmo`)).value;

      if (meanmo === '') {
        return;
      }
      const per = (1440 / parseFloat(meanmo)).toFixed(4);

      (<HTMLInputElement>getEl(`${p}-per`)).value = per;
    });

    getEl('editSat-save')!.addEventListener('click', EditSat.editSatSaveClick_);

    getEl('editSat-open')!.addEventListener('click', () => {
      ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
      getEl('editSat-file')!.click();
    });

    getEl('editSat-file')!.addEventListener('change', (evt: Event) => {
      if (!window.FileReader) {
        return;
      }
      EditSat.doReaderActions_(evt);
      evt.preventDefault();
    });

    getEl(`${p}-error`)!.addEventListener('click', () => {
      getEl(`${p}-error`)!.style.display = 'none';
    });
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
        } else if (this.isMenuButtonActive && obj.isSatellite() && (obj as Satellite).sccNum !== (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value) {
          this.populateSideMenu_();
        }
      },
    );
  }

  // =========================================================================
  // Form population (shared, single source of truth)
  // =========================================================================

  protected populateFormFields_(sat: Satellite): void {
    const p = EditSat.elementPrefix;

    (<HTMLInputElement>getEl(`${p}-scc`)).value = sat.sccNum;
    (<HTMLInputElement>getEl(`${p}-country`)).value = sat.country;

    const inc = sat.inclination.toFixed(4).padStart(8, '0');

    (<HTMLInputElement>getEl(`${p}-inc`)).value = StringPad.pad0(inc, 8);
    (<HTMLInputElement>getEl(`${p}-year`)).value = sat.tle1.substr(18, 2);
    (<HTMLInputElement>getEl(`${p}-day`)).value = sat.tle1.substr(20, 12);
    (<HTMLInputElement>getEl(`${p}-meanmo`)).value = sat.tle2.substr(52, 11);
    (<HTMLInputElement>getEl(`${p}-per`)).value = (1440 / parseFloat(sat.tle2.substr(52, 11))).toFixed(4);

    const rasc = sat.rightAscension.toFixed(4).padStart(8, '0');

    (<HTMLInputElement>getEl(`${p}-rasc`)).value = rasc;
    (<HTMLInputElement>getEl(`${p}-ecen`)).value = sat.eccentricity.toFixed(7).substr(2, 7);

    const argPe = sat.argOfPerigee.toFixed(4).padStart(8, '0');

    (<HTMLInputElement>getEl(`${p}-argPe`)).value = StringPad.pad0(argPe, 8);
    (<HTMLInputElement>getEl(`${p}-meana`)).value = sat.tle2.substr(44 - 1, 7 + 1);
  }

  private populateSideMenu_() {
    const obj = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);

    if (!obj?.isSatellite()) {
      return;
    }

    this.populateFormFields_(obj as Satellite);
  }

  // =========================================================================
  // Update Epoch to Now
  // =========================================================================

  private editSatNewTleClick_() {
    showLoading(this.editSatNewTleClickFadeIn_.bind(this));
  }

  private editSatNewTleClickFadeIn_() {
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const uiManagerInstance = ServiceLocator.getUiManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    try {
      const id = catalogManagerInstance.sccNum2Id(parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value));
      const obj = catalogManagerInstance.getObject(id);

      if (!obj?.isSatellite()) {
        return;
      }

      const mainsat = obj as Satellite;
      const gmst = timeManagerInstance.gmst;
      const lla = eci2lla(mainsat.position, gmst);
      const launchLon = lla.lon;
      const launchLat = lla.lat;
      const alt = lla.alt;

      const upOrDown = SatMath.getDirection(mainsat, timeManagerInstance.simulationTimeObj);

      if (upOrDown === 'Error') {
        uiManagerInstance.toast(t7e('plugins.EditSat.errorMsgs.cannotCalculateDirection' as T7eKey), ToastMsgType.caution);
      }

      const simulationTimeObj = timeManagerInstance.simulationTimeObj;
      const currentEpoch = TimeManager.currentEpoch(simulationTimeObj);

      mainsat.tle1 = (mainsat.tle1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.tle1.substr(32)) as TleLine1;

      ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

      let tles;

      if (mainsat.apogee - mainsat.perigee < 300) {
        tles = new OrbitFinder(mainsat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj).rotateOrbitToLatLon();
      } else {
        tles = new OrbitFinder(mainsat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj, alt).rotateOrbitToLatLon();
      }

      const tle1 = tles[0];
      const tle2 = tles[1];

      if (tle1 === 'Error') {
        uiManagerInstance.toast(`${tle2}`, ToastMsgType.critical, true);

        return;
      }

      if (id === null) {
        return;
      }

      catalogManagerInstance.satCruncherThread.sendSatEdit(id, tle1, tle2);
      const orbitManagerInstance = ServiceLocator.getOrbitManager();

      orbitManagerInstance.changeOrbitBufferData(id, tle1, tle2);

      // Reload menu with new TLE
      const obj2 = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);

      if (!obj2.isSatellite()) {
        return;
      }

      this.populateFormFields_(obj2 as Satellite);
    } catch (error) {
      errorManagerInstance.warn(error);
    }
  }

  // =========================================================================
  // Submit edited TLE
  // =========================================================================

  protected static editSatSubmit_() {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const p = EditSat.elementPrefix;

    getEl(`${p}-error`)!.style.display = 'none';
    const scc = (<HTMLInputElement>getEl(`${p}-scc`)).value;
    const satId = catalogManagerInstance.sccNum2Id(parseInt(scc));

    if (satId === null) {
      errorManagerInstance.info(t7e('plugins.EditSat.errorMsgs.notRealSatellite' as T7eKey));

      return;
    }

    const obj = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY);

    if (!obj?.isSatellite()) {
      return;
    }

    const sat = obj as Satellite;
    const country = (<HTMLInputElement>getEl(`${p}-country`)).value;
    const intl = sat.tle1.substr(9, 8);
    const inc = <StringifiedNumber>(<HTMLInputElement>getEl(`${p}-inc`)).value;
    const meanmo = <StringifiedNumber>(<HTMLInputElement>getEl(`${p}-meanmo`)).value;
    const rasc = <StringifiedNumber>(<HTMLInputElement>getEl(`${p}-rasc`)).value;
    const ecen = (<HTMLInputElement>getEl(`${p}-ecen`)).value;
    const argPe = <StringifiedNumber>(<HTMLInputElement>getEl(`${p}-argPe`)).value;
    const meana = <StringifiedNumber>(<HTMLInputElement>getEl(`${p}-meana`)).value;
    const epochyr = (<HTMLInputElement>getEl(`${p}-year`)).value;
    const epochday = (<HTMLInputElement>getEl(`${p}-day`)).value;

    const { tle1, tle2 } = FormatTle.createTle({ sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc });

    let satrec: SatelliteRecord;

    try {
      satrec = Sgp4.createSatrec(tle1, tle2);
    } catch (e) {
      errorManagerInstance.error(e, 'edit-sat.ts', 'Error creating satellite record!');

      return;
    }

    if (SatMath.altitudeCheck(satrec, ServiceLocator.getTimeManager().simulationTimeObj) > 1) {
      catalogManagerInstance.satCruncherThread.sendSatEdit(satId, tle1, tle2, true);
      const orbitManagerInstance = ServiceLocator.getOrbitManager();

      orbitManagerInstance.changeOrbitBufferData(satId, tle1, tle2);
      sat.active = true;
      sat.editTle(tle1, tle2);
      sat.country = country;
      ServiceLocator.getMainCamera().state.zoomTarget = ZoomValue.GEO;
    } else {
      ServiceLocator.getUiManager().toast(
        t7e('plugins.EditSat.errorMsgs.failedToPropagate' as T7eKey),
        ToastMsgType.caution,
        true,
      );
    }
  }

  // =========================================================================
  // Save / Load TLE
  // =========================================================================

  protected static editSatSaveClick_(e: Event) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    ServiceLocator.getSoundManager()?.play(SoundNames.EXPORT);

    try {
      const scc = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value;
      const satId = catalogManagerInstance.sccNum2Id(parseInt(scc));
      const sat = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY) as Satellite;
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
      errorManagerInstance.warn(error);
    }
    e.preventDefault();
  }

  private static doReaderActions_(evt: Event) {
    try {
      const reader = new FileReader();

      reader.onload = EditSat.readerOnLoad_;
      const eventTarget = evt.target as HTMLInputElement;

      reader.readAsText(eventTarget.files![0]);
    } catch (e) {
      errorManagerInstance.error(e, 'edit-sat.ts', 'Error reading file!');
    }
  }

  private static readerOnLoad_(evt: Event) {
    const eventTarget = evt.target as FileReader;

    if (eventTarget.readyState !== 2) {
      return;
    }
    if (eventTarget.error) {
      errorManagerInstance.warn(t7e('plugins.EditSat.errorMsgs.errorReadingFile' as T7eKey));

      return;
    }

    const timeManagerInstance = ServiceLocator.getTimeManager();
    const orbitManagerInstance = ServiceLocator.getOrbitManager();
    const uiManagerInstance = ServiceLocator.getUiManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    const object = JSON.parse(<string>eventTarget.result);
    // Prefer the canonical sccNum from the file; fall back to the TLE column for
    // legacy exports without it. The TLE column only carries 5 chars and loses
    // identity for extended (7+ digit) catalog numbers.
    const sccNumStr = typeof object.sccNum === 'string' || typeof object.sccNum === 'number'
      ? String(object.sccNum)
      : StringPad.pad0(object.tle1.substr(2, 5).trim(), 5);
    const sat = catalogManagerInstance.sccNum2Sat(sccNumStr);

    if (!sat) {
      errorManagerInstance.warn(t7e('plugins.EditSat.errorMsgs.satelliteNotFound' as T7eKey).replace('{sccNum}', sccNumStr));

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
      catalogManagerInstance.satCruncherThread.sendSatEdit(sat.id, object.tle1, object.tle2, true);
      orbitManagerInstance.changeOrbitBufferData(sat.id, object.tle1, object.tle2);
      sat.active = true;
    } else {
      uiManagerInstance.toast(
        t7e('plugins.EditSat.errorMsgs.failedToPropagate' as T7eKey),
        ToastMsgType.caution,
        true,
      );
    }
  }
}
