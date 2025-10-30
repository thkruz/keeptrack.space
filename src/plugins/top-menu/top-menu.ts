import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { adviceManagerInstance } from '@app/engine/utils/adviceManager';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import fullscreenPng from '@public/img/icons/fullscreen.png';
import helpPng from '@public/img/icons/help.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class TopMenu extends KeepTrackPlugin {
  readonly id = 'TopMenu';
  dependencies_ = [];
  static readonly SEARCH_RESULT_ID = 'search-results';
  static readonly TOP_LEFT_ID = 'nav-top-left';
  static readonly TOP_RIGHT_ID = 'nav-top-right';
  static readonly NAV_WRAPPER_ID = 'nav-wrapper';

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
    EventBus.getInstance().on(
      EventBusEvent.uiManagerInit,
      () => {
        getEl('keeptrack-header')?.insertAdjacentHTML(
          'beforeend',
          html`
            <nav>
              <div id="${TopMenu.NAV_WRAPPER_ID}" class="nav-wrapper" style="display: flex; justify-content: flex-end;">
          <ul id="nav-top-right" class="right">
            ${this.navItems // NOSONAR
              .sort((a, b) => a.order - b.order)
              .map(
                (item) => `
                  <li>
                    <a id="${item.id}" class="top-menu-icons ${item.class ? `${item.class}` : ''}"
                      kt-tooltip="${item.tooltip}"
                    >
                      <div class="top-menu-icons ${item.classInner ? `${item.classInner}` : ''}">
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

        adviceManagerInstance.init();
      },
    );
  }

  addJs() {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.setSensor, this.updateSensorName.bind(this));
  }

  updateSensorName() {
    const sensorSelectedDom = getEl('sensor-selected', true);

    if (sensorSelectedDom) {
      const sensorTitle = ServiceLocator.getSensorManager()?.sensorTitle;

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
