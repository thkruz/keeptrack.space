import { MeshModel } from '../mesh-manager';
import type { MeshLoader } from './mesh-loader';

export class MeshRegistry {
  private readonly meshes = new Map<string, MeshModel>();
  private readonly loaders = new Map<string, MeshLoader>();
  private readonly loadingPromises = new Map<string, Promise<MeshModel>>();

  registerLoader(loader: MeshLoader, extensions: string[]) {
    extensions.forEach((ext) => this.loaders.set(ext, loader));
  }

  get(meshName: string): MeshModel | undefined {
    return this.meshes.get(meshName);
  }

  // eslint-disable-next-line require-await
  async load(meshName: string, url: string, gl: WebGLRenderingContext): Promise<MeshModel> {
    // Check cache
    if (this.meshes.has(url)) {
      return this.meshes.get(url)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Start loading
    const extension = this.getExtension(url);
    const loader = this.loaders.get(extension);

    if (!loader) {
      throw new Error(`No loader for ${extension}`);
    }

    const promise = loader.load(meshName, url, gl).then((mesh) => {
      if (!mesh) {
        throw new Error(`Failed to load mesh from ${url}`);
      }

      this.meshes.set(meshName, mesh);
      this.loadingPromises.delete(url);

      return mesh;
    });

    this.loadingPromises.set(url, promise);

    return promise;
  }

  private getExtension(url: string): string {
    return url.substring(url.lastIndexOf('.'));
  }
}
