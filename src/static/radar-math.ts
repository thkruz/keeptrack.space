import { Kilometers, Meters, Radians } from 'ootk';

type Distinct<T, DistinctName> = T & {
  __TYPE__: DistinctName;
};
export type Watts = Distinct<number, 'Watts'>;

export abstract class RadarMath {
  /**
   * Calculates the maximum range for a given set of parameters.
   * @param pW The transmitted power in watts.
   * @param aG The antenna gain.
   * @param rcs The radar cross section.
   * @param minSdB The minimum detectable signal in dB.
   * @param fMhz The frequency in MHz.
   * @returns The maximum range.
   */
  public static maxRng(pW: number, aG: number, rcs: number, minSdB: number, fMhz: number): number {
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
  }

  /**
   * Calculates the minimum detectable signal in dB for a given set of parameters.
   * @param pW The transmitted power in watts.
   * @param aG The antenna gain.
   * @param rcs The radar cross section in meters squared.
   * @param rng The range.
   * @param fMhz The frequency in MHz.
   * @returns The minimum detectable signal in dB.
   */
  public static minSignal(pW: Watts, aG: number, rcs: Meters, rng: Meters, fMhz: number): number {
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
  }

  /**
   * Calculates the width of a beam at a given range.
   */
  public static beamWidthAtRange(beamWidth: Radians, range: Kilometers): Kilometers {
    return (range * Math.sin(beamWidth)) as Kilometers;
  }
}
