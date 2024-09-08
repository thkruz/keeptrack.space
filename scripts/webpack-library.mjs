import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
const __filename = fileURLToPath(import.meta.url);
const __dirname = `${path.dirname(__filename)}/../`;

export const webpackLibraryConfig = {
  mode: 'production',
  entry: {
    index: './src/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: '[name].js',
    library: {
      type: 'module',
    },
    clean: true,
    publicPath: 'auto',
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
    fallback: {
      worker: false,
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
        test: /\.(?:woff2?|eot|ttf|otf)$/iu,
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
          options: {
            filename: '[name].worker.js',
            publicPath: '/',
          },
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
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
    new BundleAnalyzerPlugin(),
    new webpack.DefinePlugin({
      'self.__webpack_public_path__': 'window.location.origin + "/"',
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
