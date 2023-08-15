import fullscreenIconPng from '@app/img/fullscreen-icon.png';
import helpPng from '@app/img/help.png';
import findPng from '@app/img/icons/find.png';
import githubPng from '@app/img/icons/github.png';
import soundOffPng from '@app/img/icons/sound-off.png';
import soundOnPng from '@app/img/icons/sound-on.png';
import layersIconPng from '@app/img/layers-icon.png';
import { keepTrackContainer } from '@app/js/container';
import { Singletons, SoundManager } from '@app/js/interfaces';
import { keepTrackApi, KeepTrackApiMethods } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { adviceManagerInstance } from '@app/js/singletons/adviceManager';
import { errorManagerInstance } from '../../singletons/errorManager';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class TopMenu extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Top Menu';
  static SEARCH_RESULT_ID = 'search-results';
  constructor() {
    super(TopMenu.PLUGIN_NAME);
  }

  addHtml = (): void => {
    super.addHtml();
    keepTrackApi.register({
      method: KeepTrackApiMethods.uiManagerInit,
      cbName: this.PLUGIN_NAME,
      cb: async () => {
        getEl('keeptrack-header').insertAdjacentHTML(
          'beforeend',
          keepTrackApi.html`
            <nav>
              <div id="nav-wrapper" class="nav-wrapper">
                <ul id="nav-mobile2" class="right">
                  <li>
                    <a id="geolocation-btn" class="start-hidden" href="#!"><i class="material-icons">location_on</i></a>
                  </li>
                  <li>
                    <a id="sound-btn" class="top-menu-btns bmenu-item-selected">
                      <div class="top-menu-icons">
                        <img id="sound-icon"
                        width="25"
                        height="25"
                        src="" delayedsrc="${soundOnPng}" alt="" />
                      </div>
                    </a>
                  </li>
                  <li>
                    <a id="legend-menu" class="top-menu-btns">
                      <div id="legend-icon" class="top-menu-icons">
                        <img src=${layersIconPng} alt="" />
                      </div>
                    </a>
                  </li>
                  <li>
                    <a id="tutorial-btn" class="top-menu-btns">
                      <div id="tutorial-icon" class="top-menu-icons">
                        <img src=${helpPng} alt="" />
                      </div>
                    </a>
                  </li>
                  <li>
                    <a id="fullscreen-icon" class="top-menu-icons"><img src=${fullscreenIconPng} alt="" /></a>
                  </li>
                  <li>
                    <a id="search-icon" class="top-menu-icons">
                      <img
                        alt="search-icon"
                        src="" delayedsrc="${findPng}"
                      />
                    </a>
                  </li>
                  <div id="search-holder" class="menu-item search-slide-up">
                    <input id="search" type="search" name="search" placeholder="Search.." required />
                  </div>
                </ul>
              </div>
              <div id="social-alt" class="left">
                <div id="share-icon-container">
                  <a id="github-share" class="share-up share-icons" rel="noreferrer" href="https://github.com/thkruz/keeptrack.space/" target="_blank">
                    <img
                      alt="github"
                      width="32"
                      height="32"
                      src="" delayedsrc="${githubPng}"
                    />
                  </a>
                </div>
              </div>
            </nav>
          `
        );

        getEl('keeptrack-main-container').insertAdjacentHTML(
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
          `
        );

        adviceManagerInstance.init();
      },
    });
  };

  addJs = (): void => {
    super.addJs();
    keepTrackApi.register({
      method: KeepTrackApiMethods.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: async () => {
        getEl('sound-btn').onclick = () => {
          const soundIcon = <HTMLImageElement>getEl('sound-icon');
          const soundManager = keepTrackContainer.get<SoundManager>(Singletons.SoundManager);

          if (!soundManager) {
            errorManagerInstance.warn('SoundManager is not enabled. Check your settings!');
            return;
          }

          if (!soundManager.isMute) {
            soundManager.isMute = true;
            soundIcon.src = soundOffPng;
            soundIcon.parentElement.classList.remove('bmenu-item-selected');
          } else {
            soundManager.isMute = false;
            soundIcon.src = soundOnPng;
            soundIcon.parentElement.classList.add('bmenu-item-selected');
          }
        };
      },
    });
  };
}

export const topMenuPlugin = new TopMenu();
