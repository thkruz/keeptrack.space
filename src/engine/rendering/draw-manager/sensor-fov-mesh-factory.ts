import { ToastMsgType } from '@app/engine/core/interfaces';
import { Scene } from '@app/engine/core/scene';
import { SensorFov } from '@app/plugins/sensor-fov/sensor-fov';
import { SensorSurvFence } from '@app/plugins/sensor-surv/sensor-surv-fence';
import { DetailedSensor, SpaceObjectType } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { CustomMeshFactory } from './custom-mesh-factory';
import { SensorFovMesh } from './sensor-fov-mesh';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

// TODO: Sensors should be indpeneent of the object they are attached to. This will remove minAz2 and maxAz2 type of properties

export class SensorFovMeshFactory extends CustomMeshFactory<SensorFovMesh> {
  drawAll(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    let i = 0;
    let didWeDrawSomething = false;
    let lastSensorObjName = '';

    const activeSensors = ServiceLocator.getSensorManager().getAllActiveSensors();

    this.meshes.forEach((mesh) => {
      const isNeeded = this.checkIfNeeded_(activeSensors, mesh);

      if (!isNeeded) {
        return;
      }

      const sensors = activeSensors.filter((s) => s.objName === mesh.sensor.objName);

      if (sensors.length > 0) {
        didWeDrawSomething = true;
        mesh.draw(pMatrix, camMatrix, ServiceLocator.getColorSchemeManager().colorTheme.marker[i], tgtBuffer);
        if (mesh.sensor.objName !== lastSensorObjName) {
          i++;
          lastSensorObjName = mesh.sensor.objName as string; // It is NOT optional in KeepTrack even though ootk allows it to be
        }
      }
    });

    /*
     * If we didn't draw anything, we should disable the FOV view plugin
     * and show a toast message to the user.
     * This is to prevent the user from being confused when they select a sensor
     * and nothing happens.
     */
    if (!didWeDrawSomething) {
      const sensorFovPlugin = PluginRegistry.getPlugin(SensorFov);

      if (sensorFovPlugin && sensorFovPlugin.isMenuButtonActive) {
        ServiceLocator.getUiManager().toast('No valid FOV to draw! We can\'t draw multiple Deep Space sensors at once.', ToastMsgType.caution);
        sensorFovPlugin.disableFovView();
      }
    }
  }

  /**
   * Checks if the sensor field of view (FOV) mesh needs to be drawn based on various conditions.
   *
   * @param activeSensors - An array of active sensors with detailed information.
   * @param mesh - The sensor FOV mesh to be checked.
   * @returns A boolean indicating whether the sensor FOV mesh should be drawn.
   *
   * The function evaluates the following conditions:
   * - If the sensor type is `SHORT_TERM_FENCE` and there are no short-term fence sensors, it returns `false`.
   * - If the sensor type is not `SHORT_TERM_FENCE` and neither the SensorFov nor SensorSurvFence plugins have their menu buttons active, it returns `false`.
   * - If there are multiple active sensors and the sensor's maximum range is greater than 40,000, it returns `false`.
   * - Otherwise, it returns `true`.
   */
  private checkIfNeeded_(activeSensors: DetailedSensor[], mesh: SensorFovMesh): boolean {
    // There needs to be a reason to draw the radar dome.
    if (mesh.sensor.type === SpaceObjectType.SHORT_TERM_FENCE &&
      ServiceLocator.getSensorManager().stfSensors.length === 0
    ) {
      // STFs are not reused, so remove them when they are not needed.
      this.remove(mesh.id);

      return false;
    }

    if (mesh.sensor.type !== SpaceObjectType.SHORT_TERM_FENCE && (!PluginRegistry.getPlugin(SensorFov)?.isMenuButtonActive &&
      !PluginRegistry.getPlugin(SensorSurvFence)?.isMenuButtonActive)) {
      return false;
    }


    // Ignore deep space when there are multiple sensors active
    if (activeSensors.length > 1 && mesh.sensor.maxRng > 40000) {
      return false;
    }

    return true;
  }

  updateAll() {
    const gmst = ServiceLocator.getTimeManager().gmst;
    const activeSensors = ServiceLocator.getSensorManager().getAllActiveSensors();

    this.meshes.forEach((mesh) => {
      const isNeeded = this.checkIfNeeded_(activeSensors, mesh);

      if (!isNeeded) {
        return;
      }

      const sensor = activeSensors.find((s) => s.objName === mesh.sensor.objName);

      if (sensor) {
        mesh.update(gmst);
      }
    });
  }

  generateSensorFovMesh(sensor: DetailedSensor) {
    const foundSensorFovMesh = this.checkCacheForMesh_(sensor);

    if (foundSensorFovMesh) {
      return;
    }

    this.create_(sensor);

    // Create a second sensor if it exists
    if (sensor.minAz2) {
      const sensor2 = new DetailedSensor({
        ...sensor,
        minAz: sensor.minAz2,
        maxAz: sensor.maxAz2!,
        minEl: sensor.minEl2!,
        maxEl: sensor.maxEl2!,
        minRng: sensor.minRng2!,
        maxRng: sensor.maxRng2!,
        volume: sensor.isVolumetric,
      });

      this.create_(sensor2);
    }
  }

  checkCacheForMesh_(sensor: DetailedSensor) {
    return this.meshes.find((mesh) => {
      if (mesh instanceof SensorFovMesh) {
        return mesh.sensor === sensor;
      }

      return false;
    });
  }

  create_(sensor: DetailedSensor) {
    const sensorFovMesh = new SensorFovMesh(sensor);

    this.add(sensorFovMesh);

    sensorFovMesh.sortFacesByDistance(ServiceLocator.getMainCamera().getCamPos(Scene.getInstance().worldShift));
  }
}
