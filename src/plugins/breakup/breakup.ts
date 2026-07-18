import { CatalogManager } from '@app/app/data/catalog-manager';
import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  ICommandPaletteCapable,
  ICommandPaletteCommand,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite } from '@ootk/src/main';
import streamPng from '@public/img/icons/stream.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { BREAKUP_PRESETS, BreakupRawForm, DEFAULT_BREAKUP_PRESET, getBreakupPreset, parseBreakupParams } from './breakup-core';
import { clearBreakupPieces, runBreakup } from './breakup-runner';
import './breakup.css';

export interface BreakupParams {
  satId: number | null;
  breakupCount: number;
  /** Radial delta-V spread (m/s). */
  radialDeltaV: number;
  /** In-track delta-V spread (m/s). */
  inTrackDeltaV: number;
  /** Cross-track delta-V spread (m/s). */
  crossTrackDeltaV: number;
  startNum: number;
}

/** State captured on a successful breakup so it can be fully undone (Clear Breakup). */
interface BreakupUndoState {
  pieceIds: number[];
  priorSearchLimit: number;
}

export class Breakup extends KeepTrackPlugin implements ICommandPaletteCapable {
  readonly id = 'Breakup';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;
  private static readonly DEFAULT_START_NUM = 90000;

  lastBreakupParams: BreakupParams | null = null;
  /** State needed to undo the most recent breakup; null when nothing to clear. */
  private lastBreakup_: BreakupUndoState | null = null;

  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager;
  }

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'breakup-bottom-icon',
      label: t7e('plugins.Breakup.bottomIconLabel'),
      image: streamPng,
      menuMode: [MenuMode.CREATE, MenuMode.ALL],
      isDisabledOnLoad: true,
    };
  }

  /**
   * Called when the bottom icon is clicked.
   */
  onBottomIconClick(): void {
    const obj = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);

    // Reject anything that isn't a true TLE-backed Satellite (e.g. OemSatellite returns
    // true from isSatellite() but has no tle1/tle2/satrec, which would blow up the
    // state-vector propagation). Any orbital regime of a real Satellite is supported.
    if (!(obj instanceof Satellite)) {
      return;
    }

    this.updateSccNumInMenu_();
  }

  // Bridge for legacy event system (per CLAUDE.md)
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    // Bare 'B' is owned by BestPassPlugin; use Shift+B (no conflict per the registry).
    return [
      {
        key: 'B',
        shift: true,
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = t7e('plugins.Breakup.title');

    return [
      {
        id: 'Breakup.create',
        label: t7e('plugins.Breakup.commands.create' as Parameters<typeof t7e>[0]),
        category,
        callback: () => this.bottomMenuClicked(),
      },
      {
        id: 'Breakup.clear',
        label: t7e('plugins.Breakup.commands.clear' as Parameters<typeof t7e>[0]),
        category,
        callback: () => this.clearBreakup_(),
        isAvailable: () => this.lastBreakup_ !== null,
      },
    ];
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'breakup-menu',
      title: t7e('plugins.Breakup.sideMenuTitle' as Parameters<typeof t7e>[0]),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
    };
  }

  private buildSideMenuHtml_(): string {
    const l = (key: string) => t7e(`plugins.Breakup.labels.${key}` as Parameters<typeof t7e>[0]);

    return html`
      <div id="breakup-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="breakup-content" class="side-menu">
          <form id="breakup" class="col s12">
            <section class="kt-section">
              <div class="kt-section-label">${l('sourceSection')}</div>
              <div class="input-field col s12">
                <input disabled value="00005" id="hc-scc" type="text" />
                <label for="hc-scc" class="active">${l('satelliteScc')}</label>
              </div>
            </section>
            <section class="kt-section">
              <div class="kt-section-label">${l('catalogSlotsSection')}</div>
              <div class="input-field col s12">
                <input id="hc-startNum" type="text" value="90000" />
                <label for="hc-startNum" class="active">${l('initialSatelliteNumber')}</label>
              </div>
            </section>
            <section class="kt-section">
              <div class="kt-section-label">${l('dispersionSection')}</div>
              <div class="input-field col s12">
                <select id="hc-event-preset">
                  ${BREAKUP_PRESETS.map((p) => `<option value="${p.id}"${p.id === DEFAULT_BREAKUP_PRESET ? ' selected' : ''}>${l(`preset_${p.id}`)}</option>`).join('')}
                  <option value="custom">${l('preset_custom')}</option>
                </select>
                <label>${l('eventTypeLabel')}</label>
              </div>
              <!--
                Defaults are isotropic ~40 m/s per axis, an explosion-class event
                (rocket-body / battery / propellant breakups, which dominate the real
                catalog). Real breakup ΔV is spherically symmetric (NASA Standard
                Breakup Model, EVOLVE 4.0), so the three axes share one value; the
                cloud's in-track elongation emerges from orbital dynamics, not from
                anisotropic input. With a per-axis 1σ Gaussian the median total ΔV is
                ≈1.54σ, so 40 m/s → ~60 m/s median (explosion fragments are ~10-100 m/s;
                catastrophic collisions run ~100-300 m/s, small fragments to ~1 km/s).
              -->
              <div class="kt-field-row">
                <div class="input-field col s4">
                  <input id="hc-dv-radial" type="number" min="0" step="1" value="40" />
                  <label for="hc-dv-radial" class="active">${l('radialDeltaV')}</label>
                </div>
                <div class="input-field col s4">
                  <input id="hc-dv-intrack" type="number" min="0" step="1" value="40" />
                  <label for="hc-dv-intrack" class="active">${l('inTrackDeltaV')}</label>
                </div>
                <div class="input-field col s4">
                  <input id="hc-dv-crosstrack" type="number" min="0" step="1" value="40" />
                  <label for="hc-dv-crosstrack" class="active">${l('crossTrackDeltaV')}</label>
                </div>
              </div>
              <div class="kt-note">${l('dispersionHint')}</div>
            </section>
            <section class="kt-section">
              <div class="kt-section-label">${l('piecesSection')}</div>
              <div class="input-field col s12">
                <select id="hc-count">
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25" selected>25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="250">250</option>
                  <option value="500">500</option>
                  <option value="750">750</option>
                  <option value="1000">1000</option>
                </select>
                <label>${l('pieces')}</label>
              </div>
            </section>
            <button id="breakup-create-btn" class="kt-action waves-effect" type="submit" name="action">
              <span class="kt-action-label">${t7e('plugins.Breakup.buttons.createBreakup' as Parameters<typeof t7e>[0])}</span>
            </button>
            <button id="breakup-clear-btn" class="kt-action kt-action-danger waves-effect" type="button" style="display:none;">
              <span class="kt-action-label">${t7e('plugins.Breakup.buttons.clearBreakup' as Parameters<typeof t7e>[0])}</span>
            </button>
          </form>
        </div>
      </div>
    `;
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.Breakup.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.Breakup.help.overview'),
          image: {
            src: 'img/help/breakup/breakup-menu.png',
            alt: t7e('plugins.Breakup.help.imgAlt'),
            caption: t7e('plugins.Breakup.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.Breakup.help.parametersHeading'),
          content: t7e('plugins.Breakup.help.parameters'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.Breakup.help.howToUse'),
        },
      ],
      tips: [t7e('plugins.Breakup.help.tip1'), t7e('plugins.Breakup.help.tip2'), t7e('plugins.Breakup.help.tip3')],
    };
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => this.uiManagerFinal_());

    // Custom satellite selection handling - KEEP: Custom plugin logic
    EventBus.getInstance().on(EventBusEvent.selectSatData, (sat: BaseObject) => {
      // Restrict to true TLE-backed Satellite - OemSatellite passes isSatellite() but
      // has no satrec to propagate. Any orbital regime of a real Satellite is supported.
      if (!(sat instanceof Satellite)) {
        if (this.isMenuButtonActive) {
          this.closeSideMenu();
        }
        this.setBottomIconToUnselected();
        this.setBottomIconToDisabled();
      } else {
        this.setBottomIconToEnabled();
        if (this.isMenuButtonActive) {
          this.updateSccNumInMenu_();
        }
      }
    });
  }

  private uiManagerFinal_(): void {
    getEl('breakup')?.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      showLoading(() => this.onSubmit_());
    });

    getEl('breakup-clear-btn')?.addEventListener('click', () => {
      showLoading(() => this.clearBreakup_());
    });

    // Selecting an event-type preset fills the per-axis delta-V fields.
    getEl('hc-event-preset')?.addEventListener('change', (e) => {
      this.applyPreset_((e.target as HTMLSelectElement).value);
    });

    this.restoreInputs_();
    initMaterialSelects(getEl('breakup-menu') ?? document.body);
    this.updateClearButton_();
  }

  // =========================================================================
  // Private methods
  // =========================================================================

  private updateSccNumInMenu_() {
    if (!this.isMenuButtonActive) {
      return;
    }
    const obj = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);

    if (!obj?.isSatellite()) {
      return;
    }
    (<HTMLInputElement>getEl('hc-scc')).value = (obj as Satellite).sccNum;
  }

  // eslint-disable-next-line max-statements
  private onSubmit_(): void {
    const timeManager = ServiceLocator.getTimeManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const { simulationTimeObj } = timeManager;

    const { satId, breakupCount, radialDeltaV, inTrackDeltaV, crossTrackDeltaV, startNum, startNumWasInvalid } = Breakup.getFormData_(catalogManagerInstance);

    if (startNumWasInvalid) {
      errorManagerInstance.warn(t7e('plugins.Breakup.errorMsgs.InvalidStartNum'));
    }

    this.lastBreakupParams = { satId, breakupCount, radialDeltaV, inTrackDeltaV, crossTrackDeltaV, startNum };
    this.persistInputs_();

    const mainsat = catalogManagerInstance.getSat(satId ?? -1);

    // getSat's return type is Satellite, but at runtime it only checks isSatellite() -
    // OemSatellite slips through that check and lacks a propagatable satrec.
    if (!mainsat || satId === null || !(mainsat instanceof Satellite)) {
      errorManagerInstance.warn(t7e('plugins.Breakup.errorMsgs.SatelliteNotFound'));

      return;
    }

    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

    // The breakup happens at the parent's exact position/velocity at the current sim
    // time. The catalog-facing orchestration lives in runBreakup so other plugins
    // (e.g. the interceptor) can trigger a breakup at an arbitrary epoch too.
    const result = runBreakup(mainsat, { breakupCount, radialDeltaV, inTrackDeltaV, crossTrackDeltaV, startNum }, simulationTimeObj);

    if (result.error === 'invalidSlotRange') {
      errorManagerInstance.warn(
        t7e('plugins.Breakup.errorMsgs.InvalidSlotRange')
          .replace('{start}', CatalogManager.ANALYST_START_ID.toString())
          .replace('{end}', (CatalogManager.ANALYST_START_ID + settingsManager.maxAnalystSats - 1).toString())
      );

      return;
    }

    if (result.createdIds.length === 0) {
      errorManagerInstance.warn(t7e('plugins.Breakup.errorMsgs.ErrorCreatingBreakup'));

      return;
    }

    // No silent caps: tell the user when fragments were dropped because they reentered.
    if (result.reenteredCount > 0) {
      ServiceLocator.getUiManager().toast(
        t7e('plugins.Breakup.toasts.fragmentsReentered' as Parameters<typeof t7e>[0]).replace('{count}', result.reenteredCount.toString()),
        ToastMsgType.caution
      );
    }

    const priorSearchLimit = settingsManager.searchLimit;

    if (breakupCount > settingsManager.searchLimit) {
      settingsManager.searchLimit = breakupCount;
    }

    this.lastBreakup_ = {
      pieceIds: result.createdIds,
      priorSearchLimit,
    };
    this.updateClearButton_();

    /*
     * Pieces changed type (PAYLOAD analyst slot → DEBRIS) and active flag in
     * objectCache, but in worker-mode the color worker only sees the typed-array
     * snapshot taken at init. Without this nudge they'd keep rendering as
     * orange "inactive payloads" in the Celestrak scheme.
     */
    ServiceLocator.getColorSchemeManager().notifyObjectsChanged();

    /*
     * Search immediately. Each piece's render-buffer position was seeded
     * synchronously above (seedDotPosition), so the search no longer reads the
     * placeholder 0,0,0 position and filter the pieces as "Decayed" - no need to
     * wait on the async position cruncher (the old waitForCruncher approach was
     * racy and showed nothing until a manual re-search). Same pattern as create-sat.
     */
    ServiceLocator.getUiManager().doSearch(`${mainsat.sccNum},Breakup Piece`);
  }

  /**
   * Undo the most recent breakup: return every generated piece to its reserved
   * (inactive) analyst slot and restore the prior search limit. The parent
   * satellite is never modified by a breakup, so nothing to restore there.
   */
  private clearBreakup_(): void {
    if (!this.lastBreakup_) {
      return;
    }

    const { pieceIds, priorSearchLimit } = this.lastBreakup_;

    clearBreakupPieces(pieceIds);

    settingsManager.searchLimit = priorSearchLimit;
    this.lastBreakup_ = null;
    this.updateClearButton_();

    ServiceLocator.getColorSchemeManager().notifyObjectsChanged();
    ServiceLocator.getUiManager().doSearch('');
    ServiceLocator.getUiManager().toast(t7e('plugins.Breakup.toasts.cleared' as Parameters<typeof t7e>[0]), ToastMsgType.normal);
  }

  /** Fill the per-axis delta-V fields from an event-type preset ("custom" is a no-op). */
  private applyPreset_(presetId: string): void {
    const preset = getBreakupPreset(presetId);

    if (!preset) {
      return;
    }

    const set = (id: string, value: number) => {
      const el = getEl(id, true) as HTMLInputElement | null;

      if (el) {
        el.value = value.toString();
      }
    };

    set('hc-dv-radial', preset.radial);
    set('hc-dv-intrack', preset.inTrack);
    set('hc-dv-crosstrack', preset.crossTrack);
  }

  /** Show the Clear Breakup action only when there is a breakup to undo. */
  private updateClearButton_(): void {
    const btn = getEl('breakup-clear-btn', true);

    if (btn) {
      btn.style.display = this.lastBreakup_ ? 'flex' : 'none';
    }
  }

  /** Persist the current inputs so they are restored next session. */
  private persistInputs_(): void {
    const settings: Record<string, string> = {};

    for (const id of Breakup.PERSISTED_INPUT_IDS) {
      const el = getEl(id, true) as HTMLInputElement | null;

      if (el) {
        settings[id] = el.value;
      }
    }

    PersistenceManager.getInstance().saveItem(StorageKey.BREAKUP_SETTINGS, JSON.stringify(settings));
  }

  /** Restore the last-used inputs (call before initMaterialSelects). */
  private restoreInputs_(): void {
    const raw = PersistenceManager.getInstance().getItem(StorageKey.BREAKUP_SETTINGS);

    if (!raw) {
      return;
    }

    let settings: Record<string, string>;

    try {
      settings = JSON.parse(raw) as Record<string, string>;
    } catch {
      return;
    }

    for (const id of Breakup.PERSISTED_INPUT_IDS) {
      const value = settings[id];
      const el = getEl(id, true) as HTMLInputElement | null;

      if (el && typeof value === 'string') {
        el.value = value;
      }
    }
  }

  private static readonly PERSISTED_INPUT_IDS = ['hc-startNum', 'hc-event-preset', 'hc-dv-radial', 'hc-dv-intrack', 'hc-dv-crosstrack', 'hc-count'];

  private static getFormData_(catalogManagerInstance: CatalogManager) {
    const satId = catalogManagerInstance.sccNum2Id((<HTMLInputElement>getEl('hc-scc')).value);
    const raw: BreakupRawForm = {
      radialDv: (<HTMLInputElement>getEl('hc-dv-radial')).value,
      inTrackDv: (<HTMLInputElement>getEl('hc-dv-intrack')).value,
      crossTrackDv: (<HTMLInputElement>getEl('hc-dv-crosstrack')).value,
      count: (<HTMLInputElement>getEl('hc-count')).value,
      startNum: (<HTMLInputElement>getEl('hc-startNum')).value,
    };

    const { params, startNumWasInvalid } = parseBreakupParams(raw, Breakup.DEFAULT_START_NUM);

    return { satId, ...params, startNumWasInvalid };
  }
}
