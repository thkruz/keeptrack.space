import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeepTrackEmbed } from '../embed-api';
import { accessAngleDeg, circleRing, destination, EARTH_RADIUS_KM, ellipseRing, greatCircle, greatCirclePath, markerStrips, wrapLon } from '../embed-geo';
import { SURFACE_TICK_MS } from '../embed-surface';
import { TRACK_MIN_RECOMPUTE_MS, TRACK_TICK_MS } from '../embed-tracks';
import type { EmbedLatLon, EmbedObject, EmbedSensor } from '../embed-types';
import { FakeEngine, GOOD_TLE1, GOOD_TLE2 } from './fake-engine';

const obj = (hostId: string, tle1 = GOOD_TLE1): EmbedObject => ({ hostId, name: `Obj ${hostId}`, tle1, tle2: GOOD_TLE2 });
const sensor = (hostId: string): EmbedSensor => ({
  hostId,
  name: hostId,
  lat: 38.8,
  lon: -77,
  altKm: 0,
  minAz: 0,
  maxAz: 360,
  minEl: 0,
  maxEl: 90,
  minRngKm: 0,
  maxRngKm: 3000,
});

/** Great-circle central angle between two points, degrees. */
function angleBetween(a: EmbedLatLon, b: EmbedLatLon): number {
  const r = Math.PI / 180;
  const d = Math.sin(a.lat * r) * Math.sin(b.lat * r) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.cos((a.lon - b.lon) * r);

  return (Math.acos(Math.min(1, Math.max(-1, d))) * 180) / Math.PI;
}

function make() {
  const engine = new FakeEngine('scenario');
  // ISS-like: 420 km, sub-point moves about 0.0645 deg of longitude per second.
  engine.positionFn = (id, timeMs) =>
    engine.objects.has(id)
      ? {
          timeMs,
          eci: { x: 0, y: 0, z: 0 },
          lla: { lat: 51.6 * Math.sin((timeMs / 1000) * 0.0011), lon: (((((timeMs / 1000) * 0.0645 + 180) % 360) + 360) % 360) - 180, altKm: 420 },
        }
      : null;
  const api = new KeepTrackEmbed(engine, { config: {}, readyTarget: new EventTarget() });

  api.start();
  api.upsertObjects([obj('iss'), obj('b')]);
  api.upsertSensors([sensor('s1')]);

  return { api, engine };
}

beforeEach(() => {
  vi.stubGlobal('__IS_PRO__', false);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('surface geometry', () => {
  it('computes the access angle for known cases', () => {
    // ISS at 420 km: 0 deg mask about 20.3, 5 deg mask about 15.84 (the common 18-20 figure is for a 0 deg mask at ~500 km)
    expect(accessAngleDeg(420, 0)).toBeCloseTo(20.3, 1);
    expect(accessAngleDeg(420, 5)).toBeCloseTo(15.84, 1);
    // Zenith pass sees only the sub-satellite point
    expect(accessAngleDeg(420, 90)).toBeCloseTo(0, 5);
    // GEO horizon is about 81 degrees
    expect(accessAngleDeg(35786, 0)).toBeCloseTo(81.3, 0);
    expect(accessAngleDeg(0, 0)).toBe(0);
  });

  it('puts every circle point at the requested central angle and closes the ring', () => {
    const center = { lat: 10, lon: 20 };
    const ring = circleRing(center, 15.9);

    expect(ring[0]).toEqual(ring[ring.length - 1]);
    for (const p of ring) {
      expect(angleBetween(center, p)).toBeCloseTo(15.9, 6);
    }
  });

  it('wraps longitudes across the antimeridian and the poles stay finite', () => {
    expect(wrapLon(190)).toBeCloseTo(-170);
    expect(wrapLon(-190)).toBeCloseTo(170);
    expect(wrapLon(180)).toBeCloseTo(-180);
    const ring = circleRing({ lat: 0, lon: 179.5 }, 5);

    expect(ring.every((p) => p.lon >= -180 && p.lon <= 180)).toBe(true);
    expect(ring.some((p) => p.lon < -170)).toBe(true);
    expect(ring.some((p) => p.lon > 170)).toBe(true);
    expect(circleRing({ lat: 89, lon: 0 }, 5).every((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))).toBe(true);
    expect(destination({ lat: 0, lon: 0 }, 90, 90)).toEqual({ lat: expect.closeTo(0, 6), lon: expect.closeTo(90, 6) });
  });

  it('builds ellipses with the major axis along the bearing', () => {
    const center = { lat: 0, lon: 0 };
    const km2deg = (km: number) => (km / EARTH_RADIUS_KM) * (180 / Math.PI);
    const north = ellipseRing(center, 100, 20, 0, 4);

    // Points at t=0 (major axis, north) and t=90 deg (minor axis, east)
    expect(north[0].lat).toBeCloseTo(km2deg(100), 5);
    expect(north[0].lon).toBeCloseTo(0, 5);
    expect(north[1].lon).toBeCloseTo(km2deg(20), 5);
    expect(north[1].lat).toBeCloseTo(0, 5);
    const east = ellipseRing(center, 100, 20, 90, 4);

    expect(east[0].lon).toBeCloseTo(km2deg(100), 5);
    expect(east[0].lat).toBeCloseTo(0, 5);
    expect(ellipseRing(center, 100, 20, 33).length).toBe(73);
  });

  it('interpolates great circles with bounded spacing, including across the antimeridian', () => {
    const path = greatCircle({ lat: 0, lon: 170 }, { lat: 0, lon: -170 });

    expect(path[0].lon).toBeCloseTo(170);
    expect(path[path.length - 1].lon).toBeCloseTo(-170);
    expect(path.length).toBe(21);
    for (let i = 1; i < path.length; i++) {
      expect(angleBetween(path[i - 1], path[i])).toBeLessThanOrEqual(1.0001);
    }
    // Pole-to-pole style leg follows the meridian, not the rhumb line
    const polar = greatCircle({ lat: 60, lon: -100 }, { lat: 60, lon: 80 });

    expect(Math.max(...polar.map((p) => p.lat))).toBeCloseTo(90, 0);
    const closed = greatCirclePath(
      [
        { lat: 0, lon: 0 },
        { lat: 0, lon: 10 },
        { lat: 10, lon: 10 },
      ],
      true
    );

    expect(closed[0]).toEqual({ lat: 0, lon: 0 });
    expect(closed[closed.length - 1].lat).toBeCloseTo(0);
    expect(closed[closed.length - 1].lon).toBeCloseTo(0);
  });

  it('makes marker outlines for each shape', () => {
    expect(markerStrips({ lat: 0, lon: 0 }, 'cross').length).toBe(2);
    expect(markerStrips({ lat: 0, lon: 0 }, 'diamond')[0].length).toBe(5);
    expect(markerStrips({ lat: 0, lon: 0 }, 'ring').length).toBe(1);
    expect(markerStrips({ lat: 0, lon: 0 }, 'dot').length).toBe(3);
  });
});

describe('ground tracks', () => {
  const opts = { pastMin: 45, futureMin: 45 };

  it('draws a solid past and a dashed future of 91 samples each by default', () => {
    const { api, engine } = make();

    api.setGroundTracks([{ hostId: 'iss' }], opts);
    const specs = [...engine.surfaceLines.values()];

    expect(specs.length).toBe(2);
    expect(specs[0].dashed).toBe(false);
    expect(specs[1].dashed).toBe(true);
    expect(specs[0].strips[0].length).toBe(91);
    expect(specs[1].strips[0].length).toBe(91);
    // The two halves meet at the current position
    expect(specs[0].strips[0][90]).toEqual(specs[1].strips[0][0]);
  });

  it('honors stepSec and style overrides', () => {
    const { api, engine } = make();

    api.setGroundTracks([{ hostId: 'iss' }], { pastMin: 10, futureMin: 20, stepSec: 60, past: { color: [1, 0, 0, 1], dashed: true }, future: { dashed: false } });
    const [past, future] = [...engine.surfaceLines.values()];

    expect(past.strips[0].length).toBe(11);
    expect(future.strips[0].length).toBe(21);
    expect(past.color).toEqual([1, 0, 0, 1]);
    expect(past.dashed).toBe(true);
    expect(future.dashed).toBe(false);
  });

  it('recolors a track right away when its object style changes, and keeps the color across overlay rebuilds', () => {
    const { api, engine } = make();

    api.setGroundTracks([{ hostId: 'iss' }], opts);
    const calls = engine.surfaceUpdates;

    api.setObjectStyle({ hostId: 'iss' }, { color: [0.1, 0.2, 0.9, 1] });
    expect(engine.surfaceUpdates).toBeGreaterThan(calls);
    expect([...engine.surfaceLines.values()].map((s) => s.color)).toEqual([
      [0.1, 0.2, 0.9, 1],
      [0.1, 0.2, 0.9, 1],
    ]);
    api.addOverlay({ type: 'circle', center: { lat: 0, lon: 0 }, radius: { deg: 5 } });
    api.clearOverlays();
    api.addOverlay({ type: 'circle', center: { lat: 0, lon: 0 }, radius: { deg: 5 } });
    api.setObjectStyle({ hostId: 'iss' }, { color: [0.9, 0.2, 0.1, 1] });
    const tracks = [...engine.surfaceLines.values()].filter((s) => s.strips[0]?.length === 91);

    expect(tracks.map((s) => s.color)).toEqual([
      [0.9, 0.2, 0.1, 1],
      [0.9, 0.2, 0.1, 1],
    ]);
    expect(engine.objectColors.size).toBe(1);
  });

  it('validates options and refs', () => {
    const { api } = make();

    expect(() => api.setGroundTracks([{ hostId: 'iss' }])).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.setGroundTracks([{ hostId: 'iss' }], { pastMin: -1, futureMin: 1 })).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.setGroundTracks([{ hostId: 'iss' }], { ...opts, stepSec: 0 })).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.setGroundTracks([{ hostId: 'nope' }], opts)).toThrowError(expect.objectContaining({ code: 'OBJECT_NOT_FOUND' }));
  });

  it('does not recompute until sim time moves more than one step', () => {
    const { api, engine } = make();

    api.setGroundTracks([{ hostId: 'iss' }], opts);
    const before = engine.surfaceUpdates;

    engine.timeMs += 20_000;
    vi.advanceTimersByTime(TRACK_TICK_MS * 4);
    expect(engine.surfaceUpdates).toBe(before);
    engine.timeMs += 20_000;
    vi.advanceTimersByTime(TRACK_TICK_MS * 4);
    expect(engine.surfaceUpdates).toBe(before + 2);
  });

  it('recomputes on a backward jump', () => {
    const { api, engine } = make();

    api.setGroundTracks([{ hostId: 'iss' }], opts);
    const before = engine.surfaceUpdates;

    engine.timeMs -= 5000;
    vi.advanceTimersByTime(TRACK_TICK_MS * 4);
    expect(engine.surfaceUpdates).toBe(before + 2);
  });

  it('caps recomputes under fast-forward', () => {
    const { api, engine } = make();

    api.setGroundTracks([{ hostId: 'iss' }], opts);
    const before = engine.surfaceUpdates;
    const seconds = 4;

    for (let t = 0; t < seconds * 1000; t += TRACK_TICK_MS) {
      engine.timeMs += TRACK_TICK_MS * 500; // 500x
      vi.advanceTimersByTime(TRACK_TICK_MS);
    }
    const recomputes = (engine.surfaceUpdates - before) / 2;

    expect(recomputes).toBeGreaterThan(0);
    expect(recomputes).toBeLessThanOrEqual(Math.ceil((seconds * 1000) / TRACK_MIN_RECOMPUTE_MS));
  });

  it('recomputes immediately when an object is re-upserted with new elements', () => {
    const { api, engine } = make();

    api.setGroundTracks([{ hostId: 'iss' }], opts);
    const before = engine.surfaceUpdates;

    // Element change as an upsert/edit leaves it in the engine
    engine.editObject(100, { tle1: GOOD_TLE1.replace('24001.5', '24001.6'), tle2: GOOD_TLE2, name: 'Obj iss' });
    api.upsertObjects([]);
    expect(engine.surfaceUpdates).toBe(before + 2);
    // Without a change nothing recomputes
    api.upsertObjects([]);
    expect(engine.surfaceUpdates).toBe(before + 2);
  });

  it("tracks every host object with 'host', picks up new ones and drops removed ones", () => {
    const { api, engine } = make();

    api.setGroundTracks('host', opts);
    expect(engine.surfaceLines.size).toBe(4);
    api.upsertObjects([obj('c')]);
    expect(engine.surfaceLines.size).toBe(6);
    api.removeObjects(['b']);
    expect(engine.surfaceLines.size).toBe(4);
  });

  it('null clears every track', () => {
    const { api, engine } = make();

    api.setGroundTracks('host', opts);
    api.setGroundTracks(null);
    expect(engine.surfaceLines.size).toBe(0);
    engine.timeMs += 600_000;
    vi.advanceTimersByTime(TRACK_TICK_MS * 4);
    expect(engine.surfaceLines.size).toBe(0);
  });

  it('breaks the strip where propagation fails', () => {
    const { api, engine } = make();
    const original = engine.positionFn!;

    engine.positionFn = (id, t) => (Math.abs(t - engine.timeMs - 300_000) < 1000 ? null : original(id, t));
    api.setGroundTracks([{ hostId: 'iss' }], opts);
    const future = [...engine.surfaceLines.values()][1];

    expect(future.strips.length).toBe(2);
  });
});

describe('surface overlays', () => {
  it('draws a footprint that follows the object and uses the access angle', () => {
    const { api, engine } = make();
    const id = api.addOverlay({ type: 'footprint', object: { hostId: 'iss' }, minElDeg: 5 });
    const spec = () => [...engine.surfaceLines.values()][0];
    const first = spec().strips[0];
    const pos = engine.positionFn!(100, engine.timeMs)!;

    expect(first.length).toBe(73);
    expect(angleBetween({ lat: pos.lla.lat, lon: pos.lla.lon }, first[0])).toBeCloseTo(accessAngleDeg(420, 5), 5);
    const adds = engine.surfaceAdds;

    engine.timeMs += 600_000;
    vi.advanceTimersByTime(SURFACE_TICK_MS * 2);
    expect(engine.surfaceAdds).toBe(adds);
    expect(engine.surfaceUpdates).toBeGreaterThan(0);
    expect(spec().strips[0][0]).not.toEqual(first[0]);
    api.removeOverlay(id);
    expect(engine.surfaceLines.size).toBe(0);
  });

  it('supports fixed, sensor-centered and access circles', () => {
    const { api, engine } = make();

    api.addOverlay({ type: 'circle', center: { lat: 0, lon: 0 }, radius: { deg: 10 } });
    api.addOverlay({ type: 'circle', center: { sensor: 's1' }, radius: { accessOf: { hostId: 'iss' }, minElDeg: 5 } });
    const [fixed, access] = [...engine.surfaceLines.values()];

    expect(angleBetween({ lat: 0, lon: 0 }, fixed.strips[0][3])).toBeCloseTo(10, 6);
    expect(angleBetween({ lat: 38.8, lon: -77 }, access.strips[0][3])).toBeCloseTo(accessAngleDeg(420, 5), 5);
  });

  it('draws markers, ellipses and polylines', () => {
    const { api, engine } = make();

    api.addOverlay({ type: 'marker', position: { lat: 10, lon: 10 }, shape: 'cross', color: [1, 0, 0, 1] });
    api.addOverlay({ type: 'ellipse', center: { lat: 0, lon: 179 }, semiMajorKm: 300, semiMinorKm: 100, bearingDeg: 45, dashed: true });
    api.addOverlay({
      type: 'polyline',
      points: [
        { lat: 0, lon: 170 },
        { lat: 0, lon: -170 },
      ],
    });
    const [marker, ellipse, poly] = [...engine.surfaceLines.values()];

    expect(marker.strips.length).toBe(2);
    expect(marker.color).toEqual([1, 0, 0, 1]);
    expect(ellipse.dashed).toBe(true);
    expect(ellipse.strips[0].every((p) => p.lon >= -180 && p.lon <= 180)).toBe(true);
    expect(poly.strips[0].length).toBe(21);
  });

  it('sends marker overlay labels to the engine and clears them when the marker goes', () => {
    const { api, engine } = make();

    const id = api.addOverlay({ type: 'marker', position: { lat: 10, lon: 20 }, label: 'Target A', color: [1, 0, 0, 1] });
    const sent = engine.markerLabelSets.at(-1) as { text: string; latDeg: number; lonDeg: number }[];

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ text: 'Target A', latDeg: 10, lonDeg: 20 });
    api.removeOverlay(id);
    expect(engine.markerLabelSets.at(-1)).toEqual([]);
  });

  it('validates input', () => {
    const { api } = make();

    expect(() => api.addOverlay({ type: 'footprint', object: { hostId: 'zz' }, minElDeg: 5 })).toThrowError(expect.objectContaining({ code: 'OBJECT_NOT_FOUND' }));
    expect(() => api.addOverlay({ type: 'circle', center: { sensor: 'zz' }, radius: { deg: 5 } })).toThrowError(expect.objectContaining({ code: 'SENSOR_NOT_FOUND' }));
    expect(() => api.addOverlay({ type: 'circle', center: { lat: 0, lon: 0 }, radius: { deg: 0 } })).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.addOverlay({ type: 'marker', position: { lat: 99, lon: 0 } })).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.addOverlay({ type: 'polyline', points: [{ lat: 0, lon: 0 }] })).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.addOverlay({ type: 'ellipse', center: { lat: 0, lon: 0 }, semiMajorKm: -1, semiMinorKm: 1, bearingDeg: 0 })).toThrowError(
      expect.objectContaining({ code: 'INVALID_ARGUMENT' })
    );
    expect(() => api.addOverlay({ type: 'marker', position: { lat: 0, lon: 0 }, color: [2, 0, 0, 1] })).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
  });

  it('clearOverlays removes surface and line overlays, and bound overlays drop with their object or sensor', () => {
    const { api, engine } = make();

    api.addOverlay({ type: 'line', from: { object: { hostId: 'iss' } }, to: { object: { hostId: 'b' } } });
    api.addOverlay({ type: 'footprint', object: { hostId: 'iss' }, minElDeg: 5 });
    api.addOverlay({ type: 'circle', center: { sensor: 's1' }, radius: { deg: 5 } });
    api.addOverlay({ type: 'marker', position: { lat: 0, lon: 0 } });
    expect(engine.surfaceLines.size).toBe(3);
    api.removeSensors(['s1']);
    expect(engine.surfaceLines.size).toBe(2);
    api.removeObjects(['iss']);
    expect(engine.surfaceLines.size).toBe(1);
    api.clearOverlays();
    expect(engine.lines.length).toBe(0);
    expect(engine.surfaceLines.size).toBe(0);
  });

  it('hides marker labels while layers.labels is none and restores them after', () => {
    const { api, engine } = make();

    api.addOverlay({ type: 'marker', position: { lat: 5, lon: 6 }, label: 'GW' });
    expect((engine.markerLabelSets.at(-1) as unknown[]).length).toBe(1);
    api.setLayers({ labels: 'none' });
    expect(engine.markerLabelSets.at(-1)).toEqual([]);
    api.addOverlay({ type: 'marker', position: { lat: 7, lon: 8 }, label: 'X' });
    expect(engine.markerLabelSets.at(-1)).toEqual([]);
    api.setLayers({ labels: 'host' });
    expect((engine.markerLabelSets.at(-1) as unknown[]).length).toBe(2);
  });

  it('passes the fill center for circle and ellipse with fill, and none without', () => {
    const { api, engine } = make();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    api.addOverlay({ type: 'circle', center: { lat: 10, lon: 20 }, radius: { deg: 5 }, fill: true });
    api.addOverlay({ type: 'circle', center: { lat: 1, lon: 2 }, radius: { deg: 6 } });
    api.addOverlay({ type: 'ellipse', center: { lat: 30, lon: 40 }, semiMajorKm: 100, semiMinorKm: 50, bearingDeg: 0, fill: true });
    const specs = [...engine.surfaceLines.values()];

    expect(specs[0].fillCenter).toEqual({ lat: 10, lon: 20 });
    expect(specs[1].fillCenter).toBeUndefined();
    expect(specs[2].fillCenter).toEqual({ lat: 30, lon: 40 });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
