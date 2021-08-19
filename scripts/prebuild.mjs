/* eslint-disable no-sync */

import copydir from 'copy-dir';
import fs from 'fs';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';

const copySync = (src, dest) => {
  var data = fs.readFileSync(src);
  fs.writeFileSync(dest, data);
};

const dirs = ['audio', 'admin', 'css/fonts', 'analysis', 'img', 'meshes', 'offline', 'php', 'radarData', 'res', 'satData', 'simulation', 'social', 'textures', 'tle'];

const files = [
  'README.txt',
  'KeepTrack.bat',
  'KeepTrack.lnk',
  'Chrome With Local Files.lnk',
  'embed.html',
  'favicon.ico',
  'index.htm',
  'manifest.webmanifest',
  'serviceWorker.js',
  'SOCRATES.htm',
  'css/loading-screen.css',
  'css/fonts.css',
  'css/materialize.css',
  'css/materialize-local.css',
];

const opts = {
  utimes: true, // keep add time and modify time
  mode: true, // keep file mode
  cover: true, // cover file when exists, default is true
};

console.log(`Removing ./dist...`);
try {
  rimraf.sync('./dist');
} catch (error) {
  //
}

console.log(`Creating ./dist...`);
try {
  mkdirp.sync('./dist');
} catch (error) {
  //
}

console.log(`Creating ./dist/plugins...`);
mkdirp.sync('./dist/plugins');
console.log(`Creating ./dist/settings...`);
mkdirp.sync('./dist/settings');

console.log(`Creating ./dist/css...`);
try {
  mkdirp.sync('./dist/css');
} catch (error) {
  //
}

dirs.forEach((dir) => {
  try {
    console.log(`Copying ${dir}...`);
    copydir.sync(`./src/${dir}`, `./dist/${dir}`, opts);
  } catch (error) {
    console.log(error);
  }
});

files.forEach((file) => {
  console.log(`Copying ${file}...`);
  copySync(`./src/${file}`, `./dist/${file}`);
});

console.log(`Copying settings...`);
copySync(`./src/js/settingsManager/settingsManager.js`, `./dist/settings/settings.js`);
console.log(`Copying settingsOverride...`);
copySync(`./src/js/settingsManager/settingsOverride.js`, `./dist/settings/settingsOverride.js`);
