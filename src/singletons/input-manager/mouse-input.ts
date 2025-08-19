import { GetSatType, KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SoundNames } from '@app/plugins/sounds/sounds';
import { TimeMachine } from '@app/plugins/time-machine/time-machine';
import { Camera, CameraType } from '@app/singletons/camera';
import { UrlManager } from '@app/static/url-manager';
import { Kilometers, eci2lla } from 'ootk';
import { closeColorbox } from '../../lib/colorbox';
import { getEl } from '../../lib/get-el';
import { lineManagerInstance } from '../draw-manager/line-manager';
import { errorManagerInstance } from '../errorManager';
import { InputManager, LatLon } from '../input-manager';
import { KeyboardInput } from './keyboard-input';

export class MouseInput {
  private dragHasMoved = false;
  private readonly keyboard_: KeyboardInput;
  private mouseTimeout = -1;

  init(canvasDOM: HTMLCanvasElement) {
    const rightBtnMenuDOM = getEl('right-btn-menu')!;
    const satHoverBoxDOM = getEl('sat-hoverbox');
    const resetCameraDOM = getEl('reset-camera-rmb');
    const clearScreenDOM = getEl('clear-screen-rmb');
    const clearLinesDOM = getEl('clear-lines-rmb');
    const toggleTimeDOM = getEl('toggle-time-rmb');

    if (settingsManager.disableZoomControls || settingsManager.disableNormalEvents) {
      const stopWheelZoom = (event: Event) => {
        if (this.keyboard_.getKey('Control')) {
          event.preventDefault();
        }
      };

      keepTrackApi.containerRoot.addEventListener('mousewheel', stopWheelZoom, { passive: false });
      keepTrackApi.containerRoot.addEventListener('DOMMouseScroll', stopWheelZoom, { passive: false });
    }

    if (settingsManager.disableWindowScroll || settingsManager.disableNormalEvents) {
      /*
       * window.addEventListener(
       *   'scroll',
       *   function () {
       *     window.scrollTo(0, 0);
       *     return false;
       *   },
       *   { passive: false }
       * );
       */
    }

    this.mouseMoveTimeout = -1;
    canvasDOM.addEventListener('mousemove', (e) => {
      this.canvasMouseMove_(e, keepTrackApi.getMainCamera());
      settingsManager.lastInteractionTime = Date.now();
    });

    if (!settingsManager.disableUI) {
      canvasDOM.addEventListener('wheel', (evt: WheelEvent) => {
        this.canvasWheel_(evt);
        settingsManager.lastInteractionTime = Date.now();
      });

      if (!settingsManager.isMobileModeEnabled) {
        canvasDOM.addEventListener('click', (e: MouseEvent) => {
          this.canvasClick_(e);
        });
        canvasDOM.addEventListener('mousedown', (e: MouseEvent) => {
          this.canvasMouseDown_(e);
        });
        canvasDOM.addEventListener('mouseup', (e: MouseEvent) => {
          this.canvasMouseUp_(e);
        });
      }

      // Create Event Listeners for Right Menu Buttons
      keepTrackApi.rmbMenuItems
        .map(({ elementIdL2 }) => getEl(elementIdL2))
        .concat([toggleTimeDOM, resetCameraDOM, clearScreenDOM, clearLinesDOM])
        .forEach((el) => {
          el?.addEventListener('click', (e: MouseEvent) => {
            // If the element is hiddeen ignore the click
            if (el.style.display === 'none') {
              return;
            }
            this.rmbMenuActions_(e);
          });
        });

      keepTrackApi.rmbMenuItems.forEach(({ elementIdL1, elementIdL2 }) => {
        const el1 = getEl(elementIdL1);
        const el2 = getEl(elementIdL2);

        if (!el1 || !el2) {
          errorManagerInstance.warn(`Missing elements for RMB menu: ${elementIdL1}, ${elementIdL2}`);

          return;
        }

        el1?.addEventListener('mouseenter', () => {
          InputManager.clearRMBSubMenu();
          InputManager.showDropdownSubMenu(rightBtnMenuDOM, el2, canvasDOM, el1);
        });
        el2?.addEventListener('mouseleave', () => {
          el2.style.display = 'none';
        });
      });
    }

    if (!settingsManager.disableCameraControls) {
      // prettier-ignore
      window.addEventListener('mousedown', (evt) => {
        /*
         * Camera Manager Events
         * Middle Mouse Button MMB
         */
        if (evt.button === 1) {
          keepTrackApi.getMainCamera().localRotateStartPosition = keepTrackApi.getMainCamera().localRotateCurrent;
          if (this.keyboard_.getKey('Shift')) {
            keepTrackApi.getMainCamera().isLocalRotateRoll = true;
            keepTrackApi.getMainCamera().isLocalRotateYaw = false;
          } else {
            keepTrackApi.getMainCamera().isLocalRotateRoll = false;
            keepTrackApi.getMainCamera().isLocalRotateYaw = true;
          }
          evt.preventDefault();
        }

        // Right Mouse Button RMB
        if (evt.button === 2 && (this.keyboard_.getKey('Shift') || this.keyboard_.getKey('Control'))) {
          keepTrackApi.getMainCamera().panStartPosition = keepTrackApi.getMainCamera().panCurrent;
          if (this.keyboard_.getKey('Shift')) {
            keepTrackApi.getMainCamera().isScreenPan = false;
            keepTrackApi.getMainCamera().isWorldPan = true;
          } else {
            keepTrackApi.getMainCamera().isScreenPan = true;
            keepTrackApi.getMainCamera().isWorldPan = false;
          }
        }
      });
    }

    if (!settingsManager.disableCameraControls) {
      window.addEventListener('mouseup', (evt: MouseEvent) => {
        // Camera Manager Events
        if (evt.button === 1) {
          keepTrackApi.getMainCamera().isLocalRotateRoll = false;
          keepTrackApi.getMainCamera().isLocalRotateYaw = false;
        }
        if (evt.button === 2) {
          keepTrackApi.getMainCamera().isScreenPan = false;
          keepTrackApi.getMainCamera().isWorldPan = false;
        }
      });
    }

    if (settingsManager.disableUI) {
      canvasDOM.addEventListener('wheel', () => {
        if (satHoverBoxDOM) {
          satHoverBoxDOM.style.display = 'none';
        }
      });
    }

    getEl('nav-wrapper', true)?.addEventListener('click', () => {
      keepTrackApi.getInputManager().hidePopUps();
    });
    getEl('nav-footer', true)?.addEventListener('click', () => {
      keepTrackApi.getInputManager().hidePopUps();
    });
    getEl('ui-wrapper', true)?.addEventListener('click', () => {
      keepTrackApi.getInputManager().hidePopUps();
    });
  }

  clickedSat = 0;
  dragPosition = [<Kilometers>0, <Kilometers>0, <Kilometers>0];
  isMouseMoving = false;
  isStartedOnCanvas = false;
  latLon: LatLon;
  mouseMoveTimeout = -1;
  mouseSat = -1;
  touchSat: number;

  constructor(keyboard: KeyboardInput) {
    this.keyboard_ = keyboard;
  }

  private canvasMouseMove_(evt: MouseEvent, mainCameraInstance: Camera): void {
    if (this.mouseMoveTimeout === -1) {
      this.mouseMoveTimeout = window.setTimeout(() => {
        this.canvasMouseMoveFire_(mainCameraInstance, evt);
      }, 16);
    }
  }

  private canvasMouseMoveFire_(mainCameraInstance: Camera, evt: MouseEvent) {
    mainCameraInstance.mouseX = evt.clientX - (keepTrackApi.containerRoot.scrollLeft - window.scrollX) - keepTrackApi.containerRoot.offsetLeft;
    mainCameraInstance.mouseY = evt.clientY - (keepTrackApi.containerRoot.scrollTop - window.scrollY) - keepTrackApi.containerRoot.offsetTop;
    if (
      mainCameraInstance.isDragging &&
      mainCameraInstance.screenDragPoint[0] !== mainCameraInstance.mouseX &&
      mainCameraInstance.screenDragPoint[1] !== mainCameraInstance.mouseY
    ) {
      this.dragHasMoved = true;
      mainCameraInstance.camAngleSnappedOnSat = false;
    }
    this.isMouseMoving = true;

    // This is so you have to keep moving the mouse or the ui says it has stopped (why?)
    clearTimeout(this.mouseTimeout);
    this.mouseTimeout = window.setTimeout(() => {
      this.isMouseMoving = false;
    }, 150);

    // This is to prevent mousemove being called between drawframes (who cares if it has moved at that point)
    window.clearTimeout(this.mouseMoveTimeout);
    this.mouseMoveTimeout = -1;
  }

  private canvasClick_(evt: MouseEvent) {
    if (settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }
    keepTrackApi.getInputManager().hidePopUps();
    closeColorbox();
  }

  private canvasMouseDown_(evt: MouseEvent) {
    if (settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }
    const timeManagerInstance = keepTrackApi.getTimeManager();

    this.isStartedOnCanvas = true;

    if (evt.button === 2) {
      this.dragPosition = InputManager.getEarthScreenPoint(keepTrackApi.getMainCamera().mouseX, keepTrackApi.getMainCamera().mouseY);

      const gmst = keepTrackApi.getTimeManager().gmst;

      this.latLon = eci2lla({ x: this.dragPosition[0], y: this.dragPosition[1], z: this.dragPosition[2] }, gmst);
    }

    if (evt.button === 0) {
      if (settingsManager.isFreezePropRateOnDrag) {
        timeManagerInstance.calculateSimulationTime();
        timeManagerInstance.lastPropRate = timeManagerInstance.propRate * 1;
        timeManagerInstance.changePropRate(0);
      }
    }

    keepTrackApi.getInputManager().hidePopUps();

    keepTrackApi.emit(KeepTrackApiEvents.canvasMouseDown, evt);
  }

  private canvasMouseUp_(evt: MouseEvent) {
    if (settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }
    const timeManagerInstance = keepTrackApi.getTimeManager();

    if (!this.isStartedOnCanvas) {
      return;
    }
    this.isStartedOnCanvas = false;

    if (!this.dragHasMoved) {
      /*
       * if (settingsManager.isMobileModeEnabled) {
       *   keepTrackApi.getMainCamera().mouseX = isNaN(keepTrackApi.getMainCamera().mouseX) ? 0 : keepTrackApi.getMainCamera().mouseX;
       *   keepTrackApi.getMainCamera().mouseY = isNaN(keepTrackApi.getMainCamera().mouseY) ? 0 : keepTrackApi.getMainCamera().mouseY;
       *   this.mouseSat = keepTrackApi.getInputManager().getSatIdFromCoord(keepTrackApi.getMainCamera().mouseX, keepTrackApi.getMainCamera().mouseY);
       * }
       */
      this.clickedSat = this.mouseSat;
      if (evt.button === 0) {
        const catalogManagerInstance = keepTrackApi.getCatalogManager();

        // Left Mouse Button Clicked
        if (keepTrackApi.getMainCamera().cameraType === CameraType.SATELLITE) {
          if (this.clickedSat !== -1 && !catalogManagerInstance.getObject(this.clickedSat, GetSatType.EXTRA_ONLY)?.isStatic()) {
            keepTrackApi.getPlugin(SelectSatManager)?.selectSat(this.clickedSat);
          }
        } else {
          keepTrackApi.getPlugin(SelectSatManager)?.selectSat(this.clickedSat);
        }

      }
      if (evt.button === 2) {
        // Right Mouse Button Clicked
        if (!this.keyboard_.getKey('Control') && !this.keyboard_.getKey('Shift')) {
          keepTrackApi.getInputManager().openRmbMenu(this.clickedSat);
        }
      }
    }

    UrlManager.updateURL(true);

    // Force the search bar to get repainted because it gets overwritten a lot
    this.dragHasMoved = false;
    keepTrackApi.getMainCamera().isDragging = false;

    if (settingsManager.isFreezePropRateOnDrag) {
      timeManagerInstance.calculateSimulationTime();
      timeManagerInstance.changePropRate(timeManagerInstance.lastPropRate);
    }

    if (!settingsManager.disableUI) {
      keepTrackApi.getMainCamera().autoRotate(false);
    }
  }

  private canvasWheel_(evt: WheelEvent): void {
    if (!settingsManager.disableUI && settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }

    // Safer way to check if running inside an iframe
    const isInIframe = window.self !== window.top;

    if (isInIframe) {
      if (settingsManager.isEmbedMode) {
        evt.preventDefault();
      }
    }

    let delta = evt.deltaY;

    if (evt.deltaMode === 1) {
      delta *= 33.3333333;
    }

    keepTrackApi.getMainCamera().zoomWheel(delta);
  }

  private rmbMenuActions_(e: MouseEvent) {
    // No Right Click Without UI
    if (settingsManager.disableUI) {
      return;
    }
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const uiManagerInstance = keepTrackApi.getUiManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    const target = <HTMLElement>e.target;
    let targetId = target.id;

    if (target.tagName === 'A') {
      targetId = (<HTMLElement>target.parentNode).id;
    }
    if (target.tagName === 'UL') {
      targetId = (<HTMLElement>target.firstChild).id;
    }

    switch (targetId) {
      case 'set-sec-sat-rmb':
        keepTrackApi.getPlugin(SelectSatManager)?.setSecondarySat(this.clickedSat);
        break;
      case 'reset-camera-rmb':
        if (keepTrackApi.getPlugin(SelectSatManager)?.selectedSat !== -1) {
          keepTrackApi.getMainCamera().resetRotation();
        } else {
          keepTrackApi.getMainCamera().reset();
        }
        break;
      case 'clear-lines-rmb':
        lineManagerInstance.clear();
        break;
      case 'toggle-time-rmb':
        timeManagerInstance.toggleTime();
        break;
      case 'clear-screen-rmb':
        if (keepTrackApi.getPlugin(TimeMachine)) {
          keepTrackApi.getPlugin(TimeMachine)!.isTimeMachineRunning = false;
        }
        uiManagerInstance.doSearch('');
        uiManagerInstance.searchManager.closeSearch();
        uiManagerInstance.hideSideMenus();

        // Revert any group color scheme back to a non group scheme
        colorSchemeManagerInstance.isUseGroupColorScheme = false;

        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(-1);
        break;
      default:
        keepTrackApi.emit(KeepTrackApiEvents.rmbMenuActions, targetId, this.clickedSat);
        break;
    }
    keepTrackApi.getSoundManager()?.play(SoundNames.CLICK);

    const rightButtonMenuElement = getEl('right-btn-menu');

    if (rightButtonMenuElement) {
      rightButtonMenuElement.style.display = 'none';
    }
    InputManager.clearRMBSubMenu();
  }
}
