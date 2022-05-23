import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { getEl, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import { twitterBottomIcon } from './components/twitter-bottom-icon';
import { twitterSideMenu } from './components/twitter-side-menu';
import './components/twitter.css';

export const init = (): void => {
  let isTwitterMenuOpen = false;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'twitterManager',
    cb: () => {
      getEl('left-menus').insertAdjacentHTML('beforeend', twitterSideMenu);
      getEl('bottom-icons').insertAdjacentHTML('beforeend', twitterBottomIcon);
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
          // Initial Load Only
          if (getEl('twitter-menu').innerHTML === '') {
            getEl('twitter-menu').innerHTML =
              '<a class="twitter-timeline" data-theme="dark" data-link-color="#2B7BB9" href="https://twitter.com/RedKosmonaut/lists/space-news">A Twitter List by RedKosmonaut</a>';
            const script = document.createElement('script');
            script.src = 'https://platform.twitter.com/widgets.js';
            script.async = true;
            getEl('twitter-menu').appendChild(script);
          }
          slideInRight(getEl('twitter-menu'), 1000);
          isTwitterMenuOpen = true;
          getEl('menu-twitter').classList.add('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'twitter',
    cb: (): void => {
      slideOutLeft(getEl('twitter-menu'), 1000);
      getEl('menu-twitter').classList.remove('bmenu-item-selected');
      isTwitterMenuOpen = false;
    },
  });
};
