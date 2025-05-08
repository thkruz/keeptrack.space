import { Doris } from '@app/doris/doris';
import { CoreEngineEvents } from '@app/doris/events/event-types';
import { KeepTrackApiEvents } from '@app/keeptrack/events/event-types';
import { BaseObject, Degrees } from 'ootk';
import { KeepTrackMainCamera } from '../../keeptrack/camera/legacy-camera';
import { ConeMesh, ConeSettings } from './cone-mesh';
import { CustomMeshFactory } from './custom-mesh-factory';


export class ConeMeshFactory extends CustomMeshFactory<ConeMesh> {
  private defaultConeSettings_: ConeSettings = {
    fieldOfView: 3 as Degrees,
    color: [0.2, 1.0, 1.0, 0.15],
  };

  constructor() {
    super();
    Doris.getInstance().on(CoreEngineEvents.RenderTransparent, (camera: KeepTrackMainCamera, tgtBuffer: WebGLFramebuffer | null) => {
      this.drawAll(camera, tgtBuffer);
    });
  }

  drawAll(camera: KeepTrackMainCamera, tgtBuffer: WebGLFramebuffer | null = null) {
    this.meshes.forEach((mesh) => {
      mesh.draw(camera.getProjectionMatrix(), camera.getViewMatrix(), tgtBuffer);
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
    Doris.getInstance().emit(KeepTrackApiEvents.ConeMeshUpdate);
  }

  remove(id: number) {
    this.meshes.splice(id, 1);
    Doris.getInstance().emit(KeepTrackApiEvents.ConeMeshUpdate);
  }

  removeByObjectId(id: number) {
    const index = this.meshes.findIndex((mesh) => mesh.obj.id === id);

    if (index !== -1) {
      this.remove(index);
    }

    Doris.getInstance().emit(KeepTrackApiEvents.ConeMeshUpdate);
  }
}
