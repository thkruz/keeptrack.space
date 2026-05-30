import { vi } from 'vitest';
import { MeshManager } from '@app/engine/rendering/mesh-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { Degrees, Kilometers } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';

/*
 * Small pure pieces of the GL managers: MeshManager's model/position state and
 * WebGLRenderer's viewport/screen-coordinate accessors. The renderer comes from
 * the standard environment so its mock GL context is wired up.
 */
describe('MeshManager state', () => {
  let mesh: MeshManager;

  beforeEach(() => {
    setupStandardEnvironment();
    mesh = new MeshManager();
  });

  it('setCurrentModel resets rotation when the model name changes', () => {
    mesh.currentMeshObject.rotation = { x: 30 as Degrees, y: 40 as Degrees, z: 50 as Degrees };
    mesh.setCurrentModel({ name: 'sat2' } as never);

    expect(mesh.currentMeshObject.model).toStrictEqual({ name: 'sat2' });
    expect(mesh.currentMeshObject.rotation).toStrictEqual({ x: 0, y: 0, z: 0 });
  });

  it('setCurrentModel keeps rotation when the model name is unchanged', () => {
    mesh.setCurrentModel({ name: 'sat' } as never);
    mesh.currentMeshObject.rotation = { x: 30 as Degrees, y: 0 as Degrees, z: 0 as Degrees };
    mesh.setCurrentModel({ name: 'sat' } as never);

    expect(mesh.currentMeshObject.rotation.x).toBe(30);
  });

  it('updatePosition writes the target position', () => {
    mesh.updatePosition({ x: 100 as Kilometers, y: 200 as Kilometers, z: 300 as Kilometers });

    expect(mesh.currentMeshObject.position).toStrictEqual({ x: 100, y: 200, z: 300 });
  });
});

describe('WebGLRenderer accessors', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => vi.restoreAllMocks());

  it('getCurrentViewport reports the drawing-buffer extents', () => {
    const renderer = ServiceLocator.getRenderer();
    const vp = renderer.getCurrentViewport();

    expect(vp).toHaveLength(4);
    expect(vp[0]).toBe(0);
    expect(vp[1]).toBe(0);
  });

  it('getDrawingBufferSize returns a 2-component size', () => {
    const renderer = ServiceLocator.getRenderer();

    expect(renderer.getDrawingBufferSize()).toHaveLength(2);
  });

  it('getPixelRatio returns the device pixel ratio', () => {
    const renderer = ServiceLocator.getRenderer();

    expect(renderer.getPixelRatio()).toBe(window.devicePixelRatio);
  });

  describe('getScreenCoords', () => {
    it('flags an error for an object with no position', () => {
      const renderer = ServiceLocator.getRenderer();
      const result = renderer.getScreenCoords({ id: 999 } as never);

      expect(result.error).toBe(true);
    });

    it('returns a screen-coordinate result for a positioned object', () => {
      const renderer = ServiceLocator.getRenderer();
      const result = renderer.getScreenCoords(defaultSat);

      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
      expect(typeof result.error).toBe('boolean');
    });
  });
});
