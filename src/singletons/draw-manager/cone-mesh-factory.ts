import { keepTrackApi } from '@app/keepTrackApi';
import { mat4 } from 'gl-matrix';
import { BaseObject, DetailedSensor } from 'ootk';
import { ConeMesh } from './cone-mesh';
import { CustomMeshFactory } from './custom-mesh-factory';

export class ConeMeshFactory extends CustomMeshFactory<ConeMesh> {
  drawAll(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    let i = 0;

    this.meshes_.forEach((mesh) => {
      mesh.draw(pMatrix, camMatrix, keepTrackApi.getColorSchemeManager().colorTheme.marker[i], tgtBuffer);
      i++;
    });
  }

  updateAll() {
    this.meshes_.forEach((mesh) => {
      mesh.update();
    });
  }

  generateMesh(cone: DetailedSensor) {
    const foundSensorFovMesh = this.checkCacheForMesh_(cone);

    if (foundSensorFovMesh) {
      return;
    }

    this.create_(cone);
  }

  checkCacheForMesh_(coneAttachPoint: BaseObject) {
    return this.meshes_.find((mesh) => mesh.obj.id === coneAttachPoint.id);
  }

  create_(coneAttachPoint: BaseObject) {
    const sensorFovMesh = new ConeMesh(coneAttachPoint);

    this.add(sensorFovMesh);
  }
}
