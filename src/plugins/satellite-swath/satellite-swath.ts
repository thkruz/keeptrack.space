/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2026 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  ICommandPaletteCommand,
  IconPlacement,
  IHelpConfig,
  IKeyboardShortcut,
  ISettingsContribution,
  ISettingsContributor,
  UtilityGroup,
} from '@app/engine/plugins/core/plugin-capabilities';
import { initMaterialSelects, syncMaterialSelect } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { slideInRight, slideOutLeft } from '@app/engine/utils/slide';
import { t7e } from '@app/locales/keys';
import { SettingsManager } from '@app/settings/settings';
import { BaseObject, Satellite } from '@ootk/src/main';
import leftPanelClosePng from '@public/img/icons/left-panel-close.png';
import satelliteFovPng from '@public/img/icons/satellite-fov.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import {
  applyPreset,
  defaultSwathSettings,
  isSwathBeyondHorizon,
  maxSwathWidthKm,
  nadirWidthKm,
  resolveFovDeg,
  SatelliteSwathSettings,
  SWATH_LIMITS,
  SWATH_PRESET_IDS,
  SwathPresetId,
  SwathSettingsStore,
  toSwathParams,
} from './satellite-swath-core';
import './satellite-swath.css';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.SatelliteSwath.${key}` as Parameters<typeof t7e>[0]);

const MENU_ID = 'satellite-swath-menu';
const PRESET_LABEL_KEYS: Record<SwathPresetId, string> = { 'hr-eo': 'presets.hrEo', 'mr-eo': 'presets.mrEo', wide: 'presets.wide', custom: 'presets.custom' };

/**
 * Ground swath layer for the selected satellite: an opaque nadir strip and a translucent
 * field-of-regard strip along the drawn orbit, dimmed (or hidden) where the sub-point is dark,
 * plus a live fan from the satellite to the swath edges. The utility icon toggles the layer and
 * opens its settings menu; the layer stays on after the menu closes. Off by default.
 */
export class SatelliteSwath extends KeepTrackPlugin implements ISettingsContributor {
  readonly id = 'SatelliteSwath';
  dependencies_ = [SelectSatManager.name];
  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;

  /** Settings shown in the menu, for the satellite currently drawn. */
  private settings_: SatelliteSwathSettings = defaultSwathSettings();
  private store_: SwathSettingsStore | null = null;
  private isSettingsMenuOpen_ = false;
  /** sccNum of the satellite whose settings are loaded into the menu. */
  private loadedSccNum_: string | null = null;

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'satellite-swath-bottom-icon',
      label: l('bottomIconLabel'),
      image: satelliteFovPng,
      menuMode: [MenuMode.DISPLAY, MenuMode.ALL],
      isDisabledOnLoad: true,
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.LAYER_TOGGLE,
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        // Shift+W (Watchlist) and w (Watchlist filter) are taken; lowercase h ("swatH") is free.
        key: 'h',
        description: l('shortcuts.toggle'),
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'SatelliteSwath.toggle',
        label: l('commands.toggle'),
        category: 'Display',
        shortcutHint: 'H',
        callback: () => this.bottomMenuClicked(),
      },
      {
        id: 'SatelliteSwath.openSettings',
        label: l('commands.openSettings'),
        category: 'Display',
        callback: () => this.openSettingsMenu(),
      },
    ];
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        { heading: t7e('help.overview'), content: l('help.overview') },
        { heading: t7e('help.howToUse'), content: l('help.howToUse') },
      ],
      tips: [l('help.tip1'), l('help.tip2'), l('help.flatMap')],
      shortcuts: [{ keys: ['h'], description: l('shortcuts.toggle') }],
    };
  }

  getSettingsContribution(): ISettingsContribution {
    return {
      sectionId: this.id,
      sectionLabel: l('graphics.sectionLabel'),
      target: 'graphics',
      controls: [
        {
          type: 'toggle',
          id: 'drawSwath',
          label: l('graphics.drawSwath.label'),
          helpText: l('graphics.drawSwath.helpText'),
          isDisabled: () => !this.getSelectedSatellite_(),
          get: () => settingsManager.isDrawSwath,
          set: (next) => {
            if (next !== this.isMenuButtonActive) {
              this.bottomMenuClicked();
            }
          },
        },
        {
          type: 'toggle',
          id: 'fieldOfRegardFill',
          label: l('graphics.fieldOfRegardFill.label'),
          helpText: l('graphics.fieldOfRegardFill.helpText'),
          quality: { minLevel: 'medium' },
          get: () => settingsManager.isDrawSwathFieldOfRegard,
          set: (next) => {
            settingsManager.isDrawSwathFieldOfRegard = next;
            SettingsManager.preserveSettings();
            ServiceLocator.getScene()?.swathFactory?.refresh();
          },
        },
      ],
    };
  }

  addHtml(): void {
    super.addHtml();
    this.addSideMenu(SatelliteSwath.buildMenuHtml_());
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => this.uiManagerFinal_());
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.selectSatData, (obj: BaseObject) => this.onSelectSatData_(obj));
    EventBus.getInstance().on(EventBusEvent.hideSideMenus, () => this.closeSettingsMenu());
  }

  onBottomIconClick(): void {
    if (this.isMenuButtonActive) {
      this.on_();
    } else {
      this.off_();
    }
  }

  /** Base-class hook: the icon was deselected (satellite deselected or icon disabled). */
  onSetBottomIconToUnselected = (): void => {
    this.stopLayer_();
  };

  /** Settings currently applied to the drawn satellite (a copy). */
  get settings(): SatelliteSwathSettings {
    return { ...this.settings_ };
  }

  /**
   * Apply a preset to the current satellite: fills the form, persists it and rebuilds the
   * ribbon once.
   */
  selectPreset(presetId: SwathPresetId): void {
    this.updateSettings({ ...applyPreset(this.settings_, presetId) });
  }

  /** Replace the current satellite's settings, persist them and rebuild the ribbon once. */
  updateSettings(next: SatelliteSwathSettings): void {
    this.settings_ = { ...next };
    this.persistCurrent_();
    this.writeForm_();
    if (settingsManager.isDrawSwath) {
      const sat = this.getSelectedSatellite_();

      if (sat) {
        ServiceLocator.getScene().swathFactory.setParams(toSwathParams(this.settings_, SatelliteSwath.meanAltKm_(sat)));
      }
    }
  }

  openSettingsMenu(): void {
    if (this.isSettingsMenuOpen_) {
      return;
    }
    // Close every other side menu first; our own listener ignores it while we are closed.
    ServiceLocator.getUiManager().hideSideMenus();
    this.isSettingsMenuOpen_ = true;
    this.writeForm_();
    slideInRight(getEl(MENU_ID, true), 300);
  }

  closeSettingsMenu(): void {
    if (!this.isSettingsMenuOpen_) {
      return;
    }
    this.isSettingsMenuOpen_ = false;
    slideOutLeft(getEl(MENU_ID, true), 300);
  }

  /*
   * This plugin builds its own side menu (no sideMenuElementName, so the base class never
   * slides it or deselects the layer icon when another menu opens). Route the generic
   * side-menu entry points to the settings menu so callers that only know the base API
   * (command palette, tours, the locale-matrix tool) open and close the real menu instead
   * of the base no-op, which also cleared isMenuButtonActive while the layer stayed drawn.
   */
  openSideMenu(): void {
    this.openSettingsMenu();
  }

  closeSideMenu(): void {
    this.closeSettingsMenu();
  }

  get isSettingsMenuOpen(): boolean {
    return this.isSettingsMenuOpen_;
  }

  private on_(): void {
    const sat = this.getSelectedSatellite_();

    if (!sat) {
      this.setBottomIconToUnselected(false);

      return;
    }
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    settingsManager.isDrawSwath = true;
    this.loadSettingsFor_(sat);
    ServiceLocator.getScene().swathFactory.setTarget(sat.id, toSwathParams(this.settings_, SatelliteSwath.meanAltKm_(sat)));
    this.openSettingsMenu();
  }

  private off_(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    this.stopLayer_();
    this.closeSettingsMenu();
  }

  private stopLayer_(): void {
    settingsManager.isDrawSwath = false;
    ServiceLocator.getScene()?.swathFactory?.clear();
  }

  private onSelectSatData_(obj: BaseObject | null): void {
    if (!settingsManager.isDrawSwath) {
      return;
    }
    if (!(obj instanceof Satellite)) {
      // A missile or ground object: nothing to image from, but keep the toggle for the next satellite.
      ServiceLocator.getScene().swathFactory.setTarget(-1, null);

      return;
    }
    const factory = ServiceLocator.getScene().swathFactory;

    if (factory.targetId === obj.id) {
      return;
    }
    this.loadSettingsFor_(obj);
    factory.setTarget(obj.id, toSwathParams(this.settings_, SatelliteSwath.meanAltKm_(obj)));
  }

  private getSelectedSatellite_(): Satellite | null {
    const obj = PluginRegistry.getPlugin(SelectSatManager)?.getSelectedSat();

    return obj instanceof Satellite ? obj : null;
  }

  /** Mean altitude (km) from the element set; NaN for odd objects. */
  private static meanAltKm_(sat: Satellite): number {
    return (Number(sat.apogee) + Number(sat.perigee)) / 2;
  }

  private getStore_(): SwathSettingsStore {
    this.store_ ??= SwathSettingsStore.parse(PersistenceManager.getInstance().getItem(StorageKey.SATELLITE_SWATH_SETTINGS));

    return this.store_;
  }

  private loadSettingsFor_(sat: Satellite): void {
    this.loadedSccNum_ = sat.sccNum;
    this.settings_ = this.getStore_().get(sat.sccNum) ?? defaultSwathSettings();
    this.writeForm_();
  }

  private persistCurrent_(): void {
    const sat = this.getSelectedSatellite_();
    const scc = sat?.sccNum ?? this.loadedSccNum_;

    if (!scc) {
      return;
    }
    const store = this.getStore_();

    store.set(scc, this.settings_);
    PersistenceManager.getInstance().saveItem(StorageKey.SATELLITE_SWATH_SETTINGS, store.serialize());
  }

  // ---------------------------------------------------------------------------
  // Menu
  // ---------------------------------------------------------------------------

  private static buildMenuHtml_(): string {
    const presetOptions = SWATH_PRESET_IDS.map((id) => `<option value="${id}">${l(PRESET_LABEL_KEYS[id])}</option>`).join('');
    const num = (id: string, labelKey: string, lim: { min: number; max: number }, step: string) => html`
      <div class="kt-field-row" id="${id}-row">
        <div class="input-field col s12">
          <input id="${id}" type="number" min="${String(lim.min)}" max="${String(lim.max)}" step="${step}" />
          <label for="${id}" class="active">${l(labelKey)}</label>
        </div>
      </div>`;

    return html`
      <div id="${MENU_ID}" class="side-menu-parent start-hidden kt-ui-v13" style="z-index: 5;">
        <div id="${MENU_ID}-content" class="side-menu">
          <div class="side-menu-title-bar">
            <div class="side-menu-title-left"></div>
            <h5 class="side-menu-title-text">${l('title')}</h5>
            <div class="side-menu-title-right">
              <button id="${MENU_ID}-close-btn" class="center-align btn btn-ui waves-effect waves-light icon-btn" type="button">
                <img src="${leftPanelClosePng}" alt="Close" class="icon-btn-img" />
              </button>
            </div>
          </div>
          <form id="${MENU_ID}-form">
            <section class="kt-section">
              <div class="kt-section-label">${l('sections.sensor')}</div>
              <div class="kt-field-row">
                <div class="input-field col s12">
                  <select id="swath-preset">${presetOptions}</select>
                  <label for="swath-preset">${l('labels.preset')}</label>
                </div>
              </div>
              <div class="kt-field-row">
                <div class="input-field col s12">
                  <select id="swath-mode">
                    <option value="width">${l('labels.modeWidth')}</option>
                    <option value="fov">${l('labels.modeFov')}</option>
                  </select>
                  <label for="swath-mode">${l('labels.inputMode')}</label>
                </div>
              </div>
              ${num('swath-width-km', 'labels.swathWidthKm', SWATH_LIMITS.swathKm, '0.1')}
              ${num('swath-fov-deg', 'labels.fovDeg', SWATH_LIMITS.fovDeg, '0.01')}
              ${num('swath-max-off-nadir', 'labels.maxOffNadirDeg', SWATH_LIMITS.maxOffNadirDeg, '1')}
              ${num('swath-min-sun-elev', 'labels.minSunElevDeg', SWATH_LIMITS.minSunElevDeg, '1')}
              <div class="kt-note" id="swath-nadir-readout"></div>
              <div class="kt-note">${l('labels.presetsIllustrative')}</div>
            </section>
            <section class="kt-section">
              <div class="kt-section-label">${l('sections.display')}</div>
              <div class="switch swath-switch">
                <label for="swath-daylight-only">
                  <input id="swath-daylight-only" type="checkbox" />
                  <span class="lever"></span>
                  <span>${l('labels.daylightOnly')}</span>
                </label>
              </div>
            </section>
          </form>
        </div>
      </div>`;
  }

  private uiManagerFinal_(): void {
    const menu = getEl(MENU_ID, true);

    if (!menu) {
      return;
    }
    initMaterialSelects(menu);
    getEl(`${MENU_ID}-close-btn`, true)?.addEventListener('click', () => this.closeSettingsMenu());
    getEl('swath-preset', true)?.addEventListener('change', () => {
      this.selectPreset((getEl('swath-preset') as HTMLSelectElement).value as SwathPresetId);
    });
    const form = getEl(`${MENU_ID}-form`, true);

    form?.addEventListener('submit', (e) => e.preventDefault());
    form?.addEventListener('change', (e) => {
      if ((e.target as HTMLElement)?.id !== 'swath-preset') {
        this.onFormChange_();
      }
    });
    this.writeForm_();
  }

  /** Reads the form after a manual edit; any geometry edit turns the preset into Custom. */
  private onFormChange_(): void {
    const prev = this.settings_;
    const read = (id: string, lim: { min: number; max: number }, fallback: number): number => {
      const value = parseFloat((getEl(id, true) as HTMLInputElement | null)?.value ?? '');

      if (!Number.isFinite(value) || value < lim.min || value > lim.max) {
        ServiceLocator.getUiManager().toast(l('errorMsgs.outOfRange').replace('{min}', String(lim.min)).replace('{max}', String(lim.max)), ToastMsgType.caution);

        return fallback;
      }

      return value;
    };
    const next: SatelliteSwathSettings = {
      presetId: prev.presetId,
      mode: (getEl('swath-mode', true) as HTMLSelectElement | null)?.value === 'fov' ? 'fov' : 'width',
      swathKm: read('swath-width-km', SWATH_LIMITS.swathKm, prev.swathKm),
      fovDeg: read('swath-fov-deg', SWATH_LIMITS.fovDeg, prev.fovDeg),
      maxOffNadirDeg: read('swath-max-off-nadir', SWATH_LIMITS.maxOffNadirDeg, prev.maxOffNadirDeg),
      minSunElevDeg: read('swath-min-sun-elev', SWATH_LIMITS.minSunElevDeg, prev.minSunElevDeg),
      isDaylightOnly: (getEl('swath-daylight-only', true) as HTMLInputElement | null)?.checked ?? prev.isDaylightOnly,
    };

    this.rejectWidthBeyondHorizon_(next, prev);
    const isGeometryEdit =
      next.mode !== prev.mode ||
      next.swathKm !== prev.swathKm ||
      next.fovDeg !== prev.fovDeg ||
      next.maxOffNadirDeg !== prev.maxOffNadirDeg ||
      next.minSunElevDeg !== prev.minSunElevDeg;

    if (isGeometryEdit) {
      next.presetId = 'custom';
    }
    this.updateSettings(next);
  }

  /**
   * A width wider than the horizon-to-horizon arc has no line of sight (ootk's
   * fovFromSwathWidth returns NaN for it): keep the previous width and say why.
   */
  private rejectWidthBeyondHorizon_(next: SatelliteSwathSettings, prev: SatelliteSwathSettings): void {
    const sat = this.getSelectedSatellite_();
    const alt = sat ? SatelliteSwath.meanAltKm_(sat) : Number.NaN;

    if (next.swathKm === prev.swathKm || !isSwathBeyondHorizon(next, alt)) {
      return;
    }
    ServiceLocator.getUiManager().toast(l('errorMsgs.beyondHorizon').replace('{max}', maxSwathWidthKm(alt).toFixed(0)), ToastMsgType.caution);
    next.swathKm = prev.swathKm;
  }

  /** Pushes the current settings into the form (no change events fire). */
  private writeForm_(): void {
    const s = this.settings_;
    const setVal = (id: string, value: string): void => {
      const el = getEl(id, true) as HTMLInputElement | HTMLSelectElement | null;

      if (el) {
        el.value = value;
      }
    };
    const setChecked = (id: string, value: boolean): void => {
      const el = getEl(id, true) as HTMLInputElement | null;

      if (el) {
        el.checked = value;
      }
    };

    setVal('swath-preset', s.presetId);
    setVal('swath-mode', s.mode);
    setVal('swath-width-km', String(s.swathKm));
    setVal('swath-fov-deg', String(s.fovDeg));
    setVal('swath-max-off-nadir', String(s.maxOffNadirDeg));
    setVal('swath-min-sun-elev', String(s.minSunElevDeg));
    setChecked('swath-daylight-only', s.isDaylightOnly);
    for (const id of ['swath-preset', 'swath-mode']) {
      const select = getEl(id, true) as HTMLSelectElement | null;

      if (select) {
        syncMaterialSelect(select);
      }
    }
    getEl('swath-width-km-row', true)?.classList.toggle('swath-hidden', s.mode !== 'width');
    getEl('swath-fov-deg-row', true)?.classList.toggle('swath-hidden', s.mode !== 'fov');
    this.writeReadout_();
  }

  private writeReadout_(): void {
    const el = getEl('swath-nadir-readout', true);

    if (!el) {
      return;
    }
    const sat = this.getSelectedSatellite_();
    const alt = sat ? SatelliteSwath.meanAltKm_(sat) : Number.NaN;
    const width = nadirWidthKm(this.settings_, alt);

    el.textContent = Number.isFinite(width)
      ? l('labels.nadirReadout')
          .replace('{km}', width >= 100 ? width.toFixed(0) : width.toFixed(1))
          .replace('{fov}', resolveFovDeg(this.settings_, alt).toFixed(2))
      : l('labels.nadirReadoutUnknown');
  }
}
