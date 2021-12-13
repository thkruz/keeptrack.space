import { SatObject } from '@app/js/api/keepTrackTypes';
import { ColorInformation, Pickable } from '../colorSchemeManager';

/*
NOTE: Removed variable declaration to reduce garbage collection

const ap = sat.apogee;
const gradientAmt = Math.min(ap / 45000, 1.0);
const apogeeGradient = [1.0 - gradientAmt, gradientAmt, 0.0, 1.0];
return {
  color: apogeeGradient,
  pickable: Pickable.Yes,
};
*/
export const apogeeRules = (sat: SatObject): ColorInformation => ({
  color: [1.0 - Math.min(sat.apogee / 45000, 1.0), Math.min(sat.apogee / 45000, 1.0), 0.0, 1.0],
  pickable: Pickable.Yes,
});
