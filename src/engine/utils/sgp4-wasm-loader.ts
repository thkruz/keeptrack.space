/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { settingsManager } from '@app/settings/settings';
import { Sgp4, Sgp4Wasm, Sgp4WasmBase, Sgp4XpWasm } from '@ootk/src/main';
import { errorManagerInstance } from './errorManager';

let sgp4WasmInstance: Sgp4Wasm | null = null;
let sgp4XpWasmInstance: Sgp4XpWasm | null = null;

const load_ = <T extends Sgp4WasmBase>(instance: T, glueFile: string, wasmFile: string): Promise<T> => {
  const baseUrl = `${settingsManager.installDirectory}wasm/sgp4prop/`;

  return instance.load({
    glue: `${baseUrl}${glueFile}`,
    wasm: `${baseUrl}${wasmFile}`,
  });
};

/**
 * Lazily loads the USSF Astro Standards SGP4 wasm propagator from the app's
 * static assets (dist/wasm/sgp4prop/). The artifacts are license-restricted
 * and optional: they are only present when the user placed them in
 * src/engine/ootk/src/external/ before building, so this rejects with a
 * descriptive error when they were not deployed.
 */
export const loadSgp4Wasm = (): Promise<Sgp4Wasm> => {
  sgp4WasmInstance ??= new Sgp4Wasm();

  return load_(sgp4WasmInstance, 'Sgp4Prop.js', 'Sgp4Prop.wasm');
};

/**
 * Lazily loads the SGP4-XP variant. See {@link loadSgp4Wasm}.
 */
export const loadSgp4XpWasm = (): Promise<Sgp4XpWasm> => {
  sgp4XpWasmInstance ??= new Sgp4XpWasm();

  return load_(sgp4XpWasmInstance, 'Sgp4Prop.xp.js', 'Sgp4Prop.xp.wasm');
};

/**
 * Applies `settingsManager.propagatorBackend` to the main thread: loads the
 * configured Astro Standards wasm build and routes all `Sgp4` propagation
 * through it. Web workers receive the same configuration through
 * {@link WebWorkerThreadManager} at worker creation.
 *
 * Safe to call fire-and-forget: satKeys attach to satrecs lazily, so
 * propagation seamlessly upgrades from the TypeScript implementation once the
 * wasm runtime is ready. When the artifacts are missing (they are
 * license-restricted and optional), a single warning is logged and the
 * TypeScript implementation stays active.
 * @returns Whether the wasm backend was activated.
 */
export const activateConfiguredPropagatorBackend = async (): Promise<boolean> => {
  const backend = settingsManager.propagatorBackend;

  if (backend !== 'sgp4-wasm' && backend !== 'sgp4-xp-wasm') {
    return false;
  }

  try {
    const wasm = backend === 'sgp4-xp-wasm' ? await loadSgp4XpWasm() : await loadSgp4Wasm();

    Sgp4.useWasmBackend(wasm);

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    errorManagerInstance.warn(
      `Failed to activate the ${backend} propagator backend; falling back to the TypeScript SGP4. ${message}`,
    );

    return false;
  }
};

/**
 * Whether main-thread `Sgp4` propagation is currently routed through the
 * Astro Standards wasm backend.
 */
export const isWasmPropagatorActive = (): boolean => Sgp4.isWasmBackendActive;
