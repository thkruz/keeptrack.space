import { keepTrackApi } from '@app/keepTrackApi';
import { KeepTrackMainCamera } from '../../keeptrack/camera/legacy-camera';
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
    const renderer = keepTrackApi.getRenderer();

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
  protected abstract checkCacheForMesh_(...args: unknown[]): CustomMesh | undefined;
  abstract render(camera: KeepTrackMainCamera, tgtBuffer: WebGLFramebuffer | null): void;
}
