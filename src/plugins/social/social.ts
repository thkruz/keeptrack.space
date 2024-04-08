import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import githubPng from '@public/img/icons/github.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class SocialMedia extends KeepTrackPlugin {
  dependencies = ['Top Menu'];
  constructor() {
    const PLUGIN_NAME = 'Social Media';

    super(PLUGIN_NAME);
  }

  addHtml() {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: SocialMedia.uiManagerFinal_,
    });
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
    getEl('nav-mobile2', true)?.insertBefore(githubShareElement, getEl('nav-mobile2').firstChild);
  }
}
