import { OcclusionProgram } from '@app/engine/rendering/draw-manager/post-processing';
import { GlUtils } from '@app/engine/rendering/gl-utils';
import { MeshManager } from '@app/engine/rendering/mesh-manager';
import { mat4, vec3 } from 'gl-matrix';
import { vi } from 'vitest';
import flagAtlas from '../../../../public/img/flag-atlas/atlas.json';

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

  describe('flag decal', () => {
    type Internals = {
      setFlag_(obj: unknown, id: number): void;
      gl_: unknown;
      flagAtlasState_: string;
      flagAtlasTexture_: unknown;
    };
    const internals = () => meshManager as unknown as Internals;
    const usCell = (flagAtlas.cells as unknown as Record<string, number[]>).us;
    let saved: boolean;

    beforeEach(() => {
      saved = settingsManager.isDrawFlagDecals;
      settingsManager.isDrawFlagDecals = true;
      meshManager.mvMatrix_ = mat4.fromTranslation(mat4.create(), [0, 0, -10]);
      meshManager.currentMeshObject.model = { id: 1, name: 'x', bounds: { min: vec3.create(), max: vec3.create(), center: vec3.create(), radius: 1 } };
    });

    afterEach(() => {
      settingsManager.isDrawFlagDecals = saved;
      vi.restoreAllMocks();
    });

    it('caches the country flag cell as (u0, v0, width, height)', () => {
      internals().setFlag_({ country: 'US' }, 7);
      const flag = meshManager.currentMeshObject.flag!;

      expect(flag.enabled).toBe(true);
      expect(flag.objectId).toBe(7);
      expect(flag.cell[0]).toBeCloseTo(usCell[0], 6);
      expect(flag.cell[2]).toBeCloseTo(usCell[2] - usCell[0], 6);
    });

    it('has no flag for an object with no country', () => {
      internals().setFlag_({ country: '' }, 8);

      expect(meshManager.currentMeshObject.flag!.enabled).toBe(false);
      expect(meshManager.prepareFlagDecal(mat4.create())).toBeNull();
    });

    it('returns null when the setting is off, without loading the atlas', () => {
      const loadSpy = vi.spyOn(GlUtils, 'initTexture');

      internals().setFlag_({ country: 'US' }, 7);
      settingsManager.isDrawFlagDecals = false;

      expect(meshManager.prepareFlagDecal(mat4.create())).toBeNull();
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('loads the atlas once, then returns it and writes the basis', async () => {
      const texture = { tex: 1 };
      const loadSpy = vi.spyOn(GlUtils, 'initTexture').mockResolvedValue(texture as never);

      internals().gl_ = {};
      internals().setFlag_({ country: 'US' }, 7);

      expect(meshManager.prepareFlagDecal(mat4.create())).toBeNull();
      expect(meshManager.prepareFlagDecal(mat4.create())).toBeNull();
      await Promise.resolve();
      await Promise.resolve();
      expect(loadSpy).toHaveBeenCalledTimes(1);

      expect(meshManager.prepareFlagDecal(mat4.create())).toBe(texture);
      /*
       * camMatrix identity, model translated to (0,0,-10): the camera sits on the model's +Z, so
       * dir = (0,0,1). Screen up is camMatrix +Z (the projection swaps (x,y,z) -> (x,z,-y)), which
       * is parallel to dir, and so is the model +Z fallback, so v falls back to model +X.
       */
      const round = (v: Iterable<number>) => [...v].map((c) => Math.round(c * 1e9) / 1e9 + 0);

      expect(round(meshManager.decalBasis.dir)).toEqual([0, 0, 1]);
      expect(round(meshManager.decalBasis.v)).toEqual([1, 0, 0]);
    });
  });
});
