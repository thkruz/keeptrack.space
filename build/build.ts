/* eslint-disable no-process-env */
import { MultiRspackOptions, rspack } from '@rspack/core';
import dotenv from 'dotenv';
import { cpSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { enablepro } from './build-pro';
import generateConstVersion from './lib/constVersion';
import { WebpackManager } from './webpack';

console.clear();

// import .env if available
const env = dotenv.config({ path: './.env' });

// Load environment variables. Cloudflare takes precedence over .env
const settingsPath = process.env.SETTINGS_PATH ?? env.parsed?.SETTINGS_PATH ?? 'public/settings/settingsOverride.js';
const favIconPath = process.env.FAVICON_PATH ?? env.parsed?.FAVICON_PATH ?? 'public/img/favicons/favicon.ico';
const textLogoPath = process.env.TEXT_LOGO_PATH ?? env.parsed?.TEXT_LOGO_PATH ?? 'public/img/logo.png';
const isPro = process.env.IS_PRO === 'true' || env.parsed?.IS_PRO === 'true';

console.log('Using local settings');
console.log('Settings path:', settingsPath);
console.log('Favicon path:', favIconPath);
console.log('Text logo path:', textLogoPath);
console.log('Is pro:', isPro);

// Setup any pro plugins
enablepro(isPro);

const myArgs = process.argv.slice(2);
const mode = myArgs[0];

if (mode !== 'none' && mode !== 'development' && mode !== 'production') {
  throw new Error('Invalid argument. Use "none", "development", or "production".');
}

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

const webpackConfig = WebpackManager.createConfig(mode, isWatch) as MultiRspackOptions;

const compiler = rspack(webpackConfig, (watchErrors, watchStats) => {
  const hasErrors = watchErrors || watchStats?.hasErrors();

  if (hasErrors) {
    console.log(
      watchStats?.toString({
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

if (!compiler) {
  throw new Error('Failed to create compiler');
}

if (isWatch) {
  compiler.watch({}, (watchErrors, watchStats) => {
    const hasErrors = watchErrors || watchStats?.hasErrors();

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
  compiler.run(() => {
    // do nothing
  });
}
