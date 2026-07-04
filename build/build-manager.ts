// src/scripts/build.ts
/* eslint-disable no-process-exit */
import { MultiCompiler, MultiRspackOptions, MultiStats, rspack, StatsCompilation } from '@rspack/core';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { BuildError, ConsoleStyles, ErrorCodes, handleBuildError, logWithStyle } from './lib/build-error';
import { ConfigManager } from './lib/config-manager';
import { FileSystemManager } from './lib/filesystem-manager';
import { reporter } from './lib/reporter';
import { VersionManager } from './lib/version-manager';
import { WebpackManager } from './webpack-manager';

/** Human-friendly step labels for the named compiler children. */
const COMPILER_LABELS: Record<string, string> = {
  MainFiles: 'Compile main app',
  WebWorkers: 'Compile web workers',
  AuthFiles: 'Compile auth pages',
};

/** Number of individual assets listed in the final summary table. */
const ASSET_TABLE_ROWS = 8;

class BuildManager {
  /**
   * Main build process
   */
  static build() {
    const startedAt = Date.now();

    try {
      // Initialize utilities
      const fileManager = new FileSystemManager(import.meta.url);
      const configManager = new ConfigManager();
      const versionManager = new VersionManager(fileManager);

      // In legacy .env mode, ensure .env exists before loading config
      const isProfileMode = process.argv.some((arg) => arg.startsWith('--profile='));

      if (!isProfileMode && !fileManager.fileExists('./.env')) {
        fileManager.copyFile('./.env.example', './.env', { force: false });
        logWithStyle('.env file not found, copied from .env.example', ConsoleStyles.WARNING);
      }

      // Load configuration (pass rootDir so ProfileLoader can find configs/)
      const config = configManager.loadConfig(process.argv.slice(2), fileManager.rootDir);
      const appVersion = JSON.parse(fileManager.readFile('./package.json')).version as string;

      reporter.banner('KeepTrack', `v${appVersion} · ${config.edition} · ${config.mode}`);

      reporter.phase('Prepare dist', () => fileManager.prepareBuildDirectory('./dist'));

      reporter.phase('Copy static assets', () => {
        fileManager.copyTopLevelFiles('./public', './dist');

        // Copy resource directories
        const resourceDirs = ['img/favicons', 'img/pwa', 'img/achievements', 'data', 'meshes', 'res', 'settings', 'simulation', 'textures', 'tle'];

        resourceDirs.forEach((dir) => {
          fileManager.copyDirectory(`public/${dir}`, `dist/${dir}`, { recursive: true });
        });

        // Copy pro examples if available
        fileManager.copyDirectory('src/plugins-pro/examples', 'dist/examples', { isOptional: true, recursive: true });

        // Copy profile-specific runtime files (not bundled by webpack)
        if (config.settingsPath && config.settingsPath !== 'public/settings/settingsOverride.js') {
          fileManager.copyFile(config.settingsPath, './dist/settings/settingsOverride.js', { force: true });
        }
        if (config.favIconPath && config.favIconPath !== 'public/img/favicons/favicon.ico') {
          fileManager.copyFile(config.favIconPath, './dist/img/favicons/favicon.ico', { force: true });
        }
      });

      /*
       * Every npm script and CI step runs generate-translation.ts immediately before
       * this (via prebuild or an explicit chain), which already merges all locale
       * files into src/locales. Those callers pass --skip-locales so the ~2,000
       * .src.json files are not re-read and re-merged a second time per build.
       */
      if (process.argv.includes('--skip-locales')) {
        reporter.skip('Locales', 'pre-merged by generate-translation');
      } else if (config.isPro) {
        reporter.phase('Merge locales', () => fileManager.mergeLocales('src', 'src/plugins-pro'), (result) => `${result.languages} languages`);
      } else {
        reporter.phase('Compile locales', () => fileManager.compileLocales('src'));
      }

      reporter.phase('Update version', () => {
        versionManager.updateVersionReferences('./package.json');
        versionManager.updateServiceWorkerVersion('./package.json');
      }, () => `v${appVersion}`);

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
        BuildManager.runCompilers(compiler, startedAt);
      }
    } catch (error) {
      handleBuildError(error);
    }
  }

  /**
   * Handles compiler results
   */
  static handleCompilerResults(err: Error | null, stats?: MultiStats) {
    // The progress bar line must not survive into the results output
    reporter.clearProgress();

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
    let isFirstBuild = true;

    compilers.watch({}, (err: Error | null, stats?: MultiStats) => {
      BuildManager.handleCompilerResults(err, stats);

      if (!err && stats && !stats.hasErrors()) {
        const children = stats.toJson({ assets: false, timings: true, modules: false, chunks: false, errors: false, warnings: false }).children ?? [];
        const slowest = Math.max(...children.map((child) => child.time ?? 0), 0);

        reporter.rebuilt(slowest, isFirstBuild ? 'built' : 'rebuilt');
        isFirstBuild = false;
      } else {
        logWithStyle('Rebuild failed', ConsoleStyles.ERROR);
      }
    });

    // Setup process signal handlers for graceful shutdown
    BuildManager.setupSignalHandlers();
  }

  /**
   * Runs the compilers once
   */
  static runCompilers(compilers: MultiCompiler, startedAt: number) {
    compilers.run((err: Error | null, stats?: MultiStats) => {
      BuildManager.handleCompilerResults(err, stats);

      const failed = Boolean(err) || Boolean(stats?.hasErrors());

      // Close the compiler to let the process exit
      compilers.close((closeErr: Error | null) => {
        if (closeErr) {
          handleBuildError(closeErr, false);
        }

        if (failed || closeErr) {
          // A failed compile must exit non-zero so CI catches it here rather than
          // serving an app-less dist to the downstream smoke tests.
          logWithStyle('Build failed.', ConsoleStyles.ERROR);
          process.exit(1);
        }

        BuildManager.printBuildSummary(stats, startedAt);
      });
    });
  }

  /**
   * Prints per-compiler timings, the largest emitted assets with their gzip
   * sizes, and the total build duration.
   */
  static printBuildSummary(stats: MultiStats, startedAt: number) {
    const children: StatsCompilation[] = stats.toJson({ assets: true, timings: true, outputPath: true, modules: false, chunks: false, errors: false, warnings: false }).children ?? [];

    for (const child of children) {
      const label = COMPILER_LABELS[child.name ?? ''] ?? `Compile ${child.name ?? 'bundle'}`;

      reporter.stepDone(label, child.time ?? 0);
    }

    // Asset names are relative to each child's own output dir (dist/js or dist/auth)
    const distDir = resolve('dist');
    const assets = children
      .flatMap((child) => {
        const outDir = child.outputPath ?? resolve('dist/js');

        return (child.assets ?? []).map((asset) => ({
          path: resolve(outDir, asset.name),
          size: asset.size,
        }));
      })
      .filter((asset) => !asset.path.endsWith('.map') && !asset.path.endsWith('.LICENSE.txt'));

    const rows = [...assets]
      .sort((a, b) => b.size - a.size)
      .slice(0, ASSET_TABLE_ROWS)
      .map((asset) => ({
        name: `dist/${relative(distDir, asset.path).replaceAll('\\', '/')}`,
        size: asset.size,
        gzipSize: BuildManager.tryGzipSize_(asset.path),
      }));

    const totalBytes = assets.reduce((sum, asset) => sum + asset.size, 0);

    reporter.assetSummary(rows, assets.length, totalBytes);
    reporter.done(Date.now() - startedAt);
  }

  /**
   * Returns the gzip size of an emitted file, or undefined when it cannot be
   * read (the table then simply omits the gzip column for that row).
   */
  private static tryGzipSize_(filePath: string): number | undefined {
    try {
      return gzipSync(readFileSync(filePath)).length;
    } catch {
      return undefined;
    }
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
      logWithStyle('Exiting build process', ConsoleStyles.DEBUG);
    });
  }
}


// Start the build process
BuildManager.build();
