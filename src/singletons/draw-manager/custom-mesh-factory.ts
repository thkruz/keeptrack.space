import { keepTrackApi } from '@app/keepTrackApi';
import { SensorFov } from '@app/plugins/sensor-fov/sensor-fov';
import { SensorSurvFence } from '@app/plugins/sensor-surv/sensor-surv-fence';
import { mat4 } from 'gl-matrix';
import { DetailedSensor, GreenwichMeanSiderealTime, SpaceObjectType } from 'ootk';
import { CustomMesh } from './custom-mesh';
import { RadarDome } from './radar-dome';

export class CustomMeshFactory {
  private customMeshes_: (CustomMesh | RadarDome)[] = [];

  createCustomMesh(vertexList: Float32Array) {
    const customMesh = new CustomMesh();

    const renderer = keepTrackApi.getRenderer();

    customMesh.init(renderer.gl, vertexList);
    customMesh.id = this.customMeshes_.length;
    this.customMeshes_.push(customMesh);

    return customMesh;
  }

  remove(id: number) {
    this.customMeshes_.splice(id, 1);
  }

  updateVertexList(id: number, vertexList: Float32Array) {
    const mesh = this.customMeshes_[id];

    if (mesh instanceof CustomMesh) {
      mesh.updateVertexList(vertexList);
    }
  }

  clear() {
    this.customMeshes_ = [];
  }

  drawAll(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    let i = 0;
    let lastSensorObjName = '';

    /*
     * Only draw the radar dome if the sensor is active. Check current sensors for
     * sensor with the same objName since those are unique (this is for sensors with
     * two parameters like LEOCRSR)
     */
    const activeSensors = keepTrackApi.getSensorManager().currentSensors.concat(keepTrackApi.getSensorManager().secondarySensors.concat(keepTrackApi.getSensorManager().stfSensors));

    this.customMeshes_.forEach((mesh) => {
      if (mesh instanceof RadarDome) {
        // There needs to be a reason to draw the radar dome.
        if (mesh.sensor.type === SpaceObjectType.SHORT_TERM_FENCE &&
          keepTrackApi.getSensorManager().stfSensors.length === 0
        ) {
          return;
        }

        if (mesh.sensor.type !== SpaceObjectType.SHORT_TERM_FENCE && (!keepTrackApi.getPlugin(SensorFov).isMenuButtonActive &&
          !keepTrackApi.getPlugin(SensorSurvFence).isMenuButtonActive)) {
          return;
        }


        // Ignore deep space when there are multiple sensors active
        if (activeSensors.length > 1 && mesh.sensor.maxRng > 40000) {
          return;
        }

        const sensors = activeSensors.filter((s) => s.objName === mesh.sensor.objName);

        if (sensors.length > 0) {
          mesh.draw(pMatrix, camMatrix, keepTrackApi.getColorSchemeManager().colorTheme.marker[i], tgtBuffer);
          if (mesh.sensor.objName !== lastSensorObjName) {
            i++;
            lastSensorObjName = mesh.sensor.objName;
          }
        }
      } else {
        mesh.draw(pMatrix, camMatrix, tgtBuffer);
      }
    });
  }

  updateAll(gmst: GreenwichMeanSiderealTime) {
    /*
     * Only draw the radar dome if the sensor is active. Check current sensors for
     * sensor with the same objName since those are unique (this is for sensors with
     * two parameters like LEOCRSR)
     */
    const activeSensors = keepTrackApi.getSensorManager()
      .currentSensors.concat(keepTrackApi.getSensorManager()
        .secondarySensors.concat(keepTrackApi.getSensorManager().stfSensors));

    this.customMeshes_.forEach((mesh) => {
      if (mesh instanceof RadarDome) {
        // There needs to be a reason to draw the radar dome.
        if (mesh.sensor.type === SpaceObjectType.SHORT_TERM_FENCE &&
          keepTrackApi.getSensorManager().stfSensors.length === 0
        ) {
          return;
        }

        if (mesh.sensor.type !== SpaceObjectType.SHORT_TERM_FENCE && (!keepTrackApi.getPlugin(SensorFov).isMenuButtonActive &&
          !keepTrackApi.getPlugin(SensorSurvFence).isMenuButtonActive)) {
          return;
        }

        const sensor = activeSensors.find((s) => s.objName === mesh.sensor.objName);

        if (sensor) {
          mesh.update(gmst);
        }
      } else {
        mesh.update();
      }
    });
  }

  createRadarDome(sensor: DetailedSensor): RadarDome {
    const found = this.customMeshes_.find((mesh) => {
      if (mesh instanceof RadarDome) {
        return mesh.sensor === sensor;
      }

      return false;
    }) as RadarDome;

    if (found) {
      return found;
    }

    const radarDome = new RadarDome(sensor);

    const renderer = keepTrackApi.getRenderer();

    radarDome.init(renderer.gl);
    radarDome.id = this.customMeshes_.length;
    this.customMeshes_.push(radarDome);

    if (sensor.minAz2) {
      const sensor2 = new DetailedSensor({
        ...sensor,
        minAz: sensor.minAz2,
        maxAz: sensor.maxAz2,
        minEl: sensor.minEl2,
        maxEl: sensor.maxEl2,
        minRng: sensor.minRng2,
        maxRng: sensor.maxRng2,
        volume: sensor.isVolumetric,
      });

      const radarDome = new RadarDome(sensor2);

      const renderer = keepTrackApi.getRenderer();

      radarDome.init(renderer.gl);
      radarDome.id = this.customMeshes_.length;
      this.customMeshes_.push(radarDome);
    }

    return radarDome;
  }

  createMarkerMesh() {
    const centerPoint = [10000, 0, 0];
    const vertexList = new Float32Array(8 * 3);
    const halfExtent = 1000 / 2;

    vertexList[0] = centerPoint[0] - halfExtent;
    vertexList[1] = centerPoint[1] - halfExtent;
    vertexList[2] = centerPoint[2] - halfExtent;
    vertexList[3] = centerPoint[0] + halfExtent;
    vertexList[4] = centerPoint[1] - halfExtent;
    vertexList[5] = centerPoint[2] - halfExtent;
    vertexList[6] = centerPoint[0] - halfExtent;
    vertexList[7] = centerPoint[1] + halfExtent;
    vertexList[8] = centerPoint[2] - halfExtent;
    vertexList[9] = centerPoint[0] + halfExtent;
    vertexList[10] = centerPoint[1] + halfExtent;
    vertexList[11] = centerPoint[2] - halfExtent;
    vertexList[12] = centerPoint[0] - halfExtent;
    vertexList[13] = centerPoint[1] - halfExtent;
    vertexList[14] = centerPoint[2] + halfExtent;
    vertexList[15] = centerPoint[0] + halfExtent;
    vertexList[16] = centerPoint[1] - halfExtent;
    vertexList[17] = centerPoint[2] + halfExtent;
    vertexList[18] = centerPoint[0] - halfExtent;
    vertexList[19] = centerPoint[1] + halfExtent;
    vertexList[20] = centerPoint[2] + halfExtent;
    vertexList[21] = centerPoint[0] + halfExtent;
    vertexList[22] = centerPoint[1] + halfExtent;
    vertexList[23] = centerPoint[2] + halfExtent;

    return this.createCustomMesh(vertexList);
  }
}
