/**
 * Worker-side activation of the Astro Standards SGP4 wasm backend.
 *
 * Any worker that propagates with `Sgp4` can opt in by adding two lines to
 * the top of its message handler:
 *
 * ```ts
 * if (isSgp4WasmBackendMsg(m.data)) {
 *   handleSgp4WasmBackendMsg(m.data);
 *
 *   return;
 * }
 * ```
 */

import { Sgp4, Sgp4Wasm, Sgp4XpWasm } from '@ootk/src/main';
import { Sgp4WasmBackendMsgData } from './sgp4-wasm-backend-messages';

export { isSgp4WasmBackendMsg, SGP4_WASM_BACKEND_MSG_TYPE } from './sgp4-wasm-backend-messages';

/**
 * Loads the configured wasm build inside this worker and routes all `Sgp4`
 * propagation in the worker's context through it. Fire-and-forget: satKeys
 * attach to satrecs lazily, so propagation seamlessly upgrades from the
 * TypeScript implementation once the runtime is ready. On failure (e.g. the
 * license-restricted artifacts are not deployed) the TypeScript
 * implementation stays active.
 */
export const handleSgp4WasmBackendMsg = (data: Sgp4WasmBackendMsgData): void => {
  const instance = data.backend === 'sgp4-xp-wasm' ? new Sgp4XpWasm() : new Sgp4Wasm();

  instance
    .load({ glue: data.glueUrl, wasm: data.wasmUrl })
    .then((wasm) => {
      Sgp4.useWasmBackend(wasm);
      // Visible in DevTools (verbose) so profiling sessions can confirm the backend is live
      // eslint-disable-next-line no-console
      console.debug(`[sgp4-wasm] ${data.backend} backend active in ${self.location?.pathname ?? 'worker'}`);

      /*
       * One-shot coverage reports after the catalog has cycled: a nonzero
       * fallback count means those satellites still propagate in TypeScript
       * (they show up as TS SGP4 frames, e.g. dspace_, in a profiler).
       */
      for (const delayMs of [10_000, 30_000]) {
        setTimeout(() => {
          const stats = Sgp4.wasmBackendStats;

          // eslint-disable-next-line no-console
          console.debug(`[sgp4-wasm] ${self.location?.pathname ?? 'worker'} t+${delayMs / 1000}s: ${stats.attached} TLEs on wasm, ${stats.fallback} on TypeScript fallback`);
        }, delayMs);
      }
    })
    .catch((error: Error) => {
      // eslint-disable-next-line no-console
      console.warn(`[sgp4-wasm] Worker falling back to the TypeScript SGP4: ${error.message}`);
    });
};
