/**
 * Neighborhood History Web Worker
 *
 * Runs the pure OEM -> longitude/inclination conversion
 * (src/plugins-pro/neighborhood-history/neighborhood-history-core.ts) off the
 * main thread. The main thread parses OEM text into RawDataBlocks first (the
 * OemParser is DOM-bound and not worker-safe); this worker only reconstructs
 * J2000 states and runs the per-point trig, streaming one file's datasets back
 * at a time so a large batch never blocks the render loop.
 */

/* eslint-disable no-await-in-loop, no-promise-executor-return */

import { buildDatasets } from '@app/plugins-pro/neighborhood-history/neighborhood-history-core';
import {
  NhWorkerMsgType,
  NhWorkerOutMsgType,
  type NhWorkerInMsg,
} from './neighborhood-history-messages';

let cancelledRunId = -1;

/** Handle incoming messages from the main thread. */
onmessage = async function onmessage(event: MessageEvent<NhWorkerInMsg>) {
  const msg = event.data;

  if (msg.typ === NhWorkerMsgType.CANCEL) {
    cancelledRunId = msg.runId;

    return;
  }

  if (msg.typ !== NhWorkerMsgType.START) {
    return;
  }

  const { runId } = msg;

  try {
    const total = msg.files.length;

    for (let i = 0; i < total; i++) {
      if (cancelledRunId === runId) {
        return;
      }

      const file = msg.files[i];
      let datasets = [];

      try {
        datasets = buildDatasets(file.blocks);
      } catch {
        // A single bad block shouldn't sink the batch; emit no datasets for it.
      }

      postMessage({ typ: NhWorkerOutMsgType.CHUNK, runId, fileId: file.fileId, datasets });
      postMessage({ typ: NhWorkerOutMsgType.PROGRESS, runId, processed: i + 1, total });

      // Yield so a CANCEL message can be received between files.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    if (cancelledRunId === runId) {
      return;
    }

    postMessage({ typ: NhWorkerOutMsgType.COMPLETE, runId });
  } catch (e) {
    postMessage({ typ: NhWorkerOutMsgType.ERROR, runId, message: e instanceof Error ? e.message : String(e) });
  }
};

// Signal ready
postMessage('ready');
