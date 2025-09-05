import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { adviceManagerInstance } from '@app/engine/utils/adviceManager';
import { getEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import fullscreenPng from '@public/img/icons/fullscreen.png';
import helpPng from '@public/img/icons/help.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { TooltipsPlugin } from '../tooltips/tooltips';

export class TopMenu extends KeepTrackPlugin {
  readonly id = 'TopMenu';
  dependencies_ = [];
  static readonly SEARCH_RESULT_ID = 'search-results';

  navItems: {
    id: string;
    order: number;
    icon: string;
    class?: string;
    classInner?: string;
    tooltip: string;
  }[] = [
      {
        id: 'tutorial-btn',
        order: 3,
        class: 'bmenu-item-help bmenu-item-disabled',
        icon: helpPng,
        tooltip: 'Show Help',
      },
      {
        id: 'fullscreen-icon',
        order: 4,
        class: 'top-menu-icons__blue-img',
        icon: fullscreenPng,
        tooltip: 'Toggle Fullscreen',
      },
    ];

  addHtml() {
    super.addHtml();
    keepTrackApi.on(
      EventBusEvent.uiManagerInit,
      () => {
        getEl('keeptrack-header')?.insertAdjacentHTML(
          'beforeend',
          keepTrackApi.html`
            <nav>
              <div id="nav-wrapper" class="nav-wrapper" style="display: flex; justify-content: flex-end;">
          <ul id="nav-mobile2" class="right">
            ${this.navItems // NOSONAR
              .sort((a, b) => a.order - b.order)
              .map(
                (item) => `
                  <li>
                    <a id="${item.id}" class="top-menu-icons ${item.class ? ` ${item.class}` : ''}">
                      <div class="top-menu-icons ${item.classInner ? ` ${item.classInner}` : ''}">
                        <img
                          id="${item.id.replace('-btn', '-icon')}"
                          src="${item.icon}"
                        />
                      </div>
                    </a>
                  </li>
                `)
              .join('')}
            <div id="search-holder" class="menu-item search-slide-up">
              <input id="search" type="search" name="search" placeholder="Search.." required />
            </div>
          </ul>
              </div>
            </nav>
          `,
        );

        const tooltipsPlugin = keepTrackApi.getPlugin(TooltipsPlugin);

        tooltipsPlugin?.createTooltip('tutorial-btn', 'Show Help');
        tooltipsPlugin?.createTooltip('fullscreen-icon', 'Toggle Fullscreen');

        adviceManagerInstance.init();
      },
    );
  }

  addJs() {
    super.addJs();

    keepTrackApi.on(EventBusEvent.setSensor, this.updateSensorName.bind(this));
  }

  updateSensorName() {
    const sensorSelectedDom = getEl('sensor-selected', true);

    if (sensorSelectedDom) {
      const sensorTitle = keepTrackApi.getSensorManager()?.sensorTitle;

      // If this.sensorTitle is empty hide the div
      if (!sensorTitle || sensorTitle === '') {
        sensorSelectedDom.parentElement!.style.display = 'none';
      } else {
        sensorSelectedDom.innerText = sensorTitle;
        sensorSelectedDom.parentElement!.style.display = 'block';
      }
    }
  }
}
