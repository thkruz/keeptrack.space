export const stringPad = {
  pad: (val: string, len?: number): string => {
    val = String(val);
    len ??= 2;
    while (val.length < len) val = '0' + val;
    return val;
  },
  padEmpty: (num: string, size: number): string => {
    const s = '   ' + num;
    return s.substr(s.length - size);
  },
  pad0: (str: string, max: number): string => (str.length < max ? stringPad.pad0('0' + str, max) : str),
  trail0: (str: string, max: number): string => (str.length < max ? stringPad.trail0(str + '0', max) : str),
};
