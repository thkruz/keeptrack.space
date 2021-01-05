import { saveAs } from '@app/js/lib/file-saver.min.js';

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

var fixDpi = (canvas, dpi) => {
  //create a style object that returns width and height
  let style = {
    height() {
      return +getComputedStyle(canvas).getPropertyValue('height').slice(0, -2);
    },
    width() {
      return +getComputedStyle(canvas).getPropertyValue('width').slice(0, -2);
    },
  };
  //set the correct attributes for a crystal clear image!
  canvas.setAttribute('width', style.width() * dpi);
  canvas.setAttribute('height', style.height() * dpi);
};

export { helpers, fixDpi, saveVariable, saveCsv, saveAs };
