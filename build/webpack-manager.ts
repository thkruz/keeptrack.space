import { Configuration, HtmlRspackPlugin, LightningCssMinimizerRspackPlugin, SwcJsMinimizerRspackPlugin } from '@rspack/core';
import CleanTerminalPlugin from 'clean-terminal-webpack-plugin';
import DotEnv from 'dotenv-webpack';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import WebpackBar from 'webpackbar/rspack';
import { BuildConfig } from './lib/config-manager';
export class WebpackManager {
  static readonly DEFAULT_MODE = 'development';
  static readonly DEFAULT_WATCH = false;
  private static config: BuildConfig;

  static createConfig(config: BuildConfig, isWatch: boolean = false): Configuration[] {
    this.config = config;
    const fileName = fileURLToPath(import.meta.url);
    const dirName = dirname(fileName);
    const webpackConfig = [] as Configuration[];
    let baseConfig = this.createBaseConfig_(dirName);
    const mode: 'development' | 'production' | 'none' = config.mode ?? 'development';

    switch (mode) {
      case 'development':
      case 'production':
      default:
        baseConfig = this.createNonEmbedConfig_(baseConfig, mode);
    }

    if (isWatch) {
      baseConfig.watch = true;
      baseConfig.watchOptions = {
        aggregateTimeout: 300,
        poll: 1000,
        // ignore node_modules and test
        ignored: /node_modules|test/u,
      };
    }

    // Add source map if in these modes
    if (mode === 'development') {
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
    if (mode === 'production') {
      baseConfig = {
        ...baseConfig,
        ...{
          optimization: {
            minimizer: [
              new SwcJsMinimizerRspackPlugin({
                // JS minimizer configuration
              }),
              new LightningCssMinimizerRspackPlugin({
                // CSS minimizer configuration
              }),
            ],
          },
        },
      };
    }

    // split entry points of main and webworkers
    const mainConfig = this.createMainConfig_(baseConfig, dirName, 'dist');
    const webWorkerConfig = this.createWorkerConfig_(baseConfig, dirName, 'dist', '');

    webpackConfig.push(mainConfig);
    webpackConfig.push(webWorkerConfig);

    if (this.config.isPro) {
      const authConfig = this.createAuthConfig_(baseConfig, dirName, 'dist', 'auth/');

      webpackConfig.push(authConfig);
    }

    // Modify the resolve configuration to handle web worker imports
    baseConfig.resolve!.fallback = {
      ...baseConfig.resolve!.fallback,
      worker: false,
    };

    return webpackConfig;
  }

  /**
   * Returns the base configuration for webpack.
   */
  private static createBaseConfig_(dirName: string): Configuration {
    console.log(`styleCssPath: ${this.config.styleCssPath}`);
    console.log(`loadingScreenCssPath: ${this.config.loadingScreenCssPath}`);

    return {
      resolve: {
        extensions: ['.ts', '.js'],
        alias: {
          '@app': `${dirName}/../src`,
          '@engine': `${dirName}/../src/engine`,
          '@ootk': `${dirName}/../src/engine/ootk`,
          '@public': `${dirName}/../public`,
          '@css/style.css': `${dirName}/../${this.config.styleCssPath}`,
          '@css/loading-screen.css': `${dirName}/../${this.config.loadingScreenCssPath}`,
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
            exclude: [/node_modules/u, /\test/u, /\dist/u, /\coverage/u, /\.test\.tsx?$/u, /\src\/admin/u],
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
      plugins: [],
    };
  }

  /**
   * Returns a modified webpack configuration object for non-embed mode.
   */
  private static createNonEmbedConfig_(baseConfig: Configuration, mode: 'none' | 'development' | 'production'): Configuration {
    baseConfig.mode = mode;
    baseConfig.experiments = {
      topLevelAwait: true,
    };
    baseConfig.plugins!.push(
      new CleanTerminalPlugin({
        beforeCompile: true,
      }),
      /*
       * new CopyRspackPlugin({
       *   patterns: [{ from: 'public', to: '..' }],
       * }),
       */
    );
    baseConfig.module!.rules!.push({
      test: /\.(?:woff|woff2|eot|ttf|otf)$/iu,
      include: [/src/u],
      type: 'asset/resource',
    });

    return baseConfig;
  }

  /**
   * Returns the main configuration object for webpack.
   */
  private static createMainConfig_(baseConfig: Configuration, dirName: string, subFolder: string, pubPath = '') {
    return <Configuration>({
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
        plugins: [
          new CleanTerminalPlugin({
            beforeCompile: true,
          }),
          new HtmlRspackPlugin({
            filename: '../index.html',
            template: './public/index.html',
          }),
          new DotEnv({
            systemvars: true,
            path: '../.env',
            allowEmptyValues: true,
          }),
          new WebpackBar({
            name: 'KeepTrack Main Code',
            color: '#66b242',
            basic: false,
            fancy: true,
            profile: false,
          }),
        ],
      },
    });
  }

  /**
   * Returns the auth configuration object for webpack.
   */
  private static createAuthConfig_(baseConfig: Configuration, dirName: string, subFolder: string, pubPath = '') {
    return <Configuration>({
      ...baseConfig,
      ...{
        name: 'AuthFiles',
        entry: {
          'popup-callback': ['./src/plugins-pro/user-account/popup-callback.ts'],
        },
        output: {
          // Add hash to the end of the file name if not embeded
          filename: `[name]${subFolder === 'dist' ? '.[contenthash]' : ''}.js`,
          path: `${dirName}/../${subFolder}/auth`,
          publicPath: `../${pubPath}`,
        },
        plugins: [
          new HtmlRspackPlugin({
            filename: '../auth/callback.html',
            template: './src/plugins-pro/user-account/callback.html',
          }),
          new DotEnv({
            systemvars: true,
            path: '../.env',
            allowEmptyValues: true,
          }),
          new WebpackBar({
            name: 'KeepTrack Auth',
            color: '#66b242',
            basic: false,
            fancy: true,
            profile: false,
          }),
        ],
      },
    });
  }

  /**
   * Returns the WebWorker configuration object.
   */
  private static createWorkerConfig_(baseConfig: Configuration, dirName: string, subFolder: string, pubPath: string) {
    return ({
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
        plugins: [
          new WebpackBar({
            name: 'KeepTrack Workers',
            color: '#66b242',
            basic: false,
            fancy: true,
            profile: false,
          }),
        ],
      },
    });
  }
}
