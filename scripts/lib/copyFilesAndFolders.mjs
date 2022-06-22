import copydir from 'copy-dir';
import { readFileSync, writeFileSync } from 'fs';
import copySync from './copySync.mjs';

export const copyFilesAndFolders = (reqDirs, reqFiles, optDirs, optFiles, dest) => {
  const opts = {
    // keep add time and modify time
    utimes: true,
    // keep file mode
    mode: true,
    // cover file when exists, default is true
    cover: true,
  };

  optDirs.forEach((dir) => {
    try {
      copydir.sync(`./src/${dir}`, `./${dest}/${dir}`, opts);
    } catch {
      // Optional Folder
    }
  });
  optFiles.forEach((file) => {
    try {
      copySync(`./src/${file}`, `./${dest}/${file}`);
    } catch {
      // Optional Folder
    }
  });

  reqDirs.forEach((dir) => copydir.sync(`./src/${dir}`, `./${dest}/${dir}`, opts));
  reqFiles.forEach((file) => copySync(`./src/${file}`, `./${dest}/${file}`));
};

const writeFile = (dest, data) => {
  try {
    writeFileSync(dest, data, { flag: 'wx' }, (err) => {
      if (err) {
        console.log('file ' + dest + ' already exists, testing next');
      } else {
        // console.log("Succesfully written " + dest);
      }
    });
  } catch {
    // console.log("Error writing " + dest);
  }
};

export const copySettingsFiles = (dest) => {
  copySync(`./src/js/settingsManager/settingsManager.js`, `./${dest}/settings/settings.js`);
  const settingsOverrideData = readFileSync(`./src/js/settingsManager/settingsOverride.js`);
  writeFile(`./${dest}/settings/settingsOverride.js`, settingsOverrideData);
};

export default copyFilesAndFolders;
