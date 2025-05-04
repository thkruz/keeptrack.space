import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { Tessa } from '@app/tessa/tessa';
import { Milliseconds } from 'ootk';
import { EventBus } from '../events/event-bus';
import { CoreEngineEvents, EventMap } from '../events/event-types';
import { InputSystem } from '../input/input-system';
import { Plugin } from '../plugins/plugin';
import { PluginManager } from '../plugins/plugin-manager';
import { Renderer } from '../rendering/renderer';
import { SceneManager } from '../scene/scene-manager';

interface EngineConfig {
  canvasId: string;
}

export class Engine {
  private readonly eventBus: EventBus;
  private readonly sceneManager: SceneManager;
  private readonly renderer: Renderer;
  private readonly inputSystem: InputSystem;
  private readonly pluginManager: PluginManager;
  private lastTimestamp = 0;
  private isRunning = false;
  private canvas: HTMLCanvasElement;
  private canvasWidth = 0;
  private canvasHeight = 0;
  framesPerSecond: number = 0;
  deltaTime: number;
  simulationStep: number;

  constructor(private readonly config_: EngineConfig) {
    this.eventBus = new EventBus();
    this.sceneManager = new SceneManager(this.eventBus);
    this.renderer = new Renderer(this.eventBus);
    this.inputSystem = new InputSystem(this.eventBus);
    this.pluginManager = new PluginManager(this.eventBus);

    // Set up resize observer to detect canvas size changes
    window.addEventListener('resize', () => {
      this.handleCanvasResize();
    });
  }

  private handleCanvasResize(): void {
    const newWidth = this.canvas.clientWidth;
    const newHeight = this.canvas.clientHeight;

    if (this.canvasWidth !== newWidth || this.canvasHeight !== newHeight) {
      this.canvasWidth = newWidth;
      this.canvasHeight = newHeight;

      // Update canvas dimensions
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;

      // Notify the event system about the resize
      this.eventBus.emit(CoreEngineEvents.Resize, this.canvasWidth, this.canvasHeight);
    }
  }

  initialize(): void {
    this.eventBus.emit(CoreEngineEvents.BeforeInitialize);
    // Initial canvas size
    this.canvas = getEl(this.config_.canvasId) as HTMLCanvasElement;
    this.canvasWidth = this.canvas.clientWidth;
    this.canvasHeight = this.canvas.clientHeight;
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    this.renderer.initialize(this.canvas);
    this.inputSystem.initialize(this.canvas);
    this.sceneManager.initialize();

    // Emit initial resize event to set up camera aspect ratios
    this.eventBus.emit(CoreEngineEvents.Resize, this.canvasWidth, this.canvasHeight);
    this.eventBus.emit(CoreEngineEvents.Initialize);
  }

  async loadAssets(): Promise<void> {
    await this.eventBus.emit(CoreEngineEvents.AssetLoadStart);
    this.eventBus.emit(CoreEngineEvents.AssetLoadProgress, 0, 1);
    this.eventBus.emit(CoreEngineEvents.AssetLoadComplete);
  }

  start(): void {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.lastTimestamp = performance.now();
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
    // this.renderer.render(this.sceneManager.activeScene);
    keepTrackApi.runEvent(KeepTrackApiEvents.endOfDraw, Tessa.getInstance().deltaTime as Milliseconds);
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
}
