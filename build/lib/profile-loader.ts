/* eslint-disable no-process-env */
import dotenv from 'dotenv';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { BuildConfig } from './config-manager';
import { BuildError, ConsoleStyles, ErrorCodes, logWithStyle } from './build-error';

/**
 * Maps profile directory file names to BuildConfig keys and their default paths.
 * Only files that differ from defaults need to exist in a profile directory.
 */
const PROFILE_FILE_MAP: Record<string, { configKey: keyof BuildConfig; defaultPath: string }> = {
  'settingsOverride.js': { configKey: 'settingsPath', defaultPath: 'public/settings/settingsOverride.js' },
  'style.css': { configKey: 'styleCssPath', defaultPath: 'public/css/style.css' },
  'loading-screen.css': { configKey: 'loadingScreenCssPath', defaultPath: 'public/css/loading-screen.css' },
  'logo.png': { configKey: 'textLogoPath', defaultPath: 'public/img/logo.png' },
  'logo-primary.png': { configKey: 'primaryLogoPath', defaultPath: 'public/img/logo-primary.png' },
  'logo-secondary.png': { configKey: 'secondaryLogoPath', defaultPath: 'public/img/logo-secondary.png' },
  'favicon.ico': { configKey: 'favIconPath', defaultPath: 'public/img/favicons/favicon.ico' },
  'wallpapers.ts': { configKey: 'wallpapersPath', defaultPath: 'src/app/ui/default-wallpapers.ts' },
};

/**
 * Loads build profiles from the configs/ directory.
 *
 * Each profile is a subdirectory of configs/ containing:
 * - profile.env: environment variables (MODE, IS_PRO, etc.)
 * - Override files (settingsOverride.js, style.css, etc.) that replace defaults
 */
export class ProfileLoader {
  private readonly rootDir_: string;
  private readonly profilesDir_: string;

  constructor(rootDir: string) {
    this.rootDir_ = rootDir;
    this.profilesDir_ = resolve(rootDir, 'configs');
  }

  /**
   * Lists available profile names by scanning configs/ directory.
   */
  listProfiles(): string[] {
    if (!existsSync(this.profilesDir_)) {
      return [];
    }

    return readdirSync(this.profilesDir_, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
      .map((entry) => entry.name);
  }

  /**
   * Loads a profile by name, returning partial BuildConfig overrides.
   * Files present in the profile directory override defaults; missing files use defaults.
   */
  loadProfile(profileName: string): Partial<BuildConfig> {
    const profileDir = resolve(this.profilesDir_, profileName);

    if (!existsSync(profileDir)) {
      const available = this.listProfiles();

      throw new BuildError(
        `Profile "${profileName}" not found in configs/. Available: ${available.length > 0 ? available.join(', ') : '(none)'}`,
        ErrorCodes.PROFILE_NOT_FOUND,
      );
    }

    logWithStyle(`Loading profile: ${profileName}`, ConsoleStyles.DEBUG);

    const config: Partial<BuildConfig> = {};

    // 1. Load profile.env if it exists
    Object.assign(config, this.parseProfileEnv_(profileDir));

    // 2. Resolve file-based overrides: check each known file in profile dir
    Object.assign(config, this.resolveFileOverrides_(profileDir));

    return config;
  }

  /**
   * Parses profile.env (if present) into a partial BuildConfig.
   * Uses dotenv.parse() instead of dotenv.config() to avoid polluting process.env,
   * which ensures CLI args and process.env take proper precedence over profile values.
   */
  private parseProfileEnv_(profileDir: string): Partial<BuildConfig> {
    const config: Partial<BuildConfig> = {};
    const envPath = join(profileDir, 'profile.env');

    if (!existsSync(envPath)) {
      return config;
    }

    const envVars = dotenv.parse(readFileSync(envPath));

    // Point dotenv-webpack at this profile's env file
    config.envFilePath = relative(this.rootDir_, envPath).replace(/\\/gu, '/');

    if (envVars.MODE) {
      config.mode = envVars.MODE as BuildConfig['mode'];
    }
    if (envVars.IS_PRO) {
      config.isPro = envVars.IS_PRO === 'true';
    }
    if (envVars.EDITION) {
      config.edition = envVars.EDITION;
    }
    if (envVars.PUBLIC_SUPABASE_URL) {
      config.PUBLIC_SUPABASE_URL = envVars.PUBLIC_SUPABASE_URL;
    }
    if (envVars.PUBLIC_SUPABASE_ANON_KEY) {
      config.PUBLIC_SUPABASE_ANON_KEY = envVars.PUBLIC_SUPABASE_ANON_KEY;
    }

    return config;
  }

  /**
   * Resolves file-based overrides by checking each known file in the profile dir.
   * Paths must be relative to rootDir because webpack-manager prefixes them with `${dirName}/../`.
   * If a file is not present, ConfigManager defaults will apply.
   */
  private resolveFileOverrides_(profileDir: string): Partial<BuildConfig> {
    const config: Partial<BuildConfig> = {};

    for (const [fileName, mapping] of Object.entries(PROFILE_FILE_MAP)) {
      const profileFilePath = join(profileDir, fileName);

      if (existsSync(profileFilePath)) {
        const relativePath = relative(this.rootDir_, profileFilePath).replace(/\\/gu, '/');

        (config as Record<string, string>)[mapping.configKey] = relativePath;
        logWithStyle(`  ${mapping.configKey}: ${relativePath}`, ConsoleStyles.DEBUG);
      }
    }

    return config;
  }

  /**
   * Validates that a profile has all required files (or defaults exist as fallbacks).
   * Returns an array of error messages. Empty array means valid.
   */
  validateProfile(profileName: string): string[] {
    const errors: string[] = [];
    const profileDir = resolve(this.profilesDir_, profileName);

    if (!existsSync(profileDir)) {
      errors.push(`Profile directory does not exist: configs/${profileName}/`);

      return errors;
    }

    // Check that default fallback files exist for anything NOT overridden
    for (const [fileName, mapping] of Object.entries(PROFILE_FILE_MAP)) {
      const profileFilePath = join(profileDir, fileName);
      const defaultPath = resolve(this.rootDir_, mapping.defaultPath);

      if (!existsSync(profileFilePath) && !existsSync(defaultPath)) {
        errors.push(`Neither profile file "${fileName}" nor default "${mapping.defaultPath}" exists`);
      }
    }

    return errors;
  }
}
