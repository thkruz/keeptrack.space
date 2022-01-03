import { SatObject } from '../api/keepTrackTypes';

export const searchYear = (satData: any, year: any) => {
  const result = satData.filter((sat: SatObject) => {
    const tleYear = sat?.TLE1?.substring(9, 11) || '-1';
    return parseInt(tleYear) == year;
  });
  return result;
};

export const searchYearOrLess = (satData: any, year: number) => {
  const result = satData.filter((sat: SatObject) => {
    const tleYear = sat?.TLE1?.substring(9, 11) || '-1';
    if (year >= 59 && year < 100) {
      return parseInt(tleYear) <= year && parseInt(tleYear) >= 59;
    } else {
      return parseInt(tleYear) <= year || parseInt(tleYear) >= 59;
    }
  });
  return result;
};

// eslint-disable-next-line no-unused-vars
export const searchNameRegex = (satData: any, regex: { test: (arg0: any) => any }): SatObject[] => {
  const result = satData.filter((sat: SatObject) => !!regex.test(sat.name)); // NOSONAR
  return result;
};
// eslint-disable-next-line no-unused-vars
export const searchCountryRegex = (satData: any, regex: { test: (arg0: any) => any }): SatObject[] => {
  const result = satData.filter((sat: SatObject) => !!regex.test(sat.country)); // NOSONAR
  return result;
};

export const searchShapeRegex = (satData: any, text: string): SatObject[] => {
  const result = satData.filter((sat: SatObject) => sat.shape === text); // NOSONAR
  return result;
};

export const searchBusRegex = (satData: any, text: string): SatObject[] => {
  const result = satData.filter((sat: SatObject) => sat.bus === text); // NOSONAR
  return result;
};
