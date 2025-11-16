import { Configuration, HtmlRspackPlugin, LightningCssMinimizerRspackPlugin, SwcJsMinimizerRspackPlugin } from '@rspack/core';
import CleanTerminalPlugin from 'clean-terminal-webpack-plugin';
import DotEnv from 'dotenv-webpack';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import WebpackBar from 'webpackbar/rspack';
import { ConsoleStyles, logWithStyle } from './lib/build-error';
import {
  BUILD_MODES,
  CACHE_CONFIG,
  DEFAULT_PATHS,
  DEVTOOL_CONFIG,
  ENTRY_POINTS,
  FILE_EXTENSIONS,
  OUTPUT_PATTERNS,
  WATCH_CONFIG,
} from './lib/build-constants';
import { BuildConfig } from './lib/config-manager';

/**
 * Manages Rspack configuration and bundling
 */
export class RspackManager {
  static readonly DEFAULT_MODE = BUILD_MODES.DEVELOPMENT;
  static readonly DEFAULT_WATCH = false;
  private static config: BuildConfig;

  /**
   * Creates Rspack configuration for all entry points
   * @param config Build configuration
   * @param isWatch Whether to enable watch mode (deprecated - use config.isWatch instead)
   * @returns Array of Rspack configurations
   */
  static createConfig(config: BuildConfig, isWatch: boolean = false): Configuration[] {
    this.config = config;
    const fileName = fileURLToPath(import.meta.url);
    const dirName = dirname(fileName);
    const rspackConfigs = [] as Configuration[];
    let baseConfig = this.createBaseConfig_(dirName);
    const mode: 'development' | 'production' | 'none' = config.mode ?? 'development';

    // Apply mode-specific configuration
    baseConfig = this.createNonEmbedConfig_(baseConfig, mode);

    // Enable watch mode if specified (prefer config.isWatch over isWatch parameter)
    const shouldWatch = config.isWatch || isWatch;
    if (shouldWatch) {
      baseConfig.watch = true;
      baseConfig.watchOptions = {
        aggregateTimeout: WATCH_CONFIG.AGGREGATE_TIMEOUT,
        poll: WATCH_CONFIG.POLL_INTERVAL,
        ignored: /node_modules/u,
      };
    }

    // Development mode optimizations
    if (mode === BUILD_MODES.DEVELOPMENT) {
      baseConfig = {
        ...baseConfig,
        cache: CACHE_CONFIG.ENABLED_IN_DEV,
        devtool: DEVTOOL_CONFIG.DEVELOPMENT,
        optimization: {
          minimize: false,
        },
      };
    }

    // Production mode optimizations
    if (mode === BUILD_MODES.PRODUCTION) {
      baseConfig = {
        ...baseConfig,
        cache: CACHE_CONFIG.ENABLED_IN_PROD,
        devtool: DEVTOOL_CONFIG.PRODUCTION,
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
      };
    }

    // Create configurations for different entry points
    const mainConfig = this.createMainConfig_(baseConfig, dirName, 'dist');
    const webWorkerConfig = this.createWorkerConfig_(baseConfig, dirName, 'dist', '');

    rspackConfigs.push(mainConfig);
    rspackConfigs.push(webWorkerConfig);

    // Add auth configuration for pro builds
    if (this.config.isPro) {
      const authConfig = this.createAuthConfig_(baseConfig, dirName, 'dist', 'auth/');
      rspackConfigs.push(authConfig);
    }

    // Configure worker imports fallback
    baseConfig.resolve!.fallback = {
      ...baseConfig.resolve!.fallback,
      worker: false,
    };

    return rspackConfigs;
  }

  /**
   * Returns the base configuration for rspack
   * @param dirName The directory name
   * @returns Base Rspack configuration
   */
  private static createBaseConfig_(dirName: string): Configuration {
    logWithStyle(`Style CSS path: ${this.config.styleCssPath}`, ConsoleStyles.DEBUG);
    logWithStyle(`Loading screen CSS path: ${this.config.loadingScreenCssPath}`, ConsoleStyles.DEBUG);

    return {
      resolve: {
        extensions: [...FILE_EXTENSIONS.TYPESCRIPT, ...FILE_EXTENSIONS.JAVASCRIPT],
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
            exclude: [/node_modules/u, /\dist/u, /\coverage/u, /\.test\.tsx?$/u, /\src\/admin/u],
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
   * Returns a modified rspack configuration object for non-embed mode
   * @param baseConfig Base configuration
   * @param mode Build mode
   * @returns Modified configuration
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
   * Returns the main configuration object for rspack
   * @param baseConfig Base configuration
   * @param dirName Directory name
   * @param subFolder Subfolder for output
   * @param pubPath Public path
   * @returns Main app configuration
   */
  private static createMainConfig_(baseConfig: Configuration, dirName: string, subFolder: string, pubPath = '') {
    return <Configuration>({
      ...baseConfig,
      ...{
        name: 'MainFiles',
        entry: {
          main: [ENTRY_POINTS.MAIN],
        },
        output: {
          // Add hash to the end of the file name for cache busting
          filename: subFolder === 'dist' ? OUTPUT_PATTERNS.MAIN_JS : '[name].js',
          path: `${dirName}/../${subFolder}/js`,
          publicPath: `./${pubPath}js/`,
        },
        plugins: [
          new CleanTerminalPlugin({
            beforeCompile: true,
          }),
          new HtmlRspackPlugin({
            filename: '../index.html',
            template: DEFAULT_PATHS.INDEX_HTML,
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
   * Returns the auth configuration object for rspack
   * @param baseConfig Base configuration
   * @param dirName Directory name
   * @param subFolder Subfolder for output
   * @param pubPath Public path
   * @returns Auth app configuration
   */
  private static createAuthConfig_(baseConfig: Configuration, dirName: string, subFolder: string, pubPath = '') {
    return <Configuration>({
      ...baseConfig,
      ...{
        name: 'AuthFiles',
        entry: {
          'popup-callback': [ENTRY_POINTS.AUTH_CALLBACK],
        },
        output: {
          // Add hash to the end of the file name for cache busting
          filename: subFolder === 'dist' ? OUTPUT_PATTERNS.AUTH_JS : '[name].js',
          path: `${dirName}/../${subFolder}/auth`,
          publicPath: `../${pubPath}`,
        },
        plugins: [
          new HtmlRspackPlugin({
            filename: '../auth/callback.html',
            template: DEFAULT_PATHS.AUTH_CALLBACK_HTML,
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
   * Returns the WebWorker configuration object
   * @param baseConfig Base configuration
   * @param dirName Directory name
   * @param subFolder Subfolder for output
   * @param pubPath Public path
   * @returns WebWorker configuration
   */
  private static createWorkerConfig_(baseConfig: Configuration, dirName: string, subFolder: string, pubPath: string) {
    return ({
      ...baseConfig,
      ...{
        name: 'WebWorkers',
        entry: {
          positionCruncher: [ENTRY_POINTS.POSITION_WORKER],
          orbitCruncher: [ENTRY_POINTS.ORBIT_WORKER],
        },
        output: {
          filename: OUTPUT_PATTERNS.WORKER_JS,
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
