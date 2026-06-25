import { Configuration, DefinePlugin, DefinePluginOptions, HtmlRspackPlugin, LightningCssMinimizerRspackPlugin, ProgressPlugin, SwcJsMinimizerRspackPlugin } from '@rspack/core';
import { execSync } from 'child_process';
import CleanTerminalPlugin from 'clean-terminal-webpack-plugin';
import DotEnv from 'dotenv-webpack';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { BuildConfig } from './lib/config-manager';
export class WebpackManager {
  static readonly DEFAULT_MODE = 'development';
  static readonly DEFAULT_WATCH = false;
  private static config: BuildConfig;
  private static versionDefine_: DefinePluginOptions;

  static createConfig(config: BuildConfig, isWatch: boolean = false): Configuration[] {
    this.config = config;
    const fileName = fileURLToPath(import.meta.url);
    const dirName = dirname(fileName);
    const appVersion = JSON.parse(readFileSync(resolve(dirName, '../package.json'), 'utf-8')).version;

    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

    this.versionDefine_ = new DefinePlugin({
      __VERSION__: JSON.stringify(appVersion),
      __VERSION_DATE__: JSON.stringify(new Date().toISOString()),
      __COMMIT_HASH__: JSON.stringify(commitHash),
      __IS_PRO__: JSON.stringify(this.config.isPro),
      __EDITION__: JSON.stringify(this.config.edition),
    });
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
          devtool: 'hidden-source-map',
          optimization: {
            minimizer: [
              new SwcJsMinimizerRspackPlugin({
                minimizerOptions: {
                  compress: {
                    keep_classnames: true,
                  },
                  mangle: {
                    keep_classnames: true,
                  },
                },
              }),
              new LightningCssMinimizerRspackPlugin({
                // CSS minimizer configuration
              }),
            ],
          },
        },
      };
    }

    // Coverage build: keep production behavior (pro profile, all plugins) but emit
    // readable, source-mapped output so Playwright V8 coverage maps back to TS source.
    // Inline maps travel with the script in the coverage data, avoiding any .map fetch.
    if (process.env.COVERAGE === '1') {
      baseConfig.devtool = 'inline-source-map';
      baseConfig.optimization = { ...baseConfig.optimization, minimize: false };
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
          '@plugins-pro': `${dirName}/../src/plugins-pro`,
          // Specific aliases must come before @public so they match first
          '@public/img/logo.png': `${dirName}/../${this.config.textLogoPath}`,
          '@public/img/logo-primary.png': `${dirName}/../${this.config.primaryLogoPath}`,
          '@public/img/logo-secondary.png': `${dirName}/../${this.config.secondaryLogoPath}`,
          '@public': `${dirName}/../public`,
          // Specific aliases must come before @css so they match first
          '@css/style.css': `${dirName}/../${this.config.styleCssPath}`,
          '@css/loading-screen.css': `${dirName}/../${this.config.loadingScreenCssPath}`,
          '@css': `${dirName}/../public/css`,
          '@wallpapers': `${dirName}/../${this.config.wallpapersPath}`,
        },
      },
      module: {
        rules: [
          {
            test: /\.(?:png|svg|jpg|jpeg|gif)$/iu,
            include: [/src/u, /public/u, /configs/u],
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
            // Bundle plain-text data files inline as strings (e.g. McCants vmag database)
            test: /\.txt$/u,
            include: [/src/u],
            type: 'asset/source',
          },
          {
            test: /\.css$/iu,
            include: [/node_modules/u, /src/u, /public/u, /configs/u],
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
          this.versionDefine_,
          new CleanTerminalPlugin({
            beforeCompile: true,
          }),
          new HtmlRspackPlugin({
            filename: '../index.html',
            template: './public/index.html',
          }),
          new DotEnv({
            systemvars: true,
            path: `./${this.config.envFilePath}`,
            allowEmptyValues: true,
          }),
          new ProgressPlugin({
            prefix: 'KeepTrack Main Code',
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
          this.versionDefine_,
          new HtmlRspackPlugin({
            filename: '../auth/callback.html',
            template: './src/plugins-pro/user-account/callback.html',
          }),
          new DotEnv({
            systemvars: true,
            path: `./${this.config.envFilePath}`,
            allowEmptyValues: true,
          }),
          new ProgressPlugin({
            prefix: 'KeepTrack Auth',
          }),
        ],
      },
    });
  }

  /**
   * Returns the WebWorker configuration object.
   */
  private static createWorkerConfig_(baseConfig: Configuration, dirName: string, subFolder: string, pubPath: string) {
    const entry: Record<string, string[]> = {
      positionCruncher: ['./src/webworker/positionCruncher.ts'],
      orbitCruncher: ['./src/webworker/orbitCruncher.ts'],
      colorCruncher: ['./src/webworker/colorCruncher.ts'],
      debrisScreeningWorker: ['./src/webworker/debrisScreeningWorker.ts'],
      fovPredictionWorker: ['./src/webworker/fovPredictionWorker.ts'],
      bestPassWorker: ['./src/webworker/bestPassWorker.ts'],
      closeObjectsWorker: ['./src/webworker/closeObjectsWorker.ts'],
      proximityOpsWorker: ['./src/webworker/proximityOpsWorker.ts'],
      time2lonWorker: ['./src/webworker/time2lonWorker.ts'],
      azRangeHeatmapWorker: ['./src/webworker/azRangeHeatmapWorker.ts'],
    };

    // Pro-only workers: their source lives in the plugins-pro submodule, so they are
    // only built (and only present) for pro profiles - never bundled into OSS.
    if (this.config.isPro) {
      entry.tipAndCueWorker = ['./src/plugins-pro/tip-and-cue/tipAndCueWorker.ts'];
      entry.eclipseWorker = ['./src/plugins-pro/eclipse-solar-analysis/eclipseWorker.ts'];
      entry.coverageWorker = ['./src/plugins-pro/coverage-analysis/coverageWorker.ts'];
      entry.tocaPocaWorker = ['./src/plugins-pro/toca-poca-plugin/tocaPocaWorker.ts'];
      entry.overflightWorker = ['./src/plugins-pro/overflight/overflightWorker.ts'];
      entry.neighborhoodHistoryWorker = ['./src/plugins-pro/neighborhood-history/neighborhoodHistoryWorker.ts'];
    }

    return ({
      ...baseConfig,
      ...{
        name: 'WebWorkers',
        entry,
        output: {
          filename: '[name].js',
          path: `${dirName}/../${subFolder}/js`,
          publicPath: `./${pubPath}js/`,
        },
        plugins: [
          new ProgressPlugin({
            prefix: 'KeepTrack Workers',
          }),
        ],
      },
    });
  }
}
