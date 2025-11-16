import { SolarBody, ToastMsgType } from '@app/engine/core/interfaces';
import { t7e } from '@app/locales/keys';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { Milliseconds } from '@ootk/src/main';
import { Camera } from '../camera/camera';
import { Engine } from '../engine';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { CelestialBody } from '../rendering/draw-manager/celestial-bodies/celestial-body';
import { DwarfPlanet } from '../rendering/draw-manager/celestial-bodies/dwarf-planet';
import { Jupiter } from '../rendering/draw-manager/celestial-bodies/jupiter';
import { Makemake } from '../rendering/draw-manager/celestial-bodies/makemake';
import { Mars } from '../rendering/draw-manager/celestial-bodies/mars';
import { Mercury } from '../rendering/draw-manager/celestial-bodies/mercury';
import { Moon } from '../rendering/draw-manager/celestial-bodies/moon';
import { Neptune } from '../rendering/draw-manager/celestial-bodies/neptune';
import { Pluto } from '../rendering/draw-manager/celestial-bodies/pluto';
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
import { PluginRegistry } from './plugin-registry';
import { ServiceLocator } from './service-locator';

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
    [SolarBody.Mars]: Mars;
    [SolarBody.Mercury]: Mercury;
    [SolarBody.Venus]: Venus;
    [SolarBody.Jupiter]: Jupiter;
    [SolarBody.Saturn]: CelestialBody;
    [SolarBody.Uranus]: CelestialBody;
    [SolarBody.Neptune]: CelestialBody;
  };
  moons: {
    [SolarBody.Moon]: Moon;
    [SolarBody.Io]?: CelestialBody;
    [SolarBody.Europa]?: CelestialBody;
    [SolarBody.Ganymede]?: CelestialBody;
    [SolarBody.Callisto]?: CelestialBody;
    [SolarBody.Titan]?: CelestialBody;
    [SolarBody.Rhea]?: CelestialBody;
    [SolarBody.Iapetus]?: CelestialBody;
    [SolarBody.Dione]?: CelestialBody;
    [SolarBody.Tethys]?: CelestialBody;
    [SolarBody.Enceladus]?: CelestialBody;
  };
  dwarfPlanets: {
    [SolarBody.Makemake]?: DwarfPlanet;
    [SolarBody.Pluto]?: CelestialBody;
    [SolarBody.Eris]?: CelestialBody;
    [SolarBody.Haumea]?: CelestialBody;
    [SolarBody.Ceres]?: CelestialBody;
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
      [SolarBody.Mars]: new Mars(),
      [SolarBody.Mercury]: new Mercury(),
      [SolarBody.Venus]: new Venus(),
      [SolarBody.Jupiter]: new Jupiter(),
      [SolarBody.Saturn]: new Saturn(),
      [SolarBody.Uranus]: new Uranus(),
      [SolarBody.Neptune]: new Neptune(),
    };
    this.dwarfPlanets = {
      [SolarBody.Makemake]: new Makemake(),
      [SolarBody.Pluto]: new Pluto(),
    };
    this.moons = {
      [SolarBody.Moon]: new Moon(),
    };
    this.sun = new Sun();
    this.godrays = new Godrays();
    this.searchBox = new Box();
    this.searchBox.setColor([1, 0, 0, 0.3]);
    this.primaryCovBubble = new Ellipsoid(([0, 0, 0]));
    this.secondaryCovBubble = new Ellipsoid(([0, 0, 0]));
    this.sensorFovFactory = new SensorFovMeshFactory();
    this.coneFactory = new ConeMeshFactory();

    EventBus.getInstance().emit(EventBusEvent.SceneReady);
  }

  update(simulationTime: Date) {
    this.sun.updateEci();
    this.updateWorldShift();
    this.sun.update();
    this.earth.update();
    for (const planet of Object.values(this.planets)) {
      planet.update(simulationTime);
    }
    for (const moon of Object.values(this.moons)) {
      moon.update(simulationTime);
    }
    for (const dwarfPlanet of Object.values(this.dwarfPlanets)) {
      dwarfPlanet.update(simulationTime);
    }
    this.skybox.update();

    ServiceLocator.getLineManager().update();

    this.sensorFovFactory.updateAll();
    this.coneFactory.updateAll();
  }

  updateWorldShift() {
    switch (settingsManager.centerBody) {
      case SolarBody.Mercury:
      case SolarBody.Venus:
      case SolarBody.Moon:
      case SolarBody.Mars:
      case SolarBody.Jupiter:
      case SolarBody.Saturn:
      case SolarBody.Uranus:
      case SolarBody.Neptune:
        this.worldShift = (this.getBodyById(settingsManager.centerBody)!.position as [number, number, number]).map((coord: number) => -coord) as [number, number, number];
        break;
      case SolarBody.Pluto:
      case SolarBody.Makemake:
        this.worldShift = (this.dwarfPlanets[settingsManager.centerBody]!.position as [number, number, number]).map((coord: number) => -coord) as [number, number, number];
        break;
      case SolarBody.Sun:
        this.worldShift = [this.sun.eci.x, this.sun.eci.y, this.sun.eci.z].map((coord: number) => -coord) as [number, number, number];
        break;
      case SolarBody.Earth:
      default:
        this.worldShift = [0, 0, 0];
    }

    // Satellite position is ALWAYS relative to Earth center and selecting a
    // satellite should have changed the centerBody to Earth already
    const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

    if (selectSatManager && selectSatManager.primarySatObj.id !== -1) {
      const satelliteOffset = ServiceLocator.getDotsManager().getPositionArray(selectSatManager.primarySatObj.id).map((coord) => -coord);

      this.worldShift = satelliteOffset as [number, number, number];
    }
  }

  render(renderer: WebGLRenderer, camera: Camera): void {
    this.clear();

    this.renderBackground(renderer, camera);
    this.renderOpaque(renderer, camera);
    this.renderTransparent(renderer, camera);

    this.sensorFovFactory.drawAll(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer as WebGLBuffer);
    this.coneFactory.drawAll(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer as WebGLBuffer);
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

        const sceneManager = ServiceLocator.getScene();
        const centerBodyEntity = sceneManager.getBodyById(settingsManager.centerBody);

        // Draw a black earth mesh on top of the sun in the godrays frame buffer
        if (centerBodyEntity?.drawOcclusion) {
          centerBodyEntity?.drawOcclusion(
            camera.projectionMatrix, camera.matrixWorldInverse, renderer?.postProcessingManager?.programs?.occlusion, this.frameBuffers.godrays,
          );
        }

        if (settingsManager.centerBody === SolarBody.Earth) {
          sceneManager.getBodyById(SolarBody.Moon)?.drawOcclusion(
            camera.projectionMatrix, camera.matrixWorldInverse, renderer?.postProcessingManager?.programs?.occlusion, this.frameBuffers.godrays,
          );
        }

        if (settingsManager.centerBody === SolarBody.Moon) {
          this.earth.drawOcclusion(
            camera.projectionMatrix, camera.matrixWorldInverse, renderer?.postProcessingManager?.programs?.occlusion, this.frameBuffers.godrays,
          );
        }

        // Draw a black object mesh on top of the sun in the godrays frame buffer
        if (
          !settingsManager.modelsOnSatelliteViewOverride &&
          (PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1) > -1 &&
          ServiceLocator.getMainCamera().state.camDistBuffer <= settingsManager.nearZoomLevel
        ) {
          renderer.meshManager.drawOcclusion(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.programs.occlusion, this.frameBuffers.godrays);
        }

        // Add the godrays effect to the godrays frame buffer and then apply it to the postprocessing buffer two
        renderer.postProcessingManager.curBuffer = null;
        this.godrays.draw(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer);
      }

      this.skybox.render(renderer.postProcessingManager.curBuffer);

      if (!settingsManager.isDisablePlanets) {
        if (settingsManager.centerBody !== SolarBody.Earth && settingsManager.centerBody !== SolarBody.Sun) {
          this.getBodyById(settingsManager.centerBody)?.draw(this.sun.position, renderer.postProcessingManager.curBuffer);
        }

        if (settingsManager.centerBody === SolarBody.Earth || settingsManager.centerBody === SolarBody.Moon) {
          this.earth.draw(renderer.postProcessingManager.curBuffer);
          this.getBodyById(SolarBody.Moon)?.draw(this.sun.position, renderer.postProcessingManager.curBuffer);
        }
      }

      EventBus.getInstance().emit(EventBusEvent.drawOptionalScenery);
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
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.Scene.disablingGodrays'), ToastMsgType.caution);
          break;
        }
        if (settingsManager.isDrawAurora) {
          settingsManager.isDrawAurora = false;
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.Scene.disablingAurora'), ToastMsgType.caution);
          break;
        }
        if (settingsManager.isDrawAtmosphere > 0) {
          settingsManager.isDrawAtmosphere = AtmosphereSettings.OFF;
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.Scene.disablingAtmosphere'), ToastMsgType.caution);
          break;
        }
        if (!settingsManager.isDisablePlanets) {
          settingsManager.isDisablePlanets = true;
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.Scene.disablingMoon'), ToastMsgType.caution);
          break;
        }
        if (settingsManager.isDrawMilkyWay) {
          settingsManager.isDrawMilkyWay = false;
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.Scene.disablingMilkyWay'), ToastMsgType.caution);
          break;
        }
        if (settingsManager.isDrawSun) {
          settingsManager.isDrawSun = false;
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.Scene.disablingSun'), ToastMsgType.caution);
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
    const dotsManagerInstance = ServiceLocator.getDotsManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();
    const orbitManagerInstance = ServiceLocator.getOrbitManager();
    const hoverManagerInstance = ServiceLocator.getHoverManager();

    // Draw Earth
    this.earth.draw(renderer.postProcessingManager.curBuffer);

    // Draw Dots
    dotsManagerInstance.draw(renderer.projectionCameraMatrix, renderer.postProcessingManager.curBuffer);

    orbitManagerInstance.draw(renderer.projectionCameraMatrix, renderer.postProcessingManager.curBuffer, hoverManagerInstance, colorSchemeManagerInstance, camera);

    ServiceLocator.getLineManager().draw(renderer.projectionCameraMatrix, renderer.postProcessingManager.curBuffer);

    // Draw Satellite Model if a satellite is selected and meshManager is loaded
    if ((PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1) > -1) {
      if (!settingsManager.modelsOnSatelliteViewOverride && camera.state.camDistBuffer <= settingsManager.nearZoomLevel) {
        renderer.meshManager.draw(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer);
      }
    }
  }

  renderTransparent(renderer: WebGLRenderer, camera: Camera): void {
    const selectedSatelliteManager = PluginRegistry.getPlugin(SelectSatManager);

    if (!selectedSatelliteManager) {
      return;
    }

    if (selectedSatelliteManager.selectedSat > -1) {
      this.searchBox.draw(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer);
      this.primaryCovBubble.draw(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer);
    }
    if (selectedSatelliteManager.secondarySat > -1) {
      this.secondaryCovBubble.draw(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer);
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

  getBodyById(solarBody: SolarBody): CelestialBody | Earth | null {
    switch (solarBody) {
      case SolarBody.Earth:
        return this.earth;
      case SolarBody.Moon:
        return this.moons[SolarBody.Moon] ?? null;
      case SolarBody.Mercury:
      case SolarBody.Venus:
      case SolarBody.Mars:
      case SolarBody.Jupiter:
      case SolarBody.Saturn:
      case SolarBody.Uranus:
      case SolarBody.Neptune:
        return this.planets[solarBody] ?? null;
      case SolarBody.Pluto:
      case SolarBody.Makemake:
        return this.dwarfPlanets[solarBody] ?? null;
      case SolarBody.Sun:
        return this.sun as unknown as CelestialBody;
      default:
        return null;
    }
  }

  async loadScene(): Promise<void> {
    try {
      this.earth.init(this.gl_);
      EventBus.getInstance().emit(EventBusEvent.drawManagerLoadScene);
      await this.sun.init(this.gl_);

      if (!settingsManager.isDisableGodrays) {
        ServiceLocator.getScene().godrays?.init(this.gl_, this.sun);
      }

      if (!settingsManager.isDisablePlanets) {
        for (const planet of Object.values(this.planets)) {
          planet.init(this.gl_);
        }
        for (const moon of Object.values(this.moons)) {
          moon.init(this.gl_);
        }
        for (const dwarfPlanet of Object.values(this.dwarfPlanets)) {
          dwarfPlanet.init(this.gl_);
        }
      }

      if (!settingsManager.isDisableSearchBox) {
        this.searchBox.init(this.gl_);
      }
      if (!settingsManager.isDisableSkybox) {
        this.skybox.init(this.gl_);
      }
    } catch (error) {
      errorManagerInstance.log(error);
      // Errors aren't showing as toast messages
    }
  }
}
