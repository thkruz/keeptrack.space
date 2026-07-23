import { settingsManager } from '@app/settings/settings';
import { SGP4_WASM_BACKEND_MSG_TYPE, Sgp4WasmBackendMsgData } from '@app/webworker/shared/sgp4-wasm-backend-messages';
import { errorManagerInstance } from '../utils/errorManager';
import { isThisNode } from '../utils/isThisNode';

/**
 * sessionStorage key for a one-shot worker cache-bust token. Set by the boot
 * self-heal (`KeepTrack.postStart_`) when workers stall, and appended to worker
 * URLs here so a stale cached worker script is force-refetched on reload.
 */
export const WORKER_CACHE_BUST_KEY = 'kt-worker-cache-bust';

export abstract class WebWorkerThreadManager {
  abstract readonly WEB_WORKER_CODE: string;
  protected worker_: Worker | null = null;
  protected isReady_ = false;
  protected isDisabled_ = false;

  get worker(): Worker | null {
    return this.worker_;
  }

  /**
   * Whether boot must WAIT for this worker before the app becomes interactive.
   *
   * Essential workers (position/color crunchers — there are no dots without them)
   * gate boot: if one never signals ready, boot self-heals with a cache-bust
   * reload and, failing that, shows the boot-failure screen.
   *
   * OPTIONAL workers render a non-critical feature (e.g. the orbit-line cruncher).
   * If one stalls, the boot watchdog drops it and boots DEGRADED rather than
   * hanging the whole app forever - the app is fully usable without orbit lines.
   * Subclasses override this to opt out of the boot gate.
   */
  get isEssential(): boolean {
    return true;
  }

  /** True once the boot watchdog has given up on this (optional) worker and dropped its feature. */
  get isDisabled(): boolean {
    return this.isDisabled_;
  }

  /**
   * Permanently drop a stalled OPTIONAL worker so the app can boot degraded.
   * Terminates the (hung) worker to free its resources and, because every
   * postMessage() is guarded on `worker_`, turns all subsequent sends into
   * silent no-ops. Called by the boot watchdog (`KeepTrack.postStart_`) when an
   * optional worker never signals ready within its grace window.
   */
  disableDueToStall(): void {
    this.isDisabled_ = true;
    this.terminate();
  }

  /**
   * Exclude this OPTIONAL worker from the boot gate because the app DELIBERATELY
   * did not start it yet (e.g. orbit lines are turned off, so the orbit cruncher
   * stays deferred until the user enables them). Without this, a registered-but-
   * never-`init()`-ed worker would hang the boot gate forever - the exact cause of
   * the `drawOrbits:false` boot hang. Unlike disableDueToStall() it terminates
   * nothing (there is no worker yet); `init()` clears the flag when the worker is
   * later started on demand.
   */
  skipBootGate(): void {
    this.isDisabled_ = true;
  }

  constructor(threadsRegistry: WebWorkerThreadManager[]) {
    threadsRegistry.push(this);
  }

  init(workerStub?: Worker, workerScriptUrl: string = this.WEB_WORKER_CODE) {
    // Starting the worker re-arms it for the boot gate: clear any prior
    // skipBootGate() marker set while it was deliberately deferred (e.g. orbit
    // lines were off and the user just turned them on).
    this.isDisabled_ = false;

    if (isThisNode()) {
      // See if we are running jest right now for testing
      this.initNodeConfig_(workerStub, workerScriptUrl);

      return; // Exit early in Node environment
    }
    // Verify browser supports workers
    this.checkWebWorkerSupport_();

    workerScriptUrl = WebWorkerThreadManager.buildWorkerUrl_(this.WEB_WORKER_CODE);

    try {
      this.worker_ = workerStub ?? new Worker(workerScriptUrl);

      if (workerStub) {
        this.isReady_ = true;

        return;
      }

      this.worker_.onmessage = this.onMessage.bind(this);
      this.sendSgp4WasmBackendConfig_();
      this.worker_.onerror = (event: ErrorEvent) => {
        // A cross-origin/opaque worker surfaces an onerror with no usable diagnostics: null error,
        // empty message, empty filename. There's nothing to act on, so flag it as opaque — errorManager
        // then suppresses the toast/auto-file and telemetry skips the bug-filing POST (false positives).
        const isOpaqueEvent = !event.error && (!event.message || event.message.trim() === '') && !event.filename;

        errorManagerInstance.reportEvent({
          error: event.error,
          funcName: `Worker[${this.WEB_WORKER_CODE}]`,
          message: event.message,
          source: event.filename,
          line: event.lineno,
          col: event.colno,
          isOpaqueEvent,
        });
      };
    } catch (error) {
      // If you are trying to run this off the desktop you might have forgotten --allow-file-access-from-files
      if (window.location.href.startsWith('file://')) {
        throw new Error(
          'Critical Error: You need to allow access to files from your computer! Ensure "--allow-file-access-from-files" is added to your chrome shortcut and that no other' +
            'copies of chrome are running when you start it.'
        );
      } else {
        throw new Error(error);
      }
    }
  }

  /**
   * Broadcasts the configured Astro Standards SGP4 wasm backend to the fresh
   * worker (no-op for the default 'sgp4' backend). Workers that propagate
   * with Sgp4 opt in via the shared handler in
   * webworker/shared/sgp4-wasm-backend-handler.ts; all others ignore the
   * message (its string `typ` cannot collide with numeric message enums).
   */
  private sendSgp4WasmBackendConfig_(): void {
    const backend = settingsManager.propagatorBackend;

    if (backend !== 'sgp4-wasm' && backend !== 'sgp4-xp-wasm') {
      return;
    }

    const baseUrl = `${settingsManager.installDirectory}wasm/sgp4prop/`;
    const isXp = backend === 'sgp4-xp-wasm';
    const msg: Sgp4WasmBackendMsgData = {
      typ: SGP4_WASM_BACKEND_MSG_TYPE,
      backend,
      glueUrl: `${baseUrl}${isXp ? 'Sgp4Prop.xp.js' : 'Sgp4Prop.js'}`,
      wasmUrl: `${baseUrl}${isXp ? 'Sgp4Prop.xp.wasm' : 'Sgp4Prop.wasm'}`,
    };

    this.postMessage(msg);
  }

  protected initNodeConfig_(workerStub: Worker | undefined, workerScriptUrl: string) {
    if (workerStub) {
      // If we have a stub use it
      this.worker_ = workerStub;
    } else {
      // Otherwise create a mock worker for testing
      this.worker_ = {
        postMessage: () => {
          // Mock implementation for testing
        },
        terminate: () => {
          // Mock implementation for testing
        },
        addEventListener: () => {
          // Mock implementation for testing
        },
        removeEventListener: () => {
          // Mock implementation for testing
        },
      } as unknown as Worker;
      this.isReady_ = true;
    }

    return workerScriptUrl;
  }

  protected checkWebWorkerSupport_() {
    if (typeof Worker === 'undefined') {
      throw new Error('Your browser does not support web workers.');
    }
  }

  /**
   * Build the worker script URL with cache-busting. Worker scripts load by a
   * STABLE name (e.g. js/orbitCruncher.js), so without a version token a browser
   * (or the prod service worker) can keep serving a stale/broken cached copy
   * across builds - the worker then never posts 'ready' and the app hangs at
   * "Building 3D Models…". `__VERSION_DATE__` (a per-build timestamp) makes every
   * build's worker a distinct URL, so a rebuild/deploy always refetches fresh; an
   * optional runtime token (set by the boot self-heal in KeepTrack.postStart_)
   * forces a fresh fetch even within the same build.
   */
  private static buildWorkerUrl_(code: string): string {
    let url = `./${code}?v=${encodeURIComponent(__VERSION_DATE__)}`;

    try {
      const bust = globalThis.sessionStorage?.getItem(WORKER_CACHE_BUST_KEY);

      if (bust) {
        url += `&cb=${encodeURIComponent(bust)}`;
      }
    } catch {
      // sessionStorage can throw in locked-down/private contexts; the version token alone is enough.
    }

    return url;
  }

  protected onMessage(event: MessageEvent) {
    if (event.data === 'ready') {
      this.isReady_ = true;
    }
    // Handle other messages as needed
  }

  postMessage(message, transfer: Transferable[] = []) {
    if (this.worker_) {
      this.worker_.postMessage(message, transfer);
    }
  }

  terminate() {
    if (this.worker_) {
      this.worker_.terminate();
      this.worker_ = null;
    }
  }

  get isReady(): boolean {
    return this.isReady_;
  }
}
