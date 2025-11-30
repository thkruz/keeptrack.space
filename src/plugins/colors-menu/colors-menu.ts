import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IContextMenuConfig,
  IDragOptions,
  IHelpConfig,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { ColorScheme } from '@app/engine/rendering/color-schemes/color-scheme';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import palettePng from '@public/img/icons/palette.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class ColorMenu extends KeepTrackPlugin {
  readonly id = 'ColorMenu';
  dependencies_ = [];

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'menu-color-scheme',
      label: t7e('plugins.ColorMenu.bottomIconLabel'),
      image: palettePng,
      menuMode: [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'color-scheme-menu',
      title: t7e('plugins.ColorMenu.title'),
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
    return html`
      <div id="color-scheme-menu" class="side-menu-parent start-hidden text-select">
        <div id="colors-menu" class="side-menu">
          <ul>
            <h5 class="center-align">${t7e('plugins.ColorMenu.title')}</h5>
            <li class="divider"></li>
            ${this.buildColorSchemeList_()}
          </ul>
        </div>
      </div>
    `;
  }

  private buildColorSchemeList_(): string {
    const colorSchemes = ServiceLocator.getColorSchemeManager().colorSchemeInstances;
    let result = '';

    for (const colorScheme in colorSchemes) {
      if (!colorSchemes[colorScheme].isOptionInColorMenu || !settingsManager.colorSchemeInstances[colorScheme]?.enabled) {
        continue;
      }

      result += `<li class="menu-selectable" data-color="${colorSchemes[colorScheme].id}">${colorSchemes[colorScheme].label}</li>`;
    }

    return result;
  }

  getContextMenuConfig(): IContextMenuConfig {
    return {
      level1ElementName: 'colors-rmb',
      level1Html: html`<li class="rmb-menu-item" id="colors-rmb"><a href="#">${t7e('plugins.ColorMenu.rmbLabel')} &#x27A4;</a></li>`,
      level2ElementName: 'colors-rmb-menu',
      level2Html: html`<ul class='dropdown-contents'>${this.buildRmbColorSchemeList_()}</ul>`,
      order: 50,
      isVisibleOnEarth: true,
      isVisibleOffEarth: true,
      isVisibleOnSatellite: false,
    };
  }

  private buildRmbColorSchemeList_(): string {
    const colorSchemes = ServiceLocator.getColorSchemeManager().colorSchemeInstances;
    let result = '';

    for (const colorScheme in colorSchemes) {
      if (!colorSchemes[colorScheme].isOptionInRmbMenu || !settingsManager.colorSchemeInstances[colorScheme]?.enabled) {
        continue;
      }

      result += `<li id="colors-${colorSchemes[colorScheme].id}-rmb"><a href="#">${colorSchemes[colorScheme].label}</a></li>`;
    }

    return result;
  }

  onContextMenuAction(targetId: string): void {
    const colorSchemeManager = ServiceLocator.getColorSchemeManager();

    for (const colorScheme in colorSchemeManager.colorSchemeInstances) {
      if (targetId === `colors-${colorScheme}-rmb`) {
        ColorMenu.colorsMenuClick(colorScheme);

        return;
      }
    }

    if (targetId?.includes('colors-')) {
      errorManagerInstance.info(`Color scheme not found: ${targetId}`);
      ColorMenu.colorsMenuClick(targetId.slice(7).replace('-rmb', ''));
    }
  }

  // Bridge for legacy event system (per CLAUDE.md)
  rmbCallback: (targetId: string | null, clickedSat?: number) => void = (targetId: string | null) => {
    if (targetId) {
      this.onContextMenuAction(targetId);
    }
  };

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.ColorMenu.title'),
      body: t7e('plugins.ColorMenu.helpBody'),
    };
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      this.uiManagerFinal_.bind(this),
    );
  }

  private uiManagerFinal_(): void {
    getEl('colors-menu')
      ?.querySelectorAll('li')
      .forEach((element) => {
        element.addEventListener('click', () => {
          const colorName = element.dataset.color;

          ColorMenu.colorsMenuClick(colorName ?? '');
        });
      });
  }

  // =========================================================================
  // Color scheme selection logic
  // =========================================================================

  static readonly colorsMenuClick = (colorName: string): void => {
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    // If selectSatManager is loaded, clear selected sat
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);

    // Look through the color schemes
    for (const colorScheme in colorSchemeManagerInstance.colorSchemeInstances) {
      if (!(colorSchemeManagerInstance.colorSchemeInstances[colorScheme] instanceof ColorScheme)) {
        continue;
      }

      const colorSchemeInstance = colorSchemeManagerInstance.colorSchemeInstances[colorScheme];

      if (colorSchemeInstance.id === colorName) {
        colorSchemeInstance.onSelected();
        colorSchemeManagerInstance.isUseGroupColorScheme = ServiceLocator.getGroupsManager().selectedGroup !== null;
        colorSchemeManagerInstance.setColorScheme(colorSchemeInstance, true);
        ServiceLocator.getUiManager().hideSideMenus();

        return;
      }
    }

    // If we didn't find it in the color schemes, it's an error
    errorManagerInstance.warn(`Color scheme not found: ${colorName}`);
  };
}

