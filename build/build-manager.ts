// src/scripts/build.ts
/* eslint-disable no-process-exit */
import { MultiCompiler, MultiRspackOptions, MultiStats, rspack } from '@rspack/core';
import { BuildError, ConsoleStyles, ErrorCodes, handleBuildError, logWithStyle } from './lib/build-error';
import { ConfigManager } from './lib/config-manager';
import { FileSystemManager } from './lib/filesystem-manager';
import { PluginManager } from './lib/plugin-manager';
import { VersionManager } from './lib/version-manager';
import { WebpackManager } from './webpack-manager';

class BuildManager {
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

      // Check for .env file - if it is missing copy from .env.example
      if (!fileManager.fileExists('./.env')) {
        fileManager.copyFile('./.env.example', './.env', { force: false });
        logWithStyle('.env file not found, copied from .env.example', ConsoleStyles.WARNING);
      }

      // Load configuration
      const config = configManager.loadConfig(process.argv.slice(2));

      // Prepare build directory
      fileManager.prepareBuildDirectory('./dist');

      // Copy static files
      logWithStyle('Copying static files', ConsoleStyles.DEBUG);
      fileManager.copyTopLevelFiles('./public', './dist');

      // Copy resource directories
      const resourceDirs = ['img/favicons', 'img/pwa', 'img/achievements', 'data', 'meshes', 'res', 'simulation', 'textures', 'tle'];

      resourceDirs.forEach((dir) => {
        fileManager.copyDirectory(`public/${dir}`, `dist/${dir}`, { recursive: true });
      });

      // Apply custom configurations
      fileManager.copyDirectory('src/plugins-pro/examples', 'dist/examples', { isOptional: true, recursive: true });

      // Apply custom configurations
      if (config.textLogoPath) {
        fileManager.copyFile(config.textLogoPath, './dist/img/logo.png', { force: true });
      }
      if (config.primaryLogoPath) {
        fileManager.copyFile(config.primaryLogoPath, './dist/img/logo-primary.png', { force: true });
      }

      if (config.secondaryLogoPath) {
        fileManager.copyFile(config.secondaryLogoPath, './dist/img/logo-secondary.png', { force: true });
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
        fileManager.copyFile(config.favIconPath, './dist/img/favicons/favicon.ico', { force: true });
      }

      if (config.settingsPath) {
        fileManager.copyFile(config.settingsPath, './dist/settings/settingsOverride.js', { force: true });
      }

      if (config.isPro) {
        // Merge locales files
        fileManager.mergeLocales('src', 'src/plugins-pro');
      } else {
        fileManager.compileLocales('src');
      }

      // Configure plugins
      pluginManager.configurePlugins(config.isPro);

      // Update version information
      versionManager.generateVersionFile('./package.json', 'src/settings/version.js');

      // Generate webpack configuration
      const webpackConfig = WebpackManager.createConfig(config) as MultiRspackOptions;

      // Create compiler
      const compiler = rspack(webpackConfig);

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
   */
  static handleCompilerResults(err: Error | null, stats?: MultiStats) {
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
      BuildManager.handleCompilerResults(err, stats);

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
