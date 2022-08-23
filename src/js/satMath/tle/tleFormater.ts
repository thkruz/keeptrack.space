import { stringPad } from '@app/js/lib/helpers';

export type StringifiedNubmer = `${number}.${number}`;

export const formatInclination = (inc: StringifiedNubmer): string => {
  const incNum = parseFloat(inc).toFixed(4);
  const inc0 = stringPad.pad0(incNum, 8);
  if (inc0.length !== 8) throw new Error('inc length is not 8');
  return inc0;
};
export const formatMeanMotion = (meanmo: StringifiedNubmer): string => {
  const meanmoNum = parseFloat(meanmo).toFixed(8);
  const meanmo0 = stringPad.pad0(meanmoNum, 11);
  if (meanmo0.length !== 11) throw new Error('meanmo length is not 11');
  return meanmo0;
};
export const formatRightAscension = (rasc: StringifiedNubmer): string => {
  const rascNum = parseFloat(rasc).toFixed(4);
  const rasc0 = stringPad.pad0(rascNum, 8);
  if (rasc0.length !== 8) throw new Error('rasc length is not 8');
  return rasc0;
};
export const formatArgumentOfPerigee = (argPe: StringifiedNubmer): string => {
  const argPeNum = parseFloat(argPe).toFixed(4);
  const argPe0 = stringPad.pad0(argPeNum, 8);
  if (argPe0.length !== 8) throw new Error('argPe length is not 8');
  return argPe0;
};
export const formatMeanAnomaly = (meana: StringifiedNubmer): string => {
  const meanaNum = parseFloat(meana).toFixed(4);
  const meana0 = stringPad.pad0(meanaNum, 8);
  if (meana0.length !== 8) throw new Error('meana length is not 8');
  return meana0;
};
