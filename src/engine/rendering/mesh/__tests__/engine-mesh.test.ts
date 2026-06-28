import { ServiceLocator } from '@app/engine/core/service-locator';
import { MeshRegistry } from '@app/engine/rendering/mesh/mesh-registry';
import { MeshRenderer } from '@app/engine/rendering/mesh/mesh-renderer';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { mat3, mat4 } from 'gl-matrix';
import { OBJ } from 'webgl-obj-loader';
import { vi } from 'vitest';

// A real OBJ vertex layout so MeshRenderer.applyAttributePointers_ runs the genuine
// attribute-binding path (it reads layout.attributeMap[key].{size,type,...}).
const realLayout = () => new OBJ.Layout(
  OBJ.Layout.POSITION, OBJ.Layout.NORMAL, OBJ.Layout.UV,
  OBJ.Layout.AMBIENT, OBJ.Layout.DIFFUSE, OBJ.Layout.SPECULAR, OBJ.Layout.SPECULAR_EXPONENT,
);

describe('MeshRegistry', () => {
  let registry: MeshRegistry;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gl = () => global.mocks.glMock as any;
  const meshModel = (name: string) => ({ name }) as never;

  beforeEach(() => {
    registry = new MeshRegistry();
  });

  it('returns undefined for an unknown mesh and routes by file extension', async () => {
    expect(registry.get('missing')).toBeUndefined();

    const loader = { supports: () => true, load: vi.fn(() => Promise.resolve(meshModel('teapot'))) };

    registry.registerLoader(loader as never, ['.obj']);

    const mesh = await registry.load('teapot', 'http://x/teapot.obj', gl());

    expect(mesh).toStrictEqual({ name: 'teapot' });
    expect(loader.load).toHaveBeenCalledWith('teapot', 'http://x/teapot.obj', gl());
    expect(registry.get('teapot')).toStrictEqual({ name: 'teapot' });
  });

  it('serves a second load of the same mesh from cache without refetching', async () => {
    const loader = { supports: () => true, load: vi.fn(() => Promise.resolve(meshModel('teapot'))) };

    registry.registerLoader(loader as never, ['.obj']);

    const first = await registry.load('teapot', 'http://x/teapot.obj', gl());
    // A later render frame asks for the same mesh again — it must hit the cache, not the loader.
    const second = await registry.load('teapot', 'http://x/teapot.obj', gl());

    expect(second).toBe(first);
    expect(loader.load).toHaveBeenCalledTimes(1);
  });

  it('throws when no loader is registered for the extension', async () => {
    await expect(registry.load('x', 'http://x/model.fbx', gl())).rejects.toThrow(/No loader/u);
  });

  it('throws when the loader resolves to a null mesh', async () => {
    const loader = { supports: () => true, load: vi.fn(() => Promise.resolve(null)) };

    registry.registerLoader(loader as never, ['.obj']);

    await expect(registry.load('x', 'http://x/bad.obj', gl())).rejects.toThrow(/Failed to load/u);
  });

  it('does not refetch a url after it failed, and keeps rejecting', async () => {
    const loader = { supports: () => true, load: vi.fn(() => Promise.reject(new Error('Failed to fetch'))) };

    registry.registerLoader(loader as never, ['.obj']);

    await expect(registry.load('x', 'http://x/gone.obj', gl())).rejects.toThrow(/Failed to fetch/u);
    // Second call (e.g. the very next render frame) must reject without hitting the loader again.
    await expect(registry.load('x', 'http://x/gone.obj', gl())).rejects.toThrow(/previously failed/u);
    expect(loader.load).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent loads of the same url', async () => {
    let resolveFn: (m: unknown) => void = () => undefined;
    const pending = new Promise((r) => {
      resolveFn = r;
    });
    const loader = { supports: () => true, load: vi.fn(() => pending) };

    registry.registerLoader(loader as never, ['.obj']);

    const p1 = registry.load('dup', 'http://x/dup.obj', gl());
    const p2 = registry.load('dup', 'http://x/dup.obj', gl());

    resolveFn(meshModel('dup'));
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe(r2);
    expect(loader.load).toHaveBeenCalledTimes(1);
  });
});

describe('MeshRenderer', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gl = () => global.mocks.glMock as any;

  const fakeMeshManager = (over: Record<string, unknown> = {}) => ({
    isReady: true,
    nMatrix_: mat3.create(),
    mvMatrix_: mat4.create(),
    currentMeshObject: {
      id: 1,
      inSun: 1,
      model: {
        mesh: {},
        layout: realLayout(),
        buffers: { vertexBuffer: {}, indexBuffer: {}, indexCount: 3, useUint32Indices: false },
      },
    },
    ...over,
  });

  let savedFlags: Record<string, unknown>;

  beforeEach(() => {
    setupStandardEnvironment();
    savedFlags = {
      disableUI: settingsManager.disableUI,
      isDrawLess: settingsManager.isDrawLess,
      noMeshManager: settingsManager.noMeshManager,
      nearZoomLevel: settingsManager.nearZoomLevel,
    };
    settingsManager.disableUI = false;
    settingsManager.isDrawLess = false;
    settingsManager.noMeshManager = false;
    settingsManager.nearZoomLevel = 1_000_000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ServiceLocator.getMainCamera() as any).state.camDistBuffer = 0;
    // glMock methods are shared vi.fns — reset their call history each test.
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.assign(settingsManager, savedFlags);
    vi.restoreAllMocks();
  });

  it('compiles shaders on construction', () => {
    const createShaderSpy = vi.spyOn(gl(), 'createShader');

    const renderer = new MeshRenderer(fakeMeshManager() as never, gl());

    expect(renderer).toBeDefined();
    expect(createShaderSpy).toHaveBeenCalled();
  });

  it('draws the current mesh through the GL pipeline', () => {
    const mm = fakeMeshManager();
    const renderer = new MeshRenderer(mm as never, gl());
    const drawSpy = vi.spyOn(gl(), 'drawElements');

    const attribSpy = vi.spyOn(gl(), 'vertexAttribPointer');

    renderer.draw(mat4.create(), mat4.create());

    expect(drawSpy).toHaveBeenCalledWith(gl().TRIANGLES, 3, gl().UNSIGNED_SHORT, 0);
    // The attribute-binding path actually runs now (real GLint locations + real layout).
    expect(attribSpy).toHaveBeenCalled();
    expect(attribSpy.mock.calls[0][2]).toBe(gl().FLOAT);
  });

  it('warns and skips binding when an attribute location is not found (-1)', () => {
    const renderer = new MeshRenderer(fakeMeshManager() as never, gl());
    const attribSpy = vi.spyOn(gl(), 'vertexAttribPointer');

    vi.spyOn(gl(), 'getAttribLocation').mockReturnValue(-1);

    renderer.draw(mat4.create(), mat4.create());

    expect(attribSpy).not.toHaveBeenCalled();
  });

  it('uses the 32-bit index path when the model requests them', () => {
    const mm = fakeMeshManager();

    mm.currentMeshObject.model.buffers.useUint32Indices = true;
    mm.currentMeshObject.model.buffers.indexCount = 70_000;
    const renderer = new MeshRenderer(mm as never, gl());
    const drawSpy = vi.spyOn(gl(), 'drawElements');

    renderer.draw(mat4.create(), mat4.create());

    expect(drawSpy).toHaveBeenCalledWith(gl().TRIANGLES, 70_000, gl().UNSIGNED_INT, 0);
  });

  it('skips drawing when UI is disabled, the manager is not ready, or buffers are missing', () => {
    const renderer = new MeshRenderer(fakeMeshManager() as never, gl());
    const drawSpy = vi.spyOn(gl(), 'drawElements');

    settingsManager.disableUI = true;
    renderer.draw(mat4.create(), mat4.create());
    settingsManager.disableUI = false;

    renderer.draw(mat4.create(), mat4.create()); // ready manager → draws
    expect(drawSpy).toHaveBeenCalledTimes(1);

    const notReady = new MeshRenderer(fakeMeshManager({ isReady: false }) as never, gl());

    notReady.draw(mat4.create(), mat4.create());
    expect(drawSpy).toHaveBeenCalledTimes(1);
  });

  it('skips drawing when the camera is beyond the near-zoom level', () => {
    const renderer = new MeshRenderer(fakeMeshManager() as never, gl());
    const drawSpy = vi.spyOn(gl(), 'drawElements');

    settingsManager.nearZoomLevel = -1; // camDistBuffer 0 >= -1 → bail
    renderer.draw(mat4.create(), mat4.create());

    expect(drawSpy).not.toHaveBeenCalled();
  });

  it('drawOcclusion runs the occlusion program', () => {
    const mm = fakeMeshManager();
    const renderer = new MeshRenderer(mm as never, gl());
    const occlusionPrgm = {
      program: {},
      attrSetup: vi.fn(),
      uniformSetup: vi.fn(),
      uniform: { uWorldOffset: {} },
      attrOff: vi.fn(),
    };

    renderer.drawOcclusion(mat4.create(), mat4.create(), occlusionPrgm as never, {} as never);

    expect(occlusionPrgm.attrSetup).toHaveBeenCalled();
    expect(occlusionPrgm.uniformSetup).toHaveBeenCalled();
    expect(occlusionPrgm.attrOff).toHaveBeenCalled();
  });
});
