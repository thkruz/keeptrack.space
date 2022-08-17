import findPng from '@app/img/icons/find.png';
import githubPng from '@app/img/icons/github.png';
import soundOffPng from '@app/img/icons/sound-off.png';
import soundOnPng from '@app/img/icons/sound-on.png';
import twitterPng from '@app/img/icons/twitter.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { createError } from '@app/js/errorManager/errorManager';
import { getEl } from '@app/js/lib/helpers';
import $ from 'jquery';

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'topMenu',
    cb: async () => {
      try {
        // Bottom Icon
        (<any>$('#header')).append(keepTrackApi.html`
          <nav>
            <div id="nav-wrapper" class="nav-wrapper">
              <a id="share-icon" class="top-menu-icons"><img src="img/share-icon.png" alt="" /></a>
              <ul id="nav-mobile2" class="right">
                <li>
                  <a id="geolocation-btn" class="start-hidden" href="#!"><i class="material-icons">location_on</i></a>
                </li>
                <li>
                  <a id="sound-btn" class="top-menu-btns bmenu-item-selected">
                    <img id="sound-icon"
                    width="25"
                    height="25"
                      src="" delayedsrc="${soundOnPng}" alt="" />
                  </a>
                </li>
                <li>
                  <a id="legend-menu" class="top-menu-btns">
                    <div id="legend-icon" class="top-menu-icons">
                      <img src="img/layers-icon.png" alt="" />
                    </div>
                  </a>
                </li>
                <li>
                  <a id="tutorial-btn" class="top-menu-btns">
                    <div id="tutorial-icon" class="top-menu-icons">
                      <img src="img/help.png" alt="" />
                    </div>
                  </a>
                </li>
                <li>
                  <a id="fullscreen-icon" class="top-menu-icons"><img src="img/fullscreen-icon.png" alt="" /></a>
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
                <a id="twitter-share" class="share-up share-icons" rel="noreferrer" href="https://twitter.com/intent/tweet?text=http://keeptrack.space" target="_blank">
                  <img
                  width="32"
                  height="32"
                    src="" delayedsrc="${twitterPng}" 
                  />
                </a>
              </div>
            </div>
          </nav>        
        `);

        (<any>$('#main-container')).append(keepTrackApi.html`
          <div id="help-screen" class="valign-wrapper">
            <div id="help-inner-container" class="valign">
              <p>
                <span id="help-header" class="logo-font">TITLE</span>
                <span id="help-close">X</span>
              </p>
              <span id="help-text">ADVICE</span>
            </div>
          </div>
        `);

        await import('@app/js/uiManager/advice/adviceManager').then((mod) => {
          mod.init();
          keepTrackApi.programs.uiManager.menuController();
        });
      } catch (e) {
        /* istanbul ignore next */
        createError(e, 'topMenu.init');
      }
    },
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'topMenu',
    cb: async () => {
      getEl('sound-btn').onclick = () => {
        const soundIcon = <HTMLImageElement>getEl('sound-icon');
        if (!keepTrackApi.programs.soundManager.isMute) {
          keepTrackApi.programs.soundManager.isMute = true;
          soundIcon.src = soundOffPng;
          soundIcon.parentElement.classList.remove('bmenu-item-selected');
        } else {
          keepTrackApi.programs.soundManager.isMute = false;
          soundIcon.src = soundOnPng;
          soundIcon.parentElement.classList.add('bmenu-item-selected');
        }
      };
    },
  });
};
