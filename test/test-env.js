import 'webgl-mock';
import $ from 'jquery';

const fs = require('fs');
const path = require('path');

const jsdom = require('jsdom');
const { createCanvas } = require('canvas');
const { JSDOM } = jsdom;

// eslint-disable-next-line no-sync
const documentHTML = fs.readFileSync(path.resolve(__dirname, '../src/index.htm'), 'utf8').toString();
const body = '<body>';
const bodyEnd = '</body>';
const docBody = documentHTML.substring(documentHTML.indexOf(body) + body.length, documentHTML.indexOf(bodyEnd));
const dom = new JSDOM(documentHTML, { runScripts: 'dangerously', resources: 'usable' });

// set the global window and document objects using JSDOM
// global is a node.js global object
if (global !== undefined) {
  global.window = dom.window;
  global.document = dom.window.document;
  global.docBody = docBody;
}

global.document.url = 'https://keeptrack.space';
global.document.includeNodeLocations = true;
global.window = document.parentWindow;

global.document.canvas = new HTMLCanvasElement(1920, 1080);

global.window.resizeTo = (width, height) => {
  global.window.innerWidth = width || global.window.innerWidth;
  global.window.innerHeight = height || global.window.innerHeight;
  global.window.dispatchEvent(new Event('resize'));
};

window.resizeTo(1920, 1080);

global.requestAnimationFrame = function (cb) {
  return setTimeout(cb, 0);
};

// document.body.innerHTML += '<div id="keeptrack-canvas"></div>';

global.$ = global.jQuery = $;
window.jQuery = $;

global.document.canvas.addEventListener = () => true;
