import { KeepTrackApiEvents } from '@app/engine/core/interfaces';
import { getEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import githubPng from '@public/img/icons/github.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { TopMenu } from '../top-menu/top-menu';

export class SocialMedia extends KeepTrackPlugin {
  readonly id = 'SocialMedia';
  dependencies_ = [TopMenu.name];
  addHtml() {
    super.addHtml();
    keepTrackApi.on(
      KeepTrackApiEvents.uiManagerFinal,
      SocialMedia.uiManagerFinal_,
    );
  }

  private static uiManagerFinal_(): void {
    // Bottom Icon
    const githubShareElement = document.createElement('li');

    githubShareElement.innerHTML = keepTrackApi.html`
          <a id="github-share1" class="top-menu-icons" rel="noreferrer" href="https://github.com/thkruz/keeptrack.space/" target="_blank">
            <img
            src="${githubPng}"
            />
          </a>
          `;
    getEl('nav-mobile2', true)?.insertBefore(githubShareElement, getEl('nav-mobile2')?.firstChild ?? null);
  }
}
