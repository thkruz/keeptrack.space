/* eslint-disable no-sync */

import fs from 'fs';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';

const copySync = (src, dest) => {
  var data = fs.readFileSync(src);
  fs.writeFileSync(dest, data);
};

const files = ['tle/TLEdebris.json', 'textures/moon-1024.jpg', 'textures/earthmap512.jpg', 'textures/earthlights512.jpg', 'textures/earthbump8k.jpg', 'textures/earthspec8k.jpg', 'textures/earthmap4k.jpg', 'textures/earthlights4k.jpg'];

console.log(`Removing ./embed...`);
try {
  rimraf.sync('./embed');
} catch (error) {
  //
}

console.log(`Creating ./embed...`);
try {
  mkdirp.sync('./embed');
} catch (error) {
  //
}

console.log(`Creating ./embed/keepTrack...`);
mkdirp.sync('./embed/keepTrack');

console.log(`Creating ./embed/keepTrack/js...`);
mkdirp.sync('./embed/keepTrack/js');

console.log(`Creating ./embed/keepTrack/textures...`);
mkdirp.sync('./embed/keepTrack/textures');

console.log(`Creating ./embed/keepTrack/tle...`);
mkdirp.sync('./embed/keepTrack/tle');

files.forEach((file) => {
  console.log(`Copying ${file}...`);
  copySync(`./src/${file}`, `./embed/keepTrack/${file}`);
});

// console.log(`Copying settings...`);
// copySync(`./src/js/settingsManager/settingsManager.js`, `./embed/keepTrack/js/settings.js`);
console.log(`Copying settingsOverride...`);
copySync(`./src/js/settingsManager/settingsOverrideEmbed.js`, `./embed/keepTrack/settingsOverride.js`);
