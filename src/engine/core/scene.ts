import { ToastMsgType } from '@app/engine/core/interfaces';
import { t7e } from '@app/locales/keys';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { Body } from 'astronomy-engine';
import { Milliseconds } from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { Camera } from '../camera/camera';
import { Engine } from '../engine';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { CelestialBody } from '../rendering/draw-manager/celestial-bodies/celestial-body';
import { Jupiter } from '../rendering/draw-manager/celestial-bodies/jupiter';
import { Mars } from '../rendering/draw-manager/celestial-bodies/mars';
import { Mercury } from '../rendering/draw-manager/celestial-bodies/mercury';
import { Moon } from '../rendering/draw-manager/celestial-bodies/moon';
import { Neptune } from '../rendering/draw-manager/celestial-bodies/neptune';
import { Saturn } from '../rendering/draw-manager/celestial-bodies/saturn';
import { Uranus } from '../rendering/draw-manager/celestial-bodies/uranus';
import { Venus } from '../rendering/draw-manager/celestial-bodies/venus';
import { ConeMeshFactory } from '../rendering/draw-manager/cone-mesh-factory';
import { Box } from '../rendering/draw-manager/cube';
import { Earth } from '../rendering/draw-manager/earth';
import { AtmosphereSettings } from '../rendering/draw-manager/earth-quality-enums';
import { Ellipsoid } from '../rendering/draw-manager/ellipsoid';
import { Godrays } from '../rendering/draw-manager/godrays';
import { SensorFovMeshFactory } from '../rendering/draw-manager/sensor-fov-mesh-factory';
import { SkyBoxSphere } from '../rendering/draw-manager/skybox-sphere';
import { Sun } from '../rendering/draw-manager/sun';
import { WebGLRenderer } from '../rendering/webgl-renderer';
import { errorManagerInstance } from '../utils/errorManager';

export interface SceneParams {
  gl: WebGL2RenderingContext;
  background?: WebGLTexture;
}

export class Scene {
  private static instance_: Scene;
  private gl_: WebGL2RenderingContext;
  background: WebGLTexture | null = null;
  skybox: SkyBoxSphere;
  isScene = true;
  earth: Earth;
  planets: {
    [Body.Moon]: Moon;
    [Body.Mars]: Mars;
    [Body.Mercury]: Mercury;
    [Body.Venus]: Venus;
    [Body.Jupiter]: Jupiter;
    [Body.Saturn]?: CelestialBody;
    [Body.Uranus]?: CelestialBody;
    [Body.Neptune]?: CelestialBody;
    [Body.Pluto]?: CelestialBody;
  };
  sun: Sun;
  godrays: Godrays;
  sensorFovFactory: SensorFovMeshFactory;
  coneFactory: ConeMeshFactory;
  /** The pizza box shaped search around a satellite. */
  searchBox: Box;
  frameBuffers = {
    gpuPicking: null as unknown as WebGLFramebuffer,
    godrays: null as unknown as WebGLFramebuffer,
  };
  updateVisualsBasedOnPerformanceTime_ = 0;
  primaryCovBubble: Ellipsoid;
  secondaryCovBubble: Ellipsoid;
  worldShift = [0, 0, 0];

  static getInstance(): Scene {
    if (!Scene.instance_) {
      Scene.instance_ = new Scene();
    }

    return Scene.instance_;
  }

  private constructor() {
    //
  }

  init(params: SceneParams): void {
    this.gl_ = params.gl;
    this.background = params.background ?? null;

    this.skybox = new SkyBoxSphere();
    this.earth = new Earth();
    this.planets = {
      [Body.Moon]: new Moon(),
      [Body.Mars]: new Mars(),
      [Body.Mercury]: new Mercury(),
      [Body.Venus]: new Venus(),
      [Body.Jupiter]: new Jupiter(),
      [Body.Saturn]: new Saturn(),
      [Body.Uranus]: new Uranus(),
      [Body.Neptune]: new Neptune(),
    };
    this.sun = new Sun();
    this.godrays = new Godrays();
    this.searchBox = new Box();
    this.searchBox.setColor([1, 0, 0, 0.3]);
    this.primaryCovBubble = new Ellipsoid(([0, 0, 0]));
    this.secondaryCovBubble = new Ellipsoid(([0, 0, 0]));
    this.sensorFovFactory = new SensorFovMeshFactory();
    this.coneFactory = new ConeMeshFactory();
    this.skybox.init(settingsManager, params.gl);

    EventBus.getInstance().emit(EventBusEvent.SceneReady);
    EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, this.loadSceneLowPriority.bind(this));
  }

  update(simulationTime: Date) {
    this.sun.update();
    this.earth.update();
    for (const planet of Object.values(this.planets)) {
      planet.update(simulationTime);
    }
    this.skybox.update();

    keepTrackApi.getLineManager().update();

    this.sensorFovFactory.updateAll();
    this.coneFactory.updateAll();
  }

  render(renderer: WebGLRenderer, camera: Camera): void {
    this.clear();

    this.renderBackground(renderer, camera);
    this.renderOpaque(renderer, camera);
    this.renderTransparent(renderer, camera);

    this.sensorFovFactory.drawAll(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer);
    this.coneFactory.drawAll(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer);
  }

  averageDrawTime = 0;
  drawTimeArray: number[] = Array(150).fill(16);

  renderBackground(renderer: WebGLRenderer, camera: Camera): void {
    this.drawTimeArray.push(Math.min(100, renderer.dt));
    if (this.drawTimeArray.length > 150) {
      this.drawTimeArray.shift();
    }
    this.averageDrawTime = this.drawTimeArray.reduce((a, b) => a + b, 0) / this.drawTimeArray.length;

    this.updateVisualsBasedOnPerformance_();

    if (!settingsManager.isDrawLess) {
      if (settingsManager.isDrawSun) {
        const fb = settingsManager.isDisableGodrays ? null : this.frameBuffers.godrays;

        // Draw the Sun to the Godrays Frame Buffer
        this.sun.draw(this.earth.lightDirection, fb);

        // Draw a black earth mesh on top of the sun in the godrays frame buffer
        switch (settingsManager.centerBody) {
          case Body.Mercury:
            this.planets[Body.Mercury].drawOcclusion(renderer.projectionMatrix, camera.camMatrix, renderer?.postProcessingManager?.programs?.occlusion, this.frameBuffers.godrays);
            break;
          case Body.Venus:
            this.planets[Body.Venus].drawOcclusion(renderer.projectionMatrix, camera.camMatrix, renderer?.postProcessingManager?.programs?.occlusion, this.frameBuffers.godrays);
            break;
          case Body.Mars:
            this.planets[Body.Mars].drawOcclusion(renderer.projectionMatrix, camera.camMatrix, renderer?.postProcessingManager?.programs?.occlusion, this.frameBuffers.godrays);
            break;
          case Body.Moon:
            this.planets[Body.Moon].drawOcclusion(renderer.projectionMatrix, camera.camMatrix, renderer?.postProcessingManager?.programs?.occlusion, this.frameBuffers.godrays);
            break;
          case Body.Earth:
          default:
            this.earth.drawOcclusion(renderer.projectionMatrix, camera.camMatrix, renderer?.postProcessingManager?.programs?.occlusion, this.frameBuffers.godrays);
            break;
        }

        // Draw a black object mesh on top of the sun in the godrays frame buffer
        if (
          !settingsManager.modelsOnSatelliteViewOverride &&
          (keepTrackApi.getPlugin(SelectSatManager)?.selectedSat ?? -1) > -1 &&
          keepTrackApi.getMainCamera().state.camDistBuffer <= settingsManager.nearZoomLevel
        ) {
          renderer.meshManager.drawOcclusion(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.programs.occlusion, this.frameBuffers.godrays);
        }

        // Add the godrays effect to the godrays frame buffer and then apply it to the postprocessing buffer two
        renderer.postProcessingManager.curBuffer = null;
        this.godrays.draw(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer);
      }

      this.skybox.render(renderer.postProcessingManager.curBuffer);

      if (!settingsManager.isDisablePlanets) {
        Object.values(this.planets).forEach((planet) => {
          planet.draw(this.sun.position, renderer.postProcessingManager.curBuffer);
        });
      }

      keepTrackApi.emit(EventBusEvent.drawOptionalScenery);
    }

    renderer.postProcessingManager.curBuffer = null;
  }

  private updateVisualsBasedOnPerformance_() {
    if ((!settingsManager.isDisablePlanets ||
      !settingsManager.isDisableGodrays ||
      settingsManager.isDrawSun ||
      settingsManager.isDrawAurora ||
      settingsManager.isDrawMilkyWay) &&
      Date.now() - this.updateVisualsBasedOnPerformanceTime_ > 10000 && // Only check every 10 seconds
      !Engine.isFpsAboveLimit(this.averageDrawTime as Milliseconds, 30)) {
      let isSettingsLeftToDisable = true;

      while (isSettingsLeftToDisable) {
        if (!settingsManager.isDisableGodrays) {
          settingsManager.isDisableGodrays = true;
          settingsManager.sizeOfSun = 1.65;
          settingsManager.isUseSunTexture = true;
          keepTrackApi.getUiManager().toast(t7e('errorMsgs.Scene.disablingGodrays'), ToastMsgType.caution);
          break;
        }
        if (settingsManager.isDrawAurora) {
          settingsManager.isDrawAurora = false;
          keepTrackApi.getUiManager().toast(t7e('errorMsgs.Scene.disablingAurora'), ToastMsgType.caution);
          break;
        }
        if (settingsManager.isDrawAtmosphere > 0) {
          settingsManager.isDrawAtmosphere = AtmosphereSettings.OFF;
          keepTrackApi.getUiManager().toast(t7e('errorMsgs.Scene.disablingAtmosphere'), ToastMsgType.caution);
          break;
        }
        if (!settingsManager.isDisablePlanets) {
          settingsManager.isDisablePlanets = true;
          keepTrackApi.getUiManager().toast(t7e('errorMsgs.Scene.disablingMoon'), ToastMsgType.caution);
          break;
        }
        if (settingsManager.isDrawMilkyWay) {
          settingsManager.isDrawMilkyWay = false;
          keepTrackApi.getUiManager().toast(t7e('errorMsgs.Scene.disablingMilkyWay'), ToastMsgType.caution);
          break;
        }
        if (settingsManager.isDrawSun) {
          settingsManager.isDrawSun = false;
          keepTrackApi.getUiManager().toast(t7e('errorMsgs.Scene.disablingSun'), ToastMsgType.caution);
          break;
        }
        isSettingsLeftToDisable = false;
      }

      // Create a timer that has to expire before the next performance check
      this.updateVisualsBasedOnPerformanceTime_ = Date.now();

      try {
        SettingsMenuPlugin?.syncOnLoad();
      } catch (error) {
        errorManagerInstance.log(error);
      }
    }
  }

  renderOpaque(renderer: WebGLRenderer, camera: Camera): void {
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    const hoverManagerInstance = keepTrackApi.getHoverManager();

    // Draw Earth
    this.earth.draw(renderer.postProcessingManager.curBuffer);

    // Draw Dots
    dotsManagerInstance.draw(renderer.projectionCameraMatrix, renderer.postProcessingManager.curBuffer);

    orbitManagerInstance.draw(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer, hoverManagerInstance, colorSchemeManagerInstance, camera);

    keepTrackApi.getLineManager().draw(null);

    // Draw Satellite Model if a satellite is selected and meshManager is loaded
    if ((keepTrackApi.getPlugin(SelectSatManager)?.selectedSat ?? -1) > -1) {
      if (!settingsManager.modelsOnSatelliteViewOverride && camera.state.camDistBuffer <= settingsManager.nearZoomLevel) {
        renderer.meshManager.draw(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer);
      }
    }
  }

  renderTransparent(renderer: WebGLRenderer, camera: Camera): void {
    const selectedSatelliteManager = keepTrackApi.getPlugin(SelectSatManager);

    if (!selectedSatelliteManager) {
      return;
    }

    if (selectedSatelliteManager.selectedSat > -1) {
      this.searchBox.draw(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer);
      this.primaryCovBubble.draw(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer);
    }
    if (selectedSatelliteManager.secondarySat > -1) {
      this.secondaryCovBubble.draw(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer);
    }
  }

  clear(): void {
    const gl = this.gl_;
    /*
     * NOTE: clearColor is set here because two different colors are used. If you set it during
     * frameBuffer init then the wrong color will be applied (this can break gpuPicking)
     */

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffers.gpuPicking);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (!settingsManager.isDisableGodrays) {
      // Clear the godrays Frame Buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffers.godrays);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    // Switch back to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /*
     * Only needed when doing post processing - otherwise just stay where we are
     * Setup Initial Frame Buffer for Offscreen Drawing
     * gl.bindFramebuffer(gl.FRAMEBUFFER, postProcessingManager.curBuffer);
     */
  }

  async loadScene(): Promise<void> {
    try {
      this.earth.init(this.gl_);
      keepTrackApi.emit(EventBusEvent.drawManagerLoadScene);
      await this.sun.init(this.gl_);

      if (!settingsManager.isDisableGodrays) {
        keepTrackApi.getScene().godrays?.init(this.gl_, this.sun);
      }

      if (!settingsManager.isDisableSearchBox) {
        this.searchBox.init(this.gl_);
      }
      if (!settingsManager.isDisableSkybox) {
        this.skybox.init(settingsManager, this.gl_);
      }
    } catch (error) {
      errorManagerInstance.log(error);
      // Errors aren't showing as toast messages
    }
  }
  // eslint-disable-next-line require-await
  async loadSceneLowPriority(): Promise<void> {
    try {
      if (!settingsManager.isDisablePlanets) {
        for (const planet of Object.values(this.planets)) {
          planet.init(this.gl_);
        }
      }
    } catch (error) {
      errorManagerInstance.log(error);
      // Errors aren't showing as toast messages
    }
  }
}
