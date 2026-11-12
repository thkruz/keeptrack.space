/**
 * Real EmbedEngine adapter. All the engine quirks live here:
 *  - selectSat is gated by settingsManager.isDisableSelectSat, which is lifted only around our calls
 *  - user actions on host-owned domains are reported and blocked through the engine's userActionGate
 *  - a newly added or edited analyst object needs the cruncher edit, orbit buffer, editTle and a dot seed
 *  - the engine snap-to-sat resets the camera standoff, so camera writes are re-asserted after a delay
 */

import { SatMath } from '@app/app/analysis/sat-math';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { CameraType } from '@app/engine/camera/camera-type';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { userActionGate } from '@app/engine/core/user-action-gate';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { lineManagerInstance } from '@app/engine/rendering/line-manager';
import type { Line } from '@app/engine/rendering/line-manager/line';
import { SensorMarkerLine } from '@app/engine/rendering/line-manager/sensor-marker-line';
import { SurfaceLine } from '@app/engine/rendering/line-manager/surface-line';
import type { ExtraLabelSpec } from '@app/engine/rendering/sat-label-manager';
import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { SatLabelMode } from '@app/settings/ui-settings';
import { type Degrees, eci2lla, type Kilometers, type Satellite, Sgp4, SpaceObjectType, ZoomValue } from '@ootk/src/main';
import type { vec4 } from 'gl-matrix';
import { sampleAccessWindows } from './embed-access-windows';
import type {
  EmbedEngine,
  EngineGuards,
  EngineLabel,
  EngineLayerState,
  EngineLine,
  EngineLineSpec,
  EngineMarkerLabel,
  EngineObjectData,
  EngineRuntimeUi,
  EngineSensor,
  EngineSlot,
  EngineSurfaceSpec,
  EngineTle,
} from './embed-engine';
import {
  type EmbedAccessWindow,
  type EmbedCameraMode,
  type EmbedCatalogMode,
  type EmbedColor,
  EmbedError,
  type EmbedLatLon,
  type EmbedLookAngles,
  type EmbedPosition,
  type EmbedSensor,
} from './embed-types';

interface SelectManagerLike {
  selectSat(id: number): void;
  selectedSat: number;
}

const CAMERA_TYPES: Record<EmbedCameraMode, CameraType> = {
  earth: CameraType.FIXED_TO_EARTH,
  orbit: CameraType.FIXED_TO_SAT_LVLH,
  'flat-map': CameraType.FLAT_MAP,
  polar: CameraType.POLAR_VIEW,
};

/** Delayed camera re-asserts (ms); the selection snap can reset the standoff mid-ease. */
const CAMERA_REASSERT_MS = [1200, 2500, 6000];
/** Analyst offsets below this are left to the engine's own tools in full mode. */
const FULL_MODE_SLOT_START = 500;

export class KeepTrackEmbedEngine implements EmbedEngine {
  private cameraTimers_: ReturnType<typeof setTimeout>[] = [];
  private guardsInstalled_ = false;
  private readonly sensorMarkers_ = new Map<string, Line>();
  private orbitIds_: number[] = [];
  private orbitsHooked_ = false;

  constructor(readonly catalogMode: EmbedCatalogMode) {}

  isEngineReady(): boolean {
    const objectCount = ServiceLocator.getCatalogManager()?.objectCache?.length ?? 0;

    return window.keepTrack?.isReady === true && objectCount > 0;
  }

  // ---- Selection ----------------------------------------------------------

  private getSelectManager_(): SelectManagerLike | null {
    return PluginRegistry.getPluginByName<never>('SelectSatManager') as unknown as SelectManagerLike | null;
  }

  getSelectedId(): number {
    return this.getSelectManager_()?.selectedSat ?? -1;
  }

  selectById(id: number): boolean {
    const mgr = this.getSelectManager_();

    if (!mgr) {
      return false;
    }
    const previous = settingsManager.isDisableSelectSat;

    settingsManager.isDisableSelectSat = false;
    try {
      mgr.selectSat(id);
    } finally {
      settingsManager.isDisableSelectSat = previous;
    }

    return mgr.selectedSat === id;
  }

  // ---- Catalog ------------------------------------------------------------

  getObjectData(id: number): EngineObjectData | null {
    const obj = ServiceLocator.getCatalogManager().getObject(id) as Satellite | null;

    if (!obj?.isSatellite?.()) {
      return null;
    }

    return { id, name: obj.name, norad: obj.sccNum, tle1: obj.tle1, tle2: obj.tle2 };
  }

  findIdByNorad(norad: string): number | null {
    return ServiceLocator.getCatalogManager().sccNum2Id(norad, false);
  }

  allocateSlot(): EngineSlot | null {
    const cat = ServiceLocator.getCatalogManager();
    const start = this.catalogMode === 'scenario' ? 0 : FULL_MODE_SLOT_START;
    const slot = cat.getNextAvailableAnalystSat(start, settingsManager.maxAnalystSats);

    return slot ? { id: slot.id, sccNum: slot.sccNum } : null;
  }

  activateSlot(id: number, tle: EngineTle): boolean {
    const cat = ServiceLocator.getCatalogManager();
    let sat: Satellite | null = null;

    try {
      sat = cat.addAnalystSat(tle.tle1, tle.tle2, id, tle.sccNum);
    } catch {
      return false;
    }
    if (!sat) {
      return false;
    }
    sat.name = tle.name;
    // Operational payloads hold a nadir-stable attitude in the mesh renderer; anything else tumbles
    sat.status = '+' as never;
    this.notifyObjectsChanged();

    return true;
  }

  allocateSlots(count: number): EngineSlot[] {
    const cat = ServiceLocator.getCatalogManager();
    const start = this.catalogMode === 'scenario' ? 0 : FULL_MODE_SLOT_START;

    return cat.getAvailableAnalystSats(count, start, settingsManager.maxAnalystSats).map((s) => ({ id: s.id, sccNum: s.sccNum }));
  }

  activateSlots(items: { id: number; tle: EngineTle }[]): boolean[] {
    const cat = ServiceLocator.getCatalogManager();
    const made = cat.addAnalystSats(
      items.map((i) => ({ id: i.id, tle1: i.tle.tle1, tle2: i.tle.tle2, sccNum: i.tle.sccNum })),
      (sat, index) => {
        sat.name = items[index].tle.name;
        // Operational payloads hold a nadir-stable attitude in the mesh renderer; anything else tumbles
        sat.status = '+' as never;
      }
    );

    return made.map((s) => s !== null);
  }

  editObjects(items: { id: number; tle: EngineTle }[]): void {
    if (items.length === 0) {
      return;
    }
    const cat = ServiceLocator.getCatalogManager();

    cat.satCruncherThread.sendSatEditBatch(
      items.map((i) => i.id),
      items.map((i) => i.tle.tle1),
      items.map((i) => i.tle.tle2)
    );
    ServiceLocator.getOrbitManager().changeOrbitBuffersFor(
      items.map((i) => i.id),
      items.map((i) => i.tle.tle1),
      items.map((i) => i.tle.tle2)
    );
    for (const { id, tle } of items) {
      const obj = cat.objectCache[id] as Satellite | undefined;

      if (obj) {
        obj.editTle(tle.tle1 as never, tle.tle2 as never);
        obj.name = tle.name;
      }
    }
    cat.seedDotPositions(items.map((i) => i.id));
  }

  releaseSlots(ids: number[]): void {
    if (ids.length === 0) {
      return;
    }
    const cat = ServiceLocator.getCatalogManager();
    const live: number[] = [];

    for (const id of ids) {
      const obj = cat.objectCache[id] as Satellite | undefined;

      if (obj) {
        obj.active = false;
        live.push(id);
      }
    }
    cat.satCruncherThread.sendSatEditBatch(
      live,
      live.map((id) => (cat.objectCache[id] as Satellite).tle1),
      live.map((id) => (cat.objectCache[id] as Satellite).tle2),
      live.map(() => false)
    );
    this.notifyObjectsChanged();
  }

  getSlotCapacity(): number {
    return settingsManager.maxAnalystSats;
  }

  editObject(id: number, tle: EngineTle): void {
    const cat = ServiceLocator.getCatalogManager();

    cat.satCruncherThread.sendSatEdit(id, tle.tle1, tle.tle2, true);
    ServiceLocator.getOrbitManager().changeOrbitBufferData(id, tle.tle1, tle.tle2);
    const obj = cat.objectCache[id] as Satellite | undefined;

    if (obj) {
      obj.editTle(tle.tle1 as never, tle.tle2 as never);
      obj.name = tle.name;
    }
    cat.seedDotPosition(id);
  }

  releaseSlot(id: number): void {
    const cat = ServiceLocator.getCatalogManager();
    const obj = cat.objectCache[id] as Satellite | undefined;

    if (!obj) {
      return;
    }
    obj.active = false;
    cat.satCruncherThread.sendSatEdit(id, obj.tle1, obj.tle2, false);
    this.notifyObjectsChanged();
  }

  notifyObjectsChanged(): void {
    ServiceLocator.getColorSchemeManager()?.notifyObjectsChanged?.();
  }

  // ---- Camera -------------------------------------------------------------

  setCamera(mode: EmbedCameraMode | undefined, distanceKm: number | undefined, view?: { center?: EmbedLatLon; zoom?: number }): void {
    const apply = (): void => {
      const cam = ServiceLocator.getMainCamera();

      // Writing cameraType resets snap state, so only write on change
      if (mode && cam.cameraType !== CAMERA_TYPES[mode]) {
        cam.cameraType = CAMERA_TYPES[mode];
      }
      if (typeof distanceKm !== 'number') {
        return;
      }
      const state = cam.state;

      // Widen the clamps first: the camDistBuffer setter clamps against them
      if (typeof state.maxDistanceFromTarget === 'number' && state.maxDistanceFromTarget < distanceKm) {
        state.maxDistanceFromTarget = distanceKm as never;
      }
      if (typeof state.minDistanceFromTarget === 'number' && state.minDistanceFromTarget > distanceKm) {
        state.minDistanceFromTarget = distanceKm as never;
      }
      state.isZoomIn = distanceKm < state.camDistBuffer;
      state.camDistBuffer = distanceKm as never;
      // While snapped on a satellite the engine converts camDistBuffer to zoom every frame
      state.camZoomSnappedOnSat = true;
    };

    for (const t of this.cameraTimers_) {
      clearTimeout(t);
    }
    apply();
    if (view) {
      this.applyView_(view);
    }
    this.cameraTimers_ = typeof distanceKm === 'number' ? CAMERA_REASSERT_MS.map((ms) => setTimeout(apply, ms)) : [];
  }

  /** Ground-point centering: globe camSnap, or flat-map pan/zoom (the flat-map delegate clamps latitude). */
  private applyView_(view: { center?: EmbedLatLon; zoom?: number }): void {
    const cam = ServiceLocator.getMainCamera();
    const { center, zoom } = view;

    if (cam.cameraType === CameraType.FIXED_TO_EARTH && center) {
      cam.lookAtLatLon(center.lat as Degrees, center.lon as Degrees, undefined, ServiceLocator.getTimeManager().simulationTimeObj);
    } else if (cam.cameraType === CameraType.FLAT_MAP) {
      if (typeof zoom === 'number') {
        cam.flatMapZoom = zoom;
      }
      if (center) {
        const lon = ((((center.lon + 180) % 360) + 360) % 360) - 180;

        cam.flatMapPanX = (lon * Math.PI * RADIUS_OF_EARTH) / 180;
        cam.flatMapPanY = (center.lat * Math.PI * RADIUS_OF_EARTH) / 180;
      }
    }
  }

  // ---- Time ---------------------------------------------------------------

  getTimeMs(): number {
    return ServiceLocator.getTimeManager().simulationTimeObj.getTime();
  }

  getRate(): number {
    return ServiceLocator.getTimeManager().propRate;
  }

  setTimeMs(timeMs: number): void {
    ServiceLocator.getTimeManager().changeSimulationTime(timeMs);
  }

  setRate(rate: number): void {
    ServiceLocator.getTimeManager().changePropRate(rate, false);
  }

  setRenderSuspended(suspended: boolean): void {
    const engine = window.keepTrack?.engine;

    // The position worker runs its own 1 s loop; the orbit and color workers only answer requests from the
    // render loop, so stopping the loop idles them. Pause the position worker so a parked embed costs no CPU.
    const satCruncher = ServiceLocator.getCatalogManager()?.satCruncherThread;

    if (suspended) {
      engine?.suspendLoop();
      satCruncher?.sendPause(true);
    } else {
      satCruncher?.sendPause(false);
      engine?.resumeLoop();
    }
  }

  // ---- Events -------------------------------------------------------------

  onSelectionChanged(cb: (id: number) => void): void {
    EventBus.getInstance().on(EventBusEvent.selectSatData, (_sat, id) => cb(typeof id === 'number' ? id : -1));
  }

  onTimeChanged(cb: () => void): void {
    EventBus.getInstance().on(EventBusEvent.staticOffsetChange, () => cb());
    EventBus.getInstance().on(EventBusEvent.propRateChanged, () => cb());
  }

  onHoverChanged(cb: (id: number) => void): void {
    let last = -1;

    EventBus.getInstance().on(EventBusEvent.updateLoop, () => {
      // mouseSat is the picker result and updates whatever the tooltip settings are; HoverManager.hoveringSat
      // only moves while enableHoverOrbits is on, which would silence the event for ui.hover false / infoBox false.
      const hovering = ServiceLocator.getInputManager()?.mouse?.mouseSat ?? -1;

      if (hovering !== last) {
        last = hovering;
        cb(hovering);
      }
    });
  }

  // ---- Guards -------------------------------------------------------------

  installGuards(guards: EngineGuards): void {
    if (this.guardsInstalled_) {
      return;
    }
    this.guardsInstalled_ = true;

    // User entry points (click, touch, search, keyboard time keys, time UI) consult the gate; host and
    // engine-internal calls never do, so no flag or call-depth bookkeeping is needed here.
    const { selection, time } = guards;

    if (selection) {
      userActionGate.intercept('selection', (request) => {
        selection(request.satId);

        return false;
      });
    }
    if (time) {
      userActionGate.intercept('time', (request) => {
        time({ ...(request.timeMs !== undefined && { timeMs: request.timeMs }), ...(request.rate !== undefined && { rate: request.rate }) });

        return false;
      });
    }
  }

  // ---- Sensors ------------------------------------------------------------

  createSensor(sensor: EmbedSensor, objName: string): EngineSensor {
    const GEO_ZOOM_KM = 40_000;

    return new DetailedSensor({
      lat: sensor.lat as Degrees,
      lon: sensor.lon as Degrees,
      alt: sensor.altKm as Kilometers,
      minAz: sensor.minAz as Degrees,
      maxAz: sensor.maxAz as Degrees,
      minEl: sensor.minEl as Degrees,
      maxEl: sensor.maxEl as Degrees,
      minRng: sensor.minRngKm as Kilometers,
      maxRng: sensor.maxRngKm as Kilometers,
      type: SpaceObjectType.OBSERVER,
      name: sensor.name,
      uiName: sensor.name,
      system: 'Host',
      country: 'Host',
      objName,
      operator: 'Host',
      isCustomSensor: true,
      zoom: sensor.maxRngKm > GEO_ZOOM_KM ? ZoomValue.GEO : ZoomValue.LEO,
      volume: false,
    }) as unknown as EngineSensor;
  }

  /** addSecondarySensor frames every new sensor with the camera; put the view back afterwards. */
  private withCameraPreserved_(fn: () => void): void {
    const camera = ServiceLocator.getMainCamera();
    const state = camera?.state;

    if (!state) {
      fn();

      return;
    }
    const zoomTarget = state.zoomTarget;
    const pan = {
      camPitchTarget: state.camPitchTarget,
      camYawTarget: state.camYawTarget,
      earthCenteredPitch: state.earthCenteredPitch,
      earthCenteredYaw: state.earthCenteredYaw,
      isAutoPitchYawToTarget: state.isAutoPitchYawToTarget,
    };

    fn();
    Object.assign(state, pan);
    if (zoomTarget >= 0 && zoomTarget <= 1) {
      camera.changeZoom(zoomTarget);
    }
  }

  setActiveSensorSet(sensors: EngineSensor[]): void {
    const manager = ServiceLocator.getSensorManager();
    const list = sensors as unknown as DetailedSensor[];

    this.withCameraPreserved_(() => {
      for (const active of [...manager.getAllActiveSensors()]) {
        manager.removeSensor(active);
      }
      list.forEach((sensor, i) => {
        if (i === 0) {
          manager.addSecondarySensor(sensor, true);
        } else {
          manager.addSecondarySensor(sensor);
        }
      });
    });
  }

  isSensorActive(sensor: EngineSensor): boolean {
    return ServiceLocator.getSensorManager()
      .getAllActiveSensors()
      .includes(sensor as unknown as DetailedSensor);
  }

  // ---- Overlays -----------------------------------------------------------

  addLine(spec: EngineLineSpec): EngineLine | null {
    const catalog = ServiceLocator.getCatalogManager();
    const lines = lineManagerInstance.lines;
    const color = spec.color as unknown as Parameters<typeof lineManagerInstance.createObjToObj>[2];

    if (spec.kind === 'objToObj') {
      const line = lineManagerInstance.createObjToObj(catalog.getObject(spec.fromId) as never, catalog.getObject(spec.toId) as never, color);

      return line ?? null;
    }
    const before = lines.length;
    const sat = catalog.getObject(spec.objectId) as never;
    const sensor = spec.sensor as unknown as DetailedSensor;

    if (spec.fovOnly) {
      lineManagerInstance.createSensorToSatFovOnly(sensor, sat, color);
    } else {
      lineManagerInstance.createSensorToSat(sensor, sat, color);
    }

    return lines.length > before ? (lines[lines.length - 1] as EngineLine) : null;
  }

  addSurfaceLine(spec: EngineSurfaceSpec): EngineLine | null {
    const line = new SurfaceLine(spec.strips, spec.color as never, spec.dashed, spec.fillCenter ? { center: spec.fillCenter } : undefined);

    lineManagerInstance.add(line);

    return line;
  }

  updateSurfaceLine(line: EngineLine, spec: EngineSurfaceSpec): void {
    if (line instanceof SurfaceLine) {
      line.setColor(spec.color as never);
      line.setStrips(spec.strips, spec.dashed, spec.fillCenter ? { center: spec.fillCenter } : undefined);
    }
  }

  removeLine(line: EngineLine): void {
    lineManagerInstance.removeLine(line as Line);
  }

  isLineAlive(line: EngineLine): boolean {
    return lineManagerInstance.lines.includes(line as Line);
  }

  // ---- UI -----------------------------------------------------------------

  applyRuntimeUi(flags: EngineRuntimeUi): void {
    const s = settingsManager as unknown as Record<string, boolean>;

    if (typeof flags.keyboard === 'boolean') {
      s.isDisableKeyboard = !flags.keyboard;
    }
    if (typeof flags.contextMenu === 'boolean') {
      s.isAllowRightClick = flags.contextMenu;
    }
    if (typeof flags.toasts === 'boolean') {
      s.isDisableToasts = !flags.toasts;
    }
    if (typeof flags.hover === 'boolean') {
      s.enableHoverOverlay = flags.hover;
      s.enableHoverOrbits = flags.hover;
    }
  }

  // ---- Styling, layers, labels (1.2) --------------------------------------

  setObjectColor(id: number, color: EmbedColor | null): void {
    ServiceLocator.getColorSchemeManager()?.setObjectColorOverride(id, color);
  }

  setObjectHighlight(id: number, highlighted: boolean): void {
    ServiceLocator.getDotsManager()?.setDotHighlighted(id, highlighted);
  }

  setObjectColors(entries: [number, EmbedColor | null][]): void {
    const colors = ServiceLocator.getColorSchemeManager();

    for (const [id, color] of entries) {
      colors?.setObjectColorOverride(id, color);
    }
  }

  setObjectHighlights(entries: [number, boolean][]): void {
    ServiceLocator.getDotsManager()?.setDotsHighlighted(entries);
  }

  /**
   * Host names are drawn by the engine's GPU label pass (SatLabelManager), which projects in the draw pass with the
   * matrix of that frame, so they stay on their dot or marker in every camera mode.
   */
  setObjectLabels(labels: EngineLabel[]): void {
    const specs: ExtraLabelSpec[] = [];

    for (const label of labels) {
      const color = label.color ? ([label.color[0], label.color[1], label.color[2]] as [number, number, number]) : undefined;

      if (label.sensor) {
        const det = label.sensor as unknown as DetailedSensor;

        if (typeof det.lat === 'number' && typeof det.lon === 'number') {
          specs.push({ key: `sensor:${det.objName}`, text: label.text, ground: { latDeg: det.lat, lonDeg: det.lon, altKm: det.alt ?? 0 }, color });
        }
      } else if (label.id !== undefined) {
        specs.push({ key: `host:${label.id}`, text: label.text, satId: label.id, color });
      }
    }
    ServiceLocator.getSatLabelManager()?.setHostLabels(specs);
  }

  setMarkerLabels(labels: EngineMarkerLabel[]): void {
    ServiceLocator.getSatLabelManager()?.setMarkerLabels(
      labels.map((m) => ({
        key: `marker:${m.key}`,
        text: m.text,
        ground: { latDeg: m.latDeg, lonDeg: m.lonDeg, altKm: 0 },
        color: m.color ? ([m.color[0], m.color[1], m.color[2]] as [number, number, number]) : undefined,
      }))
    );
  }

  setSensorStyle(sensor: EngineSensor, style: { color?: EmbedColor; label?: string }): void {
    const previous = this.sensorMarkers_.get(sensor.objName);

    if (previous) {
      lineManagerInstance.removeLine(previous);
      this.sensorMarkers_.delete(sensor.objName);
    }
    if (style.color) {
      const marker = new SensorMarkerLine(sensor as unknown as DetailedSensor, 'embed', style.color as unknown as vec4);

      lineManagerInstance.add(marker);
      this.sensorMarkers_.set(sensor.objName, marker);
    }
  }

  applyLayers(layers: EngineLayerState): void {
    const s = settingsManager as unknown as Record<string, unknown>;

    if (layers.dayNight !== undefined) {
      s.isDrawNightAsDay = !layers.dayNight;
    }
    if (layers.graticule !== undefined) {
      s.isDrawGraticule = layers.graticule;
    }
    if (layers.allLabels !== undefined) {
      s.satLabelMode = layers.allLabels ? SatLabelMode.ALL : SatLabelMode.OFF;
    }
    if (layers.orbitIds !== undefined) {
      const orbits = ServiceLocator.getOrbitManager();

      for (const id of this.orbitIds_) {
        if (!layers.orbitIds.includes(id)) {
          orbits.removeInViewOrbit(id);
        }
      }
      this.orbitIds_ = [...layers.orbitIds];
      if (this.orbitIds_.length > 0) {
        s.isDrawOrbits = true;
        orbits.drawOrbitsSettingChanged();
        this.keepOrbitsAlive_();
      }
    }
  }

  /** The label-mode pass clears the in-view orbit list now and then; put the host objects back every frame. */
  private keepOrbitsAlive_(): void {
    if (this.orbitsHooked_) {
      return;
    }
    this.orbitsHooked_ = true;
    EventBus.getInstance().on(EventBusEvent.updateLoop, () => {
      if (this.orbitIds_.length === 0) {
        return;
      }
      const orbits = ServiceLocator.getOrbitManager();

      for (const id of this.orbitIds_) {
        orbits.addInViewOrbit(id);
      }
    });
  }

  // ---- Data out -----------------------------------------------------------
  // Main-thread JS SGP4 on the object's satrec (the same path the engine's look-angle and pass tools
  // use). The display cruncher worker and SGP4-XP wasm are not involved.

  private getSatellite_(id: number): Satellite | null {
    const obj = ServiceLocator.getCatalogManager().getObject(id) as Satellite | null;

    return obj?.satrec ? obj : null;
  }

  getPosition(id: number, timeMs: number): EmbedPosition | null {
    const sat = this.getSatellite_(id);

    if (!sat) {
      return null;
    }
    const date = new Date(timeMs);
    const { gmst, m } = SatMath.calculateTimeVariables(date, sat.satrec);
    const pos = Sgp4.propagate(sat.satrec, m as number).position;

    if (!pos) {
      return null;
    }
    const lla = eci2lla(pos, gmst);

    return {
      timeMs,
      eci: { x: pos.x, y: pos.y, z: pos.z },
      lla: { lat: lla.lat as number, lon: lla.lon as number, altKm: lla.alt as number },
    };
  }

  getLookAngles(sensor: EngineSensor, id: number, timeMs: number): EmbedLookAngles | null {
    const sat = this.getSatellite_(id);

    if (!sat) {
      return null;
    }
    const det = sensor as unknown as DetailedSensor;
    const rae = SatMath.getRae(new Date(timeMs), sat.satrec, det, true);

    if (rae.az === null || rae.el === null || rae.rng === null) {
      return null;
    }

    return { timeMs, azDeg: rae.az, elDeg: rae.el, rngKm: rae.rng, inFov: SatMath.checkIsInView(det, rae) };
  }

  findAccessWindows(sensor: EngineSensor, id: number, startMs: number, endMs: number): EmbedAccessWindow[] {
    const sat = this.getSatellite_(id);

    if (!sat) {
      throw new EmbedError('OBJECT_NOT_FOUND', 'Object has no orbital elements');
    }
    const det = sensor as unknown as DetailedSensor;

    // Boundary-aware sampling: a contact already running at startMs or endMs is clipped, not dropped
    return sampleAccessWindows(startMs, endMs, 30_000, (timeMs) => {
      const rae = SatMath.getRae(new Date(timeMs), sat.satrec, det, true);

      if (rae.az === null || rae.el === null || rae.rng === null) {
        return null;
      }

      return { inView: SatMath.checkIsInView(det, rae), elDeg: rae.el };
    }).filter((w) => Number.isFinite(w.maxElDeg));
  }

  private frameWaiters_: Array<() => void> = [];
  private frameHooked_ = false;

  captureFrame(): Promise<Blob> {
    if (!this.frameHooked_) {
      this.frameHooked_ = true;
      EventBus.getInstance().on(EventBusEvent.endOfDraw, () => {
        const waiters = this.frameWaiters_;

        this.frameWaiters_ = [];
        for (const w of waiters) {
          w();
        }
      });
    }

    return new Promise<Blob>((resolve, reject) => {
      let done = false;
      const grab = (): void => {
        if (done) {
          return;
        }
        done = true;
        const src = ServiceLocator.getRenderer().domElement;
        const out = document.createElement('canvas');

        out.width = src.width;
        out.height = src.height;
        const ctx = out.getContext('2d');

        if (!ctx) {
          reject(new EmbedError('INTERNAL', 'Could not create a 2D canvas for the screenshot'));

          return;
        }
        ctx.drawImage(src, 0, 0);
        EventBus.getInstance().emit(EventBusEvent.screenshotComposite, ctx, out.width, out.height);
        out.toBlob((blob) => (blob ? resolve(blob) : reject(new EmbedError('INTERNAL', 'Screenshot encoding failed'))), 'image/png');
      };

      this.frameWaiters_.push(grab);
      // The render loop may be paused (hidden tab); fall back to the last drawn buffer
      setTimeout(grab, 2000);
    });
  }
}
