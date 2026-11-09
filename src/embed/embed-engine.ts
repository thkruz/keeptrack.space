import type { EmbedAccessWindow, EmbedCameraMode, EmbedCatalogMode, EmbedColor, EmbedLatLon, EmbedLookAngles, EmbedPosition, EmbedSensor } from './embed-types';

/** What the facade knows about one engine object. */
export interface EngineObjectData {
  id: number;
  name: string;
  norad: string;
  tle1?: string;
  tle2?: string;
}

export interface EngineSlot {
  id: number;
  sccNum: string;
}

export interface EngineTle {
  tle1: string;
  tle2: string;
  name: string;
  /** Catalog number to stamp on the object (real NORAD number, or the slot's own analyst number). */
  sccNum?: string;
}

/** Opaque handle to a sensor built by the adapter. The facade only compares and passes it back. */
export interface EngineSensor {
  readonly objName: string;
}

/** Opaque handle to a line the adapter added to the engine's line manager. */
export type EngineLine = object;

export type EngineLineSpec =
  | { kind: 'objToObj'; fromId: number; toId: number; color?: EmbedColor }
  | { kind: 'sensorToObj'; sensor: EngineSensor; objectId: number; fovOnly: boolean; color?: EmbedColor };

/** Earth-fixed polylines on the surface (degrees). Each strip is one connected polyline. */
export interface EngineSurfaceSpec {
  strips: { lat: number; lon: number }[][];
  color: EmbedColor;
  dashed: boolean;
  /** Translucent fill of the ring in strips[0], fanned from this center. Omit for outline only. */
  fillCenter?: { lat: number; lon: number };
}

/** Runtime-toggleable UI flags (the engine reads these on every use). */
export interface EngineRuntimeUi {
  keyboard?: boolean;
  contextMenu?: boolean;
  toasts?: boolean;
}

/**
 * Hooks for user actions on host-owned domains. The engine adapter calls these ONLY for actions that
 * did not originate from the facade itself.
 */
export interface EngineGuards {
  /** User tried to select (id) or deselect (-1). The engine's own isDisableSelectSat blocks it. */
  selection?: (id: number) => void;
  /** User tried to change the clock. The adapter blocks the change after calling this. */
  time?: (change: { timeMs?: number; rate?: number }) => void;
}

/**
 * Port between the embed modules and the KeepTrack engine. Everything engine-specific (cruncher
 * seeding, flag lifting, camera re-asserts) lives behind it, so hosts never see those quirks and the
 * modules can be unit-tested with a fake.
 */
export interface EmbedEngine {
  readonly catalogMode: EmbedCatalogMode;
  /** Render loop live and object cache populated. */
  isEngineReady(): boolean;

  // Selection
  getSelectedId(): number;
  /** Select (or -1 to deselect) with the host-ownership flag lifted. True once selectedSat === id. */
  selectById(id: number): boolean;

  // Catalog
  getObjectData(id: number): EngineObjectData | null;
  findIdByNorad(norad: string): number | null;
  /** First free analyst slot, or null. */
  allocateSlot(): EngineSlot | null;
  /** Activate a free analyst slot with elements. False when the engine rejects them. */
  activateSlot(id: number, tle: EngineTle): boolean;
  /** Swap the elements of a live object in place (analyst slot or catalog object). */
  editObject(id: number, tle: EngineTle): void;
  /** Deactivate an analyst slot previously activated by activateSlot. */
  releaseSlot(id: number): void;
  notifyObjectsChanged(): void;

  // Camera
  setCamera(mode: EmbedCameraMode | undefined, distanceKm: number | undefined, view?: { center?: EmbedLatLon; zoom?: number }): void;

  // Time
  getTimeMs(): number;
  getRate(): number;
  setTimeMs(timeMs: number): void;
  setRate(rate: number): void;

  /** Park (true) or restart (false) the render/update loop. */
  setRenderSuspended(suspended: boolean): void;

  // Events (subscriptions live for the page's lifetime)
  onSelectionChanged(cb: (id: number) => void): void;
  onTimeChanged(cb: () => void): void;
  /** Called with the hovered object id (-1 for none) whenever it changes. */
  onHoverChanged(cb: (id: number) => void): void;

  installGuards(guards: EngineGuards): void;

  // Sensors
  /** Build an engine sensor from a host definition. Does not activate it. `objName` is unique to the host. */
  createSensor(sensor: EmbedSensor, objName: string): EngineSensor;
  /** Make exactly these sensors the active set (first is primary, the rest secondary). Empty clears. */
  setActiveSensorSet(sensors: EngineSensor[]): void;
  isSensorActive(sensor: EngineSensor): boolean;

  // Overlays (lines)
  /** Add a line. Null when the engine cannot draw it (object missing or not a satellite). */
  addLine(spec: EngineLineSpec): EngineLine | null;
  /** Add an Earth-fixed surface polyline (globe and flat map). Null when the engine cannot draw it. */
  addSurfaceLine(spec: EngineSurfaceSpec): EngineLine | null;
  /** Replace the geometry/style of a surface line made by addSurfaceLine. */
  updateSurfaceLine(line: EngineLine, spec: EngineSurfaceSpec): void;
  removeLine(line: EngineLine): void;
  /** False once the engine garbage-collected the line (inactive sensor, left the FOV, object gone). */
  isLineAlive(line: EngineLine): boolean;

  // UI
  applyRuntimeUi(flags: EngineRuntimeUi): void;

  // Data out (all take epoch ms)
  getPosition(id: number, timeMs: number): EmbedPosition | null;
  getLookAngles(sensor: EngineSensor, id: number, timeMs: number): EmbedLookAngles | null;
  findAccessWindows(sensor: EngineSensor, id: number, startMs: number, endMs: number): EmbedAccessWindow[];
  /** PNG of a freshly rendered frame. */
  captureFrame(): Promise<Blob>;

  // Styling, layers and camera view (1.2)
  /** Pin an object's dot color past every color-scheme update; null restores the scheme color. */
  setObjectColor(id: number, color: EmbedColor | null): void;
  /** Draw an object's dot at the large size. */
  setObjectHighlight(id: number, highlighted: boolean): void;
  /** Persistent names next to objects (replaces the previous set). Empty clears. */
  setObjectLabels(labels: EngineLabel[]): void;
  /** Text next to fixed ground points (marker overlays; replaces the previous set). Empty clears. */
  setMarkerLabels(labels: EngineMarkerLabel[]): void;
  /** Apply scene layers. Unset fields are left alone. `orbitIds` are the objects whose orbit line is drawn. */
  applyLayers(layers: EngineLayerState): void;
  /** Color/label of a host sensor's ground marker. */
  setSensorStyle(sensor: EngineSensor, style: { color?: EmbedColor; label?: string }): void;
}

/** One name tag. `id` is an object id; `sensor` anchors it to a sensor's ground position instead. */
export interface EngineLabel {
  id?: number;
  sensor?: EngineSensor;
  text: string;
  bold: boolean;
  color?: EmbedColor;
}

/** One marker-overlay text: anchored to a fixed lat/lon on the ground. */
export interface EngineMarkerLabel {
  key: string;
  text: string;
  latDeg: number;
  lonDeg: number;
  color?: EmbedColor;
}

export interface EngineLayerState {
  dayNight?: boolean;
  graticule?: boolean;
  /** Draw orbit lines for exactly these object ids (empty = none). */
  orbitIds?: number[];
  /** Engine-wide sat labels (digits): true for the 'all' labels mode. */
  allLabels?: boolean;
}
