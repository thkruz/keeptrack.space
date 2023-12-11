import timeMachinePng from '@app/img/icons/time-machine.png';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { StandardColorSchemeManager } from '@app/js/singletons/color-scheme-manager';
import { GroupType } from '@app/js/singletons/object-group';
import { LegendManager } from '@app/js/static/legend-manager';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class TimeMachine extends KeepTrackPlugin {
  static readonly TIME_BETWEEN_SATELLITES = 10000;

  static PLUGIN_NAME = 'Time Machine';

  bottomIconCallback = () => {
    const groupManagerInstance = keepTrackApi.getGroupsManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();
    const orbitManagerInstance = keepTrackApi.getOrbitManager();

    if (this.isMenuButtonActive) {
      LegendManager.change('timeMachine');
      keepTrackApi.getUiManager().searchManager.hideResults();
      getEl('menu-time-machine').classList.add('bmenu-item-selected');
      this.historyOfSatellitesPlay();
    } else {
      this.isTimeMachineRunning = false;
      LegendManager.change('clear');
      settingsManager.colors.transparent = orbitManagerInstance.tempTransColor;
      groupManagerInstance.clearSelect();
      colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.default, true); // force color recalc

      getEl('menu-time-machine').classList.remove('bmenu-item-selected');
    }
  };

  bottomIconElementName = 'menu-time-machine';
  bottomIconImg = timeMachinePng;
  bottomIconLabel = 'Time Machine';
  historyOfSatellitesRunCount = 0;
  isTimeMachineRunning = false;

  constructor() {
    super(TimeMachine.PLUGIN_NAME);
  }

  historyOfSatellitesPlay() {
    this.isTimeMachineRunning = true;
    this.historyOfSatellitesRunCount++;
    keepTrackApi.getOrbitManager().tempTransColor = settingsManager.colors.transparent;
    settingsManager.colors.transparent = [0, 0, 0, 0];
    for (let yy = 0; yy <= 200; yy++) {
      let year = 57 + yy;
      if (year >= 100) year = year - 100;
      setTimeout(
        (runCount) => {
          this.playNextSatellite(runCount, year);
        },
        settingsManager.timeMachineDelay * yy,
        this.historyOfSatellitesRunCount
      );

      const currentYear = parseInt(new Date().getUTCFullYear().toString().slice(2, 4));
      if (year === currentYear) break;
    }
  }

  playNextSatellite(runCount: number, year: number) {
    if (!this.isTimeMachineRunning) {
      if (this.isMenuButtonActive) this.setBottomIconToUnselected();
      return;
    }
    const groupManagerInstance = keepTrackApi.getGroupsManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    // Kill all old async calls if run count updates
    if (runCount !== this.historyOfSatellitesRunCount) return;
    const yearGroup = groupManagerInstance.createGroup(GroupType.YEAR_OR_LESS, year);
    groupManagerInstance.selectGroup(yearGroup);
    yearGroup.updateOrbits();
    colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.group, true); // force color recalc

    if (!settingsManager.isDisableTimeMachineToasts) {
      if (year >= 57 && year < 100) {
        const timeMachineString = <string>(settingsManager.timeMachineString(year.toString()) || `Time Machine In Year 19${year}!`);
        keepTrackApi.getUiManager().toast(timeMachineString, 'normal', settingsManager.timeMachineLongToast);
      } else {
        const yearStr = year < 10 ? `0${year}` : `${year}`;
        const timeMachineString = <string>(settingsManager.timeMachineString(yearStr) || `Time Machine In Year 20${yearStr}!`);
        keepTrackApi.getUiManager().toast(timeMachineString, 'normal', settingsManager.timeMachineLongToast);
      }
    }

    if (year == parseInt(new Date().getUTCFullYear().toString().slice(2, 4))) {
      if (settingsManager.loopTimeMachine) {
        setTimeout(() => {
          this.historyOfSatellitesPlay();
        }, settingsManager.timeMachineDelay);
      } else {
        setTimeout(() => {
          this.removeSatellite(runCount, colorSchemeManagerInstance);
        }, TimeMachine.TIME_BETWEEN_SATELLITES); // Linger for 10 seconds
      }
    }
  }

  removeSatellite(runCount: number, colorSchemeManager: StandardColorSchemeManager): void {
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    const groupManagerInstance = keepTrackApi.getGroupsManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    if (runCount !== this.historyOfSatellitesRunCount) return;
    if (!this.isMenuButtonActive) return;
    settingsManager.colors.transparent = <[number, number, number, number]>orbitManagerInstance.tempTransColor;
    this.isMenuButtonActive = false;
    this.isTimeMachineRunning = false;
    groupManagerInstance.clearSelect();
    colorSchemeManagerInstance.setColorScheme(colorSchemeManager.default, true);
  }
}

export const timeMachinePlugin = new TimeMachine();
