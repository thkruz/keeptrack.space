/**
 * Tracking Engine for Space Situational Awareness (TESSA)
 *
 * This is the core code for the engine that KeepTrack runs on.
 * It is responsible for rendering the scene, handling user input, and managing the simulation.
 *
 * Anything beyond core engine functionality should be in the KeepTrack API.
 */

import { KeepTrackApiEvents } from '@app/interfaces';
import { Milliseconds } from 'ootk';
import { keepTrackApi } from '../keepTrackApi';

/**
 * Enumerates the various events emitted by the engine.
 *
 * These events cover the engine lifecycle, rendering, updating, resizing, and user input interactions.
 */
export enum EngineEvents {
  /** Emitted when the engine is ready */
  onReady = 'onReady',
  /** Emitted after the engine has been initialized */
  onEngineInitialized = 'onEngineInitialized',
  /**
   * Emitted at the start of an update cycle
   *
   * Events that ARE time sensitive should be handled here.
   * This is the first event that is emitted after the update frame starts.
   */
  onUpdateStart = 'onUpdateStart',
  /**
   * Emitted during the update cycle
   *
   * Events that ARE NOT time sensitive should be handled here.
   * This is the second event that is emitted after the update frame starts.
   */
  onUpdate = 'onUpdate',
  /**
   * Emitted at the end of an update cycle
   *
   * Events that ARE time sensitive should be handled here.
   * This is the last event that is emitted before the render frame starts.
   */
  onUpdateEnd = 'onUpdateEnd',
  /** Emitted at the start of a render frame */
  onRenderFrameStart = 'onRenderFrameStart',
  /** Emitted during the render frame */
  onRenderFrame = 'onRenderFrame',
  /** Emitted at the end of a render frame */
  onRenderFrameEnd = 'onRenderFrameEnd',
  /** Emitted when the engine or viewport is resized */
  onResize = 'onResize',
  /** Emitted when a mouse button is pressed */
  onMouseDown = 'onMouseDown',
  /** Emitted when a mouse button is released */
  onMouseUp = 'onMouseUp',
  /** Emitted when the mouse is moved */
  onMouseMove = 'onMouseMove',
  /** Emitted when the mouse wheel is used */
  onMouseWheel = 'onMouseWheel',
  /** Emitted when a touch starts */
  onTouchStart = 'onTouchStart',
  /** Emitted when a touch ends */
  onTouchEnd = 'onTouchEnd',
  /** Emitted when a touch moves */
  onTouchMove = 'onTouchMove',
  /** Emitted when a key is pressed down */
  onKeyDown = 'onKeyDown',
  /** Emitted when a key is released */
  onKeyUp = 'onKeyUp',
  /** Emitted when a key is pressed */
  onKeyPress = 'onKeyPress',
}

type EngineEventArguments = {
  [EngineEvents.onReady]: [];
  [EngineEvents.onEngineInitialized]: [];
  [EngineEvents.onUpdateStart]: [Milliseconds];
  [EngineEvents.onUpdate]: [Milliseconds];
  [EngineEvents.onUpdateEnd]: [Milliseconds];
  [EngineEvents.onRenderFrameStart]: [];
  [EngineEvents.onRenderFrame]: [];
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
  static readonly id = 'Tessa';
  static instance: Tessa | null = null; // NOSONAR
  /**
   * The number of milliseconds since the update loop started.
   *
   *  Use this for all ui interactions that are agnostic to propagation rate
   */
  dt: Milliseconds;
  /**
   * The number of milliseconds since the last update loop multiplied by propagation rate
   *
   *  Use this for all simulation time/physics calculations
   */
  simulationStep: Milliseconds;
  lastGameLoopTimestamp_ = 0 as Milliseconds;
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

  constructor() {
    Tessa.printConsoleMessage();
    this.register({
      event: EngineEvents.onEngineInitialized,
      cbName: Tessa.id,
      cb: () => {
        this.isInitialized = true;
      },
    });
  }

  /** Flag to indicate if the engine is still loading */
  isInitialized = false;
  framesPerSecond = 0;

  static calculateFps(dt: Milliseconds): number {
    const fps = 1000 / dt;

    return fps;
  }

  gameLoop(timestamp = 0 as Milliseconds) {
    const dt = <Milliseconds>(timestamp - this.lastGameLoopTimestamp_);

    requestAnimationFrame(this.gameLoop.bind(this));
    this.tick(dt);
    this.lastGameLoopTimestamp_ = timestamp;
  }

  tick(dt: Milliseconds) {
    this.setFps(Tessa.calculateFps(dt));
    if (!this.isInitialized) {
      return;
    }

    this.setDeltaTime(dt, keepTrackApi.getTimeManager().propRate);
    this.runEvent(EngineEvents.onUpdateStart, dt);
    this.runEvent(EngineEvents.onUpdate, dt);
    this.runEvent(EngineEvents.onUpdateEnd, dt);
    this.runEvent(EngineEvents.onRenderFrameStart);
    this.runEvent(EngineEvents.onRenderFrame);
    keepTrackApi.runEvent(KeepTrackApiEvents.endOfDraw, dt);
    this.runEvent(EngineEvents.onRenderFrameEnd);
  }

  setDeltaTime(dt: Milliseconds, propagationRate: number) {
    this.dt = dt;
    this.simulationStep = (Math.min(dt / 1000.0, 1.0 / Math.max(propagationRate, 0.001)) * propagationRate) as Milliseconds;
    this.framesPerSecond = Tessa.calculateFps(dt);
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

  static printConsoleMessage() {
    // eslint-disable-next-line no-console
    console.log(`
 _____ _____ _____ _____  ___
|_   _|  ___/  ___/  ___|/ _ \\
  | | | |__ \\ \`--.\\ \`--./ /_\\ \\
  | | |  __| \`--. \\\`--. \\  _  |
  | | | |___/\\__/ /\\__/ / | | |
  \\_/ \\____/\\____/\\____/\\_| |_/

Powered by the TESSA engine.
Learn more at https://keeptrack.space/tessa
This software is licensed under the GNU Affero General Public License (AGPL).
See https://www.gnu.org/licenses/agpl-3.0.html for details.
    `);
  }
}
