/**
 * Message contract for configuring the Astro Standards SGP4 wasm backend in
 * web workers. Kept dependency-free so the main-thread broadcaster
 * (WebWorkerThreadManager) can import it without pulling in ootk.
 *
 * The `typ` is a string sentinel on purpose: worker message enums are
 * numeric, so this cannot collide with any worker's own message types and is
 * safely ignored by workers that do not opt in.
 */

export const SGP4_WASM_BACKEND_MSG_TYPE = 'SGP4_WASM_BACKEND';

export interface Sgp4WasmBackendMsgData {
  typ: typeof SGP4_WASM_BACKEND_MSG_TYPE;
  backend: 'sgp4-wasm' | 'sgp4-xp-wasm';
  glueUrl: string;
  wasmUrl: string;
}

/**
 * Type guard for the backend configuration message.
 */
export const isSgp4WasmBackendMsg = (data: unknown): data is Sgp4WasmBackendMsgData => (data as { typ?: unknown })?.typ === SGP4_WASM_BACKEND_MSG_TYPE;
