import { EventBus } from '../events/event-bus';
import { TimeEvents } from '../events/event-types';

export class TimeManager {
  private currentTime_: number = 0;
  private realTimeDelta_: number = 0;
  private scaledTimeDelta_: number = 0;
  private timeScale_: number = 1.0;
  private isPaused_: boolean = false;
  private lastTimestamp_: number = 0;
  private scaledTimeDeltaMs_: number = 0; // Matches old engine's simulationStep

  constructor(private readonly eventBus: EventBus) {
    // Initialize the last timestamp to the current time
  }

  public update(gameLoopTimestamp: number): void {
    const deltaTime = gameLoopTimestamp - this.lastTimestamp_;

    this.realTimeDelta_ = deltaTime;

    if (!this.isPaused_) {
      this.scaledTimeDelta_ = this.realTimeDelta_ * this.timeScale_;
      this.currentTime_ += this.scaledTimeDelta_;

      // Replicate old simulationStep logic
      this.scaledTimeDeltaMs_ = (
        Math.min(deltaTime / 1000.0, 1.0 / Math.max(this.timeScale_, 0.001)) *
        this.timeScale_
      );

      this.eventBus.emit(TimeEvents.TimeUpdated, this.currentTime_, this.scaledTimeDelta_);
    }

    this.lastTimestamp_ = gameLoopTimestamp;
  }

  public reset(): void {
    this.currentTime_ = 0;
    this.realTimeDelta_ = 0;
    this.scaledTimeDelta_ = 0;
    this.timeScale_ = 1.0;
    this.isPaused_ = false;
    this.lastTimestamp_ = performance.now();
    this.scaledTimeDeltaMs_ = 0;
  }

  setTimeScale(scale: number): void {
    this.timeScale_ = scale;
    this.eventBus.emit(TimeEvents.TimeScaleChanged, this.timeScale_);
  }

  getSimulationStep(): number {
    return this.scaledTimeDeltaMs_;
  }

  pause(): void {
    if (!this.isPaused_) {
      this.isPaused_ = true;
      this.eventBus.emit(TimeEvents.TimePaused);
    }
  }

  resume(): void {
    if (this.isPaused_) {
      this.isPaused_ = false;
      this.eventBus.emit(TimeEvents.TimeResumed);
    }
  }

  getTime(): number {
    return this.currentTime_;
  }

  getFramesPerSecond(): number {
    if (this.realTimeDelta_ === 0) {
      return 0;
    }

    return 1000 / this.realTimeDelta_;
  }

  getRealTimeDelta(): number {
    return this.realTimeDelta_;
  }

  getScaledTimeDelta(): number {
    return this.scaledTimeDelta_;
  }

  getTimeScale(): number {
    return this.timeScale_;
  }

  isPaused(): boolean {
    return this.isPaused_;
  }
}
