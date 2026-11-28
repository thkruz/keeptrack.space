import {
  buildSurfaceLighting,
  cameraPositionFromView,
  type EarthSurfaceDrawContext,
  type EarthSurfaceOverlay,
  EarthSurfaceOverlayRegistry,
} from '@app/engine/rendering/draw-manager/earth-surface-layers';
import { mat4 } from 'gl-matrix';
import { vi } from 'vitest';

const context = {} as EarthSurfaceDrawContext;

const overlay = (id: string, calls: string[], options: { ready?: boolean; throws?: boolean } = {}): EarthSurfaceOverlay => ({
  id,
  isReady: () => options.ready ?? true,
  draw: () => {
    if (options.throws) {
      throw new Error(`boom ${id}`);
    }
    calls.push(id);
  },
});

describe('EarthSurfaceOverlayRegistry', () => {
  it('draws ready overlays in registration order and skips the others', () => {
    const calls: string[] = [];
    const registry = new EarthSurfaceOverlayRegistry(vi.fn());

    registry.register(overlay('a', calls));
    registry.register(overlay('b', calls, { ready: false }));
    registry.register(overlay('c', calls));
    registry.drawAll(context);

    expect(calls).toEqual(['a', 'c']);
    expect(registry.ids()).toEqual(['a', 'b', 'c']);
    expect(registry.size).toBe(3);
  });

  it('re-registering an id replaces the old overlay and moves it last', () => {
    const calls: string[] = [];
    const registry = new EarthSurfaceOverlayRegistry(vi.fn());

    registry.register(overlay('a', calls));
    registry.register(overlay('b', calls));
    registry.register(overlay('a', calls));

    expect(registry.ids()).toEqual(['b', 'a']);
  });

  it('unregister removes by id and reports whether anything was removed', () => {
    const calls: string[] = [];
    const registry = new EarthSurfaceOverlayRegistry(vi.fn());

    registry.register(overlay('a', calls));

    expect(registry.unregister('missing')).toBe(false);
    expect(registry.unregister('a')).toBe(true);
    registry.drawAll(context);
    expect(calls).toEqual([]);
    expect(registry.size).toBe(0);
  });

  it('catches a throwing overlay, logs it once and still draws the rest', () => {
    const calls: string[] = [];
    const log = vi.fn();
    const registry = new EarthSurfaceOverlayRegistry(log);

    registry.register(overlay('bad', calls, { throws: true }));
    registry.register(overlay('good', calls));

    expect(() => registry.drawAll(context)).not.toThrow();
    registry.drawAll(context);

    expect(calls).toEqual(['good', 'good']);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toContain('"bad"');
  });

  it('logs again after the failing overlay is unregistered and registered anew', () => {
    const log = vi.fn();
    const registry = new EarthSurfaceOverlayRegistry(log);

    registry.register(overlay('bad', [], { throws: true }));
    registry.drawAll(context);
    registry.unregister('bad');
    registry.register(overlay('bad', [], { throws: true }));
    registry.drawAll(context);

    expect(log).toHaveBeenCalledTimes(2);
  });

  it('an overlay that unregisters itself while drawing does not disturb the loop', () => {
    const calls: string[] = [];
    const registry = new EarthSurfaceOverlayRegistry(vi.fn());

    registry.register({ id: 'self', isReady: () => true, draw: () => registry.unregister('self') });
    registry.register(overlay('next', calls));
    registry.drawAll(context);

    expect(calls).toEqual(['next']);
  });

  it('uses the error manager when no logger is injected', () => {
    const registry = new EarthSurfaceOverlayRegistry();

    registry.register(overlay('bad', [], { throws: true }));

    expect(() => registry.drawAll(context)).not.toThrow();
  });
});

describe('cameraPositionFromView', () => {
  it('recovers the eye of a lookAt view matrix', () => {
    const view = mat4.lookAt(mat4.create(), [7000, -200, 300], [0, 0, 0], [0, 0, 1]);
    const eye = cameraPositionFromView(view);

    expect(eye[0]).toBeCloseTo(7000, 1);
    expect(eye[1]).toBeCloseTo(-200, 1);
    expect(eye[2]).toBeCloseTo(300, 1);
  });

  it('is the origin for the identity view', () => {
    expect(cameraPositionFromView(mat4.create()).map((v) => v + 0)).toEqual([0, 0, 0]);
  });
});

describe('buildSurfaceLighting', () => {
  it('applies the Earth shader defaults', () => {
    expect(buildSurfaceLighting({}, [1, 0, 0], { zoomLevel: 0.4, cloudOpacity: 0.3, isCloudsVisible: false })).toEqual({
      lightDirection: [1, 0, 0],
      isAmbientLighting: false,
      isDrawNightAsDay: false,
      nightBrightness: 1,
      zoomLevel: 0.4,
      reliefExaggeration: 2.5,
      isGrayScale: false,
      isCloudsVisible: false,
      cloudOpacity: 0.3,
    });
  });

  it('copies the settings through', () => {
    const lighting = buildSurfaceLighting(
      { isEarthAmbientLighting: true, isDrawNightAsDay: true, earthNightBrightness: 2, terrainReliefExaggeration: 0, isEarthGrayScale: true },
      new Float32Array([0, 1, 0]),
      { zoomLevel: 1, cloudOpacity: 0.5, isCloudsVisible: true }
    );

    expect(lighting).toEqual({
      lightDirection: [0, 1, 0],
      isAmbientLighting: true,
      isDrawNightAsDay: true,
      nightBrightness: 2,
      zoomLevel: 1,
      reliefExaggeration: 0,
      isGrayScale: true,
      isCloudsVisible: true,
      cloudOpacity: 0.5,
    });
  });
});
