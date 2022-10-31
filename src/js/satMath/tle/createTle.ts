import { StringifiedNubmer, formatArgumentOfPerigee, formatEccentricity, formatInclination, formatMeanAnomaly, formatMeanMotion, formatRightAscension } from './tleFormater';

import { SatObject } from '../../api/keepTrackTypes';
import { stringPad } from '@app/js/lib/helpers';

export const createTle = (tleParams: TleParams): { TLE1: string; TLE2: string } => {
  let { sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc } = tleParams;
  const epochYrStr = stringPad.pad0(epochyr, 2);
  const epochdayStr = stringPad.pad0(parseFloat(epochday).toFixed(8), 12);
  const incStr = formatInclination(inc);
  const meanmoStr = formatMeanMotion(meanmo);
  const rascStr = formatRightAscension(rasc);
  const argPeStr = formatArgumentOfPerigee(argPe);
  const meanaStr = formatMeanAnomaly(meana);
  const ecenStr = formatEccentricity(ecen);

  let TLE1Ending = sat.TLE1.substr(32, 39);
  // Add explicit positive/negative signs

  TLE1Ending = TLE1Ending[1] === ' ' ? setCharAt(TLE1Ending, 1, '+') : TLE1Ending;
  TLE1Ending = TLE1Ending[12] === ' ' ? setCharAt(TLE1Ending, 12, '+') : TLE1Ending;
  TLE1Ending = TLE1Ending[21] === ' ' ? setCharAt(TLE1Ending, 21, '+') : TLE1Ending;
  TLE1Ending = TLE1Ending[32] === ' ' ? setCharAt(TLE1Ending, 32, '0') : TLE1Ending;

  const TLE1 = '1 ' + scc + 'U ' + intl + ' ' + epochYrStr + epochdayStr + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
  const TLE2 = '2 ' + scc + ' ' + incStr + ' ' + rascStr + ' ' + ecenStr + ' ' + argPeStr + ' ' + meanaStr + ' ' + meanmoStr + ' 00010';

  return { TLE1, TLE2 };
};

const setCharAt = (str: string, index: number, chr: string) => {
  if (index > str.length - 1) return str;
  return str.substring(0, index) + chr + str.substring(index + 1);
};

export type TleParams = {
  sat: SatObject;
  inc: StringifiedNubmer;
  meanmo: StringifiedNubmer;
  rasc: StringifiedNubmer;
  argPe: StringifiedNubmer;
  meana: StringifiedNubmer;
  ecen: string;
  epochyr: string;
  epochday: string;
  intl: string;
  scc: string;
};
