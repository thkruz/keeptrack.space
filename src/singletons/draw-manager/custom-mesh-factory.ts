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

  abstract create(...args: unknown[]): void;
  abstract drawAll(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer): void;
}
