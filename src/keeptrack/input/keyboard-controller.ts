import { Doris } from '@app/doris/doris';
import { InputEvents } from '@app/doris/events/event-types';
import { ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';

export class KeyboardController {
  private static instance: KeyboardController;

  static getInstance(): KeyboardController {
    if (!this.instance) {
      this.instance = new KeyboardController();
    }

    return this.instance;
  }

  initialize() {
    Doris.getInstance().on(InputEvents.KeyDown, (_e: KeyboardEvent, key: string, _isRepeat: boolean, _isCtrlPressed: boolean, isShiftPressed: boolean) => {
      switch (key) {
        case 'B':
          keepTrackApi.getUiManager().toggleBottomMenu();
          break;
        case 'E':
          this.toggleEciOrEcf_();
          break;
        case 'F':
          this.openSearchMenu();
          break;
        case 'L':
          this.toggleOrbits();
          break;
        case 'F2':
          if (isShiftPressed) {
            keepTrackApi.getUiManager().hideUi();
          }
          break;
        case '+':
          // TODO: Move this to the camera controller
          keepTrackApi.getMainCamera().zoomIn();
          break;
        case '-':
          // TODO: Move this to the camera controller
          keepTrackApi.getMainCamera().zoomOut();
          break;
        default:
          break;
      }
    });
  }

  private openSearchMenu() {
    const searchManager = keepTrackApi.getUiManager().searchManager!;

    if (!searchManager.isSearchOpen) {
      searchManager.toggleSearch();
      setTimeout(() => {
        getEl('search')?.focus();
      }, 1000);
    }
  }

  private toggleEciOrEcf_() {
    settingsManager.isOrbitCruncherInEcf = !settingsManager.isOrbitCruncherInEcf;
    if (settingsManager.isOrbitCruncherInEcf) {
      keepTrackApi.toast('Orbits displayed in ECF', ToastMsgType.normal);
    } else {
      keepTrackApi.toast('Orbits displayed in ECI', ToastMsgType.standby);
    }
    SettingsMenuPlugin.syncOnLoad();
  }

  private toggleOrbits() {
    settingsManager.isDrawOrbits = !settingsManager.isDrawOrbits;
    if (settingsManager.isDrawOrbits) {
      keepTrackApi.toast('Orbits On', ToastMsgType.normal);
    } else {
      keepTrackApi.toast('Orbits Off', ToastMsgType.standby);
    }
    SettingsMenuPlugin.syncOnLoad();
  }
}
