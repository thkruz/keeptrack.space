import { ServiceLocator } from '@app/engine/core/service-locator';
import { mat4 } from 'gl-matrix';
import { CustomMesh } from './custom-mesh';

export abstract class CustomMeshFactory<T extends CustomMesh> {
  meshes: T[] = [];

  remove(id: number) {
    this.meshes.splice(id, 1);
  }

  clear() {
    this.meshes = [];
  }

  add(mesh: T) {
    const renderer = ServiceLocator.getRenderer();

    mesh.init(renderer.gl);
    mesh.id = this.meshes.length;
    this.meshes.push(mesh);
  }

  protected abstract create_(...args: unknown[]): void;
  public generateMesh(...args: unknown[]): void {
    if (this.checkCacheForMesh_(...args)) {
      // Mesh already exists
      return;
    }
    this.create_(...args);
  }
  abstract checkCacheForMesh_(...args: unknown[]): CustomMesh | undefined;
  abstract drawAll(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer): void;
}
