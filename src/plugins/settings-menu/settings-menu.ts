import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import {
  hasSettingsContribution,
  ICommandPaletteCommand,
  IHelpConfig,
  IKeyboardShortcut,
  ISettingsContribution,
} from '@app/engine/plugins/core/plugin-capabilities';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import settingsPng from '@public/img/icons/settings.png';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { applyPersistedSetting } from '@app/settings/persisted-settings-table';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { attachSettingControlListeners, renderSettingsSection } from './settings-control-renderer';
import './settings-menu.css';
import { getOwnSettingsSections, resetOwnSettings } from './settings-menu-controls';

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
const l = (key: string): string => t7e(`plugins.SettingsMenuPlugin.${key}` as Parameters<typeof t7e>[0]);

export class SettingsMenuPlugin extends KeepTrackPlugin {
  readonly id = 'SettingsMenuPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.SETTINGS, MenuMode.ALL];

  bottomIconElementName: string = 'settings-menu-icon';
  bottomIconImg = settingsPng;
  sideMenuElementName: string = 'settings-menu';

  /** Current text in the filter box, preserved across re-renders. */
  private static filterQuery_ = '';

  sideMenuElementHtml: string = html`
  <div id="settings-menu" class="side-menu-parent start-hidden kt-ui-v13">
    <div id="settings-content" class="side-menu">
      <div class="row">
        <form id="settings-form">
          <div class="settings-filter-wrapper">
            <input id="settings-filter" type="search" autocomplete="off" placeholder="${l('filterPlaceholder')}" />
          </div>
          <div id="settings-own-sections"></div>
          <div id="settings-plugin-sections"></div>
          <button id="settings-reset" type="button" class="kt-action waves-effect">
            <span class="kt-action-label">${l('buttons.resetToDefaults')}</span>
          </button>
        </form>
      </div>
    </div>
  </div>`;


  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/settings-menu/settings-menu.png',
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

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    // Shift+Comma mirrors the conventional "preferences" shortcut; bound by
    // physical key (Comma) so it works regardless of keyboard layout.
    return [
      {
        key: ',',
        code: 'Comma',
        shift: true,
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = l('title');

    return [
      {
        id: 'SettingsMenu.open',
        label: l('commands.open'),
        category,
        callback: () => this.bottomMenuClicked(),
      },
      {
        id: 'SettingsMenu.reset',
        label: l('commands.reset'),
        category,
        callback: () => SettingsMenuPlugin.resetToDefaults(),
      },
    ];
  }

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        SettingsMenuPlugin.renderAllSections_();

        getEl('settings-reset')?.addEventListener('click', SettingsMenuPlugin.resetToDefaults);
        getEl('settings-filter')?.addEventListener('input', SettingsMenuPlugin.onFilterInput_);
      },
    );

    EventBus.getInstance().on(EventBusEvent.settingsMenuRefresh, SettingsMenuPlugin.renderAllSections_);

    // Account sync applied cloud-newer values to persistence: reflect them live
    EventBus.getInstance().on(EventBusEvent.remoteSettingsApplied, SettingsMenuPlugin.onRemoteSettingsApplied_);
  }

  /**
   * Apply cloud-synced values from PersistenceManager onto settingsManager and
   * run the runtime side effects a settings-menu toggle would have triggered.
   * Keys the URL explicitly overrode this session keep their forced value.
   */
  private static onRemoteSettingsApplied_(changedKeys: StorageKey[]): void {
    const persistence = PersistenceManager.getInstance();
    let anyApplied = false;
    let needsOrbitRedraw = false;
    let needsOrbitTypeUpdate = false;

    for (const key of changedKeys) {
      if (settingsManager.urlOverriddenSettingKeys.has(key)) {
        continue;
      }

      if (!applyPersistedSetting(settingsManager, key, persistence.getItem(key))) {
        continue;
      }

      anyApplied = true;
      if (key === StorageKey.SETTINGS_DRAW_ORBITS) {
        needsOrbitRedraw = true;
      } else if (key === StorageKey.SETTINGS_DRAW_TRAILING_ORBITS) {
        needsOrbitTypeUpdate = true;
      }
    }

    if (needsOrbitRedraw) {
      ServiceLocator.getOrbitManager().drawOrbitsSettingChanged();
    }
    if (needsOrbitTypeUpdate) {
      ServiceLocator.getOrbitManager().updateOrbitType();
    }
    if (anyApplied) {
      SettingsMenuPlugin.renderAllSections_();
    }
  }

  private static collectPluginContributions_(): ISettingsContribution[] {
    const contributions: { contribution: ISettingsContribution; manifestOrder: number }[] = [];

    PluginRegistry.plugins.forEach((plugin, manifestOrder) => {
      if (hasSettingsContribution(plugin)) {
        try {
          contributions.push({ contribution: plugin.getSettingsContribution(), manifestOrder });
        } catch (err) {
          // A misbehaving plugin must not break the settings menu.
          // eslint-disable-next-line no-console
          console.error(`SettingsMenuPlugin: ${plugin.id}.getSettingsContribution() threw`, err);
        }
      }
    });

    return contributions
      .sort((a, b) => {
        const orderA = a.contribution.order ?? Number.POSITIVE_INFINITY;
        const orderB = b.contribution.order ?? Number.POSITIVE_INFINITY;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.manifestOrder - b.manifestOrder;
      })
      .map(({ contribution }) => contribution);
  }

  /**
   * Render a set of contributions into a container and wire their listeners.
   * Replacing the container's innerHTML wholesale lets the old listeners GC with
   * their removed nodes, so this is safe to call repeatedly (refresh / reset).
   */
  private static renderSections_(containerId: string, contributions: ISettingsContribution[]): void {
    // Refresh can fire before the menu is mounted (a plugin emits
    // settingsMenuRefresh during early init), so tolerate a missing container.
    const container = getEl(containerId, true);

    if (!container) {
      return;
    }

    container.innerHTML = contributions.map((c) => renderSettingsSection(c)).join('');

    contributions.forEach((contribution) => {
      contribution.controls.forEach((control) => {
        attachSettingControlListeners(control, contribution.sectionId);
      });
    });
  }

  /**
   * (Re)render the menu's own General/Fast-CPU sections plus every
   * plugin-contributed section, restyle the dropdowns, and re-apply the filter.
   * Rendering reads each control's `get()`, so this also doubles as the
   * load-time sync of every control to its current setting value.
   */
  private static renderAllSections_(): void {
    SettingsMenuPlugin.renderSections_('settings-own-sections', getOwnSettingsSections());
    SettingsMenuPlugin.renderSections_('settings-plugin-sections', SettingsMenuPlugin.collectPluginContributions_());

    initMaterialSelects(getEl('settings-menu', true) ?? document.body);
    SettingsMenuPlugin.applyFilter_(SettingsMenuPlugin.filterQuery_);
  }

  /**
   * Re-sync every rendered control to the current `settingsManager` values.
   * Public entry point for code that mutates settings programmatically (keyboard
   * toggles, scenario / mass-raid loads) and wants an open Settings menu to
   * reflect the change. Rendering reads each control's `get()`, so a re-render
   * IS the sync; it safely no-ops when the menu is not mounted.
   */
  static syncOnLoad(): void {
    SettingsMenuPlugin.renderAllSections_();
  }

  private static onFilterInput_(e: Event): void {
    SettingsMenuPlugin.filterQuery_ = (e.target as HTMLInputElement).value;
    SettingsMenuPlugin.applyFilter_(SettingsMenuPlugin.filterQuery_);
  }

  /**
   * Narrow the visible controls to those whose label text contains the query.
   * Empty sections (every row filtered out) are hidden so the menu collapses to
   * just the matches. Uses substring matching - no regex - so any user input is
   * a safe literal.
   */
  private static applyFilter_(query: string): void {
    const menu = getEl('settings-menu', true);

    if (!menu) {
      return;
    }

    const needle = query.trim().toLowerCase();

    menu.querySelectorAll<HTMLElement>('.kt-section').forEach((section) => {
      let anyVisible = false;

      section.querySelectorAll<HTMLElement>('.switch.row, .input-field').forEach((row) => {
        const isMatch = needle.length === 0 || (row.textContent ?? '').toLowerCase().includes(needle);

        row.style.display = isMatch ? '' : 'none';
        if (isMatch) {
          anyVisible = true;
        }
      });

      section.style.display = anyVisible ? '' : 'none';
    });
  }

  static resetToDefaults(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);
    resetOwnSettings();
    // Re-render so every control (own + contributed) reflects the restored values.
    EventBus.getInstance().emit(EventBusEvent.settingsMenuRefresh);
  }
}
