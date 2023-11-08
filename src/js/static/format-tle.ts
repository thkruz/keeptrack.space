import { SatObject } from '../interfaces';
import { StringPad } from '../lib/stringPad';
import { StringifiedNumber } from './sat-math';

export type TleParams = {
  sat?: SatObject;
  inc: StringifiedNumber;
  meanmo: StringifiedNumber;
  rasc: StringifiedNumber;
  argPe: StringifiedNumber;
  meana: StringifiedNumber;
  ecen: string;
  epochyr: string;
  epochday: string;
  intl: string;
  scc: string;
};

export abstract class FormatTle {
  static argumentOfPerigee(argPe: StringifiedNumber): string {
    const argPeNum = parseFloat(argPe).toFixed(4);
    const argPe0 = StringPad.pad0(argPeNum, 8);
    if (argPe0.length !== 8) throw new Error('argPe length is not 8');
    return argPe0;
  }

  /**
   * Converts a 6 digit SCC number to a 5 digit SCC alpha 5 number
   */
  static convert6DigitToA5(sccNum: string): string {
    // Only applies to 6 digit numbers
    if (sccNum.length < 6) return sccNum;

    if (RegExp(/[A-Z]/iu, 'u').exec(sccNum[0])) {
      return sccNum;
    } else {
      // Extract the trailing 4 digits
      const rest = sccNum.slice(2, 6);

      // Convert the first two digit numbers into a Letter. Skip I and O as they look too similar to 1 and 0
      // A=10, B=11, C=12, D=13, E=14, F=15, G=16, H=17, J=18, K=19, L=20, M=21, N=22, P=23, Q=24, R=25, S=26, T=27, U=28, V=29, W=30, X=31, Y=32, Z=33
      let first = parseInt(`${sccNum[0]}${sccNum[1]}`);
      const iPlus = first >= 18 ? 1 : 0;
      const tPlus = first >= 24 ? 1 : 0;
      first = first + iPlus + tPlus;

      return `${String.fromCharCode(first + 55)}${rest}`;
    }
  }

  static convertA5to6Digit(sccNum: string): string {
    if (RegExp(/[A-Z]/iu, 'u').exec(sccNum[0])) {
      // Extract the trailing 4 digits
      const rest = sccNum.slice(1, 5);

      // Convert the first letter to a two digit number. Skip I and O as they look too similar to 1 and 0
      // A=10, B=11, C=12, D=13, E=14, F=15, G=16, H=17, J=18, K=19, L=20, M=21, N=22, P=23, Q=24, R=25, S=26, T=27, U=28, V=29, W=30, X=31, Y=32, Z=33
      let first = sccNum[0].toUpperCase().charCodeAt(0) - 55;
      const iPlus = first >= 18 ? 1 : 0;
      const tPlus = first >= 24 ? 1 : 0;
      first = first - iPlus - tPlus;

      return `${first}${rest}`;
    } else {
      return sccNum;
    }
  }

  static createTle(tleParams: TleParams): { TLE1: string; TLE2: string } {
    let { sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc } = tleParams;
    scc = FormatTle.convert6DigitToA5(scc);
    const epochYrStr = StringPad.pad0(epochyr, 2);
    const epochdayStr = StringPad.pad0(parseFloat(epochday).toFixed(8), 12);
    const incStr = FormatTle.inclination(inc);
    const meanmoStr = FormatTle.meanMotion(meanmo);
    const rascStr = FormatTle.rightAscension(rasc);
    const argPeStr = FormatTle.argumentOfPerigee(argPe);
    const meanaStr = FormatTle.meanAnomaly(meana);
    const ecenStr = FormatTle.eccentricity(ecen);

    let TLE1Ending = sat ? sat.TLE1.substring(32, 71) : ' +.00000000 +00000+0 +00000-0 0  9990';
    // Add explicit positive/negative signs

    TLE1Ending = TLE1Ending[1] === ' ' ? FormatTle.setCharAt(TLE1Ending, 1, '+') : TLE1Ending;
    TLE1Ending = TLE1Ending[12] === ' ' ? FormatTle.setCharAt(TLE1Ending, 12, '+') : TLE1Ending;
    TLE1Ending = TLE1Ending[21] === ' ' ? FormatTle.setCharAt(TLE1Ending, 21, '+') : TLE1Ending;
    TLE1Ending = TLE1Ending[32] === ' ' ? FormatTle.setCharAt(TLE1Ending, 32, '0') : TLE1Ending;

    const TLE1 = '1 ' + scc + 'U ' + intl + ' ' + epochYrStr + epochdayStr + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
    const TLE2 = '2 ' + scc + ' ' + incStr + ' ' + rascStr + ' ' + ecenStr + ' ' + argPeStr + ' ' + meanaStr + ' ' + meanmoStr + ' 00010';

    return { TLE1, TLE2 };
  }

  static eccentricity(ecen: string): string {
    let ecen0 = StringPad.trail0(ecen, 9);
    if (ecen0[1] === '.') {
      ecen0 = ecen0.substring(2);
    } else {
      ecen0 = ecen0.substring(0, 7);
    }
    if (ecen0.length !== 7) throw new Error('ecen length is not 7');
    return ecen0;
  }

  static inclination(inc: StringifiedNumber): string {
    const incNum = parseFloat(inc).toFixed(4);
    const inc0 = StringPad.pad0(incNum, 8);
    if (inc0.length !== 8) throw new Error('inc length is not 8');
    return inc0;
  }

  static meanAnomaly(meana: StringifiedNumber): string {
    const meanaNum = parseFloat(meana).toFixed(4);
    const meana0 = StringPad.pad0(meanaNum, 8);
    if (meana0.length !== 8) throw new Error('meana length is not 8');
    return meana0;
  }

  static meanMotion(meanmo: StringifiedNumber): string {
    const meanmoNum = parseFloat(meanmo).toFixed(8);
    const meanmo0 = StringPad.pad0(meanmoNum, 11);
    if (meanmo0.length !== 11) throw new Error('meanmo length is not 11');
    return meanmo0;
  }

  static rightAscension(rasc: StringifiedNumber): string {
    const rascNum = parseFloat(rasc).toFixed(4);
    const rasc0 = StringPad.pad0(rascNum, 8);
    if (rasc0.length !== 8) throw new Error('rasc length is not 8');
    return rasc0;
  }

  static setCharAt(str: string, index: number, chr: string) {
    if (index > str.length - 1) return str;
    return `${str.substring(0, index)}${chr}${str.substring(index + 1)}`;
  }
}
