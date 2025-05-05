import { Doris } from '@app/doris/doris';
import { CoreEngineEvents } from '@app/doris/events/event-types';
import { SatMath } from '@app/static/sat-math';
import { keepTrackApi } from '../../keepTrackApi';
import { ConeMeshFactory } from '../../singletons/draw-manager/cone-mesh-factory';
import { Box } from '../../singletons/draw-manager/cube';
import { Earth } from '../../singletons/draw-manager/earth';
import { Ellipsoid } from '../../singletons/draw-manager/ellipsoid';
import { Godrays } from '../../singletons/draw-manager/godrays';
import { Moon } from '../../singletons/draw-manager/moon';
import { PostProcessingManager } from '../../singletons/draw-manager/post-processing';
import { SensorFovMeshFactory } from '../../singletons/draw-manager/sensor-fov-mesh-factory';
import { SkyBoxSphere } from '../../singletons/draw-manager/skybox-sphere';
import { Sun } from '../../singletons/draw-manager/sun';
import { errorManagerInstance } from '../../singletons/errorManager';
import { LegacyCamera } from '../camera/legacy-camera';

export class SpaceScene {
  static readonly id = 'SpaceScene';
  postProcessingManager: PostProcessingManager;

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
  primaryCovBubble: Ellipsoid;
  secondaryCovBubble: Ellipsoid;
  isInitialized_ = false;
  activeCamera: LegacyCamera | null = null;

  constructor() {
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
    this.postProcessingManager = new PostProcessingManager();
  }

  initialize(): void {
    try {
      this.skybox.init(settingsManager);
      this.earth.initialize();
      this.sun.init().then(() => {
        if (!settingsManager.isDisableGodrays) {
          keepTrackApi.getScene().godrays?.init(this.sun);
        }
      });

      if (!settingsManager.isDisableMoon) {
        this.moon.init();
      }

      if (!settingsManager.isDisableSearchBox) {
        this.searchBox.init();
      }
      if (!settingsManager.isDisableSkybox) {
        this.skybox.init(settingsManager);
      }
      this.activeCamera = keepTrackApi.getMainCamera();
      this.isInitialized_ = true;
    } catch (error) {
      errorManagerInstance.log(error);
      // Errors aren't showing as toast messages
    }
    Doris.getInstance().on(CoreEngineEvents.Update, this.update.bind(this));
  }

  /**
   * Call this when assets are loaded and the renderer is available.
   */
  onAssetsLoaded(): void {
    const gl = Doris.getInstance().getRenderer().gl;

    this.postProcessingManager.init(gl);
  }

  update() {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const simulationTime = timeManagerInstance.simulationTimeObj;
    const { gmst, j } = SatMath.calculateTimeVariables(simulationTime);

    this.sun.update(j);
    this.earth.update(gmst);
    this.moon.update(simulationTime);
    this.skybox.update();

    keepTrackApi.getLineManager().update();

    this.sensorFovFactory.updateAll(gmst);
    this.coneFactory.updateAll();
  }
}
