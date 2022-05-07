import { keepTrackApi } from '@app/js/api/keepTrackApi';
import $ from 'jquery';
import { scenarioCreatorBottomIcon } from './components/scenario-creator-bottom-icon';
import { scenarioCreatorSideMenu } from './components/scenario-creator-side-menu';

export let isScenarioCreatorMenuOpen = false;

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'scenarioCreator',
    cb: () => uiManagerInit(),
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'scenarioCreator',
    cb: (iconName: string): void => bottomMenuClick(iconName),
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'scenarioCreator',
    cb: (): void => hideSideMenus(),
  });
};

export const uiManagerInit = (): void => {
  $('#left-menus').append(scenarioCreatorSideMenu);
  $('#bottom-icons').append(scenarioCreatorBottomIcon);

  $('#scenario-creator-menu').resizable({
    handles: 'e',
    maxWidth: 1200,
    minWidth: 500,
  });

  $('#scenario-creator-form').on('submit', function (e: Event) {
    $('#loading-screen').fadeIn(1000, scenarioCreatorOnSubmit);
    e.preventDefault();
  });
};

export const scenarioCreatorOnSubmit = (): void => {
  const { satSet, satellite, sensorManager } = keepTrackApi.programs;

  const scenarioName: string = $('#scenario-creator-name').val();
  const scenarioStart: string = $('#scenario-creator-start').val();
  const scenarioStop: string = $('#scenario-creator-stop').val();
  const scenarioDensity: string = $('#scenario-creator-density').val();

  console.log(scenarioName, scenarioStart, scenarioStop, scenarioDensity);

  const sat = satSet.satData[0];
  const sensor = sensorManager.currentSensor[0];
  const satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);

  // TODO: Stop minus Start math
  const simLength = 120; // Seconds

  for (let s = 0; s < simLength * 1000; s += 55) {
    let now = new Date();
    now = new Date(now.getTime() + s);
    const rae = satellite.getRae(now, satrec, sensor);
    console.log(rae);
  }

  $('#loading-screen').fadeOut(1000);
};

/**
 * This function is called when the user clicks on a bottom icon
 * @param {string} iconName The name of the icon that was clicked
 * @returns {void}
 */
export const bottomMenuClick = (iconName: string): void => {
  switch (iconName) {
    case 'menu-scenario-creator':
      onScenarioCreatorBtnClick();
      break;
    default:
      break;
  }
};

export const onScenarioCreatorBtnClick = (): void => {
  if (isScenarioCreatorMenuOpen) {
    hideSideMenus();
  } else {
    showSideMenu();
  }
};

/**
 * This function is called when the user clicks on a menu item
 * @returns {void}
 */
export const hideSideMenus = (): void => {
  $('#scenario-creator-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-scenario-creator').removeClass('bmenu-item-selected');
  isScenarioCreatorMenuOpen = false;
};

export const showSideMenu = (): void => {
  $('#scenario-creator-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
  $('#menu-scenario-creator').addClass('bmenu-item-selected');
  isScenarioCreatorMenuOpen = true;
};
