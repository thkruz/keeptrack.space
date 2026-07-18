import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  ICommandPaletteCapable,
  ICommandPaletteCommand,
  IContextMenuConfig,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { ColorScheme } from '@app/engine/rendering/color-schemes/color-scheme';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import palettePng from '@public/img/icons/palette.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './colors-menu.css';

export class ColorMenu extends KeepTrackPlugin implements ICommandPaletteCapable {
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
      menuMode: [MenuMode.CATALOG, MenuMode.ALL],
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
      <div id="color-scheme-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="colors-menu" class="side-menu">
          <section class="kt-section">
            <div class="kt-section-label">${t7e('plugins.ColorMenu.sectionLabel')}</div>
            <div id="colors-menu-list" class="colors-menu-list">
              ${this.buildColorSchemeList_()}
            </div>
          </section>
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

      result += '<button type="button" class="kt-action waves-effect colors-menu-item" ' +
        `data-color="${colorSchemes[colorScheme].id}">` +
        `<span class="kt-action-label">${colorSchemes[colorScheme].label}</span>` +
        '</button>';
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

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'A',
        // ctrl:false so Ctrl+Shift+A stays free for Aurora; this owns plain Shift+A.
        ctrl: false,
        callback: () => {
          this.bottomMenuClicked();
        },
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = 'Colors';
    const colorSchemes = ServiceLocator.getColorSchemeManager().colorSchemeInstances;

    return Object.values(colorSchemes)
      .filter((cs) => cs.isOptionInColorMenu && settingsManager.colorSchemeInstances[cs.id]?.enabled)
      .map((cs) => ({
        id: `ColorMenu.setColorScheme.${cs.id}`,
        label: `Set Color Scheme: ${cs.label}`,
        category,
        callback: () => ColorMenu.colorsMenuClick(cs.id),
      }));
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.ColorMenu.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.ColorMenu.help.overview'),
          image: {
            src: 'img/help/colors-menu/colors-menu.png',
            alt: t7e('plugins.ColorMenu.help.imgAlt'),
            caption: t7e('plugins.ColorMenu.help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.ColorMenu.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.ColorMenu.help.tip1'),
        t7e('plugins.ColorMenu.help.tip2'),
      ],
      shortcuts: [{ keys: ['A'], description: t7e('plugins.ColorMenu.help.shortcutToggle') }],
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
    getEl('colors-menu-list')?.addEventListener('click', (evt: Event) => {
      const target = (evt.target as HTMLElement).closest('.colors-menu-item') as HTMLElement | null;

      if (!target) {
        return;
      }

      ColorMenu.colorsMenuClick(target.dataset.color ?? '');
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

