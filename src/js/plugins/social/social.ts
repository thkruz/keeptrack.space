import githubPng from '@app/img/icons/github.png';
import twitterPng from '@app/img/icons/twitter.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import $ from 'jquery';

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'social',
    cb: () => {
      // Bottom Icon
      (<any>$('#nav-mobile2')).prepend(keepTrackApi.html`
        <li>
          <a id="github-share1" class="top-menu-btns" rel="noreferrer" href="https://github.com/thkruz/keeptrack.space/" target="_blank">
            <img
            width="22"
            height="22"
            style="margin-top: 1px;"
            src="${githubPng}" 
            />
          </a>
        </li>
        <li>
          <a id="twitter-share1" class="top-menu-btns" rel="noreferrer" href="https://twitter.com/intent/tweet?text=http://keeptrack.space" target="_blank">
            <img
            width="25"
            height="25"
            src="${twitterPng}" 
            />
          </a>
        </li>
      `);
    },
  });
};
