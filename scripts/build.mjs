import { cpSync, mkdirSync, readdirSync, rmSync } from 'fs';
import webpack from 'webpack';
import generateConstVersion from './lib/constVersion.mjs';
import { generateConfig } from './webpack.mjs';

console.clear();
const myArgs = process.argv.slice(2);
const env = myArgs[0];
const isWatch = !!(typeof myArgs[1] !== 'undefined' && myArgs[1] === '--watch');

// Print current working directory
console.log(`Current working directory: ${process.cwd()}`); // NOSONAR

console.log('Removing old files...'); // NOSONAR
// Remove all files in dist
try {
  rmSync('./dist', { recursive: true });
  mkdirSync('./dist');
} catch {
  // This will fail if the folder doesn't exist
}

console.log('Copy static files...'); // NOSONAR
// Get a list of all files (not folders) in the public folder
let files = readdirSync('./public', { withFileTypes: true });

files.forEach((file) => {
  if (!file.isDirectory()) {
    cpSync(`./public/${file.name}`, `./dist/${file.name}`);
  }
});

files = readdirSync('./public/examples', { withFileTypes: true });
mkdirSync('./dist/examples');
files.forEach((file) => {
  if (!file.isDirectory()) {
    cpSync(`./public/examples/${file.name}`, `./dist/examples/${file.name}`);
  }
});

['audio', 'css', 'data', 'img', 'meshes', 'res', 'settings', 'simulation', 'textures', 'tle'].forEach((dir) => {
  cpSync(`public/${dir}`, `dist/${dir}`, { recursive: true, preserveTimestamps: true });
});

console.log('Updating version number...'); // NOSONAR
generateConstVersion('./package.json', 'src/settings/version.js');

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
      }),
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
        }),
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
    /*
     * console.log(
     *   runStats.toString({
     *     cached: false,
     *     colors: true,
     *     assets: true,
     *     chunks: false,
     *     chunkModules: false,
     *     chunkOrigins: false,
     *     errors: true,
     *     errorDetails: true,
     *     hash: false,
     *     modules: false,
     *     timings: false,
     *     warnings: false,
     *     version: false,
     *   })
     * );
     */
  });
}
