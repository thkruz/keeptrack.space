import { cpSync, rmSync } from 'fs';
import webpack from 'webpack';
import { generateConfig } from './webpack.mjs';

console.clear();
console.log('Copy static files...'); // NOSONAR

console.log('Removing old files...'); // NOSONAR
rmSync('./embed', { recursive: true });

for (const dir of ['audio', 'css', 'img', 'meshes', 'textures', 'tle']) {
  cpSync(`./public/${dir}`, `./embed/keepTrack/${dir}`, { recursive: true });
}
cpSync('./public/settings/settingsOverrideEmbed.js', './embed/keepTrack/settings/settingsOverride.js');
cpSync('./public/example.html', './embed/index.html');

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
