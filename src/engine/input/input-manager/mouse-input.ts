import { Camera, CameraType } from '@app/engine/camera/camera';
import { GetSatType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { UrlManager } from '@app/engine/input/url-manager';
import { lineManagerInstance } from '@app/engine/rendering/line-manager';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SoundNames } from '@app/plugins/sounds/sounds';
import { TimeMachine } from '@app/plugins/time-machine/time-machine';
import { Kilometers, eci2lla } from '@ootk/src/main';
import { closeColorbox } from '../../utils/colorbox';
import { errorManagerInstance } from '../../utils/errorManager';
import { getEl } from '../../utils/get-el';
import { InputManager, LatLon } from '../input-manager';
import { KeyboardInput } from './keyboard-input';
import { KeepTrack } from '@app/keeptrack';

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

      KeepTrack.getInstance().containerRoot.addEventListener('mousewheel', stopWheelZoom, { passive: false });
      KeepTrack.getInstance().containerRoot.addEventListener('DOMMouseScroll', stopWheelZoom, { passive: false });
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
      this.canvasMouseMove_(e, ServiceLocator.getMainCamera());
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
      ServiceLocator.getInputManager().rmbMenuItems
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

      ServiceLocator.getInputManager().rmbMenuItems.forEach(({ elementIdL1, elementIdL2 }) => {
        const el1 = getEl(elementIdL1);
        const el2 = getEl(elementIdL2);

        if (!el1 || !el2) {
          errorManagerInstance.warn(`Missing elements for RMB menu: ${elementIdL1}, ${elementIdL2}`);

          return;
        }

        el1?.addEventListener('mouseenter', () => {
          ServiceLocator.getInputManager().clearRMBSubMenu();
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
        const cameraState = ServiceLocator.getMainCamera().state;

        /*
         * Camera Manager Events
         * Middle Mouse Button MMB
         */
        if (evt.button === 1) {
          cameraState.localRotateStartPosition = cameraState.localRotateCurrent;
          if (this.keyboard_.getKey('Shift')) {
            cameraState.isLocalRotateRoll = true;
            cameraState.isLocalRotateYaw = false;
          } else {
            cameraState.isLocalRotateRoll = false;
            cameraState.isLocalRotateYaw = true;
          }

          evt.preventDefault();
        }

        // Right Mouse Button RMB
        if (evt.button === 2 && (this.keyboard_.getKey('Shift') || this.keyboard_.getKey('Control'))) {
          cameraState.panStartPosition = cameraState.panCurrent;
          if (this.keyboard_.getKey('Shift')) {
            cameraState.isScreenPan = false;
            cameraState.isWorldPan = true;
          } else {
            cameraState.isScreenPan = true;
            cameraState.isWorldPan = false;
          }
        }
      });
    }

    if (!settingsManager.disableCameraControls) {
      window.addEventListener('mouseup', (evt: MouseEvent) => {
        const cameraState = ServiceLocator.getMainCamera().state;

        // Camera Manager Events
        if (evt.button === 1) {
          cameraState.isLocalRotateRoll = false;
          cameraState.isLocalRotateYaw = false;
        }
        if (evt.button === 2) {
          cameraState.isScreenPan = false;
          cameraState.isWorldPan = false;
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
      ServiceLocator.getInputManager().hidePopUps();
    });
    getEl('nav-footer', true)?.addEventListener('click', () => {
      ServiceLocator.getInputManager().hidePopUps();
    });
    getEl('ui-wrapper', true)?.addEventListener('click', () => {
      ServiceLocator.getInputManager().hidePopUps();
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
      this.mouseMoveTimeout = requestAnimationFrame(() => {
        this.canvasMouseMoveFire_(mainCameraInstance, evt);
      });
    }
  }

  private canvasMouseMoveFire_(mainCameraInstance: Camera, evt: MouseEvent) {
    // Cache DOM lookups
    const container = KeepTrack.getInstance().containerRoot;
    const offsetX = container.scrollLeft - window.scrollX + container.offsetLeft;
    const offsetY = container.scrollTop - window.scrollY + container.offsetTop;

    const state = mainCameraInstance.state;

    state.mouseX = evt.clientX - offsetX;
    state.mouseY = evt.clientY - offsetY;

    // Check for drag movement
    if (state.isDragging &&
      (state.screenDragPoint[0] !== state.mouseX ||
        state.screenDragPoint[1] !== state.mouseY)) {
      this.dragHasMoved = true;
      state.camAngleSnappedOnSat = false;
    }

    this.isMouseMoving = true;

    // Reset mouse moving state
    clearTimeout(this.mouseTimeout);
    this.mouseTimeout = window.setTimeout(() => {
      this.isMouseMoving = false;
    }, 150);

    // Clear RAF instead of setTimeout
    cancelAnimationFrame(this.mouseMoveTimeout);
    this.mouseMoveTimeout = -1;
  }

  private canvasClick_(evt: MouseEvent) {
    if (settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }
    ServiceLocator.getInputManager().hidePopUps();
    closeColorbox();
  }

  private canvasMouseDown_(evt: MouseEvent) {
    if (settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }
    const timeManagerInstance = ServiceLocator.getTimeManager();

    this.isStartedOnCanvas = true;

    if (evt.button === 2) {
      this.dragPosition = InputManager.getEarthScreenPoint(ServiceLocator.getMainCamera().state.mouseX, ServiceLocator.getMainCamera().state.mouseY);

      const gmst = ServiceLocator.getTimeManager().gmst;

      this.latLon = eci2lla({ x: this.dragPosition[0], y: this.dragPosition[1], z: this.dragPosition[2] }, gmst);
    }

    if (evt.button === 0) {
      if (settingsManager.isFreezePropRateOnDrag) {
        timeManagerInstance.calculateSimulationTime();
        timeManagerInstance.lastPropRate = timeManagerInstance.propRate * 1;
        timeManagerInstance.changePropRate(0);
      }
    }

    ServiceLocator.getInputManager().hidePopUps();

    EventBus.getInstance().emit(EventBusEvent.canvasMouseDown, evt);
  }

  private canvasMouseUp_(evt: MouseEvent) {
    if (settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }
    const timeManagerInstance = ServiceLocator.getTimeManager();

    if (!this.isStartedOnCanvas) {
      return;
    }
    this.isStartedOnCanvas = false;

    if (!this.dragHasMoved) {
      /*
       * if (settingsManager.isMobileModeEnabled) {
       *   ServiceLocator.getMainCamera().mouseX = isNaN(ServiceLocator.getMainCamera().mouseX) ? 0 : ServiceLocator.getMainCamera().mouseX;
       *   ServiceLocator.getMainCamera().mouseY = isNaN(ServiceLocator.getMainCamera().mouseY) ? 0 : ServiceLocator.getMainCamera().mouseY;
       *   this.mouseSat = ServiceLocator.getInputManager().getSatIdFromCoord(ServiceLocator.getMainCamera().mouseX, ServiceLocator.getMainCamera().mouseY);
       * }
       */
      this.clickedSat = this.mouseSat;
      if (evt.button === 0) {
        const catalogManagerInstance = ServiceLocator.getCatalogManager();

        // Left Mouse Button Clicked
        if (ServiceLocator.getMainCamera().cameraType === CameraType.SATELLITE) {
          if (this.clickedSat !== -1 && !catalogManagerInstance.getObject(this.clickedSat, GetSatType.EXTRA_ONLY)?.isStatic()) {
            PluginRegistry.getPlugin(SelectSatManager)?.selectSat(this.clickedSat);
          }
        } else {
          PluginRegistry.getPlugin(SelectSatManager)?.selectSat(this.clickedSat);
        }

      }
      if (evt.button === 2) {
        // Right Mouse Button Clicked
        if (!this.keyboard_.getKey('Control') && !this.keyboard_.getKey('Shift')) {
          ServiceLocator.getInputManager().openRmbMenu(this.clickedSat);
        }
      }
    }

    UrlManager.updateURL(true);

    // Force the search bar to get repainted because it gets overwritten a lot
    this.dragHasMoved = false;
    ServiceLocator.getMainCamera().state.isDragging = false;

    if (settingsManager.isFreezePropRateOnDrag) {
      timeManagerInstance.calculateSimulationTime();
      timeManagerInstance.changePropRate(timeManagerInstance.lastPropRate);
    }

    if (!settingsManager.disableUI) {
      ServiceLocator.getMainCamera().autoRotate(false);
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

    ServiceLocator.getMainCamera().zoomWheel(delta);
  }

  private rmbMenuActions_(e: MouseEvent) {
    // No Right Click Without UI
    if (settingsManager.disableUI) {
      return;
    }
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const uiManagerInstance = ServiceLocator.getUiManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

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
        PluginRegistry.getPlugin(SelectSatManager)?.setSecondarySat(this.clickedSat);
        break;
      case 'reset-camera-rmb':
        if (PluginRegistry.getPlugin(SelectSatManager)?.selectedSat !== -1) {
          ServiceLocator.getMainCamera().resetRotation();
        } else {
          ServiceLocator.getMainCamera().state.reset();
        }
        break;
      case 'clear-lines-rmb':
        lineManagerInstance.clear();
        break;
      case 'toggle-time-rmb':
        timeManagerInstance.toggleTime();
        break;
      case 'clear-screen-rmb':
        if (PluginRegistry.getPlugin(TimeMachine)) {
          PluginRegistry.getPlugin(TimeMachine)!.isTimeMachineRunning = false;
        }
        uiManagerInstance.doSearch('');
        uiManagerInstance.searchManager.closeSearch();
        uiManagerInstance.hideSideMenus();

        // Revert any group color scheme back to a non group scheme
        colorSchemeManagerInstance.isUseGroupColorScheme = false;

        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);
        break;
      default:
        EventBus.getInstance().emit(EventBusEvent.rmbMenuActions, targetId, this.clickedSat);
        break;
    }
    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);

    const rightButtonMenuElement = getEl('right-btn-menu');

    if (rightButtonMenuElement) {
      rightButtonMenuElement.style.display = 'none';
    }
    ServiceLocator.getInputManager().clearRMBSubMenu();
  }
}
