import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { BaseObject, Degrees } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { ConeMesh, ConeSettings } from './cone-mesh';
import { CustomMeshFactory } from './custom-mesh-factory';
import { EventBus } from '@app/engine/events/event-bus';

export class ConeMeshFactory extends CustomMeshFactory<ConeMesh> {
  private defaultConeSettings_: ConeSettings = {
    fieldOfView: 3 as Degrees,
    color: [0.2, 1.0, 1.0, 0.15],
  };

  drawAll(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    this.meshes.forEach((mesh) => {
      mesh.draw(pMatrix, camMatrix, tgtBuffer);
    });
  }

  updateAll() {
    this.meshes.forEach((mesh) => {
      mesh.update();
    });
  }

  generateMesh(cone: BaseObject, settings: ConeSettings = this.defaultConeSettings_) {
    const foundSensorFovMesh = this.checkCacheForMesh_(cone);

    if (foundSensorFovMesh) {
      return;
    }

    this.create_(cone, settings);
  }

  checkCacheForMesh_(coneAttachPoint: BaseObject) {
    return this.meshes.find((mesh) => mesh.obj.id === coneAttachPoint.id);
  }

  editSettings(settings: ConeSettings) {
    this.defaultConeSettings_ = settings;
  }

  create_(coneAttachPoint: BaseObject, settings: ConeSettings) {
    const sensorFovMesh = new ConeMesh(coneAttachPoint, settings);

    this.add(sensorFovMesh);
    EventBus.getInstance().emit(EventBusEvent.ConeMeshUpdate);
  }

  remove(id: number) {
    this.meshes.splice(id, 1);
    EventBus.getInstance().emit(EventBusEvent.ConeMeshUpdate);
  }

  removeByObjectId(id: number) {
    const index = this.meshes.findIndex((mesh) => mesh.obj.id === id);

    if (index !== -1) {
      this.remove(index);
    }

    EventBus.getInstance().emit(EventBusEvent.ConeMeshUpdate);
  }
}
