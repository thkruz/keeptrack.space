/* eslint-disable no-process-env */
import CleanTerminalPlugin from 'clean-terminal-webpack-plugin';
import { readdirSync } from 'fs';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import WebpackBar from 'webpackbar';

/**
 *
 * @param {'development' | 'production'} env
 * @param {*} isWatch
 * @returns {webpack.Configuration}
 */
export const generateConfig = (env, isWatch) => {
  const fileName = fileURLToPath(import.meta.url);
  const dirName = dirname(fileName);

  /**
   * Configuration options for Webpack.
   * @type {webpack.Configuration[]}
   */
  const webpackConfig = [];

  env ??= 'production';

  let baseConfig = getBaseConfig(dirName);

  switch (env) {
    case 'development':
    case 'production':
    default:
      baseConfig = getNonEmbedConfig(baseConfig, env);
  }

  if (isWatch) {
    baseConfig.watch = true;
    baseConfig.watchOptions = {
      aggregateTimeout: 300,
      poll: 1000,
      ignored: /node_modules/u,
    };
  }

  // Add source map if in these modes
  if (env === 'development') {
    baseConfig = {
      ...baseConfig,
      ...{
        cache: true,
        devtool: 'source-map',
        // devtool: 'eval-source-map',
        optimization: {
          minimize: false,
        },
      },
    };
  }

  // Minimize if in these modes
  if (env === 'production') {
    baseConfig = {
      ...baseConfig,
      ...{
        optimization: {
          minimize: true,
        },
      },
    };
  }

  // split entry points main, webworkers, and possibly analysis tools
  const mainConfig = getMainConfig(baseConfig, dirName, 'dist');

  webpackConfig.push(mainConfig);

  const exampleConfig = getMainConfig(baseConfig, dirName, 'dist', '../../');

  exampleConfig.plugins = [
    new CleanTerminalPlugin({
      beforeCompile: true,
    }),
  ];
  const examples = readdirSync('./public/examples', { withFileTypes: true });

  examples.forEach((example) => {
    if (!example.isDirectory()) {
      exampleConfig.plugins.push(
        new HtmlWebpackPlugin({
          filename: `../examples/${example.name}`,
          template: `./public/examples/${example.name}`,
        }),
      );
    }
  });
  webpackConfig.push(exampleConfig);

  const webWorkerConfig = getWebWorkerConfig(baseConfig, dirName, 'dist', '');

  webpackConfig.push(webWorkerConfig);

  // Modify the resolve configuration to handle web worker imports
  baseConfig.resolve.fallback = {
    ...baseConfig.resolve.fallback,
    worker: false,
  };

  return webpackConfig;
};

/**
 * Returns the base configuration for webpack.
 * @param {string} dirName - The directory name.
 * @returns {webpack.Configuration} - The base configuration object.
 */
const getBaseConfig = (dirName) => ({
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@app': `${dirName}/../src`,
      '@public': `${dirName}/../public`,
      '@css': `${dirName}/../public/css`,
    },
  },
  module: {
    rules: [
      {
        test: /\.(?:png|svg|jpg|jpeg|gif)$/iu,
        include: [/src/u, /public/u],
        type: 'asset/resource',
        generator: {
          filename: '../img/[name][ext]',
        },
      },
      {
        test: /\.(?:mp3|wav|flac)$/iu,
        include: [/src/u, /public/u],
        type: 'asset/resource',
        generator: {
          filename: '../audio/[name][ext]',
        },
      },
      {
        test: /\.(?:woff2|woff|ttf|eot)$/iu,
        include: [/src/u, /public/u],
        type: 'asset/resource',
        generator: {
          filename: '../fonts/[name][ext]',
        },
      },
      {
        test: /\.css$/iu,
        include: [/node_modules/u, /src/u, /public/u],
        use: ['style-loader', 'css-loader'],
        generator: {
          filename: './css/[name][ext]',
        },
      },
      {
        test: /\.worker\.(?:js|ts)$/iu,
        use: {
          loader: 'worker-loader',
        },
      },
      {
        test: /\.tsx?$/u,
        loader: 'ts-loader',
        exclude: [/node_modules/u, /\dist/u, /\coverage/u, /\.test\.tsx?$/u, /\src\/admin/u],
        options: {
          transpileOnly: false,
          configFile: 'tsconfig.build.json',
        },
      },
      {
        test: /\.m?js$/u,
        include: [/src/u, /node_modules/u],
        resolve: {
          fullySpecified: false,
        },
        // exclude: [/(?:node_modules|bower_components)/u, /\dist/u, /\coverage/u, /\settings\.js/iu, /\.test\.jsx?$/u],
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.m?js$/u,
        enforce: 'pre',
        use: ['source-map-loader'],
      },
    ],
  },
  ignoreWarnings: [/asset size limit/u, /combined asset size exceeds the recommended limit/u],
  stats: 'errors-warnings',
  plugins: [
    new WebpackBar({
      fancy: true,
      profile: true,
    }),
  ],
});

/**
 * Returns a modified webpack configuration object for non-embed mode.
 * @param {webpack.Configuration} baseConfig - The base webpack configuration object.
 * @param {string} env - The environment mode.
 * @returns {webpack.Configuration} - The modified webpack configuration object.
 */
const getNonEmbedConfig = (baseConfig, env) => {
  baseConfig.mode = env;
  baseConfig.experiments = {
    topLevelAwait: true,
  };
  baseConfig.plugins.push(
    new CleanTerminalPlugin({
      beforeCompile: true,
    }),
    new HtmlWebpackPlugin({
      filename: '../index.html',
      template: './public/index.html',
    }),
  );
  baseConfig.module.rules.push({
    test: /\.(?:woff|woff2|eot|ttf|otf)$/iu,
    include: [/src/u],
    type: 'asset/resource',
  });

  return baseConfig;
};

/**
 * Returns the main configuration object for webpack.
 *
 * @param {webpack.Configuration} baseConfig - The base configuration object.
 * @param {string} dirName - The directory name.
 * @param {string} subFolder - The subfolder name.
 * @param {string} [pubPath=''] - The public path.
 * @returns {webpack.Configuration} - The main configuration object.
 */
const getMainConfig = (baseConfig, dirName, subFolder, pubPath = '') => ({
  ...baseConfig,
  ...{
    name: 'MainFiles',
    entry: {
      main: ['./src/main.ts'],
    },
    output: {
      // Add hash to the end of the file name if not embeded
      filename: `[name]${subFolder === 'dist' ? '.[contenthash]' : ''}.js`,
      path: `${dirName}/../${subFolder}/js`,
      publicPath: `./${pubPath}js/`,
    },
  },
});

/**
 * Returns the WebWorker configuration object.
 *
 * @param {webpack.Configuration} baseConfig - The base configuration object.
 * @param {string} dirName - The directory name.
 * @param {string} subFolder - The subfolder name.
 * @param {string} pubPath - The public path.
 * @returns {webpack.Configuration} - The WebWorker configuration object.
 */
const getWebWorkerConfig = (baseConfig, dirName, subFolder, pubPath) => ({
  ...baseConfig,
  ...{
    name: 'WebWorkers',
    entry: {
      positionCruncher: ['./src/webworker/positionCruncher.ts'],
      orbitCruncher: ['./src/webworker/orbitCruncher.ts'],
    },
    output: {
      filename: '[name].js',
      path: `${dirName}/../${subFolder}/js`,
      publicPath: `./${pubPath}js/`,
    },
  },
});

export default () => generateConfig('development', false);
