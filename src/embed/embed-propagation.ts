import { settingsManager } from '@app/settings/settings';
import { Sgp4 } from '@ootk/src/main';
import { EmbedError } from './embed-types';

/**
 * Propagator parity for data out.
 *
 * The globe, the info box and every other main-thread consumer propagate through `Sgp4.propagate`, which routes to
 * the Astro Standards wasm backend (classic or SGP4-XP) once `activateConfiguredPropagatorBackend()` has finished
 * loading it (fire-and-forget at KeepTrack construction). The cruncher worker is configured with the same backend
 * at worker creation. Data out therefore uses `Sgp4.propagate` too and only has to make sure the wasm backend is
 * not still loading, otherwise a host could read a TypeScript-SGP4 result for an SGP4-XP element set.
 */
export type ConfiguredBackend = 'sgp4' | 'sgp4-wasm' | 'sgp4-xp-wasm';
/** Which implementation actually serves propagation right now. Provenance only, not part of the contract. */
export type ActivePropagator = 'sgp4-js' | 'sgp4-wasm' | 'sgp4-xp-wasm';

export interface PropagatorProbe {
  configured(): ConfiguredBackend;
  isWasmActive(): boolean;
  nowMs(): number;
}

/** After this long without the wasm backend activating, assume it failed to load and the TypeScript fallback is in use. */
export const WASM_LOAD_GRACE_MS = 15_000;
const POLL_MS = 50;

export const defaultPropagatorProbe: PropagatorProbe = {
  configured: () => (settingsManager.propagatorBackend as ConfiguredBackend | undefined) ?? 'sgp4',
  isWasmActive: () => Sgp4.isWasmBackendActive,
  nowMs: () => Date.now(),
};

export class EmbedPropagation {
  private readonly startedMs_: number;

  constructor(
    private readonly probe_: PropagatorProbe = defaultPropagatorProbe,
    private readonly graceMs_ = WASM_LOAD_GRACE_MS
  ) {
    this.startedMs_ = probe_.nowMs();
  }

  private wantsWasm_(): boolean {
    const configured = this.probe_.configured();

    return configured === 'sgp4-wasm' || configured === 'sgp4-xp-wasm';
  }

  /** True while a configured wasm backend is still loading (not active, grace period not over). */
  isLoading(): boolean {
    return this.wantsWasm_() && !this.probe_.isWasmActive() && this.probe_.nowMs() - this.startedMs_ < this.graceMs_;
  }

  /** The implementation serving propagation now (what the display uses for the same object and time). */
  active(): ActivePropagator {
    return this.wantsWasm_() && this.probe_.isWasmActive() ? (this.probe_.configured() as ActivePropagator) : 'sgp4-js';
  }

  /** Throws NOT_READY while the configured wasm backend is loading, so data out never reports a different propagator than the display. */
  assertReady(): void {
    if (this.isLoading()) {
      throw new EmbedError('NOT_READY', 'The SGP4 wasm propagator is still loading; retry shortly or await the ready event');
    }
  }

  /** Resolves once propagation is final: wasm active, not configured, or the load grace period elapsed. */
  whenReady(): Promise<ActivePropagator> {
    if (!this.isLoading()) {
      return Promise.resolve(this.active());
    }

    return new Promise((resolve) => {
      setTimeout(() => resolve(this.whenReady()), POLL_MS);
    });
  }
}
