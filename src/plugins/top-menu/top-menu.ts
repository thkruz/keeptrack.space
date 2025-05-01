import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { adviceManagerInstance } from '@app/singletons/adviceManager';
import fullscreenPng from '@public/img/icons/fullscreen.png';
import helpPng from '@public/img/icons/help.png';
import layersPng from '@public/img/icons/layers.png';
import searchPng from '@public/img/icons/search.png';
import soundOffPng from '@public/img/icons/sound-off.png';
import soundOnPng from '@public/img/icons/sound-on.png';
import { errorManagerInstance } from '../../singletons/errorManager';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class TopMenu extends KeepTrackPlugin {
  readonly id = 'TopMenu';
  dependencies_ = [];
  static readonly SEARCH_RESULT_ID = 'search-results';

  addHtml() {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerInit,
      cbName: this.id,
      cb: () => {
        getEl('keeptrack-header')?.insertAdjacentHTML(
          'beforeend',
          keepTrackApi.html`
            <nav>
              <div id="nav-wrapper" class="nav-wrapper">
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
                    <a id="legend-menu" class="top-menu-icons">
                      <div id="legend-icon" class="top-menu-icons">
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

        keepTrackApi.containerRoot?.insertAdjacentHTML(
          'beforeend',
          keepTrackApi.html`
            <div id="help-outer-container" class="valign">
              <div id="help-screen" class="valign-wrapper">
                <div id="help-inner-container" class="valign">
                  <p>
                    <span id="help-header" class="logo-font">TITLE</span>
                  </p>
                  <span id="help-text">ADVICE</span>
                </div>
              </div>
            </div>
          `,
        );

        adviceManagerInstance.init();
      },
    });
  }

  addJs() {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        getEl('sound-btn').onclick = () => {
          const soundIcon = <HTMLImageElement>getEl('sound-icon');
          const soundManager = keepTrackApi.getSoundManager();

          if (!soundManager) {
            errorManagerInstance.warn('SoundManager is not enabled. Check your settings!');

            return;
          }

          if (!soundManager.isMute) {
            soundManager.isMute = true;
            soundIcon.src = soundOffPng;
            soundIcon.parentElement.classList.remove('bmenu-item-selected');
            soundIcon.parentElement.classList.add('bmenu-item-error');
          } else {
            soundManager.isMute = false;
            soundIcon.src = soundOnPng;
            soundIcon.parentElement.classList.add('bmenu-item-selected');
            soundIcon.parentElement.classList.remove('bmenu-item-error');
          }
        };
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.setSensor,
      cbName: this.id,
      cb: () => {
        this.updateSensorName();
      },
    });
  }

  updateSensorName() {
    const sensorSelectedDom = getEl('sensor-selected', true);

    if (sensorSelectedDom) {
      const sensorTitle = keepTrackApi.getSensorManager()?.sensorTitle;

      // If this.sensorTitle is empty hide the div
      if (!sensorTitle || sensorTitle === '') {
        sensorSelectedDom.style.display = 'none';
      } else {
        sensorSelectedDom.innerText = sensorTitle;
        sensorSelectedDom.style.display = 'block';
      }
    }
  }
}
