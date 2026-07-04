/* eslint-disable require-jsdoc */
import { ConsoleStyles, logWithStyle } from '../lib/build-error';
import { ConfigManager } from '../lib/config-manager';
import { FileSystemManager } from '../lib/filesystem-manager';

export function mergeAllLocales(): { files: number; languages: number } {
  logWithStyle('Starting locale build process', ConsoleStyles.DEBUG);

  // Initialize utilities
  const fileManager = new FileSystemManager(import.meta.url);
  const configManager = new ConfigManager();

  // Check for .env file - if it is missing copy from .env.example
  if (!fileManager.fileExists('../.env')) {
    fileManager.copyFile('../.env.example', '../.env', { force: false });
    logWithStyle('.env file not found, copied from .env.example', ConsoleStyles.WARNING);
  }
  // Load configuration
  const config = configManager.loadConfig(process.argv.slice(2));

  // Always include pro plugin locales when the directory exists, even in OSS builds.
  // The submodule is checked out in CI and locale keys must be consistent across all languages.
  if (config.isPro || fileManager.fileExists('../src/plugins-pro')) {
    return fileManager.mergeLocales('../src', '../src/plugins-pro');
  }

  return fileManager.mergeLocales('../src');
}
