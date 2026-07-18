import { MeshModel } from '../mesh-manager';
import type { MeshLoader } from './mesh-loader';

export class MeshRegistry {
  private readonly meshes = new Map<string, MeshModel>();
  private readonly loaders = new Map<string, MeshLoader>();
  private readonly loadingPromises = new Map<string, Promise<MeshModel>>();
  private readonly failed = new Set<string>();

  registerLoader(loader: MeshLoader, extensions: string[]) {
    extensions.forEach((ext) => this.loaders.set(ext, loader));
  }

  get(meshName: string): MeshModel | undefined {
    return this.meshes.get(meshName);
  }

  /**
   * A load for this mesh is already in flight or has permanently failed. The
   * render loop calls load() every frame while a model is missing, so callers
   * use this to avoid re-dispatching (and re-logging) a load that is already
   * settled or doomed. Cached meshes are excluded because get() already returns
   * them, so callers never reach the load path for those.
   */
  isLoadingOrFailed(meshName: string): boolean {
    return this.loadingPromises.has(meshName) || this.failed.has(meshName);
  }

  // eslint-disable-next-line require-await
  async load(meshName: string, url: string, gl: WebGLRenderingContext): Promise<MeshModel> {
    /*
     * The mesh is keyed by meshName everywhere (get()/set()), so the cache,
     * in-flight, and failure bookkeeping must all key by meshName too. Keying
     * any of them by url silently misses and re-fetches an already-loaded mesh.
     */
    if (this.meshes.has(meshName)) {
      return this.meshes.get(meshName)!;
    }

    /*
     * A previous attempt failed (e.g. the model file 404'd or the network
     * dropped). The render loop calls load() every frame, so without this guard
     * a single failure becomes a per-frame fetch + unhandled-rejection storm.
     */
    if (this.failed.has(meshName)) {
      throw new Error(`Mesh previously failed to load from ${url}`);
    }

    // Check if already loading
    if (this.loadingPromises.has(meshName)) {
      return this.loadingPromises.get(meshName)!;
    }

    // Start loading
    const extension = this.getExtension(url);
    const loader = this.loaders.get(extension);

    if (!loader) {
      throw new Error(`No loader for ${extension}`);
    }

    const promise = loader
      .load(meshName, url, gl)
      .then((mesh) => {
        if (!mesh) {
          throw new Error(`Failed to load mesh from ${url}`);
        }

        this.meshes.set(meshName, mesh);
        this.loadingPromises.delete(meshName);

        return mesh;
      })
      .catch((error: unknown) => {
        // Drop the in-flight entry and remember the failure so we don't refetch every frame.
        this.loadingPromises.delete(meshName);
        this.failed.add(meshName);

        throw error;
      });

    this.loadingPromises.set(meshName, promise);

    return promise;
  }

  private getExtension(url: string): string {
    return url.substring(url.lastIndexOf('.'));
  }
}
