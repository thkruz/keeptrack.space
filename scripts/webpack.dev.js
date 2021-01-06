/* eslint-disable */
var webpack = require('webpack');

let config = {
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
  optimization: {
    minimize: false,
  },
  ignoreWarnings: [/asset size limit/, /combined asset size exceeds the recommended limit/],
  stats: 'minimal',
};

var jsConfig = Object.assign({}, config, {
  name: 'jsConfig',
  devtool: 'source-map',
  mode: 'development',
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
  },
});

// Return Array of Configurations
module.exports = [jsConfig];
