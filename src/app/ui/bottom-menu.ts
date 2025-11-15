import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { SoundNames } from '@app/plugins/sounds/sounds';
import barChart4BarsPng from '@public/img/icons/bar-chart-4-bars.png';
import developerModePng from '@public/img/icons/developer-mode.png';
import localCafePng from '@public/img/icons/local-cafe.png';
import sciencePng from '@public/img/icons/science.png';
import settingsPng from '@public/img/icons/settings.png';

export class BottomMenu {
  static readonly basicMenuId = 'menu-filter-basic';
  static readonly advancedMenuId = 'menu-filter-advanced';
  static readonly analysisMenuId = 'menu-filter-analysis';
  static readonly experimentalMenuId = 'menu-filter-experimental';
  static readonly settingsMenuId = 'menu-filter-settings';
  static readonly allMenuId = 'menu-filter-all';

  static init() {
    if (!settingsManager.isDisableBottomMenu) {
      EventBus.getInstance().on(EventBusEvent.uiManagerInit, BottomMenu.createBottomMenu);
      EventBus.getInstance().on(EventBusEvent.uiManagerFinal, BottomMenu.addBottomMenuFilterButtons);
    }
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, BottomMenu.updateBottomMenuVisibility_);

  }
  static createBottomMenu(): void {
    const bottomMenuNode = document.createElement('div');

    bottomMenuNode.id = 'nav-footer';
    bottomMenuNode.innerHTML = html`
      <div id="bottom-icons-container">
        <div id="bottom-icons-filter">
          <div id="${BottomMenu.basicMenuId}" class="bmenu-filter-item bmenu-item-selected">
            <div class="bmenu-filter-item-inner">
              <img alt="Basic Menu" src="" delayedsrc="${localCafePng}" />
            </div>
            <span class="bmenu-filter-title">Basic Menu</span>
          </div>
          <div id="${BottomMenu.advancedMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="Advanced Menu" src="" delayedsrc="${developerModePng}" />
            </div>
            <span class="bmenu-filter-title">Advanced Menu</span>
          </div>
          <div id="${BottomMenu.analysisMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="Analysis Menu" src="" delayedsrc="${barChart4BarsPng}" />
            </div>
            <span class="bmenu-filter-title">Analysis Menu</span>
          </div>
          <div id="${BottomMenu.settingsMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="Settings Menu" src="" delayedsrc="${settingsPng}" />
            </div>
            <span class="bmenu-filter-title">Settings Menu</span>
          </div>
          <div id="${BottomMenu.experimentalMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="Experimental Menu" src="" delayedsrc="${sciencePng}" />
            </div>
            <span class="bmenu-filter-title">Experimental Menu</span>
          </div>
          <div id="${BottomMenu.allMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="All Plugins" src="" delayedsrc="${developerModePng}" />
            </div>
            <span class="bmenu-filter-title">All Plugins</span>
          </div>
        </div>
        <div id="bottom-icons"></div>
      </div>
    `;
    getEl('nav-footer')!.appendChild(bottomMenuNode);
  }

  private static updateBottomMenuVisibility_() {
    if (settingsManager.isDisableBottomMenu || (getEl('bottom-icons') && getEl('bottom-icons')!.innerText === '')) {
      getEl('nav-footer')!.style.visibility = 'hidden';
      hideEl('nav-footer');
    } else {
      showEl('nav-footer');
    }

    const bottomContainer = getEl('bottom-icons-container');

    if (bottomContainer) {
      const bottomHeight = bottomContainer.offsetHeight;

      document.documentElement.style.setProperty('--bottom-menu-top', `${bottomHeight}px`);
    }
  }

  private static deselectAllBottomMenuFilterButtons_() {
    const menuIds = [
      BottomMenu.basicMenuId, BottomMenu.advancedMenuId, BottomMenu.analysisMenuId,
      BottomMenu.experimentalMenuId, BottomMenu.settingsMenuId, BottomMenu.allMenuId,
    ];

    const menuElements = menuIds.map((id) => getEl(id));

    if (menuElements.every((el) => el !== null)) {
      menuElements.forEach((el) => el.classList.remove('bmenu-item-selected'));
    } else {
      errorManagerInstance.warn('Failed to find all bottom menu filter buttons');
    }
  }

  private static onBottomMenuFilterClick_(menuButtonDom: HTMLElement, menuMode: MenuMode) {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
    settingsManager.activeMenuMode = menuMode;
    this.deselectAllBottomMenuFilterButtons_();
    menuButtonDom.classList.add('bmenu-item-selected');
    EventBus.getInstance().emit(EventBusEvent.bottomMenuModeChange);
  }

  static changeMenuMode(menuMode: MenuMode) {
    settingsManager.activeMenuMode = menuMode;
    EventBus.getInstance().emit(EventBusEvent.bottomMenuModeChange);
  }

  static addBottomMenuFilterButtons() {
    const menuBasicDom = getEl(BottomMenu.basicMenuId);
    const menuAdvancedDom = getEl(BottomMenu.advancedMenuId);
    const menuAnalysisDom = getEl(BottomMenu.analysisMenuId);
    const menuExperimentalDom = getEl(BottomMenu.experimentalMenuId);
    const menuSettingsDom = getEl(BottomMenu.settingsMenuId);
    const menuAllDom = getEl(BottomMenu.allMenuId);

    if (menuBasicDom && menuAdvancedDom && menuAnalysisDom && menuAllDom && menuExperimentalDom && menuSettingsDom) {
      menuBasicDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuBasicDom, MenuMode.BASIC));
      menuAdvancedDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuAdvancedDom, MenuMode.ADVANCED));
      menuAnalysisDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuAnalysisDom, MenuMode.ANALYSIS));
      menuExperimentalDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuExperimentalDom, MenuMode.EXPERIMENTAL));
      menuSettingsDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuSettingsDom, MenuMode.SETTINGS));
      menuAllDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuAllDom, MenuMode.ALL));

      EventBus.getInstance().emit(EventBusEvent.bottomMenuModeChange);
    } else {
      errorManagerInstance.warn('Failed to find all bottom menu filter buttons');
    }

    const wheel = (dom: EventTarget, deltaY: number) => {
      const domEl = dom as HTMLElement;
      const step = 0.15;
      const pos = domEl.scrollTop;
      const nextPos = pos + step * deltaY;

      domEl.scrollTop = nextPos;
    };

    ['bottom-icons', 'bottom-icons-filter'].forEach((divIdWithScroll) => {

      getEl(divIdWithScroll)!.addEventListener(
        'wheel',
        (event: WheelEvent) => {
          event.preventDefault(); // Prevent default scroll behavior
          if (event.currentTarget) {
            wheel(event.currentTarget, event.deltaY);
          }
        },
        { passive: false }, // Must be false to allow preventDefault()
      );
    });
  }
}
