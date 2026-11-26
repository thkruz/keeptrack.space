import { CameraType } from '@app/engine/camera/camera-type';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { CountryLabelManager, countryAtlasEntry, countryLabelEcf, packCountryAtlas } from '@app/engine/rendering/draw-manager/country-label-manager';
import { PoliticalCountry } from '@app/engine/rendering/draw-manager/political-map';
import { observerMarkerEci, WorldMarkers } from '@app/engine/rendering/draw-manager/world-markers';
import { settingsManager } from '@app/settings/settings';
import { eci2lla, Kilometers, TemeVec3 } from '@ootk/src/main';
import { vi } from 'vitest';

/*
 * Rows CL1 and WM1 of AUDIT-wgs84.md. Hand values at geodetic 45 N, 0 E, from N = a / sqrt(1 - e^2 / 2) = 6388.8383 km:
 *   distance from the polar axis (N + h) cos 45, z = (N (1 - e^2) + h) sin 45.
 *   h = 20 km (country label): 4531.7330, 4501.4905. h = 40 km (observer pin): 4545.8752, 4515.6327.
 */

describe('countryLabelEcf (row CL1)', () => {
  it('puts a 45 N label 20 km above the WGS84 ellipsoid (hand values)', () => {
    const p = countryLabelEcf(45, 0);

    expect(p.x).toBeCloseTo(4531.733, 3);
    expect(p.y).toBeCloseTo(0, 9);
    expect(p.z).toBeCloseTo(4501.4905, 3);
  });

  it('keeps geodetic latitude, longitude and the 20 km altitude at other sites', () => {
    for (const [lat, lon] of [
      [0, 0],
      [-33.9, 18.4],
      [64.1, -21.9],
    ]) {
      const lla = eci2lla(countryLabelEcf(lat, lon) as unknown as TemeVec3<Kilometers>, 0);

      expect(lla.lat).toBeCloseTo(lat, 6);
      expect(lla.lon).toBeCloseTo(lon, 6);
      expect(lla.alt).toBeCloseTo(20, 6);
    }
  });
});

describe('observerMarkerEci (row WM1)', () => {
  it('puts a 45 N pin 40 km above the WGS84 ellipsoid at gmst 0 (hand values)', () => {
    const p = observerMarkerEci(45, 0, 0);

    expect(p.x).toBeCloseTo(4545.8752, 3);
    expect(p.y).toBeCloseTo(0, 9);
    expect(p.z).toBeCloseTo(4515.6327, 3);
  });

  it('rotates east with gmst: at gmst pi/2 the 0 E pin sits on +y', () => {
    const p = observerMarkerEci(45, 0, Math.PI / 2);

    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(4545.8752, 3);
    expect(p.z).toBeCloseTo(4515.6327, 3);
  });

  it('round-trips through eci2lla with the same gmst', () => {
    const gmst = 1.234;
    const lla = eci2lla(observerMarkerEci(-12.5, 130.8, gmst), gmst);

    expect(lla.lat).toBeCloseTo(-12.5, 6);
    expect(lla.lon).toBeCloseTo(130.8, 6);
    expect(lla.alt).toBeCloseTo(40, 6);
  });
});

describe('WorldMarkers.collectMarkers_ (row WM1)', () => {
  type Spec = { x: number; y: number; z: number; shape: number };
  const collect = (): Spec[] => (new WorldMarkers() as unknown as { collectMarkers_: () => Spec[] }).collectMarkers_();
  const camera = (cameraType: CameraType) => vi.spyOn(ServiceLocator, 'getMainCamera').mockReturnValue({ cameraType } as never);
  const selected = (obj: unknown) => vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ primarySatObj: obj } as never);
  const sat = { id: 5, position: { x: 7000, y: 1, z: 2 } };

  beforeEach(() => {
    settingsManager.isDrawSelectionGlow = false;
    settingsManager.observerMarkerLla = null;
    vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ gmst: 0 } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    settingsManager.isDrawSelectionGlow = false;
    settingsManager.observerMarkerLla = null;
  });

  it('draws nothing with the glow off and no observer', () => {
    expect(collect()).toEqual([]);
  });

  it('puts the observer pin on the WGS84 point 40 km up', () => {
    settingsManager.observerMarkerLla = { lat: 45, lon: 0 };
    const [pin] = collect();

    expect(pin.x).toBeCloseTo(4545.8752, 3);
    expect(pin.z).toBeCloseTo(4515.6327, 3);
    expect(pin.shape).toBe(1);
  });

  it('skips an observer with a non-finite lat or lon', () => {
    settingsManager.observerMarkerLla = { lat: Number.NaN, lon: 0 };
    expect(collect()).toEqual([]);
    settingsManager.observerMarkerLla = { lat: 0, lon: Number.POSITIVE_INFINITY };
    expect(collect()).toEqual([]);
  });

  it('draws the selection glow at the selected satellite in a free camera', () => {
    settingsManager.isDrawSelectionGlow = true;
    camera(CameraType.FIXED_TO_EARTH);
    selected(sat);
    const [glow] = collect();

    expect([glow.x, glow.y, glow.z, glow.shape]).toEqual([7000, 1, 2, 0]);
  });

  it('skips the glow in ride-along cameras and without a valid selection', () => {
    settingsManager.isDrawSelectionGlow = true;
    camera(CameraType.FIXED_TO_SAT_LVLH);
    selected(sat);
    expect(collect()).toEqual([]);

    vi.restoreAllMocks();
    vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ gmst: 0 } as never);
    camera(CameraType.FIXED_TO_EARTH);
    selected({ id: -1, position: sat.position });
    expect(collect()).toEqual([]);
    selected({ id: 5 });
    expect(collect()).toEqual([]);
    selected(null);
    expect(collect()).toEqual([]);
  });
});

describe('country label atlas (row CL1)', () => {
  const country = (name: string, lat = 45, lon = 0, extra: Partial<PoliticalCountry> = {}): PoliticalCountry =>
    ({ name, labelLat: lat, labelLon: lon, labelRank: 2, minLabel: 1, rings: [], ...extra }) as PoliticalCountry;
  const stub = () => {
    const fns = new Map<PropertyKey, unknown>();

    return new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (!fns.has(prop)) {
            fns.set(prop, prop === 'measureText' ? () => ({ width: 100 }) : vi.fn());
          }

          return fns.get(prop);
        },
        set: () => true,
      }
    );
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('packs rows, uses localized names, skips empty names and sizes the atlas to a power of two', () => {
    const many = Array.from({ length: 20 }, (_, i) => country(`C${i}`));
    const { placements, height } = packCountryAtlas([country(''), country('X', 0, 0, { names: { de: 'Ix' } }), ...many], 'de', () => 100);

    expect(placements[0].text).toBe('Ix');
    expect(placements).toHaveLength(21);
    // 116 px per label, 17 per 2048 px row: the 18th label starts row 2 at y = 44, so the atlas is 128 px tall.
    expect(placements[17]).toMatchObject({ x: 0, y: 44 });
    expect(height).toBe(128);
  });

  it('stops packing at the maximum atlas height', () => {
    const { placements } = packCountryAtlas(
      Array.from({ length: 200 }, (_, i) => country(`C${i}`)),
      'en',
      () => 2048
    );

    // One full-width label per 44 px row, 4096 / 44 = 93 rows.
    expect(placements).toHaveLength(93);
  });

  it('anchors an atlas entry at the WGS84 point 20 km above 45 N', () => {
    const e = countryAtlasEntry({ text: 'X', x: 0, y: 44, w: 88, country: country('X') }, 128);

    expect(e.ecf[0]).toBeCloseTo(4531.733, 3);
    expect(e.ecf[2]).toBeCloseTo(4501.4905, 3);
    expect([e.v0, e.aspect]).toEqual([44 / 128, 2]);
  });

  it('buildAtlas_ fills sorted entries and uploads the texture', () => {
    class FakeOffscreenCanvas {
      getContext() {
        return stub();
      }
    }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
    const mgr = new CountryLabelManager() as unknown as { gl_: unknown; atlasEntries_: { labelRank: number }[]; buildAtlas_: (c: PoliticalCountry[], l: string) => void };
    const gl = stub() as { texImage2D: ReturnType<typeof vi.fn> };

    mgr.gl_ = gl;
    mgr.buildAtlas_([country('Minor', 10, 10, { labelRank: 8 }), country('Major')], 'en');

    expect(mgr.atlasEntries_.map((e) => e.labelRank)).toEqual([2, 8]);
    expect(gl.texImage2D).toHaveBeenCalledTimes(1);
  });

  it('buildAtlas_ does nothing without OffscreenCanvas or a 2D context', () => {
    const mgr = new CountryLabelManager() as unknown as { gl_: unknown; atlasEntries_: unknown[]; buildAtlas_: (c: PoliticalCountry[], l: string) => void };

    mgr.gl_ = stub();
    vi.stubGlobal('OffscreenCanvas', undefined);
    mgr.buildAtlas_([country('A')], 'en');
    vi.stubGlobal('OffscreenCanvas', function NoContextCanvas() {
      return { getContext: () => null };
    });
    mgr.buildAtlas_([country('A')], 'en');

    expect(mgr.atlasEntries_).toEqual([]);
  });
});
