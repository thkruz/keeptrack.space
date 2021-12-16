import { stringPad } from '@app/js/lib/helpers';

export const formatInclination = (inc: string): string => {
  inc = parseFloat(inc).toPrecision(7);
  const incArr = inc.split('.');
  incArr[0] = incArr[0].substr(-3, 3);
  if (incArr[1]) {
    incArr[1] = incArr[1].substr(0, 4);
  } else {
    incArr[1] = '0000';
  }
  inc = (incArr[0] + '.' + incArr[1]).toString();
  inc = stringPad.pad0(inc, 8);
  return inc;
};
export const formatMeanMotion = (meanmo: string): string => {
  meanmo = parseFloat(meanmo).toPrecision(10);
  const meanmoArr = meanmo.split('.');
  meanmoArr[0] = meanmoArr[0].substr(-2, 2);
  if (meanmoArr[1]) {
    meanmoArr[1] = meanmoArr[1].substr(0, 8);
  } else {
    meanmoArr[1] = '00000000';
  }
  meanmo = (meanmoArr[0] + '.' + meanmoArr[1]).toString();
  meanmo = stringPad.pad0(meanmo, 8);
  return meanmo;
};
export const formatRightAscension = (rasc: string): string => {
  rasc = parseFloat(rasc).toPrecision(7);
  const rascArr = rasc.split('.');
  rascArr[0] = rascArr[0].substr(-3, 3);
  if (rascArr[1]) {
    rascArr[1] = rascArr[1].substr(0, 4);
  } else {
    rascArr[1] = '0000';
  }
  rasc = (rasc[0] + '.' + rasc[1]).toString();
  rasc = stringPad.pad0(rasc, 8);
  return rasc;
};
export const formatArgumentOfPerigee = (argPe: string): string => {
  argPe = parseFloat(argPe).toPrecision(7);
  const argPeArr = argPe.split('.');
  argPeArr[0] = argPeArr[0].substr(-3, 3);
  if (argPeArr[1]) {
    argPeArr[1] = argPeArr[1].substr(0, 4);
  } else {
    argPeArr[1] = '0000';
  }
  argPe = (argPeArr[0] + '.' + argPeArr[1]).toString();
  argPe = stringPad.pad0(argPe, 8);
  return argPe;
};
export const formatMeanAnomaly = (meana: string): string => {
  meana = parseFloat(meana).toPrecision(7);
  const meanaArr = meana.split('.');
  meanaArr[0] = meanaArr[0].substr(-3, 3);
  if (meanaArr[1]) {
    meanaArr[1] = meanaArr[1].substr(0, 4);
  } else {
    meanaArr[1] = '0000';
  }
  meana = (meanaArr[0] + '.' + meanaArr[1]).toString();
  meana = stringPad.pad0(meana, 8);
  return meana;
};
