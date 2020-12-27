/**
 * @format
 */

import { saveAs } from '@app/js/lib/file-saver.min.js';
var mathValue = {};

mathValue.ZOOM_EXP = 3;
mathValue.TAU = 2 * Math.PI;
mathValue.DEG2RAD = mathValue.TAU / 360;
mathValue.RAD2DEG = 360 / mathValue.TAU;
mathValue.RADIUS_OF_EARTH = 6371.0;
mathValue.RADIUS_OF_SUN = 695700;
mathValue.MINUTES_PER_DAY = 1440;
mathValue.PLANETARIUM_DIST = 3;
mathValue.MILLISECONDS_PER_DAY = 1.15741e-8;

mathValue.RADIUS_OF_DRAW_SUN = 9000;
mathValue.SUN_SCALAR_DISTANCE = 250000;
mathValue.RADIUS_OF_DRAW_MOON = 4000;
mathValue.MOON_SCALAR_DISTANCE = 200000;

var helpers = {};
helpers.pad = (val, len) => {
  val = String(val);
  len = len || 2;
  while (val.length < len) val = '0' + val;
  return val;
};

helpers.padEmpty = (num, size) => {
  var s = '   ' + num;
  return s.substr(s.length - size);
};
helpers.pad0 = (str, max) => (str.length < max ? helpers.pad0('0' + str, max) : str);

var saveVariable = (variable, filename) => {
  filename = typeof filename == 'undefined' ? 'variable.txt' : filename;
  variable = JSON.stringify(variable);
  var blob = new Blob([variable], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, filename);
};

var saveCsv = (items, name) => {
  const replacer = (key, value) => (value === null ? '' : value); // specify how you want to handle null values here
  const header = Object.keys(items[0]);
  let csv = items.map((row) => header.map((fieldName) => JSON.stringify(row[fieldName], replacer)).join(','));
  csv.unshift(header.join(','));
  csv = csv.join('\r\n');

  var blob = new Blob([csv], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${name}.csv`);
};

export { mathValue, helpers, saveVariable, saveCsv, saveAs };
