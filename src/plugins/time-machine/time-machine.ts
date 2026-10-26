import { CatalogManager } from '@app/app/data/catalog-manager';
import { GroupType } from '@app/app/data/object-group';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { ICommandPaletteCommand, ISettingsContribution, ISettingsContributor } from '@app/engine/plugins/core/plugin-capabilities';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
import historyPng from '@public/img/icons/history.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';

export class TimeMachine extends KeepTrackPlugin implements ISettingsContributor {
  readonly id = 'TimeMachine';
  static readonly TIME_BETWEEN_SATELLITES = 10000;
  dependencies_ = [];

  bottomIconCallback = () => {
    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    if (this.isMenuButtonActive) {
      this.clearSearch_();
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

  /** Number of analyst placeholder slots reserved from {@link CatalogManager.ANALYST_START_ID}. */
  private static readonly ANALYST_SLOT_COUNT_ = 10000;

  bottomIconImg = historyPng;
  bottomIconLabel = 'Time Machine';

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'TimeMachine.toggle',
        label: t7e('plugins.TimeMachine.commandPalette.toggle'),
        category: 'Playback',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getSettingsContribution(): ISettingsContribution {
    return {
      sectionId: this.id,
      sectionLabel: this.bottomIconLabel,
      controls: [
        {
          type: 'toggle',
          id: 'disableToasts',
          label: t7e('plugins.TimeMachine.settings.disableToasts.label'),
          helpText: t7e('plugins.TimeMachine.settings.disableToasts.helpText'),
          get: () => settingsManager.isDisableTimeMachineToasts,
          set: (next) => {
            settingsManager.isDisableTimeMachineToasts = next;
            PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DISABLE_TIME_MACHINE_TOASTS, next.toString());
          },
        },
      ],
    };
  }
  historyOfSatellitesRunCount = 0;
  isTimeMachineRunning = false;

  menuMode: MenuMode[] = [MenuMode.TOOLS, MenuMode.ALL];

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
        this.historyOfSatellitesRunCount
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
    const objectCache = ServiceLocator.getCatalogManager().objectCache;

    // Unfilled analyst slots carry a placeholder 1958 designator: they are not history.
    yearGroup.ids = yearGroup.ids.filter((id) => !TimeMachine.isInactiveAnalystSlot_(objectCache[id]));

    groupManagerInstance.selectGroup(yearGroup);
    yearGroup.updateOrbits();
    colorSchemeManagerInstance.isUseGroupColorScheme = true;
    colorSchemeManagerInstance.calculateColorBuffers();

    if (!settingsManager.isDisableTimeMachineToasts) {
      if (year >= 57 && year < 100) {
        const timeMachineString = <string>(settingsManager.timeMachineString(year.toString()) || t7e('plugins.TimeMachine.yearToast').replace('{year}', `19${year}`));

        ServiceLocator.getUiManager().toast(timeMachineString, ToastMsgType.normal, settingsManager.timeMachineLongToast);
      } else {
        const yearStr = year < 10 ? `0${year}` : `${year}`;
        const timeMachineString = <string>(settingsManager.timeMachineString(yearStr) || t7e('plugins.TimeMachine.yearToast').replace('{year}', `20${yearStr}`));

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
    this.isTimeMachineRunning = false;
    // A natural end must un-light the rail item too; keep any side menu the user opened meanwhile.
    this.setBottomIconToUnselected(false);
    groupManagerInstance.clearSelect();
    colorSchemeManagerInstance.calculateColorBuffers(true);
  }

  /**
   * Drops the search filter and empties `#search` with it, so the box never claims a filter the run removed.
   */
  private clearSearch_(): void {
    const searchInput = getEl('search', true) as HTMLInputElement | null;

    if (searchInput) {
      searchInput.value = '';
    }

    try {
      // doSearch('') hides the results, clears the group and tells listeners (URL bar) the search is gone.
      ServiceLocator.getUiManager().searchManager.doSearch('');
    } catch (error) {
      errorManagerInstance.log(error);
    }
  }

  /** An analyst placeholder slot (NORAD 90000-99999) that nothing has filled yet. */
  private static isInactiveAnalystSlot_(obj: { active?: boolean; sccNum?: string } | null | undefined): boolean {
    if (!obj || obj.active || typeof obj.sccNum !== 'string') {
      return false;
    }
    const sccNum = Number(obj.sccNum);

    return Number.isInteger(sccNum) && sccNum >= CatalogManager.ANALYST_START_ID && sccNum < CatalogManager.ANALYST_START_ID + TimeMachine.ANALYST_SLOT_COUNT_;
  }
}
