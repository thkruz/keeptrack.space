/**
 * Coarse lookup that names the ocean or sea under a sub-satellite point that is not inside any country polygon.
 *
 * The outlines are hand-drawn approximations (not IHO limits). They only ever see points the country polygons
 * rejected, so land and coastlines do not need to be traced. Seas are tested first, then oceans; the Pacific is the
 * remainder.
 */
export type WaterBodyId =
  | 'arctic'
  | 'atlantic'
  | 'pacific'
  | 'indian'
  | 'southern'
  | 'mediterranean'
  | 'caribbean'
  | 'gulfOfMexico'
  | 'redSea'
  | 'blackSea'
  | 'northSea'
  | 'baltic'
  | 'arabianSea'
  | 'bayOfBengal'
  | 'southChinaSea'
  | 'persianGulf';

type Ring = [number, number][]; // [lon, lat]

const box_ = (west: number, south: number, east: number, north: number): Ring => [
  [west, south],
  [east, south],
  [east, north],
  [west, north],
];

/** Tested in order; the first hit wins, so small seas come before the oceans around them. */
const WATER_BODIES: { id: WaterBodyId; ring: Ring }[] = [
  { id: 'persianGulf', ring: box_(48, 23.5, 56.5, 30.2) },
  { id: 'gulfOfMexico', ring: box_(-97.5, 18, -81, 30.5) },
  { id: 'caribbean', ring: box_(-87, 9, -60, 22) },
  { id: 'blackSea', ring: box_(27.5, 41, 42, 47.5) },
  { id: 'mediterranean', ring: box_(-5.5, 30, 36, 45.8) },
  { id: 'redSea', ring: box_(32, 12.5, 44, 30) },
  { id: 'northSea', ring: box_(-3.5, 51, 9, 61) },
  { id: 'baltic', ring: box_(10, 54, 30, 66) },
  { id: 'arabianSea', ring: box_(52, 8, 74, 25) },
  { id: 'bayOfBengal', ring: box_(80, 5, 95, 22) },
  { id: 'southChinaSea', ring: box_(105, 1, 121, 23) },
  {
    id: 'indian',
    ring: [
      [20, -60],
      [147, -60],
      [147, -11],
      [125, -11],
      [100, 0],
      [100, 8],
      [95, 22],
      [80, 25],
      [60, 27],
      [45, 14],
      [20, -35],
    ],
  },
  {
    id: 'atlantic',
    ring: [
      [-67, -60],
      [20, -60],
      [20, 0],
      [30, 40],
      [30, 66],
      [-60, 66],
      [-75, 45],
      [-82, 25],
      [-67, 10],
    ],
  },
];

const inRing_ = (ring: Ring, lon: number, lat: number): boolean => {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
};

/**
 * Names the ocean or sea at a point.
 * @param lat Degrees, -90..90
 * @param lon Degrees, any range
 */
export const findWaterBody = (lat: number, lon: number): WaterBodyId => {
  const lonNorm = ((((lon + 180) % 360) + 360) % 360) - 180;

  if (lat >= 66) {
    return 'arctic';
  }
  if (lat <= -60) {
    return 'southern';
  }

  for (const body of WATER_BODIES) {
    if (inRing_(body.ring, lonNorm, lat)) {
      return body.id;
    }
  }

  return 'pacific';
};
