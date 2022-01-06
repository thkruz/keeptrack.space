import { SatObject } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';

export const year = (satData: SatObject[], yr: number) =>
  satData.filter((sat) => {
    const tleYear = sat?.TLE1?.substring(9, 11) || '-1';
    return parseInt(tleYear) == yr;
  });
export const yearOrLess = (satData: SatObject[], yr: number) =>
  satData.filter((sat) => {
    const tleYear = sat?.TLE1?.substring(9, 11) || '-1';
    if (yr >= 59 && yr < 100) {
      return parseInt(tleYear) <= yr && parseInt(tleYear) >= 59;
    } else {
      return parseInt(tleYear) <= yr || parseInt(tleYear) >= 59;
    }
  });
export const name = (satData: SatObject[], regex: RegExp): SatObject[] => satData.filter((sat) => !!regex.test(sat.name));
export const country = (satData: SatObject[], regex: RegExp): SatObject[] => satData.filter((sat) => !!regex.test(sat.country));
export const shape = (satData: SatObject[], text: string): SatObject[] => satData.filter((sat) => sat.shape === text);
export const bus = (satData: SatObject[], text: string): SatObject[] => satData.filter((sat) => sat.bus === text);
export const type = (satData: SatObject[], objType: SpaceObjectType): SatObject[] => satData.filter((sat) => sat.type === objType);

export const search = {
  year,
  yearOrLess,
  name,
  country,
  shape,
  bus,
  type,
};
