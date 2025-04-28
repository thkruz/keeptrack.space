import { KeepTrackApiEvents, MenuMode } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { SoundNames } from '@app/plugins/sounds/SoundNames';
import { errorManagerInstance } from '@app/singletons/errorManager';
import barChart4BarsPng from '@public/img/icons/bar-chart-4-bars.png';
import developerModePng from '@public/img/icons/developer-mode.png';
import localCafePng from '@public/img/icons/local-cafe.png';
import sciencePng from '@public/img/icons/science.png';

export class BottomMenu {
  static init() {
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerInit,
      cbName: BottomMenu.name,
      cb: BottomMenu.createBottomMenu,
    });
  }
  static createBottomMenu(): void {
    const bottomMenuNode = document.createElement('div');

    bottomMenuNode.id = 'nav-footer';
    bottomMenuNode.innerHTML = keepTrackApi.html`
          <div id="bottom-icons-container">
            <div id="bottom-icons-filter">
              <div id="menu-filter-basic" class="bmenu-filter-item bmenu-item-selected">
                <div class="bmenu-filter-item-inner">
                  <img alt="Basic Menu" src="" delayedsrc="${localCafePng}" />
                </div>
                <span class="bmenu-filter-title">Basic Menu</span>
              </div>
              <div id="menu-filter-advanced" class="bmenu-filter-item">
                <div class="bmenu-filter-item-inner">
                  <img alt="Advanced Menu" src="" delayedsrc="${developerModePng}" />
                </div>
                <span class="bmenu-filter-title">Advanced Menu</span>
              </div>
              <div id="menu-filter-analysis" class="bmenu-filter-item">
                <div class="bmenu-filter-item-inner">
                  <img alt="Analysis Menu" src="" delayedsrc="${barChart4BarsPng}" />
                </div>
                <span class="bmenu-filter-title">Analysis Menu</span>
              </div>
              <div id="menu-filter-experimental" class="bmenu-filter-item">
                <div class="bmenu-filter-item-inner">
                  <img alt="Experimental Menu" src="" delayedsrc="${sciencePng}" />
                </div>
                <span class="bmenu-filter-title">Experimental Menu</span>
              </div>
              <div id="menu-filter-all" class="bmenu-filter-item">
                <div class="bmenu-filter-item-inner">
                  <img alt="All Plugins" src="" delayedsrc="${developerModePng}" />
                </div>
                <span class="bmenu-filter-title">All Plugins</span>
              </div>
            </div>
            <div id="bottom-icons"></div>
          </div>
        `;

    getEl('nav-footer').appendChild(bottomMenuNode);
  }

  private static deselectAllBottomMenuFilterButtons_() {
    const menuIds = [
      'menu-filter-basic', 'menu-filter-advanced', 'menu-filter-analysis',
      'menu-filter-experimental', 'menu-filter-all',
    ];

    const menuElements = menuIds.map((id) => getEl(id));

    if (menuElements.every((el) => el !== null)) {
      menuElements.forEach((el) => el.classList.remove('bmenu-item-selected'));
    } else {
      errorManagerInstance.warn('Failed to find all bottom menu filter buttons');
    }
  }

  private static onBottomMenuFilterClick_(menuButtonDom: HTMLElement, menuMode: MenuMode) {
    keepTrackApi.getSoundManager()?.play(SoundNames.MENU_BUTTON);
    settingsManager.menuMode = menuMode;
    this.deselectAllBottomMenuFilterButtons_();
    menuButtonDom.classList.add('bmenu-item-selected');
    keepTrackApi.runEvent(KeepTrackApiEvents.bottomMenuModeChange);
  }

  static addBottomMenuFilterButtons() {
    const menuBasicDom = getEl('menu-filter-basic');
    const menuAdvancedDom = getEl('menu-filter-advanced');
    const menuAnalysisDom = getEl('menu-filter-analysis');
    const menuExperimentalDom = getEl('menu-filter-experimental');
    const menuAllDom = getEl('menu-filter-all');

    if (menuBasicDom && menuAdvancedDom && menuAnalysisDom && menuAllDom && menuExperimentalDom) {
      menuBasicDom.addEventListener('click', () => this.onBottomMenuFilterClick_(menuBasicDom, MenuMode.BASIC));
      menuAdvancedDom.addEventListener('click', () => this.onBottomMenuFilterClick_(menuAdvancedDom, MenuMode.ADVANCED));
      menuAnalysisDom.addEventListener('click', () => this.onBottomMenuFilterClick_(menuAnalysisDom, MenuMode.ANALYSIS));
      menuExperimentalDom.addEventListener('click', () => this.onBottomMenuFilterClick_(menuExperimentalDom, MenuMode.EXPERIMENTAL));
      menuAllDom.addEventListener('click', () => this.onBottomMenuFilterClick_(menuAllDom, MenuMode.ALL));

      keepTrackApi.runEvent(KeepTrackApiEvents.bottomMenuModeChange);
    } else {
      errorManagerInstance.warn('Failed to find all bottom menu filter buttons');
    }
  }
}
