import type { MeshModel } from '../mesh-manager';

export abstract class MeshLoader {
  abstract supports(extension: string): boolean;
  abstract load(meshName: string, url: string, gl: WebGLRenderingContext): Promise<MeshModel | null>;
}
