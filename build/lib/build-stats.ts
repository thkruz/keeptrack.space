import { MultiStats } from '@rspack/core';
import { ConsoleStyles, logWithStyle } from './build-error';

/**
 * Interface for build statistics
 */
export interface BuildStatsData {
  startTime: number;
  endTime?: number;
  duration?: number;
  mode: string;
  isWatch: boolean;
  errors: number;
  warnings: number;
  assets?: AssetInfo[];
}

/**
 * Interface for asset information
 */
export interface AssetInfo {
  name: string;
  size: number;
  sizeFormatted: string;
}

/**
 * Manages build performance tracking and reporting
 */
export class BuildStats {
  private stats: BuildStatsData;

  constructor(mode: string, isWatch: boolean) {
    this.stats = {
      startTime: Date.now(),
      mode,
      isWatch,
      errors: 0,
      warnings: 0,
    };
  }

  /**
   * Marks the build as complete and calculates duration
   */
  complete(): void {
    this.stats.endTime = Date.now();
    this.stats.duration = this.stats.endTime - this.stats.startTime;
  }

  /**
   * Updates stats from compiler results
   * @param compilerStats Compiler statistics
   */
  updateFromCompilerStats(compilerStats?: MultiStats): void {
    if (!compilerStats) {
      return;
    }

    // Count errors and warnings
    const statsJson = compilerStats.toJson({
      all: false,
      errors: true,
      warnings: true,
      assets: true,
    });

    this.stats.errors = (statsJson.errors?.length ?? 0);
    this.stats.warnings = (statsJson.warnings?.length ?? 0);

    // Extract asset information
    this.stats.assets = [];
    if (statsJson.children) {
      for (const child of statsJson.children) {
        if (child.assets) {
          for (const asset of child.assets) {
            this.stats.assets.push({
              name: asset.name,
              size: asset.size,
              sizeFormatted: this.formatBytes(asset.size),
            });
          }
        }
      }
    }
  }

  /**
   * Prints build summary to console
   */
  printSummary(): void {
    if (!this.stats.endTime || !this.stats.duration) {
      return;
    }

    console.log('\n' + '='.repeat(60));
    logWithStyle('Build Summary', ConsoleStyles.INFO);
    console.log('='.repeat(60));

    // Build info
    logWithStyle(`Mode: ${this.stats.mode}`, ConsoleStyles.INFO);
    logWithStyle(`Watch: ${this.stats.isWatch ? 'Enabled' : 'Disabled'}`, ConsoleStyles.INFO);
    logWithStyle(`Duration: ${this.formatDuration(this.stats.duration)}`, ConsoleStyles.INFO);

    // Errors and warnings
    if (this.stats.errors > 0) {
      logWithStyle(`Errors: ${this.stats.errors}`, ConsoleStyles.ERROR);
    } else {
      logWithStyle('Errors: 0', ConsoleStyles.SUCCESS);
    }

    if (this.stats.warnings > 0) {
      logWithStyle(`Warnings: ${this.stats.warnings}`, ConsoleStyles.WARNING);
    } else {
      logWithStyle('Warnings: 0', ConsoleStyles.SUCCESS);
    }

    // Assets
    if (this.stats.assets && this.stats.assets.length > 0) {
      console.log('\n' + '-'.repeat(60));
      logWithStyle('Assets:', ConsoleStyles.INFO);
      console.log('-'.repeat(60));

      // Sort by size (largest first)
      const sortedAssets = [...this.stats.assets].sort((a, b) => b.size - a.size);

      // Group by type
      const jsAssets = sortedAssets.filter((a) => a.name.endsWith('.js'));
      const cssAssets = sortedAssets.filter((a) => a.name.endsWith('.css'));
      const htmlAssets = sortedAssets.filter((a) => a.name.endsWith('.html'));
      const otherAssets = sortedAssets.filter(
        (a) => !a.name.endsWith('.js') && !a.name.endsWith('.css') && !a.name.endsWith('.html'),
      );

      if (jsAssets.length > 0) {
        logWithStyle('\nJavaScript:', ConsoleStyles.INFO);
        jsAssets.forEach((asset) => {
          console.log(`  ${asset.name.padEnd(40)} ${asset.sizeFormatted.padStart(12)}`);
        });
      }

      if (cssAssets.length > 0) {
        logWithStyle('\nCSS:', ConsoleStyles.INFO);
        cssAssets.forEach((asset) => {
          console.log(`  ${asset.name.padEnd(40)} ${asset.sizeFormatted.padStart(12)}`);
        });
      }

      if (htmlAssets.length > 0) {
        logWithStyle('\nHTML:', ConsoleStyles.INFO);
        htmlAssets.forEach((asset) => {
          console.log(`  ${asset.name.padEnd(40)} ${asset.sizeFormatted.padStart(12)}`);
        });
      }

      if (otherAssets.length > 0) {
        logWithStyle('\nOther:', ConsoleStyles.INFO);
        otherAssets.forEach((asset) => {
          console.log(`  ${asset.name.padEnd(40)} ${asset.sizeFormatted.padStart(12)}`);
        });
      }

      // Total size
      const totalSize = this.stats.assets.reduce((sum, asset) => sum + asset.size, 0);

      console.log('-'.repeat(60));
      logWithStyle(`Total: ${this.formatBytes(totalSize)}`, ConsoleStyles.SUCCESS);
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * Formats bytes to human-readable format
   * @param bytes Number of bytes
   * @returns Formatted string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 B';
    }

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Formats duration to human-readable format
   * @param ms Duration in milliseconds
   * @returns Formatted string
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }

    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;

    if (seconds < 60) {
      return `${seconds}.${Math.floor(milliseconds / 100)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Gets the current stats data
   * @returns Build statistics data
   */
  getStats(): BuildStatsData {
    return { ...this.stats };
  }
}
