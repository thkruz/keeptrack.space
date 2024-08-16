/* eslint-disable no-unreachable */
// eslint-disable-next-line max-classes-per-file
import { GetSatType, KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SoundNames } from '@app/plugins/sounds/SoundNames';
import { TimeMachine } from '@app/plugins/time-machine/time-machine';
import { Camera, CameraType } from '@app/singletons/camera';
import { SatMath } from '@app/static/sat-math';
import { UrlManager } from '@app/static/url-manager';
import { DetailedSatellite, Kilometers, eci2lla } from 'ootk';
import { closeColorbox } from '../../lib/colorbox';
import { getEl } from '../../lib/get-el';
import { showLoading } from '../../lib/showLoading';
import { LegendManager } from '../../static/legend-manager';
import { MissileObject } from '../catalog-manager/MissileObject';
import { lineManagerInstance } from '../draw-manager/line-manager';
import { LineColors } from '../draw-manager/line-manager/line';
import { errorManagerInstance } from '../errorManager';
import { InputManager, LatLon } from '../input-manager';
import { PersistenceManager, StorageKey } from '../persistence-manager';
import { KeyboardInput } from './keyboard-input';

export class MouseInput {
  private dragHasMoved = false;
  private keyboard_: KeyboardInput;
  private mouseTimeout = -1;

  public canvasClick = null;
  clickedSat = 0;
  public dragPosition = [<Kilometers>0, <Kilometers>0, <Kilometers>0];
  public isMouseMoving = false;
  public isStartedOnCanvas = false;
  public latLon: LatLon;
  public mouseMoveTimeout = -1;
  public mouseSat = -1;
  touchSat: number;

  constructor(keyboard: KeyboardInput) {
    this.keyboard_ = keyboard;
  }

  public canvasMouseDown(evt: MouseEvent) {
    if (settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }
    const timeManagerInstance = keepTrackApi.getTimeManager();

    this.isStartedOnCanvas = true;

    if (evt.button === 2) {
      this.dragPosition = InputManager.getEarthScreenPoint(keepTrackApi.getMainCamera().mouseX, keepTrackApi.getMainCamera().mouseY);

      const gmst = SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj).gmst;

      this.latLon = eci2lla({ x: this.dragPosition[0], y: this.dragPosition[1], z: this.dragPosition[2] }, gmst);
    }

    if (evt.button === 0) {
      if (settingsManager.isFreezePropRateOnDrag) {
        timeManagerInstance.calculateSimulationTime();
        timeManagerInstance.lastPropRate = timeManagerInstance.propRate * 1;
        timeManagerInstance.changePropRate(0);
        settingsManager.isPropRateChange = true;
      }
    }

    keepTrackApi.getInputManager().hidePopUps();

    UrlManager.updateURL();

    keepTrackApi.runEvent(KeepTrackApiEvents.canvasMouseDown, evt);
  }

  public static earthClicked({ numMenuItems, clickedSatId }: { numMenuItems: number; clickedSatId: number }) {
    getEl('line-eci-axis-rmb').style.display = 'block';
    keepTrackApi.rmbMenuItems
      .filter((item) => item.isRmbOnEarth || (item.isRmbOnSat && clickedSatId !== -1))
      .sort((a, b) => a.order - b.order)
      .forEach((item) => {
        const dom = getEl(item.elementIdL1);

        if (dom) {
          dom.style.display = 'block';
          ++numMenuItems;
        }
      });

    getEl('earth-nasa-rmb').style.display = 'block';
    getEl('earth-blue-rmb').style.display = 'block';
    getEl('earth-low-rmb').style.display = 'block';
    getEl('earth-high-no-clouds-rmb').style.display = 'block';
    getEl('earth-vec-rmb').style.display = 'block';
    getEl('earth-political-rmb').style.display = 'block';
    if (settingsManager.nasaImages) {
      getEl('earth-nasa-rmb').style.display = 'none';
    }
    if (settingsManager.trusatImages) {
      getEl('earth-trusat-rmb').style.display = 'none';
    }
    if (settingsManager.blueImages) {
      getEl('earth-blue-rmb').style.display = 'none';
    }
    if (settingsManager.lowresImages) {
      getEl('earth-low-rmb').style.display = 'none';
    }
    if (settingsManager.hiresNoCloudsImages) {
      getEl('earth-high-no-clouds-rmb').style.display = 'none';
    }
    if (settingsManager.vectorImages) {
      getEl('earth-vec-rmb').style.display = 'none';
    }
    if (settingsManager.politicalImages) {
      getEl('earth-political-rmb').style.display = 'none';
    }

    return numMenuItems;
  }

  public canvasMouseMove(evt: MouseEvent, mainCameraInstance: Camera): void {
    if (this.mouseMoveTimeout === -1) {
      this.mouseMoveTimeout = window.setTimeout(() => {
        this.canvasMouseMoveFire(mainCameraInstance, evt);
      }, 16);
    }
  }

  public canvasMouseMoveFire(mainCameraInstance: Camera, evt: MouseEvent) {
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

  public canvasMouseUp(evt: MouseEvent) {
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
          if (this.clickedSat !== -1 && !catalogManagerInstance.getObject(this.clickedSat, GetSatType.EXTRA_ONLY).isStatic()) {
            keepTrackApi.getPlugin(SelectSatManager)?.selectSat(this.clickedSat);
          }
        } else {
          keepTrackApi.getPlugin(SelectSatManager)?.selectSat(this.clickedSat);
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

  public static canvasWheel(evt: WheelEvent): void {
    if (!settingsManager.disableUI && settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }

    const isFullScreen = keepTrackApi.containerRoot.clientWidth === window.innerWidth && keepTrackApi.containerRoot.clientHeight === window.innerHeight;
    const { isCtrlPressed, isShiftPressed } = keepTrackApi.getInputManager().keyboard;

    if (!isFullScreen && !isCtrlPressed && !isShiftPressed) {
      return;
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
    const rightBtnDrawMenuDOM = getEl('draw-rmb-menu');
    const rightBtnEarthMenuDOM = getEl('earth-rmb-menu');
    const resetCameraDOM = getEl('reset-camera-rmb');
    const clearScreenDOM = getEl('clear-screen-rmb');
    const clearLinesDOM = getEl('clear-lines-rmb');
    const toggleTimeDOM = getEl('toggle-time-rmb');
    const rightBtnDrawDOM = getEl('draw-rmb');
    const rightBtnEarthDOM = getEl('earth-rmb');

    if (settingsManager.disableZoomControls || settingsManager.disableNormalEvents) {
      const stopWheelZoom = (event: Event) => {
        if (this.keyboard_.isCtrlPressed) {
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
      this.canvasMouseMove(e, keepTrackApi.getMainCamera());
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

      if (!settingsManager.isMobileModeEnabled) {
        canvasDOM.addEventListener('click', (e: MouseEvent) => {
          this.canvasClick(e);
        });
        canvasDOM.addEventListener('mousedown', (e: MouseEvent) => {
          this.canvasMouseDown(e);
        });
        canvasDOM.addEventListener('mouseup', (e: MouseEvent) => {
          this.canvasMouseUp(e);
        });
      }

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
        .concat([toggleTimeDOM, rightBtnDrawMenuDOM, rightBtnEarthMenuDOM, resetCameraDOM, clearScreenDOM, clearLinesDOM])
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

    if (!settingsManager.disableCameraControls) {
      // prettier-ignore
      window.addEventListener('mousedown', (evt) => {
        /*
         * Camera Manager Events
         * Middle Mouse Button MMB
         */
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
      canvasDOM.addEventListener('wheel', () => {
        satHoverBoxDOM.style.display = 'none';
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

  public rmbMenuActions(e: MouseEvent) {
    // No Right Click Without UI
    if (settingsManager.disableUI) {
      return;
    }

    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const uiManagerInstance = keepTrackApi.getUiManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    const target = <HTMLElement>e.target;
    let targetId = target.id;

    if (target.tagName == 'A') {
      targetId = (<HTMLElement>target.parentNode).id;
    }
    if (target.tagName == 'UL') {
      targetId = (<HTMLElement>target.firstChild).id;
    }

    let clickSatObj: DetailedSatellite | MissileObject | null = null;

    if (this.clickedSat === -1) {
      const obj = catalogManagerInstance.getObject(this.mouseSat);

      if ((obj instanceof DetailedSatellite) || (obj instanceof MissileObject)) {
        clickSatObj = obj;
      }
    }

    switch (targetId) {
      case 'view-info-rmb':
        if (typeof this.latLon === 'undefined' || isNaN(this.latLon.lat) || isNaN(this.latLon.lon)) {
          errorManagerInstance.debug('latLon undefined!');
          const gmst = SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj).gmst;

          this.latLon = eci2lla({ x: this.dragPosition[0], y: this.dragPosition[1], z: this.dragPosition[2] }, gmst);
        }
        uiManagerInstance.toast(`Lat: ${this.latLon.lat.toFixed(3)}<br>Lon: ${this.latLon.lon.toFixed(3)}`, ToastMsgType.normal, true);
        break;
      case 'view-sat-info-rmb':
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(this.clickedSat);
        break;
      case 'view-sensor-info-rmb':
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(this.clickedSat);
        getEl('menu-sensor-info').click();
        break;
      case 'view-related-sats-rmb':
        {
          const intldes = catalogManagerInstance.getSat(this.clickedSat, GetSatType.EXTRA_ONLY)?.intlDes;

          if (!intldes) {
            uiManagerInstance.toast('Time 1 is Invalid!', ToastMsgType.serious);
          }
          const searchStr = intldes.slice(0, 8);

          uiManagerInstance.doSearch(searchStr);
        }
        break;
      case 'set-sec-sat-rmb':
        keepTrackApi.getPlugin(SelectSatManager)?.setSecondarySat(this.clickedSat);
        break;
      case 'reset-camera-rmb':
        keepTrackApi.getMainCamera().resetCamera();
        break;
      case 'clear-lines-rmb':
        lineManagerInstance.clear();
        break;
      case 'line-eci-axis-rmb':
        lineManagerInstance.createRef2Ref([0, 0, 0], [25000, 0, 0], LineColors.RED);
        lineManagerInstance.createRef2Ref([0, 0, 0], [0, 25000, 0], LineColors.GREEN);
        lineManagerInstance.createRef2Ref([0, 0, 0], [0, 0, 25000], LineColors.BLUE);
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
        lineManagerInstance.createSatToRef(keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj, [0, 0, 0], LineColors.PURPLE);
        break;
      case 'line-sensor-sat-rmb':
        lineManagerInstance.createSensorToSat(keepTrackApi.getSensorManager().getSensor(), clickSatObj, LineColors.GREEN);
        break;
      case 'line-sat-sat-rmb':
        lineManagerInstance.createObjToObj(clickSatObj, keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj, LineColors.BLUE);
        break;
      case 'line-sat-sun-rmb':
        lineManagerInstance.createSat2Sun(clickSatObj);
        break;
      case 'earth-blue-rmb':
        MouseInput.resetCurrentEarthTexture();
        settingsManager.blueImages = true;
        MouseInput.saveMapToLocalStorage('blue');
        keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        break;
      case 'earth-nasa-rmb':
        MouseInput.resetCurrentEarthTexture();
        settingsManager.nasaImages = true;
        MouseInput.saveMapToLocalStorage('nasa');
        keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        break;
      case 'earth-trusat-rmb':
        MouseInput.resetCurrentEarthTexture();
        settingsManager.trusatImages = true;
        MouseInput.saveMapToLocalStorage('trusat');
        keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        break;
      case 'earth-low-rmb':
        MouseInput.resetCurrentEarthTexture();
        settingsManager.lowresImages = true;
        MouseInput.saveMapToLocalStorage('low');
        keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        break;
      case 'earth-high-rmb':
        showLoading(() => {
          MouseInput.resetCurrentEarthTexture();
          settingsManager.hiresImages = true;
          MouseInput.saveMapToLocalStorage('high');
          keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        });
        break;
      case 'earth-high-no-clouds-rmb':
        showLoading(() => {
          MouseInput.resetCurrentEarthTexture();
          settingsManager.hiresNoCloudsImages = true;
          MouseInput.saveMapToLocalStorage('high-nc');
          keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        });
        break;
      case 'earth-vec-rmb':
        MouseInput.resetCurrentEarthTexture();
        settingsManager.vectorImages = true;
        MouseInput.saveMapToLocalStorage('vec');
        keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        break;
      case 'earth-political-rmb':
        MouseInput.resetCurrentEarthTexture();
        settingsManager.politicalImages = true;
        MouseInput.saveMapToLocalStorage('political'); // TODO: Verify this
        keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        break;
      case 'toggle-time-rmb':
        timeManagerInstance.toggleTime();
        break;
      case 'clear-screen-rmb':
        if (keepTrackApi.getPlugin(TimeMachine)) {
          keepTrackApi.getPlugin(TimeMachine).isTimeMachineRunning = false;
        }
        uiManagerInstance.doSearch('');
        uiManagerInstance.searchManager.closeSearch();
        uiManagerInstance.hideSideMenus();

        /*
         * if (
         *   (!catalogManagerInstance.isSensorManagerLoaded || sensorManagerInstance.currentSensors[0].lat != null) &&
         *   mainCameraInstance.cameraType !== CameraType.PLANETARIUM &&
         *   mainCameraInstance.cameraType !== CameraType.ASTRONOMY
         * ) {
         *   LegendManager.change('default');
         * }
         */

        // Revert any group color scheme back to a non group scheme
        if (colorSchemeManagerInstance.currentColorScheme === colorSchemeManagerInstance.group) {
          colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.default, true);
          LegendManager.change('default');
        }
        if (colorSchemeManagerInstance.currentColorScheme === colorSchemeManagerInstance.groupCountries) {
          colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.countries, true);
          LegendManager.change('countries');
        }

        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(-1);
        break;
      default:
        keepTrackApi.runEvent(KeepTrackApiEvents.rmbMenuActions, targetId, this.clickedSat);
        break;
    }
    keepTrackApi.getSoundManager().play(SoundNames.CLICK);

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
    PersistenceManager.getInstance().saveItem(StorageKey.LAST_MAP, name);
  }
}
