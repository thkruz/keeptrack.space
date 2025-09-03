// eslint-disable-next-line max-classes-per-file
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { addonColorSchemes } from '@app/engine/rendering/color-scheme-addons';
import type { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { ObjectTypeColorScheme } from '@app/engine/rendering/color-schemes/object-type-color-scheme';
import { DraggableBox } from '@app/plugins-pro/draggable-box';
import { getEl } from '../../engine/utils/get-el';
import { rgbCss } from '../../engine/utils/rgbCss';
import { keepTrackApi } from '../../keepTrackApi';
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

  static menuOptions = {
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
    let legendHoverDom: HTMLElement | null;

    if (settingsManager.isMobileModeEnabled) {
      legendHoverDom = getEl('legend-hover-menu');
    } else {
      legendHoverDom = getEl('legend-hover-menu-popup');
    }

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
    keepTrackApi.emit(EventBusEvent.legendUpdated, menu);
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

export class LegendPopupBox extends DraggableBox {
  constructor() {
    super('legend-popup-box');
  }

  protected getBoxContentHtml(): string {
    return keepTrackApi.html`
      <div id="legend-hover-menu-popup">
      </div>
    `.trim();
  }

  protected onOpen(): void {
    super.onOpen();

    LegendManager.change(settingsManager.currentLegend);

    getEl('legend-hover-menu-popup')?.addEventListener('click', (e: MouseEvent) => {
      const hoverMenuItemClass = (e.target as HTMLElement)?.classList[1];

      if (hoverMenuItemClass) {
        keepTrackApi.getUiManager().legendHoverMenuClick(hoverMenuItemClass);
      }
    });
  }

  close(cb?: () => void): void {
    super.close(cb);
    keepTrackApi.getUiManager().isLegendMenuOpen = false;
  }
}
