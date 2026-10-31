import type { EmbedCatalog } from './embed-catalog';
import type { EmbedContext } from './embed-context';
import type { EmbedEngine } from './embed-engine';
import { type EmbedCameraOptions, EmbedError, type EmbedObjectInfo, type ObjectRef } from './embed-types';

export const SELECT_RETRY_MS = 500;
export const SELECT_TIMEOUT_MS = 30_000;

const CAMERA_MODES = ['earth', 'orbit', 'flat-map', 'polar'];

/** Selection, hover and camera. Retries select() while the cruncher seeds a fresh dot. */
export class EmbedSelection {
  private retryTimer_: ReturnType<typeof setTimeout> | null = null;
  private cancelPending_: (() => void) | null = null;
  private lastSelectedId_ = -1;

  constructor(
    private readonly ctx_: EmbedContext,
    private readonly engine_: EmbedEngine,
    private readonly catalog_: EmbedCatalog
  ) {}

  /** Subscribe to engine events. Called once, when the engine is ready. */
  start(): void {
    this.lastSelectedId_ = this.engine_.getSelectedId();
    this.engine_.onSelectionChanged((id) => {
      // The engine re-emits selectSatData for the same object (detail fetch); only report real changes
      if (id === this.lastSelectedId_) {
        return;
      }
      this.lastSelectedId_ = id;
      this.ctx_.emit('selectionChanged', { object: this.infoOrNull_(id), source: this.ctx_.source });
    });
    this.engine_.onHoverChanged((id) => {
      if (this.ctx_.hasListeners('hover')) {
        this.ctx_.emit('hover', { object: this.infoOrNull_(id) });
      }
    });
  }

  /** Report a user selection attempt on a host-owned selection domain. */
  reportUserAttempt(id: number): void {
    this.ctx_.emit('changeRequested', { domain: 'selection', value: this.infoOrNull_(id) });
  }

  private infoOrNull_(id: number): EmbedObjectInfo | null {
    return id < 0 ? null : this.catalog_.infoForId(id);
  }

  getSelected(): EmbedObjectInfo | null {
    return this.infoOrNull_(this.engine_.getSelectedId());
  }

  /** Called when a removed host object may have been selected. */
  deselectIfSelected(ids: number[]): void {
    if (ids.includes(this.engine_.getSelectedId())) {
      this.ctx_.runAsHost(() => this.engine_.selectById(-1));
    }
  }

  select(ref: ObjectRef | null): Promise<boolean> {
    this.cancelPending_?.();

    if (ref === null) {
      return Promise.resolve(this.ctx_.runAsHost(() => this.engine_.selectById(-1)));
    }
    const id = this.catalog_.resolveRef(ref);

    if (id === null) {
      return Promise.reject(new EmbedError('OBJECT_NOT_FOUND', `No object matches ${JSON.stringify(ref)}`));
    }

    return new Promise<boolean>((resolve) => {
      const startedAt = Date.now();
      const finish = (ok: boolean): void => {
        if (this.retryTimer_ !== null) {
          clearTimeout(this.retryTimer_);
        }
        this.retryTimer_ = null;
        this.cancelPending_ = null;
        resolve(ok);
      };
      const attempt = (): void => {
        if (this.ctx_.runAsHost(() => this.engine_.selectById(id))) {
          finish(true);
        } else if (Date.now() - startedAt >= SELECT_TIMEOUT_MS) {
          finish(false);
        } else {
          this.retryTimer_ = setTimeout(attempt, SELECT_RETRY_MS);
        }
      };

      // A newer select() supersedes this one
      this.cancelPending_ = () => finish(false);
      attempt();
    });
  }

  setCamera(options: EmbedCameraOptions): void {
    const { mode, distanceKm } = options ?? {};

    if (mode !== undefined && !CAMERA_MODES.includes(mode)) {
      throw new EmbedError('INVALID_ARGUMENT', `Unknown camera mode '${String(mode)}'`);
    }
    if (distanceKm !== undefined && (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm <= 0)) {
      throw new EmbedError('INVALID_ARGUMENT', 'distanceKm must be a positive number');
    }
    this.engine_.setCamera(mode, distanceKm);
  }
}
