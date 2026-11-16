/** Altitude (km above the equatorial radius) of the geostationary ring. */
const GEO_ALTITUDE_KM = 35_786;
/** An orbit whose whole altitude range lies within this distance of the ring counts as GEO. */
const GEO_BAND_KM = 1000;
/** Top of low Earth orbit (km). */
const LEO_CEILING_KM = 2000;
/** From this eccentricity up an orbit is called highly elliptical. */
const HEO_ECCENTRICITY = 0.25;

export type OrbitRegime = 'leo' | 'meo' | 'geo' | 'heo';

/**
 * Names the altitude regime of an orbit from its apsis altitudes (km) and eccentricity, or null when
 * the inputs are not a bound orbit. LEO is under 2000 km, GEO is the band around 35,786 km, HEO is highly
 * elliptical or above GEO, and MEO is everything between.
 */
export const classifyOrbitRegime = (perigeeKm: number, apogeeKm: number, eccentricity: number): OrbitRegime | null => {
  if (!Number.isFinite(perigeeKm) || !Number.isFinite(apogeeKm) || !Number.isFinite(eccentricity) || eccentricity < 0 || eccentricity >= 1 || apogeeKm < perigeeKm) {
    return null;
  }

  const isElliptical = eccentricity >= HEO_ECCENTRICITY;

  if (apogeeKm < LEO_CEILING_KM || (!isElliptical && (perigeeKm + apogeeKm) / 2 < LEO_CEILING_KM)) {
    return 'leo';
  }
  if (perigeeKm >= GEO_ALTITUDE_KM - GEO_BAND_KM && apogeeKm <= GEO_ALTITUDE_KM + GEO_BAND_KM) {
    return 'geo';
  }
  if (isElliptical || apogeeKm > GEO_ALTITUDE_KM + GEO_BAND_KM) {
    return 'heo';
  }

  return 'meo';
};
