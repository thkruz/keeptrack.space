import { SatObject } from '../../api/keepTrackTypes';
import { formatArgumentOfPerigee, formatInclination, formatMeanAnomaly, formatMeanMotion, formatRightAscension, StringifiedNubmer } from './tleFormater';

export const createTle = (tleParams: TleParams): { TLE1: string; TLE2: string } => {
  let { sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc } = tleParams;
  const incStr = formatInclination(inc);
  const meanmoStr = formatMeanMotion(meanmo);
  const rascStr = formatRightAscension(rasc);
  const argPeStr = formatArgumentOfPerigee(argPe);
  const meanaStr = formatMeanAnomaly(meana);

  const TLE1Ending = sat.TLE1.substr(32, 39);
  const TLE1 = '1 ' + scc + 'U ' + intl + ' ' + epochyr + epochday + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
  const TLE2 = '2 ' + scc + ' ' + incStr + ' ' + rascStr + ' ' + ecen + ' ' + argPeStr + ' ' + meanaStr + ' ' + meanmoStr + '    10';

  return { TLE1, TLE2 };
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
