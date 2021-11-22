export const searchYear = (satData: any, year: any) => {
  const res = [];
  for (let i = 0; i < satData.length; i++) {
    if (typeof satData[i].TLE1 == 'undefined')
      continue;
    if (satData[i].TLE1.substring(9, 11) == year) {
      res.push(i);
    }
  }
  return res;
};
export const searchYearOrLess = (satData: any, year: number) => {
  const res = [];
  for (let i = 0; i < satData.length; i++) {
    if (typeof satData[i].TLE1 == 'undefined')
      continue;
    if (year >= 59 && year < 100) {
      if (satData[i].TLE1.substring(9, 11) <= year && satData[i].TLE1.substring(9, 11) >= 59) {
        res.push(i);
      }
    } else {
      if (satData[i].TLE1.substring(9, 11) <= year || satData[i].TLE1.substring(9, 11) >= 59) {
        res.push(i);
      }
    }
  }
  return res;
};
// eslint-disable-next-line no-unused-vars
export const searchNameRegex = (satData: any, regex: { test: (arg0: any) => any; }) => {
  const res = [];
  for (let i = 0; i < satData.length; i++) {
    if (regex.test(satData[i].ON)) {
      res.push(i);
    }
  }
  return res;
};
// eslint-disable-next-line no-unused-vars
export const searchCountryRegex = (satData: any, regex: { test: (arg0: any) => any; }) => {
  const res = [];
  for (let i = 0; i < satData.length; i++) {
    if (regex.test(satData[i].C)) {
      res.push(i);
    }
  }
  return res;
};
