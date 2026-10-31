import { SensorFovMesh } from '@app/engine/rendering/draw-manager/sensor-fov-mesh';
import { Degrees } from '@ootk/src/main';
import { defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';

describe('SensorFovMesh bottom cone', () => {
  const AZ_SEGMENTS = 32;

  const build = (minEl: number, minAz: number, maxAz: number) => {
    const sensor = Object.assign(Object.create(Object.getPrototypeOf(defaultSensor)), defaultSensor, {
      minEl: minEl as Degrees,
      minAz: minAz as Degrees,
      maxAz: maxAz as Degrees,
    });
    const mesh = new SensorFovMesh(sensor);

    mesh.initGeometry_();

    return mesh as unknown as { vertices_: Float32Array; indices_: Uint16Array };
  };

  beforeEach(() => {
    setupStandardEnvironment();
  });

  it('adds an apex vertex and a fan of triangles for a full-circle sensor with a high minimum elevation', () => {
    const low = build(10, 0, 360);
    const high = build(30, 0, 360);

    expect(high.vertices_.length - low.vertices_.length).toBe(3);
    expect(high.indices_.length - low.indices_.length).toBe(3 * (AZ_SEGMENTS + 1));
  });

  it('leaves the geometry unchanged for a partial-azimuth sensor', () => {
    const low = build(10, 0, 180);
    const high = build(30, 0, 180);

    expect(high.vertices_.length).toBe(low.vertices_.length);
    expect(high.indices_.length).toBe(low.indices_.length);
  });

  it('leaves the geometry unchanged when the minimum elevation is 20 degrees or less', () => {
    const a = build(0, 0, 360);
    const b = build(20, 0, 360);

    expect(b.vertices_.length).toBe(a.vertices_.length);
    expect(b.indices_.length).toBe(a.indices_.length);
  });
});
