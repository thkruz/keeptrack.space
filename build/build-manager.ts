// src/scripts/build.ts
/* eslint-disable no-process-exit */
import { MultiCompiler, MultiRspackOptions, MultiStats, rspack } from '@rspack/core';
import { BuildError, ConsoleStyles, ErrorCodes, handleBuildError, logWithStyle } from './lib/build-error';
import { BUILD_DIRS, DEFAULT_PATHS, RESOURCE_DIRS } from './lib/build-constants';
import { BuildStats } from './lib/build-stats';
import { BuildValidator } from './lib/build-validator';
import { ConfigManager } from './lib/config-manager';
import { FileSystemManager } from './lib/filesystem-manager';
import { PluginManager } from './lib/plugin-manager';
import { VersionManager } from './lib/version-manager';
import { RspackManager } from './rspack-manager';

class BuildManager {
  private static buildStats: BuildStats;
  /**
   * Main build process
   */
  static build() {
    try {
      console.clear();
      logWithStyle('Starting build process', ConsoleStyles.INFO);

      // Initialize utilities
      const fileManager = new FileSystemManager(import.meta.url);
      const configManager = new ConfigManager();
      const pluginManager = new PluginManager(fileManager);
      const versionManager = new VersionManager(fileManager);

      // Load configuration first to initialize build stats
      const config = configManager.loadConfig(process.argv.slice(2));

      // Initialize build statistics
      this.buildStats = new BuildStats(config.mode, config.isWatch);

      // Check for .env file - if it is missing copy from .env.example
      if (!fileManager.fileExists(DEFAULT_PATHS.ENV_FILE)) {
        fileManager.copyFile(DEFAULT_PATHS.ENV_EXAMPLE, DEFAULT_PATHS.ENV_FILE, { force: false });
        logWithStyle('.env file not found, copied from .env.example', ConsoleStyles.WARNING);
      }

      // Validate build configuration
      BuildValidator.validateOrThrow(config);

      // Prepare build directory
      fileManager.prepareBuildDirectory(`./${BUILD_DIRS.DIST}`);

      // Copy static files
      logWithStyle('Copying static files', ConsoleStyles.DEBUG);
      fileManager.copyTopLevelFiles(`./${BUILD_DIRS.PUBLIC}`, `./${BUILD_DIRS.DIST}`);

      // Copy resource directories
      RESOURCE_DIRS.forEach((dir) => {
        fileManager.copyDirectory(`${BUILD_DIRS.PUBLIC}/${dir}`, `${BUILD_DIRS.DIST}/${dir}`, { recursive: true });
      });

      // Apply custom configurations
      fileManager.copyDirectory(`${BUILD_DIRS.PLUGINS_PRO}/examples`, `${BUILD_DIRS.DIST}/examples`, { isOptional: true, recursive: true });

      // Apply custom logo configurations
      if (config.textLogoPath) {
        fileManager.copyFile(config.textLogoPath, `./${BUILD_DIRS.DIST}/img/logo.png`, { force: true });
      }
      if (config.primaryLogoPath) {
        fileManager.copyFile(config.primaryLogoPath, `./${BUILD_DIRS.DIST}/img/logo-primary.png`, { force: true });
      }

      if (config.secondaryLogoPath) {
        fileManager.copyFile(config.secondaryLogoPath, `./${BUILD_DIRS.DIST}/img/logo-secondary.png`, { force: true });
      }

      if (config.styleCssPath) {
        // Verify the file exists
        if (!fileManager.fileExists(config.styleCssPath)) {
          throw new BuildError(`Style CSS file not found: ${config.styleCssPath}`, ErrorCodes.FILE_NOT_FOUND);
        }
      }

      if (config.loadingScreenCssPath) {
        // Verify the file exists
        if (!fileManager.fileExists(config.loadingScreenCssPath)) {
          throw new BuildError(`Loading screen CSS file not found: ${config.loadingScreenCssPath}`, ErrorCodes.FILE_NOT_FOUND);
        }
      }

      if (config.favIconPath) {
        fileManager.copyFile(config.favIconPath, `./${BUILD_DIRS.DIST}/img/favicons/favicon.ico`, { force: true });
      }

      if (config.settingsPath) {
        fileManager.copyFile(config.settingsPath, `./${BUILD_DIRS.DIST}/settings/settingsOverride.js`, { force: true });
      }

      if (config.isPro) {
        // Merge locales files
        fileManager.mergeLocales(BUILD_DIRS.SOURCE, BUILD_DIRS.PLUGINS_PRO);
      } else {
        fileManager.compileLocales(BUILD_DIRS.SOURCE);
      }

      // Configure plugins
      pluginManager.configurePlugins(config.isPro);

      // Update version information
      versionManager.generateVersionFile(DEFAULT_PATHS.PACKAGE_JSON, DEFAULT_PATHS.VERSION_FILE);

      // Generate rspack configuration
      const rspackConfig = RspackManager.createConfig(config) as MultiRspackOptions;

      // Create compiler
      const compiler = rspack(rspackConfig);

      if (!compiler) {
        throw new BuildError('Failed to create compiler', ErrorCodes.COMPILER_CREATION);
      }

      // Run the compiler
      if (config.isWatch) {
        logWithStyle('Watching for changes...', ConsoleStyles.INFO);
        BuildManager.watchCompilers(compiler);
      } else {
        logWithStyle('Running one-time build', ConsoleStyles.INFO);
        BuildManager.runCompilers(compiler);
      }
    } catch (error) {
      handleBuildError(error);
    }
  }

  /**
   * Handles compiler results
   * @param err Error if any
   * @param stats Compiler statistics
   * @param isComplete Whether this is the final build (not watch mode)
   */
  static handleCompilerResults(err: Error | null, stats?: MultiStats, isComplete = false) {
    if (err) {
      handleBuildError(err, false);

      return;
    }

    const hasErrors = stats?.hasErrors();

    if (hasErrors && stats) {
      console.log(
        stats.toString({
          cached: false,
          colors: true,
          assets: false,
          chunks: false,
          chunkModules: false,
          chunkOrigins: false,
          errors: true,
          errorDetails: true,
          hash: false,
          modules: false,
          timings: false,
          warnings: false,
          version: false,
          children: false,
          reasons: false,
          source: false,
        }),
      );
    }

    // Update build stats
    if (this.buildStats && stats) {
      this.buildStats.updateFromCompilerStats(stats);
    }

    // Print summary for complete builds (not watch mode iterations)
    if (isComplete && this.buildStats) {
      this.buildStats.complete();
      this.buildStats.printSummary();
    }
  }

  /**
   * Sets up watch mode for the compilers
   */
  static watchCompilers(compilers: MultiCompiler) {
    compilers.watch({}, (err: Error | null, stats?: MultiStats) => {
      BuildManager.handleCompilerResults(err, stats);
    });

    // Setup process signal handlers for graceful shutdown
    BuildManager.setupSignalHandlers();
  }

  /**
   * Runs the compilers once
   */
  static runCompilers(compilers: MultiCompiler) {
    compilers.run((err: Error | null, stats?: MultiStats) => {
      BuildManager.handleCompilerResults(err, stats, true);

      // Close the compiler to let the process exit
      compilers.close((closeErr: Error | null) => {
        if (closeErr) {
          handleBuildError(closeErr, false);
        }

        logWithStyle('Build completed successfully!', ConsoleStyles.SUCCESS);
      });
    });
  }

  /**
   * Sets up signal handlers for graceful shutdown
   */
  static setupSignalHandlers() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];

    signals.forEach((signal) => {
      process.on(signal, () => {
        logWithStyle(`Received ${signal}. Shutting down gracefully...`, ConsoleStyles.INFO);
        process.exit(0);
      });
    });

    process.on('exit', () => {
      logWithStyle('Exiting build process', ConsoleStyles.INFO);
    });
  }
}


// Start the build process
BuildManager.build();
