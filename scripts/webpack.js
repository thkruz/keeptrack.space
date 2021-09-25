/* eslint-disable */
const webpack = require('webpack');
const WebpackBar = require('webpackbar');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const glob = require('glob');

let config;
let MAKE_MODE;

console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

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

console.log(`MAKE_MODE: ${MAKE_MODE}`);

if (MAKE_MODE !== 'embed') {
  config = {
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
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
        },
        // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
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
        filename: '../index.htm',
        template: './src/index.htm',
      }),
      new WebpackBar({
        fancy: true,
        profile: true,
      }),
    ],
    ignoreWarnings: [/asset size limit/, /combined asset size exceeds the recommended limit/],
    stats: 'minimal',
  };
} else {
  // this is for embedding the app in a web page
  config = {
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
      new WebpackBar({
        fancy: true,
        profile: true,
      }),
    ],
    ignoreWarnings: [/asset size limit/, /combined asset size exceeds the recommended limit/],
    stats: 'minimal',
  };
}

if (MAKE_MODE === 'development' || MAKE_MODE === 'test' || MAKE_MODE === 'embed2') {
  Object.assign(config, {
    // devtool: 'inline-source-map',
    devtool: 'source-map',
    optimization: {
      minimize: false,
    },
  });
}

if (MAKE_MODE === 'production' || MAKE_MODE === 'embed') {
  Object.assign(config, {
    optimization: {
      minimize: true,
    },
  });
}

const exportArray = [];
if (MAKE_MODE !== 'embed') {
  const jsConfig = Object.assign({}, config, {
    name: 'MainFiles',
    entry: {
      main: ['./src/js/main.js'],
    },
    output: {
      filename: '[name].[contenthash].js',
      path: __dirname + '/../dist/js',
      publicPath: './js/',
    },
  });
  exportArray.push(jsConfig);

  const jsConfig2 = Object.assign({}, config, {
    name: 'WebWorkers',
    entry: {
      positionCruncher: ['./src/js/webworker/positionCruncher.js'],
      orbitCruncher: ['./src/js/webworker/orbitCruncher.js'],
    },
    output: {
      filename: '[name].js',
      path: __dirname + '/../dist/js',
      publicPath: './js/',
    },
  });
  exportArray.push(jsConfig2);

  const jsConfig3 = Object.assign({}, config, {
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
  });
  exportArray.push(jsConfig3);

  // Return Array of Configurations
  module.exports = [jsConfig, jsConfig2, jsConfig3];
} else {
  const jsConfig = Object.assign({}, config, {
    name: 'MainFiles',
    entry: {
      keepTrack: ['./src/js/embed.js'],
    },
    output: {
      filename: '[name].js',
      path: __dirname + '/../embed/keepTrack/js',
      publicPath: './keepTrack/js/',
    },
  });
  exportArray.push(jsConfig);

  const jsConfig2 = Object.assign({}, config, {
    name: 'WebWorkers',
    entry: {
      positionCruncher: ['./src/js/webworker/positionCruncher.js'],
      orbitCruncher: ['./src/js/webworker/orbitCruncher.js'],
    },
    output: {
      filename: '[name].js',
      path: __dirname + '/../embed/keepTrack/js',
      publicPath: './keepTrack/js/',
    },
  });
  exportArray.push(jsConfig2);
}

// Return Array of Configurations
module.exports = exportArray;
