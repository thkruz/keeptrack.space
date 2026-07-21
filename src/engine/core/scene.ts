import { SolarBody, ToastMsgType } from '@app/engine/core/interfaces';
import { t7e } from '@app/locales/keys';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { Milliseconds } from '@ootk/src/main';
import { Camera } from '../camera/camera';
import { CameraType } from '../camera/camera-type';
import { Engine } from '../engine';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { CelestialBody } from '../rendering/draw-manager/celestial-bodies/celestial-body';
import { Ceres } from '../rendering/draw-manager/celestial-bodies/ceres';
import { Charon } from '../rendering/draw-manager/celestial-bodies/charon';
import { DeepSpaceSatellite } from '../rendering/draw-manager/celestial-bodies/deep-space-satellite';
import { createDeepSpaceSatellites, loadDeepSpaceSatelliteData } from '../rendering/draw-manager/celestial-bodies/deep-space-satellite-catalog';
import { DwarfPlanet } from '../rendering/draw-manager/celestial-bodies/dwarf-planet';
import { Eris } from '../rendering/draw-manager/celestial-bodies/eris';
import { Gonggong } from '../rendering/draw-manager/celestial-bodies/gonggong';
import { Haumea } from '../rendering/draw-manager/celestial-bodies/haumea';
import { Jupiter } from '../rendering/draw-manager/celestial-bodies/jupiter';
import { Makemake } from '../rendering/draw-manager/celestial-bodies/makemake';
import { Mars } from '../rendering/draw-manager/celestial-bodies/mars';
import { Mercury } from '../rendering/draw-manager/celestial-bodies/mercury';
import { Moon } from '../rendering/draw-manager/celestial-bodies/moon';
import { Neptune } from '../rendering/draw-manager/celestial-bodies/neptune';
import { Orcus } from '../rendering/draw-manager/celestial-bodies/orcus';
import { Pluto } from '../rendering/draw-manager/celestial-bodies/pluto';
import { Quaoar } from '../rendering/draw-manager/celestial-bodies/quaoar';
import { Saturn } from '../rendering/draw-manager/celestial-bodies/saturn';
import { Sedna } from '../rendering/draw-manager/celestial-bodies/sedna';
import { Uranus } from '../rendering/draw-manager/celestial-bodies/uranus';
import { Venus } from '../rendering/draw-manager/celestial-bodies/venus';
import { ConeMeshFactory } from '../rendering/draw-manager/cone-mesh-factory';
import { Box } from '../rendering/draw-manager/cube';
import { Earth } from '../rendering/draw-manager/earth';
import { AtmosphereSettings } from '../rendering/draw-manager/earth-quality-enums';
import { Ellipsoid } from '../rendering/draw-manager/ellipsoid';
import { FrustumMeshFactory } from '../rendering/draw-manager/frustum-mesh-factory';
import { Godrays } from '../rendering/draw-manager/godrays';
import { SensorFovMeshFactory } from '../rendering/draw-manager/sensor-fov-mesh-factory';
import { SkyBoxSphere } from '../rendering/draw-manager/skybox-sphere';
import { Sun } from '../rendering/draw-manager/sun';
import { WorldMarkers } from '../rendering/draw-manager/world-markers';
import { WebGLRenderer } from '../rendering/webgl-renderer';
import { errorManagerInstance } from '../utils/errorManager';
import { FrameProfiler, GpuStage } from '../utils/frame-profiler';
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
    [SolarBody.Pluto]?: DwarfPlanet;
    [SolarBody.Eris]?: DwarfPlanet;
    [SolarBody.Haumea]?: DwarfPlanet;
    [SolarBody.Ceres]?: DwarfPlanet;
    [SolarBody.Sedna]?: DwarfPlanet;
    [SolarBody.Quaoar]?: DwarfPlanet;
    [SolarBody.Orcus]?: DwarfPlanet;
    [SolarBody.Gonggong]?: DwarfPlanet;
    [SolarBody.Charon]?: DwarfPlanet;
  };
  deepSpaceSatellites: Record<string, DeepSpaceSatellite>;
  sun: Sun;
  godrays: Godrays;
  worldMarkers: WorldMarkers;
  sensorFovFactory: SensorFovMeshFactory;
  coneFactory: ConeMeshFactory;
  frustumFactory: FrustumMeshFactory;
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

  /** worldShift before any override is applied; used to re-resolve worldShift per camera pass. */
  private worldShiftBase_: [number, number, number] = [0, 0, 0];

  /**
   * Scene-wide override for worldShift (e.g. offscreen captures that own the whole canvas).
   * Per-view overrides belong on Camera.worldShiftOverride instead.
   */
  worldShiftOverride: [number, number, number] | null = null;
  /**
   * Scene-wide override for gl.clearColor. Per-view overrides belong on
   * Camera.clearColorOverride instead.
   */
  clearColorOverride: [number, number, number, number] | null = null;

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
      [SolarBody.Ceres]: new Ceres(),
      [SolarBody.Haumea]: new Haumea(),
      [SolarBody.Eris]: new Eris(),
      [SolarBody.Sedna]: new Sedna(),
      [SolarBody.Quaoar]: new Quaoar(),
      [SolarBody.Orcus]: new Orcus(),
      [SolarBody.Gonggong]: new Gonggong(),
      [SolarBody.Charon]: new Charon(),
    };
    this.moons = {
      [SolarBody.Moon]: new Moon(),
    };
    this.deepSpaceSatellites = createDeepSpaceSatellites();
    this.sun = new Sun();
    this.godrays = new Godrays();
    this.worldMarkers = new WorldMarkers();
    this.searchBox = new Box();
    this.searchBox.setColor([1, 0, 0, 0.3]);
    this.primaryCovBubble = new Ellipsoid([0, 0, 0]);
    this.secondaryCovBubble = new Ellipsoid([0, 0, 0]);
    this.sensorFovFactory = new SensorFovMeshFactory();
    this.coneFactory = new ConeMeshFactory();
    this.frustumFactory = new FrustumMeshFactory();

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
    for (const deepSpaceSat of Object.values(this.deepSpaceSatellites)) {
      deepSpaceSat.update(simulationTime);
    }
    this.skybox.update();

    ServiceLocator.getLineManager().update();

    this.sensorFovFactory.updateAll();
    this.coneFactory.updateAll();
    this.frustumFactory.updateAll();
  }

  updateWorldShift() {
    this.updateWorldShiftBase_();
    this.applyWorldShiftForCamera(ServiceLocator.getMainCamera());
  }

  /**
   * Re-resolves the effective worldShift for the camera about to render.
   * Scene-wide overrides (offscreen captures) win, then the camera's own
   * override (2D modes), then the computed base value.
   */
  applyWorldShiftForCamera(camera: Camera | null): void {
    const override = this.worldShiftOverride ?? camera?.worldShiftOverride ?? null;

    this.worldShift = override ? [...override] : [...this.worldShiftBase_];
  }

  /**
   * Sets the frame's base world shift (satellite tracking writes this every
   * frame) and immediately re-resolves the effective shift for the main
   * camera. Update-time consumers (mesh positions, Earth's model matrix) must
   * bake the SAME value that render passes later read, or panes desync.
   */
  setWorldShiftBase(base: [number, number, number]): void {
    this.worldShiftBase_ = base;
    this.applyWorldShiftForCamera(ServiceLocator.getMainCamera());
  }

  private updateWorldShiftBase_() {
    switch (settingsManager.centerBody) {
      case SolarBody.Mercury:
      case SolarBody.Venus:
      case SolarBody.Moon:
      case SolarBody.Mars:
      case SolarBody.Jupiter:
      case SolarBody.Saturn:
      case SolarBody.Uranus:
      case SolarBody.Neptune:
        this.worldShiftBase_ = (this.getBodyById(settingsManager.centerBody)!.position as [number, number, number]).map((coord: number) => -coord) as [number, number, number];
        break;
      case SolarBody.Pluto:
      case SolarBody.Makemake:
      case SolarBody.Ceres:
      case SolarBody.Haumea:
      case SolarBody.Eris:
      case SolarBody.Sedna:
      case SolarBody.Quaoar:
      case SolarBody.Orcus:
      case SolarBody.Gonggong:
      case SolarBody.Charon:
        this.worldShiftBase_ = (this.dwarfPlanets[settingsManager.centerBody]!.position as [number, number, number]).map((coord: number) => -coord) as [number, number, number];
        break;
      case SolarBody.Sun:
        this.worldShiftBase_ = [this.sun.eci.x, this.sun.eci.y, this.sun.eci.z].map((coord: number) => -coord) as [number, number, number];
        break;
      case SolarBody.Earth:
        this.worldShiftBase_ = [0, 0, 0];
        break;
      default:
        if (this.deepSpaceSatellites?.[settingsManager.centerBody]) {
          const sat = this.deepSpaceSatellites[settingsManager.centerBody];

          this.worldShiftBase_ = (sat.position as [number, number, number]).map((coord: number) => -coord) as [number, number, number];
        } else {
          this.worldShiftBase_ = [0, 0, 0];
        }
    }

    // Satellite position is ALWAYS relative to Earth center and selecting a
    // satellite should have changed the centerBody to Earth already
    const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

    if (selectSatManager && selectSatManager.primarySatObj.id !== -1) {
      // Use the RENDERED dot position (ground rotation applied), not the raw stored
      // positionData. For a low-altitude missile the two differ by the dots shader's
      // (currentGmst - cruncherGmst) rotation; centering on the raw value put the
      // selected object off-screen-center during boost and snapped it back once the
      // missile climbed past the ground-rotation radius. No-op above that radius, so
      // satellites are unaffected. This runs per frame and is the authoritative
      // world-shift for the selected object.
      const satelliteOffset = ServiceLocator.getDotsManager()
        .getRenderedPositionArray(selectSatManager.primarySatObj.id)
        .map((coord) => -coord);

      this.worldShiftBase_ = satelliteOffset as [number, number, number];
    }
  }

  render(renderer: WebGLRenderer, camera: Camera): void {
    this.clear(camera);

    const profiler = FrameProfiler.getInstance();

    this.renderBackground(renderer, camera);
    this.renderOpaque(renderer, camera);

    EventBus.getInstance().emit(EventBusEvent.drawOverlay);

    profiler.beginGpu(GpuStage.transparent);
    this.renderTransparent(renderer, camera);
    profiler.endGpu(GpuStage.transparent);

    profiler.beginGpu(GpuStage.fov);
    this.sensorFovFactory.drawAll(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer as WebGLBuffer);
    this.coneFactory.drawAll(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer as WebGLBuffer);
    this.frustumFactory.drawAll(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer as WebGLBuffer);
    profiler.endGpu(GpuStage.fov);
  }

  averageDrawTime = 0;
  drawTimeArray: number[] = new Array(150).fill(16);

  /**
   * Set when renderBackground rendered the earth surface for the current pass, so
   * renderOpaque draws only the remaining atmosphere shell instead of a second
   * full earth. Reset at the top of every renderBackground (each viewport pass
   * runs its own background→opaque pair).
   */
  private isEarthSurfaceDrawnInBackground_ = false;

  renderBackground(renderer: WebGLRenderer, camera: Camera): void {
    this.isEarthSurfaceDrawnInBackground_ = false;
    this.drawTimeArray.push(Math.min(100, renderer.dt));
    if (this.drawTimeArray.length > 150) {
      this.drawTimeArray.shift();
    }
    this.averageDrawTime = this.drawTimeArray.reduce((a, b) => a + b, 0) / this.drawTimeArray.length;

    this.updateVisualsBasedOnPerformance_();

    const profiler = FrameProfiler.getInstance();

    // Plugin-provided background renderer (e.g. flat map mode)
    profiler.beginGpu(GpuStage.customBackground);
    const isCustomBackground = EventBus.getInstance().methods.renderCustomBackground();

    profiler.endGpu(GpuStage.customBackground);
    if (isCustomBackground) {
      return; // Plugin handled background rendering
    }

    // Sun/godrays only render in the main pane; their screen-space compositing
    // assumes the full canvas and produces artifacts in small scissored panes
    const isSecondaryPass = ServiceLocator.getViewportManager()?.isSecondaryRenderPass() ?? false;

    if (!settingsManager.isDrawLess) {
      if (settingsManager.isDrawSun && !isSecondaryPass) {
        // A dead/never-initialized godrays must degrade to the plain sun path —
        // its stale framebuffer would otherwise swallow the sun entirely.
        const fb = settingsManager.isDisableGodrays || !this.godrays ? null : this.frameBuffers.godrays;

        // Draw the Sun to the Godrays Frame Buffer
        profiler.beginGpu(GpuStage.sun);
        this.sun.draw(this.earth.lightDirection, fb);
        profiler.endGpu(GpuStage.sun);

        // Occlusion passes exist ONLY to mask the sun inside the godrays buffer.
        // With godrays off/dead (fb === null) they must not run: binding the
        // missing FBO falls back to the DEFAULT framebuffer and paints black
        // occlusion meshes over the visible scene.
        if (fb) {
          const sceneManager = ServiceLocator.getScene();
          const centerBodyEntity = sceneManager.getBodyById(settingsManager.centerBody);

          profiler.beginGpu(GpuStage.occlusion);

          // Draw a black earth mesh on top of the sun in the godrays frame buffer
          // Skip in astronomy mode since Earth is hidden
          if (centerBodyEntity?.drawOcclusion && camera.cameraType !== CameraType.ASTRONOMY && camera.cameraType !== CameraType.PLANETARIUM) {
            centerBodyEntity?.drawOcclusion(camera.projectionMatrix, camera.matrixWorldInverse, renderer?.postProcessingManager?.programs?.occlusion, this.frameBuffers.godrays);
          }

          if (settingsManager.centerBody === SolarBody.Earth) {
            sceneManager
              .getBodyById(SolarBody.Moon)
              ?.drawOcclusion(camera.projectionMatrix, camera.matrixWorldInverse, renderer?.postProcessingManager?.programs?.occlusion, this.frameBuffers.godrays);
          }

          if (settingsManager.centerBody === SolarBody.Moon) {
            this.earth.drawOcclusion(camera.projectionMatrix, camera.matrixWorldInverse, renderer?.postProcessingManager?.programs?.occlusion, this.frameBuffers.godrays);
          }

          // Draw a black object mesh on top of the sun in the godrays frame buffer
          if (
            !settingsManager.modelsOnSatelliteViewOverride &&
            Number(PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1) > -1 &&
            ServiceLocator.getMainCamera().state.camDistBuffer <= settingsManager.nearZoomLevel
          ) {
            renderer.meshManager.drawOcclusion(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.programs.occlusion, this.frameBuffers.godrays);
          }
          profiler.endGpu(GpuStage.occlusion);
        }

        // Add the godrays effect to the godrays frame buffer and then apply it to the postprocessing buffer two.
        // Null-safe: a throw here used to abort renderBackground before the earth/
        // atmosphere draws below — one godrays failure blanked the atmosphere.
        renderer.postProcessingManager.curBuffer = null;
        profiler.beginGpu(GpuStage.godrays);
        this.godrays?.draw(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer);
        profiler.endGpu(GpuStage.godrays);
      }

      profiler.beginGpu(GpuStage.skybox);
      this.skybox.render(renderer.postProcessingManager.curBuffer);
      profiler.endGpu(GpuStage.skybox);

      if (!settingsManager.isDisablePlanets) {
        if (settingsManager.centerBody !== SolarBody.Earth && settingsManager.centerBody !== SolarBody.Sun) {
          profiler.beginGpu(GpuStage.planets);
          this.getBodyById(settingsManager.centerBody)?.draw(this.sun.position, renderer.postProcessingManager.curBuffer);
          profiler.endGpu(GpuStage.planets);
        }
      }
      if (settingsManager.centerBody === SolarBody.Earth || settingsManager.centerBody === SolarBody.Moon) {
        if (settingsManager.isDrawEarth !== false && camera.cameraType !== CameraType.ASTRONOMY && camera.cameraType !== CameraType.PLANETARIUM) {
          /*
           * Surface only (plus depth): the moon draw below and the dots/orbits in
           * renderOpaque depth-test against it. The atmosphere shell is deferred
           * to renderOpaque (drawAtmospherePass) so it blends exactly once per
           * frame — the pipeline historically drew surface AND atmosphere in both
           * passes, paying the full fragment cost twice.
           */
          profiler.beginGpu(GpuStage.earthBackground);
          this.earth.drawSurfacePass(renderer.postProcessingManager.curBuffer);
          profiler.endGpu(GpuStage.earthBackground);
          this.isEarthSurfaceDrawnInBackground_ = true;
        }
        profiler.beginGpu(GpuStage.planets);
        this.getBodyById(SolarBody.Moon)?.draw(this.sun.position, renderer.postProcessingManager.curBuffer);
        profiler.endGpu(GpuStage.planets);
      }

      profiler.beginGpu(GpuStage.scenery);
      EventBus.getInstance().emit(EventBusEvent.drawOptionalScenery);
      profiler.endGpu(GpuStage.scenery);
    }

    renderer.postProcessingManager.curBuffer = null;
  }

  private updateVisualsBasedOnPerformance_() {
    if (settingsManager.isDisablePerformanceDowngrade) {
      return;
    }
    if (
      (!settingsManager.isDisablePlanets || !settingsManager.isDisableGodrays || settingsManager.isDrawSun || settingsManager.isDrawAurora || settingsManager.isDrawMilkyWay) &&
      Date.now() - this.updateVisualsBasedOnPerformanceTime_ > 10000 && // Only check every 10 seconds
      !Engine.isFpsAboveLimit(this.averageDrawTime as Milliseconds, 30)
    ) {
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
    const profiler = FrameProfiler.getInstance();

    // Draw Earth (skip if plugin handles it; atmosphere-only in ground view modes; full draw otherwise)
    // GPU timing lives inside Earth.draw so surface and atmosphere profile separately
    if (EventBus.getInstance().methods.shouldSkipEarthDraw()) {
      // Earth is drawn by plugin (e.g. 2D quad in renderBackground)
    } else if (settingsManager.isDrawEarth !== false) {
      if (camera.cameraType === CameraType.PLANETARIUM || camera.cameraType === CameraType.ASTRONOMY) {
        this.earth.drawAtmosphereOnly(renderer.postProcessingManager.curBuffer);
      } else if (this.isEarthSurfaceDrawnInBackground_) {
        /*
         * Surface (+depth) already rendered in renderBackground — only the
         * atmosphere shell remains. Intensity 2.0 reproduces the additive
         * brightness of the legacy pipeline, which blended the shell twice
         * (once per pass): dst + src + src === dst + 2·src under SRC_ALPHA/ONE.
         */
        this.earth.drawAtmospherePass(renderer.postProcessingManager.curBuffer, 2.0);
      } else {
        this.earth.draw(renderer.postProcessingManager.curBuffer);
      }
    }

    // Draw Dots (dots + GPU picking are timed inside DotsManager.draw)
    dotsManagerInstance.draw(renderer.projectionCameraMatrix, renderer.postProcessingManager.curBuffer);

    // Draw Satellite Labels (GPU-rendered)
    const satLabelManager = ServiceLocator.getSatLabelManager();

    satLabelManager?.updatePositions();
    profiler.beginGpu(GpuStage.labels);
    satLabelManager?.draw(renderer.projectionCameraMatrix, renderer.postProcessingManager.curBuffer);
    profiler.endGpu(GpuStage.labels);

    profiler.beginGpu(GpuStage.orbits);
    orbitManagerInstance.draw(renderer.projectionCameraMatrix, renderer.postProcessingManager.curBuffer, hoverManagerInstance, colorSchemeManagerInstance, camera);
    profiler.endGpu(GpuStage.orbits);

    profiler.beginGpu(GpuStage.lines);
    ServiceLocator.getLineManager().draw(renderer.projectionCameraMatrix, renderer.postProcessingManager.curBuffer);
    profiler.endGpu(GpuStage.lines);

    // "You are here" + selected-sat glow markers (depth-occluded against the globe).
    // Cheap no-op unless observerMarkerLla / isDrawSelectionGlow are set (both off in OSS).
    this.worldMarkers.draw(renderer.projectionCameraMatrix, this.worldShift as [number, number, number], renderer.postProcessingManager.curBuffer);

    // Draw Satellite Model if a satellite is selected (or deep-space satellite is centered) and meshManager is loaded
    const hasSatSelected = Number(PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1) > -1;
    const hasDeepSpaceSatCentered = !!this.deepSpaceSatellites?.[settingsManager.centerBody];

    if ((hasSatSelected || hasDeepSpaceSatCentered) && !EventBus.getInstance().methods.shouldSkipSatelliteModels()) {
      const isCloseEnough = camera.state.camDistBuffer <= settingsManager.nearZoomLevel;

      if (!settingsManager.modelsOnSatelliteViewOverride && (isCloseEnough || hasDeepSpaceSatCentered)) {
        profiler.beginGpu(GpuStage.mesh);
        renderer.meshManager.draw(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer);
        profiler.endGpu(GpuStage.mesh);
      }
    }
  }

  renderTransparent(renderer: WebGLRenderer, camera: Camera): void {
    // Skip 3D transparent objects when plugin requests it (e.g. flat map mode)
    if (EventBus.getInstance().methods.shouldSkipTransparentObjects()) {
      return;
    }

    const selectedSatelliteManager = PluginRegistry.getPlugin(SelectSatManager);

    if (!selectedSatelliteManager) {
      return;
    }

    if (Number(selectedSatelliteManager.selectedSat) > -1) {
      if (this.searchBox.hasValidPose) {
        this.searchBox.draw(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer);
      }
      if (this.primaryCovBubble.hasValidPose) {
        this.primaryCovBubble.draw(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer);
      }
    }
    if (Number(selectedSatelliteManager.secondarySat) > -1 && this.secondaryCovBubble.hasValidPose) {
      this.secondaryCovBubble.draw(camera.projectionMatrix, camera.matrixWorldInverse, renderer.postProcessingManager.curBuffer);
    }
  }

  clear(camera?: Camera | null): void {
    const gl = this.gl_;
    /*
     * NOTE: clearColor is set here because two different colors are used. If you set it during
     * frameBuffer init then the wrong color will be applied (this can break gpuPicking)
     */

    /*
     * With GPU picking disabled nothing writes OR reads the picking buffer
     * (draws and readPixels are all gated), so skip its per-frame clear — a
     * render-target switch per frame that tiled mobile GPUs pay dearly for.
     * WebGL zero-initializes the attachment, so even a stray read decodes to
     * "no object" (id -1).
     */
    if (!settingsManager.isDisableGpuPicking) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffers.gpuPicking);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    if (!settingsManager.isDisableGodrays) {
      // Clear the godrays Frame Buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffers.godrays);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    // Switch back to the canvas. Scene-wide override wins, then the camera's own.
    const clearColorOverride = this.clearColorOverride ?? camera?.clearColorOverride ?? null;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (clearColorOverride) {
      gl.clearColor(...clearColorOverride);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (clearColorOverride) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
    }

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
      case SolarBody.Ceres:
      case SolarBody.Haumea:
      case SolarBody.Eris:
      case SolarBody.Sedna:
      case SolarBody.Quaoar:
      case SolarBody.Orcus:
      case SolarBody.Gonggong:
      case SolarBody.Charon:
        return this.dwarfPlanets[solarBody] ?? null;
      case SolarBody.Sun:
        return this.sun as unknown as CelestialBody;
      default:
        return this.deepSpaceSatellites?.[solarBody] ?? null;
    }
  }

  async loadScene(): Promise<void> {
    try {
      this.earth.init(this.gl_);
      this.worldMarkers.init(this.gl_);
      EventBus.getInstance().emit(EventBusEvent.drawManagerLoadScene);
      await this.sun.init(this.gl_);

      if (!settingsManager.isDisableGodrays) {
        ServiceLocator.getScene().godrays?.init(this.gl_, this.sun);
      }

      if (!settingsManager.isDisablePlanets) {
        for (const planet of Object.values(this.planets)) {
          planet.init(this.gl_);
        }
        for (const dwarfPlanet of Object.values(this.dwarfPlanets)) {
          dwarfPlanet.init(this.gl_);
        }

        // This doesn't belong under a disable planets flag
        await loadDeepSpaceSatelliteData(this.deepSpaceSatellites);
        for (const deepSpaceSat of Object.values(this.deepSpaceSatellites)) {
          deepSpaceSat.init(this.gl_);
        }
      }

      for (const moon of Object.values(this.moons)) {
        moon.init(this.gl_);
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
