import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { BaseObject, Degrees, Kilometers } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { CustomMeshFactory } from './custom-mesh-factory';
import { FrustumMesh, FrustumSettings } from './frustum-mesh';

export class FrustumMeshFactory extends CustomMeshFactory<FrustumMesh> {
  private defaultFrustumSettings_: FrustumSettings = {
    horizontalFov: 5 as Degrees,
    verticalFov: 3 as Degrees,
    nearDistance: 10 as Kilometers,
    farDistance: 500 as Kilometers,
    color: [0.8, 0.2, 1.0, 0.15],
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

  generateMesh(obj: BaseObject, settings: FrustumSettings = this.defaultFrustumSettings_) {
    const found = this.checkCacheForMesh_(obj, settings.targetObj, settings.azimuthOffset ?? 0 as Degrees, settings.elevationOffset ?? 0 as Degrees);

    if (found) {
      return;
    }

    this.create_(obj, settings);
  }

  checkCacheForMesh_(obj: BaseObject, targetObj?: BaseObject, azimuthOffset: Degrees = 0 as Degrees, elevationOffset: Degrees = 0 as Degrees) {
    return this.meshes.find((mesh) => {
      const sameSource = mesh.obj.id === obj.id;
      const sameTarget = (mesh.targetObj?.id ?? -1) === (targetObj?.id ?? -1);
      // Earth-center and free-direction frustums both lack a target, so the az/el
      // offsets are the only thing that distinguishes them in the cache.
      const sameDirection = mesh.azimuthOffset === azimuthOffset && mesh.elevationOffset === elevationOffset;

      return sameSource && sameTarget && sameDirection;
    });
  }

  get earthCenterMeshes(): FrustumMesh[] {
    return this.meshes.filter((m) => !m.targetObj && m.azimuthOffset === 0 && m.elevationOffset === 0);
  }

  get satToSatMeshes(): FrustumMesh[] {
    return this.meshes.filter((m) => !!m.targetObj);
  }

  get freeDirectionMeshes(): FrustumMesh[] {
    return this.meshes.filter((m) => !m.targetObj && (m.azimuthOffset !== 0 || m.elevationOffset !== 0));
  }

  editSettings(settings: FrustumSettings) {
    this.defaultFrustumSettings_ = settings;
  }

  create_(obj: BaseObject, settings: FrustumSettings) {
    const frustumMesh = new FrustumMesh(obj, settings);

    this.add(frustumMesh);
    EventBus.getInstance().emit(EventBusEvent.FrustumMeshUpdate);
  }

  remove(id: number) {
    this.meshes.splice(id, 1);
    EventBus.getInstance().emit(EventBusEvent.FrustumMeshUpdate);
  }

  removeByObjectId(id: number) {
    const index = this.meshes.findIndex((mesh) => mesh.obj.id === id);

    if (index !== -1) {
      this.remove(index);
    }

    EventBus.getInstance().emit(EventBusEvent.FrustumMeshUpdate);
  }

  removeBySourceAndTarget(sourceId: number, targetId: number) {
    const index = this.meshes.findIndex(
      (mesh) => mesh.obj.id === sourceId && (mesh.targetObj?.id ?? -1) === targetId,
    );

    if (index !== -1) {
      this.remove(index);
    }

    EventBus.getInstance().emit(EventBusEvent.FrustumMeshUpdate);
  }

  /**
   * Removes exactly one mesh matching source, target, and az/el offsets.
   * Unlike removeByObjectId, this disambiguates between earth-center and
   * free-direction frustums attached to the same satellite.
   */
  removeByAttributes(sourceId: number, targetId: number, azimuthOffset: Degrees, elevationOffset: Degrees) {
    const index = this.meshes.findIndex(
      (mesh) => mesh.obj.id === sourceId &&
        (mesh.targetObj?.id ?? -1) === targetId &&
        mesh.azimuthOffset === azimuthOffset &&
        mesh.elevationOffset === elevationOffset,
    );

    if (index !== -1) {
      this.remove(index);
    }

    EventBus.getInstance().emit(EventBusEvent.FrustumMeshUpdate);
  }
}
