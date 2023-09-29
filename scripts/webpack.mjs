/* eslint-disable no-process-env */
import CleanTerminalPlugin from 'clean-terminal-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import WebpackBar from 'webpackbar';

export const generateConfig = (env, isWatch) => {
  const fileName = fileURLToPath(import.meta.url);
  const dirName = dirname(fileName);

  const webpackConfig = [];
  env = env === 'test' ? 'development' : env;
  env = typeof env === 'undefined' ? 'production' : env;

  let baseConfig = getBaseConfig(dirName);

  switch (env) {
    case 'embed':
    case 'embedDev':
    case 'lib':
      // this is for embedding the app in a web page
      baseConfig = getEmbedConfig(baseConfig);
      break;
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
  if (env === 'development' || env === 'test' || env === 'embedDev' || env === 'lib') {
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
  if (env === 'production' || env === 'embed') {
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
  if (env === 'lib') {
    const mainConfig = getLibConfig(baseConfig, dirName, 'lib/keepTrack', 'keepTrack/');
    const webWorkerConfig = getWebWorkerConfig(baseConfig, dirName, 'lib/keepTrack/', 'keepTrack/');

    webpackConfig.push(mainConfig);
    webpackConfig.push(webWorkerConfig);
  } else if (env !== 'embed' && env !== 'embedDev') {
    const mainConfig = getMainConfig(baseConfig, dirName, 'dist');
    const webWorkerConfig = getWebWorkerConfig(baseConfig, dirName, 'dist', '');
    const analysisConfig = getAnalysisConfig(baseConfig, dirName);

    webpackConfig.push(mainConfig);
    webpackConfig.push(webWorkerConfig);
    webpackConfig.push(analysisConfig);
  } else {
    const mainConfig = getMainConfig(baseConfig, dirName, 'embed/keepTrack', 'keepTrack/');
    const webWorkerConfig = getWebWorkerConfig(baseConfig, dirName, 'embed/keepTrack/', 'keepTrack/');

    webpackConfig.push(mainConfig);
    webpackConfig.push(webWorkerConfig);
  }

  return webpackConfig;
};

const getBaseConfig = (dirName) => ({
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@app': `${dirName}/../src`,
      '@css': `${dirName}/../src/css`,
    },
  },
  module: {
    rules: [
      {
        // eslint-disable-next-line prefer-named-capture-group
        test: /\.(png|svg|jpg|jpeg|gif)$/iu,
        include: [/src/u],
        type: 'asset/resource',
        generator: {
          filename: '../img/[name][ext]',
        },
      },
      {
        // eslint-disable-next-line prefer-named-capture-group
        test: /\.(mp3)$/iu,
        include: [/src/u],
        type: 'asset/resource',
        generator: {
          filename: '../audio/[name][ext]',
        },
      },
      {
        // eslint-disable-next-line prefer-named-capture-group
        test: /\.(woff2|woff|ttf|eot)$/iu,
        include: [/src/u],
        type: 'asset/resource',
        generator: {
          filename: '../fonts/[name][ext]',
        },
      },
      {
        test: /\.css$/iu,
        include: [/src/u],
        use: ['style-loader', 'css-loader'],
        generator: {
          filename: './css/[name][ext]',
        },
      },
      {
        test: /\.worker\.js$/iu,
        include: [/src/u],
        use: { loader: 'worker-loader' },
      },
      {
        test: /\.tsx?$/u,
        loader: 'ts-loader',
        exclude: [/node_modules/u, /\dist/u, /\coverage/u, /\.test\.tsx?$/u, /\src\/admin/u],
        options: {
          transpileOnly: false,
          configFile: "tsconfig.build.json"
        },
      },
      {
        test: /\.m?js$/u,
        include: [/src/u],
        // eslint-disable-next-line prefer-named-capture-group
        exclude: [/(node_modules|bower_components)/u, /\dist/u, /\coverage/u, /\settings\.js/iu, /\.test\.jsx?$/u],
        use: {
          loader: 'babel-loader',
        },
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

const getNonEmbedConfig = (baseConfig, env) => {
  baseConfig.mode = env;
  baseConfig.experiments = {
    topLevelAwait: true,
  };
  baseConfig.plugins.push(
    new webpack.ProvidePlugin({
      '$': 'jquery',
      'jQuery': 'jquery',
      'windows.jQuery': 'jquery',
    }),
    new HtmlWebpackPlugin({
      filename: '../index.html',
      template: './src/index.html',
    }),
    new CleanTerminalPlugin({
      beforeCompile: true,
    })
  );
  baseConfig.module.rules.push({
    // eslint-disable-next-line prefer-named-capture-group
    test: /\.(woff|woff2|eot|ttf|otf)$/iu,
    include: [/src/u],
    type: 'asset/resource',
  });
  return baseConfig;
};

const getEmbedConfig = (baseConfig) => {
  const embedOnly = {
    mode: 'production',
    experiments: {
      topLevelAwait: true,
    },
  };

  baseConfig = {
    ...baseConfig,
    ...embedOnly,
  };

  baseConfig.plugins.push(
    new webpack.ProvidePlugin({
      '$': 'jquery',
      'jQuery': 'jquery',
      'windows.jQuery': 'jquery',
    }),
    new HtmlWebpackPlugin({
      filename: '../../example.html',
      template: './src/embed.html',
    }),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    })
  );
  return baseConfig;
};

const getMainConfig = (baseConfig, dirName, subFolder, pubPath = '') => ({
  ...baseConfig,
  ...{
    name: 'MainFiles',
    entry: {
      main: ['./src/js/main.ts'],
    },
    output: {
      // Add hash to the end of the file name if not embeded
      filename: `[name]${subFolder === 'dist' ? '.[contenthash]' : ''}.js`,
      path: `${dirName}/../${subFolder}/js`,
      publicPath: `./${pubPath}js/`,
    },
  },
});

const getLibConfig = (baseConfig, dirName, subFolder, pubPath = '') => ({
  ...baseConfig,
  ...{
    name: 'KeepTrackLibrary',
    entry: {
      start: ['./src/js/start.ts'],
    },
    output: {
      filename: `[name].js`,
      path: `${dirName}/../${subFolder}/js`,
      library: {
        name: 'KeepTrackCode',
        type: 'window',
        export: ['startKeepTrack'],
      },
    },
  },
});

const getWebWorkerConfig = (baseConfig, dirName, subFolder, pubPath) => ({
  ...baseConfig,
  ...{
    name: 'WebWorkers',
    entry: {
      positionCruncher: ['./src/js/webworker/positionCruncher.ts'],
      orbitCruncher: ['./src/js/webworker/orbitCruncher.ts'],
    },
    output: {
      filename: '[name].js',
      path: `${dirName}/../${subFolder}/js`,
      publicPath: `./${pubPath}js/`,
    },
  },
});

const getAnalysisConfig = (baseConfig, dirName) => ({
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
        filename: '../index.html',
        template: './src/analysis/index.html',
      }),
    ],
    output: {
      filename: '[name].js',
      path: dirName + '/../dist/analysis/js/',
      publicPath: './js/',
    },
  },
});
