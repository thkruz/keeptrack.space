import { Configuration, DefinePlugin, DefinePluginOptions, HtmlRspackPlugin, LightningCssMinimizerRspackPlugin, ProgressPlugin, SwcJsMinimizerRspackPlugin } from '@rspack/core';
import { execSync } from 'node:child_process';
import DotEnv from 'dotenv-webpack';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BuildConfig } from './lib/config-manager';
import { reporter } from './lib/reporter';
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
      __PROPAGATOR_BACKEND__: JSON.stringify(this.config.propagatorBackend),
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
    return {
      resolve: {
        extensions: ['.ts', '.js'],
        alias: {
          '@app': `${dirName}/../src`,
          '@engine': `${dirName}/../src/engine`,
          '@ootk': `${dirName}/../src/engine/ootk`,
          '@plugins-pro': `${dirName}/../src/plugins-pro`,
          '@plugins-external': `${dirName}/../src/plugins-external`,
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
            test: /\.(?:mp3|wav|flac|m4a)$/iu,
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
            // Rust/SWC transpile (no type-check — `pnpm run typecheck` (tsgo) owns
            // types). Replaces ts-loader (JS tsc, transpileOnly:false), which
            // re-type-checked the whole program on every build child.
            test: /\.tsx?$/u,
            loader: 'builtin:swc-loader',
            exclude: [/node_modules/u, /\test/u, /\dist/u, /\coverage/u, /\.test\.tsx?$/u, /\src\/admin/u],
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                target: 'es2022',
              },
            },
          },
          {
            // JS is transpiled by rspack's builtin SWC (no babel-loader). This
            // rule only relaxes fully-specified ESM resolution so extensionless
            // imports inside some dependencies keep resolving.
            test: /\.m?js$/u,
            include: [/src/u, /node_modules/u],
            resolve: {
              fullySpecified: false,
            },
          },
          {
            // Only consume upstream source maps from our own code — not the
            // thousands of files in node_modules (expensive and noisy).
            test: /\.m?js$/u,
            enforce: 'pre',
            include: [/src/u],
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

    // Persistent filesystem cache: compiled modules are cached across builds, so
    // local iterative (re)builds are near-instant. A cold CI build simply writes
    // a fresh cache (no benefit, negligible cost). Invalidated when the build
    // config or the dependency manifest changes.
    const buildRoot = dirname(fileURLToPath(import.meta.url));

    // Skip the cache in CI: a cold runner would write ~300 MB it never reuses.
    baseConfig.cache = process.env.CI
      ? false
      : {
        type: 'persistent',
        // `version` namespaces the cache by mode so a dev build and a prod build
        // never read each other's (differently minified) cached modules.
        version: mode,
        buildDependencies: [resolve(buildRoot, 'webpack-manager.ts'), resolve(buildRoot, '../package.json')],
        storage: {
          type: 'filesystem',
          directory: 'node_modules/.cache/rspack',
        },
      };
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
          new HtmlRspackPlugin({
            filename: '../index.html',
            template: './public/index.html',
          }),
          new DotEnv({
            systemvars: true,
            path: `./${this.config.envFilePath}`,
            allowEmptyValues: true,
          }),
          new ProgressPlugin(reporter.createCompileProgressHandler('main')),
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
          new ProgressPlugin(reporter.createCompileProgressHandler('auth')),
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
      entry.interceptorWorker = ['./src/plugins-pro/satellite-interceptor/interceptorWorker.ts'];
      entry.transitFinderWorker = ['./src/plugins-pro/transit-finder/transitFinderWorker.ts'];
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
          new ProgressPlugin(reporter.createCompileProgressHandler('workers')),
        ],
      },
    });
  }
}
