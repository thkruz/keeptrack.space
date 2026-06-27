import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import addSatellitePng from '@public/img/icons/add-satellite.png';
import barChart4BarsPng from '@public/img/icons/bar-chart-4-bars.png';
import buildCirclePng from '@public/img/icons/build-circle.png';
import databaseSearchPng from '@public/img/icons/database-search.png';
import developerModePng from '@public/img/icons/developer-mode.png';
import displaySettingsPng from '@public/img/icons/display-settings.png';
import eventNotePng from '@public/img/icons/event-note.png';
import radarPng from '@public/img/icons/radar.png';
import sciencePng from '@public/img/icons/science.png';
import settingsPng from '@public/img/icons/settings.png';
import targetPng from '@public/img/icons/target.png';

export class BottomMenu {
  static readonly catalogMenuId = 'menu-filter-catalog';
  static readonly sensorsMenuId = 'menu-filter-sensors';
  static readonly eventsMenuId = 'menu-filter-events';
  static readonly createMenuId = 'menu-filter-create';
  static readonly analysisMenuId = 'menu-filter-analysis';
  static readonly conjunctionsMenuId = 'menu-filter-conjunctions';
  static readonly displayMenuId = 'menu-filter-display';
  static readonly toolsMenuId = 'menu-filter-tools';
  static readonly settingsMenuId = 'menu-filter-settings';
  static readonly experimentalMenuId = 'menu-filter-experimental';
  static readonly allMenuId = 'menu-filter-all';
  static readonly utilityPanelId = 'bottom-icons-utility';
  static readonly utilityCameraContainerId = 'utility-camera-icons';
  static readonly utilityLayerContainerId = 'utility-layer-icons';
  static readonly utilitySettingsContainerId = 'utility-settings-icons';

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
          <div id="${BottomMenu.catalogMenuId}" class="bmenu-filter-item bmenu-item-selected">
            <div class="bmenu-filter-item-inner">
              <img alt="Catalog" src="" delayedsrc="${databaseSearchPng}" />
            </div>
            <span class="bmenu-filter-title">Catalog</span>
          </div>
          <div id="${BottomMenu.sensorsMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="Sensors" src="" delayedsrc="${radarPng}" />
            </div>
            <span class="bmenu-filter-title">Sensors</span>
          </div>
          <div id="${BottomMenu.eventsMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="Events" src="" delayedsrc="${eventNotePng}" />
            </div>
            <span class="bmenu-filter-title">Events</span>
          </div>
          <div id="${BottomMenu.createMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="Create" src="" delayedsrc="${addSatellitePng}" />
            </div>
            <span class="bmenu-filter-title">Create</span>
          </div>
          <div id="${BottomMenu.analysisMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="Analysis" src="" delayedsrc="${barChart4BarsPng}" />
            </div>
            <span class="bmenu-filter-title">Analysis</span>
          </div>
          <div id="${BottomMenu.conjunctionsMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="Conjunctions" src="" delayedsrc="${targetPng}" />
            </div>
            <span class="bmenu-filter-title">Conjunctions</span>
          </div>
          <div id="${BottomMenu.displayMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="Display" src="" delayedsrc="${displaySettingsPng}" />
            </div>
            <span class="bmenu-filter-title">Display</span>
          </div>
          <div id="${BottomMenu.toolsMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="Tools" src="" delayedsrc="${buildCirclePng}" />
            </div>
            <span class="bmenu-filter-title">Tools</span>
          </div>
          <div id="${BottomMenu.settingsMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="Settings" src="" delayedsrc="${settingsPng}" />
            </div>
            <span class="bmenu-filter-title">Settings</span>
          </div>
          <div id="${BottomMenu.experimentalMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="Experimental" src="" delayedsrc="${sciencePng}" />
            </div>
            <span class="bmenu-filter-title">Experimental</span>
          </div>
          <div id="${BottomMenu.allMenuId}" class="bmenu-filter-item">
            <div class="bmenu-filter-item-inner">
              <img alt="All Plugins" src="" delayedsrc="${developerModePng}" />
            </div>
            <span class="bmenu-filter-title">All Plugins</span>
          </div>
        </div>
        <div id="bottom-icons"></div>
        <div id="${BottomMenu.utilityPanelId}">
          <div class="utility-section-header">Camera Modes</div>
          <div id="${BottomMenu.utilityCameraContainerId}" class="utility-section-icons"></div>
          <hr class="utility-section-divider" />
          <div class="utility-section-header">Layer Toggles</div>
          <div id="${BottomMenu.utilityLayerContainerId}" class="utility-section-icons"></div>
          <hr class="utility-section-divider" />
          <div class="utility-section-header">Settings</div>
          <div id="${BottomMenu.utilitySettingsContainerId}" class="utility-section-icons"></div>
        </div>
      </div>
    `;
    getEl('nav-footer')!.appendChild(bottomMenuNode);
  }

  private static updateBottomMenuVisibility_() {
    if (settingsManager.isDisableBottomMenu || getEl('bottom-icons')?.innerText === '') {
      getEl('nav-footer')!.style.visibility = 'hidden';
      hideEl('nav-footer');
    } else {
      showEl('nav-footer');
    }

    BottomMenu.updateUtilitySectionVisibility_();

    const bottomContainer = getEl('bottom-icons-container');

    if (bottomContainer) {
      const bottomHeight = bottomContainer.offsetHeight;

      document.documentElement.style.setProperty('--bottom-menu-top', `${bottomHeight}px`);
    }
  }

  /**
   * Hides utility panel sections whose icon containers are empty.
   * Each section consists of a header, an icons container, and an optional trailing divider.
   */
  private static updateUtilitySectionVisibility_() {
    const containerIds = [
      BottomMenu.utilityCameraContainerId,
      BottomMenu.utilityLayerContainerId,
      BottomMenu.utilitySettingsContainerId,
    ];

    let anyVisible = false;

    for (const id of containerIds) {
      const iconsEl = getEl(id);

      if (!iconsEl) {
        continue;
      }

      const isEmpty = iconsEl.children.length === 0;
      const header = iconsEl.previousElementSibling as HTMLElement | null;
      const divider = iconsEl.nextElementSibling as HTMLElement | null;

      iconsEl.style.display = isEmpty ? 'none' : '';
      if (header?.classList.contains('utility-section-header')) {
        header.style.display = isEmpty ? 'none' : '';
      }
      if (divider?.classList.contains('utility-section-divider')) {
        divider.style.display = isEmpty ? 'none' : '';
      }

      if (!isEmpty) {
        anyVisible = true;
      }
    }

    const utilityPanel = getEl(BottomMenu.utilityPanelId);

    if (utilityPanel) {
      utilityPanel.style.display = anyVisible ? '' : 'none';
    }
  }

  private static deselectAllBottomMenuFilterButtons_() {
    const menuIds = [
      BottomMenu.catalogMenuId, BottomMenu.sensorsMenuId, BottomMenu.eventsMenuId, BottomMenu.createMenuId,
      BottomMenu.analysisMenuId, BottomMenu.displayMenuId, BottomMenu.toolsMenuId,
      BottomMenu.settingsMenuId, BottomMenu.experimentalMenuId, BottomMenu.allMenuId,
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
    const menuCatalogDom = getEl(BottomMenu.catalogMenuId);
    const menuSensorsDom = getEl(BottomMenu.sensorsMenuId);
    const menuEventsDom = getEl(BottomMenu.eventsMenuId);
    const menuCreateDom = getEl(BottomMenu.createMenuId);
    const menuAnalysisDom = getEl(BottomMenu.analysisMenuId);
    const menuConjunctionsDom = getEl(BottomMenu.conjunctionsMenuId);
    const menuDisplayDom = getEl(BottomMenu.displayMenuId);
    const menuToolsDom = getEl(BottomMenu.toolsMenuId);
    const menuSettingsDom = getEl(BottomMenu.settingsMenuId);
    const menuExperimentalDom = getEl(BottomMenu.experimentalMenuId);
    const menuAllDom = getEl(BottomMenu.allMenuId);

    if (menuCatalogDom && menuSensorsDom && menuEventsDom && menuCreateDom && menuAnalysisDom && menuConjunctionsDom &&
        menuDisplayDom && menuToolsDom && menuSettingsDom && menuExperimentalDom && menuAllDom) {
      menuCatalogDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuCatalogDom, MenuMode.CATALOG));
      menuSensorsDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuSensorsDom, MenuMode.SENSORS));
      menuEventsDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuEventsDom, MenuMode.EVENTS));
      menuCreateDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuCreateDom, MenuMode.CREATE));
      menuAnalysisDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuAnalysisDom, MenuMode.ANALYSIS));
      menuConjunctionsDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuConjunctionsDom, MenuMode.CONJUNCTIONS));
      menuDisplayDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuDisplayDom, MenuMode.DISPLAY));
      menuToolsDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuToolsDom, MenuMode.TOOLS));
      menuSettingsDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuSettingsDom, MenuMode.SETTINGS));
      menuExperimentalDom.addEventListener('click', () => BottomMenu.onBottomMenuFilterClick_(menuExperimentalDom, MenuMode.EXPERIMENTAL));
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

    ['bottom-icons', 'bottom-icons-filter', BottomMenu.utilityPanelId].forEach((divIdWithScroll) => {

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
