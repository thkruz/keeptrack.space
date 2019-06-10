/*
 StarCalc, a library for calculating star positions
 (c) 2014, Matthew Petroff
 Based on SunCalc, (c) 2011-2013, Vladimir Agafonkin
 https://github.com/mourner/suncalc
*/

(function () { "use strict";

// shortcuts for easier to read formulas

var PI   = Math.PI,
    sin  = Math.sin,
    cos  = Math.cos,
    tan  = Math.tan,
    asin = Math.asin,
    atan = Math.atan2,
    acos = Math.acos,
    rad  = PI / 180;


// date/time constants and conversions

var dayMs = 1000 * 60 * 60 * 24,
    J1970 = 2440588,
    J2000 = 2451545;

function toJulian(date) {
    return date.valueOf() / dayMs - 0.5 + J1970;
}
function toDays(date) {
    return toJulian(date) - J2000;
}


// general calculations for position

function getAzimuth(H, phi, dec) {
    return atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi));
}
function getAltitude(H, phi, dec) {
    return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H));
}
function getSiderealTime(d, lw) {
    return rad * (280.16 + 360.9856235 * d) - lw;
}

var StarCalc = {};

StarCalc.getStarPosition = function (date, lat, lng, c) {

    var lw  = rad * -lng,
        phi = rad * lat,
        d   = toDays(date),

        H = getSiderealTime(d, lw) - c.ra / 12 * Math.PI,
        h = getAltitude(H, phi, c.dec / 180 * Math.PI);
//console.log(getAzimuth(H, phi, c.dec / 180 * Math.PI));
    // altitude correction for refraction
    h = h + rad * 0.017 / tan(h + rad * 10.26 / (h + rad * 5.10));

    return {
        azimuth: getAzimuth(H, phi, c.dec / 180 * Math.PI),
        altitude: h,
        vmag: c.vmag,
        name: c.name,
        pname: c.pname,
        dist: c.dist
    };
};


// export as AMD module / Node module / browser variable

if (typeof define === 'function' && define.amd) {
    define(StarCalc);
} else if (typeof module !== 'undefined') {
    module.exports = StarCalc;
} else {
    window.StarCalc = StarCalc;
}

}());
