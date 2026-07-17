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
  /**
   * Cached viewport width. `window.innerWidth` is a layout-reading property, so
   * reading it inside the per-frame updateLoop handler (checkIfSelectSatVisible)
   * forces a synchronous reflow every frame once anything has dirtied layout
   * (e.g. the clock's textContent write). It only changes on resize, so read it
   * once and refresh on the resize event instead.
   */
  private viewportWidth_ = window.innerWidth;
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

    // Refresh the cached viewport width off the render loop so checkIfSelectSatVisible
    // never has to read window.innerWidth (a forced-reflow trigger) each frame.
    window.addEventListener('resize', () => {
      this.viewportWidth_ = window.innerWidth;
    });

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
      if (this.viewportWidth_ > 1000 && this.selectedSat !== -1) {
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
      // Restore the free-camera zoom floor (a selected missile drops it to the surface).
      settingsManager.minZoomDistance = RADIUS_OF_EARTH + 50 as Kilometers;
    } else if (!(obj instanceof OemSatellite)) {
      // Currently Satellites and Missiles assume Earth center
      const wasOffEarth = settingsManager.centerBody !== SolarBody.Earth;

      settingsManager.centerBody = SolarBody.Earth;
      // Missiles fly from the surface up, so drop the zoom-in floor to the surface
      // so the camera can close in on the mesh at ANY point in the flight, including
      // the low-altitude boost phase. The per-target mesh standoff
      // (minDistanceFromTarget) still keeps the camera off the model, and because the
      // floor equals the surface the camera never dips below it. Satellites keep the
      // 50 km floor. Previously both used +50 km, which held the camera above a
      // boosting missile and blocked close inspection of the mesh early in flight.
      settingsManager.minZoomDistance = (obj?.isMissile() ? RADIUS_OF_EARTH : RADIUS_OF_EARTH + 50) as Kilometers;
      // Restore the Earth-orbit zoom ceiling ONLY when returning from a planet view
      // (which shrinks/widens it per body). An Earth-centered selection must not
      // stomp a deployment's configured maxZoomDistance (e.g. the companion embed
      // caps it at the GEO belt).
      if (wasOffEarth) {
        settingsManager.maxZoomDistance = 1.2e6 as Kilometers; // 1.2 million km
      }
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
    // primarySatObj is still the object being deselected at this point (it is reassigned to the
    // new target later in selectSat), so anchor the frozen "from" endpoint to it: the endpoint
    // then travels with the outgoing satellite through the blend instead of lagging behind it,
    // which is what makes small/close debris shake on a mode/target switch. A no-sat sentinel or
    // positionless object leaves the anchor unset (fixed-endpoint fallback).
    cam.transition.begin(cam.matrixWorldInverse, scene.worldShift, this.primarySatObj);
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
   * Approximate bounding radius (km) of a missile/RV mesh. Missiles carry no
   * span/length/diameter catalog metadata, so a fixed small radius lets the
   * camera close in on the model at true scale (like small debris) instead of
   * being held at the global 0.75 km floor.
   */
  private static readonly missileRadiusKm_ = 0.01 as Kilometers;

  /**
   * Per-target bounding radius (km) estimated from the object's physical size, used to scale both
   * the zoom-in floor and the initial framing distance. Returns null only for objects with no size
   * basis at all, which fall back to the global minimum.
   */
  private static calcTargetRadiusKm_(target?: Satellite | MissileObject): Kilometers | null {
    if (target instanceof MissileObject) {
      return SelectSatManager.missileRadiusKm_;
    }

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

    // When switching from one already-selected object to another (e.g. the [ / ] shortcuts),
    // preserve the current standoff instead of snapping to the new object's default framing -
    // otherwise a smaller target reframes closer and reads as an unwanted zoom-in even though the
    // user never changed the zoom. primarySatObj is still the OUTGOING object at this point (it is
    // reassigned to the new target later in selectSat), so a valid id means a switch, not a fresh
    // selection. The framing distance still applies on the first selection from an unfocused view.
    const wasFocusedOnObject = this.primarySatObj.id !== -1;
    const prevStandoff = cam.state.camDistBuffer;

    if (cam.cameraType === CameraType.FIXED_TO_EARTH) {
      cam.state.earthCenteredLastZoom = cam.zoomLevel();
      cam.cameraType = this.lastSatCameraType;
    }

    cam.state.camZoomSnappedOnSat = true;
    // Set the zoom-in floor to the object's size (3x radius), then frame at a comfortably larger
    // initial distance (6x radius, floored at 30 m) so selecting a satellite lands with room to
    // spare instead of at the floor - the user should never have to zoom out after selecting.
    // Missiles use a small fixed radius; only truly size-less objects fall back to the global minimum.
    const radiusKm = SelectSatManager.calcTargetRadiusKm_(target);

    if (radiusKm === null) {
      cam.state.minDistanceFromTarget = null;
      // The camDistBuffer setter clamps to the new object's min standoff, so a preserved standoff
      // that is too close for the new target is pushed out rather than clipping into it.
      cam.state.camDistBuffer = wasFocusedOnObject ? prevStandoff : cam.state.effectiveMinDistanceFromTarget;
    } else {
      let minStandoff = targetStandoffDistanceKm(radiusKm);
      let framing = initialFramingDistanceKm(radiusKm);

      if (settingsManager.isMobileModeEnabled) {
        // Pinch zoom is coarser than a mouse wheel, so keep a larger floor: the camera never lands
        // on top of the mesh (min standoff) and selecting frames the whole object with room to zoom
        // in (framing = 2x the floor). Larger objects still scale past these floors.
        const mobileFloor = settingsManager.touchMinSatDistance;

        minStandoff = Math.max(minStandoff, mobileFloor) as Kilometers;
        framing = Math.max(framing, mobileFloor * 2) as Kilometers;
      }

      cam.state.minDistanceFromTarget = minStandoff;
      cam.state.camDistBuffer = wasFocusedOnObject ? prevStandoff : framing;
    }

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

  setSecondarySat(id: number, isPreventToast = false): void {
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

        // Setting a secondary neither moves the camera nor shows a dominant orbit line
        // (the hover line draws on top of the secondary orbit), so the action can look
        // like nothing happened. Give the user an explicit cue - the toast provides the
        // visual confirmation (naming the object) and plays a notification sound. A
        // primary/secondary swap suppresses it (isPreventToast): the camera refocus
        // already signals the change and [ / ] can be pressed in quick succession.
        if (!isPreventToast) {
          ServiceLocator.getUiManager().toast(
            t7e('SelectSatManager.secondaryObjectSet').replace('{name}', this.secondarySatObj.name),
            ToastMsgType.normal,
          );
        }
      }
    }

    // Clearing the secondary must also wipe its orbit line, mirroring how deselecting
    // the primary clears the primary orbit. Without this the secondary orbit lingers
    // on screen after a clear-screen / deselect even though the object is gone.
    if (id === -1) {
      ServiceLocator.getOrbitManager().clearSelectOrbit(true);
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

    // Promote the old secondary to the primary through the full selection path so the
    // camera refocuses on it and the info box, orbit, sound, and covariance bubble all
    // update. The previous setSelectedSat_ shortcut only reassigned the id, leaving the
    // camera fixed on the old primary. selectSat clears _secondary as the secondary once
    // it becomes the primary, so reassign the old primary as the secondary afterward
    // (toast suppressed - the camera move is the swap's feedback).
    this.selectSat(_secondary);
    this.setSecondarySat(_primary, true);
  }

}
