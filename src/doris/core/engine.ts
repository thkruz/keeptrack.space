import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { EventBus } from '../events/event-bus';
import { CoreEngineEvents, EventMap } from '../events/event-types';
import { InputSystem } from '../input/input-system';
import { Plugin } from '../plugins/plugin';
import { PluginManager } from '../plugins/plugin-manager';
import { Renderer } from '../rendering/renderer';
import { SceneManager } from '../scene/scene-manager';
import { CanvasManager } from './canvas-manager';
import { initializeSplashScreen } from './engine-splash-screen';

export interface EngineConfig {
  containerRoot: string;
  canvasId: string;
}

export class Engine {
  private readonly eventBus: EventBus;
  private readonly sceneManager: SceneManager;
  private readonly renderer: Renderer;
  private readonly inputSystem: InputSystem;
  private readonly pluginManager: PluginManager;
  private readonly canvasManager: CanvasManager;
  private lastTimestamp = 0;
  private isRunning = false;
  framesPerSecond: number = 0;
  deltaTime: number;
  simulationStep: number;

  constructor(private readonly config_: EngineConfig) {
    this.eventBus = new EventBus();
    this.sceneManager = new SceneManager(this.eventBus);
    this.renderer = new Renderer(this.eventBus);
    this.inputSystem = new InputSystem(this.eventBus);
    this.pluginManager = new PluginManager(this.eventBus);
    this.canvasManager = new CanvasManager(this.eventBus, getEl(this.config_.containerRoot));
  }

  initialize(): void {
    this.eventBus.emit(CoreEngineEvents.BeforeInitialize);
    this.canvasManager.initialize(getEl(this.config_.canvasId) as HTMLCanvasElement);
    this.renderer.initialize(this.canvasManager.getCanvas());
    this.inputSystem.initialize(this.canvasManager.getCanvas());
    this.sceneManager.initialize();

    // Create a Splash Screen on a new div element
    const splashScreen = initializeSplashScreen();

    // Wait for 3 seconds before continuing the initialization
    new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2500);
      // Continue with initialization after splash screen
      this.eventBus.emit(CoreEngineEvents.Initialize).then(() => {
        this.loadAssets();
      });
    }).then(() => {
      // Remove the splash screen
      splashScreen.style.transition = 'opacity 0.5s';
      splashScreen.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(splashScreen);
      }, 500);
    });
  }

  async loadAssets(): Promise<void> {
    await this.eventBus.emit(CoreEngineEvents.AssetLoadStart);
    this.eventBus.emit(CoreEngineEvents.AssetLoadProgress, 0, 1);
    this.eventBus.emit(CoreEngineEvents.AssetLoadComplete);
  }

  pause(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  start(): void {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.lastTimestamp = performance.now();

    this.eventBus.emit(CoreEngineEvents.Start);
    requestAnimationFrame(this.gameLoop_.bind(this));
  }

  private gameLoop_(timestamp: number): void {
    if (!this.isRunning) {
      return;
    }

    this.deltaTime = timestamp - this.lastTimestamp;
    requestAnimationFrame(this.gameLoop_.bind(this));
    this.tick_(this.deltaTime);

    this.lastTimestamp = timestamp;
  }

  private tick_(deltaTime: number) {
    this.setFps(Engine.calculateFps(this.deltaTime));
    this.setDeltaTime(deltaTime, keepTrackApi.getTimeManager().propRate);
    this.eventBus.emit(CoreEngineEvents.BeforeUpdate, deltaTime);
    this.eventBus.emit(CoreEngineEvents.Update, deltaTime);
    this.eventBus.emit(CoreEngineEvents.AfterUpdate, deltaTime);

    this.eventBus.emit(CoreEngineEvents.BeforeRender);
    this.eventBus.emit(CoreEngineEvents.Render);
    this.renderer.render(keepTrackApi.getScene(), keepTrackApi.getMainCamera());
    this.eventBus.emit(CoreEngineEvents.AfterRender);
  }

  setDeltaTime(dt: number, propagationRate: number) {
    this.simulationStep = (Math.min(dt / 1000.0, 1.0 / Math.max(propagationRate, 0.001)) * propagationRate);
    this.framesPerSecond = Engine.calculateFps(dt);
  }

  setFps(fps: number) {
    this.framesPerSecond = fps;
  }

  static calculateFps(dt: number): number {
    const fps = 1000 / dt;

    return fps;
  }

  // Plugin management
  registerPlugin(plugin: Plugin): void {
    this.pluginManager.register(plugin);
  }

  // Event subscription
  on<T extends keyof EventMap>(
    event: T,
    callback: (...args: EventMap[T]) => void,
  ): void {
    this.eventBus.on(event, callback);
  }

  once<T extends keyof EventMap>(
    event: T,
    callback: (...args: EventMap[T]) => void,
  ): void {
    this.eventBus.once(event, callback);
  }

  emit<T extends keyof EventMap>(
    event: T,
    ...args: EventMap[T]
  ): void {
    this.eventBus.emit(event, ...args);
  }

  removeListener<T extends keyof EventMap>(
    event: T,
    callback: (...args: EventMap[T]) => void,
  ): void {
    this.eventBus.removeListener(event, callback);
  }

  removeAllListeners<T extends keyof EventMap>(
    event: T,
  ): boolean {
    return this.eventBus.removeAllListeners(event);
  }

  listenerCount<T extends keyof EventMap>(
    event: T,
  ): number {
    return this.eventBus.listenerCount(event);
  }

  getRenderer(): Renderer {
    return this.renderer;
  }

  getCanvasManager(): CanvasManager {
    return this.canvasManager;
  }
}
