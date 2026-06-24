import { CameraType } from '@app/engine/camera/camera-type';
import { SoundNames } from '@app/engine/audio/sounds';
import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
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
import { BaseObject, Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import editSatellitePng from '@public/img/icons/edit-satellite.png';
import { saveAs } from 'file-saver';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { wireInlineValidation } from '../create-sat/create-sat-validation';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { OrbitPreview } from '../shared/orbit-preview';
import {
  applyTleToSat,
  buildEditedTle,
  buildPreviewTleFromForm,
  buildSaveBlob,
  calculateDerivedParams,
  parseLoadedTle,
  pickZoomForApogee,
  reEpochToNow,
} from './edit-sat-actions';
import { buildEditSatHelp } from './edit-sat-help';
import { buildEditSatMenuHtml } from './edit-sat-menu-html';
import './edit-sat.css';

type T7eKey = Parameters<typeof t7e>[0];

/** Element fields that live inline validation applies to (read-only scc excluded). */
const VALIDATED_FIELDS = ['inc', 'rasc', 'ecen', 'argPe', 'meana', 'meanmo', 'per'] as const;

/** Element fields whose edits redraw the live preview / derived readout. */
const ELEMENT_FIELDS = ['inc', 'rasc', 'ecen', 'argPe', 'meana', 'meanmo', 'per', 'year', 'day'] as const;

export class EditSat extends KeepTrackPlugin {
  readonly id = 'EditSat';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  /** Live "ghost orbit" preview drawn while the user edits the element set. */
  private readonly orbitPreview_ = new OrbitPreview();

  /** Pristine TLE captured the first time each satellite is shown, for Reset. */
  private readonly originalTle_ = new Map<string, { tle1: TleLine1; tle2: TleLine2 }>();

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
      html: buildEditSatMenuHtml(),
      dragOptions: {
        isDraggable: true,
        minWidth: 320,
        maxWidth: 500,
      },
    };
  }

  getHelpConfig(): IHelpConfig {
    return buildEditSatHelp();
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
  // Lifecycle
  // =========================================================================

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
    // Drop the preview orbit whenever the side menu closes.
    EventBus.getInstance().on(EventBusEvent.hideSideMenus, () => this.orbitPreview_.clear());
  }

  protected uiManagerFinal_(): void {
    const p = EditSat.elementPrefix;

    // Opt the generated side-menu root into the v13 "FAANG card" styling.
    getEl('editSat-menu')?.classList.add('kt-ui-v13');

    getEl('editSat-newTLE')!.addEventListener('click', this.editSatNewTleClick_.bind(this));

    getEl('editSat-menu-form')!.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      this.editSatSubmit_();
    });

    this.wirePeriodMeanMotionConverters_();

    // Redraw the ghost orbit + derived readout as the element set changes.
    for (const id of ELEMENT_FIELDS) {
      getEl(`${p}-${id}`)?.addEventListener('input', this.onElementInput_);
    }

    getEl('editSat-reset')!.addEventListener('click', this.editSatReset_.bind(this));
    getEl('editSat-save')!.addEventListener('click', this.editSatSaveClick_.bind(this));

    getEl('editSat-open')!.addEventListener('click', () => {
      ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
      getEl('editSat-file')!.click();
    });

    getEl('editSat-file')!.addEventListener('change', (evt: Event) => {
      if (!window.FileReader) {
        return;
      }
      this.doReaderActions_(evt);
      evt.preventDefault();
    });

    getEl(`${p}-error`)!.addEventListener('click', () => this.hideError_());

    wireInlineValidation(p, VALIDATED_FIELDS);
  }

  /** Keep the Period and Mean Motion fields mutually consistent. */
  private wirePeriodMeanMotionConverters_(): void {
    const p = EditSat.elementPrefix;

    getEl(`${p}-per`)!.addEventListener('change', () => {
      const per = (<HTMLInputElement>getEl(`${p}-per`)).value;

      if (per === '') {
        return;
      }
      (<HTMLInputElement>getEl(`${p}-meanmo`)).value = (1440 / parseFloat(per)).toFixed(4);
      this.onElementInput_();
    });

    getEl(`${p}-meanmo`)!.addEventListener('change', () => {
      const meanmo = (<HTMLInputElement>getEl(`${p}-meanmo`)).value;

      if (meanmo === '') {
        return;
      }
      (<HTMLInputElement>getEl(`${p}-per`)).value = (1440 / parseFloat(meanmo)).toFixed(4);
      this.onElementInput_();
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

    // Capture the pristine orbit the first time we see this satellite, so Reset
    // can restore it after any number of session edits.
    if (!this.originalTle_.has(sat.sccNum)) {
      this.originalTle_.set(sat.sccNum, { tle1: sat.tle1, tle2: sat.tle2 });
    }

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
    // Mean anomaly occupies TLE2 columns 44-51 (0-indexed 43, length 8).
    (<HTMLInputElement>getEl(`${p}-meana`)).value = sat.tle2.substr(43, 8);

    this.hideError_();
    this.onElementInput_();
  }

  private populateSideMenu_(): void {
    const obj = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);

    if (!obj?.isSatellite()) {
      return;
    }

    this.populateFormFields_(obj as Satellite);
  }

  // =========================================================================
  // Live preview + derived parameters
  // =========================================================================

  /** Combined handler: refresh the calculated readout and the ghost orbit. */
  private onElementInput_ = (): void => {
    this.updateDerived_();
    this.updatePreview_();
  };

  /** Recompute the read-only apogee/perigee/period readout from the form. */
  private updateDerived_(): void {
    const p = EditSat.elementPrefix;
    const meanmo = parseFloat((<HTMLInputElement>getEl(`${p}-meanmo`)).value);
    const ecen = parseInt((<HTMLInputElement>getEl(`${p}-ecen`)).value, 10) / 1e7;

    if (isNaN(meanmo) || meanmo <= 0 || isNaN(ecen)) {
      return;
    }

    const derived = calculateDerivedParams(meanmo, ecen);
    const set = (suffix: string, value: string): void => {
      const el = getEl(`${p}-${suffix}`, true) as HTMLInputElement | null;

      if (el) {
        el.value = value;
      }
    };

    set('calc-apogee', derived.apogee.toFixed(1));
    set('calc-perigee', derived.perigee.toFixed(1));
    set('calc-period', derived.period.toFixed(2));
  }

  /** Redraw (or clear) the live ghost-orbit preview from the current form. */
  private updatePreview_(): void {
    const p = EditSat.elementPrefix;

    if (!this.isMenuButtonActive) {
      this.orbitPreview_.clear();

      return;
    }

    const read = (idSuffix: string): string => (getEl(`${p}-${idSuffix}`, true) as HTMLInputElement | null)?.value?.trim() ?? '';
    // Pass the selected satellite so the preview carries its drag terms (B*/ndot);
    // otherwise the dot drifts 1-2 km from the real satellite over the propagation
    // from epoch to now.
    const selected = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);
    const sat = selected?.isSatellite() ? (selected as Satellite) : undefined;
    const tle = buildPreviewTleFromForm(read, sat);

    if (tle) {
      this.orbitPreview_.update(tle.tle1, tle.tle2);
    } else {
      this.orbitPreview_.clear();
    }
  }

  // =========================================================================
  // Inline error region
  // =========================================================================

  private showError_(msg: string): void {
    const msgEl = getEl(`${EditSat.elementPrefix}-error-msg`, true);
    const errEl = getEl(`${EditSat.elementPrefix}-error`, true);

    if (msgEl) {
      msgEl.textContent = msg;
    }
    if (errEl) {
      errEl.style.display = 'block';
    }
  }

  private hideError_(): void {
    const errEl = getEl(`${EditSat.elementPrefix}-error`, true);

    if (errEl) {
      errEl.style.display = 'none';
    }
  }

  // =========================================================================
  // Update Epoch to Now
  // =========================================================================

  private editSatNewTleClick_(): void {
    showLoading(this.editSatNewTleClickFadeIn_.bind(this));
  }

  private editSatNewTleClickFadeIn_(): void {
    const uiManagerInstance = ServiceLocator.getUiManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    try {
      const id = catalogManagerInstance.sccNum2Id((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value.trim());

      if (id === null) {
        return;
      }

      const obj = catalogManagerInstance.getObject(id);

      if (!obj?.isSatellite()) {
        return;
      }

      const mainsat = obj as Satellite;

      ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

      const result = reEpochToNow(mainsat);

      if (!result.ok) {
        uiManagerInstance.toast(result.error, ToastMsgType.critical, true);

        return;
      }

      if (result.directionUnknown) {
        uiManagerInstance.toast(t7e('plugins.EditSat.errorMsgs.cannotCalculateDirection' as T7eKey), ToastMsgType.caution);
      }

      const country = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-country`)).value;
      const applied = applyTleToSat(id, result.tle1, result.tle2, country);

      if (applied !== 'applied') {
        uiManagerInstance.toast(t7e('plugins.EditSat.errorMsgs.failedToPropagate' as T7eKey), ToastMsgType.caution, true);

        return;
      }

      this.orbitPreview_.clear();
      this.populateFormFields_(mainsat);
    } catch (error) {
      errorManagerInstance.warn(error);
    }
  }

  // =========================================================================
  // Submit edited TLE
  // =========================================================================

  protected editSatSubmit_(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const p = EditSat.elementPrefix;

    this.hideError_();
    const scc = (<HTMLInputElement>getEl(`${p}-scc`)).value.trim();
    const satId = catalogManagerInstance.sccNum2Id(scc);

    if (satId === null) {
      this.showError_(t7e('plugins.EditSat.errorMsgs.notRealSatellite' as T7eKey));
      errorManagerInstance.info(t7e('plugins.EditSat.errorMsgs.notRealSatellite' as T7eKey));

      return;
    }

    const obj = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY);

    if (!obj?.isSatellite()) {
      return;
    }

    const sat = obj as Satellite;
    const v = (suffix: string): string => (<HTMLInputElement>getEl(`${p}-${suffix}`)).value;
    const { tle1, tle2 } = buildEditedTle(sat, {
      scc,
      inc: v('inc'),
      meanmo: v('meanmo'),
      rasc: v('rasc'),
      ecen: v('ecen'),
      argPe: v('argPe'),
      meana: v('meana'),
      epochyr: v('year'),
      epochday: v('day'),
    });

    const result = applyTleToSat(satId, tle1, tle2, v('country'));

    if (result === 'too-low') {
      this.showError_(t7e('plugins.EditSat.errorMsgs.failedToPropagate' as T7eKey));
      ServiceLocator.getUiManager().toast(t7e('plugins.EditSat.errorMsgs.failedToPropagate' as T7eKey), ToastMsgType.caution, true);

      return;
    }

    if (result === 'satrec-error') {
      this.showError_(t7e('plugins.EditSat.errorMsgs.failedToPropagate' as T7eKey));

      return;
    }

    this.orbitPreview_.clear();
    ServiceLocator.getMainCamera().state.zoomTarget = pickZoomForApogee(sat.apogee);
    this.populateFormFields_(sat);
  }

  // =========================================================================
  // Reset to original
  // =========================================================================

  protected editSatReset_(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const scc = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value.trim();
    const original = this.originalTle_.get(scc);

    if (!original) {
      return;
    }

    const satId = catalogManagerInstance.sccNum2Id(scc);

    if (satId === null) {
      return;
    }

    const result = applyTleToSat(satId, original.tle1, original.tle2);

    if (result !== 'applied') {
      return;
    }

    this.hideError_();
    this.orbitPreview_.clear();

    const obj = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY);

    if (obj?.isSatellite()) {
      this.populateFormFields_(obj as Satellite);
    }
  }

  // =========================================================================
  // Save / Load TLE
  // =========================================================================

  protected editSatSaveClick_(e: Event): void {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    ServiceLocator.getSoundManager()?.play(SoundNames.EXPORT);

    try {
      const scc = (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-scc`)).value.trim();
      const satId = catalogManagerInstance.sccNum2Id(scc);
      const sat = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY) as Satellite;
      const blob = new Blob([buildSaveBlob(sat)], {
        type: 'text/plain;charset=utf-8',
      });

      saveAs(blob, `${scc}.tle`);
    } catch (error) {
      errorManagerInstance.warn(error);
    }
    e.preventDefault();
  }

  private doReaderActions_(evt: Event): void {
    try {
      const reader = new FileReader();

      reader.onload = this.readerOnLoad_.bind(this);
      const eventTarget = evt.target as HTMLInputElement;

      reader.readAsText(eventTarget.files![0]);
    } catch (e) {
      errorManagerInstance.error(e, 'edit-sat.ts', 'Error reading file!');
    }
  }

  private readerOnLoad_(evt: Event): void {
    const eventTarget = evt.target as FileReader;

    if (eventTarget.readyState !== 2) {
      return;
    }
    if (eventTarget.error) {
      errorManagerInstance.warn(t7e('plugins.EditSat.errorMsgs.errorReadingFile' as T7eKey));

      return;
    }

    const uiManagerInstance = ServiceLocator.getUiManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    const parsed = parseLoadedTle(<string>eventTarget.result);

    if (!parsed) {
      errorManagerInstance.warn(t7e('plugins.EditSat.errorMsgs.errorReadingFile' as T7eKey));

      return;
    }

    const sat = catalogManagerInstance.sccNum2Sat(parsed.sccNum);

    if (!sat) {
      errorManagerInstance.warn(t7e('plugins.EditSat.errorMsgs.satelliteNotFound' as T7eKey).replace('{sccNum}', parsed.sccNum));

      return;
    }

    const result = applyTleToSat(sat.id, parsed.tle1, parsed.tle2);

    if (result !== 'applied') {
      uiManagerInstance.toast(
        t7e('plugins.EditSat.errorMsgs.failedToPropagate' as T7eKey),
        ToastMsgType.caution,
        true,
      );

      return;
    }

    this.orbitPreview_.clear();
    // Refresh the visible fields so the form reflects the freshly loaded orbit.
    this.populateFormFields_(sat as Satellite);
  }
}
