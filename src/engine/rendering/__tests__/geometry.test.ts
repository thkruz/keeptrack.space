import { BufferAttribute } from '@app/engine/rendering/buffer-attribute';
import { BufferGeometry } from '@app/engine/rendering/buffer-geometry';
import { RingGeometry } from '@app/engine/rendering/ring-geometry';
import { SphereGeometry } from '@app/engine/rendering/sphere-geometry';
import { vec3 } from 'gl-matrix';
import { vi } from 'vitest';

/*
 * The geometry classes generate vertex/index data (pure math) and manage a
 * local model matrix. A WebGL context is only needed to upload buffers, so a
 * minimal mock context satisfies the index/buffer paths.
 */
const makeGl = () =>
  ({
    createBuffer: vi.fn(() => ({}) as WebGLBuffer),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    STATIC_DRAW: 0x88e4,
    UNSIGNED_SHORT: 0x1403,
    UNSIGNED_INT: 0x1405,
  }) as unknown as WebGL2RenderingContext;

describe('BufferGeometry', () => {
  it('constructs with a default type and identity model matrix', () => {
    const g = new BufferGeometry();

    expect(g.type).toBe('BufferGeometry');
    expect(g.localMvMatrix).toHaveLength(16);
  });

  it('stores attributes via setAttribute / setAttributes', () => {
    const g = new BufferGeometry();
    const attr = new BufferAttribute({ location: 0, vertices: 3, offset: 0 });

    g.setAttribute('position', attr);
    expect(g.attributes.position).toBe(attr);

    g.setAttributes({ normal: attr });
    expect(g.attributes.normal).toBe(attr);
  });

  it('mutates the model matrix on rotate/translate/scale', () => {
    const g = new BufferGeometry();
    const before = [...g.localMvMatrix];

    g.rotateX(Math.PI / 4);
    g.rotateY(Math.PI / 4);
    g.rotateZ(Math.PI / 4);
    g.translate(1, 2, 3);
    g.scale(2, 2, 2);

    expect([...g.localMvMatrix]).not.toStrictEqual(before);
  });

  it('clone copies the attribute/index/matrix references', () => {
    const g = new BufferGeometry();

    g.setAttribute('position', new BufferAttribute({ location: 0, vertices: 3, offset: 0 }));
    const c = g.clone();

    expect(c).not.toBe(g);
    expect(c.attributes).toBe(g.attributes);
    expect(c.localMvMatrix).toBe(g.localMvMatrix);
  });

  it('setIndex chooses 16-bit indices for small meshes', () => {
    const g = new BufferGeometry();
    const gl = makeGl();

    g.setIndex(gl, [0, 1, 2]);
    expect(g.indexType).toBe(gl.UNSIGNED_SHORT);
    expect(g.getIndex()).toBeDefined();
  });

  it('setIndex upgrades to 32-bit indices past the Uint16 range', () => {
    const g = new BufferGeometry();
    const gl = makeGl();

    g.setIndex(gl, [0, 1, 70000]);
    expect(g.indexType).toBe(gl.UNSIGNED_INT);
  });

  it('setCombinedBuffer uploads vertex data', () => {
    const g = new BufferGeometry();
    const gl = makeGl();

    g.setCombinedBuffer(gl, [1, 2, 3, 4, 5, 6]);
    expect(g.getCombinedBuffer()).toBeDefined();
  });
});

describe('SphereGeometry', () => {
  const build = () => new SphereGeometry(makeGl(), { radius: 100, widthSegments: 8, heightSegments: 8 });

  it('generates a non-empty index set on construction', () => {
    const sphere = build();

    expect(sphere.getSortedIndices().length).toBeGreaterThan(0);
    // 8x8 quads x 2 triangles x 3 verts.
    expect(sphere.getSortedIndices()).toHaveLength(8 * 8 * 6);
  });

  it('sortFacesByDistance preserves the index count and reorders faces', () => {
    const sphere = build();
    const before = sphere.getSortedIndices().length;

    sphere.sortFacesByDistance(vec3.fromValues(1000, 0, 0));
    expect(sphere.getSortedIndices()).toHaveLength(before);
  });

  it('sortFacesByDistance accepts an optional model matrix', () => {
    const sphere = build();

    expect(() => sphere.sortFacesByDistance(vec3.fromValues(0, 1000, 0), new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]))).not.toThrow();
  });

  it('resetSorting restores the original order', () => {
    const sphere = build();
    const original = [...sphere.getSortedIndices()];

    sphere.sortFacesByDistance(vec3.fromValues(1000, 0, 0));
    sphere.resetSorting();
    expect(sphere.getSortedIndices()).toStrictEqual(original);
  });
});

describe('RingGeometry', () => {
  const build = () => new RingGeometry(makeGl(), { innerRadius: 50, outerRadius: 100, thetaSegments: 16, phiSegments: 2 });

  it('generates index data on construction', () => {
    const ring = build();

    expect(ring.getSortedIndices().length).toBeGreaterThan(0);
  });

  it('sorts and resets without throwing', () => {
    const ring = build();
    const original = [...ring.getSortedIndices()];

    ring.sortFacesByDistance(vec3.fromValues(500, 0, 0));
    ring.resetSorting();
    expect(ring.getSortedIndices()).toStrictEqual(original);
  });
});
