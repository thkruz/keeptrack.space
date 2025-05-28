import { KeepTrackApiEvents, MenuMode } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { ColorScheme } from '@app/singletons/color-schemes/color-scheme';
import { errorManagerInstance } from '@app/singletons/errorManager';
import palettePng from '@public/img/icons/palette.png';
import { ClickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class ColorMenu extends KeepTrackPlugin {
  readonly id = 'ColorMenu';
  dependencies_ = [];
  bottomIconImg = palettePng;

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconElementName: string = 'menu-color-scheme';
  sideMenuElementName: string = 'color-scheme-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="color-scheme-menu" class="side-menu-parent start-hidden text-select">
    <div id="colors-menu" class="side-menu">
      <ul>
        <h5 class="center-align">Color Schemes</h5>
        <li class="divider"></li>
        ${this.getSideMenuElementHtmlExtras()}
      </ul>
    </div>
  </div>`;

  rmbL1ElementName = 'colors-rmb';
  rmbL1Html = keepTrackApi.html`<li class="rmb-menu-item" id="${this.rmbL1ElementName}"><a href="#">Color Scheme &#x27A4;</a></li>`;

  isRmbOnEarth = true;
  isRmbOffEarth = true;
  rmbMenuOrder = 50;

  rmbL2ElementName = 'colors-rmb-menu';
  rmbL2Html = keepTrackApi.html`
  <ul class='dropdown-contents'>
    ${this.getRmbL2HtmlExtras()}
  </ul>`;

  getSideMenuElementHtmlExtras() {
    const colorSchemes = keepTrackApi.getColorSchemeManager().colorSchemeInstances;

    let html = '';

    for (const colorScheme in colorSchemes) {
      if (!colorSchemes[colorScheme].isOptionInColorMenu) {
        continue;
      }

      html += `<li class="menu-selectable" data-color="${colorSchemes[colorScheme].id}">${colorSchemes[colorScheme].label}</li>`;
    }

    return html;
  }

  getRmbL2HtmlExtras() {
    const colorSchemes = keepTrackApi.getColorSchemeManager().colorSchemeInstances;

    let html = '';

    for (const colorScheme in colorSchemes) {
      if (!colorSchemes[colorScheme].isOptionInRmbMenu) {
        continue;
      }

      html += `<li id="colors-${colorSchemes[colorScheme].id}-rmb"><a href="#">${colorSchemes[colorScheme].label}</a></li>`;
    }

    return html;
  }

  rmbCallback: (targetId: string | null, clickedSat?: number) => void = (targetId: string | null) => {
    for (const colorScheme in keepTrackApi.getColorSchemeManager().colorSchemeInstances) {
      if (targetId === `colors-${colorScheme}-rmb`) {
        ColorMenu.colorsMenuClick(colorScheme);

        return;
      }
    }

    if (targetId?.includes('colors-')) {
      errorManagerInstance.info(`Color scheme not found: ${targetId}`);
      ColorMenu.colorsMenuClick(targetId.slice(7).replace('-rmb', ''));
    }
  };

  dragOptions: ClickDragOptions = {
    isDraggable: true,
  };

  addHtml(): void {
    super.addHtml();
    keepTrackApi.on(
      KeepTrackApiEvents.uiManagerFinal,
      () => {
        getEl('colors-menu')
          ?.querySelectorAll('li')
          .forEach((element) => {
            element.addEventListener('click', () => {
              const colorName = element.dataset.color;

              ColorMenu.colorsMenuClick(colorName ?? '');
            });
          });
      },
    );
  }

  static readonly colorsMenuClick = (colorName: string) => {
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    // If selecteSatManager is loaded, clear selected sat
    keepTrackApi.getPlugin(SelectSatManager)?.selectSat(-1); // clear selected sat

    // Lets look through the addon color schemes
    for (const colorScheme in colorSchemeManagerInstance.colorSchemeInstances) {
      if (!(colorSchemeManagerInstance.colorSchemeInstances[colorScheme] instanceof ColorScheme)) {
        continue;
      }

      const colorSchemeInstance = colorSchemeManagerInstance.colorSchemeInstances[colorScheme];

      if (colorSchemeInstance.id === colorName) {
        colorSchemeInstance.onSelected();
        if (keepTrackApi.getGroupsManager().selectedGroup !== null) {
          colorSchemeManagerInstance.isUseGroupColorScheme = true;
        } else {
          colorSchemeManagerInstance.isUseGroupColorScheme = false;
        }
        colorSchemeManagerInstance.setColorScheme(colorSchemeInstance, true);
        keepTrackApi.getUiManager().hideSideMenus();

        return;
      }
    }

    // If we didn't find it in the addon color schemes its an error
    errorManagerInstance.warn(`Color scheme not found: ${colorName}`);
  };
}

