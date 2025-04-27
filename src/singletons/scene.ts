import { KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { KeepTrack } from '@app/keeptrack';
import { t7e } from '@app/locales/keys';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { GreenwichMeanSiderealTime, Milliseconds } from 'ootk';
import { keepTrackApi } from '../keepTrackApi';
import { Camera } from './camera';
import { ConeMeshFactory } from './draw-manager/cone-mesh-factory';
import { Box } from './draw-manager/cube';
import { Earth } from './draw-manager/earth';
import { Ellipsoid } from './draw-manager/ellipsoid';
import { Godrays } from './draw-manager/godrays';
import { Moon } from './draw-manager/moon';
import { SensorFovMeshFactory } from './draw-manager/sensor-fov-mesh-factory';
import { SkyBoxSphere } from './draw-manager/skybox-sphere';
import { Sun } from './draw-manager/sun';
import { errorManagerInstance } from './errorManager';
import { WebGLRenderer } from './webgl-renderer';

export interface SceneParams {
  gl: WebGL2RenderingContext;
  background?: WebGLTexture;
}

export class Scene {
  private gl_: WebGL2RenderingContext;
  background: WebGLTexture;
  skybox: SkyBoxSphere;
  isScene = true;
  earth: Earth;
  moon: Moon;
  sun: Sun;
  godrays: Godrays;
  sensorFovFactory: SensorFovMeshFactory;
  coneFactory: ConeMeshFactory;
  /** The pizza box shaped search around a satellite. */
  searchBox: Box;
  frameBuffers = {
    gpuPicking: null as WebGLFramebuffer,
    godrays: null as WebGLFramebuffer,
  };
  updateVisualsBasedOnPerformanceTime_ = 0;
  primaryCovBubble: Ellipsoid;
  secondaryCovBubble: Ellipsoid;

  constructor(params: SceneParams) {
    this.gl_ = params.gl;
    this.background = params?.background;

    this.skybox = new SkyBoxSphere();
    this.earth = new Earth();
    this.moon = new Moon();
    this.sun = new Sun();
    this.godrays = new Godrays();
    this.searchBox = new Box();
    this.searchBox.setColor([1, 0, 0, 0.3]);
    this.primaryCovBubble = new Ellipsoid(([0, 0, 0]));
    this.secondaryCovBubble = new Ellipsoid(([0, 0, 0]));
    this.sensorFovFactory = new SensorFovMeshFactory();
    this.coneFactory = new ConeMeshFactory();
  }

  init(gl: WebGL2RenderingContext): void {
    this.gl_ = gl;
    this.skybox.init(settingsManager, gl);
  }

  update(simulationTime: Date, gmst: GreenwichMeanSiderealTime, j: number) {
    this.sun.update(j);
    this.earth.update(gmst);
    this.moon.update(simulationTime);
    this.skybox.update();

    keepTrackApi.getLineManager().update();

    this.sensorFovFactory.updateAll(gmst);
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
        this.earth.drawOcclusion(renderer.projectionMatrix, camera.camMatrix, renderer?.postProcessingManager?.programs?.occlusion, this.frameBuffers.godrays);

        // Draw a black object mesh on top of the sun in the godrays frame buffer
        if (
          !settingsManager.modelsOnSatelliteViewOverride &&
          (keepTrackApi.getPlugin(SelectSatManager)?.selectedSat ?? -1) > -1 &&
          keepTrackApi.getMainCamera().camDistBuffer <= settingsManager.nearZoomLevel
        ) {
          renderer.meshManager.drawOcclusion(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.programs.occlusion, this.frameBuffers.godrays);
        }

        // Add the godrays effect to the godrays frame buffer and then apply it to the postprocessing buffer two
        renderer.postProcessingManager.curBuffer = null;
        this.godrays.draw(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer);
      }

      this.skybox.render(renderer.postProcessingManager.curBuffer);

      // Draw the moon
      if (!settingsManager.isDisableMoon) {
        this.moon.draw(this.sun.position);
      }

      keepTrackApi.runEvent(KeepTrackApiEvents.drawOptionalScenery);
    }

    renderer.postProcessingManager.curBuffer = null;
  }

  private updateVisualsBasedOnPerformance_() {
    if ((!settingsManager.isDisableMoon ||
      !settingsManager.isDisableGodrays ||
      settingsManager.isDrawSun ||
      settingsManager.isDrawAurora ||
      settingsManager.isDrawMilkyWay) &&
      Date.now() - this.updateVisualsBasedOnPerformanceTime_ > 10000 && // Only check every 10 seconds
      !KeepTrack.isFpsAboveLimit(this.averageDrawTime as Milliseconds, 30)) {
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
        if (settingsManager.isDrawAtmosphere) {
          settingsManager.isDrawAtmosphere = false;
          keepTrackApi.getUiManager().toast(t7e('errorMsgs.Scene.disablingAtmosphere'), ToastMsgType.caution);
          break;
        }
        if (!settingsManager.isDisableMoon) {
          settingsManager.isDisableMoon = true;
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

  // eslint-disable-next-line class-methods-use-this
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
      if (!settingsManager.modelsOnSatelliteViewOverride && camera.camDistBuffer <= settingsManager.nearZoomLevel) {
        renderer.meshManager.draw(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer);
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
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
      this.earth.init(settingsManager, this.gl_);
      keepTrackApi.runEvent(KeepTrackApiEvents.drawManagerLoadScene);
      await this.sun.init(this.gl_);

      if (!settingsManager.isDisableGodrays) {
        keepTrackApi.getScene().godrays?.init(this.gl_, this.sun);
      }

      if (!settingsManager.isDisableMoon) {
        await this.moon.init(this.gl_);
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
}
