export const radarMaxrng = (pW: number, aG: number, rcs: number, minSdB: number, fMhz: number): number => {
  // let powerInWatts = 325 * 1792;
  // let antennaGain = 2613000000;
  // let minimumDetectableSignaldB;
  let minSW = Math.pow(10, (minSdB - 30) / 10);
  // let frequencyMhz = 435;
  let fHz = (fMhz *= Math.pow(10, 6));
  let numer = pW * Math.pow(aG, 2) * rcs * Math.pow(3 * Math.pow(10, 8), 2);
  let denom = minSW * Math.pow(4 * Math.PI, 3) * Math.pow(fHz, 2);
  let rng = Math.sqrt(Math.sqrt(numer / denom));
  return rng;
};
export const radarMinSignal = (pW: number, aG: number, rcs: number, rng: number, fMhz: number): number => {
  // let powerInWatts = 325 * 1792;
  // let antennaGain = 2613000000;
  // let minimumDetectableSignaldB;
  // let frequencyMhz = 435;
  let fHz = (fMhz *= Math.pow(10, 6));
  let numer = pW * Math.pow(aG, 2) * rcs * Math.pow(3 * Math.pow(10, 8), 2);
  let denom = rng ** 4 * Math.pow(4 * Math.PI, 3) * Math.pow(fHz, 2);
  let minSW = numer / denom;
  let minSdB = Math.log10(minSW);
  return minSdB;
};
