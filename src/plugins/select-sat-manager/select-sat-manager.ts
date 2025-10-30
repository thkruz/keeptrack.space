import { CameraType } from '@app/engine/camera/camera';
import { GetSatType, SolarBody, ToastMsgType } from '@app/engine/core/interfaces';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';

import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { createSampleCovarianceFromTle, DetailedSatellite, DetailedSensor, Kilometers, LandObject, RADIUS_OF_EARTH, SpaceObjectType } from '@ootk/src/main';
import { vec3 } from 'gl-matrix';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { PlanetsMenuPlugin } from '../planets-menu/planets-menu';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SoundNames } from '../sounds/sounds';
import { TopMenu } from '../top-menu/top-menu';

/**
 * This is the class that manages the selection of objects.
 */
export class SelectSatManager extends KeepTrackPlugin {
  readonly id = 'SelectSatManager';
  dependencies_ = [];
  lastCssStyle = '';
  selectedSat = -1;
  private readonly noSatObj_ = <DetailedSatellite>(<unknown>{
    id: -1,
    missile: false,
    type: SpaceObjectType.UNKNOWN,
    static: false,
  });

  primarySatObj: DetailedSatellite | MissileObject | OemSatellite = this.noSatObj_;
  /** Ellipsoid radii for the primary satellite in RCI coordinates */
  primarySatCovMatrix: vec3 | null = null;
  secondarySat = -1;
  secondarySatObj: DetailedSatellite | null = null;
  /** Ellipsoid radii for the secondary satellite in RCI coordinates */
  secondarySatCovMatrix: vec3;
  private lastSelectedSat_ = -1;

  addJs(): void {
    super.addJs();

    this.registerKeyboardEvents_();

    EventBus.getInstance().on(EventBusEvent.updateLoop, this.checkIfSelectSatVisible.bind(this));

    EventBus.getInstance().on(EventBusEvent.endOfDraw, () => {
      if ((this.selectedSat ?? -1) > -1) {
        const timeManagerInstance = ServiceLocator.getTimeManager();

        if (this.primarySatObj) {
          ServiceLocator.getUiManager().
            updateSelectBox(timeManagerInstance.realTime, timeManagerInstance.lastBoxUpdateTime, this.primarySatObj);
        }
      }
    });
  }

  checkIfSelectSatVisible() {
    if (PluginRegistry.getPlugin(TopMenu)) {
      const currentSearch = ServiceLocator.getUiManager().searchManager.getCurrentSearch();

      // Base CSS Style based on if the search box is open or not
      let cssStyle = currentSearch.length > 0 ? 'display: block; max-height:auto;' : 'display: none; max-height:auto;';

      // If a satellite is selected on a desktop computer then shrink the search box
      if (window.innerWidth > 1000 && this.selectedSat !== -1) {
        cssStyle = cssStyle.replace('max-height:auto', 'max-height:27%');
      }

      // Avoid unnecessary dom updates
      if (cssStyle !== this.lastCssStyle && getEl(TopMenu.SEARCH_RESULT_ID, true)) {
        this.lastCssStyle = cssStyle;
      }
    }
  }

  selectPrevSat() {
    const satId = this.selectedSat - 1;

    if (satId >= 0) {
      this.selectSat(satId);
    } else {
      const activeSats = ServiceLocator.getCatalogManager().getActiveSats();
      const lastSatId = activeSats[activeSats.length - 1].id;

      this.selectSat(lastSatId);
    }
  }

  selectNextSat() {
    const activeSats = ServiceLocator.getCatalogManager().getActiveSats();
    const lastSatId = activeSats[activeSats.length - 1].id;
    const satId = this.selectedSat + 1;

    if (satId <= lastSatId) {
      this.selectSat(satId);
    } else {
      this.selectSat(0);
    }
  }

  selectSat(satId: number) {
    if (settingsManager.isDisableSelectSat) {
      return;
    }

    const obj = ServiceLocator.getCatalogManager().getObject(satId);

    if (!obj || !obj.active) {
      this.selectSatReset_();
    } else {

      if (obj.position.x === 0 && obj.position.y === 0 && obj.position.z === 0 && obj.name !== SolarBody.Earth) {
        ServiceLocator.getUiManager().toast('Object is inside the Earth, cannot select it', ToastMsgType.caution);

        return;
      }

      // First thing we need to do is determine what type of SpaceObjectType we have
      switch (obj.type) {
        case SpaceObjectType.MECHANICAL:
        case SpaceObjectType.PHASED_ARRAY_RADAR:
        case SpaceObjectType.OPTICAL:
        case SpaceObjectType.OBSERVER:
        case SpaceObjectType.BISTATIC_RADIO_TELESCOPE:
        case SpaceObjectType.GROUND_SENSOR_STATION:
          this.selectSensorObject_(obj as DetailedSensor);
          ServiceLocator.getSoundManager()?.play(SoundNames.WHOOSH);

          return;
        case SpaceObjectType.PAYLOAD:
        case SpaceObjectType.ROCKET_BODY:
        case SpaceObjectType.DEBRIS:
        case SpaceObjectType.SPECIAL:
        case SpaceObjectType.NOTIONAL:
        case SpaceObjectType.UNKNOWN:
          showEl('actions-section');
          showEl('draw-line-links');
          this.selectSatObject_(obj as DetailedSatellite);
          break;
        case SpaceObjectType.PAYLOAD_OWNER:
        case SpaceObjectType.SUBORBITAL_PAYLOAD_OPERATOR:
        case SpaceObjectType.PAYLOAD_MANUFACTURER:
        case SpaceObjectType.METEOROLOGICAL_ROCKET_LAUNCH_AGENCY_OR_MANUFACTURER:
        case SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION:
          SelectSatManager.selectOwnerManufacturer_(obj as LandObject);

          return;
        case SpaceObjectType.LAUNCH_SITE:
          // Handled elsewhere
          return;
        case SpaceObjectType.STAR:
          return; // Do nothing
        case SpaceObjectType.BALLISTIC_MISSILE:
          hideEl('actions-section');
          hideEl('draw-line-links');
          this.selectSatObject_(obj as MissileObject);
          break;
        case (SpaceObjectType.TERRESTRIAL_PLANET):
        case (SpaceObjectType.GAS_GIANT):
        case (SpaceObjectType.ICE_GIANT):
        case (SpaceObjectType.DWARF_PLANET):
        case (SpaceObjectType.MOON):
          PluginRegistry.getPlugin(PlanetsMenuPlugin)?.changePlanet(obj.name as SolarBody);

          return;
        default:
          errorManagerInstance.log(`SelectSatManager.selectSat: Unknown SpaceObjectType: ${obj.type}`);

          return;
      }
    }

    const spaceObj = obj as DetailedSatellite | MissileObject;

    // Set the primary sat
    this.primarySatObj = spaceObj ?? this.noSatObj_;

    // Run any other callbacks
    EventBus.getInstance().emit(EventBusEvent.selectSatData, spaceObj, spaceObj?.id);

    // Record the last selected sat
    this.lastSelectedSat(this.selectedSat);
  }

  private selectSensorObject_(sensor: DetailedSensor) {
    // All sensors should have a sensorId
    if (!sensor.isSensor()) {
      errorManagerInstance.log(`SelectSatManager.selectSensorObject_: SensorObject does not have a sensorId: ${sensor}`);

      return;
    }

    // stop rotation if it is on
    ServiceLocator.getMainCamera().autoRotate(false);
    ServiceLocator.getMainCamera().state.panCurrent = {
      x: 0,
      y: 0,
      z: 0,
    };

    if (ServiceLocator.getMainCamera().cameraType === CameraType.FIXED_TO_EARTH) {
      ServiceLocator.getMainCamera().state.earthCenteredLastZoom = ServiceLocator.getMainCamera().zoomLevel();
      EventBus.getInstance().emit(EventBusEvent.sensorDotSelected, sensor);
    }

    this.setSelectedSat_(-1);
    getEl('menu-sensor-info', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-fov-bubble', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-surveillance', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-planetarium', true)?.classList.remove('bmenu-item-disabled');
    getEl('menu-astronomy', true)?.classList.remove('bmenu-item-disabled');
  }

  private selectSatChange_(obj = null as DetailedSatellite | MissileObject | null) {
    const id = obj?.id ?? -1;

    ServiceLocator.getSoundManager()?.play(SoundNames.WHOOSH);

    if ((obj as DetailedSatellite)?.sccNum === '25544') {
      ServiceLocator.getSoundManager()?.play(SoundNames.CHATTER);
    } else {
      ServiceLocator.getSoundManager()?.stop(SoundNames.CHATTER);
    }

    SelectSatManager.updateCruncher_(id);
    this.updateDotSizeAndColor_(id);
    this.setSelectedSat_(id);

    // If deselecting a satellite, clear the selected orbit
    if (id === -1 && this.lastSelectedSat_ > -1) {
      ServiceLocator.getOrbitManager().clearSelectOrbit();
    } else if (!(obj instanceof OemSatellite)) {
      // Currently DetailedSatellites and Missiles assume Earth center
      settingsManager.centerBody = SolarBody.Earth;
      settingsManager.minZoomDistance = RADIUS_OF_EARTH + 50 as Kilometers;
      settingsManager.maxZoomDistance = 1.2e6 as Kilometers; // 1.2 million km
      PluginRegistry.getPlugin(PlanetsMenuPlugin)?.setAllPlanetsDotSize(0);
    }
  }

  private selectSatReset_() {
    if (this.lastSelectedSat() !== -1) {
      this.selectSatChange_(null);
    }

    // Run this ONCE when clicking empty space
    if (this.lastSelectedSat() !== -1) {
      ServiceLocator.getMainCamera().exitFixedToSat();

      document.documentElement.style.setProperty('--search-box-bottom', '0px');
      PluginRegistry.getPlugin(SatInfoBox)?.hide();
    }

    this.setSelectedSat_(-1);
  }

  private selectSatObject_(sat: DetailedSatellite | MissileObject) {
    if (sat.id !== this.lastSelectedSat()) {
      this.selectSatChange_(sat);
      if (sat.id >= 0 && sat instanceof DetailedSatellite) {
        const covMatrix = createSampleCovarianceFromTle(sat.tle1, sat.tle2).matrix.elements;

        // Cap radii at 1200 km (radial), 1000 km (cross-track), and 5000 km (in-track) to avoid huge bubbles
        let radii = [
          Math.min(Math.sqrt(covMatrix[0][0]) * settingsManager.covarianceConfidenceLevel, 1200), // Radial
          Math.min(Math.sqrt(covMatrix[2][2]) * settingsManager.covarianceConfidenceLevel, 1000), // Cross-track
          Math.min(Math.sqrt(covMatrix[1][1]) * settingsManager.covarianceConfidenceLevel, 5000), // In-track
        ] as vec3;

        if (!radii[0] || !radii[1] || !radii[2]) {
          errorManagerInstance.log('SelectSatManager.selectSatObject_: Invalid covariance matrix');
          radii = [1200, 1000, 5000];
        }

        this.primarySatCovMatrix = radii;

        const primaryCovBubble = ServiceLocator.getScene().primaryCovBubble;

        primaryCovBubble.setColor([1, 0, 0, 0.3]);
        primaryCovBubble.setRadii(ServiceLocator.getRenderer().gl, radii);
      }
    }


    // stop rotation if it is on
    ServiceLocator.getMainCamera().autoRotate(false);
    ServiceLocator.getMainCamera().state.panCurrent = {
      x: 0,
      y: 0,
      z: 0,
    };

    this.switchToSatCenteredCamera_();
    this.setSelectedSat_(sat.id);
  }

  private switchToSatCenteredCamera_() {
    if (!settingsManager.isFocusOnSatelliteWhenSelected) {
      return;
    }

    if (ServiceLocator.getMainCamera().cameraType === CameraType.FIXED_TO_EARTH) {
      ServiceLocator.getMainCamera().state.earthCenteredLastZoom = ServiceLocator.getMainCamera().zoomLevel();
      ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_SAT;
    }

    // If we deselect an object but had previously selected one then disable/hide stuff
    ServiceLocator.getMainCamera().state.camZoomSnappedOnSat = true;
    ServiceLocator.getMainCamera().state.camDistBuffer = settingsManager.minDistanceFromSatellite;
    ServiceLocator.getMainCamera().state.camAngleSnappedOnSat = true;
  }

  private static selectOwnerManufacturer_(obj: LandObject) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const searchStr = catalogManagerInstance.objectCache
      .filter((_sat) => {
        const isOwner = (_sat as DetailedSatellite).owner === obj.Code;
        const isManufacturer = (_sat as DetailedSatellite).manufacturer === obj.Code; // TODO: This might not work anymroe without coutnry codes


        return isOwner || isManufacturer;
      })
      .map((_sat) => (_sat as DetailedSatellite).sccNum)
      .join(',');

    if (searchStr.length === 0) {
      ServiceLocator.getUiManager().toast('No satellites found for this owner/manufacturer', ToastMsgType.caution, false);
    } else {
      ServiceLocator.getUiManager().searchManager.doSearch(searchStr);
      ServiceLocator.getMainCamera().changeZoom(0.9);
    }
  }

  lastSelectedSat(id?: number): number {
    if (typeof id !== 'undefined' && id !== null && id >= -1) {
      this.lastSelectedSat_ = id;
    }

    return this.lastSelectedSat_;
  }

  private static updateCruncher_(i: number) {
    ServiceLocator.getCatalogManager().satCruncher.postMessage({
      typ: CruncerMessageTypes.SATELLITE_SELECTED,
      satelliteSelected: [i],
    });
  }

  private updateDotSizeAndColor_(i: number) {
    const dotsManagerInstance = ServiceLocator.getDotsManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();
    const { gl, isContextLost } = ServiceLocator.getRenderer();

    if (isContextLost) {
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManagerInstance.colorBuffer);
    // If Old Select Sat Picked Color it Correct Color
    const lastSelectedObject = this.lastSelectedSat();

    if (lastSelectedObject > -1) {
      colorSchemeManagerInstance.currentColorSchemeUpdate ??=
        colorSchemeManagerInstance.colorSchemeInstances[settingsManager.defaultColorScheme]?.update ??
        Object.values(colorSchemeManagerInstance.colorSchemeInstances)[0].update;

      const lastSat = ServiceLocator.getCatalogManager().getObject(lastSelectedObject);

      if (lastSat && colorSchemeManagerInstance.colorData) {
        const newColor = colorSchemeManagerInstance.currentColorScheme.update(lastSat).color;

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
      if (i >= 0 && i < colorSchemeManagerInstance.colorData.length / 4) {
        gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.buffers.color); // Ensure we are using the correct buffer
        gl.bufferSubData(gl.ARRAY_BUFFER, i * 4 * Float32Array.BYTES_PER_ELEMENT, new Float32Array(settingsManager.selectedColor));
      } else {
        throw new RangeError(`bufferSubData: Index out of bounds. Provided index: ${i}, valid range: 0 to ${colorSchemeManagerInstance.colorData.length / 4 - 1}`);
      }

      dotsManagerInstance.sizeData[i] = 1.0;
      gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.buffers.size);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, dotsManagerInstance.sizeData);
    }
  }

  getSelectedSat(type = GetSatType.DEFAULT): DetailedSatellite | MissileObject {
    return ServiceLocator.getCatalogManager().getObject(this.selectedSat, type) as DetailedSatellite | MissileObject;
  }

  setSecondarySat(id: number): void {
    if (settingsManager.isDisableSelectSat) {
      return;
    }
    this.secondarySat = id;
    if (this.secondarySatObj?.id !== id) {
      this.secondarySatObj = ServiceLocator.getCatalogManager().getObject(id) as DetailedSatellite;

      if (!this.secondarySatObj) {
        this.secondarySatObj = null;
      }

      if (this.secondarySatObj instanceof MissileObject) {
        this.secondarySatObj = null;

        errorManagerInstance.warn('Selecting a missile as the secondary object is not supported!');

        return;
      }

      if ((this.secondarySatObj?.id ?? -1) >= 0 && this.secondarySatObj instanceof DetailedSatellite) {
        const covMatrix = createSampleCovarianceFromTle(this.secondarySatObj.tle1, this.secondarySatObj.tle2).matrix.elements;

        // Cap radii at 1200 km (radial), 1000 km (cross-track), and 5000 km (in-track) to avoid huge bubbles
        let radii = [
          Math.min(Math.sqrt(covMatrix[0][0]) * settingsManager.covarianceConfidenceLevel, 1200), // Radial
          Math.min(Math.sqrt(covMatrix[2][2]) * settingsManager.covarianceConfidenceLevel, 1000), // Cross-track
          Math.min(Math.sqrt(covMatrix[1][1]) * settingsManager.covarianceConfidenceLevel, 5000), // In-track
        ] as vec3;

        if (!radii[0] || !radii[1] || !radii[2]) {
          errorManagerInstance.log('SelectSatManager.setSecondarySat: Invalid covariance matrix');
          radii = [1200, 1000, 5000];
        }

        this.secondarySatCovMatrix = radii;

        const secondaryCovBubble = ServiceLocator.getScene().secondaryCovBubble;

        secondaryCovBubble.setColor([0, 0, 1, 0.4]);
        secondaryCovBubble.setRadii(ServiceLocator.getRenderer().gl, radii);
      }
    }

    if (this.secondarySat === this.selectedSat) {
      this.selectedSat = -1;
      this.setSelectedSat_(-1);
      ServiceLocator.getOrbitManager().clearSelectOrbit(false);
    }

    EventBus.getInstance().emit(EventBusEvent.setSecondarySat, this.secondarySatObj, id);
  }

  private setSelectedSat_(id: number): void {
    if (settingsManager.isDisableSelectSat || id === null) {
      return;
    }
    this.selectedSat = id;

    if (this.selectedSat === this.secondarySat && this.selectedSat !== -1) {
      this.setSecondarySat(-1);
      ServiceLocator.getOrbitManager().clearSelectOrbit(true);
    }
  }

  switchPrimarySecondary(): void {
    const _primary = this.selectedSat;
    const _secondary = this.secondarySat;

    this.setSecondarySat(_primary);
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    if (_primary !== -1) {
      orbitManagerInstance.setSelectOrbit(_primary, true);
    } else {
      orbitManagerInstance.clearSelectOrbit(true);
    }
    this.setSelectedSat_(_secondary);
  }

  private registerKeyboardEvents_() {
    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
      if ((key === '[' || key === ']') && !isRepeat) {
        this.switchPrimarySecondary();
      }
      if (key === '{' && !isRepeat) {
        this.selectPrevSat();
      }
      if (key === '}' && !isRepeat) {
        this.selectNextSat();
      }
    });
  }
}
