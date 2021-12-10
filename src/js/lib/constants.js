"use strict";
exports.__esModule = true;
exports.STAR_DISTANCE = exports.RADIUS_OF_SUN = exports.GROUND_BUFFER_DISTANCE = exports.RADIUS_OF_EARTH = exports.cKmPerMs = exports.cKmPerSec = exports.cMPerSec = exports.MOON_SCALAR_DISTANCE = exports.RADIUS_OF_DRAW_MOON = exports.SUN_SCALAR_DISTANCE = exports.RADIUS_OF_DRAW_SUN = exports.PLANETARIUM_DIST = exports.MINUTES_PER_DAY = exports.MILLISECONDS_PER_DAY = exports.RAD2DEG = exports.DEG2RAD = exports.TAU = exports.PI = exports.ZOOM_EXP = void 0;
exports.ZOOM_EXP = 3;
exports.PI = Math.PI;
exports.TAU = 2 * Math.PI;
exports.DEG2RAD = exports.TAU / 360;
exports.RAD2DEG = 360 / exports.TAU;
// export const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
// TODO: this is really MILLISECONDS_TO_DAYS
exports.MILLISECONDS_PER_DAY = 1.15741e-8;
exports.MINUTES_PER_DAY = 1440;
exports.PLANETARIUM_DIST = 3;
exports.RADIUS_OF_DRAW_SUN = 9000;
exports.SUN_SCALAR_DISTANCE = 250000;
exports.RADIUS_OF_DRAW_MOON = 4000;
exports.MOON_SCALAR_DISTANCE = 200000;
exports.cMPerSec = 299792458;
exports.cKmPerSec = 299792458 / 1000;
exports.cKmPerMs = 299792458 / 1000 / 1000;
exports.RADIUS_OF_EARTH = 6371; // Radius of Earth in kilometers
exports.GROUND_BUFFER_DISTANCE = 1; // Distance objects are placed above earth to avoid z-buffer fighting
exports.RADIUS_OF_SUN = 695700; // Radius of the Sun in kilometers
exports.STAR_DISTANCE = 250000; // Artificial Star Distance - Lower numberrReduces webgl depth buffer
