import { rmSync } from 'fs';
import mkdirp from 'mkdirp';

export const setupDistFolders = () => {
  rmSync('./dist/admin', { recursive: true, force: true });
  rmSync('./dist/audio', { recursive: true, force: true });
  rmSync('./dist/css', { recursive: true, force: true });
  rmSync('./dist/img', { recursive: true, force: true });
  rmSync('./dist/js', { recursive: true, force: true });
  rmSync('./dist/meshes', { recursive: true, force: true });
  rmSync('./dist/offline', { recursive: true, force: true });
  rmSync('./dist/php', { recursive: true, force: true });
  rmSync('./dist/plugins', { recursive: true, force: true });
  rmSync('./dist/radarData', { recursive: true, force: true });
  rmSync('./dist/res', { recursive: true, force: true });
  // rmSync('./dist/settings', { recursive: true, force: true });
  rmSync('./dist/simulation', { recursive: true, force: true });
  rmSync('./dist/textures', { recursive: true, force: true });
  rmSync('./dist/tle', { recursive: true, force: true });
  rmSync('./dist/*', { recursive: true, force: true });
  mkdirp.sync('./dist');

  mkdirp.sync('./dist/plugins');
  mkdirp.sync('./dist/settings');
  mkdirp.sync('./dist/css');
};

export const setupEmbedFolders = () => {
  rmSync('./embed/keepTrack/js', { recursive: true, force: true });
  rmSync('./embed/keepTrack/css', { recursive: true, force: true });
  rmSync('./embed/keepTrack/textures', { recursive: true, force: true });
  rmSync('./embed/keepTrack/tle', { recursive: true, force: true });
  mkdirp.sync('./embed');

  mkdirp.sync('./embed/keepTrack');
  mkdirp.sync('./embed/keepTrack/js');
  mkdirp.sync('./embed/keepTrack/settings');
  mkdirp.sync('./embed/keepTrack/css');
  mkdirp.sync('./embed/keepTrack/textures');
  mkdirp.sync('./embed/keepTrack/tle');
};
