import { keepTrackApi } from '@app/keepTrackApi';
import { mat4 } from 'gl-matrix';
import { CustomMesh } from './custom-mesh';

export abstract class CustomMeshFactory<T extends CustomMesh> {
  protected meshes_: T[] = [];

  remove(id: number) {
    this.meshes_.splice(id, 1);
  }

  clear() {
    this.meshes_ = [];
  }

  add(mesh: T) {
    const renderer = keepTrackApi.getRenderer();

    mesh.init(renderer.gl);
    mesh.id = this.meshes_.length;
    this.meshes_.push(mesh);
  }

  protected abstract create_(...args: unknown[]): void;
  public generateMesh(...args: unknown[]): void {
    if (this.checkCacheForMesh_(...args)) {
      // Mesh already exists
      return;
    }
    this.create_(...args);
  }
  abstract checkCacheForMesh_(...args: unknown[]): CustomMesh;
  abstract drawAll(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer): void;
}
