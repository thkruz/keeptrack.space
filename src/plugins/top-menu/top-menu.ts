import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { adviceManagerInstance } from '@app/engine/utils/adviceManager';
import { getEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import fullscreenPng from '@public/img/icons/fullscreen.png';
import helpPng from '@public/img/icons/help.png';
import layersPng from '@public/img/icons/layers.png';
import searchPng from '@public/img/icons/search.png';
import soundOffPng from '@public/img/icons/sound-off.png';
import soundOnPng from '@public/img/icons/sound-on.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { TooltipsPlugin } from '../tooltips/tooltips';

export class TopMenu extends KeepTrackPlugin {
  readonly id = 'TopMenu';
  dependencies_ = [];
  static readonly SEARCH_RESULT_ID = 'search-results';

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
                  <li>
                    <a id="sound-btn" class="top-menu-icons">
                      <div class="top-menu-icons bmenu-item-selected">
                        <img id="sound-icon"
                        src="" delayedsrc="${soundOnPng}" alt="" />
                      </div>
                    </a>
                  </li>
                  <li>
                    <a id="layers-menu-btn" class="top-menu-icons">
                      <div id="layers-icon" class="top-menu-icons">
                        <img src=${layersPng} alt="" />
                      </div>
                    </a>
                  </li>
                  <li>
                    <a id="tutorial-btn" class="top-menu-icons bmenu-item-disabled">
                      <div id="tutorial-icon" class="top-menu-icons">
                        <img src=${helpPng} alt="" />
                      </div>
                    </a>
                  </li>
                  <li>
                    <a id="fullscreen-icon" class="top-menu-icons"><img src=${fullscreenPng} alt="" /></a>
                  </li>
                  <li>
                    <a id="search-icon" class="top-menu-icons">
                      <img
                        alt="search-icon"
                        src="" delayedsrc="${searchPng}"
                      />
                    </a>
                  </li>
                  <div id="search-holder" class="menu-item search-slide-up">
                    <input id="search" type="search" name="search" placeholder="Search.." required />
                  </div>
                </ul>
              </div>
            </nav>
          `,
        );

        const tooltipsPlugin = keepTrackApi.getPlugin(TooltipsPlugin);

        tooltipsPlugin?.createTooltip('sound-btn', 'Toggle Sound On/Off');
        tooltipsPlugin?.createTooltip('layers-menu-btn', 'Toggle Layers');
        tooltipsPlugin?.createTooltip('tutorial-btn', 'Show Help');
        tooltipsPlugin?.createTooltip('fullscreen-icon', 'Toggle Fullscreen');

        adviceManagerInstance.init();
      },
    );
  }

  addJs() {
    super.addJs();
    keepTrackApi.on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('sound-btn')!.onclick = () => {
          const soundIcon = <HTMLImageElement>getEl('sound-icon');
          const soundManager = keepTrackApi.getSoundManager();

          if (!soundManager) {
            errorManagerInstance.warn('SoundManager is not enabled. Check your settings!');

            return;
          }

          if (!soundManager.isMute) {
            soundManager.isMute = true;
            soundIcon.src = soundOffPng;
            soundIcon.parentElement!.classList.remove('bmenu-item-selected');
            soundIcon.parentElement!.classList.add('bmenu-item-error');
          } else {
            soundManager.isMute = false;
            soundIcon.src = soundOnPng;
            soundIcon.parentElement!.classList.add('bmenu-item-selected');
            soundIcon.parentElement!.classList.remove('bmenu-item-error');
          }
        };
      },
    );

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
