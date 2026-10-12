import { computeMeshBounds } from '../mesh-bounds';

// The 8 corners of a unit cube centred on the origin (edge 1, so every coordinate is +-0.5).
const UNIT_CUBE = [-0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5];

describe('computeMeshBounds', () => {
  it('unit cube: centre (0,0,0), radius sqrt(3)/2', () => {
    const b = computeMeshBounds(UNIT_CUBE);

    // min/max are the cube corners; centre is their midpoint, 0 on every axis.
    expect([...b.min]).toEqual([-0.5, -0.5, -0.5]);
    expect([...b.max]).toEqual([0.5, 0.5, 0.5]);
    for (const c of b.center) {
      expect(Math.abs(c)).toBeLessThan(1e-6);
    }
    // Half the space diagonal of an edge-1 cube: sqrt(1+1+1)/2 = 0.8660254.
    expect(b.radius).toBeCloseTo(0.8660254, 6);
  });

  it('applies the load scale (metres -> km) and handles an offset box', () => {
    // Box from (0,0,0) to (2000,4000,4000) m -> (2,4,4) km; centre (1,2,2) km;
    // radius = sqrt(4+16+16)/2 = 6/2 = 3 km.
    const b = computeMeshBounds([0, 0, 0, 2000, 4000, 4000, 1000, 1000, 1000], 0.001);

    expect([...b.center].map((v) => Number(v.toFixed(9)))).toEqual([1, 2, 2]);
    expect(b.radius).toBeCloseTo(3, 9);
  });

  it('returns a zero box for no positions', () => {
    expect(computeMeshBounds([]).radius).toBe(0);
  });
});
