import $ from 'jquery';

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const documentHTML = '<!doctype html><html><body><div id="root"></div></body></html>';
global.document = new JSDOM(documentHTML);
global.window = document.parentWindow;

global.window.resizeTo = (width, height) => {
  global.window.innerWidth = width || global.window.innerWidth;
  global.window.innerHeight = width || global.window.innerHeight;
  global.window.dispatchEvent(new Event('resize'));
};

document.body.innerHTML += '<div id="keeptrack-canvas"></div>';

global.$ = global.jQuery = $;
window.jQuery = $;
