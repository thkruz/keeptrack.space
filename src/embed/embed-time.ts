import type { EmbedContext } from './embed-context';
import type { EmbedEngine } from './embed-engine';
import { EmbedError, type EmbedTimeState } from './embed-types';

/** Simulation clock. Paused state is preserved by setTime because only the offset changes. */
export class EmbedTime {
  /** Rate to resume at after pause(). */
  private resumeRate_ = 1;

  constructor(
    private readonly ctx_: EmbedContext,
    private readonly engine_: EmbedEngine
  ) {}

  start(): void {
    this.engine_.onTimeChanged(() => {
      this.ctx_.emit('timeChanged', { ...this.getTime(), source: this.ctx_.source });
    });
  }

  reportUserAttempt(change: { timeMs?: number; rate?: number }): void {
    this.ctx_.emit('changeRequested', { domain: 'time', value: change });
  }

  getTime(): EmbedTimeState {
    const rate = this.engine_.getRate();

    return { timeMs: this.engine_.getTimeMs(), rate, paused: rate === 0 };
  }

  static parseTime(time: string | number): number {
    const ms = typeof time === 'number' ? time : Date.parse(time);

    if (typeof time !== 'number' && typeof time !== 'string') {
      throw new EmbedError('INVALID_ARGUMENT', 'time must be an ISO-8601 string or epoch ms');
    }
    if (!Number.isFinite(ms)) {
      throw new EmbedError('INVALID_ARGUMENT', `Cannot parse time '${String(time)}'`);
    }

    return ms;
  }

  setTime(time: string | number): void {
    const ms = EmbedTime.parseTime(time);

    this.ctx_.runAsHost(() => this.engine_.setTimeMs(ms));
  }

  setRate(rate: number): void {
    if (typeof rate !== 'number' || !Number.isFinite(rate)) {
      throw new EmbedError('INVALID_ARGUMENT', 'rate must be a finite number');
    }
    if (rate !== 0) {
      this.resumeRate_ = rate;
    }
    this.ctx_.runAsHost(() => this.engine_.setRate(rate));
  }

  pause(): void {
    const current = this.engine_.getRate();

    if (current !== 0) {
      this.resumeRate_ = current;
    }
    this.ctx_.runAsHost(() => this.engine_.setRate(0));
  }

  play(): void {
    if (this.engine_.getRate() === 0) {
      this.ctx_.runAsHost(() => this.engine_.setRate(this.resumeRate_));
    }
  }
}
