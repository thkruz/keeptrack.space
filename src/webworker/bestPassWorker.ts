/**
 * Best Pass Web Worker
 *
 * Runs the pure best-pass calculator (src/plugins/best-pass/best-pass-calculator.ts)
 * off the main thread. The calculator takes all application state through injected
 * dependencies, so here we supply worker-side implementations of getRae,
 * checkIsInView, and the sun position - faithfully mirroring SatMath - and stream
 * one satellite's passes back at a time.
 */

/* eslint-disable no-await-in-loop, no-promise-executor-return */

import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { BestPassDeps, findPassesForSat } from '@app/plugins/best-pass/best-pass-calculator';
import { Kilometers, Sgp4 } from '@ootk/src/main';
import { type BpWorkerInMsg, BpWorkerMsgType, BpWorkerOutMsgType } from './best-pass-messages';
import { workerCheckIsInView, workerGetRae } from './shared/pass-worker-helpers';
import { handleSgp4WasmBackendMsg, isSgp4WasmBackendMsg } from './shared/sgp4-wasm-backend-handler';

let cancelledRunId = -1;

/** Handle incoming messages from the main thread. */
onmessage = async function onmessage(event: MessageEvent<BpWorkerInMsg>) {
  const msg = event.data;

  if (isSgp4WasmBackendMsg(msg)) {
    handleSgp4WasmBackendMsg(msg);

    return;
  }

  if (msg.typ === BpWorkerMsgType.CANCEL) {
    cancelledRunId = msg.runId;

    return;
  }

  if (msg.typ !== BpWorkerMsgType.START) {
    return;
  }

  const { runId } = msg;

  try {
    const sensors = msg.sensors.filter((s) => s).map((s) => new DetailedSensor(s as ConstructorParameters<typeof DetailedSensor>[0]));

    const deps: BestPassDeps = {
      baseTimeMs: msg.baseTimeMs,
      getRae: workerGetRae,
      checkIsInView: workerCheckIsInView,
      sunEciKm: () => ({
        x: msg.sunEci.x as Kilometers,
        y: msg.sunEci.y as Kilometers,
        z: msg.sunEci.z as Kilometers,
      }),
    };
    const options = { lengthDays: msg.lengthDays, intervalSec: msg.intervalSec, maxResults: msg.maxResults };

    let truncated = false;
    const total = msg.sats.length;

    for (let i = 0; i < total; i++) {
      if (cancelledRunId === runId) {
        return;
      }

      const sat = msg.sats[i];
      const satPasses = [];

      try {
        const satrec = Sgp4.createSatrec(sat.tle1, sat.tle2);

        for (let s = 0; s < sensors.length; s++) {
          const result = findPassesForSat(sat.sccNum, satrec, sensors[s], options, deps, msg.sensorNames[s] ?? null);

          satPasses.push(...result.passes);
          truncated = truncated || result.truncated;
        }
      } catch {
        // Skip satellites that fail to propagate (bad TLE, decayed); keep going.
      }

      postMessage({ typ: BpWorkerOutMsgType.CHUNK, runId, passes: satPasses });
      postMessage({ typ: BpWorkerOutMsgType.PROGRESS, runId, processed: i + 1, total });

      // Yield so a CANCEL message can be received between satellites.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    if (cancelledRunId === runId) {
      return;
    }

    postMessage({ typ: BpWorkerOutMsgType.COMPLETE, runId, truncated });
  } catch (e) {
    postMessage({ typ: BpWorkerOutMsgType.ERROR, runId, message: e instanceof Error ? e.message : String(e) });
  }
};

// Signal ready
postMessage('ready');
