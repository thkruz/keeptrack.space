import { GreenwichMeanSiderealTime } from 'ootk';
import { keepTrackApi } from '../keepTrackApi';
import { Camera } from './camera';
import { Box } from './draw-manager/cube';
import { Earth } from './draw-manager/earth';
import { Godrays } from './draw-manager/godrays';
import { Moon } from './draw-manager/moon';
import { SkyBoxSphere } from './draw-manager/skybox-sphere';
import { Sun } from './draw-manager/sun';
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
  searchBox: Box;
  frameBuffers: {
    gpuPicking: WebGLFramebuffer;
    godrays: WebGLFramebuffer;
  } = {
    gpuPicking: null,
    godrays: null,
  };

  constructor(params: SceneParams) {
    this.gl_ = params.gl;
    this.background = params?.background;

    this.skybox = new SkyBoxSphere();
    this.earth = new Earth();
    this.moon = new Moon();
    this.sun = new Sun();
    this.godrays = new Godrays();
    this.searchBox = new Box();
  }

  init(gl: WebGL2RenderingContext): void {
    this.gl_ = gl;
    this.skybox.init(settingsManager, gl);
  }

  update(simulationTime: Date, gmst: GreenwichMeanSiderealTime, j: number) {
    this.sun.update(j);
    this.earth.update(gmst, j);
    this.moon.update(simulationTime, gmst);
    this.skybox.update();
  }

  render(renderer: WebGLRenderer, camera: Camera): void {
    this.clear();

    this.renderBackground(renderer, camera);
    this.renderOpaque(renderer, camera);
    this.renderTransparent(renderer, camera);
  }

  renderBackground(renderer: WebGLRenderer, camera: Camera): void {
    if (!settingsManager.isDrawLess) {
      if (settingsManager.isDrawSun) {
        // Draw the Sun to the Godrays Frame Buffer
        this.sun.draw(this.earth.lightDirection, this.frameBuffers.godrays);

        // Draw a black earth mesh on top of the sun in the godrays frame buffer
        this.earth.drawOcclusion(renderer.projectionMatrix, camera.camMatrix, renderer?.postProcessingManager?.programs?.occlusion, this.frameBuffers.godrays);

        // Draw a black mesh on top of the sun in the godrays frame buffer
        if (
          !settingsManager.modelsOnSatelliteViewOverride &&
          keepTrackApi.getCatalogManager().selectedSat !== -1 &&
          keepTrackApi.getMainCamera().camDistBuffer <= settingsManager.nearZoomLevel
        ) {
          renderer.meshManager.drawOcclusion(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.programs.occlusion, this.frameBuffers.godrays);
        }

        // Add the godrays effect to the godrays frame buffer and then apply it to the postprocessing buffer two
        renderer.postProcessingManager.curBuffer = null;
        this.godrays.draw(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer);
      }

      this.skybox.render(renderer.postProcessingManager.curBuffer);

      // Apply two pass gaussian blur to the godrays to smooth them out
      // postProcessingManager.programs.gaussian.uniformValues.radius = 2.0;
      // postProcessingManager.programs.gaussian.uniformValues.dir = { x: 1.0, y: 0.0 };
      // postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, postProcessingManager.secBuffer);
      // postProcessingManager.switchFrameBuffer();
      // postProcessingManager.programs.gaussian.uniformValues.dir = { x: 0.0, y: 1.0 };
      // // After second pass apply the results to the canvas
      // postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, null);

      // Draw the moon
      if (!settingsManager.isDisableMoon) {
        this.moon.draw(this.sun.position);
      }

      keepTrackApi.methods.drawOptionalScenery();
    }

    renderer.postProcessingManager.curBuffer = null;
  }

  // eslint-disable-next-line class-methods-use-this
  renderOpaque(renderer: WebGLRenderer, camera: Camera): void {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    const hoverManagerInstance = keepTrackApi.getHoverManager();

    // Draw Earth
    this.earth.draw(renderer.postProcessingManager.curBuffer);

    // Draw Dots
    dotsManagerInstance.draw(renderer.projectionCameraMatrix, renderer.postProcessingManager.curBuffer);

    orbitManagerInstance.draw(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer, hoverManagerInstance, colorSchemeManagerInstance, camera);

    // Draw a cone
    // this.sceneManager.cone.draw(this.pMatrix, mainCamera.camMatrix);

    keepTrackApi.getLineManager().draw(renderer, dotsManagerInstance.inViewData, camera.camMatrix, null);

    // Draw Satellite Model if a satellite is selected and meshManager is loaded
    if (catalogManagerInstance.selectedSat !== -1) {
      if (!settingsManager.modelsOnSatelliteViewOverride && camera.camDistBuffer <= settingsManager.nearZoomLevel) {
        renderer.meshManager.draw(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer);
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  renderTransparent(renderer: WebGLRenderer, camera: Camera): void {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    if (catalogManagerInstance.selectedSat !== -1) {
      this.searchBox.draw(renderer.projectionMatrix, camera.camMatrix, renderer.postProcessingManager.curBuffer);
    }
  }

  clear(): void {
    const gl = this.gl_;
    // NOTE: clearColor is set here because two different colors are used. If you set it during
    // frameBuffer init then the wrong color will be applied (this can break gpuPicking)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffers.gpuPicking);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Clear the godrays Frame Buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffers.godrays);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Switch back to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Only needed when doing post processing - otherwise just stay where we are
    // Setup Initial Frame Buffer for Offscreen Drawing
    // gl.bindFramebuffer(gl.FRAMEBUFFER, postProcessingManager.curBuffer);
  }

  async loadScene(): Promise<void> {
    try {
      // await tools.init();
      await this.earth.init(settingsManager, this.gl_);
      keepTrackApi.methods.drawManagerLoadScene();
      await this.sun.init(this.gl_);
      await keepTrackApi.getScene().godrays?.init(this.gl_, this.sun);
      if (!settingsManager.isDisableMoon) {
        await this.moon.init(this.gl_);
      }
      await this.searchBox.init(this.gl_);
      if (!settingsManager.isDisableSkybox) {
        await this.skybox.init(settingsManager, this.gl_);
      }
      // await sceneManager.cone.init();
    } catch (error) {
      console.debug(error);
    }
  }
}
