import twitterPng from '@app/img/icons/twitter.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import $ from 'jquery';

export const init = (): void => {
  let isTwitterMenuOpen = false;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'twitterManager',
    cb: () => {
      // Side Menu
      $('#left-menus').append(keepTrackApi.html`
        <div id="twitter-menu" class="side-menu-parent start-hidden text-select"></div>
      `);

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-twitter" class="bmenu-item">
          <img alt="twitter" src="" delayedsrc=${twitterPng}/>
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
          if (settingsManager.isMobileModeEnabled) keepTrackApi.programs.uiManager.searchToggle(false);
          keepTrackApi.programs.uiManager.hideSideMenus();
          if ($('#twitter-menu').html() == '') {
            $('#twitter-menu').html(
              '<a class="twitter-timeline" data-theme="dark" data-link-color="#2B7BB9" href="https://twitter.com/RedKosmonaut/lists/space-news">A Twitter List by RedKosmonaut</a> <script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>'
            );
          }
          (<any>$('#twitter-menu')).effect('slide', { direction: 'left', mode: 'show' }, 1000);
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
      (<any>$('#twitter-menu')).effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-twitter').removeClass('bmenu-item-selected');
      isTwitterMenuOpen = false;
    },
  });
};
