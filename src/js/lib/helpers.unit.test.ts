import { hex2RgbA, parseRgba, rgbCss, saveCsv, saveVariable } from '../lib/helpers';

import { stringPad } from '../lib/stringPad';

test('helpers Unit Tests', () => {
  console.warn = jest.fn();

  stringPad.pad('5', 3);
  stringPad.pad('5');

  stringPad.padEmpty('5', 3);

  const test = stringPad.pad0('2500', 10);

  saveVariable(test, './test.txt');
  saveVariable(test);

  saveCsv([test], './test.csv');
  saveCsv([test]);

  parseRgba('[255,255,255,1]');
  rgbCss(parseRgba('[255,255,255]'));

  hex2RgbA('#FFF');
  hex2RgbA('#FFFFFF');
  hex2RgbA('FFF');
});
