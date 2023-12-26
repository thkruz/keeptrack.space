import { GetSatType, MissileObject, SatObject, SensorObject } from '@app/interfaces';
import { KeepTrackApiEvents, keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { SpaceObjectType } from '@app/lib/space-object-type';
import { CameraType } from '@app/singletons/camera';

import { errorManagerInstance } from '@app/singletons/errorManager';
import { UrlManager } from '@app/static/url-manager';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { StereoMap } from '../stereo-map/stereo-map';
import { TopMenu } from '../top-menu/top-menu';

/**
 * This is the class that manages the selection of objects.
 */
export class SelectSatManager extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Select Sat Manager';
  lastCssStyle = '';
  selectedSat = -1;
  primarySatObj: SatObject | MissileObject;
  secondarySat = -1;
  secondarySatObj: SatObject | MissileObject;
  lastSelectedSat_ = -1;

  constructor() {
    super(SelectSatManager.PLUGIN_NAME);
  }

  addJs(): void {
    super.addJs();

    this.registerKeyboardEvents_();

    keepTrackApi.register({
      event: KeepTrackApiEvents.updateLoop,
      cbName: SelectSatManager.PLUGIN_NAME,
      cb: this.checkIfSelectSatVisible.bind(this),
    });
  }

  checkIfSelectSatVisible() {
    if (keepTrackApi.getPlugin(TopMenu)) {
      const currentSearch = keepTrackApi.getUiManager().searchManager.getCurrentSearch();

      // Base CSS Style based on if the search box is open or not
      let cssStyle = currentSearch.length > 0 ? 'display: block; max-height:auto;' : 'display: none; max-height:auto;';

      // If a satellite is selected on a desktop computer then shrink the search box
      if (window.innerWidth > 1000 && this.selectedSat !== -1) cssStyle = cssStyle.replace('max-height:auto', 'max-height:27%');

      // Avoid unnecessary dom updates
      if (cssStyle !== this.lastCssStyle && getEl(TopMenu.SEARCH_RESULT_ID)) {
        this.lastCssStyle = cssStyle;
      }
    }
  }

  selectSat(satId: number) {
    if (settingsManager.isDisableSelectSat) return;

    // Is this a new sat Id?
    if (satId !== this.lastSelectedSat()) {
      this.selectSatChange_(satId);
    }

    const sat = keepTrackApi.getCatalogManager().getSat(satId) as (SatObject & SensorObject) | MissileObject;

    if (sat) {
      this.selectSatObject_(sat);
    } else {
      this.selectSatReset_(sat, satId);
    }

    this.setSelectedSat(satId);

    // Run any other callbacks
    keepTrackApi.methods.selectSatData(sat, sat?.id);

    // Record the last selected sat
    this.lastSelectedSat(this.selectedSat);

    const lineManagerInstance = keepTrackApi.getLineManager();
    if (satId > -1) {
      const sensorManagerInstance = keepTrackApi.getSensorManager();

      keepTrackApi.getOrbitManager().setSelectOrbit(satId);
      if (sensorManagerInstance.isSensorSelected() && keepTrackApi.getDotsManager().inViewData?.[satId] === 1) {
        lineManagerInstance.drawWhenSelected();
        lineManagerInstance.updateLineToSat(satId, keepTrackApi.getCatalogManager().getSensorFromSensorName(sensorManagerInstance.currentSensors[0].name));
      }
      if (settingsManager.plugins.stereoMap) keepTrackApi.getPlugin(StereoMap).updateMap();
    } else {
      lineManagerInstance.drawWhenSelected();
    }
  }

  private selectSatChange_(satId: number) {
    SelectSatManager.updateCruncher_(satId);
    this.updateDotSizeAndColor_(satId);
    this.setSelectedSat(satId);
    SelectSatManager.updateBottomMenu_();

    // If deselecting a satellite, clear the selected orbit
    if (satId === -1 && this.lastSelectedSat_ > -1) keepTrackApi.getOrbitManager().clearSelectOrbit();

    UrlManager.updateURL();
  }

  private selectSatReset_(sat: SatObject, satId: number) {
    if (!sat) {
      if (satId === null) {
        errorManagerInstance.debug('SelectSatManager.selectSat: satId is null, did you mean -1?');
      }
      const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();
      if (
        colorSchemeManagerInstance.currentColorScheme === colorSchemeManagerInstance.group ||
        (typeof (<HTMLInputElement>getEl('search'))?.value !== 'undefined' && (<HTMLInputElement>getEl('search')).value.length >= 3)
      ) {
        // If group selected
        getEl('menu-sat-fov', true)?.classList.remove('bmenu-item-disabled');
      } else {
        getEl('menu-sat-fov', true)?.classList.remove('bmenu-item-selected');
        getEl('menu-sat-fov', true)?.classList.add('bmenu-item-disabled');
        settingsManager.isSatOverflyModeOn = false;
        keepTrackApi.getCatalogManager().satCruncher.postMessage({
          typ: 'isShowSatOverfly',
          isShowSatOverfly: 'reset',
        });
      }

      // Run this ONCE when clicking empty space
      if (this.lastSelectedSat() !== -1) {
        keepTrackApi.getMainCamera().exitFixedToSat();

        document.documentElement.style.setProperty('--search-box-bottom', `0px`);
        const satInfoBoxDom = getEl('sat-infobox', true);
        if (satInfoBoxDom) {
          satInfoBoxDom.style.display = 'none';
        }

        // Add Grey Out
        getEl('menu-satview', true)?.classList.add('bmenu-item-disabled');
        getEl('menu-editSat', true)?.classList.add('bmenu-item-disabled');
        getEl('menu-map', true)?.classList.add('bmenu-item-disabled');
        getEl('menu-newLaunch', true)?.classList.add('bmenu-item-disabled');
        getEl('menu-breakup', true)?.classList.add('bmenu-item-disabled');
      }
    }
  }

  private selectSatObject_(sat: (SatObject & SensorObject) | MissileObject) {
    // Selecting a non-missile non-sensor object does nothing
    if ((!sat.active || typeof sat.active == 'undefined') && typeof sat.staticNum == 'undefined') {
      return;
    }

    // First thing we need to do is determine what type of SpaceObjectType we have
    switch (sat.type) {
      case SpaceObjectType.MECHANICAL:
      case SpaceObjectType.PHASED_ARRAY_RADAR:
      case SpaceObjectType.OPTICAL:
      case SpaceObjectType.OBSERVER:
      case SpaceObjectType.BISTATIC_RADIO_TELESCOPE:
      case SpaceObjectType.GROUND_SENSOR_STATION:
        // This is a sensor
        break;
      case SpaceObjectType.PAYLOAD:
      case SpaceObjectType.ROCKET_BODY:
      case SpaceObjectType.DEBRIS:
      case SpaceObjectType.SPECIAL:
      case SpaceObjectType.NOTIONAL:
      case SpaceObjectType.UNKNOWN:
        // This is a satellite object
        break;
      case SpaceObjectType.PAYLOAD_OWNER:
      case SpaceObjectType.PAYLOAD_MANUFACTURER:
        SelectSatManager.selectOwnerManufacturer_(sat);
        break;
      case SpaceObjectType.STAR:
        return; // Do nothing
      case SpaceObjectType.BALLISTIC_MISSILE:
        // This is a missile object
        break;
      default:
        errorManagerInstance.log(`SelectSatManager.selectSat: Unknown SpaceObjectType: ${sat.type}`);
        return;
    }

    const sensorManagerInstance = keepTrackApi.getSensorManager();

    // stop rotation if it is on
    keepTrackApi.getMainCamera().autoRotate(false);
    keepTrackApi.getMainCamera().panCurrent = {
      x: 0,
      y: 0,
      z: 0,
    };

    if (keepTrackApi.getMainCamera().cameraType == CameraType.DEFAULT) {
      keepTrackApi.getMainCamera().earthCenteredLastZoom = keepTrackApi.getMainCamera().zoomLevel();
      if (!sat.static) {
        keepTrackApi.getMainCamera().cameraType = CameraType.FIXED_TO_SAT;
      } else if (typeof sat.staticNum !== 'undefined') {
        keepTrackApi.methods.sensorDotSelected(sat as unknown as SensorObject);
      }
    }

    // If we deselect an object but had previously selected one then disable/hide stuff
    this.setSelectedSat(sat.id);
    if (sat.static) {
      if (typeof sat.staticNum == 'undefined') return;
      this.setSelectedSat(-1);
      getEl('menu-sensor-info', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-fov-bubble', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-surveillance', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-planetarium', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-astronomy', true)?.classList.remove('bmenu-item-disabled');
      if (this.selectedSat !== -1) {
        getEl('menu-lookangles', true)?.classList.remove('bmenu-item-disabled');
      }
      return;
    }
    keepTrackApi.getMainCamera().camZoomSnappedOnSat = true;
    keepTrackApi.getMainCamera().camDistBuffer = settingsManager.minDistanceFromSatellite;
    keepTrackApi.getMainCamera().camAngleSnappedOnSat = true;

    if (sensorManagerInstance.isSensorSelected()) {
      getEl('menu-lookangles', true)?.classList.remove('bmenu-item-disabled');
    }

    getEl('menu-satview', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-editSat', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-sat-fov', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-map', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-newLaunch', true)?.classList.remove('bmenu-item-disabled');
  }

  private static selectOwnerManufacturer_(sat: MissileObject | (SatObject & SensorObject)) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const searchStr = catalogManagerInstance
      .getSatsFromSatData()
      .filter((_sat) => _sat.owner === sat.country || _sat.manufacturer === sat.country) // TODO: This might not work anymroe without coutnry codes
      .map((_sat) => _sat.sccNum)
      .join(',');
    const uiManagerInstance = keepTrackApi.getUiManager();
    uiManagerInstance.searchManager.doSearch(searchStr);
    keepTrackApi.getMainCamera().changeZoom(0.9);
  }

  lastSelectedSat(id?: number): number {
    this.lastSelectedSat_ = id >= -1 ? id : this.lastSelectedSat_;
    return this.lastSelectedSat_;
  }

  private static updateCruncher_(i: number) {
    keepTrackApi.getCatalogManager().satCruncher.postMessage({
      typ: 'satelliteSelected',
      satelliteSelected: [i],
    });
  }

  private updateDotSizeAndColor_(i: number) {
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();
    const { gl } = keepTrackApi.getRenderer();

    gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManagerInstance.colorBuffer);
    // If Old Select Sat Picked Color it Correct Color
    const lastSelectedObject = this.lastSelectedSat();
    if (lastSelectedObject > -1) {
      colorSchemeManagerInstance.currentColorScheme ??= colorSchemeManagerInstance.default;
      const lastSat = keepTrackApi.getCatalogManager().getSat(lastSelectedObject);
      if (lastSat) {
        const newColor = colorSchemeManagerInstance.currentColorScheme(lastSat).color;
        colorSchemeManagerInstance.colorData[lastSelectedObject * 4] = newColor[0]; // R
        colorSchemeManagerInstance.colorData[lastSelectedObject * 4 + 1] = newColor[1]; // G
        colorSchemeManagerInstance.colorData[lastSelectedObject * 4 + 2] = newColor[2]; // B
        colorSchemeManagerInstance.colorData[lastSelectedObject * 4 + 3] = newColor[3]; // A
        gl.bufferSubData(gl.ARRAY_BUFFER, lastSelectedObject * 4 * 4, new Float32Array(newColor));

        if (!settingsManager.lastSearchResults.includes(lastSelectedObject)) {
          dotsManagerInstance.sizeData[lastSelectedObject] = 0.0;
          gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.buffers.size);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, dotsManagerInstance.sizeData);
        }
      }
    }
    // If New Select Sat Picked Color it
    if (i > -1) {
      // if error then log i
      if (i > colorSchemeManagerInstance.colorData.length / 4) {
        console.error('i is greater than colorData length');
        console.error(i);
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, i * 4 * 4, new Float32Array(settingsManager.selectedColor));

      dotsManagerInstance.sizeData[i] = 1.0;
      gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.buffers.size);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, dotsManagerInstance.sizeData);
    }
  }

  private static updateBottomMenu_() {
    if (keepTrackApi.getSensorManager().isSensorSelected()) {
      getEl('menu-lookangles', true)?.classList.remove('bmenu-item-disabled');
    }
    getEl('menu-lookanglesmultisite', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-satview', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-map', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-editSat', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-sat-fov', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-newLaunch', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-breakup', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-plot-analysis', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-plot-analysis2', true)?.classList.remove('bmenu-item-disabled');
  }

  getSelectedSat(type = GetSatType.DEFAULT): SatObject {
    return keepTrackApi.getCatalogManager().getSat(this.selectedSat, type);
  }

  setSecondarySat(id: number): void {
    if (settingsManager.isDisableSelectSat) return;
    this.secondarySat = id;
    if (this.secondarySatObj?.id !== id) {
      this.secondarySatObj = keepTrackApi.getCatalogManager().getSat(id);
    }

    if (this.secondarySat === this.selectedSat) {
      this.selectedSat = -1;
      this.setSelectedSat(-1);
      keepTrackApi.getOrbitManager().clearSelectOrbit(false);
    }

    keepTrackApi.methods.setSecondarySat(this.secondarySatObj, id);
  }

  setSelectedSat(id: number): void {
    if (settingsManager.isDisableSelectSat || id === null) return;
    this.selectedSat = id;

    if (this.selectedSat === this.secondarySat && this.selectedSat !== -1) {
      this.setSecondarySat(-1);
      keepTrackApi.getOrbitManager().clearSelectOrbit(true);
    }
  }

  switchPrimarySecondary(): void {
    const _primary = this.selectedSat;
    const _secondary = this.secondarySat;
    this.setSecondarySat(_primary);
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    if (_primary !== -1) {
      orbitManagerInstance.setSelectOrbit(_primary, true);
    } else {
      orbitManagerInstance.clearSelectOrbit(true);
    }
    this.setSelectedSat(_secondary);
  }

  private registerKeyboardEvents_() {
    const inputManagerInstance = keepTrackApi.getInputManager();
    inputManagerInstance.keyboard.registerKeyDownEvent({
      key: ']',
      callback: () => {
        this.switchPrimarySecondary();
      },
    });
    inputManagerInstance.keyboard.registerKeyDownEvent({
      key: '{',
      callback: () => {
        this.switchPrimarySecondary();
      },
    });
  }
}
