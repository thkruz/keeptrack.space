import webpack from 'webpack';
import generateConstVersion from './lib/constVersion.mjs';
import { copyFilesAndFolders, copySettingsFiles } from './lib/copyFilesAndFolders.mjs';
import { setupDistFolders } from './lib/setupFolders.mjs';
import { updateTime } from './lib/updateTime.mjs';
import { generateConfig } from './webpack.mjs';

console.clear();
console.log('Copying files...'); // NOSONAR

const reqDirs = ['audio', 'css/fonts', 'analysis', 'img', 'meshes', 'offline', 'php', 'radarData', 'res', 'simulation', 'textures', 'tle'];
const optDirs = ['admin'];

const reqFiles = [
  'README.txt',
  'KeepTrack.bat',
  'KeepTrack.lnk',
  'Chrome With Local Files.lnk',
  'config.htm',
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
const optFiles = [];

console.log('Copy static files...'); // NOSONAR

setupDistFolders();
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
