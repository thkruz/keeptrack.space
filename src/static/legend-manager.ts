import { KeepTrackApiEvents } from '@app/interfaces';
import { addonColorSchemes } from '@app/singletons/color-scheme-addons';
import type { ColorSchemeManager } from '@app/singletons/color-scheme-manager';
import { ObjectTypeColorScheme } from '@app/singletons/color-schemes/object-type-color-scheme';
import { keepTrackApi } from '../keepTrackApi';
import { getEl } from '../lib/get-el';
import { rgbCss } from '../lib/rgbCss';
import {
  astronomyDiv,
  deepDiv,
  nearDiv,
  planetariumDiv,
} from './legend-manager/legend-divs';

export abstract class LegendManager {
  private static legendClassList = [
    '.legend-inviewAlt-box',
    '.legend-starLow-box',
    '.legend-starMed-box',
    '.legend-starHi-box',
    '.legend-inviewAlt-box',
    '.legend-satLEO-box',
    '.legend-satGEO-box',
  ];

  private static menuOptions = {
    near: nearDiv,
    deep: deepDiv,
    planetarium: planetariumDiv,
    astronomy: astronomyDiv,
    clear: '',
    default: '',
  };

  static {
    const addonLegends = {};
    const addonlegendClassList = [] as string[];

    for (const ColorSchemeClass of addonColorSchemes) {
      addonLegends[ColorSchemeClass.id] = ColorSchemeClass.legendHtml;

      for (const flag in ColorSchemeClass.uniqueObjectTypeFlags) {
        if (flag) {
          addonlegendClassList.push(`.legend-${flag}-box`);
        }
      }
    }

    LegendManager.menuOptions = { ...LegendManager.menuOptions, ...addonLegends };
    LegendManager.legendClassList = [...LegendManager.legendClassList, ...addonlegendClassList];
  }

  static change(menu: string) {
    const legendHoverDom = getEl('legend-hover-menu');

    if (!legendHoverDom) {
      return;
    }

    // TODO there should be a setting that determines the defaults (Celestrak Rebase)
    const selectedOption = LegendManager.menuOptions[menu] ?? ObjectTypeColorScheme.legendHtml;

    legendHoverDom.innerHTML = selectedOption;
    if (menu === 'clear') {
      legendHoverDom.style.display = 'none';
    }

    // Update Legend Colors
    LegendManager.legendColorsChange();
    settingsManager.currentLegend = menu;
    keepTrackApi.emit(KeepTrackApiEvents.legendUpdated, menu);
  }

  static legendColorsChange(): void {
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    colorSchemeManagerInstance.resetObjectTypeFlags();

    try {
      LegendManager.setColors_(colorSchemeManagerInstance);
    } catch {
      setTimeout(LegendManager.legendColorsChange, 100);
    }
  }

  private static setColors_(colorSchemeManagerInstance: ColorSchemeManager) {
    LegendManager.legendClassList.forEach((selector) => {
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
