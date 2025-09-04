import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { addonColorSchemes } from '@app/engine/rendering/color-scheme-addons';
import type { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { ObjectTypeColorScheme } from '@app/engine/rendering/color-schemes/object-type-color-scheme';
import { getEl } from '../../engine/utils/get-el';
import { rgbCss } from '../../engine/utils/rgbCss';
import { keepTrackApi } from '../../keepTrackApi';
import {
  astronomyDiv,
  deepDiv,
  nearDiv,
  planetariumDiv,
} from './layers-manager/layers-divs';

export abstract class LayersManager {
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

  static change(menu: string) {
    let layersHoverDom: HTMLElement | null;

    if (settingsManager.isMobileModeEnabled) {
      layersHoverDom = getEl('layers-hover-menu');
    } else {
      layersHoverDom = getEl('layers-hover-menu-popup');
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
    settingsManager.currentLayer = menu;
    keepTrackApi.emit(EventBusEvent.layerUpdated, menu);
  }

  static layersColorsChange(): void {
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

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

