import { Material } from '@app/engine/rendering/material';
import { OBJLoader } from '@app/engine/rendering/mesh/loaders/webgl-obj-loader';
import { vi } from 'vitest';
import { OBJ } from 'webgl-obj-loader';

const glMock = () =>
  ({
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    ARRAY_BUFFER: 0,
    ELEMENT_ARRAY_BUFFER: 1,
    STATIC_DRAW: 2,
  }) as unknown as WebGLRenderingContext;

/** Build a minimal webgl-obj-loader Mesh-like object keyed by name. */
const buildMesh = (name: string, numItems: number) => {
  const vertexData = Object.assign(new Float32Array(40), { numItems });
  const indexData = Object.assign(new Uint16Array([0, 1, 2]), { numItems: 3 });

  return {
    [name]: {
      makeBufferData: vi.fn(() => vertexData),
      makeIndexBufferDataForMaterials: vi.fn(() => indexData),
      materialIndices: { mat0: 0 },
      indicesPerMaterial: { 0: [0, 1, 2] },
      vertices: [0, 0, 0],
      vertexNormals: [0, 0, 1],
      textures: [0, 0],
      indices: [0, 1, 2],
    },
  } as unknown as Parameters<OBJLoader['parseOBJ']>[1];
};

interface Parseable {
  parseOBJ(meshName: string, mesh: unknown, gl: WebGLRenderingContext): unknown;
}

describe('OBJLoader', () => {
  let loader: OBJLoader;

  beforeEach(() => {
    loader = new OBJLoader();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('supports', () => {
    it('supports .obj and rejects others', () => {
      expect(loader.supports('.obj')).toBe(true);
      expect(loader.supports('.gltf')).toBe(false);
    });
  });

  describe('parseOBJ', () => {
    it('builds a MeshModel using the uint16 index path (small meshes)', () => {
      const gl = glMock();
      const model = (loader as unknown as Parseable).parseOBJ('ship', buildMesh('ship', 100), gl) as {
        name: string;
        material: Material;
        buffers: { useUint32Indices: boolean; indexCount: number };
      };

      expect(model.name).toBe('ship');
      expect(model.material).toBeInstanceOf(Material);
      expect(model.buffers.useUint32Indices).toBe(false);
      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('uses the uint32 index path for large meshes (> 65535 items)', () => {
      const gl = glMock();
      const model = (loader as unknown as Parseable).parseOBJ('big', buildMesh('big', 70000), gl) as {
        buffers: { useUint32Indices: boolean; indexCount: number };
      };

      expect(model.buffers.useUint32Indices).toBe(true);
      expect(model.buffers.indexCount).toBe(3);
    });

    it('returns null and logs when parsing throws', () => {
      const gl = glMock();
      // Mesh missing the requested key -> makeBufferData access throws
      const result = (loader as unknown as Parseable).parseOBJ('missing', {} as unknown, gl);

      expect(result).toBeNull();
    });
  });

  describe('load', () => {
    it('downloads models then parses them into a MeshModel', async () => {
      const mesh = buildMesh('ship', 100);

      vi.spyOn(OBJ, 'downloadModels').mockResolvedValue(mesh as never);

      const model = await loader.load('ship', 'ship.obj', glMock());

      expect(OBJ.downloadModels).toHaveBeenCalled();
      expect((model as { name: string }).name).toBe('ship');
    });
  });
});
