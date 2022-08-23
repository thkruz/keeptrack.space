import { copyFilesAndFolders, copySettingsFiles } from './lib/copyFilesAndFolders.mjs';

import { generateConfig } from './webpack.mjs';
import generateConstVersion from './lib/constVersion.mjs';
import { setupDistFolders } from './lib/setupFolders.mjs';
import { updateTime } from './lib/updateTime.mjs';
import webpack from 'webpack';

console.clear();
console.log('Copying files...'); // NOSONAR

const reqDirs = ['audio', 'css/fonts', 'img', 'meshes', 'offline', 'php', 'radarData', 'res', 'simulation', 'textures', 'tle'];
const optDirs = [''];

const reqFiles = [
  'README.txt',
  'KeepTrack.bat',
  'KeepTrack.lnk',
  'Chrome With Local Files.lnk',
  'config.html',
  'favicon.ico',
  'index.html',
  'manifest.webmanifest',
  'css/loading-screen.css',
  'css/fonts.css',
  'css/materialize.css',
  'css/materialize-local.css',
];
const optFiles = ['serviceWorker.js', 'SOCRATES.html'];

console.log('Removing old files...'); // NOSONAR
setupDistFolders();

console.log('Copy static files...'); // NOSONAR
copyFilesAndFolders(reqDirs, reqFiles, optDirs, optFiles, 'dist');
copySettingsFiles('dist');

console.log('Updating version number...'); // NOSONAR
generateConstVersion('./package.json', 'src/js/settingsManager/version.js');

console.log('Updating last update time...'); // NOSONAR
updateTime();

const myArgs = process.argv.slice(2);
const env = myArgs[0];
const isWatch = !!(typeof myArgs[1] !== 'undefined' && myArgs[1] === '--watch');

const webpackConfig = generateConfig(env, isWatch);

const compiler = webpack(webpackConfig, (watchErrors, watchStats) => {
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

if (isWatch) {
  compiler.watch({}, (watchErrors, watchStats) => {
    const hasErrors = watchErrors || watchStats.hasErrors();
    if (hasErrors && watchStats) {
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
    // console.log(
    //   runStats.toString({
    //     cached: false,
    //     colors: true,
    //     assets: true,
    //     chunks: false,
    //     chunkModules: false,
    //     chunkOrigins: false,
    //     errors: true,
    //     errorDetails: true,
    //     hash: false,
    //     modules: false,
    //     timings: false,
    //     warnings: false,
    //     version: false,
    //   })
    // );
  });
}
