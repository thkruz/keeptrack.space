/* eslint-disable */
var webpack = require('webpack');
var path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
var glob = require('glob');

const MAKE_MODE = process.env.NODE_ENV == 'test' || process.env.NODE_ENV == 'development' ? 'development' : 'production';

let config = {
  mode: MAKE_MODE,
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
      { test: /\.tsx?$/, loader: 'ts-loader' },
      {
        test: /\.worker\.js$/i,
        use: { loader: 'worker-loader' },
      },
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
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
  ],
  ignoreWarnings: [/asset size limit/, /combined asset size exceeds the recommended limit/],
  stats: 'minimal',
};

if (MAKE_MODE == 'development') {
  Object.assign(config, {
    // devtool: 'inline-source-map',
    devtool: 'source-map',
    optimization: {
      minimize: false,
    },
  });
}

if (MAKE_MODE == 'production') {
  Object.assign(config, {
    optimization: {
      minimize: true,
    },
  });
}

let jsConfig = Object.assign({}, config, {
  name: 'MainFiles',
  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: ['.ts', '.js'],
    alias: {
      '@app': path.resolve(__dirname + '/../src'),
    },
  },
  entry: {
    main: ['./src/js/main.js'],
  },
  output: {
    filename: '[name].[contenthash].js',
    path: __dirname + '/../dist/js',
    publicPath: './js/',
  },
});

let jsConfig2 = Object.assign({}, config, {
  name: 'WebWorkers',
  entry: {
    positionCruncher: ['./src/js/webworker/positionCruncher.js'],
    orbitCruncher: ['./src/js/webworker/orbitCruncher.js'],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@app': __dirname + '/../src',
    },
  },
  output: {
    filename: '[name].js',
    path: __dirname + '/../dist/js',
    publicPath: './js/',
  },
});

let jsConfig3 = Object.assign({}, config, {
  name: 'Libraries',
  entry: {
    'analysis-tools': ['./src/analysis/js/analysis-tools.js'],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@app': __dirname + '/../src',
    },
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

// Return Array of Configurations
module.exports = [jsConfig, jsConfig2, jsConfig3];
