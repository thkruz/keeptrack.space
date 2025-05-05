import { Engine } from '@app/doris/core/engine';
import { Doris } from '@app/doris/doris';
import { CoreEngineEvents } from '@app/doris/events/event-types';
import { ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { t7e } from '@app/locales/keys';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { mat4 } from 'gl-matrix';
import { Milliseconds } from 'ootk';
import { Renderer } from '../../doris/rendering/renderer';
import { LegacyCamera } from '../camera/legacy-camera';
import { SpaceScene } from '../scene/space-scene';

/**
 * Application-specific renderer for the legacy Scene/Camera system.
 * Handles all rendering passes for a Scene instance.
 */
export class KeepTrackRenderer extends Renderer {
  private drawTimeArray_: number[] = Array(150).fill(16);
  private averageDrawTime_ = 0;
  private updateVisualsBasedOnPerformanceTime_ = 0;

  registerRenderer(): void {
    Doris.getInstance().on(CoreEngineEvents.Render, this.render.bind(this));
  }

  render(scene: SpaceScene): void {
    if (!scene.isInitialized_) {
      return;
    }

    const camera = scene.activeCamera;

    if (!camera) {
      return;
    }

    // Apply the camera matrix
    this.projectionCameraMatrix = mat4.mul(mat4.create(), camera.projectionMatrix, camera.camMatrix);

    Doris.getInstance().emit(CoreEngineEvents.BeforeClearRenderTarget);
    this.clear(Doris.getInstance().getRenderer().gl);
    Doris.getInstance().emit(CoreEngineEvents.BeforeRender);

    this.updateVisualsBasedOnPerformance();
    this.renderBackground(scene, camera);
    Doris.getInstance().emit(CoreEngineEvents.RenderOpaque, camera, scene.postProcessingManager.curBuffer);
    this.renderTransparent(scene, camera);
    Doris.getInstance().emit(CoreEngineEvents.RenderTransparent, camera, scene.postProcessingManager.curBuffer);
  }

  renderBackground(scene: SpaceScene, camera: LegacyCamera): void {
    if (!settingsManager.isDrawLess) {
      if (settingsManager.isDrawSun) {
        const fb = settingsManager.isDisableGodrays ? null : scene.godrays.godraysFramebuffer;

        scene.sun.draw(scene.earth.lightDirection, fb);
        if (scene.postProcessingManager.isInitialized) {
          scene.earth.drawOcclusion(
            keepTrackApi.getMainCamera().projectionMatrix,
            camera.camMatrix,
            scene.postProcessingManager.programs.occlusion,
            scene.godrays.godraysFramebuffer,
          );
        }
        if (
          !settingsManager.modelsOnSatelliteViewOverride &&
          (keepTrackApi.getPlugin(SelectSatManager)?.selectedSat ?? -1) > -1 &&
          keepTrackApi.getMainCamera().camDistBuffer <= settingsManager.nearZoomLevel
        ) {
          keepTrackApi.getMeshManager().drawOcclusion(
            keepTrackApi.getMainCamera().projectionMatrix,
            camera.camMatrix,
            scene.postProcessingManager.programs.occlusion,
            scene.godrays.godraysFramebuffer,
          );
        }
        scene.postProcessingManager.curBuffer = null;
        scene.godrays.draw(
          keepTrackApi.getMainCamera().projectionMatrix,
          camera.camMatrix,
          scene.postProcessingManager.curBuffer,
        );
      }
      scene.skybox.render(scene.postProcessingManager.curBuffer);
      if (!settingsManager.isDisableMoon) {
        scene.moon.draw(scene.sun.position);
      }
    }
    scene.postProcessingManager.curBuffer = null;
  }

  renderTransparent(scene: SpaceScene, camera: LegacyCamera): void {
    const selectedSatelliteManager = keepTrackApi.getPlugin(SelectSatManager);

    if (!selectedSatelliteManager) {
      return;
    }
    if (selectedSatelliteManager.selectedSat > -1) {
      scene.searchBox.draw(
        keepTrackApi.getMainCamera().projectionMatrix,
        camera.camMatrix,
        scene.postProcessingManager.curBuffer,
      );
      scene.primaryCovBubble.render(
        keepTrackApi.getMainCamera(),
        scene.postProcessingManager.curBuffer,
      );
    }
    if (selectedSatelliteManager.secondarySat > -1) {
      scene.secondaryCovBubble.render(
        keepTrackApi.getMainCamera(),
        scene.postProcessingManager.curBuffer,
      );
    }
  }

  resetDrawTimeArray() {
    this.drawTimeArray_ = Array(150).fill(16);
  }

  updateVisualsBasedOnPerformance() {
    this.drawTimeArray_.push(Math.min(100, Doris.getInstance().getTimeManager().getRealTimeDelta()));
    if (this.drawTimeArray_.length > 150) {
      this.drawTimeArray_.shift();
    }
    this.averageDrawTime_ = this.drawTimeArray_.reduce((a, b) => a + b, 0) / this.drawTimeArray_.length;

    if ((!settingsManager.isDisableMoon ||
      !settingsManager.isDisableGodrays ||
      settingsManager.isDrawSun ||
      settingsManager.isDrawAurora ||
      settingsManager.isDrawMilkyWay) &&
      Date.now() - this.updateVisualsBasedOnPerformanceTime_ > 10000 && // Only check every 10 seconds
      Engine.calculateFps(this.averageDrawTime_ as Milliseconds) < 30) {
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
}
