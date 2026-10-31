import { checkApiVersion, resolveUiFlags } from './embed-boot';
import { EmbedCatalog } from './embed-catalog';
import { EmbedContext } from './embed-context';
import { EmbedData } from './embed-data';
import type { EmbedEngine } from './embed-engine';
import { EmbedOverlays } from './embed-overlays';
import { EmbedRemote } from './embed-remote';
import { EmbedSelection } from './embed-selection';
import { EmbedSensors } from './embed-sensors';
import { EmbedTime } from './embed-time';
import {
  EMBED_API_VERSION,
  EMBED_READY_EVENT,
  type EmbedAccessWindow,
  type EmbedCameraOptions,
  type EmbedCommand,
  type EmbedCommandName,
  type EmbedCommandResult,
  type EmbedConfig,
  EmbedError,
  type EmbedErrorCode,
  type EmbedEventMap,
  type EmbedEventName,
  type EmbedLicenseStatus,
  type EmbedLookAngles,
  type EmbedObject,
  type EmbedObjectInfo,
  type EmbedOverlay,
  type EmbedPosition,
  type EmbedSensor,
  type EmbedTimeState,
  type EmbedUiFlags,
  type EmbedUpsertResult,
  type KeepTrackEmbedApi,
  type ObjectRef,
} from './embed-types';
import { applyEmbedUiCss, EmbedUi } from './embed-ui';

const READY_POLL_MS = 100;

/** Commands callable through execute(). Anything else is UNKNOWN_COMMAND. */
const COMMANDS: readonly EmbedCommandName[] = [
  'getLicense',
  'select',
  'getSelected',
  'setCamera',
  'getTime',
  'setTime',
  'setRate',
  'pause',
  'play',
  'upsertObjects',
  'removeObjects',
  'getObject',
  'listHostObjects',
  'upsertSensors',
  'removeSensors',
  'setActiveSensors',
  'addOverlay',
  'removeOverlay',
  'clearOverlays',
  'setUi',
  'getPosition',
  'getLookAngles',
  'getAccessWindows',
  'screenshot',
];

/** Commands usable before the engine is ready. */
const PRE_READY_COMMANDS = new Set<EmbedCommandName>(['getLicense']);

function toErrorShape(e: unknown): { code: EmbedErrorCode; message: string } {
  if (e instanceof EmbedError) {
    return { code: e.code, message: e.message };
  }

  return { code: 'INTERNAL', message: e instanceof Error ? e.message : String(e) };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';

  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }

  return btoa(binary);
}

export interface EmbedApiOptions {
  config?: EmbedConfig | null;
  /** Element receiving the ready CustomEvent. Defaults to window.frameElement. */
  readyTarget?: EventTarget | null;
  /** Verified license status (main.ts resolves it before boot). Defaults to missing. */
  license?: EmbedLicenseStatus;
}

/** The facade installed as window.keepTrackEmbed. Domain logic lives in the embed-*.ts modules. */
export class KeepTrackEmbed implements KeepTrackEmbedApi {
  readonly version = EMBED_API_VERSION;

  private ready_ = false;
  private readonly config_: EmbedConfig;
  private readonly ctx_: EmbedContext;
  private readonly catalog_: EmbedCatalog;
  private readonly selection_: EmbedSelection;
  private readonly time_: EmbedTime;
  private readonly readyPromise_: Promise<void>;
  private resolveReady_!: () => void;
  private pollTimer_: ReturnType<typeof setInterval> | null = null;
  private readonly sensors_: EmbedSensors;
  private readonly overlays_: EmbedOverlays;
  private readonly data_: EmbedData;
  private readonly ui_: EmbedUi;
  private remote_: EmbedRemote | null = null;

  constructor(
    private readonly engine_: EmbedEngine,
    private readonly options_: EmbedApiOptions = {}
  ) {
    this.config_ = options_.config ?? {};
    this.ctx_ = new EmbedContext(this.config_.ownership);
    this.catalog_ = new EmbedCatalog(engine_);
    this.selection_ = new EmbedSelection(this.ctx_, engine_, this.catalog_);
    this.time_ = new EmbedTime(this.ctx_, engine_);
    this.sensors_ = new EmbedSensors(this.ctx_, engine_);
    this.overlays_ = new EmbedOverlays(engine_, this.catalog_, this.sensors_);
    this.data_ = new EmbedData(engine_, this.catalog_, this.sensors_);
    this.ui_ = new EmbedUi(this.ctx_, engine_);
    this.readyPromise_ = new Promise<void>((resolve) => {
      this.resolveReady_ = resolve;
    });
    applyEmbedUiCss(resolveUiFlags(this.config_), this.ui_.hidden);
  }

  /** Begin waiting for the engine. Idempotent. */
  start(): void {
    if (this.pollTimer_ !== null || this.ready_) {
      return;
    }
    if (this.engine_.isEngineReady()) {
      this.becomeReady_();

      return;
    }
    this.pollTimer_ = setInterval(() => {
      if (this.engine_.isEngineReady()) {
        this.becomeReady_();
      }
    }, READY_POLL_MS);
  }

  private becomeReady_(): void {
    if (this.pollTimer_ !== null) {
      clearInterval(this.pollTimer_);
      this.pollTimer_ = null;
    }
    this.selection_.start();
    this.time_.start();
    this.overlays_.start();

    const mismatch = checkApiVersion(this.config_);
    const { ownership, time, catalog } = this.config_;

    this.ctx_.runAsHost(() => {
      if (catalog?.objects?.length) {
        this.catalog_.upsert(catalog.objects);
      }
      if (time?.start !== undefined) {
        this.time_.setTime(time.start);
      }
      if (typeof time?.rate === 'number') {
        this.time_.setRate(time.rate);
      }
    });

    // Guards go in after boot writes so they never see them as user actions
    this.engine_.installGuards({
      selection: ownership?.selection === 'host' ? (id) => this.selection_.reportUserAttempt(id) : undefined,
      time: ownership?.time === 'host' ? (change) => this.time_.reportUserAttempt(change) : undefined,
    });

    this.ready_ = true;
    const readyPayload: EmbedEventMap['ready'] = { version: this.version, license: this.getLicense() };

    this.dispatchReadyEvent_(readyPayload);
    this.ctx_.emit('ready', readyPayload);
    this.resolveReady_();
    this.startRemote_();
    if (mismatch) {
      // Deferred so hosts that subscribe in their whenReady() continuation still receive it
      setTimeout(() => {
        this.ctx_.emit('error', {
          code: mismatch,
          message: `Host requested embed API ${String(this.config_.apiVersion)}; this build provides ${this.version}.`,
        });
      }, 0);
    }
  }

  /** Dial the relay when the host configured one. There is deliberately no other way to enable it. */
  private startRemote_(): void {
    if (!this.config_.remote) {
      return;
    }
    this.remote_ = new EmbedRemote(this.config_.remote, {
      execute: (command) => this.execute(command, 'remote'),
      on: (event, listener) => this.on(event, listener),
      emitStatus: (status) => this.ctx_.emit('remoteStatus', status),
      apiVersion: this.version,
    });
    this.remote_.start();
  }

  private dispatchReadyEvent_(payload: EmbedEventMap['ready']): void {
    try {
      const target = this.options_.readyTarget !== undefined ? this.options_.readyTarget : (window.frameElement as EventTarget | null);

      target?.dispatchEvent(new CustomEvent(EMBED_READY_EVENT, { detail: payload }));
    } catch {
      // Cross-origin parent: no element to notify
    }
  }

  private requireReady_(): void {
    if (!this.ready_) {
      throw new EmbedError('NOT_READY', 'KeepTrack is not ready yet; await whenReady() first.');
    }
  }

  // ---- Lifecycle ----------------------------------------------------------

  whenReady(): Promise<void> {
    return this.readyPromise_;
  }

  get isReady(): boolean {
    return this.ready_;
  }

  /** The license status verified before boot (see embed-install). */
  getLicense(): EmbedLicenseStatus {
    return this.options_.license ?? { state: 'missing', edition: __IS_PRO__ ? 'pro' : 'open' };
  }

  on<E extends EmbedEventName>(event: E, listener: (payload: EmbedEventMap[E]) => void): () => void {
    return this.ctx_.on(event, listener);
  }

  // ---- Selection and camera ----------------------------------------------

  select(ref: ObjectRef | null): Promise<boolean> {
    try {
      this.requireReady_();
      this.ctx_.assertHostMaySet('selection');
    } catch (e) {
      return Promise.reject(e);
    }

    return this.selection_.select(ref);
  }

  getSelected(): EmbedObjectInfo | null {
    this.requireReady_();

    return this.selection_.getSelected();
  }

  setCamera(options: EmbedCameraOptions): void {
    this.requireReady_();
    this.ctx_.assertHostMaySet('camera');
    this.selection_.setCamera(options);
  }

  // ---- Time ---------------------------------------------------------------

  getTime(): EmbedTimeState {
    this.requireReady_();

    return this.time_.getTime();
  }

  setTime(time: string | number): void {
    this.requireReady_();
    this.ctx_.assertHostMaySet('time');
    this.time_.setTime(time);
  }

  setRate(rate: number): void {
    this.requireReady_();
    this.ctx_.assertHostMaySet('time');
    this.time_.setRate(rate);
  }

  pause(): void {
    this.requireReady_();
    this.ctx_.assertHostMaySet('time');
    this.time_.pause();
  }

  play(): void {
    this.requireReady_();
    this.ctx_.assertHostMaySet('time');
    this.time_.play();
  }

  // ---- Catalog ------------------------------------------------------------

  upsertObjects(objects: EmbedObject[]): EmbedUpsertResult[] {
    this.requireReady_();
    this.ctx_.assertHostMaySet('catalog');

    return this.ctx_.runAsHost(() => this.catalog_.upsert(objects));
  }

  removeObjects(hostIds: string[]): void {
    this.requireReady_();
    this.ctx_.assertHostMaySet('catalog');
    if (!Array.isArray(hostIds)) {
      throw new EmbedError('INVALID_ARGUMENT', 'removeObjects expects an array of hostIds');
    }
    const freed = this.catalog_.remove(hostIds);

    this.selection_.deselectIfSelected(freed);
    this.overlays_.dropForObjectIds(freed);
  }

  getObject(ref: ObjectRef): EmbedObjectInfo | null {
    this.requireReady_();

    return this.catalog_.getObject(ref);
  }

  listHostObjects(): EmbedObjectInfo[] {
    this.requireReady_();

    return this.catalog_.listHostObjects();
  }

  // ---- Sensors ------------------------------------------------------------

  upsertSensors(sensors: EmbedSensor[]): void {
    this.requireReady_();
    this.ctx_.assertHostMaySet('sensors');
    this.sensors_.upsert(sensors);
    this.overlays_.reconcile();
  }

  removeSensors(hostIds: string[]): void {
    this.requireReady_();
    this.ctx_.assertHostMaySet('sensors');
    this.overlays_.dropForSensors(this.sensors_.remove(hostIds));
  }

  setActiveSensors(hostIds: string[]): void {
    this.requireReady_();
    this.ctx_.assertHostMaySet('sensors');
    this.sensors_.setActive(hostIds);
    this.overlays_.reconcile();
  }

  // ---- Overlays -----------------------------------------------------------

  addOverlay(overlay: EmbedOverlay): string {
    this.requireReady_();

    return this.overlays_.add(overlay);
  }

  removeOverlay(id: string): void {
    this.requireReady_();
    this.overlays_.remove(id);
  }

  clearOverlays(): void {
    this.requireReady_();
    this.overlays_.clear();
  }

  // ---- UI -----------------------------------------------------------------

  setUi(flags: Partial<EmbedUiFlags>): void {
    this.requireReady_();
    this.ui_.apply(flags);
  }

  // ---- Data out -----------------------------------------------------------

  getPosition(ref: ObjectRef, timeMs?: number): EmbedPosition | null {
    this.requireReady_();

    return this.data_.getPosition(ref, timeMs);
  }

  getLookAngles(sensorHostId: string, ref: ObjectRef, timeMs?: number): EmbedLookAngles | null {
    this.requireReady_();

    return this.data_.getLookAngles(sensorHostId, ref, timeMs);
  }

  getAccessWindows(sensorHostId: string, ref: ObjectRef, startMs: number, endMs: number): EmbedAccessWindow[] {
    this.requireReady_();

    return this.data_.getAccessWindows(sensorHostId, ref, startMs, endMs);
  }

  screenshot(): Promise<Blob> {
    try {
      this.requireReady_();
    } catch (e) {
      return Promise.reject(e);
    }

    return this.data_.screenshot();
  }

  // ---- JSON channel -------------------------------------------------------

  /** `source` is 'host' for in-page callers and 'remote' for relay commands (attributes the resulting *Changed events). */
  async execute(command: EmbedCommand, source: 'host' | 'remote' = 'host'): Promise<EmbedCommandResult> {
    const id = command?.id;

    try {
      const cmd = command?.cmd;

      if (typeof cmd !== 'string' || !COMMANDS.includes(cmd)) {
        throw new EmbedError('UNKNOWN_COMMAND', `Unknown command '${String(cmd)}'`);
      }
      if (!this.ready_ && !PRE_READY_COMMANDS.has(cmd)) {
        throw new EmbedError('NOT_READY', 'KeepTrack is not ready yet.');
      }
      const args = Array.isArray(command.args) ? command.args : [];
      const method = (this as unknown as Record<string, (...a: unknown[]) => unknown>)[cmd];
      let result = await (source === 'remote' ? this.ctx_.runAsRemote(() => method.apply(this, args)) : method.apply(this, args));

      if (typeof Blob !== 'undefined' && result instanceof Blob) {
        result = await blobToBase64(result);
      }

      return { id, ok: true, result: result === undefined ? null : result };
    } catch (e) {
      return { id, ok: false, error: toErrorShape(e) };
    }
  }
}
