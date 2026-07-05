import { CameraState } from '@app/engine/camera/state/camera-state';
import { CameraType } from '@app/engine/camera/camera-type';
import { GetSatType, SolarBody, ToastMsgType } from '@app/engine/core/interfaces';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';

import { satDetailService } from '@app/app/data/catalogs/sat-detail-service';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { Planet } from '@app/app/objects/planet';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SoundNames } from '@app/engine/audio/sounds';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import {
  IKeyboardShortcut,
  ISettingsContribution,
  ISettingsContributor,
} from '@app/engine/plugins/core/plugin-capabilities';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { estimateObjectRadiusKm, initialFramingDistanceKm, targetStandoffDistanceKm } from '@app/engine/utils/transforms';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
import { COVARIANCE_RADII_FALLBACK, covarianceDisplayRadii, ricSigmasFromCovarianceMatrix } from '@app/engine/rendering/draw-manager/covariance-radii';
import { createSampleCovarianceFromTle, Kilometers, RADIUS_OF_EARTH, Satellite, SpaceObjectType, TemeVec3 } from '@ootk/src/main';
import { vec3 } from 'gl-matrix';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { PlanetsMenuPlugin } from '../planets-menu/planets-menu';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { TopMenu } from '../top-menu/top-menu';

/**
 * This is the class that manages the selection of objects.
 */
export class SelectSatManager extends KeepTrackPlugin implements ISettingsContributor {
  readonly id = 'SelectSatManager';
  dependencies_ = [];

  getSettingsContribution(): ISettingsContribution {
    return {
      sectionId: this.id,
      sectionLabel: t7e('plugins.SelectSatManager.sectionLabel'),
      controls: [
        {
          type: 'toggle',
          id: 'focusOnSatWhenSelected',
          label: t7e('plugins.SelectSatManager.settings.focusOnSatWhenSelected.label'),
          helpText: t7e('plugins.SelectSatManager.settings.focusOnSatWhenSelected.helpText'),
          get: () => settingsManager.isFocusOnSatelliteWhenSelected,
          set: (next) => {
            settingsManager.isFocusOnSatelliteWhenSelected = next;
            PersistenceManager.getInstance().saveItem(
              StorageKey.SETTINGS_FOCUS_ON_SAT_WHEN_SELECTED,
              next.toString(),
            );
          },
        },
      ],
    };
  }

  lastCssStyle = '';
  selectedSat = -1;
  private readonly noSatObj_ = <Satellite>(<unknown>{
    id: -1,
    missile: false,
    type: SpaceObjectType.UNKNOWN,
    static: false,
  });

  primarySatObj: Satellite | MissileObject | OemSatellite = this.noSatObj_;
  /** Ellipsoid radii for the primary satellite in RCI coordinates */
  primarySatCovMatrix: vec3 | null = null;
  secondarySat = -1;
  secondarySatObj: Satellite | null = null;
  /** Ellipsoid radii for the secondary satellite in RCI coordinates */
  secondarySatCovMatrix: vec3;
  private lastSelectedSat_ = -1;
  lastSatCameraType: CameraType = CameraType.FIXED_TO_SAT_ECI;

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: '[',
        callback: () => this.switchPrimarySecondary(),
      },
      {
        key: ']',
        callback: () => this.switchPrimarySecondary(),
      },
      {
        key: '{',
        callback: () => this.selectPrevSat(),
      },
      {
        key: '}',
        callback: () => this.selectNextSat(),
      },
    ];
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.updateLoop, this.checkIfSelectSatVisible.bind(this));

    EventBus.getInstance().on(EventBusEvent.endOfDraw, () => {
      if ((this.selectedSat ?? -1) !== -1) {
        const timeManagerInstance = ServiceLocator.getTimeManager();

        if (this.primarySatObj) {
          ServiceLocator.getUiManager().
            updateSelectBox(timeManagerInstance.realTime, timeManagerInstance.lastBoxUpdateTime, this.primarySatObj);
        }
      }
    });

    // Catalog swaps invalidate every cached satellite reference held here. The id-based
    // selectedSat is reset by catalog-loader's selectSat(-1) call, but the JS object
    // references aren't, so we clear them ourselves to avoid acting on a stale Satellite.
    // secondarySat (the id) is also cleared here since catalog-loader doesn't touch it,
    // and a stale id can collide with a new selection that happens to reuse the number.
    EventBus.getInstance().on(EventBusEvent.catalogReloaded, () => {
      this.primarySatObj = this.noSatObj_;
      this.primarySatCovMatrix = null;
      this.secondarySat = -1;
      this.secondarySatObj = null;
      this.secondarySatCovMatrix = vec3.create();
      this.lastSelectedSat_ = -1;
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
      const objWithPos = obj as unknown as { position: TemeVec3; name: string };

      // Check if object is at position (0,0,0) which is inside Earth - only for objects with position property
      if (objWithPos.position && objWithPos.position.x === 0 && objWithPos.position.y === 0 && objWithPos.position.z === 0 && objWithPos.name !== SolarBody.Earth) {
        ServiceLocator.getUiManager().toast(t7e('SelectSatManager.objectInsideEarth'), ToastMsgType.caution);

        return;
      }

      // Planet dots (celestial bodies, deep-space satellites) route to changePlanet
      if (obj instanceof Planet) {
        PluginRegistry.getPlugin(PlanetsMenuPlugin)?.changePlanet(obj.name as SolarBody);

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
          this.selectSatObject_(obj as Satellite);
          break;
        case SpaceObjectType.PAYLOAD_OWNER:
        case SpaceObjectType.SUBORBITAL_PAYLOAD_OPERATOR:
        case SpaceObjectType.PAYLOAD_MANUFACTURER:
        case SpaceObjectType.METEOROLOGICAL_ROCKET_LAUNCH_AGENCY_OR_MANUFACTURER:
        case SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION:
          // Agencies/operators are no longer drawn on the globe or selectable.
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

    const spaceObj = obj as Satellite | MissileObject;

    // Set the primary sat
    this.primarySatObj = spaceObj ?? this.noSatObj_;

    // Run any other callbacks
    EventBus.getInstance().emit(EventBusEvent.selectSatData, spaceObj, spaceObj?.id);

    // Lazy-load satellite detail data if not already present
    if (spaceObj?.isSatellite() && !satDetailService.hasDetail(spaceObj as Satellite)) {
      satDetailService.fetchSatDetail(spaceObj as Satellite);
    }

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

  private selectSatChange_(obj = null as Satellite | MissileObject | null) {
    const id = obj?.id ?? -1;

    ServiceLocator.getSoundManager()?.play(SoundNames.WHOOSH);

    if ((obj as Satellite)?.sccNum === '25544') {
      ServiceLocator.getSoundManager()?.play(SoundNames.CHATTER);
    } else {
      ServiceLocator.getSoundManager()?.stop(SoundNames.CHATTER);
    }

    SelectSatManager.updateCruncher_(id);
    this.updateDotSizeAndColor_(id);
    this.setSelectedSat_(id);

    // If deselecting a satellite, clear the selected orbit
    if (id === -1 && this.lastSelectedSat_ !== -1) {
      ServiceLocator.getOrbitManager().clearSelectOrbit();
    } else if (!(obj instanceof OemSatellite)) {
      // Currently Satellites and Missiles assume Earth center
      settingsManager.centerBody = SolarBody.Earth;
      settingsManager.minZoomDistance = RADIUS_OF_EARTH + 50 as Kilometers;
      settingsManager.maxZoomDistance = 1.2e6 as Kilometers; // 1.2 million km
      PluginRegistry.getPlugin(PlanetsMenuPlugin)?.setAllPlanetsDotSize(0);
    }
  }

  private beginCameraTransition_(): void {
    if (!settingsManager.isSmoothCameraTransitions) {
      return;
    }

    const cam = ServiceLocator.getMainCamera();
    const scene = Scene.getInstance();

    cam.transition.duration = settingsManager.cameraTransitionDuration;
    cam.transition.begin(cam.matrixWorldInverse, scene.worldShift);
  }

  private selectSatReset_() {
    if (this.lastSelectedSat() !== -1) {
      this.selectSatChange_(null);
    }

    // Run this ONCE when clicking empty space
    if (this.lastSelectedSat() !== -1) {
      const cam = ServiceLocator.getMainCamera();

      const wasSatMode = cam.cameraType === CameraType.FIXED_TO_SAT_ECI || cam.cameraType === CameraType.FIXED_TO_SAT_LVLH;

      if (wasSatMode) {
        this.lastSatCameraType = cam.cameraType;
      }
      this.beginCameraTransition_();
      cam.exitFixedToSat();

      // exitFixedToSat handles camDistBuffer and zoomTarget for SAT modes only.
      // For FIXED_TO_EARTH (most common), clean up snap state here so zoom works.
      if (cam.state.camZoomSnappedOnSat) {
        cam.state.camZoomSnappedOnSat = false;
        cam.state.camAngleSnappedOnSat = false;
        // Reset isZoomIn so the direction guard in updateZoom_ doesn't cancel
        // the zoom-out transition to earthCenteredLastZoom.
        cam.state.isZoomIn = false;
        // Restore the global minimum standoff now that no sized target is selected.
        cam.state.minDistanceFromTarget = null;
        settingsManager.selectedColor = settingsManager.selectedColorFallback;

        if (!wasSatMode) {
          // FIXED_TO_EARTH: exitFixedToSat returned early, restore zoom ourselves
          cam.state.camDistBuffer = CameraState.MAX_CAM_DIST_BUFFER;
          cam.state.zoomTarget = cam.state.earthCenteredLastZoom;
        }
      }

      document.documentElement.style.setProperty('--search-box-bottom', '0px');
      PluginRegistry.getPlugin(SatInfoBox)?.hide();
    }

    this.setSelectedSat_(-1);
  }

  private selectSatObject_(sat: Satellite | MissileObject) {
    if (sat.id !== this.lastSelectedSat()) {
      this.selectSatChange_(sat);
      if (sat.id !== -1 && sat instanceof Satellite) {
        this.updatePrimaryCovBubble_(sat);
      }
    }


    // stop rotation if it is on
    ServiceLocator.getMainCamera().autoRotate(false);
    ServiceLocator.getMainCamera().state.panCurrent = {
      x: 0,
      y: 0,
      z: 0,
    };

    this.beginCameraTransition_();
    this.switchToSatCenteredCamera_(sat);
    this.setSelectedSat_(sat.id);
  }

  /**
   * Recompute the TLE-derived covariance ellipsoids for the current primary and
   * secondary selection. Call after a global change (e.g. the confidence level)
   * so the on-screen bubbles resize without re-selecting. The CovariancePlugin
   * re-applies measured covariance on top where it has data.
   */
  recalculateCovarianceBubbles(): void {
    if (this.selectedSat !== -1 && this.primarySatObj instanceof Satellite) {
      this.updatePrimaryCovBubble_(this.primarySatObj);
    }
    if (this.secondarySat !== -1 && this.secondarySatObj instanceof Satellite) {
      this.updateSecondaryCovBubble_(this.secondarySatObj);
    }
  }

  private updatePrimaryCovBubble_(sat: Satellite): void {
    const radii = SelectSatManager.computeTleCovRadii_(sat, 'SelectSatManager.updatePrimaryCovBubble_');

    this.primarySatCovMatrix = radii;

    const primaryCovBubble = ServiceLocator.getScene().primaryCovBubble;

    primaryCovBubble.setColor([1, 0, 0, 0.3]);
    primaryCovBubble.setRadii(ServiceLocator.getRenderer().gl, radii);
  }

  private updateSecondaryCovBubble_(sat: Satellite): void {
    const radii = SelectSatManager.computeTleCovRadii_(sat, 'SelectSatManager.updateSecondaryCovBubble_');

    this.secondarySatCovMatrix = radii;

    const secondaryCovBubble = ServiceLocator.getScene().secondaryCovBubble;

    secondaryCovBubble.setColor([0, 0, 1, 0.4]);
    secondaryCovBubble.setRadii(ServiceLocator.getRenderer().gl, radii);
  }

  /** TLE-derived covariance ellipsoid radii, falling back to the capped default on failure. */
  private static computeTleCovRadii_(sat: Satellite, logContext: string): vec3 {
    let radii: vec3 = [...COVARIANCE_RADII_FALLBACK] as vec3;

    try {
      const covMatrix = createSampleCovarianceFromTle(sat.tle1, sat.tle2).matrix.elements;
      const computed = covarianceDisplayRadii(ricSigmasFromCovarianceMatrix(covMatrix), settingsManager.covarianceConfidenceLevel);

      if (computed && computed[0] && computed[1] && computed[2]) {
        radii = computed;
      } else {
        errorManagerInstance.log(`${logContext}: Invalid covariance matrix`);
      }
    } catch {
      errorManagerInstance.log(`${logContext}: Failed to compute covariance from TLE`);
    }

    return radii;
  }

  /**
   * Per-target bounding radius (km) estimated from the object's physical size, used to scale both
   * the zoom-in floor and the initial framing distance. Returns null for objects without size
   * metadata (e.g. missiles), which fall back to the global minimum.
   */
  private static calcTargetRadiusKm_(target?: Satellite | MissileObject): Kilometers | null {
    if (!(target instanceof Satellite)) {
      return null;
    }

    return estimateObjectRadiusKm({
      span: target.span,
      length: target.length,
      diameter: target.diameter,
      rcs: target.rcs,
      isRocketBody: target.type === SpaceObjectType.ROCKET_BODY,
      isPayload: target.type === SpaceObjectType.PAYLOAD,
    });
  }

  private switchToSatCenteredCamera_(target?: Satellite | MissileObject) {
    if (!settingsManager.isFocusOnSatelliteWhenSelected) {
      return;
    }

    const cam = ServiceLocator.getMainCamera();

    if (cam.cameraType === CameraType.FIXED_TO_EARTH) {
      cam.state.earthCenteredLastZoom = cam.zoomLevel();
      cam.cameraType = this.lastSatCameraType;
    }

    cam.state.camZoomSnappedOnSat = true;
    // Set the zoom-in floor to the object's size (3x radius), then frame at a comfortably larger
    // initial distance (6x radius, floored at 30 m) so selecting a satellite lands with room to
    // spare instead of at the floor - the user should never have to zoom out after selecting.
    // Objects without size metadata (e.g. missiles) fall back to the global minimum for both.
    const radiusKm = SelectSatManager.calcTargetRadiusKm_(target);

    cam.state.minDistanceFromTarget = radiusKm === null ? null : targetStandoffDistanceKm(radiusKm);
    cam.state.camDistBuffer = radiusKm === null ? cam.state.effectiveMinDistanceFromTarget : initialFramingDistanceKm(radiusKm);

    if (cam.cameraType === CameraType.FIXED_TO_SAT_LVLH || cam.cameraType === CameraType.FIXED_TO_SAT_ECI) {
      // In satellite modes the LVLH/ECI frame already tracks the satellite.
      // Reset orientation to in-track alignment (ftsPitch=0, ftsYaw=0).
      cam.state.ftsRotateReset = true;
      cam.state.camAngleSnappedOnSat = false;
      cam.state.isAutoPitchYawToTarget = false;
    } else {
      cam.state.camAngleSnappedOnSat = true;
    }
  }

  lastSelectedSat(id?: number): number {
    if (typeof id !== 'undefined' && id !== null) {
      this.lastSelectedSat_ = id;
    }

    return this.lastSelectedSat_;
  }

  private static updateCruncher_(i: number) {
    ServiceLocator.getCatalogManager().satCruncherThread.sendSatelliteSelected([i]);
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

    if (lastSelectedObject !== -1) {
      colorSchemeManagerInstance.currentColorSchemeUpdate ??=
        colorSchemeManagerInstance.colorSchemeInstances[settingsManager.defaultColorScheme]?.update ??
        Object.values(colorSchemeManagerInstance.colorSchemeInstances)[0].update;

      const lastSat = ServiceLocator.getCatalogManager().getObject(lastSelectedObject);
      // Guard against a stale lastSelectedObject id that now exceeds the color buffer
      // (e.g. after a catalog reload). Writing past the GPU buffer triggers
      // "INVALID_VALUE: bufferSubData: buffer overflow".
      const isLastInColorRange = lastSelectedObject >= 0 && lastSelectedObject < colorSchemeManagerInstance.colorData.length / 4;

      if (lastSat && colorSchemeManagerInstance.colorData && isLastInColorRange) {
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
    if (i !== -1) {
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

  getSelectedSat(type = GetSatType.DEFAULT): Satellite | MissileObject {
    return ServiceLocator.getCatalogManager().getObject(this.selectedSat, type) as Satellite | MissileObject;
  }

  setSecondarySat(id: number): void {
    if (settingsManager.isDisableSelectSat) {
      return;
    }
    this.secondarySat = id;
    if (this.secondarySatObj?.id !== id) {
      this.secondarySatObj = ServiceLocator.getCatalogManager().getObject(id) as Satellite;

      if (!this.secondarySatObj) {
        this.secondarySatObj = null;
      }

      if (this.secondarySatObj instanceof MissileObject) {
        this.secondarySatObj = null;

        errorManagerInstance.warn('Selecting a missile as the secondary object is not supported!');

        return;
      }

      if ((this.secondarySatObj?.id ?? -1) !== -1 && this.secondarySatObj instanceof Satellite) {
        this.updateSecondaryCovBubble_(this.secondarySatObj);
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

}
