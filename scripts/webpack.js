/* eslint-disable */
var webpack = require('webpack');
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
  plugins: [
    new webpack.ProvidePlugin({
      '$': 'jquery',
      'jQuery': 'jquery',
      'windows.jQuery': 'jquery',
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
  entry: {
    main: ['./src/js/main.js'],
    positionCruncher: ['./src/js/webworker/positionCruncher.js'],
    orbitCruncher: ['./src/js/webworker/orbitCruncher.js'],
    // 'checker-script': ['./src/js/checker-script.js'],
  },
  resolve: {
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

let jsConfig2 = Object.assign({}, config, {
  name: 'Libraries',
  entry: {
    'analysis-tools': ['./src/analysis/js/analysis-tools.js'],
  },
  resolve: {
    alias: {
      '@app': __dirname + '/../src',
    },
  },
  output: {
    filename: '[name].js',
    path: __dirname + '/../dist/analysis/js/',
    publicPath: './js/',
  },
});

// Return Array of Configurations
module.exports = [jsConfig, jsConfig2];
