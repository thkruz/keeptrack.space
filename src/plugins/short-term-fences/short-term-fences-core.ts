/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * short-term-fences-core.ts holds the DOM-free logic for the Short Term Fences
 * plugin: the RAE geometry that converts an angular extent into a width in
 * kilometers, the form validation/clamping, and the DetailedSensor parameter
 * factory. Keeping this pure makes it unit-testable without booting the app.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { DetailedSensorParams } from '@app/app/sensors/DetailedSensor';
import { DEG2RAD, Degrees, EpochUTC, J2000, Kilometers, RAE, Radians, SpaceObjectType, ZoomValue } from '@ootk/src/main';

/** The two axes an extent can be measured along. */
export type StfExtentAxis = 'az' | 'el';

/** Largest angular extent (degrees) we let a fence span on either axis. */
export const STF_MAX_EXTENT_DEG = 80;

/** Raw string values pulled straight from the form inputs. */
export interface StfFormRaw {
  az: string;
  azExt: string;
  el: string;
  elExt: string;
  rng: string;
  rngExt: string;
}

/** Parsed, clamped numeric form values. */
export interface StfFormValues {
  az: number;
  azExt: number;
  el: number;
  elExt: number;
  rng: number;
  rngExt: number;
}

/** Result of validating the raw form. Either clamped values or a locale error key. */
export type StfValidationResult =
  | { ok: true; values: StfFormValues }
  | { ok: false; errorKey: string };

/** The minimal sensor location the DetailedSensor factory needs. */
export interface StfSiteLocation {
  lat: Degrees;
  lon: Degrees;
  alt: Kilometers;
}

/**
 * Compute the width (km) of a fence at its center range when the extent is
 * applied to a single axis. Replaces the two near-identical inline blocks that
 * lived in the azExt/elExt blur handlers.
 *
 * @param epoch - Epoch the site state is expressed at.
 * @param siteJ2000 - The sensor site as a J2000 state vector.
 * @param centerAz - Center azimuth (degrees).
 * @param centerEl - Center elevation (degrees).
 * @param rng - Center range (kilometers).
 * @param extentDeg - Total angular extent (degrees) along the chosen axis.
 * @param axis - Whether the extent spreads the azimuth or the elevation.
 * @returns Straight-line distance (km) between the two extent edges.
 */
export const computeExtentKm = (
  epoch: EpochUTC,
  siteJ2000: J2000,
  centerAz: number,
  centerEl: number,
  rng: number,
  extentDeg: number,
  axis: StfExtentAxis,
): number => {
  const half = extentDeg / 2;
  const az1 = axis === 'az' ? centerAz - half : centerAz;
  const az2 = axis === 'az' ? centerAz + half : centerAz;
  const el1 = axis === 'el' ? centerEl - half : centerEl;
  const el2 = axis === 'el' ? centerEl + half : centerEl;

  const pt1 = new RAE(epoch, rng as Kilometers, (az1 * DEG2RAD) as Radians, (el1 * DEG2RAD) as Radians).position(siteJ2000);
  const pt2 = new RAE(epoch, rng as Kilometers, (az2 * DEG2RAD) as Radians, (el2 * DEG2RAD) as Radians).position(siteJ2000);

  return Math.sqrt((pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2 + (pt1.z - pt2.z) ** 2);
};

/**
 * Parse and clamp the raw form values. Rejects any non-numeric field, clamps the
 * angular extents to [0, STF_MAX_EXTENT_DEG], and requires a positive range.
 * Elevation extents that would drop below the horizon are floored downstream in
 * {@link buildStfSensorParams}.
 */
export const validateStfForm = (raw: StfFormRaw): StfValidationResult => {
  const az = parseFloat(raw.az);
  const azExt = parseFloat(raw.azExt);
  const el = parseFloat(raw.el);
  const elExt = parseFloat(raw.elExt);
  const rng = parseFloat(raw.rng);
  const rngExt = parseFloat(raw.rngExt);

  if ([az, azExt, el, elExt, rng, rngExt].some((v) => !Number.isFinite(v))) {
    return { ok: false, errorKey: 'errorMsgs.invalidInput' };
  }

  if (rng <= 0) {
    return { ok: false, errorKey: 'errorMsgs.invalidRange' };
  }

  return {
    ok: true,
    values: {
      az,
      azExt: clampExtent(azExt),
      el,
      elExt: clampExtent(elExt),
      rng,
      rngExt: Math.max(0, rngExt),
    },
  };
};

/** Clamp an angular extent into the legal [0, STF_MAX_EXTENT_DEG] window. */
export const clampExtent = (extentDeg: number): number => Math.min(STF_MAX_EXTENT_DEG, Math.max(0, extentDeg));

/**
 * Build the DetailedSensor parameters for a fence. Handles azimuth wraparound and
 * floors the elevation/range minima at zero so a fence never dips below the
 * horizon or in front of the sensor.
 *
 * @param values - Validated form values.
 * @param site - The sensor site (lat/lon/alt).
 * @param index - Monotonic fence index used to name it (STF-1, STF-2, ...).
 */
export const buildStfSensorParams = (values: StfFormValues, site: StfSiteLocation, index: number): DetailedSensorParams => {
  const { az, azExt, el, elExt, rng, rngExt } = values;

  const minaz = wrapAz(az - azExt / 2);
  const maxaz = wrapAz(az + azExt / 2);
  const minel = Math.max(0, el - elExt / 2) as Degrees;
  const maxel = (el + elExt / 2) as Degrees;
  const minrange = Math.max(0, rng - rngExt / 2) as Kilometers;
  const maxrange = (rng + rngExt / 2) as Kilometers;
  const name = `STF-${index}`;

  return {
    objName: name,
    lat: site.lat,
    lon: site.lon,
    alt: site.alt,
    minAz: minaz,
    maxAz: maxaz,
    minEl: minel,
    maxEl: maxel,
    minRng: minrange,
    maxRng: maxrange,
    type: SpaceObjectType.SHORT_TERM_FENCE,
    name: 'STF',
    uiName: name,
    zoom: maxrange > 6000 ? ZoomValue.GEO : ZoomValue.LEO,
    volume: true,
    isVolumetric: true,
  };
};

/** Normalize an azimuth into the [0, 360) range. */
export const wrapAz = (azDeg: number): Degrees => {
  let az = azDeg % 360;

  if (az < 0) {
    az += 360;
  }

  return az as Degrees;
};
