/* eslint-disable require-jsdoc */
import { ConsoleStyles, logWithStyle } from '../lib/build-error';
import { ConfigManager } from '../lib/config-manager';
import { FileSystemManager } from '../lib/filesystem-manager';

export function mergeAllLocales(): void {
  logWithStyle('Starting locale build process', ConsoleStyles.INFO);

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

  if (config.isPro) {
    fileManager.mergeLocales('../src', '../src/plugins-pro');
  } else {
    fileManager.mergeLocales('../src');
  }
}
