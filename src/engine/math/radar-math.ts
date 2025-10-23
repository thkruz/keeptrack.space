import { Kilometers, Meters, Radians } from '@ootk/src/main';

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
    /*
     * let powerInWatts = 325 * 1792;
     * let antennaGain = 2613000000;
     * let minimumDetectableSignaldB;
     */
    const minSW = 10 ** ((minSdB - 30) / 10);
    // let frequencyMhz = 435;
    const fHz = (fMhz * 10 ** 6);
    const numer = pW * aG ** 2 * rcs * (3 * 10 ** 8) ** 2;
    const denom = minSW * (4 * Math.PI) ** 3 * fHz ** 2;
    const rng = Math.sqrt(Math.sqrt(numer / denom));


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
    /*
     * let powerInWatts = 325 * 1792;
     * let antennaGain = 2613000000;
     * let minimumDetectableSignaldB;
     * let frequencyMhz = 435;
     */
    const fHz = (fMhz * 10 ** 6);
    const numer = pW * aG ** 2 * rcs * (3 * 10 ** 8) ** 2;
    const denom = rng ** 4 * (4 * Math.PI) ** 3 * fHz ** 2;
    const minSW = numer / denom;
    const minSdB = Math.log10(minSW);


    return minSdB;
  }

  /**
   * Calculates the width of a beam at a given range.
   */
  public static beamWidthAtRange(beamWidth: Radians, range: Kilometers): Kilometers {
    return (range * Math.sin(beamWidth)) as Kilometers;
  }
}
