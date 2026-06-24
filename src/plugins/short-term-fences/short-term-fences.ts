import { MenuMode } from '@app/engine/core/interfaces';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { slideInRight, slideOutLeft } from '@app/engine/utils/slide';
import bookmarkRemovePng from '@public/img/icons/bookmark-remove.png';
import viewListPng from '@public/img/icons/view-list.png';
import wifiFindPng from '@public/img/icons/wifi-find.png';

import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SoundNames } from '@app/engine/audio/sounds';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import { BaseObject, Degrees, EpochUTC, Kilometers, eci2rae } from '@ootk/src/main';
import { ClickDragOptions, KeepTrackPlugin, SideMenuSettingsOptions } from '../../engine/plugins/base-plugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { buildStfSensorParams, computeExtentKm, STF_MAX_EXTENT_DEG, validateStfForm } from './short-term-fences-core';
import { renderStfList } from './short-term-fences-list-renderer';
import './short-term-fences.css';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.ShortTermFences.${key}` as Parameters<typeof t7e>[0]);

export class ShortTermFences extends KeepTrackPlugin {
  readonly id = 'ShortTermFences';
  dependencies_: string[] = [SatInfoBox.name, SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;
  /** Monotonic counter so each fence gets a stable, unique STF-N name. */
  private stfCounter_ = 0;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  bottomIconImg = wifiFindPng;
  isRequireSensorSelected = true;
  isIconDisabledOnLoad = true;

  dragOptions: ClickDragOptions = {
    minWidth: 600,
    maxWidth: 1000,
    isDraggable: true,
  };

  menuMode: MenuMode[] = [MenuMode.CREATE, MenuMode.ALL];

  /**
   * Fires after the bottom icon toggles the menu. When the menu has just opened,
   * recompute the km extents (which depend on the live sensor geometry) and
   * refresh the Active Fences list so both reflect current state on open.
   */
  bottomIconCallback = (): void => {
    if (this.isMenuButtonActive) {
      this.updateExtentKmFields_();
      this.refreshActiveFences_();
    }
  };

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/short-term-fences/short-term-fences-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: l('help.fieldsHeading'),
          content: l('help.fields'),
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2')],
    };
  }

  sideMenuElementName = 'stf-menu';
  sideMenuElementHtml: string = html`
  <div id="stf-menu" class="side-menu-parent start-hidden kt-ui-v13">
    <div id="stf-content" class="side-menu">
      <form id="stf-menu-form">
        <section class="kt-section">
          <div class="kt-section-label">${l('sections.azimuth')}</div>
          <div class="kt-field-row">
            <div id="stf-az-div" class="input-field col s4" data-position="top" data-delay="50" data-tooltip="${l('tooltips.centerAzimuth')}">
              <input id="stf-az" type="text" value="50" />
              <label for="stf-az" class="active">${l('labels.centerAzimuth')}</label>
            </div>
            <div id="stf-azExt-div" class="input-field col s4" data-position="top" data-delay="50" data-tooltip="${l('tooltips.azimuthExtentDeg')}">
              <input id="stf-azExt" type="text" value="4" />
              <label for="stf-azExt" class="active">${l('labels.azimuthExtentDeg')}</label>
            </div>
            <div id="stf-azExtKm-div" class="input-field col s4" data-position="top" data-delay="50" data-tooltip="${l('tooltips.azimuthExtentKm')}">
              <input id="stf-azExtKm" type="text" value="4" disabled/>
              <label for="stf-azExtKm" class="active">${l('labels.azimuthExtentKm')}</label>
            </div>
          </div>
        </section>
        <section class="kt-section">
          <div class="kt-section-label">${l('sections.elevation')}</div>
          <div class="kt-field-row">
            <div id="stf-el-div" class="input-field col s4" data-position="top" data-delay="50" data-tooltip="${l('tooltips.centerElevation')}">
              <input id="stf-el" type="text" value="20" />
              <label for="stf-el" class="active">${l('labels.centerElevation')}</label>
            </div>
            <div id="stf-elExt-div" class="input-field col s4" data-position="top" data-delay="50" data-tooltip="${l('tooltips.elevationExtentDeg')}">
              <input id="stf-elExt" type="text" value="4" />
              <label for="stf-elExt" class="active">${l('labels.elevationExtentDeg')}</label>
            </div>
            <div id="stf-elExtKm-div" class="input-field col s4" data-position="top" data-delay="50" data-tooltip="${l('tooltips.elevationExtentKm')}">
              <input id="stf-elExtKm" type="text" value="4" disabled/>
              <label for="stf-elExtKm" class="active">${l('labels.elevationExtentKm')}</label>
            </div>
          </div>
        </section>
        <section class="kt-section">
          <div class="kt-section-label">${l('sections.range')}</div>
          <div class="kt-field-row">
            <div id="stf-rng-div" class="input-field col s6" data-position="top" data-delay="50" data-tooltip="${l('tooltips.centerRange')}">
              <input id="stf-rng" type="text" value="1000" />
              <label for="stf-rng" class="active">${l('labels.centerRange')}</label>
            </div>
            <div id="stf-rngExt-div" class="input-field col s6" data-position="top" data-delay="50" data-tooltip="${l('tooltips.rangeExtent')}">
              <input id="stf-rngExt" type="text" value="100" />
              <label for="stf-rngExt" class="active">${l('labels.rangeExtent')}</label>
            </div>
          </div>
        </section>
        <button id="stf-submit" type="submit" class="kt-action waves-effect">
          <span class="kt-action-label">${l('buttons.createNewStf')}</span>
        </button>
        <button id="stf-remove-last" type="button" class="kt-action waves-effect">
          <span class="kt-action-label">${l('buttons.removeLast')}</span>
        </button>
        <button id="stf-clear-all" type="button" class="kt-action waves-effect">
          <span class="kt-action-label">${l('buttons.clearAllStfs')}</span>
        </button>
      </form>
    </div>
  </div>`;

  // A list of active fences, not a settings panel, so use a list icon over the default gear.
  secondaryMenuIcon = viewListPng;
  sideMenuSecondaryHtml: string = html`
    <div class="stf-secondary-body">
      <section class="kt-section">
        <div class="kt-section-label">${l('fenceList.activeFences')}</div>
        <div id="stf-active-list"></div>
      </section>
    </div>`;
  sideMenuSecondaryOptions: SideMenuSettingsOptions = {
    width: 400,
    leftOffset: null,
    zIndex: 3,
  };

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj: BaseObject) => {
        // Skip this if there is no satellite object because the menu isn't open
        if (!obj?.isSatellite()) {
          hideEl('stf-on-object-link');

          return;
        }

        // Guard on element presence (not a once-only boolean) so the link is
        // re-created if the sat-info-box DOM is rebuilt under it.
        if (PluginRegistry.getPlugin(SatInfoBox) && !getEl('stf-on-object-link', true)) {
          getEl('actions-section')?.insertAdjacentHTML(
            'beforeend',
            html`
            <div id="stf-on-object-link" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
                  data-tooltip="${l('tooltips.buildOnObject')}">${l('links.buildOnObject')}</div>
            `,
          );
          getEl('stf-on-object-link')?.addEventListener('click', this.stfOnObjectLinkClick_.bind(this));
        }

        showEl('stf-on-object-link');
      },
    );
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl(`${this.sideMenuElementName}-secondary`, true)?.classList.add('kt-ui-v13');

        getEl('stf-menu-form')?.addEventListener('submit', (e: Event) => {
          e.preventDefault();
          ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
          this.onSubmit_();
        });
        getEl('stf-remove-last')?.addEventListener('click', () => {
          ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
          ServiceLocator.getSensorManager().removeStf();
          this.refreshActiveFences_();
        });
        getEl('stf-clear-all')?.addEventListener('click', () => {
          ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
          ServiceLocator.getSensorManager().clearStf();
          this.refreshActiveFences_();
        });

        // Per-row remove inside the Active Fences list (one delegated listener
        // against the stable container; rows are rebuilt on every change).
        getEl('stf-active-list', true)?.addEventListener('click', (e: Event) => {
          const removeBtn = (e.target as HTMLElement)?.closest('.remove-fence') as HTMLElement | null;

          if (!removeBtn) {
            return;
          }
          const sensorManager = ServiceLocator.getSensorManager();
          const fence = sensorManager.stfSensors.find((s) => s.objName === removeBtn.dataset.id);

          if (fence) {
            ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
            sensorManager.removeStf(fence);
            this.refreshActiveFences_();
          }
        });

        // Recompute the km extents whenever any input the formula depends on
        // changes (not just the extent fields), and clamp over-wide extents.
        for (const id of ['stf-az', 'stf-el', 'stf-rng', 'stf-azExt', 'stf-elExt']) {
          getEl(id)?.addEventListener('change', () => this.updateExtentKmFields_());
          getEl(id)?.addEventListener('blur', () => this.updateExtentKmFields_());
        }

        // Render the (likely empty-state) list once so the panel is never blank.
        this.refreshActiveFences_();
      },
    );

    EventBus.getInstance().on(EventBusEvent.resetSensor, this.closeAndDisable_.bind(this));

    EventBus.getInstance().on(
      EventBusEvent.setSensor,
      (sensor, id): void => {
        if (sensor === null && id === null) {
          this.closeAndDisable_();
          slideOutLeft(getEl(this.sideMenuElementName), 300);
        } else {
          this.setBottomIconToEnabled();
        }
      },
    );
  }

  private closeAndDisable_(): void {
    this.isMenuButtonActive = false;
    this.setBottomIconToUnselected();
    this.setBottomIconToDisabled();
    ServiceLocator.getUiManager().hideSideMenus();
    this.refreshActiveFences_();
  }

  /**
   * Recompute and write the read-only km extent fields from the current form
   * values. Clamps the angular extents to the legal window as a side effect so
   * an over-wide value is corrected even if the user never blurs the field.
   */
  private updateExtentKmFields_(): void {
    const curSensor = ServiceLocator.getSensorManager().currentSensors[0];

    if (!curSensor) {
      return;
    }

    const az = parseFloat((<HTMLInputElement>getEl('stf-az')).value);
    const el = parseFloat((<HTMLInputElement>getEl('stf-el')).value);
    const rng = parseFloat((<HTMLInputElement>getEl('stf-rng')).value);

    if (![az, el, rng].every((v) => Number.isFinite(v))) {
      return;
    }

    const azExtEl = <HTMLInputElement>getEl('stf-azExt');
    const elExtEl = <HTMLInputElement>getEl('stf-elExt');
    let azExt = parseFloat(azExtEl.value);
    let elExt = parseFloat(elExtEl.value);

    if (azExt > STF_MAX_EXTENT_DEG) {
      azExt = STF_MAX_EXTENT_DEG;
      azExtEl.value = azExt.toFixed(1);
    }
    if (elExt > STF_MAX_EXTENT_DEG) {
      elExt = STF_MAX_EXTENT_DEG;
      elExtEl.value = elExt.toFixed(1);
    }

    const epoch = EpochUTC.fromDateTime(ServiceLocator.getTimeManager().simulationTimeObj);
    const siteJ2000 = curSensor.toGeodetic().toITRF(epoch).toJ2000();

    if (Number.isFinite(azExt)) {
      (<HTMLInputElement>getEl('stf-azExtKm')).value = computeExtentKm(epoch, siteJ2000, az, el, rng, azExt, 'az').toFixed(1);
    }
    if (Number.isFinite(elExt)) {
      (<HTMLInputElement>getEl('stf-elExtKm')).value = computeExtentKm(epoch, siteJ2000, az, el, rng, elExt, 'el').toFixed(1);
    }
  }

  /**
   * Fires when the secondary (Active Fences) panel opens. Re-render so the list
   * reflects any fences created/removed while the panel was closed.
   */
  onSecondaryMenuOpen(): void {
    this.refreshActiveFences_();
  }

  /** Rebuild the Active Fences list (secondary panel) from the current fences. */
  private refreshActiveFences_(): void {
    const listEl = getEl('stf-active-list', true);

    if (!listEl) {
      return;
    }

    const fences = ServiceLocator.getSensorManager().stfSensors;
    const fl = (key: string): string => l(`fenceList.${key}`);

    // Write synchronously (not via the rIC-deferred setInnerHtml) so the list
    // updates the instant a fence is added/removed.
    listEl.innerHTML = renderStfList(fences, fl, bookmarkRemovePng);
  }

  private onSubmit_() {
    if (!this.verifySensorSelected()) {
      return;
    }

    const sensorManager = ServiceLocator.getSensorManager();
    const validation = validateStfForm({
      az: (<HTMLInputElement>getEl('stf-az')).value,
      azExt: (<HTMLInputElement>getEl('stf-azExt')).value,
      el: (<HTMLInputElement>getEl('stf-el')).value,
      elExt: (<HTMLInputElement>getEl('stf-elExt')).value,
      rng: (<HTMLInputElement>getEl('stf-rng')).value,
      rngExt: (<HTMLInputElement>getEl('stf-rngExt')).value,
    });

    if (!validation.ok) {
      errorManagerInstance.warn(l(validation.errorKey));

      return;
    }

    const curSensor = sensorManager.currentSensors[0];
    const params = buildStfSensorParams(validation.values, { lat: curSensor.lat, lon: curSensor.lon, alt: curSensor.alt }, this.stfCounter_ + 1);
    const stfSensor = new DetailedSensor(params);

    if (
      !curSensor.isRaeInFov(params.minAz as Degrees, params.minEl as Degrees, params.minRng as Kilometers) ||
      !curSensor.isRaeInFov(params.maxAz as Degrees, params.maxEl as Degrees, params.maxRng as Kilometers)
    ) {
      errorManagerInstance.warn(l('errorMsgs.stfNotInView'));

      return;
    }

    this.stfCounter_++;
    sensorManager.addStf(stfSensor);
    this.refreshActiveFences_();
    this.openActiveFencesPanel_();
  }

  /** Open the secondary (Active Fences) panel if it is not already showing. */
  private openActiveFencesPanel_(): void {
    if (this.isSideMenuSettingsOpen) {
      return;
    }
    this.openSecondaryMenu();

    const secondaryButton = getEl(`${this.sideMenuElementName}-secondary-btn`, true);

    if (secondaryButton) {
      secondaryButton.style.color = 'var(--statusDarkNormal)';
    }
  }

  private stfOnObjectLinkClick_() {
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    if (!this.verifySensorSelected()) {
      return;
    }
    if (!this.verifySatelliteSelected()) {
      return;
    }

    const now = ServiceLocator.getTimeManager().simulationTimeObj;

    if (!this.selectSatManager_) {
      errorManagerInstance.warn(l('errorMsgs.noSelectSatManager'));

      return;
    }

    const rae = eci2rae(now, this.selectSatManager_.primarySatObj.position, sensorManagerInstance.currentSensors[0]);

    (<HTMLInputElement>getEl('stf-az')).value = rae.az.toFixed(1);
    (<HTMLInputElement>getEl('stf-el')).value = rae.el.toFixed(1);
    (<HTMLInputElement>getEl('stf-rng')).value = rae.rng.toFixed(1);
    this.updateExtentKmFields_();

    ServiceLocator.getUiManager().hideSideMenus();
    slideInRight(getEl('stf-menu'), 300);
    this.isMenuButtonActive = true;
    this.setBottomIconToSelected();
  }
}
