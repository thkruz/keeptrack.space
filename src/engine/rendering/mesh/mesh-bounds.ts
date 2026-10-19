import { vec3 } from 'gl-matrix';

/** Model-space axis-aligned bounds of a mesh, computed once at load. */
export interface MeshBounds {
  min: vec3;
  max: vec3;
  /** (min + max) / 2 */
  center: vec3;
  /** |max - min| / 2, the half-diagonal of the box. */
  radius: number;
}

/**
 * Compute the AABB of a flat xyz position array, optionally scaled (the OBJ loader
 * stores metres and draws kilometres, so it passes 0.001). An empty array yields a
 * zero box at the origin.
 */
export const computeMeshBounds = (positions: ArrayLike<number>, scale = 1): MeshBounds => {
  const count = Math.floor(positions.length / 3);

  if (count === 0) {
    return { min: vec3.create(), max: vec3.create(), center: vec3.create(), radius: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < count * 3; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const min = vec3.fromValues(minX * scale, minY * scale, minZ * scale);
  const max = vec3.fromValues(maxX * scale, maxY * scale, maxZ * scale);
  const center = vec3.fromValues((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);

  return { min, max, center, radius: vec3.distance(min, max) / 2 };
};
