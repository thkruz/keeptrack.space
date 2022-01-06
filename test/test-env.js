import '@app/js/settingsManager/settingsManager';
import fs from 'fs';
import $ from 'jquery';
import { JSDOM } from 'jsdom';
import path from 'path';
import 'webgl-mock';

// This allows consistent testing in the CI environment
jest.useFakeTimers().setSystemTime(new Date('2020-01-01').getTime());

// eslint-disable-next-line no-sync
const documentHTML = fs.readFileSync(path.resolve(__dirname, '../src/index.html'), 'utf8').toString();
const body = '<body>';
const bodyEnd = '</body>';
const docBody = documentHTML.substring(documentHTML.indexOf(body) + body.length, documentHTML.indexOf(bodyEnd));
const dom = new JSDOM(documentHTML, { pretendToBeVisual: true, runScripts: 'dangerously', resources: 'usable' });

// set the global window and document objects using JSDOM
// global is a node.js global object
if (typeof global !== 'undefined') {
  global.window = dom.window;
  global.document = dom.window.document;
  global.docBody = docBody;
}

global.document.url = 'https://keeptrack.space';
global.document.includeNodeLocations = true;
if (typeof global.window == 'undefined') {
  global.window = global.document.parentWindow;
}

global.document.canvas = new HTMLCanvasElement(1920, 1080);
global.document.canvas.style = {};

global.window.resizeTo = (width, height) => {
  global.window.innerWidth = width || global.window.innerWidth;
  global.window.innerHeight = height || global.window.innerHeight;

  // Simulate window resize event
  const resizeEvent = global.document.createEvent('Event');
  resizeEvent.initEvent('resize', true, true);
};

window.resizeTo(1920, 1080);

global.requestAnimationFrame = function (cb) {
  return setTimeout(cb, 0);
};

global.console = {
  log: jest.fn(), // console.log are ignored in tests
  // log: console.log, // console.log are ignored in tests

  // Keep native behaviour for other methods, use those to print out things in your own tests, not `console.log`
  error: console.debug,
  // error: jest.fn(),
  warn: console.warn,
  // warn: jest.fn(),
  // info: console.info,
  info: jest.fn(),
  // debug: console.debug,
  debug: jest.fn(),
};

// document.body.innerHTML += '<div id="keeptrack-canvas"></div>';

window.HTMLMediaElement.prototype.load = () => {
  /* do nothing */
};
window.HTMLMediaElement.prototype.play = () => {
  /* do nothing */
};
window.HTMLMediaElement.prototype.pause = () => {
  /* do nothing */
};
window.HTMLMediaElement.prototype.addTextTrack = () => {
  /* do nothing */
};

global.$ = global.jQuery = $;
window.jQuery = $;

$.fn.replace = (input, output) => $.fn.toString().replace(input, output);

$.colorbox = jest.fn();
$.datepicker = jest.fn();
$.fn.datepicker = jest.fn();
$.fn.colorbox = jest.fn();
$.fn.colorPick = jest.fn();
$.fn.effect = jest.fn();
$.fn.resizable = jest.fn();
$.fn.tooltip = jest.fn();
$.fn.fadeIn = jest.fn((time, cb) => {
  if (typeof cb !== 'undefined') {
    cb();
  }
});

global.document.canvas.addEventListener = () => true;
