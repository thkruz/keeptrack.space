import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { DEG2RAD } from '@app/js/lib/constants';

export const findNearbyObjectsByOrbit = (sat: SatObject) => {
  const { satData: catalog } = keepTrackApi.programs.satSet;

  const maxPeriod = sat.period * 1.1;
  const minPeriod = sat.period * 0.9;
  const maxInclination = sat.inclination + 10 * DEG2RAD;
  const minInclination = sat.inclination - 10 * DEG2RAD;
  let maxRaan = sat.raan + 10 * DEG2RAD;
  let minRaan = sat.raan - 10 * DEG2RAD;
  if (sat.raan >= 350 * DEG2RAD) {
    maxRaan -= 360 * DEG2RAD;
  }
  if (sat.raan <= 10 * DEG2RAD) {
    minRaan += 360 * DEG2RAD;
  }

  return catalog
    .filter((s) => {
      if (s.static) return false;
      if (s.inclination < minInclination || s.inclination > maxInclination) return false;
      if (sat.raan > 350 * DEG2RAD || sat.raan < 10 * DEG2RAD) {
        if (s.raan > maxRaan && s.raan < minRaan) return false;
      } else {
        if (s.raan < minRaan || s.raan > maxRaan) return false;
      }
      if (s.period < minPeriod || s.period > maxPeriod) return false;
      return true;
    })
    .map((s) => s.id);
};
