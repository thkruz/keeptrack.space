import $ from 'jquery';

require('webgl-mock');
const jsdom = require('jsdom');
const { createCanvas } = require('canvas');
const { JSDOM } = jsdom;

const documentHTML = '<!doctype html><html><body><div id="root"></div><canvas id="keeptrack-canvas"></canvas></body></html>';
global.document = new JSDOM(documentHTML);
global.document.url = 'https://keeptrack.space';
global.document.includeNodeLocations = true;
global.window = document.parentWindow;

global.document.canvas = new HTMLCanvasElement(1920, 1080);

global.window.resizeTo = (width, height) => {
  global.window.innerWidth = width || global.window.innerWidth;
  global.window.innerHeight = width || global.window.innerHeight;
  global.window.dispatchEvent(new Event('resize'));
};

document.body.innerHTML += '<div id="keeptrack-canvas"></div>';

global.$ = global.jQuery = $;
window.jQuery = $;
