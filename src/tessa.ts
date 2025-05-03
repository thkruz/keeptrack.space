/**
 * Tracking Engine for Space Situational Awareness (TESSA)
 *
 * This is the core code for the engine that KeepTrack runs on.
 * It is responsible for rendering the scene, handling user input, and managing the simulation.
 *
 * Anything beyond core engine functionality should be in the KeepTrack API.
 */

import { Milliseconds } from 'ootk';

/**
 * Enum containing core engine evennts
 */
export enum EngineEvents {
  onReady = 'onReady',
  onEngineInitialized = 'onEngineInitialized',
  onUpdateLoop = 'onUpdateLoop',
  onRenderFrameStart = 'onRenderFrameStart',
  onRenderFrameEnd = 'onRenderFrameEnd',
  onResize = 'onResize',
  onMouseDown = 'onMouseDown',
  onMouseUp = 'onMouseUp',
  onMouseMove = 'onMouseMove',
  onMouseWheel = 'onMouseWheel',
  onTouchStart = 'onTouchStart',
  onTouchEnd = 'onTouchEnd',
  onTouchMove = 'onTouchMove',
  onKeyDown = 'onKeyDown',
  onKeyUp = 'onKeyUp',
  onKeyPress = 'onKeyPress',
}

type EngineEventArguments = {
  [EngineEvents.onReady]: [];
  [EngineEvents.onEngineInitialized]: [];
  [EngineEvents.onUpdateLoop]: [Milliseconds];
  [EngineEvents.onRenderFrameStart]: [];
  [EngineEvents.onRenderFrameEnd]: [];
  [EngineEvents.onResize]: [];
  [EngineEvents.onMouseDown]: [];
  [EngineEvents.onMouseUp]: [];
  [EngineEvents.onMouseMove]: [];
  [EngineEvents.onMouseWheel]: [];
  [EngineEvents.onTouchStart]: [];
  [EngineEvents.onTouchEnd]: [];
  [EngineEvents.onTouchMove]: [];
  [EngineEvents.onKeyDown]: [];
  [EngineEvents.onKeyUp]: [];
  [EngineEvents.onKeyPress]: [];
};

interface TessaRegisterParams<T extends keyof EngineEventArguments> {
  event: T;
  cbName: string;
  cb: (...args: EngineEventArguments[T]) => void;
}

export class Tessa {
  static instance: Tessa | null = null; // NOSONAR
  static getInstance() {
    Tessa.instance ??= new Tessa();

    return Tessa.instance;
  }
  static getInstanceOrNull() {
    return Tessa.instance || null;
  }
  static setInstance(instance: Tessa) {
    Tessa.instance = instance;
  }
  static clearInstance() {
    Tessa.instance = null;
  }


  /**
   * Create an array of empty arrays for each event in the EngineEvents enum.
   * This will be used to store the callbacks for each event.
   */
  private events_: {
    [K in keyof EngineEventArguments]: TessaRegisterParams<K>[];
  } = Object.fromEntries(
    Object.values(EngineEvents).map((event) => [event, []]),
  ) as unknown as {
      [K in keyof EngineEventArguments]: TessaRegisterParams<K>[];
    };

  /** Flag to indicate if the engine is still loading */
  isLoading = true;
  framesPerSecond = 0;

  static calculateFps(dt: Milliseconds): number {
    const fps = 1000 / dt;

    return fps;
  }

  setFps(fps: number) {
    this.framesPerSecond = fps;
  }

  register<T extends keyof EngineEventArguments>(params: { event: T; cbName: string; cb: (...args: EngineEventArguments[T]) => void }) {
    this.verifyEvent_(params.event);
    this.events_[params.event].push({
      event: params.event,
      cbName: params.cbName,
      cb: params.cb,
    });
  }

  unregister(params: { event: keyof EngineEventArguments; cbName: string }) {
    const arr = this.events_[params.event];
    const idx = arr.findIndex((cb) => cb.cbName === params.cbName);

    if (idx !== -1) {
      arr.splice(idx, 1);
    }
  }

  runEvent<T extends keyof EngineEventArguments>(event: T, ...args: EngineEventArguments[T]) {
    this.verifyEvent_(event);
    this.events_[event].forEach((cbObj) => cbObj.cb(...args));
  }

  private verifyEvent_(event: keyof EngineEventArguments) {
    if (!this.events_[event]) {
      this.events_[event] = [];
    }
  }

  unregisterAllEvents() {
    for (const event of Object.keys(this.events_) as (keyof EngineEventArguments)[]) {
      this.events_[event] = [];
    }
  }
}
