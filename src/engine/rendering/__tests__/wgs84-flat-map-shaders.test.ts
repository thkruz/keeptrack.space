import { DotsManager } from '@app/engine/rendering/dots-manager';
import { createBaseVertShader } from '@app/engine/rendering/dots-shaders-base';
import { LineManager } from '@app/engine/rendering/line-manager';
import { SatLabelManager } from '@app/engine/rendering/sat-label-manager';
import { WGS84_GLSL } from '@app/engine/rendering/shaders/wgs84-glsl';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/** Asserts the flat-map branch of a vertex shader uses the shared geodetic latitude, once, before first use. */
const expectGeodeticFlatMap = (vert: string) => {
  const chunkAt = vert.indexOf('float geodeticLatitude(vec3 ecef)');
  const useAt = vert.indexOf('float lat = geodeticLatitude(');

  expect(vert.split(WGS84_GLSL.trim()).length - 1).toBe(1);
  expect(chunkAt).toBeGreaterThan(-1);
  expect(useAt).toBeGreaterThan(chunkAt);
  expect(vert).not.toMatch(/float lat = atan\(\w+\.z, length\(\w+\.xy\)\)/u);
  // The version and precision headers stay first.
  expect(vert.trimStart().startsWith('#version 300 es')).toBe(true);
  expect(vert.indexOf('precision highp float;')).toBeLessThan(chunkAt);
};

describe('flat-map shaders use geodetic latitude (shared WGS84 chunk)', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  it('dots-shaders-base vertex shader', () => {
    expectGeodeticFlatMap(createBaseVertShader(settingsManager));
  });

  it('dots-manager picking vertex shader', () => {
    const dots = new DotsManager();

    dots['settings_'] = settingsManager;
    dots['initShaders_']();
    expectGeodeticFlatMap(dots.shaders_.picking.vert);
  });

  it('line-manager vertex shader', () => {
    const lm = new LineManager();

    expectGeodeticFlatMap(lm['shaders_'].vert);
  });

  it('sat-label-manager vertex shader', () => {
    const slm = new SatLabelManager();
    const sources: string[] = [];

    vi.spyOn(SatLabelManager.prototype as unknown as { generateGlyphAtlas_: () => unknown }, 'generateGlyphAtlas_').mockReturnValue({});
    const gl = new Proxy(
      {},
      {
        get: (_t, prop) =>
          vi.fn((...args: unknown[]) => {
            if (prop === 'shaderSource') {
              sources.push(args[1] as string);
            }

            return prop === 'isContextLost' ? false : {};
          }),
      }
    ) as unknown as WebGL2RenderingContext;

    try {
      slm.init(gl, 4);
    } catch {
      // Later init steps need a real context; the shader program is built before them.
    }

    expect(sources.length).toBeGreaterThan(0);
    expectGeodeticFlatMap(sources[0]);
  });
});
