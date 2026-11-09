/**
 * KeepTrack Embed API v1 contract.
 *
 * This file is the single source of truth for the embed surface. It is shared by:
 *  - the in-engine facade (src/embed/embed-api.ts), installed as window.keepTrackEmbed
 *  - the MIT host SDK (packages/embed-sdk), which creates a same-origin iframe
 *  - the JSON command channel (EmbedCommand), reused later by the WebSocket relay
 *
 * Rules for this file:
 *  - NO imports. Hosts compile against it without pulling in the engine.
 *  - Everything that crosses execute() must be JSON-serializable (no Date, no class instances).
 *  - The API has its own semver (EMBED_API_VERSION), independent of the KeepTrack release.
 *    Additive changes bump the minor; removals or meaning changes bump the major.
 *
 * Licensed under the MIT License (unlike the AGPL engine) so hosts can vendor it.
 */

export const EMBED_API_VERSION = '1.3.0';

// ---------------------------------------------------------------------------
// Boot configuration
// ---------------------------------------------------------------------------

/** Areas of shared state whose owner the host chooses at boot. */
export type EmbedDomain = 'time' | 'catalog' | 'selection' | 'camera' | 'sensors';

/**
 * Who may change a domain.
 *  - 'host':      only the host API changes it. KeepTrack UI for it is hidden or inert; when the user
 *                 tries anyway (e.g. clicks a satellite) KeepTrack emits `changeRequested` instead.
 *  - 'keeptrack': only the KeepTrack UI changes it. Host setters for it reject with DOMAIN_NOT_OWNED;
 *                 the host observes through events and getters.
 *  - 'shared':    both may change it; every change emits a `*Changed` event with its source.
 */
export type DomainOwner = 'host' | 'keeptrack' | 'shared';

export type EmbedCatalogMode =
  /** Only objects the host pushes exist. No catalog download (fast boot). */
  | 'scenario'
  /** The normal KeepTrack catalog loads; host objects are added or override matching NORAD numbers. */
  | 'full';

export interface EmbedUiFlags {
  /** Bottom plugin menu bar. */
  bottomMenu: boolean;
  /** Top bar (search, time display, settings). */
  topMenu: boolean;
  search: boolean;
  /** Time controls (play/pause, rate, date picker). Forced off when the host owns time. */
  timeControls: boolean;
  /** Global keyboard shortcuts. */
  keyboard: boolean;
  /** Right-click context menu. */
  contextMenu: boolean;
  /** Toast notifications. */
  toasts: boolean;
  /** Selected-object info box. */
  infoBox: boolean;
}

export interface EmbedConfig {
  /**
   * Major version the host was written against (e.g. '1'). On a mismatch KeepTrack still boots, logs to the
   * console and emits an `error` event with VERSION_MISMATCH right after `ready`.
   */
  apiVersion?: string;
  /** Signed license key. Missing/invalid keys degrade to the open-core feature set; they never block boot. */
  licenseKey?: string;
  catalog?: {
    mode: EmbedCatalogMode;
    /** Objects to load at boot. Equivalent to calling upsertObjects() right after ready. */
    objects?: EmbedObject[];
  };
  /** Unlisted domains default to 'shared'. */
  ownership?: Partial<Record<EmbedDomain, DomainOwner>>;
  plugins?: {
    /**
     * Plugin ids to enable (strict allowlist). Unlisted plugins stay off. Omit for the build's defaults.
     * Pro plugins are dropped when the license does not cover them.
     */
    allow?: string[];
  };
  ui?: Partial<EmbedUiFlags>;
  /** Initial scene layers. (1.2) */
  layers?: Partial<EmbedLayers>;
  time?: {
    /** ISO-8601 string or epoch ms. */
    start?: string | number;
    /** Propagation rate (1 = real time, 0 = paused). */
    rate?: number;
  };
  /**
   * Escape hatch: raw settingsOverride keys merged last. Not covered by API semver; any key may change
   * meaning between KeepTrack releases.
   */
  settings?: Record<string, unknown>;
  /**
   * Remote control channel. When set, the engine dials out to a relay over WebSocket after `ready` and
   * accepts EmbedCommands from relay clients (scripts, backends). Host-configured only: there is no URL
   * parameter for it, so a third-party link can never attach someone's KeepTrack to a foreign relay.
   */
  remote?: EmbedRemoteConfig;
}

export interface EmbedRemoteConfig {
  /** ws:// or wss:// URL of the relay. */
  url: string;
  /** Session name clients use to address this engine on the relay. */
  session: string;
  /** Shared secret checked by the relay (sent in the hello message, never in the URL). */
  token?: string;
  /** Reconnect with backoff after a dropped connection. Default true. */
  reconnect?: boolean;
}

// ---------------------------------------------------------------------------
// Objects, sensors, overlays
// ---------------------------------------------------------------------------

/** RGBA, each channel 0..1. */
export type EmbedColor = [number, number, number, number];

/**
 * A satellite supplied by the host. `hostId` is the host's own stable identifier and is how the host
 * refers to the object afterwards; KeepTrack never exposes its internal array index as identity.
 */
export interface EmbedObject {
  hostId: string;
  name: string;
  tle1: string;
  tle2: string;
  /**
   * Real NORAD catalog number, if any. In 'full' mode an object whose NORAD number exists in the
   * catalog overrides that object's elements instead of adding a duplicate. Fictional objects omit
   * it and get an analyst slot.
   */
  norad?: string;
}

export type ObjectRef = { hostId: string } | { norad: string };

export interface EmbedObjectInfo {
  /** Present when the object was pushed by the host. */
  hostId?: string;
  norad?: string;
  name: string;
  tle1?: string;
  tle2?: string;
}

export interface EmbedUpsertResult {
  hostId: string;
  ok: boolean;
  /** 'added' | 'updated' | 'overrode-catalog' on success. */
  action?: 'added' | 'updated' | 'overrode-catalog';
  error?: EmbedErrorCode;
}

/** A ground site supplied by the host (antenna, radar, telescope). Angles in degrees, distances in km. */
export interface EmbedSensor {
  hostId: string;
  name: string;
  lat: number;
  lon: number;
  altKm: number;
  minAz: number;
  maxAz: number;
  minEl: number;
  maxEl: number;
  minRngKm: number;
  maxRngKm: number;
  /** Marker color. Defaults to the engine's sensor color. (1.2) */
  color?: EmbedColor;
  /** Draw the sensor name next to its marker. Default false. (1.2) */
  label?: boolean;
}

/** How a host object is drawn. Unset fields fall back to the active color scheme. (1.2) */
export interface EmbedObjectStyle {
  color?: EmbedColor;
  /** Emphasize the object: larger dot, thicker ground track, bold label. */
  highlight?: boolean;
  /** true = draw the object's name, string = draw this text instead, false/omitted = no label. */
  label?: boolean | string;
}

export interface EmbedLineStyle {
  color?: EmbedColor;
  dashed?: boolean;
}

/**
 * Sub-satellite ground tracks, drawn on the globe surface and in flat-map mode. (1.2)
 * Tracks follow the object's current elements and redraw after upserts, time jumps (including backwards)
 * and rate changes.
 */
export interface EmbedGroundTrackOptions {
  /** Minutes of track behind the object. */
  pastMin: number;
  /** Minutes of track ahead of the object. */
  futureMin: number;
  /** Sample spacing. Default 30 s. */
  stepSec?: number;
  /** Default solid, object color. */
  past?: EmbedLineStyle;
  /** Default dashed, object color. */
  future?: EmbedLineStyle;
}

export interface EmbedLatLon {
  lat: number;
  lon: number;
}

export type OverlayEndpoint = { object: ObjectRef } | { sensor: string };

export interface EmbedLineOverlay {
  type: 'line';
  from: OverlayEndpoint;
  to: OverlayEndpoint;
  color?: EmbedColor;
  /** Only draw while `to` is inside the sensor's field of view (sensor -> object lines only). */
  fovOnly?: boolean;
}

/** Coverage footprint: the ground area that sees the object above minElDeg. Moves with the object. (1.2) */
export interface EmbedFootprintOverlay extends EmbedLineStyle {
  type: 'footprint';
  object: ObjectRef;
  minElDeg: number;
  /** Translucent fill under the outline (a quarter of the color's alpha). Default false. */
  fill?: boolean;
}

/**
 * Small circle on the ground. `radius` is a fixed great-circle angle, or the access radius for an object:
 * the circle of ground points that see that object above minElDeg (follows its altitude). (1.2)
 */
export interface EmbedCircleOverlay extends EmbedLineStyle {
  type: 'circle';
  center: { sensor: string } | EmbedLatLon;
  radius: { deg: number } | { accessOf: ObjectRef; minElDeg: number };
  /** Translucent fill under the outline (a quarter of the color's alpha). Default false. */
  fill?: boolean;
}

/** Fixed point on the ground. (1.2) */
export interface EmbedMarkerOverlay {
  type: 'marker';
  position: EmbedLatLon;
  shape?: 'dot' | 'diamond' | 'ring' | 'cross';
  label?: string;
  color?: EmbedColor;
}

/** Error ellipse on the ground. Bearing of the semi-major axis in degrees from north. (1.2) */
export interface EmbedEllipseOverlay extends EmbedLineStyle {
  type: 'ellipse';
  center: EmbedLatLon;
  semiMajorKm: number;
  semiMinorKm: number;
  bearingDeg: number;
  /** Translucent fill under the outline (a quarter of the color's alpha). Default false. */
  fill?: boolean;
}

/** Polyline on the ground following great circles between points. (1.2) */
export interface EmbedPolylineOverlay extends EmbedLineStyle {
  type: 'polyline';
  points: EmbedLatLon[];
  closed?: boolean;
}

export type EmbedOverlay = EmbedLineOverlay | EmbedFootprintOverlay | EmbedCircleOverlay | EmbedMarkerOverlay | EmbedEllipseOverlay | EmbedPolylineOverlay;

/** Scene layers the host can toggle. (1.2) */
export interface EmbedLayers {
  /** Day/night shading with city lights on the night side. */
  dayNight: boolean;
  /** Latitude/longitude grid. */
  graticule: boolean;
  /** Orbit lines for host objects (3D, not ground tracks). */
  orbits: boolean;
  /** Names next to objects. 'host' = only host objects with a label style. */
  labels: 'all' | 'host' | 'none';
}

// ---------------------------------------------------------------------------
// Camera, time, data out
// ---------------------------------------------------------------------------

export type EmbedCameraMode =
  /** Globe view, Earth-fixed. */
  | 'earth'
  /** Ride along with the selected object (LVLH). */
  | 'orbit'
  | 'flat-map'
  | 'polar';

export interface EmbedCameraOptions {
  mode?: EmbedCameraMode;
  /** Standoff from the selected object, or from Earth center in 'earth' mode without a selection. */
  distanceKm?: number;
  /** Point the view at this ground location ('earth' and 'flat-map' modes, ignored while an object is selected). (1.2) */
  center?: EmbedLatLon;
  /** 'flat-map' only: 1 = whole world visible, larger values zoom in. (1.2) */
  zoom?: number;
}

export interface EmbedTimeState {
  /** Simulation time, epoch ms. */
  timeMs: number;
  rate: number;
  paused: boolean;
}

export interface EmbedPosition {
  timeMs: number;
  /** TEME, km. */
  eci: { x: number; y: number; z: number };
  lla: { lat: number; lon: number; altKm: number };
}

export interface EmbedLookAngles {
  timeMs: number;
  azDeg: number;
  elDeg: number;
  rngKm: number;
  inFov: boolean;
}

export interface EmbedAccessWindow {
  startMs: number;
  endMs: number;
  maxElDeg: number;
}

export type LicenseState = 'valid' | 'missing' | 'invalid' | 'expired' | 'wrong-domain';

export interface EmbedLicenseStatus {
  state: LicenseState;
  /** Feature set actually running. 'open' = open-core plugins only. */
  edition: 'pro' | 'open';
  licensee?: string;
  /** ISO-8601. */
  expiresAt?: string;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * 'host' = caused by an in-page API call, 'remote' = caused by a command from the relay channel,
 * 'user' = caused by interaction inside KeepTrack. Remote commands obey host ownership rules.
 */
export type ChangeSource = 'host' | 'remote' | 'user';

export interface EmbedEventMap {
  ready: { version: string; license: EmbedLicenseStatus };
  selectionChanged: { object: EmbedObjectInfo | null; source: ChangeSource };
  hover: { object: EmbedObjectInfo | null };
  timeChanged: EmbedTimeState & { source: ChangeSource };
  /** The user tried to change a host-owned domain. `value` is what they asked for. */
  changeRequested: { domain: 'selection'; value: EmbedObjectInfo | null } | { domain: 'time'; value: Partial<EmbedTimeState> } | { domain: EmbedDomain; value: unknown };
  error: { code: EmbedErrorCode; message: string };
  remoteStatus: { state: 'connecting' | 'connected' | 'disconnected' | 'rejected'; detail?: string };
  /** Periodic positions while a stream is active (see setPositionStream). (1.2) */
  positions: { timeMs: number; objects: Array<{ hostId?: string; norad?: string; lla: EmbedPosition['lla'] }> };
}

export type EmbedEventName = keyof EmbedEventMap;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type EmbedErrorCode =
  | 'NOT_READY'
  | 'VERSION_MISMATCH'
  | 'DOMAIN_NOT_OWNED'
  | 'OBJECT_NOT_FOUND'
  | 'SENSOR_NOT_FOUND'
  | 'INVALID_TLE'
  | 'INVALID_ARGUMENT'
  | 'NO_FREE_SLOT'
  | 'UNKNOWN_COMMAND'
  // SDK startup failures (thrown by createKeepTrackEmbed before the engine exists)
  | 'WEBGL2_UNAVAILABLE'
  | 'CROSS_ORIGIN'
  | 'ASSETS_MISSING'
  | 'BOOT_TIMEOUT'
  | 'INTERNAL';

export class EmbedError extends Error {
  constructor(
    readonly code: EmbedErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'EmbedError';
  }
}

// ---------------------------------------------------------------------------
// The facade
// ---------------------------------------------------------------------------

/**
 * Installed in the KeepTrack window as `window.keepTrackEmbed`. Same-origin hosts call it directly
 * (synchronously where the signature allows); remote callers go through execute().
 *
 * Methods that mutate state throw EmbedError (or reject, for async ones). Getters return null for
 * unknown objects instead of throwing.
 */
export interface KeepTrackEmbedApi {
  readonly version: string;
  /** Resolves once the engine is running and boot objects are loaded. */
  whenReady(): Promise<void>;
  readonly isReady: boolean;
  getLicense(): EmbedLicenseStatus;

  // Selection and camera
  /**
   * Select an object (null deselects). Resolves true once the selection is live. Retries internally
   * while the propagation worker catches up after boot or after an upsert.
   */
  select(ref: ObjectRef | null): Promise<boolean>;
  getSelected(): EmbedObjectInfo | null;
  setCamera(options: EmbedCameraOptions): void;

  // Time
  getTime(): EmbedTimeState;
  /** ISO-8601 string or epoch ms. Preserves the current paused/playing state. */
  setTime(time: string | number): void;
  setRate(rate: number): void;
  pause(): void;
  play(): void;

  // Render parking (1.3)
  /**
   * Stop the render/update loop (cancels requestAnimationFrame) so a parked embed costs no CPU. Simulation
   * time keeps following the clock; no events or position streams fire while suspended.
   */
  suspend(): void;
  /** Restart a suspended loop; forces a canvas resize and a redraw. */
  resume(): void;

  // Catalog
  upsertObjects(objects: EmbedObject[]): EmbedUpsertResult[];
  /** Removes host objects. Catalog overrides revert to the catalog's own elements. */
  removeObjects(hostIds: string[]): void;
  getObject(ref: ObjectRef): EmbedObjectInfo | null;
  listHostObjects(): EmbedObjectInfo[];

  // Sensors
  upsertSensors(sensors: EmbedSensor[]): void;
  removeSensors(hostIds: string[]): void;
  /** Which host sensors are active (drawn, used for FOV and look angles). Empty array clears. */
  setActiveSensors(hostIds: string[]): void;

  // Overlays
  /** Returns an overlay id. */
  addOverlay(overlay: EmbedOverlay): string;
  removeOverlay(id: string): void;
  clearOverlays(): void;

  // Styling and tracks (1.2)
  /** null resets the object to the color scheme's default. */
  setObjectStyle(ref: ObjectRef, style: EmbedObjectStyle | null): void;
  /** 'host' = every host object. null removes all ground tracks. */
  setGroundTracks(refs: ObjectRef[] | 'host' | null, options?: EmbedGroundTrackOptions): void;

  // UI
  setUi(flags: Partial<EmbedUiFlags>): void;
  setLayers(layers: Partial<EmbedLayers>): void;
  /**
   * Emit `positions` events for the given objects ('host' = every host object) at `hz` (simulation-time
   * driven, max 10). null stops the stream. (1.2)
   */
  setPositionStream(stream: { refs: ObjectRef[] | 'host'; hz: number } | null): void;

  // Data out
  /** Defaults to the current simulation time. */
  getPosition(ref: ObjectRef, timeMs?: number): EmbedPosition | null;
  getLookAngles(sensorHostId: string, ref: ObjectRef, timeMs?: number): EmbedLookAngles | null;
  getAccessWindows(sensorHostId: string, ref: ObjectRef, startMs: number, endMs: number): EmbedAccessWindow[];
  /** PNG of the current frame. */
  screenshot(): Promise<Blob>;

  // Events
  /** Returns an unsubscribe function. */
  on<E extends EmbedEventName>(event: E, listener: (payload: EmbedEventMap[E]) => void): () => void;

  /** JSON command channel (used by the remote relay). Never throws; errors come back in the result. */
  execute(command: EmbedCommand): Promise<EmbedCommandResult>;
}

// ---------------------------------------------------------------------------
// JSON command channel
// ---------------------------------------------------------------------------

/** Facade methods callable through execute(). screenshot() returns a base64 PNG string here. */
export type EmbedCommandName = Exclude<keyof KeepTrackEmbedApi, 'version' | 'isReady' | 'whenReady' | 'on' | 'execute'>;

export interface EmbedCommand {
  /** Caller-chosen correlation id, echoed in the result. */
  id?: string;
  cmd: EmbedCommandName;
  /** Positional arguments, as for the facade method. */
  args?: unknown[];
}

export type EmbedCommandResult = { id?: string; ok: true; result: unknown } | { id?: string; ok: false; error: { code: EmbedErrorCode; message: string } };

/** Property the SDK sets on the <iframe> element before navigation; read by the engine via window.frameElement. */
export const EMBED_CONFIG_PROPERTY = '__keepTrackEmbedConfig';
/** CustomEvent dispatched on the <iframe> element (detail: EmbedEventMap['ready']) when the facade is ready. */
export const EMBED_READY_EVENT = 'keeptrack-embed:ready';

// ---------------------------------------------------------------------------
// Remote relay wire protocol (WebSocket, one JSON object per text frame)
// ---------------------------------------------------------------------------

export const RELAY_PROTOCOL_VERSION = 1;

/** First frame on every connection. The relay closes the socket (code 4401) on a bad token. */
export interface RelayHello {
  type: 'hello';
  protocol: number;
  role: 'engine' | 'client';
  session: string;
  token?: string;
  /** Engine only: EMBED_API_VERSION of the engine. */
  apiVersion?: string;
}

/** Relay reply to a hello. `engineOnline` tells a client whether the session currently has an engine. */
export interface RelayWelcome {
  type: 'welcome';
  protocol: number;
  session: string;
  engineOnline: boolean;
  apiVersion?: string;
}

/** Client -> relay -> engine. The relay prefixes `id` with a per-client tag and restores it on the way back. */
export interface RelayCommand {
  type: 'command';
  command: EmbedCommand;
}

/** Engine -> relay -> the client that sent the command. */
export interface RelayResult {
  type: 'result';
  result: EmbedCommandResult;
}

/** Engine -> relay -> every client subscribed to the event (all events by default). */
export interface RelayEvent {
  type: 'event';
  name: EmbedEventName;
  payload: unknown;
}

/** Client -> relay: limit which events this client receives. Empty array = none. */
export interface RelaySubscribe {
  type: 'subscribe';
  events: EmbedEventName[] | '*';
}

/** Relay -> client when the session's engine connects or drops. */
export interface RelayEngineStatus {
  type: 'engine-status';
  online: boolean;
  apiVersion?: string;
}

export type RelayMessage = RelayHello | RelayWelcome | RelayCommand | RelayResult | RelayEvent | RelaySubscribe | RelayEngineStatus;
