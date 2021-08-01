import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  let isTwitterMenuOpen = false;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'twitterManager',
    cb: () => {
      // Side Menu
      $('#left-menus').append(keepTrackApi.html`
        <div id="twitter-menu" class="side-menu-parent start-hidden side-menu text-select"></div>
      `);

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-twitter" class="bmenu-item">
          <img alt="twitter" src="" delayedsrc="data:image/png;base64,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">
          <span class="bmenu-title">Twitter</span>
          <div class="status-icon"></div>
        </div>
      `);
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'twitter',
    cb: (iconName: string): void => {
      if (iconName === 'menu-twitter') {
        if (isTwitterMenuOpen) {
          isTwitterMenuOpen = false;
          keepTrackApi.programs.uiManager.hideSideMenus();
          return;
        } else {
          if (keepTrackApi.programs.settingsManager.isMobileModeEnabled) keepTrackApi.programs.uiManager.searchToggle(false);
          keepTrackApi.programs.uiManager.hideSideMenus();
          if ($('#twitter-menu').html() == '') {
            $('#twitter-menu').html(
              '<a class="twitter-timeline" data-theme="dark" data-link-color="#2B7BB9" href="https://twitter.com/RedKosmonaut/lists/space-news">A Twitter List by RedKosmonaut</a> <script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>'
            );
          }
          $('#twitter-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isTwitterMenuOpen = true;
          $('#menu-twitter').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'twitter',
    cb: (): void => {
      $('#twitter-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-twitter').removeClass('bmenu-item-selected');
      isTwitterMenuOpen = false;
    },
  });
};
