import copydir from 'copy-dir';
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

export const copySettingsFiles = (dest) => {
  copySync(`./src/js/settingsManager/settingsManager.js`, `./${dest}/settings/settings.js`);
  copySync(`./src/js/settingsManager/settingsOverride.js`, `./${dest}/settings/settingsOverride.js`);
};

export default copyFilesAndFolders;
