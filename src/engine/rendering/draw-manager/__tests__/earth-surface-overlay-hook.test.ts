/* eslint-disable dot-notation */
import { CameraType } from '@app/engine/camera/camera-type';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Earth } from '@app/engine/rendering/draw-manager/earth';
import type { EarthSurfaceDrawContext, EarthSurfaceOverlay } from '@app/engine/rendering/draw-manager/earth-surface-layers';
import { mat4 } from 'gl-matrix';
import { vi } from 'vitest';

const overlay = (id: string, ready = true) => {
  const seen: EarthSurfaceDrawContext[] = [];
  const o: EarthSurfaceOverlay = { id, isReady: () => ready, draw: (ctx) => seen.push(ctx) };

  return { o, seen };
};

describe('Earth surface overlay hook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds no context and touches no services when nothing is registered', () => {
    const earth = new Earth();
    const camera = vi.spyOn(ServiceLocator, 'getMainCamera');

    earth['drawSurfaceOverlays_']({} as WebGL2RenderingContext, null);
    expect(camera).not.toHaveBeenCalled();
  });

  it('passes the surface matrices, camera and lighting to each ready overlay', () => {
    const earth = new Earth();
    const view = mat4.lookAt(mat4.create(), [7000, 0, 0], [0, 0, 0], [0, 0, 1]);
    const projection = mat4.perspective(mat4.create(), 1, 1.5, 1, 1e6);
    const pv = mat4.mul(mat4.create(), projection, view);
    const model = mat4.fromZRotation(mat4.create(), 0.25);

    vi.spyOn(ServiceLocator, 'getMainCamera').mockReturnValue({
      projectionMatrix: projection,
      matrixWorldInverse: view,
      cameraType: CameraType.FIXED_TO_EARTH,
      zoomLevel: () => 0.5,
    } as never);
    vi.spyOn(ServiceLocator, 'getRenderer').mockReturnValue({ projectionCameraMatrix: pv } as never);
    vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ gmst: 0.25 } as never);
    earth['modelViewMatrix_'] = model;
    earth.lightDirection = [0, 1, 0];
    const a = overlay('a');
    const off = overlay('off', false);

    earth.registerSurfaceOverlay(a.o);
    earth.registerSurfaceOverlay(off.o);
    const gl = { drawingBufferWidth: 800, drawingBufferHeight: 600 } as WebGL2RenderingContext;

    earth['drawSurfaceOverlays_'](gl, null);

    expect(off.seen).toHaveLength(0);
    expect(a.seen).toHaveLength(1);
    const ctx = a.seen[0];

    expect(ctx).toMatchObject({ gl, targetFramebuffer: null, gmst: 0.25, cameraType: CameraType.FIXED_TO_EARTH, drawingBufferWidth: 800, drawingBufferHeight: 600 });
    expect(ctx.projectionViewMatrix).toBe(pv);
    expect(ctx.modelMatrix).toBe(model);
    expect(ctx.cameraPosition[0]).toBeCloseTo(7000, 3);
    expect(ctx.lighting.lightDirection).toEqual([0, 1, 0]);
    expect(ctx.lighting.zoomLevel).toBeCloseTo(0.5, 9);

    expect(earth.unregisterSurfaceOverlay('a')).toBe(true);
    earth['drawSurfaceOverlays_'](gl, null);
    expect(a.seen).toHaveLength(1);
  });
});
