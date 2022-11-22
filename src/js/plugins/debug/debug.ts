import * as gremlins from 'gremlins.js';

import { clickAndDragWidth, getEl, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import { helpBodyTextDebug, helpTitleTextDebug } from './help';

// @ts-ignore-next-line
import debugPng from '@app/img/icons/debug.png';
import eruda from 'eruda';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

/*
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
export const getRandomInt = (min: number, max: number): any => {
  min = Number.isNaN(min) ? 0 : Math.ceil(min);
  max = Number.isNaN(max) ? 100 : Math.floor(max);
  // The use of Math.random here is for debugging purposes only.
  // It is not used in any cryptographic way.
  return Math.floor(Math.random() * (max - min + 1)) + min; // NOSONAR
};

export const defaultPositionSelector = () => {
  const x = getRandomInt(0, Math.max(0, document.documentElement.clientWidth - 1));
  const y = getRandomInt(Math.max(0, document.documentElement.clientHeight - 100), Math.max(0, document.documentElement.clientHeight - 1));
  return [x, y];
};
export const canClick = (element: { parentElement: { className: string } }) => {
  if (typeof element.parentElement == 'undefined' || element.parentElement == null) return null;
  return element.parentElement.className === 'bmenu-item';
};
export const startGremlins = () => {
  const bottomMenuGremlinClicker = gremlins.species.clicker({
    // Click only if parent is has class test-class
    canClick: canClick,
    defaultPositionSelector: defaultPositionSelector,
  });
  const bottomMenuGremlinScroller = gremlins.species.toucher({
    touchTypes: ['gesture'],
    defaultPositionSelector: defaultPositionSelector,
  });
  const distributionStrategy = gremlins.strategies.distribution({
    distribution: [0.3, 0.3, 0.1, 0.1, 0.1, 0.1],
    delay: 5, // wait 5 ms between each action
  });
  gremlins
    .createHorde({
      species: [
        bottomMenuGremlinClicker,
        bottomMenuGremlinScroller,
        gremlins.species.clicker(),
        gremlins.species.toucher(),
        gremlins.species.formFiller(),
        gremlins.species.typer(),
      ],
      mogwais: [gremlins.mogwais.alert(), gremlins.mogwais.fps(), gremlins.mogwais.gizmo({ maxErrors: 1000 })],
      strategies: [distributionStrategy],
    })
    .unleash();
};
export const runGremlins = () => {
  getEl('nav-footer').style.height = '200px';
  getEl('nav-footer-toggle').style.display = 'none';
  getEl('bottom-icons-container').style.height = '200px';
  getEl('bottom-icons').style.height = '200px';
  startGremlins();
};

let isDebugMenuOpen = false;

export const init = (): void => {
  keepTrackApi.programs.debug = {
    isErudaVisible: false,
    gremlinsSettings: {
      nb: 100000,
      delay: 5,
    },
    gremlins: runGremlins,
  };

  keepTrackApi.register({
    method: 'onHelpMenuClick',
    cbName: 'debugMenu',
    cb: onHelpMenuClick,
  });
};

export const onHelpMenuClick = (): boolean => {
  if (isDebugMenuOpen) {
    keepTrackApi.programs.adviceManager.showAdvice(helpTitleTextDebug, helpBodyTextDebug);
    return true;
  }
  return false;
};

export const initMenu = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'debug',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'debug',
    cb: uiManagerFinal,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'debug',
    cb: (iconName: string): void => bottomMenuClick(iconName),
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'debug',
    cb: (): void => hideSideMenus(),
  });
};

export const uiManagerInit = (): void => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
    <div id="debug-menu" class="side-menu-parent start-hidden text-select">
      <div id="debug-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Debug Menu</h5>
          <div class="center-align row">
            <button id="debug-console" class="btn btn-ui waves-effect waves-light" type="button">Open Debug Menu &#9658;</button>
          </div>
          <div class="center-align row">
            <button id="debug-gremlins" class="btn btn-ui waves-effect waves-light" type="button">Unleash Gremlins &#9658;</button>
          </div>
        </div>
      </div>
    </div>
    `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
    <div id="menu-debug" class="bmenu-item">
      <img
        alt="debug"
        src="${debugPng}"/>
      <span class="bmenu-title">Debug</span>
      <div class="status-icon"></div>
    </div>
  `
  );
};

export const uiManagerFinal = (): void => {
  clickAndDragWidth(getEl('debug-menu'));

  getEl('debug-console').addEventListener('click', () => {
    if (keepTrackApi.programs.debug.isErudaVisible) {
      eruda.hide();
      keepTrackApi.programs.debug.isErudaVisible = false;
    } else {
      eruda.show();
      keepTrackApi.programs.debug.isErudaVisible = true;
    }
  });

  getEl('debug-gremlins').addEventListener('click', () => {
    keepTrackApi.programs.debug.gremlins();
  });
};

export const bottomMenuClick = (iconName: string) => {
  const { uiManager } = keepTrackApi.programs;
  if (iconName === 'menu-debug') {
    if (isDebugMenuOpen) {
      isDebugMenuOpen = false;
      uiManager.hideSideMenus();
      return;
    } else {
      if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
      uiManager.hideSideMenus();
      slideInRight(getEl('debug-menu'), 1000);
      getEl('menu-debug').classList.add('bmenu-item-selected');
      isDebugMenuOpen = true;
    }
    return;
  }
};

export const hideSideMenus = () => {
  slideOutLeft(getEl('debug-menu'), 1000);
  getEl('menu-debug').classList.remove('bmenu-item-selected');
  isDebugMenuOpen = false;
};
