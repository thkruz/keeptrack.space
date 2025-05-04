/**
 * Tracking Engine for Space Situational Awareness (TESSA)
 *
 * This is the core code for the engine that KeepTrack runs on.
 * It is responsible for rendering the scene, handling user input, and managing the simulation.
 *
 * Anything beyond core engine functionality should be in the KeepTrack API.
 */

import { KeepTrackApiEvents } from '@app/interfaces';
import { getEl } from '@app/lib/get-el';
import { isThisNode } from '@app/static/isThisNode';
import { Milliseconds } from 'ootk';
import { keepTrackApi } from '../keepTrackApi';
import { EngineEventArguments, EngineEvents } from './engine-events';

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
  isRunning = false;
  /** Flag to indicate if the engine is still loading */
  isInitialized = false;
  framesPerSecond = 0;
  assetList: (() => Promise<void>)[] = [] as (() => Promise<void>)[];
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
    Tessa.printConsoleMessage_();
  }

  /**
   * Initializes the engine, sets it as ready, and fires the initialization event.
   * This should be called before loading assets or starting the game loop.
   */
  initialize() {
    this.isInitialized = false; // Not ready until assets are loaded
    this.runEvent(EngineEvents.onEngineInitialized);
  }

  /**
   * Loads assets required for the engine/game.
   * Once assets are loaded, sets the engine as initialized and starts the game loop.
   * You can extend this method to handle async asset loading if needed.
   */
  async run() {
    try {
      await Promise.all(this.assetList.map((asset) => asset()));

      this.runEvent(EngineEvents.onAssetsLoaded);
      this.isInitialized = true;
      this.gameLoop(performance.now() as Milliseconds);
      this.runEvent(EngineEvents.onGameLoopStarted);

      this.isRunning = true;
    } catch (error) {
      Tessa.showErrorCode_(<Error & { lineNumber: number }>error);
    }
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

  unregisterAllEvents() {
    for (const event of Object.keys(this.events_) as (keyof EngineEventArguments)[]) {
      this.events_[event] = [];
    }
  }

  private verifyEvent_(event: keyof EngineEventArguments) {
    if (!this.events_[event]) {
      this.events_[event] = [];
    }
  }

  static getInstance() {
    Tessa.instance ??= new Tessa();

    return Tessa.instance;
  }

  static calculateFps(dt: Milliseconds): number {
    const fps = 1000 / dt;

    return fps;
  }

  private static showErrorCode_(error: Error & { lineNumber: number }): void {
    // TODO: Replace console calls with ErrorManagerInstance

    let errorHtml = '';

    errorHtml += error?.message ? `${error.message}<br>` : '';
    errorHtml += error?.lineNumber ? `Line: ${error.lineNumber}<br>` : '';
    errorHtml += error?.stack ? `${error.stack}<br>` : '';
    const LoaderText = getEl('loader-text');

    if (LoaderText) {
      LoaderText.innerHTML = errorHtml;
      // eslint-disable-next-line no-console
      console.error(error);
    } else {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    // istanbul ignore next
    if (!isThisNode()) {
      // eslint-disable-next-line no-console
      console.warn(error);
    }
  }

  private static printConsoleMessage_() {
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
