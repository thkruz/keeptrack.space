import { stringPad } from '@app/js/lib/helpers';

export type StringifiedNubmer = `${number}.${number}`;

export const formatInclination = (inc: StringifiedNubmer): string => {
  let incStr = parseFloat(inc).toPrecision(7);
  const incArr = incStr.split('.');
  incArr[0] = incArr[0].substr(-3, 3);
  if (incArr[1]) {
    incArr[1] = incArr[1].substr(0, 4);
  } else {
    incArr[1] = '0000';
  }
  incStr = (incArr[0] + '.' + incArr[1]).toString();
  incStr = stringPad.pad0(incStr, 8);
  return incStr;
};
export const formatMeanMotion = (meanmo: StringifiedNubmer): string => {
  let meanmoStr = parseFloat(meanmo).toPrecision(10);
  const meanmoArr = meanmoStr.split('.');
  meanmoArr[0] = stringPad.pad0(meanmoArr[0].substr(-2, 2), 2);
  if (meanmoArr[1]) {
    meanmoArr[1] = meanmoArr[1].substr(0, 8);
  } else {
    meanmoArr[1] = '00000000';
  }
  meanmoStr = (meanmoArr[0] + '.' + meanmoArr[1]).toString();
  meanmoStr = stringPad.pad0(meanmoStr, 8);
  return meanmoStr;
};
export const formatRightAscension = (rasc: StringifiedNubmer): string => {
  let rascStr = parseFloat(rasc).toPrecision(7);
  const rascArr = rascStr.split('.');
  rascArr[0] = rascArr[0].substr(-3, 3);
  if (rascArr[1]) {
    rascArr[1] = rascArr[1].substr(0, 4);
  } else {
    rascArr[1] = '0000';
  }
  rascStr = (rascArr[0] + '.' + rascArr[1]).toString();
  rascStr = stringPad.pad0(rascStr, 8);
  return rascStr;
};
export const formatArgumentOfPerigee = (argPe: StringifiedNubmer): string => {
  let argPeStr = parseFloat(argPe).toPrecision(7);
  const argPeArr = argPeStr.split('.');
  argPeArr[0] = argPeArr[0].substr(-3, 3);
  if (argPeArr[1]) {
    argPeArr[1] = argPeArr[1].substr(0, 4);
  } else {
    argPeArr[1] = '0000';
  }
  argPeStr = (argPeArr[0] + '.' + argPeArr[1]).toString();
  argPeStr = stringPad.pad0(argPeStr, 8);
  return argPeStr;
};
export const formatMeanAnomaly = (meana: StringifiedNubmer): string => {
  let meanaStr = parseFloat(meana).toPrecision(7);
  const meanaArr = meanaStr.split('.');
  meanaArr[0] = meanaArr[0].substr(-3, 3);
  if (meanaArr[1]) {
    meanaArr[1] = meanaArr[1].substr(0, 4);
  } else {
    meanaArr[1] = '0000';
  }
  meanaStr = (meanaArr[0] + '.' + meanaArr[1]).toString();
  meanaStr = stringPad.pad0(meanaStr, 8);
  return meanaStr;
};
