import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { addonColorSchemes } from '@app/engine/rendering/color-scheme-addons';
import type { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { ObjectTypeColorScheme } from '@app/engine/rendering/color-schemes/object-type-color-scheme';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getClass } from '@app/engine/utils/get-class';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import layersPng from '@public/img/icons/layers.png';
import { getEl, hideEl, showEl } from '../../engine/utils/get-el';
import { rgbCss } from '../../engine/utils/rgbCss';
import {
  astronomyDiv,
  deepDiv,
  nearDiv,
  planetariumDiv,
} from './layers-manager/layers-divs';
import { LayersPopupBox } from './layers-popup-box';

export class LayersManager {
  private static layersClassList = [
    '.layers-inviewAlt-box',
    '.layers-starLow-box',
    '.layers-starMed-box',
    '.layers-starHi-box',
    '.layers-inviewAlt-box',
    '.layers-satLEO-box',
    '.layers-satGEO-box',
  ];

  static menuOptions = {
    near: nearDiv,
    deep: deepDiv,
    planetarium: planetariumDiv,
    astronomy: astronomyDiv,
    clear: '',
    default: '',
  };

  isLayersMenuOpen = false;
  layersPopupBox: LayersPopupBox = new LayersPopupBox();

  static {
    const addonLayers = {};
    const addonLayersClassList = [] as string[];

    for (const ColorSchemeClass of addonColorSchemes) {
      addonLayers[ColorSchemeClass.id] = ColorSchemeClass.layersHtml;

      for (const flag in ColorSchemeClass.uniqueObjectTypeFlags) {
        if (flag) {
          addonLayersClassList.push(`.layers-${flag}-box`);
        }
      }
    }

    LayersManager.menuOptions = { ...LayersManager.menuOptions, ...addonLayers };
    LayersManager.layersClassList = [...LayersManager.layersClassList, ...addonLayersClassList];
  }

  init() {
    this.setupTopMenu_();

    EventBus.getInstance().on(EventBusEvent.uiManagerOnReady, () => {
      // Setup Layers Colors
      LayersManager.layersColorsChange();
    });

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      getEl('layers-menu-btn')?.addEventListener('click', () => {
        const layersMenuIconContainer = getEl('layers-menu-icon')!.parentElement!;

        if (this.isLayersMenuOpen) {
          // Closing Layers Menu
          hideEl('layers-hover-menu');
          layersMenuIconContainer.classList.remove('bmenu-item-selected');
          layersMenuIconContainer.classList.add('top-menu-icons__blue-img');
          this.layersPopupBox?.close();
          this.isLayersMenuOpen = false;
        } else {
          // Opening Layers Menu

          let layersHoverDom: HTMLElement | null;

          if (settingsManager.isMobileModeEnabled) {
            layersHoverDom = getEl('layers-hover-menu')!;
          } else {
            const newFloatingBox = this.layersPopupBox;

            this.layersPopupBox = newFloatingBox;

            newFloatingBox.open();
            layersHoverDom = getEl('layers-hover-menu-popup')!;
          }

          if (layersHoverDom?.innerHTML.length === 0) {
            // TODO: Figure out why it is empty sometimes
            errorManagerInstance.debug('Layers Menu is Empty');
          }

          showEl(layersHoverDom);
          layersMenuIconContainer.classList.remove('top-menu-icons__blue-img');
          layersMenuIconContainer.classList.add('bmenu-item-selected');
          ServiceLocator.getUiManager().searchManager.hideResults();
          this.isLayersMenuOpen = true;
        }
      });
    });
  }

  private setupTopMenu_() {
    const eventBus = EventBus.getInstance();

    // This needs to happen immediately so the sound button is in the menu
    PluginRegistry.getPlugin(TopMenu)?.navItems.push({
      id: 'layers-menu-btn',
      order: 2,
      classInner: 'top-menu-icons__blue-img',
      icon: layersPng,
      tooltip: 'Toggle Layers',
    });

    eventBus.on(EventBusEvent.uiManagerFinal, () => {
      getEl('layers-hover-menu')?.addEventListener('click', (e: MouseEvent) => {
        const hoverMenuItemClass = (e.target as HTMLElement)?.classList[1];

        if (hoverMenuItemClass) {
          this.layersHoverMenuClick(hoverMenuItemClass);
        }
      });
    });

  }

  layersHoverMenuClick(layersType: string) {
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();
    const colorSchemeInstance = colorSchemeManagerInstance.currentColorScheme;
    const slug = layersType.split('-')[1];
    let isFlagOn = true;

    if (colorSchemeManagerInstance.objectTypeFlags[slug]) {
      isFlagOn = false;
    }

    if (!isFlagOn) {
      getClass(`layers-${slug}-box`).forEach((el) => {
        el.style.background = 'black';
      });
    } else {
      getClass(`layers-${slug}-box`).forEach((el) => {
        const color = colorSchemeInstance?.colorTheme[slug] ?? null;

        if (!color) {
          errorManagerInstance.log(`Color not found for ${slug}`);
        } else {
          el.style.background = rgbCss(color);
        }
      });
    }

    colorSchemeManagerInstance.objectTypeFlags[slug] = isFlagOn;
    if (colorSchemeInstance) {
      colorSchemeInstance.objectTypeFlags[slug] = colorSchemeManagerInstance.objectTypeFlags[slug];
    }


    colorSchemeManagerInstance.calculateColorBuffers(true);
  }

  static change(menu: string) {
    settingsManager.currentLayer = menu;

    let layersHoverDom: HTMLElement | null;

    if (settingsManager.isMobileModeEnabled) {
      layersHoverDom = getEl('layers-hover-menu', true);
    } else {
      layersHoverDom = getEl('layers-hover-menu-popup', true);
    }

    if (!layersHoverDom) {
      return;
    }

    // TODO there should be a setting that determines the defaults (Celestrak Rebase)
    const selectedOption = LayersManager.menuOptions[menu] ?? ObjectTypeColorScheme.layersHtml;

    layersHoverDom.innerHTML = selectedOption;
    if (menu === 'clear') {
      layersHoverDom.style.display = 'none';
    }

    // Update Layers Colors
    LayersManager.layersColorsChange();
    EventBus.getInstance().emit(EventBusEvent.layerUpdated, menu);
  }

  static layersColorsChange(): void {
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    colorSchemeManagerInstance.resetObjectTypeFlags();

    try {
      LayersManager.setColors_(colorSchemeManagerInstance);
    } catch {
      setTimeout(LayersManager.layersColorsChange, 100);
    }
  }

  private static setColors_(colorSchemeManagerInstance: ColorSchemeManager) {
    LayersManager.layersClassList.forEach((selector) => {
      const elementFromClass = document.querySelector(selector);

      if (elementFromClass && settingsManager.colors) {
        const rgba = settingsManager.colors[selector.split('-')[1]];

        if (!rgba) {
          return;
        }
        (<HTMLElement>elementFromClass).style.background = rgbCss(rgba);
      }
      colorSchemeManagerInstance.objectTypeFlags[selector.split('-')[1]] = true;
    });
  }
}

