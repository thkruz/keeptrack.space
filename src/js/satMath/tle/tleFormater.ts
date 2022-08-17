import { stringPad } from '@app/js/lib/helpers';

export type StringifiedNubmer = `${number}.${number}`;

export const formatInclination = (inc: StringifiedNubmer): string => {
  const incNum = parseFloat(inc).toFixed(4);
  return stringPad.pad0(incNum, 8);
};
export const formatMeanMotion = (meanmo: StringifiedNubmer): string => {
  const meanmoNum = parseFloat(meanmo).toFixed(8);
  return stringPad.pad0(meanmoNum, 11);
};
export const formatRightAscension = (rasc: StringifiedNubmer): string => {
  const rascNum = parseFloat(rasc).toFixed(4);
  return stringPad.pad0(rascNum, 8);
};
export const formatArgumentOfPerigee = (argPe: StringifiedNubmer): string => {
  const argPeNum = parseFloat(argPe).toFixed(4);
  return stringPad.pad0(argPeNum, 8);
};
export const formatMeanAnomaly = (meana: StringifiedNubmer): string => {
  const meanaNum = parseFloat(meana).toFixed(4);
  return stringPad.pad0(meanaNum, 8);
};
