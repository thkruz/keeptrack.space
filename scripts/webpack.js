/* eslint-disable */
const CleanTerminalPlugin = require('clean-terminal-webpack-plugin');
const glob = require('glob');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const WebpackBar = require('webpackbar');

const isAddLoadingBar = true;

let baseConfig;
let MAKE_MODE;
const exportArray = [];

switch (process.env.NODE_ENV) {
  case 'test':
  case 'development':
    MAKE_MODE = 'development';
    break;
  case 'embed':
    MAKE_MODE = 'embed';
    break;
  default:
    MAKE_MODE = 'production';
    break;
}

if (MAKE_MODE !== 'embed') {
  baseConfig = {
    mode: MAKE_MODE,
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@app': __dirname + '/../src',
      },
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          include: [/src/],
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          include: [/src/],
          type: 'asset/resource',
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          include: [/src/],
          type: 'asset/resource',
        },
        // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          include: [/src/],
          exclude: [/node_modules/, /\dist/, /\coverage/, /\.test\.tsx?$/],
          options: {
            transpileOnly: false,
          },
        },
        {
          test: /\.worker\.js$/i,
          include: [/src/],
          use: { loader: 'worker-loader' },
        },
        {
          test: /\.m?js$/,
          include: [/src/],
          exclude: [/(node_modules|bower_components)/, /\dist/, /\coverage/, /\settingsManager\.js/i, /\.test\.jsx?$/],
          use: {
            loader: 'babel-loader',
          },
        },
      ],
    },
    experiments: {
      topLevelAwait: true,
    },
    plugins: [
      new webpack.ProvidePlugin({
        '$': 'jquery',
        'jQuery': 'jquery',
        'windows.jQuery': 'jquery',
      }),
      new HtmlWebpackPlugin({
        filename: '../index.htm',
        template: './src/index.htm',
      }),
      new CleanTerminalPlugin({
        beforeCompile: true,
      }),
    ],
    ignoreWarnings: [/asset size limit/, /combined asset size exceeds the recommended limit/],
    stats: 'errors-warnings',
  };
} else {
  // this is for embedding the app in a web page
  baseConfig = {
    mode: 'production',
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@app': __dirname + '/../src',
      },
    },
    module: {
      rules: [
        { test: /\.css$/, loader: 'ignore-loader' },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
        },
        {
          test: /\.worker\.js$/i,
          use: { loader: 'worker-loader' },
        },
        {
          test: /\.m?js$/,
          exclude: [/(node_modules|bower_components)/, /\cypress/, /\settingsManager\.js/i],
          use: {
            loader: 'babel-loader',
          },
        },
      ],
    },
    experiments: {
      topLevelAwait: true,
    },
    plugins: [
      new webpack.ProvidePlugin({
        '$': 'jquery',
        'jQuery': 'jquery',
        'windows.jQuery': 'jquery',
      }),
      new HtmlWebpackPlugin({
        filename: '../../example.htm',
        template: './src/embed.htm',
      }),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
    ],
    ignoreWarnings: [/asset size limit/, /combined asset size exceeds the recommended limit/],
    stats: 'minimal',
  };
}

if (isAddLoadingBar) {
  baseConfig.plugins.push(
    new WebpackBar({
      fancy: true,
      profile: true,
    })
  );
}

// Add source map if in these modes
if (MAKE_MODE === 'development' || MAKE_MODE === 'test' || MAKE_MODE === 'embed2') {
  baseConfig = {
    ...baseConfig,
    ...{
      // devtool: 'inline-source-map',
      devtool: 'source-map',
      optimization: {
        minimize: false,
      },
    },
  };
}

// Minimize if in these modes
if (MAKE_MODE === 'production' || MAKE_MODE === 'embed') {
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
if (MAKE_MODE !== 'embed') {
  const jsConfig = {
    ...baseConfig,
    ...{
      name: 'MainFiles',
      entry: {
        main: ['./src/js/main.ts'],
      },
      output: {
        filename: '[name].[contenthash].js',
        path: __dirname + '/../dist/js',
        publicPath: './js/',
      },
    },
  };

  const jsConfig2 = {
    ...baseConfig,
    ...{
      name: 'WebWorkers',
      entry: {
        positionCruncher: ['./src/js/webworker/positionCruncher.ts'],
        orbitCruncher: ['./src/js/webworker/orbitCruncher.js'],
      },
      output: {
        filename: '[name].js',
        path: __dirname + '/../dist/js',
        publicPath: './js/',
      },
    },
  };

  const jsConfig3 = {
    ...baseConfig,
    ...{
      name: 'Libraries',
      entry: {
        'analysis-tools': ['./src/analysis/js/analysis-tools.js'],
      },
      plugins: [
        new webpack.ProvidePlugin({
          '$': 'jquery',
          'jQuery': 'jquery',
          'windows.jQuery': 'jquery',
        }),
        new HtmlWebpackPlugin({
          filename: '../index.htm',
          template: './src/analysis/index.htm',
        }),
      ],
      output: {
        filename: '[name].js',
        path: __dirname + '/../dist/analysis/js/',
        publicPath: './js/',
      },
    },
  };

  exportArray.push(jsConfig);
  exportArray.push(jsConfig2);
  exportArray.push(jsConfig3);
} else {
  const jsConfig = {
    ...baseConfig,
    ...{
      name: 'MainFiles',
      entry: {
        keepTrack: ['./src/js/embed.js'],
      },
      output: {
        filename: '[name].js',
        path: __dirname + '/../embed/keepTrack/js',
        publicPath: './keepTrack/js/',
      },
    },
  };

  const jsConfig2 = {
    ...baseConfig,
    ...{
      name: 'WebWorkers',
      entry: {
        positionCruncher: ['./src/js/webworker/positionCruncher.ts'],
        orbitCruncher: ['./src/js/webworker/orbitCruncher.js'],
      },
      output: {
        filename: '[name].js',
        path: __dirname + '/../embed/keepTrack/js',
        publicPath: './keepTrack/js/',
      },
    },
  };

  exportArray.push(jsConfig);
  exportArray.push(jsConfig2);
}

// Return Array of Configurations
module.exports = exportArray;
