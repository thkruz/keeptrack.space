import { saveAs } from '@app/js/lib/external/file-saver.min.js';

var stringPad = {};
stringPad.pad = (val, len) => {
  val = String(val);
  len = len || 2;
  while (val.length < len) val = '0' + val;
  return val;
};
stringPad.padEmpty = (num, size) => {
  var s = '   ' + num;
  return s.substr(s.length - size);
};
stringPad.pad0 = (str, max) => (str.length < max ? stringPad.pad0('0' + str, max) : str);

var saveVariable = (variable, filename) => {
  try {
    filename = typeof filename == 'undefined' ? 'variable.txt' : filename;
    variable = JSON.stringify(variable);
    var blob = new Blob([variable], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, filename);
  } catch (e) {
    console.warn('Unable to Save File!');
  }
};

const saveCsv = (items, name) => {
  try {
    const replacer = (key, value) => (value === null ? '' : value); // specify how you want to handle null values here
    const header = Object.keys(items[0]);
    let csv = items.map((row) => header.map((fieldName) => JSON.stringify(row[fieldName], replacer)).join(','));
    csv.unshift(header.join(','));
    csv = csv.join('\r\n');

    var blob = new Blob([csv], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${name}.csv`);
  } catch (error) {
    console.warn('Unable to Save File!');
  }
};

const parseRgba = (str) => {
  // eslint-disable-next-line no-useless-escape
  let [r, g, b, a] = str.match(/[\d\.]+/gu);
  r = parseInt(r) / 255;
  g = parseInt(g) / 255;
  b = parseInt(b) / 255;
  a = parseFloat(a);
  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
    console.warn('Bad RGBA! Using White Instead.');
    return [1, 1, 1, 1];
  } else {
    return [r, g, b, a];
  }
};

const hex2RgbA = (hex) => {
  // eslint-disable-next-line prefer-named-capture-group
  if (/^#([A-Fa-f0-9]{3}){1,2}$/u.test(hex)) {
    let c = hex.substring(1).split('');
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    const r = ((c >> 16) & 255) / 255;
    const g = ((c >> 8) & 255) / 255;
    const b = (c & 255) / 255;
    return [r, g, b, 1];
  }
  console.warn('Bad Hex! Using White Instead.');
  return [1, 1, 1, 1];
};

const rgbCss = (values) => `rgba(${values[0] * 255},${values[1] * 255},${values[2] * 255},${values[3]})`;

export { stringPad, saveVariable, saveCsv, saveAs, parseRgba, hex2RgbA, rgbCss };
