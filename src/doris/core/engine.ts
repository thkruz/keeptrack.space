import { Doris } from '@app/doris/doris';
import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
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

    // Create a Splash Screen on a new div element
    const splashScreen = this.initializeSplashScreen_();

    // Wait for 3 seconds before continuing the initialization
    new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
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

  private initializeSplashScreen_() {
    const splashScreen = document.createElement('div');

    splashScreen.style.position = 'absolute';
    splashScreen.style.top = '0';
    splashScreen.style.left = '0';
    splashScreen.style.width = '100%';
    splashScreen.style.height = '100%';
    splashScreen.style.backgroundColor = 'rgba(0, 0, 0, 1)';
    splashScreen.style.color = 'white';
    splashScreen.style.display = 'flex';
    splashScreen.style.alignItems = 'center';
    splashScreen.style.justifyContent = 'center';
    splashScreen.style.zIndex = '10000';

    // Create a container for splash content
    const splashContent = document.createElement('div');

    splashContent.style.display = 'flex';
    splashContent.style.flexDirection = 'column';
    splashContent.style.alignItems = 'center';

    // "Powered by" text
    const poweredBy = document.createElement('div');

    poweredBy.innerText = 'Powered by';
    poweredBy.style.fontSize = '20px';
    poweredBy.style.marginBottom = '12px';
    poweredBy.style.opacity = '0.8';

    // DORIS text
    const dorisText = document.createElement('div');

    dorisText.innerText = 'DORIS';
    dorisText.style.fontSize = '64px';
    dorisText.style.fontWeight = 'bold';
    dorisText.style.letterSpacing = '0.2em';
    dorisText.style.textShadow = '0 2px 16px #000, 0 0 8px #fff4';

    // Loading text
    const loadingText = document.createElement('div');

    loadingText.innerText = 'A not-so-intelligent, definitely-overambitious, and surprisingly useful small space engine.';
    loadingText.style.fontSize = '16px';
    loadingText.style.marginTop = '14px';
    loadingText.style.opacity = '0.7';

    // Version text
    const versionText = document.createElement('div');

    versionText.innerText = 'v1.0.0';
    versionText.style.position = 'absolute';
    versionText.style.bottom = '12px';
    versionText.style.left = '12px';
    versionText.style.fontSize = '14px';
    versionText.style.opacity = '0.7';
    versionText.style.pointerEvents = 'none';
    splashScreen.appendChild(versionText);

    // Copyright message
    const copyright = document.createElement('div');

    copyright.innerHTML =
      `DORIS &mdash; the Definitely Overengineered Render & Input System engine<br>
      &copy; 2025 Kruczek Labs LLC. All rights reserved.<br>
      Licensed under the GNU AGPL v3.0.<br>
      See LICENSE for details. Unauthorized use is prohibited.`;
    copyright.style.position = 'absolute';
    copyright.style.bottom = '12px';
    copyright.style.left = '0';
    copyright.style.width = '100%';
    copyright.style.textAlign = 'center';
    copyright.style.fontSize = '12px';
    copyright.style.opacity = '0.5';
    copyright.style.pointerEvents = 'none';

    splashContent.appendChild(poweredBy);
    splashContent.appendChild(dorisText);
    splashContent.appendChild(loadingText);
    splashScreen.appendChild(splashContent);
    splashScreen.appendChild(copyright);

    document.body.appendChild(splashScreen);

    return splashScreen;
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
    keepTrackApi.runEvent(KeepTrackApiEvents.endOfDraw, Doris.getInstance().deltaTime as Milliseconds);
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

  listenerCount<T extends keyof EventMap>(
    event: T,
  ): number {
    return this.eventBus.listenerCount(event);
  }
}
