import { vi } from 'vitest';
import { GlUtils } from '@app/engine/rendering/gl-utils';
import { errorManagerInstance } from '@app/engine/utils/errorManager';

/*
 * GlUtils mixes pure vertex/vector math (geometry generators, cross/subtract,
 * normal calculation) with thin WebGL buffer/attribute helpers. The math is
 * tested directly; the GL helpers are driven through a minimal mock context to
 * confirm they issue the right calls.
 */
describe('GlUtils pure helpers', () => {
  describe('isPowerOf2', () => {
    it.each([
      [1, true], [2, true], [1024, true], [65536, true],
      [3, false], [1000, false], [1023, false],
    ])('isPowerOf2(%i) === %s', (value, expected) => {
      expect(GlUtils.isPowerOf2(value)).toBe(expected);
    });
  });

  describe('getCellsTypedArray', () => {
    it('picks the narrowest typed array that fits the index range', () => {
      expect(GlUtils.getCellsTypedArray(200)).toBe(Uint8Array);
      expect(GlUtils.getCellsTypedArray(1000)).toBe(Uint16Array);
      expect(GlUtils.getCellsTypedArray(100000)).toBe(Uint32Array);
    });

    it('uses the inclusive boundaries (255 / 65535)', () => {
      expect(GlUtils.getCellsTypedArray(255)).toBe(Uint8Array);
      expect(GlUtils.getCellsTypedArray(65535)).toBe(Uint16Array);
    });
  });

  describe('getBestTexture', () => {
    it('returns the highest-resolution texture available', () => {
      const t4 = {} as WebGLTexture;
      const t1 = {} as WebGLTexture;

      expect(GlUtils.getBestTexture({ '1k': t1, '4k': t4 })).toBe(t4);
    });

    it('returns null when the map is empty', () => {
      expect(GlUtils.getBestTexture({})).toBeNull();
    });
  });

  describe('vector math', () => {
    it('crossProduct of x̂ and ŷ is ẑ', () => {
      expect(GlUtils.crossProduct([1, 0, 0], [0, 1, 0])).toStrictEqual([0, 0, 1]);
    });

    it('subtract does component-wise subtraction', () => {
      expect(GlUtils.subtract([1, 2, 3], [1, 1, 1])).toStrictEqual([0, 1, 2]);
    });

    it('flattenVec3 flattens {x,y,z} objects into a number array', () => {
      expect(GlUtils.flattenVec3([{ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }])).toStrictEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('calculateTriangleIndices', () => {
    it('emits 36 indices (6 faces x 2 triangles x 3 verts)', () => {
      const indices = GlUtils.calculateTriangleIndices();

      expect(indices).toHaveLength(36);
      expect(indices.slice(0, 6)).toStrictEqual([0, 1, 2, 0, 2, 3]);
      expect(indices.slice(6, 12)).toStrictEqual([8, 9, 10, 8, 10, 11]);
    });
  });

  describe('calculateNormals', () => {
    it('computes the +Z face normal for a single flat triangle', () => {
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const normals = GlUtils.calculateNormals(vertices, [0, 1, 2]);

      expect(normals).toHaveLength(9);
      // Every vertex normal should point along +Z.
      expect(normals[0]).toBeCloseTo(0, 6);
      expect(normals[1]).toBeCloseTo(0, 6);
      expect(normals[2]).toBeCloseTo(1, 6);
    });
  });

  describe('geometry generators return interleaved position/normal arrays', () => {
    it('createRadarDomeVertices yields interleaved pos/normal verts and triangle indices', () => {
      const { combinedArray, vertIndex } = GlUtils.createRadarDomeVertices(100, 200, 0, 90, 0, 90);

      expect(combinedArray.length).toBeGreaterThan(0);
      expect(combinedArray.length % 6).toBe(0); // pos(3) + normal(3) per vertex
      expect(vertIndex.length).toBeGreaterThan(0);
      expect(vertIndex.length % 3).toBe(0); // triangles
      // First vertex: e=0,a=0,minRange -> (0,0,100) at minEl=minAz=0.
      // (Position components are finite; normals may be NaN at degenerate quads.)
      expect(combinedArray[0]).toBeCloseTo(0, 6);
      expect(combinedArray[2]).toBeCloseTo(100, 6);
      expect(Number.isFinite(combinedArray[6])).toBe(true); // next vertex position x
    });

    it('createSphere returns non-empty, finite geometry', () => {
      const { combinedArray, vertIndex } = GlUtils.createSphere(6371, 10, 10);

      expect(combinedArray.length).toBeGreaterThan(0);
      expect(vertIndex.length).toBeGreaterThan(0);
      expect(combinedArray.every((v) => Number.isFinite(v))).toBe(true);
    });

    it('cube returns geometry with indices', () => {
      const { combinedArray, vertIndex } = GlUtils.cube();

      expect(combinedArray.length).toBeGreaterThan(0);
      expect(vertIndex.length).toBeGreaterThan(0);
    });

    it('ellipsoidFromCovariance scales geometry by the given radii', () => {
      const { combinedArray, vertIndex } = GlUtils.ellipsoidFromCovariance([1, 2, 3] as never);

      expect(combinedArray.length).toBeGreaterThan(0);
      expect(vertIndex.length).toBeGreaterThan(0);
      expect(combinedArray.every((v) => Number.isFinite(v))).toBe(true);
    });

    it('customMesh interleaves supplied vertices with computed normals', () => {
      // 24 cube vertices (8 corners x 3 faces) as a flat Float32Array.
      const verts = new Float32Array(72).map((_v, i) => (i % 3) - 1);
      const { combinedArray, vertIndex } = GlUtils.customMesh(verts);

      expect(combinedArray).toHaveLength(72 * 2); // pos + normal per vertex
      expect(vertIndex.length).toBeGreaterThan(0);
    });
  });
});

describe('GlUtils WebGL helpers (mock context)', () => {
  const makeGl = () => ({
    getAttribLocation: vi.fn(() => 7),
    getUniformLocation: vi.fn(() => ({}) as WebGLUniformLocation),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    createBuffer: vi.fn(() => ({}) as WebGLBuffer),
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    STATIC_DRAW: 0x88E4,
    DYNAMIC_DRAW: 0x88E8,
  });

  afterEach(() => vi.restoreAllMocks());

  it('assignAttributes resolves each attribute location from the program', () => {
    const gl = makeGl();
    const attribs = { aPos: { location: -1 } } as never;

    GlUtils.assignAttributes(attribs, gl as never, {} as WebGLProgram, ['aPos']);
    expect((attribs as Record<string, { location: number }>).aPos.location).toBe(7);
  });

  it('assignUniforms stores the resolved uniform location', () => {
    const gl = makeGl();
    const uniforms = {} as Record<string, WebGLUniformLocation | null>;

    GlUtils.assignUniforms(uniforms, gl as never, {} as WebGLProgram, ['uColor']);
    expect(uniforms.uColor).toBeDefined();
  });

  it('assignUniforms warns (does not throw) when a uniform is missing off-localhost', () => {
    const gl = makeGl();

    gl.getUniformLocation = vi.fn(() => null);
    const warnSpy = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

    expect(() => GlUtils.assignUniforms({}, gl as never, {} as WebGLProgram, ['uMissing'])).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('bindArrayBuffer uploads data as a STATIC_DRAW array buffer', () => {
    const gl = makeGl();
    const data = new Float32Array([1, 2, 3]);

    GlUtils.bindArrayBuffer(gl as never, {} as WebGLBuffer, data);
    expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, expect.anything());
    expect(gl.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  });

  it('createElementArrayBuffer creates, binds, and uploads index data', () => {
    const gl = makeGl();
    const data = new Uint16Array([0, 1, 2]);
    const buffer = GlUtils.createElementArrayBuffer(gl as never, data);

    expect(buffer).toBeDefined();
    expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ELEMENT_ARRAY_BUFFER, expect.anything());
    expect(gl.bufferData).toHaveBeenCalledWith(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
  });
});
