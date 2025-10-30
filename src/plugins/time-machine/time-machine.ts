import { GroupType } from '@app/app/data/object-group';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import historyPng from '@public/img/icons/history.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class TimeMachine extends KeepTrackPlugin {
  readonly id = 'TimeMachine';
  static readonly TIME_BETWEEN_SATELLITES = 10000;
  dependencies_ = [];

  bottomIconCallback = () => {
    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    if (this.isMenuButtonActive) {
      ServiceLocator.getUiManager().searchManager.hideResults();
      this.setBottomIconToSelected();
      this.historyOfSatellitesPlay();
    } else {
      this.isTimeMachineRunning = false;
      settingsManager.colors.transparent = orbitManagerInstance.tempTransColor;
      groupManagerInstance.clearSelect();
      colorSchemeManagerInstance.calculateColorBuffers(true); // force color recalc
      this.setBottomIconToUnselected();
    }
  };


  bottomIconImg = historyPng;
  bottomIconLabel = 'Time Machine';
  historyOfSatellitesRunCount = 0;
  isTimeMachineRunning = false;

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  historyOfSatellitesPlay() {
    this.isTimeMachineRunning = true;
    this.historyOfSatellitesRunCount++;
    ServiceLocator.getOrbitManager().tempTransColor = settingsManager.colors.transparent;
    settingsManager.colors.transparent = [0, 0, 0, 0];
    for (let yy = 0; yy <= 200; yy++) {
      let year = 57 + yy;

      if (year >= 100) {
        year -= 100;
      }
      setTimeout(
        (runCount) => {
          this.playNextSatellite(runCount, year);
        },
        settingsManager.timeMachineDelay * yy,
        this.historyOfSatellitesRunCount,
      );

      const currentYear = parseInt(new Date().getUTCFullYear().toString().slice(2, 4));

      if (year === currentYear) {
        break;
      }
    }
  }

  playNextSatellite(runCount: number, year: number) {
    if (!this.isTimeMachineRunning) {
      if (this.isMenuButtonActive) {
        this.setBottomIconToUnselected();
      }

      return;
    }
    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    // Kill all old async calls if run count updates
    if (runCount !== this.historyOfSatellitesRunCount) {
      return;
    }
    const yearGroup = groupManagerInstance.createGroup(GroupType.YEAR_OR_LESS, year);

    groupManagerInstance.selectGroup(yearGroup);
    yearGroup.updateOrbits();
    colorSchemeManagerInstance.isUseGroupColorScheme = true;
    colorSchemeManagerInstance.calculateColorBuffers();

    if (!settingsManager.isDisableTimeMachineToasts) {
      if (year >= 57 && year < 100) {
        const timeMachineString = <string>(settingsManager.timeMachineString(year.toString()) || `Time Machine In Year 19${year}!`);

        ServiceLocator.getUiManager().toast(timeMachineString, ToastMsgType.normal, settingsManager.timeMachineLongToast);
      } else {
        const yearStr = year < 10 ? `0${year}` : `${year}`;
        const timeMachineString = <string>(settingsManager.timeMachineString(yearStr) || `Time Machine In Year 20${yearStr}!`);

        ServiceLocator.getUiManager().toast(timeMachineString, ToastMsgType.normal, settingsManager.timeMachineLongToast);
      }
    }

    if (year === parseInt(new Date().getUTCFullYear().toString().slice(2, 4))) {
      if (settingsManager.loopTimeMachine) {
        setTimeout(() => {
          this.historyOfSatellitesPlay();
        }, settingsManager.timeMachineDelayAtPresentDay);
      } else {
        setTimeout(() => {
          this.removeSatellite(runCount);
        }, TimeMachine.TIME_BETWEEN_SATELLITES); // Linger for 10 seconds
      }
    }
  }

  removeSatellite(runCount: number): void {
    const orbitManagerInstance = ServiceLocator.getOrbitManager();
    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    if (runCount !== this.historyOfSatellitesRunCount) {
      return;
    }
    if (!this.isMenuButtonActive) {
      return;
    }
    settingsManager.colors.transparent = orbitManagerInstance.tempTransColor;
    this.isMenuButtonActive = false;
    this.isTimeMachineRunning = false;
    groupManagerInstance.clearSelect();
    colorSchemeManagerInstance.calculateColorBuffers(true);
  }
}

