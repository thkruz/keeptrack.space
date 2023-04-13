import { RADIUS_OF_EARTH } from '../js/lib/constants';
import { convert6DigitToA5 } from '../js/plugins/catalog-loader/convert6DigitToA5';
import { createTle } from '../js/satMath/tle/createTle';
import { writeFileSync } from 'fs';

const alt2period = (alt: number): number => {
  const EARTH_GM_VALUE = 398600.4418;
  return (2 * Math.PI * Math.sqrt((RADIUS_OF_EARTH + alt) ** 3 / EARTH_GM_VALUE)) / 60;
};
let satNumber = 100000;
let isMaxReached = false;
const makeTle = (alt: number, inc: number, rasc: number, meana: number) => {
  const scc = convert6DigitToA5(satNumber.toString());
  if (scc[0] == '[') {
    isMaxReached = true;
  }
  satNumber++;

  const meanmo_ = 1440 / alt2period(alt);
  return createTle({
    inc: inc.toString() as any,
    meana: meana.toString() as any,
    meanmo: meanmo_.toString() as any,
    rasc: rasc.toString() as any,
    argPe: `${Math.round(Math.random() * 350)}.2030` as any,
    ecen: '0.0000026',
    epochyr: '30',
    epochday: '106.00000000',
    intl: '1958001A',
    scc: scc,
  });
};
const generateTles = (planes: number, satsPerPlane: number, alt: number, inc: number) => {
  for (let i = 0; i < planes; i++) {
    const rasc = (360 / planes) * i;
    for (let j = 0; j < satsPerPlane; j++) {
      if (!isMaxReached) {
        const meana = (360 / satsPerPlane) * j;
        const tles_ = makeTle(alt, inc, rasc, meana);

        if (!isMaxReached) {
          tles.push(tles_.TLE1);
          tles.push(tles_.TLE2);
        }
      }
    }
  }
};

const tles = [];

// Kuiper Constellation
//////////////////////
{
  generateTles(1, 782, 590, 33);
  generateTles(1, 2, 590, 30);
  generateTles(1292, 1, 610, 42);
  generateTles(289, 4, 630, 51.9);
}

// Guanwang Constellation
//////////////////////
{
  generateTles(16, 30, 590, 85);
  generateTles(40, 50, 600, 50);
  generateTles(60, 60, 508, 60);
  generateTles(36, 36, 1145, 30);
  generateTles(36, 36, 1145, 40);
  generateTles(36, 36, 1145, 50);
  generateTles(36, 36, 1145, 60);
}

// StarlinkG2 Constellation
//////////////////////
{
  generateTles(28, 89, 525, 53);
  generateTles(28, 89, 535, 33);
}

// Starlink2 Constellation
//////////////////////
{
  generateTles(48, 110, 340, 53);
  generateTles(48, 110, 345, 46);
  generateTles(48, 110, 350, 38);
  generateTles(30, 120, 360, 96.9);
  generateTles(28, 30, 530, 43);
  generateTles(28, 30, 525, 53);
  generateTles(28, 30, 535, 33);
  generateTles(12, 12, 604, 148);
  generateTles(18, 18, 614, 115.7);
}

// Oneweb Constellation
//////////////////////
{
  generateTles(36, 49, 1200, 87.9);
  generateTles(32, 72, 1200, 40);
  generateTles(32, 72, 1200, 55);
}

// Yinhe Galaxy Space Constellation
//////////////////////
{
  generateTles(10, 100, 500, 63.5);
}

// Hanwha Constellation
//////////////////////
{
  generateTles(10, 200, 499, 97.51);
}

// Lynk Constellation
//////////////////////
{
  generateTles(10, 200, 501, 97.49);
}

// Astra Constellation
//////////////////////
{
  generateTles(1, 40, 700, 0);
  generateTles(14, 36, 690, 98);
  generateTles(56, 32, 700, 55);
  generateTles(112, 20, 380, 97);
  generateTles(51, 96, 390, 30);
  generateTles(61, 68, 400, 55);
}

// Boeing Constellation
//////////////////////
{
  generateTles(11, 12, 1056, 54);
  generateTles(30, 20, 670, 82.9);
  generateTles(40, 35, 680, 54.9);
  generateTles(46, 34, 690, 37.9);
  generateTles(28, 30, 1040, 37.2);
  generateTles(35, 28, 1070, 48.8);
  generateTles(11, 26, 1085, 79.9);
  generateTles(1, 39, 9000, 0);
  generateTles(80, 1, 10000, 41.2);
}

// Telesat Lightspeed Constellation
//////////////////////
{
  generateTles(6, 13, 1015, 99);
  generateTles(20, 11, 1325, 50.9);
  generateTles(27, 13, 1015, 99);
  generateTles(40, 33, 1325, 50.9);
}

// HVNET Constellation
//////////////////////
{
  generateTles(36, 40, 1150, 55);
}

// SpinLaunch Constellation
//////////////////////
{
  generateTles(1190, 1, 830, 55);
}

// Globalstar Constellation
//////////////////////
{
  generateTles(36, 35, 485, 55);
  generateTles(10, 10, 515, 70);
  generateTles(30, 30, 600, 55);
  generateTles(10, 10, 620, 98);
  generateTles(24, 30, 700, 55);
}

// E-SPACE Cinnamon Constellation
//////////////////////
{
  generateTles(1, 360, 550, 0);
  generateTles(36, 360, 552, 24);
  generateTles(36, 360, 556, 27);
  generateTles(36, 360, 559, 30);
  generateTles(36, 360, 563, 33);
  generateTles(36, 360, 556, 36);
  generateTles(36, 360, 570, 39);
  generateTles(36, 360, 574, 42);
  generateTles(36, 360, 577, 45);
  generateTles(36, 360, 581, 48);
  generateTles(36, 360, 584, 51);
  generateTles(36, 360, 588, 54);
  generateTles(36, 360, 592, 57);
  generateTles(36, 360, 595, 60);
  generateTles(36, 360, 599, 63);
  generateTles(36, 360, 602, 66);
  generateTles(36, 360, 606, 69);
  generateTles(36, 360, 610, 72);
  generateTles(36, 360, 613, 75);
  generateTles(36, 360, 617, 78);
  generateTles(36, 360, 617, 81);
  generateTles(36, 360, 620, 84);
  generateTles(36, 360, 624, 87);
  generateTles(36, 360, 628, 90);
  generateTles(36, 360, 631, 93);
  generateTles(36, 360, 635, 96);
  generateTles(36, 360, 638, 98);
  generateTles(3, 1, 528, 97.5);
}

writeFileSync('2030.txt', tles.join('\n'));
// writeFileSync('../tle/TLEb.txt', tles.join('\n'));
