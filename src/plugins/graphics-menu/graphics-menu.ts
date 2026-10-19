import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IHelpConfig,
  ISettingControl,
  ISettingNumberControl,
  ISettingQualityRule,
  ISettingsContribution,
  ISettingToggleControl,
} from '@app/engine/plugins/core/plugin-capabilities';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { collectSettingsContributions } from '@app/plugins/settings-menu/settings-contributions';
import { attachSettingControlListeners, renderSettingsSection } from '@app/plugins/settings-menu/settings-control-renderer';
import { GraphicsSettings } from '@app/settings/graphics-settings';
import { OrbitalSettings } from '@app/settings/orbital-settings';
import { SettingsManager } from '@app/settings/settings';
import displaySettingsPng from '@public/img/icons/display-settings.png';
import './graphics-menu.css';
import { applyQualityLevel, deriveQualityLevel, GRAPHICS_QUALITY_ORDER, GraphicsQualityDisplay, GraphicsQualityLevel } from './quality-level';

/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
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

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.GraphicsMenuPlugin.${key}` as Parameters<typeof t7e>[0]);

/** Section ids of the menu's own sections. Pro sections use the same prefix. */
export const GRAPHICS_SECTION_DISPLAY = 'graphics-display';
export const GRAPHICS_SECTION_ORBITS = 'graphics-orbits';

/** Plugins whose bottom/utility icon mirrors a flag this menu also owns. */
const NIGHT_TOGGLE_ID = 'NightToggle';
const GRATICULE_TOGGLE_ID = 'GraticuleToggle';
const POLITICAL_MAP_TOGGLE_ID = 'PoliticalMapToggle';

/** A boolean settingsManager flag this menu owns, for {@link GraphicsMenuPlugin.boolToggle_}. */
type BoolSettingKey = 'isBlackEarth' | 'isEarthGrayScale' | 'isEarthAmbientLighting' | 'isDrawNightAsDay' | 'isDrawGraticule' | 'isDrawPoliticalMap' | 'isDrawOrbitEclipse';

interface BoolToggleOpts {
  quality?: ISettingQualityRule;
  /** Side effect after the flag is written (renderer re-init, icon sync). */
  apply?: (next: boolean) => void;
}

/**
 * The Graphics menu: an overall quality selector over v13 cards built from the
 * settings contribution API. Its own Display and Orbits sections come from
 * {@link getOwnSections_}; any plugin can add a card by returning a contribution
 * with `target: 'graphics'`. The Pro build subclasses this to append its
 * renderer sections and to batch Earth/skybox re-inits.
 */
export class GraphicsMenuPlugin extends KeepTrackPlugin {
  readonly id: string = 'GraphicsMenuPlugin';
  dependencies_: string[] = [];

  menuMode: MenuMode[] = [MenuMode.SETTINGS, MenuMode.ALL];

  bottomIconImg = displaySettingsPng;
  sideMenuElementName = 'graphics-menu';
  sideMenuElementHtml = html`
  <div id="graphics-menu" class="side-menu-parent start-hidden kt-ui-v13">
    <div id="graphics-menu-content" class="side-menu">
      <form id="graphics-menu-form">
        <section id="gm-quality-section" class="kt-section">
          <div class="kt-section-label">${l('labels.overallQuality')}</div>
          <div class="gm-preset-row">
            ${GRAPHICS_QUALITY_ORDER.map(
              (level) =>
                `<button id="gm-quality-${level}" data-level="${level}" class="gm-preset-btn waves-effect" type="button" aria-pressed="false">${l(`options.${level}`)}</button>`
            ).join('')}
            <span id="gm-quality-custom" class="gm-preset-btn gm-preset-custom" aria-disabled="true">${l('options.custom')}</span>
          </div>
          <div id="gm-quality-auto-note" class="gm-quality-note" style="display: none;">${l('labels.autoReduced')}</div>
        </section>
        <div class="gm-filter-wrapper">
          <input id="graphics-menu-filter" type="search" autocomplete="off" placeholder="${l('filterPlaceholder')}" />
        </div>
        <div id="graphics-menu-sections"></div>
        <button id="graphics-menu-reset-btn" type="button" class="kt-action waves-effect">
          <span class="kt-action-label">${l('buttons.resetToDefaults')}</span>
        </button>
      </form>
    </div>
  </div>`;

  /** Current text in the filter box, preserved across re-renders. */
  private filterQuery_ = '';
  /** Set when the engine's performance cascade turned something off; cleared by a level pick or reset. */
  private isAutoReduced_ = false;
  /** True between {@link beginBatch_} and {@link endBatch_}. */
  private isBatching_ = false;
  private isPersistPending_ = false;
  private isRefreshPending_ = false;

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/graphics-menu/graphics-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2')],
    };
  }

  addHtml(): void {
    super.addHtml();

    const eventBus = EventBus.getInstance();

    eventBus.on(EventBusEvent.uiManagerFinal, () => {
      this.uiManagerFinal_();
    });
    eventBus.on(EventBusEvent.settingsMenuRefresh, () => {
      this.renderAllSections_();
    });
    eventBus.on(EventBusEvent.performanceDowngrade, () => {
      this.isAutoReduced_ = true;
      this.renderAllSections_();
    });
  }

  private uiManagerFinal_(): void {
    GRAPHICS_QUALITY_ORDER.forEach((level) => {
      getEl(`gm-quality-${level}`, true)?.addEventListener('click', () => this.selectQualityLevel(level));
    });
    getEl('graphics-menu-filter', true)?.addEventListener('input', (e: Event) => {
      this.filterQuery_ = (e.target as HTMLInputElement).value;
      this.applyFilter_();
    });
    getEl('graphics-menu-reset-btn', true)?.addEventListener('click', () => this.resetToDefaults());
    // Any control change can move the overall level (to Custom or back to a level).
    getEl('graphics-menu-sections', true)?.addEventListener('change', () => this.updateQualityDisplay_());

    this.syncOnLoad();
  }

  /**
   * Re-sync every rendered control to the current settings. Public so code that
   * changes graphics settings programmatically (account sync) can refresh it.
   */
  syncOnLoad(): void {
    this.renderAllSections_();
  }

  /**
   * Apply an overall quality level: every quality-aware control in the menu
   * (own, Pro, and contributed) moves to its value for `level` in one batch,
   * then the menu re-renders once.
   */
  selectQualityLevel(level: GraphicsQualityLevel): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    this.runBatched_(() => {
      applyQualityLevel(level, this.allControls_());
      settingsManager.graphicsQuality = level;
      this.isAutoReduced_ = false;
      this.persist_();
      this.refresh_();
    });
  }

  /** Restore every setting this menu owns to its default, in one batch. */
  resetToDefaults(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    this.runBatched_(() => {
      this.resetOwnSettings_();
      this.isAutoReduced_ = false;
      this.persist_();
      this.refresh_();
    });
  }

  /**
   * The menu's own sections, top to bottom. Pro overrides this to append its
   * renderer sections; to add a control to an existing card, override the
   * matching `xxxControls_()` method instead.
   */
  protected getOwnSections_(): ISettingsContribution[] {
    return [
      { sectionId: GRAPHICS_SECTION_DISPLAY, sectionLabel: l('sections.display'), target: 'graphics', controls: this.displayControls_() },
      { sectionId: GRAPHICS_SECTION_ORBITS, sectionLabel: l('sections.orbits'), target: 'graphics', controls: this.orbitsControls_() },
    ];
  }

  protected displayControls_(): ISettingControl[] {
    return [
      this.boolToggle_('blackEarth', 'isBlackEarth', { apply: () => this.requestEarthInit_() }),
      this.boolToggle_('grayscaleEarth', 'isEarthGrayScale'),
      this.boolToggle_('ambientLighting', 'isEarthAmbientLighting', { quality: { minLevel: 'low' } }),
      this.boolToggle_('nightAsDay', 'isDrawNightAsDay', { apply: (next) => GraphicsMenuPlugin.syncToggleIcon_(NIGHT_TOGGLE_ID, next) }),
      this.boolToggle_('graticule', 'isDrawGraticule', { apply: (next) => GraphicsMenuPlugin.syncToggleIcon_(GRATICULE_TOGGLE_ID, next) }),
      this.boolToggle_('politicalMap', 'isDrawPoliticalMap', {
        apply: () => GraphicsMenuPlugin.syncToggleIcon_(POLITICAL_MAP_TOGGLE_ID, settingsManager.isDrawPoliticalMap || settingsManager.isDrawPoliticalLabels),
      }),
    ];
  }

  protected orbitsControls_(): ISettingControl[] {
    return [
      this.boolToggle_('dimOrbitInEclipse', 'isDrawOrbitEclipse', {
        quality: { minLevel: 'low' },
        apply: () => ServiceLocator.getOrbitManager()?.orbitEclipseSettingChanged(),
      }),
      this.numberControl_(
        'orbitEclipseAlpha',
        0.05,
        1,
        0.05,
        () => settingsManager.orbitEclipseAlpha,
        (next) => {
          settingsManager.orbitEclipseAlpha = next;
          ServiceLocator.getOrbitManager()?.orbitEclipseSettingChanged();
        }
      ),
      this.numberControl_(
        'orbitFadeFactor',
        0.05,
        1,
        0.05,
        () => settingsManager.orbitFadeFactor,
        (next) => {
          settingsManager.orbitFadeFactor = next;
          ServiceLocator.getOrbitManager()?.orbitFadeSettingChanged();
        }
      ),
    ];
  }

  /**
   * Restore the menu's own keys to their class defaults. Pro overrides this (and
   * calls super) to cover its sections. Runs inside a batch.
   */
  protected resetOwnSettings_(): void {
    const graphicsDefaults = new GraphicsSettings();
    const orbitalDefaults = new OrbitalSettings();
    const toggles = [...this.displayControls_(), ...this.orbitsControls_()];
    const defaults: Record<string, boolean | number> = {
      blackEarth: graphicsDefaults.isBlackEarth,
      grayscaleEarth: graphicsDefaults.isEarthGrayScale,
      ambientLighting: graphicsDefaults.isEarthAmbientLighting,
      nightAsDay: graphicsDefaults.isDrawNightAsDay,
      graticule: graphicsDefaults.isDrawGraticule,
      politicalMap: graphicsDefaults.isDrawPoliticalMap,
      dimOrbitInEclipse: orbitalDefaults.isDrawOrbitEclipse,
      orbitEclipseAlpha: orbitalDefaults.orbitEclipseAlpha,
      orbitFadeFactor: orbitalDefaults.orbitFadeFactor,
    };

    GraphicsMenuPlugin.resetControls_(toggles, defaults);
  }

  /**
   * Set each listed control to its default, skipping ones already there so no
   * side effect runs needlessly. Helper for {@link resetOwnSettings_} overrides.
   */
  protected static resetControls_(controls: ISettingControl[], defaults: Record<string, string | number | boolean>): void {
    for (const control of controls) {
      if (control.type === 'button' || !(control.id in defaults)) {
        continue;
      }
      const next = defaults[control.id];

      if (control.get() !== next) {
        (control.set as (v: string | number | boolean) => void)(next);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Batching. Controls call persist_/refresh_ (and Pro's requestEarthInit_)
  // instead of acting directly, so a level change does each of them once.
  // ---------------------------------------------------------------------------

  /** Hook run when a batch opens. Pro overrides it to defer Earth/skybox re-init. */
  protected beginBatch_(): void {
    // OSS has no deferred renderer work.
  }

  /** Hook run when a batch closes, before the single persist and refresh. */
  protected endBatch_(): void {
    // OSS has no deferred renderer work.
  }

  protected get isBatching(): boolean {
    return this.isBatching_;
  }

  private runBatched_(fn: () => void): void {
    this.isBatching_ = true;
    this.beginBatch_();
    try {
      fn();
    } finally {
      this.endBatch_();
      this.isBatching_ = false;
    }

    if (this.isPersistPending_) {
      this.isPersistPending_ = false;
      SettingsManager.preserveSettings();
    }
    if (this.isRefreshPending_) {
      this.isRefreshPending_ = false;
      EventBus.getInstance().emit(EventBusEvent.settingsMenuRefresh);
    }
  }

  /** Persist settings now, or once at the end of the current batch. */
  protected persist_(): void {
    if (this.isBatching_) {
      this.isPersistPending_ = true;

      return;
    }
    SettingsManager.preserveSettings();
  }

  /** Re-render every settings menu now, or once at the end of the current batch. */
  protected refresh_(): void {
    if (this.isBatching_) {
      this.isRefreshPending_ = true;

      return;
    }
    EventBus.getInstance().emit(EventBusEvent.settingsMenuRefresh);
  }

  /** Re-initialise the Earth after a setting it reads at init changed. Pro defers this inside a batch. */
  protected requestEarthInit_(): void {
    ServiceLocator.getScene()?.earth?.init();
  }

  // ---------------------------------------------------------------------------
  // Control factories
  // ---------------------------------------------------------------------------

  /** Toggle bound to a settingsManager flag; labels come from `labels.<id>` / `tooltips.<id>`. */
  protected boolToggle_(id: string, key: BoolSettingKey, opts: BoolToggleOpts = {}): ISettingToggleControl {
    return {
      type: 'toggle',
      id,
      label: l(`labels.${id}`),
      helpText: l(`tooltips.${id}`),
      quality: opts.quality,
      get: () => settingsManager[key],
      set: (next: boolean) => {
        settingsManager[key] = next;
        opts.apply?.(next);
        this.persist_();
      },
    };
  }

  /** Number input clamped to [min, max]. */
  protected numberControl_(id: string, min: number, max: number, step: number, get: () => number, apply: (next: number) => void): ISettingNumberControl {
    return {
      type: 'number',
      id,
      label: l(`labels.${id}`),
      helpText: l(`tooltips.${id}`),
      min,
      max,
      step,
      get,
      set: (next: number) => {
        apply(Math.min(Math.max(next, min), max));
        this.persist_();
      },
    };
  }

  /** Light or dim another plugin's icon when this menu changes the flag it mirrors. */
  private static syncToggleIcon_(pluginId: string, isOn: boolean): void {
    const plugin = PluginRegistry.getPluginByName(pluginId);

    if (!plugin) {
      return;
    }
    if (isOn) {
      plugin.setBottomIconToSelected();
    } else {
      // Do not close the Graphics menu when another plugin's icon goes dark.
      plugin.setBottomIconToUnselected(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  /** Own sections first, then every plugin's `target: 'graphics'` section. */
  private allSections_(): ISettingsContribution[] {
    return [...this.getOwnSections_(), ...collectSettingsContributions('graphics')];
  }

  private allControls_(): ISettingControl[] {
    return this.allSections_().flatMap((section) => section.controls);
  }

  /**
   * (Re)render every card, wire its listeners, restyle the dropdowns, and
   * re-apply the filter. Safe before the menu is mounted (no-op).
   */
  private renderAllSections_(): void {
    const container = getEl('graphics-menu-sections', true);

    if (!container) {
      return;
    }

    const sections = this.allSections_();

    container.innerHTML = sections.map((section) => renderSettingsSection(section)).join('');
    sections.forEach((section) => {
      section.controls.forEach((control) => {
        attachSettingControlListeners(control, section.sectionId);
      });
    });

    initMaterialSelects(getEl('graphics-menu', true) ?? document.body);
    this.applyFilter_();
    this.updateQualityDisplay_(sections.flatMap((section) => section.controls));
  }

  /** Highlight the derived level (or Custom) and show the auto-reduced note. */
  private updateQualityDisplay_(controls: ISettingControl[] = this.allControls_()): void {
    const current: GraphicsQualityDisplay = deriveQualityLevel(controls);

    [...GRAPHICS_QUALITY_ORDER, 'custom'].forEach((level) => {
      const el = getEl(`gm-quality-${level}`, true);

      if (!el) {
        return;
      }
      el.classList.toggle('gm-preset-active', level === current);
      if (level !== 'custom') {
        el.setAttribute('aria-pressed', String(level === current));
      }
    });

    const note = getEl('gm-quality-auto-note', true);

    if (note) {
      note.style.display = this.isAutoReduced_ ? '' : 'none';
    }
  }

  /**
   * Narrow the cards to the rows whose label contains the filter text; cards
   * with no match are hidden. Substring match only, so any input is safe.
   */
  private applyFilter_(): void {
    const container = getEl('graphics-menu-sections', true);

    if (!container) {
      return;
    }

    const needle = this.filterQuery_.trim().toLowerCase();

    container.querySelectorAll<HTMLElement>('.kt-section').forEach((section) => {
      let anyVisible = false;

      section.querySelectorAll<HTMLElement>('.switch.row, .input-field').forEach((row) => {
        const isMatch = needle.length === 0 || (row.textContent ?? '').toLowerCase().includes(needle);

        row.style.display = isMatch ? '' : 'none';
        anyVisible ||= isMatch;
      });

      section.style.display = anyVisible ? '' : 'none';
    });
  }
}
