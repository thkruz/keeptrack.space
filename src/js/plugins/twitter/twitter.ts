import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { slideInRight, slideOutLeft } from '@app/js/lib/helpers';
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
      document.getElementById('left-menus').innerHTML += twitterSideMenu;
      document.getElementById('bottom-icons').innerHTML += twitterBottomIcon;
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
          if (document.getElementById('twitter-menu').innerHTML === '') {
            document.getElementById('twitter-menu').innerHTML = '<script async src="platform.twitter.com/widgets.js" charset="utf-8"></script>';
          }
          slideInRight(document.getElementById('twitter-menu'), 1000);
          isTwitterMenuOpen = true;
          document.getElementById('menu-twitter').classList.add('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'twitter',
    cb: (): void => {
      slideOutLeft(document.getElementById('twitter-menu'), 1000);
      document.getElementById('menu-twitter').classList.remove('bmenu-item-selected');
      isTwitterMenuOpen = false;
    },
  });
};
