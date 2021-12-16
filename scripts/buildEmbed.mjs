import webpack from 'webpack';
import { copyFilesAndFolders, copySettingsFiles } from './lib/copyFilesAndFolders.mjs';
import { setupEmbedFolders } from './lib/setupFolders.mjs';
import { generateConfig } from './webpack.mjs';

const reqDirs = [];
const optDirs = [];
const reqFiles = [
  'textures/moon-1024.jpg',
  'textures/earthmap512.jpg',
  'textures/earthlights512.jpg',
  'textures/earthbump8k.jpg',
  'textures/earthspec8k.jpg',
  'textures/earthmap4k.jpg',
  'textures/earthlights4k.jpg',
];
const optFiles = ['tle/TLEdebris.json'];

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
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    process.exit(0);
  });
  process.on('SIGUSR2', () => {
    process.exit(0);
  });
  process.on('exit', () => {
    process.exit(0);
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
