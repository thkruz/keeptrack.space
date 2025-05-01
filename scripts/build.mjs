/* eslint-disable no-process-env */
import dotenv from 'dotenv';
import { cpSync, mkdirSync, readdirSync, rmSync } from 'fs';
import webpack from 'webpack';
import generateConstVersion from './lib/constVersion.mjs';
import { generateConfig } from './webpack.mjs';

console.clear();

// import .env if cloudflare is not used
let settingsPath;
let favIconPath;
let textLogoPath;

if (process.env?.CF_PAGES) {
  // If cloudflare is used, use the settings path from the environment variable
  console.log('Using cloudflare pages settings');
  console.log('Settings path:', process.env.SETTINGS_PATH);
  settingsPath = process.env.SETTINGS_PATH;
  console.log('Favicon path:', process.env.FAVICON_PATH);
  favIconPath = process.env.FAVICON_PATH;
  console.log('Text logo path:', process.env.TEXT_LOGO_PATH);
  textLogoPath = process.env.TEXT_LOGO_PATH;
} else {
  // Replace /dist/settings/settingsOverride.js with the one in the .env file
  const env = dotenv.config({ path: './.env' });

  console.log('Using local settings');
  console.log('Settings path:', env.parsed.SETTINGS_PATH);
  settingsPath = env.parsed.SETTINGS_PATH;
  console.log('Favicon path:', env.parsed.FAVICON_PATH);
  favIconPath = env.parsed.FAVICON_PATH;
  console.log('Text logo path:', env.parsed.TEXT_LOGO_PATH);
  textLogoPath = env.parsed.TEXT_LOGO_PATH;
}


const myArgs = process.argv.slice(2);
const args = myArgs[0];
const isWatch = !!(typeof myArgs[1] !== 'undefined' && myArgs[1] === '--watch');

// Print current working directory
console.log(`Current working directory: ${process.cwd()}`);

console.log('Removing old files...');
// Remove all files in dist
try {
  rmSync('./dist', { recursive: true });
  mkdirSync('./dist');
} catch {
  // This will fail if the folder doesn't exist
}

console.log('Copy static files...');
// Get a list of all files (not folders) in the public folder
const files = readdirSync('./public', { withFileTypes: true });

files.forEach((file) => {
  if (!file.isDirectory()) {
    cpSync(`./public/${file.name}`, `./dist/${file.name}`);
  }
});

['audio', 'data', 'img', 'meshes', 'res', 'settings', 'simulation', 'textures', 'tle'].forEach((dir) => {
  cpSync(`public/${dir}`, `dist/${dir}`, { recursive: true, preserveTimestamps: true });
});

if (textLogoPath) {
  console.log(`Replacing dist/img/logo.png with ${textLogoPath}`);
  cpSync(textLogoPath, './dist/img/logo.png', { force: true });
}

if (favIconPath) {
  console.log(`Replacing dist/img/favicons/favicon.ico with ${favIconPath}`);
  cpSync(favIconPath, './dist/img/favicons/favicon.ico', { force: true });
}

if (settingsPath) {
  console.log(`Replacing dist/settings/settingsOverride.js with ${settingsPath}`);
  cpSync(settingsPath, './dist/settings/settingsOverride.js', { force: true });
}

console.log('Updating version number...');
generateConstVersion('./package.json', 'src/settings/version.js');

const webpackConfig = generateConfig(args, isWatch);

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
