import { Milliseconds } from '@ootk/src/main';
import { PluginManager } from '../plugins/plugins';
import { Camera } from './camera/camera';
import { Container } from './core/container';
import { Singletons } from './core/interfaces';
import { Scene } from './core/scene';
import { TimeManager } from './core/time-manager';
import { EventBus } from './events/event-bus';
import { EventBusEvent } from './events/event-bus-events';
import { InputManager } from './input/input-manager';
import { WebGLRenderer } from './rendering/webgl-renderer';
import { errorManagerInstance } from './utils/errorManager';
import { isThisNode } from './utils/isThisNode';


export interface Application {
  isReady: boolean;
}

export class Engine {
  private isRunning_ = false;
  private isReady_ = false;

  private readonly application_: Application;
  private isPaused: boolean = false;
  private isUpdateTimeThrottle_: boolean;
  private lastFrameTime_ = <Milliseconds>0;

  // Core engine systems
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: Camera;
  readonly inputManager: InputManager;
  readonly eventBus: EventBus;
  readonly pluginManager: PluginManager;
  readonly timeManager: TimeManager;

  constructor(application: Application) {
    // Initialize core engine systems
    this.application_ = application;
    this.eventBus = EventBus.getInstance();
    this.renderer = new WebGLRenderer();
    this.scene = Scene.getInstance();
    this.camera = new Camera();
    this.timeManager = new TimeManager();
    this.inputManager = new InputManager();
    this.pluginManager = new PluginManager();

    Container.getInstance().registerSingleton(Singletons.TimeManager, this.timeManager);
    Container.getInstance().registerSingleton(Singletons.WebGLRenderer, this.renderer);
    Container.getInstance().registerSingleton(Singletons.MeshManager, this.renderer.meshManager);
    Container.getInstance().registerSingleton(Singletons.Scene, this.scene);
    Container.getInstance().registerSingleton(Singletons.InputManager, this.inputManager);
    Container.getInstance().registerSingleton(Singletons.MainCamera, this.camera);
  }

  init() {
    this.addErrorTrap_();

    this.eventBus.init();
    this.camera.init();
    this.timeManager.init();

    this.isReady_ = true;
  }

  private addErrorTrap_() {
    window.addEventListener('error', (e: ErrorEvent) => {
      if (!settingsManager.isGlobalErrorTrapOn) {
        return;
      }
      if (isThisNode()) {
        throw e.error;
      }
      errorManagerInstance.error(e.error, 'Global Error Trapper', e.message);
    });
  }

  run() {
    if (!this.isReady_) {
      throw new Error('KeepTrack is not ready');
    }

    if (this.isRunning_) {
      throw new Error('KeepTrack is already running');
    }

    this.gameLoop_();

    // Main game loop
    this.isRunning_ = true;
  }

  private gameLoop_(timestamp = 0 as Milliseconds): void {
    requestAnimationFrame(this.gameLoop_.bind(this));
    const dt = <Milliseconds>(timestamp - this.lastFrameTime_);

    this.lastFrameTime_ = timestamp;

    if (!this.isPaused && this.application_.isReady) {
      this.update_(dt); // Do any per frame calculations
      this.draw_(dt);
    }
  }

  private update_(dt = <Milliseconds>0) {
    this.renderer.dt = dt;
    this.renderer.dtAdjusted = <Milliseconds>(Math.min(this.renderer.dt / 1000.0, 1.0 / Math.max(this.timeManager.propRate, 0.001)) * this.timeManager.propRate);

    this.timeManager.update();
    // Update official time for everyone else
    this.timeManager.setNow(<Milliseconds>Date.now());
    if (!this.isUpdateTimeThrottle_) {
      this.isUpdateTimeThrottle_ = true;
      this.timeManager.setSelectedDate(this.timeManager.simulationTimeObj);
      setTimeout(() => {
        this.isUpdateTimeThrottle_ = false;
      }, 500);
    }

    this.eventBus.emit(EventBusEvent.update, dt);

    this.renderer.update();
  }

  private draw_(dt = <Milliseconds>0) {
    this.camera.draw(this.renderer.sensorPos);
    this.renderer.render(this.scene, this.camera);

    if (Engine.isFpsAboveLimit(dt, 5) && !settingsManager.lowPerf && !settingsManager.isDragging && !settingsManager.isDemoModeOn) {
      this.eventBus.emit(EventBusEvent.highPerformanceRender, dt);
    }

    this.eventBus.emit(EventBusEvent.endOfDraw, dt);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  stop() {
    this.isRunning_ = false;
  }

  /** Check if the FPS is above a certain threshold */
  static isFpsAboveLimit(dt: Milliseconds, minimumFps: number): boolean {
    return this.getFps_(dt) > minimumFps;
  }

  private static getFps_(dt: Milliseconds): number {
    return 1000 / dt;
  }
}
