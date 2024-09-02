import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
const __filename = fileURLToPath(import.meta.url);
const __dirname = `${path.dirname(__filename)}/../`;

export const webpackLibraryConfig = {
  mode: 'production',
  entry: './src/index.ts', // Adjust this to your library's entry point
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'index.js',
    library: {
      type: 'module',
    },
    clean: true,
  },
  externals: {
    /*
     * List external dependencies here
     * 'lodash': 'lodash',
     */
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@app': `${__dirname}/src`,
      '@public': `${__dirname}/public`,
      '@css': `${__dirname}/public/css`,
    },
  },
  module: {
    rules: [
      {
        test: /\.(?:png|svg|jpg|jpeg|gif)$/iu,
        include: [/src/u, /public/u],
        type: 'asset/inline',
      },
      {
        test: /\.(?:mp3|wav|flac)$/iu,
        include: [/src/u, /public/u],
        type: 'asset/inline',
      },
      {
        test: /\.(?:woff2|woff|ttf|eot)$/iu,
        include: [/src/u, /public/u],
        type: 'asset/inline',
      },
      {
        test: /\.css$/iu,
        include: [/node_modules/u, /src/u, /public/u],
        use: ['style-loader', 'css-loader'],
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
        include: [/src/u, /public/u],
        exclude: /node_modules/u,
        options: {
          transpileOnly: false,
          configFile: 'tsconfig.library.json',
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
  experiments: {
    outputModule: true,
  },
  target: 'web',
};
