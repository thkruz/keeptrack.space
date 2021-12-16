import mkdirp from 'mkdirp';
import rimraf from 'rimraf';

export const setupDistFolders = () => {
  rimraf.sync('./dist');
  mkdirp.sync('./dist');

  mkdirp.sync('./dist/plugins');
  mkdirp.sync('./dist/settings');
  mkdirp.sync('./dist/css');
};

export const setupEmbedFolders = () => {
  rimraf.sync('./embed');
  mkdirp.sync('./embed');

  mkdirp.sync('./embed/keepTrack');
  mkdirp.sync('./embed/keepTrack/js');
  mkdirp.sync('./embed/keepTrack/settings');
  mkdirp.sync('./embed/keepTrack/css');
  mkdirp.sync('./embed/keepTrack/textures');
  mkdirp.sync('./embed/keepTrack/tle');
};
