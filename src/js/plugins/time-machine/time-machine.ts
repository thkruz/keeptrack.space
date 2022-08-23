import timeMachinePng from '@app/img/icons/time-machine.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { ColorSchemeManager } from '@app/js/colorManager/colorSchemeManager';
import { GroupsManager } from '@app/js/groupsManager/groupsManager';
import { getEl } from '@app/js/lib/helpers';
import { OrbitManager } from '@app/js/orbitManager/orbitManager';
import { CatalogManager } from '@app/js/satSet/satSet';
import $ from 'jquery';

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'timeMachine',
    cb: uiManagerInit,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'timeMachine',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'orbitManagerInit',
    cbName: 'timeMachine',
    cb: orbitManagerInit,
  });
};

export const uiManagerInit = (): any => {
  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-time-machine" class="bmenu-item">
          <img alt="time-machine" src="" delayedsrc="${timeMachinePng}" />
          <span class="bmenu-title">Time Machine</span>
          <div class="status-icon"></div>
        </div>
      `
  );

  getEl('menu-time-machine').addEventListener('click', timeMachineIconClick);
};

export const bottomMenuClick = (iconName: string): void => {
  const { orbitManager, groupsManager, satSet, colorSchemeManager } = keepTrackApi.programs;
  if (iconName === 'menu-time-machine') {
    if (orbitManager.isTimeMachineRunning) {
      // Merge to one variable?
      orbitManager.isTimeMachineRunning = false;
      orbitManager.isTimeMachineVisible = false;

      settingsManager.colors.transparent = orbitManager.tempTransColor;
      groupsManager.clearSelect();
      satSet.setColorScheme(colorSchemeManager.default, true); // force color recalc

      getEl('menu-time-machine').classList.remove('bmenu-item-selected');
      return;
    } else {
      // Merge to one variable?
      orbitManager.isTimeMachineRunning = true;
      orbitManager.isTimeMachineVisible = true;
      getEl('menu-time-machine').classList.add('bmenu-item-selected');
      orbitManager.historyOfSatellitesPlay();
      return;
    }
  }
};

export const orbitManagerInit = (): void => {
  const { orbitManager, satSet, colorSchemeManager, groupsManager } = keepTrackApi.programs;
  orbitManager.playNextSatellite = (runCount: number, year: number) => {
    if (!keepTrackApi.programs.orbitManager.isTimeMachineVisible) return;
    // Kill all old async calls if run count updates
    if (runCount !== orbitManager.historyOfSatellitesRunCount) return;
    const yearGroup = groupsManager.createGroup('yearOrLess', year);
    groupsManager.selectGroup(yearGroup);
    yearGroup.updateOrbits(orbitManager);
    satSet.setColorScheme(colorSchemeManager.group, true); // force color recalc
    if (year >= 59 && year < 100) {
      const timeMachineString = settingsManager.timeMachineString(year.toString()) || `Time Machine In Year 19${year}!`;
      keepTrackApi.programs.uiManager.toast(timeMachineString, 'normal', settingsManager.timeMachineLongToast);
    } else {
      const yearStr = year < 10 ? `0${year}` : `${year}`;
      const timeMachineString = settingsManager.timeMachineString(yearStr) || `Time Machine In Year 20${yearStr}!`;
      keepTrackApi.programs.uiManager.toast(timeMachineString, 'normal', settingsManager.timeMachineLongToast);
    }

    if (year == parseInt(new Date().getUTCFullYear().toString().slice(2, 4))) {
      if (settingsManager.loopTimeMachine) {
        setTimeout(() => {
          orbitManager.historyOfSatellitesPlay();
        }, settingsManager.timeMachineDelay);
      } else {
        setTimeout(function () {
          timeMachineRemoveSatellite(runCount, orbitManager, groupsManager, satSet, colorSchemeManager);
        }, 10000); // Linger for 10 seconds
      }
    }
  };

  // Used to kill old async calls
  orbitManager.historyOfSatellitesRunCount = 0;
  orbitManager.historyOfSatellitesPlay = () => {
    orbitManager.historyOfSatellitesRunCount++;
    orbitManager.isTimeMachineRunning = true;
    orbitManager.tempTransColor = settingsManager.colors.transparent;
    settingsManager.colors.transparent = [0, 0, 0, 0];
    for (let yy = 0; yy <= 200; yy++) {
      let year = 59 + yy;
      if (year >= 100) year = year - 100;
      setTimeout(
        // eslint-disable-next-line no-loop-func
        function (runCount) {
          orbitManager.playNextSatellite(runCount, year);
        },
        settingsManager.timeMachineDelay * yy,
        orbitManager.historyOfSatellitesRunCount
      );
      // TODO: year should be dynamically calculated
      if (year == 22) break;
    }
  };
};
export const timeMachineIconClick = () => {
  const { searchBox, uiManager } = keepTrackApi.programs;
  if ($('#time-machine-menu').css('display') === 'block') {
    uiManager.legendMenuChange('clear');
  } else {
    uiManager.legendMenuChange('timeMachine');
    searchBox.hideResults();
  }
};
export const timeMachineRemoveSatellite = (
  runCount: number,
  orbitManager: OrbitManager,
  groupsManager: GroupsManager,
  satSet: CatalogManager,
  colorSchemeManager: ColorSchemeManager
): void => {
  if (runCount !== orbitManager.historyOfSatellitesRunCount) return;
  if (!orbitManager.isTimeMachineVisible) return;
  settingsManager.colors.transparent = <[number, number, number, number]>orbitManager.tempTransColor;
  orbitManager.isTimeMachineRunning = false;
  groupsManager.clearSelect();
  satSet.setColorScheme(colorSchemeManager.default, true);
};
