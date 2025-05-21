import { ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { Camera } from '@app/singletons/camera';
import { errorManagerInstance } from '../errorManager';
import { KeyEvent } from '../input-manager';

export class KeyboardInput {
  isCtrlPressed = false;
  isShiftPressed = false;

  init() {
    if (settingsManager.isDisableKeyboard) {
      return;
    }

    const uiManagerInstance = keepTrackApi.getUiManager();

    window.addEventListener('blur', () => {
      this.isCtrlPressed = false;
      this.releaseShiftKey(keepTrackApi.getMainCamera());
    });

    window.addEventListener('focus', () => {
      this.isCtrlPressed = false;
      this.releaseShiftKey(keepTrackApi.getMainCamera());
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.ctrlKey === true || e.metaKey === true) {
        this.isCtrlPressed = true;
      }
      if (e.shiftKey === true) {
        this.isShiftPressed = true;
      }
    });
    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.ctrlKey === false || e.metaKey === false) {
        this.isCtrlPressed = false;
      }
      if (e.shiftKey === false) {
        this.isShiftPressed = false;
      }
    });

    this.registerKeyDownEvent({
      key: 'F2',
      callback: () => {
        if (this.isShiftPressed) {
          uiManagerInstance.hideUi();
          this.releaseShiftKey(keepTrackApi.getMainCamera());
        }
      },
    });

    if (!settingsManager.disableUI) {
      window.addEventListener('keypress', (e: Event) => {
        this.keyHandler(<KeyboardEvent>e);
      });
      window.addEventListener('keydown', (e: Event) => {
        if (uiManagerInstance.isCurrentlyTyping) {
          return;
        }
        this.keyDownHandler(<KeyboardEvent>e);
      });
      window.addEventListener('keyup', (e: Event) => {
        if (uiManagerInstance.isCurrentlyTyping) {
          return;
        }
        this.keyUpHandler(<KeyboardEvent>e);
      });
    }

    if (settingsManager.disableZoomControls || settingsManager.disableNormalEvents) {
      const stopKeyZoom = (event: KeyboardEvent) => {
        if (event.ctrlKey && (event.code === 'Equal' || event.code === 'NumpadAdd' || event.code === 'NumpadSubtract' || event.code === 'NumpadSubtract' ||
          event.code === 'Minus')) {
          event.preventDefault();
        }
      };

      window.addEventListener('keydown', stopKeyZoom, { passive: false });
    }
  }

  keyEvents = <KeyEvent[]>[];
  keyUpEvents = <KeyEvent[]>[];
  keyDownEvents = <KeyEvent[]>[];

  // TODO: shfit and ctrl should be added to the keyEvents parameters

  registerKeyEvent({ key, code, callback }: { key: string; code?: string; callback: () => void }) {
    if (this.keyEvents.find((event) => event.key === key.toUpperCase() || (code && event.code === code))) {
      errorManagerInstance.debug(`Key '${key}' or Code '${code}' is already registered in keyEvents!`);
    }

    this.keyEvents.push({ key: key.toUpperCase(), code, callback });
  }

  registerKeyUpEvent({ key, code, callback }: { key: string; code?: string; callback: () => void }) {
    if (this.keyUpEvents.find((event) => event.key === key.toUpperCase() || (code && (code && event.code === code)))) {
      errorManagerInstance.debug(`Key '${key}' or Code '${code}' is already registered (KeyUp)`);
    }

    this.keyUpEvents.push({ key: key.toUpperCase(), code, callback });
  }

  registerKeyDownEvent({ key, code, callback }: { key: string; code?: string; callback: () => void }) {
    if (this.keyDownEvents.find((event) => event.key === key.toUpperCase() || (code && event.code === code))) {
      errorManagerInstance.debug(`Key '${key}' or Code '${code}' is already registered (KeyDown)`);
    }

    this.keyDownEvents.push({ key: key.toUpperCase(), code, callback });
  }

  keyUpHandler(evt: KeyboardEvent) {
    this.keyUpEvents
      .filter((event) => event.key === evt.key?.toUpperCase() && (!event.code || event.code === evt.code))
      .forEach((event) => {
        event.callback();
      });
  }

  keyDownHandler(evt: KeyboardEvent) {
    this.keyDownEvents
      .filter((event) => event.key === evt.key?.toUpperCase() && (!event.code || event.code === evt.code))
      .forEach((event) => {
        event.callback();
      });
  }

  // eslint-disable-next-line complexity
  keyHandler(evt: KeyboardEvent) {
    // Error Handling
    if (typeof evt.key === 'undefined') {
      return;
    }

    const uiManagerInstance = keepTrackApi.getUiManager();

    if (uiManagerInstance.isCurrentlyTyping) {
      return;
    }

    switch (evt.key.toUpperCase()) {
      case 'F':
        evt.preventDefault();

        if (this.isShiftPressed && !uiManagerInstance.searchManager.isSearchOpen) {
          uiManagerInstance.searchManager.toggleSearch();
          setTimeout(() => {
            getEl('search')?.focus();
          }, 1000);
          this.releaseShiftKey(keepTrackApi.getMainCamera());
        }
        break;
      // Close the bottom menu
      case 'B':
        uiManagerInstance.toggleBottomMenu();
        this.releaseShiftKey(keepTrackApi.getMainCamera());
        break;
      // Show - Hide orbits
      case 'L':
        settingsManager.isDrawOrbits = !settingsManager.isDrawOrbits;
        if (settingsManager.isDrawOrbits) {
          uiManagerInstance.toast('Orbits On', ToastMsgType.normal);
        } else {
          uiManagerInstance.toast('Orbits Off', ToastMsgType.standby);
        }
        SettingsMenuPlugin.syncOnLoad();
        break;
      // Switch between ECI and ECF frames
      case 'E':
        if (this.isShiftPressed) {
          settingsManager.isOrbitCruncherInEcf = !settingsManager.isOrbitCruncherInEcf;
          if (settingsManager.isOrbitCruncherInEcf) {
            uiManagerInstance.toast('GEO Orbits displayed in ECF', ToastMsgType.normal);
          } else {
            uiManagerInstance.toast('GEO Orbits displayed in ECI', ToastMsgType.standby);
          }
          SettingsMenuPlugin.syncOnLoad();
        }
        break;
      default:
        break;

    }

    switch (evt.code) {
      case 'NumpadAdd':
        keepTrackApi.getMainCamera().zoomIn();
        break;
      case 'NumpadSubtract':
        keepTrackApi.getMainCamera().zoomOut();
        break;
      default:
        break;
    }

    switch (evt.key) {
      case '}':
        keepTrackApi.getPlugin(SelectSatManager)?.selectNextSat();
        break;
      case '{':
        keepTrackApi.getPlugin(SelectSatManager)?.selectPrevSat();
        break;
      default:
        this.keyEvents
          .filter((event) => event.key === evt.key?.toUpperCase() && (!event.code || event.code === evt.code))
          .forEach((event) => {
            event.callback();
          });
        break;
    }
  }

  private releaseShiftKey(mainCameraInstance: Camera) {
    setTimeout(() => {
      this.isShiftPressed = false;
      mainCameraInstance.fpsRun = 1;
      settingsManager.cameraMovementSpeed = 0.003;
      settingsManager.cameraMovementSpeedMin = 0.005;
      mainCameraInstance.speedModifier = 1;
    }, 100);
  }
}
