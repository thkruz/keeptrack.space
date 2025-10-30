import { ServiceLocator } from '@app/engine/core/service-locator';
import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import { OrbitCruncherInMsgs, OrbitCruncherMsgType, OrbitCruncherOutMsgPoints, OrbitCruncherOutMsgReady } from '@app/webworker/orbit-cruncher-interfaces';

export class OrbitCruncherThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/orbitCruncher.js';

  protected onMessage(m: MessageEvent<OrbitCruncherOutMsgPoints | OrbitCruncherOutMsgReady>) {
    const { data } = m;

    if (!data) {
      return;
    }

    switch (data.type) {
      case OrbitCruncherMsgType.RESPONSE_READY:
        this.handleResponseReady_();
        break;
      case OrbitCruncherMsgType.RESPONSE_DATA:
        this.handleResponseData_(data);
        break;
      default:
        throw new Error('Unknown message type from Orbit Cruncher Worker');
    }

  }

  postMessage(message: OrbitCruncherInMsgs) {
    if (this.worker_) {
      this.worker_.postMessage(message);
    }
  }

  private handleResponseReady_() {
    this.isReady_ = true;
  }

  private handleResponseData_(data: OrbitCruncherOutMsgPoints) {
    const satId = data.satId;
    const cachedOrbitData = ServiceLocator.getOrbitManager().orbitCache.get(satId);
    let pointsOut: Float32Array;

    if (!cachedOrbitData) {
      pointsOut = new Float32Array(data.pointsOut);

      ServiceLocator.getOrbitManager().orbitCache.set(satId, pointsOut);
    } else {
      cachedOrbitData.set(data.pointsOut);
      pointsOut = cachedOrbitData;
    }


    const gl = ServiceLocator.getRenderer().gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, ServiceLocator.getOrbitManager().glBuffers_[satId]);
    gl.bufferData(gl.ARRAY_BUFFER, pointsOut, gl.DYNAMIC_DRAW);

    ServiceLocator.getOrbitManager().inProgress_[satId] = false;
  }
}

