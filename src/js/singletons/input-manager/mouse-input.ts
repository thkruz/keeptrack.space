import { CatalogManager, GetSatType, SensorManager, Singletons, UiManager } from '@app/js/interfaces';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { Camera, CameraType } from '@app/js/singletons/camera';
import { UrlManager } from '@app/js/static/url-manager';
import { Kilometers } from 'ootk';
import { keepTrackContainer } from '../../container';
import { closeColorbox } from '../../lib/colorbox';
import { getEl } from '../../lib/get-el';
import { showLoading } from '../../lib/showLoading';
import { slideInRight } from '../../lib/slide';
import { triggerSubmit } from '../../lib/trigger-submit';
import { waitForCruncher } from '../../lib/waitForCruncher';
import { CoordinateTransforms } from '../../static/coordinate-transforms';
import { LegendManager } from '../../static/legend-manager';
import { StandardColorSchemeManager } from '../color-scheme-manager';
import { DrawManager } from '../draw-manager';
import { lineManagerInstance } from '../draw-manager/line-manager';
import { InputManager, LatLon } from '../input-manager';
import { starManager } from '../starManager';
import { TimeManager } from '../time-manager';
import { KeyboardInput } from './keyboard-input';

export class MouseInput {
  private deltaPinchDistance = 0;
  private dragHasMoved = false;
  private keyboard_: KeyboardInput;
  private isPinching = false;
  private maxPinchSize = Math.hypot(window.innerWidth, window.innerHeight);
  private mouseTimeout = -1;
  private startPinchDistance = 0;
  private touchStartTime: number;

  public canvasClick = null;
  clickedSat = 0;
  public dragPosition = [<Kilometers>0, <Kilometers>0, <Kilometers>0];
  public isMouseMoving = false;
  public isStartedOnCanvas = false;
  public latLon: LatLon;
  public mouseMoveTimeout = -1;
  public mouseSat = -1;

  constructor(keyboard: KeyboardInput) {
    this.keyboard_ = keyboard;
  }

  public canvasMouseDown(evt: MouseEvent) {
    if (settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }
    const timeManagerInstance = keepTrackContainer.get<TimeManager>(Singletons.TimeManager);

    this.isStartedOnCanvas = true;

    if (keepTrackApi.getMainCamera().speedModifier === 1) {
      settingsManager.cameraMovementSpeed = 0.003;
      settingsManager.cameraMovementSpeedMin = 0.005;
    }

    if (evt.button === 2) {
      this.dragPosition = InputManager.getEarthScreenPoint(keepTrackApi.getMainCamera().mouseX, keepTrackApi.getMainCamera().mouseY);
      this.latLon = CoordinateTransforms.eci2lla({ x: this.dragPosition[0], y: this.dragPosition[1], z: this.dragPosition[2] }, timeManagerInstance.simulationTimeObj);
    }
    keepTrackApi.getMainCamera().screenDragPoint = [keepTrackApi.getMainCamera().mouseX, keepTrackApi.getMainCamera().mouseY];
    keepTrackApi.getMainCamera().dragStartPitch = keepTrackApi.getMainCamera().camPitch;
    keepTrackApi.getMainCamera().dragStartYaw = keepTrackApi.getMainCamera().camYaw;
    if (evt.button === 0) {
      keepTrackApi.getMainCamera().isDragging = true;

      if (settingsManager.isFreezePropRateOnDrag) {
        timeManagerInstance.calculateSimulationTime();
        timeManagerInstance.lastPropRate = timeManagerInstance.propRate * 1;
        timeManagerInstance.changePropRate(0);
        settingsManager.isPropRateChange = true;
      }
    }
    keepTrackApi.getMainCamera().isCamSnapMode = false;
    if (!settingsManager.disableUI) {
      keepTrackApi.getMainCamera().autoRotate(false);
    }

    keepTrackApi.getInputManager().hidePopUps();

    UrlManager.updateURL();
  }

  public static earthClicked({
    isViewDOM,
    rightBtnViewDOM,
    numMenuItems,
    isCreateDOM,
    rightBtnCreateDOM,
    isDrawDOM,
    rightBtnDrawDOM,
    isEarthDOM,
    rightBtnEarthDOM,
    clickedSatId,
  }: {
    isViewDOM: boolean;
    rightBtnViewDOM: HTMLElement;
    numMenuItems: number;
    isCreateDOM: boolean;
    rightBtnCreateDOM: HTMLElement;
    isDrawDOM: boolean;
    rightBtnDrawDOM: HTMLElement;
    isEarthDOM: boolean;
    rightBtnEarthDOM: HTMLElement;
    clickedSatId: number;
  }) {
    if (!isViewDOM) {
      rightBtnViewDOM.style.display = 'block';
      ++numMenuItems;
    }
    getEl('view-info-rmb').style.display = 'block';

    if (!isCreateDOM) {
      rightBtnCreateDOM.style.display = 'block';
      ++numMenuItems;
    }
    getEl('create-observer-rmb').style.display = 'block';
    getEl('create-sensor-rmb').style.display = 'block';

    if (!isDrawDOM) {
      rightBtnDrawDOM.style.display = 'block';
      ++numMenuItems;
    }
    getEl('line-eci-axis-rmb').style.display = 'block';

    if (!isEarthDOM) {
      rightBtnEarthDOM.style.display = 'block';
      ++numMenuItems;
    }

    keepTrackApi.rmbMenuItems
      .filter((item) => item.isRmbOnEarth || (item.isRmbOnSat && clickedSatId !== -1))
      .sort((a, b) => a.order - b.order)
      .forEach((item) => {
        getEl(item.elementIdL1).style.display = 'block';
        ++numMenuItems;
      });

    getEl('earth-nasa-rmb').style.display = 'block';
    getEl('earth-blue-rmb').style.display = 'block';
    getEl('earth-low-rmb').style.display = 'block';
    getEl('earth-high-no-clouds-rmb').style.display = 'block';
    getEl('earth-vec-rmb').style.display = 'block';
    getEl('earth-political-rmb').style.display = 'block';
    if (settingsManager.nasaImages) getEl('earth-nasa-rmb').style.display = 'none';
    if (settingsManager.trusatImages) getEl('earth-trusat-rmb').style.display = 'none';
    if (settingsManager.blueImages) getEl('earth-blue-rmb').style.display = 'none';
    if (settingsManager.lowresImages) getEl('earth-low-rmb').style.display = 'none';
    if (settingsManager.hiresNoCloudsImages) getEl('earth-high-no-clouds-rmb').style.display = 'none';
    if (settingsManager.vectorImages) getEl('earth-vec-rmb').style.display = 'none';
    if (settingsManager.politicalImages) getEl('earth-political-rmb').style.display = 'none';

    return numMenuItems;
  }

  public canvasMouseMove(evt: MouseEvent, mainCameraInstance: Camera, canvasDOM: HTMLCanvasElement): void {
    if (this.mouseMoveTimeout === -1) {
      this.mouseMoveTimeout = window.setTimeout(() => {
        this.canvasMouseMoveFire(mainCameraInstance, evt, canvasDOM);
      }, 16);
    }
  }

  public canvasMouseMoveFire(mainCameraInstance: Camera, evt: MouseEvent, canvasDOM: HTMLCanvasElement) {
    mainCameraInstance.mouseX = evt.clientX - (canvasDOM.scrollLeft - window.scrollX);
    mainCameraInstance.mouseY = evt.clientY - (canvasDOM.scrollTop - window.scrollY);
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

  public canvasMouseUp(evt: MouseEvent) {
    if (settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }
    const timeManagerInstance = keepTrackContainer.get<TimeManager>(Singletons.TimeManager);

    if (!this.isStartedOnCanvas) {
      return;
    }
    this.isStartedOnCanvas = false;

    if (!this.dragHasMoved) {
      if (settingsManager.isMobileModeEnabled) {
        keepTrackApi.getMainCamera().mouseX = isNaN(keepTrackApi.getMainCamera().mouseX) ? 0 : keepTrackApi.getMainCamera().mouseX;
        keepTrackApi.getMainCamera().mouseY = isNaN(keepTrackApi.getMainCamera().mouseY) ? 0 : keepTrackApi.getMainCamera().mouseY;
        this.mouseSat = keepTrackApi.getInputManager().getSatIdFromCoord(keepTrackApi.getMainCamera().mouseX, keepTrackApi.getMainCamera().mouseY);
      }
      this.clickedSat = this.mouseSat;
      if (evt.button === 0) {
        const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

        // Left Mouse Button Clicked
        if (keepTrackApi.getMainCamera().cameraType === CameraType.SATELLITE) {
          if (this.clickedSat !== -1 && !catalogManagerInstance.getSat(this.clickedSat, GetSatType.EXTRA_ONLY).static) {
            catalogManagerInstance.setSelectedSat(this.clickedSat);
          }
        } else {
          catalogManagerInstance.setSelectedSat(this.clickedSat);
        }
      }
      if (evt.button === 2) {
        // Right Mouse Button Clicked
        if (!this.keyboard_.isCtrlPressed && !this.keyboard_.isShiftPressed) {
          keepTrackApi.getInputManager().openRmbMenu(this.clickedSat);
        }
      }
    }
    // Force the serach bar to get repainted because it gets overwrote a lot
    this.dragHasMoved = false;
    keepTrackApi.getMainCamera().isDragging = false;

    if (settingsManager.isFreezePropRateOnDrag) {
      timeManagerInstance.calculateSimulationTime();
      timeManagerInstance.changePropRate(timeManagerInstance.lastPropRate);
      settingsManager.isPropRateChange = true;
    }

    if (!settingsManager.disableUI) {
      keepTrackApi.getMainCamera().autoRotate(false);
    }
  }

  public canvasTouchEnd(mainCameraInstance: Camera) {
    const touchTime = Date.now() - this.touchStartTime;

    if (
      touchTime > 150 &&
      !this.isPinching &&
      Math.abs(mainCameraInstance.startMouseX - mainCameraInstance.mouseX) < 50 &&
      Math.abs(mainCameraInstance.startMouseY - mainCameraInstance.mouseY) < 50
    ) {
      keepTrackApi.getInputManager().openRmbMenu();
      this.mouseSat = -1;
    }

    if (this.isPinching) {
      // pinchEnd(e)
      this.isPinching = false;
    }
    mainCameraInstance.mouseX = 0;
    mainCameraInstance.mouseY = 0;
    this.dragHasMoved = false;
    mainCameraInstance.isDragging = false;
    if (!settingsManager.disableUI) {
      mainCameraInstance.autoRotate(false);
    }
  }

  public canvasTouchMove(evt: TouchEvent, mainCameraInstance: Camera): void {
    if (settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }
    if (!evt.touches || evt.touches.length < 1) return;

    if (this.isPinching && typeof evt.touches[0] != 'undefined' && typeof evt.touches[1] != 'undefined') {
      const currentPinchDistance = Math.hypot(evt.touches[0].pageX - evt.touches[1].pageX, evt.touches[0].pageY - evt.touches[1].pageY);
      if (isNaN(currentPinchDistance)) return;

      this.deltaPinchDistance = (this.startPinchDistance - currentPinchDistance) / this.maxPinchSize;
      let zoomTarget = mainCameraInstance.zoomTarget;
      zoomTarget += this.deltaPinchDistance * (settingsManager.cameraMovementSpeed * 50);
      zoomTarget = Math.min(Math.max(zoomTarget, 0.0001), 1); // Force between 0 and 1
      mainCameraInstance.zoomTarget = zoomTarget;
    } else {
      // Dont Move While Zooming
      mainCameraInstance.mouseX = evt.touches[0].clientX;
      mainCameraInstance.mouseY = evt.touches[0].clientY;
      if (
        mainCameraInstance.isDragging &&
        mainCameraInstance.screenDragPoint[0] !== mainCameraInstance.mouseX &&
        mainCameraInstance.screenDragPoint[1] !== mainCameraInstance.mouseY
      ) {
        this.dragHasMoved = true;
        mainCameraInstance.camAngleSnappedOnSat = false;
      }
      this.isMouseMoving = true;
      clearTimeout(this.mouseTimeout);
      this.mouseTimeout = window.setTimeout(() => {
        this.isMouseMoving = false;
      }, 250);
    }
  }

  public canvasTouchStart(evt: TouchEvent): void {
    settingsManager.cameraMovementSpeed = 0.0001;
    settingsManager.cameraMovementSpeedMin = 0.0001;
    if (evt.touches.length > 1) {
      // Two Finger Touch
      this.isPinching = true;
      this.startPinchDistance = Math.hypot(evt.touches[0].pageX - evt.touches[1].pageX, evt.touches[0].pageY - evt.touches[1].pageY);
      // _pinchStart(evt)
    } else {
      // Single Finger Touch
      keepTrackApi.getMainCamera().startMouseX = evt.touches[0].clientX;
      keepTrackApi.getMainCamera().startMouseY = evt.touches[0].clientY;
      keepTrackApi.getMainCamera().mouseX = evt.touches[0].clientX;
      keepTrackApi.getMainCamera().mouseY = evt.touches[0].clientY;
      this.mouseSat = keepTrackApi.getInputManager().getSatIdFromCoord(keepTrackApi.getMainCamera().mouseX, keepTrackApi.getMainCamera().mouseY);
      settingsManager.cameraMovementSpeed = Math.max(0.005 * keepTrackApi.getMainCamera().zoomLevel(), settingsManager.cameraMovementSpeedMin);
      keepTrackApi.getMainCamera().screenDragPoint = [keepTrackApi.getMainCamera().mouseX, keepTrackApi.getMainCamera().mouseY];
      // dragPoint = getEarthScreenPoint(x, y)
      // dragPoint = keepTrackApi.getMainCamera().screenDragPoint; // Ignore the earth on mobile
      keepTrackApi.getMainCamera().dragStartPitch = keepTrackApi.getMainCamera().camPitch;
      keepTrackApi.getMainCamera().dragStartYaw = keepTrackApi.getMainCamera().camYaw;
      keepTrackApi.getMainCamera().isDragging = true;
      this.touchStartTime = Date.now();
      // If you hit the canvas hide any popups
      keepTrackApi.getInputManager().hidePopUps();
      keepTrackApi.getMainCamera().isCamSnapMode = false;
      if (!settingsManager.disableUI) {
        keepTrackApi.getMainCamera().autoRotate(false);
      }

      // TODO: Make updateUrl() a setting that is disabled by default
      UrlManager.updateURL();
    }
  }

  public static canvasWheel(evt: WheelEvent): void {
    if (!settingsManager.disableUI && settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }

    let delta = evt.deltaY;
    if (evt.deltaMode === 1) {
      delta *= 33.3333333;
    }

    keepTrackApi.getMainCamera().zoomWheel(delta);
  }

  init(canvasDOM: HTMLCanvasElement) {
    const rightBtnMenuDOM = getEl('right-btn-menu');
    const satHoverBoxDOM = getEl('sat-hoverbox');
    const rightBtnViewMenuDOM = getEl('view-rmb-menu');
    const rightBtnEditMenuDOM = getEl('edit-rmb-menu');
    const rightBtnCreateMenuDOM = getEl('create-rmb-menu');
    const rightBtnDrawMenuDOM = getEl('draw-rmb-menu');
    const rightBtnEarthMenuDOM = getEl('earth-rmb-menu');
    const resetCameraDOM = getEl('reset-camera-rmb');
    const clearScreenDOM = getEl('clear-screen-rmb');
    const clearLinesDOM = getEl('clear-lines-rmb');
    const rightBtnViewDOM = getEl('view-rmb');
    const rightBtnEditDOM = getEl('edit-rmb');
    const rightBtnCreateDOM = getEl('create-rmb');
    const rightBtnDrawDOM = getEl('draw-rmb');
    const rightBtnEarthDOM = getEl('earth-rmb');

    canvasDOM.addEventListener('touchmove', (e) => {
      this.canvasTouchMove(e, keepTrackApi.getMainCamera());
    });

    if (settingsManager.disableZoomControls || settingsManager.disableNormalEvents) {
      const stopWheelZoom = (event: Event) => {
        if (this.keyboard_.isCtrlPressed) {
          event.preventDefault();
        }
      };

      window.addEventListener('mousewheel', stopWheelZoom, { passive: false });
      window.addEventListener('DOMMouseScroll', stopWheelZoom, { passive: false });
    }

    if (settingsManager.disableWindowScroll || settingsManager.disableNormalEvents) {
      window.addEventListener(
        'scroll',
        function () {
          window.scrollTo(0, 0);
          return false;
        },
        { passive: false }
      );
    }

    this.mouseMoveTimeout = -1;
    canvasDOM.addEventListener('mousemove', (e) => {
      this.canvasMouseMove(e, keepTrackApi.getMainCamera(), canvasDOM);
      settingsManager.lastInteractionTime = Date.now();
    });

    if (!settingsManager.disableUI) {
      canvasDOM.addEventListener('wheel', (evt: WheelEvent) => {
        MouseInput.canvasWheel(evt);
        settingsManager.lastInteractionTime = Date.now();
      });

      this.canvasClick = (evt: MouseEvent) => {
        if (settingsManager.disableNormalEvents) {
          evt.preventDefault();
        }
        keepTrackApi.getInputManager().hidePopUps();
        closeColorbox();
      };
      canvasDOM.addEventListener('click', (e: MouseEvent) => {
        this.canvasClick(e);
      });
      canvasDOM.addEventListener('mousedown', (e: MouseEvent) => {
        this.canvasMouseDown(e);
      });
      canvasDOM.addEventListener('touchstart', (e: TouchEvent) => {
        this.canvasTouchStart(e);
      });
      canvasDOM.addEventListener('mouseup', (e: MouseEvent) => {
        this.canvasMouseUp(e);
      });

      const rightBtnViewDOMDropdown = () => {
        InputManager.clearRMBSubMenu();
        InputManager.showDropdownSubMenu(rightBtnMenuDOM, rightBtnViewMenuDOM, canvasDOM);
      };
      const rightBtnEditDOMDropdown = () => {
        InputManager.clearRMBSubMenu();
        InputManager.showDropdownSubMenu(rightBtnMenuDOM, rightBtnEditMenuDOM, canvasDOM);
      };
      const rightBtnCreateDOMDropdown = () => {
        InputManager.clearRMBSubMenu();
        InputManager.showDropdownSubMenu(rightBtnMenuDOM, rightBtnCreateMenuDOM, canvasDOM);
      };
      const rightBtnDrawDOMDropdown = () => {
        InputManager.clearRMBSubMenu();
        InputManager.showDropdownSubMenu(rightBtnMenuDOM, rightBtnDrawMenuDOM, canvasDOM);
      };
      const rightBtnEarthDOMDropdown = () => {
        InputManager.clearRMBSubMenu();
        InputManager.showDropdownSubMenu(rightBtnMenuDOM, rightBtnEarthMenuDOM, canvasDOM);
      };

      // Create Event Listeners for Right Menu Buttons
      keepTrackApi.rmbMenuItems
        .map(({ elementIdL2 }) => getEl(elementIdL2))
        .concat([rightBtnViewMenuDOM, rightBtnEditMenuDOM, rightBtnCreateMenuDOM, rightBtnDrawMenuDOM, rightBtnEarthMenuDOM, resetCameraDOM, clearScreenDOM, clearLinesDOM])
        .forEach((el) => {
          el?.addEventListener('click', (e: MouseEvent) => {
            this.rmbMenuActions(e);
          });
        });

      keepTrackApi.rmbMenuItems.forEach(({ elementIdL1, elementIdL2 }) => {
        const el1 = getEl(elementIdL1);
        const el2 = getEl(elementIdL2);

        el1?.addEventListener('mouseenter', () => {
          InputManager.clearRMBSubMenu();
          InputManager.showDropdownSubMenu(rightBtnMenuDOM, el2, canvasDOM, el1);
        });
        el2?.addEventListener('mouseleave', () => {
          el2.style.display = 'none';
        });
      });

      rightBtnViewDOM?.addEventListener('mouseenter', () => {
        rightBtnViewDOMDropdown();
      });
      rightBtnViewDOM?.addEventListener('click', () => {
        rightBtnViewDOMDropdown();
      });
      rightBtnViewMenuDOM?.addEventListener('mouseleave', () => {
        rightBtnViewMenuDOM.style.display = 'none';
      });

      rightBtnEditDOM?.addEventListener('mouseenter', () => {
        rightBtnEditDOMDropdown();
      });
      rightBtnEditDOM?.addEventListener('click', () => {
        rightBtnEditDOMDropdown();
      });
      rightBtnEditMenuDOM?.addEventListener('mouseleave', () => {
        rightBtnEditMenuDOM.style.display = 'none';
      });

      rightBtnCreateDOM?.addEventListener('mouseenter', () => {
        rightBtnCreateDOMDropdown();
      });
      rightBtnCreateDOM?.addEventListener('click', () => {
        rightBtnCreateDOMDropdown();
      });
      rightBtnCreateMenuDOM?.addEventListener('mouseleave', () => {
        rightBtnCreateMenuDOM.style.display = 'none';
      });

      rightBtnDrawDOM?.addEventListener('mouseenter', () => {
        rightBtnDrawDOMDropdown();
      });
      rightBtnDrawDOM?.addEventListener('click', () => {
        rightBtnDrawDOMDropdown();
      });
      rightBtnDrawMenuDOM?.addEventListener('mouseleave', () => {
        rightBtnDrawMenuDOM.style.display = 'none';
      });

      rightBtnEarthDOM?.addEventListener('mouseenter', () => {
        rightBtnEarthDOMDropdown();
      });
      rightBtnEarthDOM?.addEventListener('click', () => {
        rightBtnEarthDOMDropdown();
      });
      rightBtnEarthMenuDOM?.addEventListener('mouseleave', () => {
        rightBtnEarthMenuDOM.style.display = 'none';
      });
    }

    canvasDOM.addEventListener('touchend', () => {
      this.canvasTouchEnd(keepTrackApi.getMainCamera());
    });

    if (!settingsManager.disableCameraControls) {
      // prettier-ignore
      window.addEventListener('mousedown', (evt) => {
                // Camera Manager Events
                // Middle Mouse Button MMB
                if (evt.button === 1) {
                    keepTrackApi.getMainCamera().localRotateStartPosition = keepTrackApi.getMainCamera().localRotateCurrent;
                    if (this.keyboard_.isShiftPressed) {
                        keepTrackApi.getMainCamera().isLocalRotateRoll = true;
                        keepTrackApi.getMainCamera().isLocalRotateYaw = false;
                    } else {
                        keepTrackApi.getMainCamera().isLocalRotateRoll = false;
                        keepTrackApi.getMainCamera().isLocalRotateYaw = true;
                    }
                    evt.preventDefault();
                }

                // Right Mouse Button RMB
                if (evt.button === 2 && (this.keyboard_.isShiftPressed || this.keyboard_.isCtrlPressed)) {
                    keepTrackApi.getMainCamera().panStartPosition = keepTrackApi.getMainCamera().panCurrent;
                    if (this.keyboard_.isShiftPressed) {
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
      canvasDOM.addEventListener('wheel', function () {
        satHoverBoxDOM.style.display = 'none';
      });
    }

    getEl('nav-wrapper')?.addEventListener('click', () => {
      keepTrackApi.getInputManager().hidePopUps();
    });
    getEl('nav-footer')?.addEventListener('click', () => {
      keepTrackApi.getInputManager().hidePopUps();
    });
    getEl('ui-wrapper')?.addEventListener('click', () => {
      keepTrackApi.getInputManager().hidePopUps();
    });
  }

  public rmbMenuActions(e: MouseEvent) {
    // No Right Click Without UI
    if (settingsManager.disableUI) return;

    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const timeManagerInstance = keepTrackContainer.get<TimeManager>(Singletons.TimeManager);
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
    const colorSchemeManagerInstance = keepTrackContainer.get<StandardColorSchemeManager>(Singletons.ColorSchemeManager);

    let target = <HTMLElement>e.target;
    let targetId = target.id;
    if (target.tagName == 'A') {
      targetId = (<HTMLElement>target.parentNode).id;
    }
    if (target.tagName == 'UL') {
      targetId = (<HTMLElement>target.firstChild).id;
    }

    switch (targetId) {
      case 'view-info-rmb':
        if (typeof this.latLon == 'undefined' || isNaN(this.latLon.lat) || isNaN(this.latLon.lon)) {
          console.debug('latLon undefined!');
          this.latLon = CoordinateTransforms.eci2lla({ x: this.dragPosition[0], y: this.dragPosition[1], z: this.dragPosition[2] }, timeManagerInstance.simulationTimeObj);
        }
        uiManagerInstance.toast(`Lat: ${this.latLon.lat.toFixed(3)}<br>Lon: ${this.latLon.lon.toFixed(3)}`, 'normal', true);
        break;
      case 'view-sat-info-rmb':
        catalogManagerInstance.setSelectedSat(this.clickedSat);
        break;
      case 'view-sensor-info-rmb':
        catalogManagerInstance.setSelectedSat(this.clickedSat);
        getEl('menu-sensor-info').click();
        break;
      case 'view-related-sats-rmb':
        var intldes = catalogManagerInstance.getSat(this.clickedSat, GetSatType.EXTRA_ONLY).intlDes;
        if (typeof intldes == 'undefined') uiManagerInstance.toast(`Time 1 is Invalid!`, 'serious');
        var searchStr = intldes.slice(0, 8);
        uiManagerInstance.doSearch(searchStr);
        break;
      case 'create-sensor-rmb':
        slideInRight(getEl('customSensor-menu'), 1000);
        getEl('menu-customSensor').classList.add('bmenu-item-selected');
        sensorManagerInstance.isCustomSensorMenuOpen = true;
        if ((<HTMLInputElement>getEl('cs-telescope')).checked) {
          getEl('cs-telescope').click();
        }
        (<HTMLInputElement>getEl('cs-lat')).value = this.latLon.lat.toString();
        (<HTMLInputElement>getEl('cs-lon')).value = this.latLon.lon.toString();
        (<HTMLInputElement>getEl('cs-hei')).value = '0';
        (<HTMLInputElement>getEl('cs-type')).value = 'Phased Array Radar';
        (<HTMLInputElement>getEl('cs-minaz')).value = '0';
        (<HTMLInputElement>getEl('cs-maxaz')).value = '360';
        (<HTMLInputElement>getEl('cs-minel')).value = '10';
        (<HTMLInputElement>getEl('cs-maxel')).value = '90';
        (<HTMLInputElement>getEl('cs-minrange')).value = '0';
        (<HTMLInputElement>getEl('cs-maxrange')).value = '5556';
        triggerSubmit(<HTMLFormElement>getEl('customSensor'));
        LegendManager.change('default');
        colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.default, true);
        uiManagerInstance.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        catalogManagerInstance.satCruncher.postMessage({
          isSunlightView: false,
        });
        break;
      case 'set-sec-sat-rmb':
        catalogManagerInstance.setSecondarySat(this.clickedSat);
        break;
      case 'reset-camera-rmb':
        keepTrackApi.getMainCamera().isPanReset = true;
        keepTrackApi.getMainCamera().isLocalRotateReset = true;
        keepTrackApi.getMainCamera().ftsRotateReset = true;
        break;
      case 'clear-lines-rmb':
        lineManagerInstance.clear();
        if (catalogManagerInstance.isStarManagerLoaded) {
          starManager.isAllConstellationVisible = false;
        }
        break;
      case 'line-eci-axis-rmb':
        lineManagerInstance.create('ref', [10000, 0, 0], 'r');
        lineManagerInstance.create('ref', [0, 10000, 0], 'g');
        lineManagerInstance.create('ref', [0, 0, 10000], 'b');
        break;
      case 'line-eci-xgrid-rmb':
        lineManagerInstance.createGrid('x', [0.6, 0.2, 0.2, 1], 1);
        break;
      case 'line-eci-ygrid-rmb':
        lineManagerInstance.createGrid('y', [0.2, 0.6, 0.2, 1], 1);
        break;
      case 'line-eci-zgrid-rmb':
        lineManagerInstance.createGrid('z', [0.2, 0.2, 0.6, 1], 1);
        break;
      case 'line-earth-sat-rmb':
        lineManagerInstance.create('sat', this.clickedSat, 'p');
        break;
      case 'line-sensor-sat-rmb':
        // Sensor always has to be #2
        lineManagerInstance.create('sat5', [this.clickedSat, catalogManagerInstance.getSensorFromSensorName(sensorManagerInstance.currentSensors[0].name)], 'p');
        break;
      case 'line-sat-sat-rmb':
        lineManagerInstance.create('sat5', [this.clickedSat, catalogManagerInstance.selectedSat], 'b');
        break;
      case 'line-sat-sun-rmb':
        lineManagerInstance.create(
          'sat2',
          [
            this.clickedSat,
            drawManagerInstance.sceneManager.sun.drawPosition[0],
            drawManagerInstance.sceneManager.sun.drawPosition[1],
            drawManagerInstance.sceneManager.sun.drawPosition[2],
          ],
          'o'
        );
        break;
      case 'create-observer-rmb':
        slideInRight(getEl('customSensor-menu'), 1000);
        getEl('menu-customSensor').classList.add('bmenu-item-selected');
        sensorManagerInstance.isCustomSensorMenuOpen = true;
        if (!(<HTMLInputElement>getEl('cs-telescope')).checked) {
          getEl('cs-telescope').click();
        }
        (<HTMLInputElement>getEl('cs-lat')).value = this.latLon.lat.toString();
        (<HTMLInputElement>getEl('cs-lon')).value = this.latLon.lon.toString();
        (<HTMLInputElement>getEl('cs-hei')).value = '0';
        (<HTMLInputElement>getEl('cs-type')).value = 'Observer';
        triggerSubmit(<HTMLFormElement>getEl('customSensor'));
        catalogManagerInstance.satCruncher.postMessage({
          isSunlightView: true,
        });
        LegendManager.change('sunlight');
        uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.sunlight);
        waitForCruncher(
          catalogManagerInstance.satCruncher,
          () => {
            colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.sunlight, true);
          },
          (data: any) => data.satInSun
        );
        break;
      case 'earth-blue-rmb':
        MouseInput.resetCurrentEarthTexture();
        settingsManager.blueImages = true;
        MouseInput.saveMapToLocalStorage('blue');
        drawManagerInstance.sceneManager.earth.reloadEarthTextures();
        break;
      case 'earth-nasa-rmb':
        MouseInput.resetCurrentEarthTexture();
        settingsManager.nasaImages = true;
        MouseInput.saveMapToLocalStorage('nasa');
        drawManagerInstance.sceneManager.earth.reloadEarthTextures();
        break;
      case 'earth-trusat-rmb':
        MouseInput.resetCurrentEarthTexture();
        settingsManager.trusatImages = true;
        MouseInput.saveMapToLocalStorage('trusat');
        drawManagerInstance.sceneManager.earth.reloadEarthTextures();
        break;
      case 'earth-low-rmb':
        MouseInput.resetCurrentEarthTexture();
        settingsManager.lowresImages = true;
        MouseInput.saveMapToLocalStorage('low');
        drawManagerInstance.sceneManager.earth.reloadEarthTextures();
        break;
      case 'earth-high-rmb':
        showLoading(() => {
          MouseInput.resetCurrentEarthTexture();
          settingsManager.hiresImages = true;
          MouseInput.saveMapToLocalStorage('high');
          drawManagerInstance.sceneManager.earth.reloadEarthTextures();
        });
        break;
      case 'earth-high-no-clouds-rmb':
        showLoading(() => {
          MouseInput.resetCurrentEarthTexture();
          settingsManager.hiresNoCloudsImages = true;
          MouseInput.saveMapToLocalStorage('high-nc');
          drawManagerInstance.sceneManager.earth.reloadEarthTextures();
        });
        break;
      case 'earth-vec-rmb':
        MouseInput.resetCurrentEarthTexture();
        settingsManager.vectorImages = true;
        MouseInput.saveMapToLocalStorage('vec');
        drawManagerInstance.sceneManager.earth.reloadEarthTextures();
        break;
      case 'earth-political-rmb':
        MouseInput.resetCurrentEarthTexture();
        settingsManager.politicalImages = true;
        MouseInput.saveMapToLocalStorage('political'); // TODO: Verify this
        drawManagerInstance.sceneManager.earth.reloadEarthTextures();
        break;
      case 'clear-screen-rmb':
        uiManagerInstance.doSearch('');
        uiManagerInstance.searchManager.searchToggle(false);
        uiManagerInstance.hideSideMenus();

        // if (
        //   (!catalogManagerInstance.isSensorManagerLoaded || sensorManagerInstance.currentSensors[0].lat != null) &&
        //   mainCameraInstance.cameraType !== CameraType.PLANETARIUM &&
        //   mainCameraInstance.cameraType !== CameraType.ASTRONOMY
        // ) {
        //   LegendManager.change('default');
        // }

        // Revert any group color scheme back to a non group scheme
        if (colorSchemeManagerInstance.currentColorScheme === colorSchemeManagerInstance.group) {
          colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.default, true);
          LegendManager.change('default');
        }
        if (colorSchemeManagerInstance.currentColorScheme === colorSchemeManagerInstance.groupCountries) {
          colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.countries, true);
          LegendManager.change('countries');
        }

        catalogManagerInstance.setSelectedSat(-1);
        break;
      default:
        keepTrackApi.methods.rmbMenuActions(targetId, this.clickedSat);
        break;
    }

    getEl('right-btn-menu').style.display = 'none';
    InputManager.clearRMBSubMenu();
  }

  private static resetCurrentEarthTexture() {
    settingsManager.blueImages = false;
    settingsManager.nasaImages = false;
    settingsManager.trusatImages = false;
    settingsManager.lowresImages = false;
    settingsManager.hiresImages = false;
    settingsManager.hiresNoCloudsImages = false;
    settingsManager.vectorImages = false;
    settingsManager.politicalImages = false;
  }

  private static saveMapToLocalStorage(name: string) {
    try {
      localStorage.setItem('lastMap', name);
    } catch {
      // do nothing
    }
  }
}
