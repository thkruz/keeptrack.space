import githubPng from '@app/img/icons/github.png';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
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
      event: 'uiManagerFinal',
      cbName: this.PLUGIN_NAME,
      cb: SocialMedia.uiManagerFinal_,
    });
  }

  private static uiManagerFinal_(): void {
    // Bottom Icon
    const githubShareElement = document.createElement('li');
    githubShareElement.innerHTML = keepTrackApi.html`
          <a id="github-share1" class="top-menu-btns" rel="noreferrer" href="https://github.com/thkruz/keeptrack.space/" target="_blank">
            <img
            width="22"
            height="22"
            style="margin-top: 1px;"
            src="${githubPng}"
            />
          </a>
          `;
    getEl('nav-mobile2').insertBefore(githubShareElement, getEl('nav-mobile2').firstChild);
  }
}

export const socialMediaPlugin = new SocialMedia();
