import { TopMenuPlugin } from '@app/engine/plugins/top-menu-plugin';
import linkedInPng from '@public/img/icons/linkedin.png';

/**
 * A plugin for the top menu that adds a button to view the project on LinkedIn.
 *
 * This plugin displays an icon and tooltip, and opens the project's LinkedIn profile
 * in a new browser tab when clicked.
 *
 * TODO: The image needs to be recreated to match the style of the GitHub icon.
 *
 * This was created as an example of how to utilize the TopMenuPlugin for adding social media links.
 */
export class LinkedInLinkPlugin extends TopMenuPlugin {
  readonly id = 'LinkedInLinkPlugin';

  protected image = linkedInPng;
  protected tooltipText: string = 'View on LinkedIn';

  protected onClick_(): void {
    window.open('https://www.linkedin.com/company/keeptrackspace/', '_blank', 'noopener,noreferrer');
  }
}
