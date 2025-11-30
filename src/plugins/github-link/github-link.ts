import { TopMenuPlugin } from '@app/engine/plugins/top-menu-plugin';
import { t7e } from '@app/locales/keys';
import githubPng from '@public/img/icons/github.png';

/**
 * A plugin for the top menu that adds a button to view the project on GitHub.
 *
 * This plugin displays an icon and tooltip, and opens the project's GitHub repository
 * in a new browser tab when clicked.
 */
export class GithubLinkPlugin extends TopMenuPlugin {
  readonly id = 'GithubLinkPlugin';

  protected image = githubPng;

  addHtml(): void {
    this.tooltipText = t7e('plugins.GithubLinkPlugin.tooltip');
    super.addHtml();
  }

  protected onClick_(): void {
    window.open('https://github.com/thkruz/keeptrack.space/', '_blank', 'noopener,noreferrer');
  }
}
