import { Doris } from '@app/doris/doris';
import { CoreEngineEvents } from '@app/doris/events/event-types';
import { SceneNode } from '@app/doris/scene/scene-node';
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
import { KeepTrackMainCamera } from '../camera/legacy-camera';

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
  activeCamera: KeepTrackMainCamera | null = null;

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
      if (!settingsManager.isDisableGodrays) {
        keepTrackApi.getScene().godrays?.init();
      }

      if (!settingsManager.isDisableSearchBox) {
        this.searchBox.init();
      }
      if (!settingsManager.isDisableSkybox) {
        this.skybox.initialize();
      }
      this.activeCamera = keepTrackApi.getMainCamera();
      this.isInitialized_ = true;
    } catch (error) {
      errorManagerInstance.log(error);
      // Errors aren't showing as toast messages
    }
    Doris.getInstance().on(CoreEngineEvents.Update, this.update.bind(this));

    const sunNode = new SceneNode('Sun');

    sunNode.addComponent(this.sun);
    this.sun.node = sunNode;

    const earthNode = new SceneNode('Earth');

    earthNode.addComponent(this.earth);
    this.earth.node = earthNode;

    const moonNode = new SceneNode('Moon');

    moonNode.addComponent(this.moon);
    this.moon.node = moonNode;

    const skyboxNode = new SceneNode('Skybox');

    skyboxNode.addComponent(this.skybox);
    this.skybox.node = skyboxNode;

    const dotsNode = new SceneNode('Dots');
    const mainCameraNode = Doris.getInstance().getSceneManager().activeScene!.findNode('MainCamera')!;

    mainCameraNode.addChild(sunNode);
    mainCameraNode.addChild(skyboxNode);
    earthNode.addChild(moonNode);
    earthNode.addChild(dotsNode);
    Doris.getInstance().getSceneManager().activeScene?.root.addChild(earthNode);

    Doris.getInstance().once(CoreEngineEvents.Update, () => {
      this.earth.reloadEarthHiResTextures();
    });
  }

  /**
   * Call this when assets are loaded and the renderer is available.
   */
  onAssetsLoaded(): void {
    const gl = Doris.getInstance().getRenderer().gl;

    this.postProcessingManager.init(gl);
  }

  update(deltaTime: number): void {
    Doris.getInstance().getSceneManager().activeScene?.update(deltaTime);

    keepTrackApi.getLineManager().update();

    this.sensorFovFactory.updateAll();
    this.coneFactory.updateAll();
  }
}
