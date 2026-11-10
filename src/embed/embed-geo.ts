/** Pure surface geometry on a spherical Earth (the radius the engine draws the globe at). Degrees in and out. */

import type { EmbedLatLon } from './embed-types';

export const EARTH_RADIUS_KM = 6371;
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** Wrap a longitude to [-180, 180). */
export function wrapLon(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** Earth central angle (deg) from the sub-satellite point to the ground point that sees the object at minElDeg. */
export function accessAngleDeg(altKm: number, minElDeg: number): number {
  const el = minElDeg * D2R;
  const ratio = (EARTH_RADIUS_KM * Math.cos(el)) / (EARTH_RADIUS_KM + Math.max(altKm, 0));
  const angle = Math.acos(Math.min(1, Math.max(-1, ratio))) - el;

  return Math.max(0, angle * R2D);
}

/** Point reached from `from` along a great circle: initial bearing (deg from north) and angular distance (deg). */
export function destination(from: EmbedLatLon, bearingDeg: number, distanceDeg: number): EmbedLatLon {
  const lat1 = from.lat * D2R;
  const lon1 = from.lon * D2R;
  const brg = bearingDeg * D2R;
  const d = distanceDeg * D2R;
  const sinLat2 = Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg);
  const lat2 = Math.asin(Math.min(1, Math.max(-1, sinLat2)));
  const lon2 = lon1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * sinLat2);

  return { lat: lat2 * R2D, lon: wrapLon(lon2 * R2D) };
}

/** Closed ring (first point repeated) of ground points at a fixed central angle from `center`. */
export function circleRing(center: EmbedLatLon, radiusDeg: number, segments = 72): EmbedLatLon[] {
  const ring: EmbedLatLon[] = [];

  for (let i = 0; i < segments; i++) {
    ring.push(destination(center, (360 * i) / segments, radiusDeg));
  }
  ring.push({ ...ring[0] });

  return ring;
}

/** Closed ring of an error ellipse. Axes are km, bearing is the semi-major axis direction (deg from north). */
export function ellipseRing(center: EmbedLatLon, semiMajorKm: number, semiMinorKm: number, bearingDeg: number, segments = 72): EmbedLatLon[] {
  const ring: EmbedLatLon[] = [];
  const b = bearingDeg * D2R;

  for (let i = 0; i < segments; i++) {
    const t = (2 * Math.PI * i) / segments;
    const east = semiMajorKm * Math.cos(t) * Math.sin(b) + semiMinorKm * Math.sin(t) * Math.cos(b);
    const north = semiMajorKm * Math.cos(t) * Math.cos(b) - semiMinorKm * Math.sin(t) * Math.sin(b);
    const distDeg = (Math.hypot(east, north) / EARTH_RADIUS_KM) * R2D;

    ring.push(destination(center, Math.atan2(east, north) * R2D, distDeg));
  }
  ring.push({ ...ring[0] });

  return ring;
}

function toVec(p: EmbedLatLon): [number, number, number] {
  const lat = p.lat * D2R;
  const lon = p.lon * D2R;

  return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
}

/** Great-circle samples from a to b inclusive, at most `maxStepDeg` apart. */
export function greatCircle(a: EmbedLatLon, b: EmbedLatLon, maxStepDeg = 1): EmbedLatLon[] {
  const va = toVec(a);
  const vb = toVec(b);
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const omega = Math.acos(dot);
  const n = Math.max(1, Math.ceil((omega * R2D) / maxStepDeg - 1e-9));
  const out: EmbedLatLon[] = [{ lat: a.lat, lon: wrapLon(a.lon) }];

  if (omega < 1e-9) {
    return out;
  }
  const sinO = Math.sin(omega);

  for (let i = 1; i <= n; i++) {
    const f = i / n;
    const ka = Math.sin((1 - f) * omega) / sinO;
    const kb = Math.sin(f * omega) / sinO;
    const x = ka * va[0] + kb * vb[0];
    const y = ka * va[1] + kb * vb[1];
    const z = ka * va[2] + kb * vb[2];

    out.push({ lat: Math.atan2(z, Math.hypot(x, y)) * R2D, lon: wrapLon(Math.atan2(y, x) * R2D) });
  }

  return out;
}

/** Great-circle polyline through all points (optionally closed back to the first). */
export function greatCirclePath(points: EmbedLatLon[], closed: boolean): EmbedLatLon[] {
  const path: EmbedLatLon[] = [];
  const legs = closed ? points.length : points.length - 1;

  for (let i = 0; i < legs; i++) {
    const seg = greatCircle(points[i], points[(i + 1) % points.length]);

    path.push(...(i === 0 ? seg : seg.slice(1)));
  }

  return path;
}

/** Marker outline strips. Size is an angular half-extent in degrees (about 130 km at the default). */
export function markerStrips(position: EmbedLatLon, shape: 'dot' | 'diamond' | 'ring' | 'cross', sizeDeg = 1.2): EmbedLatLon[][] {
  const at = (bearing: number, dist: number) => destination(position, bearing, dist);

  switch (shape) {
    case 'ring':
      return [circleRing(position, sizeDeg, 24)];
    case 'diamond':
      return [[at(0, sizeDeg), at(90, sizeDeg), at(180, sizeDeg), at(270, sizeDeg), at(0, sizeDeg)]];
    case 'cross':
      return [
        [at(0, sizeDeg), at(180, sizeDeg)],
        [at(90, sizeDeg), at(270, sizeDeg)],
      ];
    default:
      // Dot: concentric rings approximate a filled disc.
      return [circleRing(position, sizeDeg * 0.6, 16), circleRing(position, sizeDeg * 0.4, 12), circleRing(position, sizeDeg * 0.2, 8)];
  }
}
