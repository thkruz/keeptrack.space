import { saveAs } from '@app/js/lib/file-saver.min.js';
var mathValue = {};

let ZOOM_EXP = 3;
mathValue.ZOOM_EXP = ZOOM_EXP;
let TAU = 2 * Math.PI;
mathValue.TAU = TAU;
let DEG2RAD = mathValue.TAU / 360;
mathValue.DEG2RAD = DEG2RAD;
mathValue.RAD2DEG = 360 / mathValue.TAU;
let RADIUS_OF_EARTH = 6371.0;
mathValue.RADIUS_OF_EARTH = RADIUS_OF_EARTH;
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

var watermarkedDataURL = (canvas, text) => {
  var tempCanvas = document.createElement('canvas');
  var tempCtx = tempCanvas.getContext('2d');
  var cw, ch;
  cw = tempCanvas.width = canvas.width;
  ch = tempCanvas.height = canvas.height;
  tempCtx.drawImage(canvas, 0, 0);
  tempCtx.font = '24px nasalization';
  var textWidth = tempCtx.measureText(text).width;
  tempCtx.globalAlpha = 1.0;
  tempCtx.fillStyle = 'white';
  tempCtx.fillText(text, cw - textWidth - 30, ch - 30);
  // tempCtx.fillStyle ='black'
  // tempCtx.fillText(text,cw-textWidth-10+2,ch-20+2)
  // just testing by adding tempCanvas to document
  document.body.appendChild(tempCanvas);
  let image = tempCanvas.toDataURL();
  tempCanvas.parentNode.removeChild(tempCanvas);
  return image;
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

export { ZOOM_EXP, TAU, DEG2RAD, RADIUS_OF_EARTH, mathValue, helpers, fixDpi, saveVariable, saveCsv, saveAs, watermarkedDataURL };
