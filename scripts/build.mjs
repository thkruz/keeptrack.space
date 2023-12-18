import { cpSync, mkdirSync, rmSync } from 'fs';
import webpack from 'webpack';
import generateConstVersion from './lib/constVersion.mjs';
import { updateTime } from './lib/updateTime.mjs';
import { generateConfig } from './webpack.mjs';

console.clear();

// Print current working directory
console.log('Current working directory: ' + process.cwd()); // NOSONAR

console.log('Removing old files...'); // NOSONAR
// Remove all files in dist
rmSync('./dist', { recursive: true });
mkdirSync('./dist');

console.log('Copy static files...'); // NOSONAR
cpSync('./public', './dist', { recursive: true, preserveTimestamps: true });

console.log('Updating version number...'); // NOSONAR
generateConstVersion('./package.json', 'src/settings/version.js');

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
