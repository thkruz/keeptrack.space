import webpack from 'webpack';
import { copyFilesAndFolders, copySettingsFiles } from './lib/copyFilesAndFolders.mjs';
import { setupEmbedFolders } from './lib/setupFolders.mjs';
import { generateConfig } from './webpack.mjs';

const reqDirs = ['tle', 'css'];
const optDirs = ['meshes'];
const reqFiles = [
  'textures/moon-1024.jpg',
  'textures/earthmap512.jpg',
  'textures/earthmap16k.jpg',
  'textures/earthlights512.jpg',
  'textures/earthlights16k.jpg',
  'textures/earthbump8k.jpg',
  'textures/earthspec8k.jpg',
  'textures/earthmap4k.jpg',
  'textures/earthlights4k.jpg',
  'textures/skybox8k.jpg',
];
const optFiles = [];

console.clear();
console.log('Copy static files...'); // NOSONAR

setupEmbedFolders();
copyFilesAndFolders(reqDirs, reqFiles, optDirs, optFiles, 'embed/keepTrack');
copySettingsFiles('embed/keepTrack');

const myArgs = process.argv.slice(2);
const env = myArgs[0];
const isWatch = !!(typeof myArgs[1] !== 'undefined' && myArgs[1] === '--watch');

const webpackConfig = generateConfig(env, isWatch);

const compiler = webpack(webpackConfig);
if (isWatch) {
  compiler.watch({}, (watchErrors, watchStats) => {
    const hasErrors = watchErrors || watchStats.hasErrors();
    if (hasErrors) {
      console.log(
        watchStats.toString({
          cached: false,
          colors: true,
          assets: false,
          chunks: false,
          chunkModules: false,
          chunkOrigins: false,
          errors: true,
          errorDetails: true,
          hash: false,
          modules: false,
          timings: false,
          warnings: false,
          version: false,
          children: false,
          reasons: false,
          source: false,
        })
      );
    }
  });

  process.on('SIGINT', () => {
    throw new Error('SIGINT');
  });
  process.on('SIGTERM', () => {
    throw new Error('SIGTERM');
  });
  process.on('SIGUSR2', () => {
    throw new Error('SIGUSR2');
  });
  process.on('exit', () => {
    throw new Error('exit');
  });
} else {
  compiler.run((runErrors, runStats) => {
    console.log(
      runStats.toString({
        cached: false,
        colors: true,
        assets: true,
        chunks: false,
        chunkModules: false,
        chunkOrigins: false,
        errors: true,
        errorDetails: true,
        hash: false,
        modules: false,
        timings: false,
        warnings: false,
        version: false,
      })
    );
  });
}
