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

  postMessage(message) {
    if (this.worker_) {
      this.worker_.postMessage(message);
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
