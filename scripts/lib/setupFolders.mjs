import mkdirp from 'mkdirp';
import rimraf from 'rimraf';

export const setupDistFolders = () => {
  rimraf.sync('./dist/admin', { recursive: true });
  rimraf.sync('./dist/audio', { recursive: true });
  rimraf.sync('./dist/css', { recursive: true });
  rimraf.sync('./dist/img', { recursive: true });
  rimraf.sync('./dist/js', { recursive: true });
  rimraf.sync('./dist/meshes', { recursive: true });
  rimraf.sync('./dist/offline', { recursive: true });
  rimraf.sync('./dist/php', { recursive: true });
  rimraf.sync('./dist/plugins', { recursive: true });
  rimraf.sync('./dist/radarData', { recursive: true });
  rimraf.sync('./dist/res', { recursive: true });
  rimraf.sync('./dist/settings', { recursive: true });
  rimraf.sync('./dist/simulation', { recursive: true });
  rimraf.sync('./dist/textures', { recursive: true });
  rimraf.sync('./dist/tle', { recursive: true });
  rimraf.sync('./dist/*', { recursive: false });
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
