/* eslint-disable */
var webpack = require("webpack");

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
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
      'windows.jQuery': 'jquery'
    })
  ],
  optimization: {
    minimize: true,
  },
  ignoreWarnings: [
    /asset size limit/,
    /combined asset size exceeds the recommended limit/,
  ],
  stats: 'minimal',
};

var jsConfig = Object.assign({}, config,{
  name: "jsConfig",
  entry: {
    'main': [
      './src/js/main.js',
    ],
    'positionCruncher': [
      './src/js/positionCruncher.js',
    ],
    'orbitCruncher': [
      './src/js/orbitCruncher.js',
    ],
    'checker-script': [
      './src/js/checker-script.js',
    ],
  },
  resolve: {
    alias: {
      '@app': __dirname + '/../src'
    }
  },
  output: {
    filename: '[name].js',
    path: __dirname + '/../dist/js'
  ,}
});

// Return Array of Configurations
module.exports = [
  jsConfig,       
];