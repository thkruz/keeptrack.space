import { OcclusionProgram } from '@app/engine/rendering/draw-manager/post-processing';
import { MeshManager } from '@app/engine/rendering/mesh-manager';
import { mat4 } from 'gl-matrix';

describe('MeshManager', () => {
  let meshManager: MeshManager;

  beforeEach(() => {
    meshManager = new MeshManager();
  });

  it('should not throw when draw is called before init', () => {
    const pMatrix = mat4.create();
    const camMatrix = mat4.create();

    expect(() => meshManager.draw(pMatrix, camMatrix)).not.toThrow();
  });

  it('should not throw when drawOcclusion is called before init', () => {
    const pMatrix = mat4.create();
    const camMatrix = mat4.create();

    expect(() => meshManager.drawOcclusion(pMatrix, camMatrix, null as unknown as OcclusionProgram, null as unknown as WebGLBuffer)).not.toThrow();
  });
});
