import { ServiceLocator } from '@app/engine/core/service-locator';
import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import {
  OrbitCruncherInMsgs,
  OrbitCruncherMsgType,
  OrbitCruncherOutMsgPoints,
  OrbitDrawTypes,
} from '@app/webworker/orbit-cruncher-messages';
import { Degrees, Kilometers } from '@ootk/src/main';

export class OrbitCruncherThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/orbitCruncher.js';

  private currentSeqNum_ = 0;

  // ─── Typed Send Methods ─────────────────────────────────────────────

  sendInit(objData: string, numSegs: number, orbitFadeFactor?: number, numberOfOrbitsToDraw?: number): void {
    this.currentSeqNum_++;
    this.postMessage({
      typ: OrbitCruncherMsgType.INIT,
      objData,
      numSegs,
      orbitFadeFactor,
      numberOfOrbitsToDraw,
      seqNum: this.currentSeqNum_,
    });
  }

  sendSatelliteUpdate(
    id: number, simulationTime: number,
    isEcfOutput: boolean, isPolarViewEcf?: boolean, tle1?: string, tle2?: string,
  ): void {
    this.postMessage({
      typ: OrbitCruncherMsgType.SATELLITE_UPDATE,
      id,
      simulationTime,
      isEcfOutput,
      isPolarViewEcf,
      tle1,
      tle2,
      seqNum: this.currentSeqNum_,
    });
  }

  sendMissileUpdate(
    id: number, simulationTime: number,
    isEcfOutput: boolean, isPolarViewEcf?: boolean,
    latList?: Degrees[], lonList?: Degrees[], altList?: Kilometers[],
  ): void {
    this.postMessage({
      typ: OrbitCruncherMsgType.MISSILE_UPDATE,
      id,
      simulationTime,
      isEcfOutput,
      isPolarViewEcf,
      latList,
      lonList,
      altList,
      seqNum: this.currentSeqNum_,
    });
  }

  sendChangeOrbitType(orbitType: OrbitDrawTypes): void {
    this.postMessage({
      typ: OrbitCruncherMsgType.CHANGE_ORBIT_TYPE,
      orbitType,
    });
  }

  sendSettingsUpdate(numberOfOrbitsToDraw: number): void {
    this.postMessage({
      typ: OrbitCruncherMsgType.SETTINGS_UPDATE,
      numberOfOrbitsToDraw,
    });
  }

  // ─── Incoming Message Handler ───────────────────────────────────────

  protected onMessage(m: MessageEvent) {
    // Handle 'ready' string from base class pattern
    if (m.data === 'ready') {
      this.isReady_ = true;

      return;
    }

    const data = m.data as OrbitCruncherOutMsgPoints;

    if (!data || data.typ !== OrbitCruncherMsgType.RESPONSE_DATA) {
      return;
    }

    // Discard stale responses from before the last catalog swap.
    if (typeof data.seqNum === 'number' && data.seqNum < this.currentSeqNum_) {
      return;
    }

    this.handleResponseData_(data);
  }

  postMessage(message: OrbitCruncherInMsgs) {
    if (this.worker_) {
      this.worker_.postMessage(message);
    }
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
