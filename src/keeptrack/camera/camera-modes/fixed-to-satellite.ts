import { KeepTrack } from '@app/keeptrack';
import { keepTrackApi } from '@app/keepTrackApi';
import { alt2zoom } from '@app/lib/transforms';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SatMath } from '@app/static/sat-math';
import { mat4, vec3 } from 'gl-matrix';
import { GreenwichMeanSiderealTime, RADIUS_OF_EARTH } from 'ootk';
import { CameraType, LegacyCamera } from '../legacy-camera';
import { CameraMode } from './camera-mode';

export class FixedToSatelliteCameraMode extends CameraMode {
  isInitialized_ = false;

  constructor(camera: LegacyCamera) {
    super(camera);
  }

  initialize(): void {
    if (this.isInitialized_) {
      return;
    }
    this.camera.setCameraMode(this);
    this.isInitialized_ = true;
  }

  render(): void {
    if (!this.isInitialized_) {
      this.initialize();
    }

    const target = keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj;

    if (!target) {
      this.camera.cameraType = CameraType.FIXED_TO_EARTH;
      this.camera.activeCameraMode = this.camera.cameraModes.get(CameraType.FIXED_TO_EARTH) as CameraMode;
      this.camera.activeCameraMode.render();

      return;
    }

    let gmst: GreenwichMeanSiderealTime;
    const sensorPos = KeepTrack.getInstance().sensorPos;

    if (!sensorPos?.gmst) {

      gmst = sensorPos?.gmst ?? SatMath.calculateTimeVariables(keepTrackApi.getTimeManager().simulationTimeObj).gmst;
    } else {
      gmst = sensorPos.gmst;
    }

    const satAlt = SatMath.getAlt(target.position, gmst);

    if (this.camera.getCameraDistance() < satAlt + RADIUS_OF_EARTH + settingsManager.minDistanceFromSatellite) {
      this.camera.zoomTarget = alt2zoom(satAlt, settingsManager.minZoomDistance, settingsManager.maxZoomDistance, settingsManager.minDistanceFromSatellite);
      // errorManagerInstance.debug('Zooming in to ' + this.zoomTarget_ + ' to because we are too close to the satellite');
      this.camera.setZoomLevel(this.camera.zoomTarget);
    }

    const targetPosition = target.id !== -1 ? vec3.fromValues(-target.position?.x, -target.position?.y, -target.position?.z) : vec3.fromValues(0, 0, 0);

    /*
     * mat4 commands are run in reverse order
     * 1. Move to the satellite position
     * 2. Twist the camera around Z-axis
     * 3. Pitch the camera around X-axis (this may have moved because of the Z-axis rotation)
     * 4. Back away from the satellite
     * 5. Adjust for panning
     * 6. Rotate the camera FPS style
     */
    mat4.rotateX(this.camera.camMatrix, this.camera.camMatrix, -this.camera.localRotateCurrent.pitch);
    mat4.rotateY(this.camera.camMatrix, this.camera.camMatrix, -this.camera.localRotateCurrent.roll);
    mat4.rotateZ(this.camera.camMatrix, this.camera.camMatrix, -this.camera.localRotateCurrent.yaw);

    mat4.translate(this.camera.camMatrix, this.camera.camMatrix, [this.camera.panCurrent.x, this.camera.panCurrent.y, this.camera.panCurrent.z]);

    mat4.translate(this.camera.camMatrix, this.camera.camMatrix, [0, this.camera.getCameraRadius(target.position), 0]);

    mat4.rotateX(this.camera.camMatrix, this.camera.camMatrix, this.camera.ftsPitch);
    mat4.rotateZ(this.camera.camMatrix, this.camera.camMatrix, -this.camera.ftsYaw);

    mat4.translate(this.camera.camMatrix, this.camera.camMatrix, targetPosition);
  }
}
