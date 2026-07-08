import { settingsManager } from '@app/settings/settings';
import { Sgp4WasmBackendMsgData, SGP4_WASM_BACKEND_MSG_TYPE } from '@app/webworker/shared/sgp4-wasm-backend-messages';
import { errorManagerInstance } from '../utils/errorManager';
import { isThisNode } from '../utils/isThisNode';

export abstract class WebWorkerThreadManager {
  abstract readonly WEB_WORKER_CODE: string;
  protected worker_: Worker | null = null;
  protected isReady_ = false;

  get worker(): Worker | null {
    return this.worker_;
  }

  constructor(threadsRegistry: WebWorkerThreadManager[]) {
    threadsRegistry.push(this);
  }

  init(workerStub?: Worker, workerScriptUrl: string = this.WEB_WORKER_CODE) {
    if (isThisNode()) { // See if we are running jest right now for testing
      this.initNodeConfig_(workerStub, workerScriptUrl);

      return; // Exit early in Node environment
    }
    // Verify browser supports workers
    this.checkWebWorkerSupport_();

    workerScriptUrl = `./${this.WEB_WORKER_CODE}`;

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
          'copies of chrome are running when you start it.',
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
    if (workerStub) { // If we have a stub use it
      this.worker_ = workerStub;
    } else { // Otherwise create a mock worker for testing
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
