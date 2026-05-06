/* eslint-disable no-process-env */
// src/scripts/utils/configManager.ts
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { BuildError, ConsoleStyles, ErrorCodes, logWithStyle } from './build-error';
import { ProfileLoader } from './profile-loader';

export interface BuildConfig {
  primaryLogoPath: string;
  secondaryLogoPath: string;
  mode: 'none' | 'development' | 'production';
  isWatch: boolean;
  settingsPath: string;
  favIconPath: string;
  textLogoPath: string;
  styleCssPath: string;
  loadingScreenCssPath: string;
  wallpapersPath: string;
  isPro: boolean;
  /** Path to the env file for dotenv-webpack (relative to project root). Defaults to '.env'. */
  envFilePath: string;

  PUBLIC_SUPABASE_URL?: string;
  PUBLIC_SUPABASE_ANON_KEY?: string;
}

/**
 * Loads and manages the build configuration
 */
export class ConfigManager {
  private config: BuildConfig;
  private profileName_: string | null = null;
  private cliMode_: BuildConfig['mode'] | null = null;
  private cliWatch_ = false;

  constructor() {
    // Default configuration
    this.config = {
      mode: 'development',
      isWatch: false,
      settingsPath: 'public/settings/settingsOverride.js',
      favIconPath: 'public/img/favicons/favicon.ico',
      textLogoPath: 'public/img/logo.png',
      styleCssPath: 'public/css/style.css',
      loadingScreenCssPath: 'public/css/loading-screen.css',
      wallpapersPath: 'src/app/ui/default-wallpapers.ts',
      primaryLogoPath: 'public/img/logo-primary.png',
      secondaryLogoPath: 'public/img/logo-secondary.png',
      isPro: false,
      envFilePath: '.env',
    };
  }

  /**
   * Loads configuration from environment variables and command line arguments.
   * When --profile=<name> is used, loads from configs/<name>/ instead of .env.
   * @param args Command line arguments
   * @param rootDir Project root directory (for resolving profile paths)
   * @returns The build configuration
   */
  public loadConfig(args: string[], rootDir?: string): BuildConfig {
    try {
      // Process command line arguments first (to detect --profile)
      this.parseCommandLineArgs(args);

      if (this.profileName_) {
        // Profile mode: load from configs/<name>/
        const profileLoader = new ProfileLoader(rootDir ?? process.cwd());
        const errors = profileLoader.validateProfile(this.profileName_);

        if (errors.length > 0) {
          throw new BuildError(
            `Profile validation failed:\n  ${errors.join('\n  ')}`,
            ErrorCodes.PROFILE_NOT_FOUND,
          );
        }

        const profileOverrides = profileLoader.loadProfile(this.profileName_);

        Object.assign(this.config, profileOverrides);

        // CLI args override profile settings (e.g., "production --profile=celestrak")
        if (this.cliMode_) {
          this.config.mode = this.cliMode_;
        }
        this.config.isWatch = this.cliWatch_;

        // Populate process.env so dotenv-webpack's systemvars picks up secrets that live
        // in the root .env (e.g., KEEPTRACK_API_KEY) but aren't duplicated in profile.env.
        // Load profile.env first so its values take precedence over root .env on conflicts;
        // OS env wins over both because dotenv.config does not overwrite existing keys.
        if (this.config.envFilePath !== '.env' && existsSync(this.config.envFilePath)) {
          dotenv.config({ path: this.config.envFilePath });
        }
        if (existsSync('./.env')) {
          dotenv.config({ path: './.env' });
        }

        // process.env still wins (allows CI/CD overrides)
        this.applyProcessEnvOverrides_();
      } else {
        // Legacy mode: load from .env file
        const envFilePath = './.env';
        const envConfig = existsSync(envFilePath)
          ? dotenv.config({ path: envFilePath })
          : { parsed: null } as unknown as dotenv.DotenvConfigOutput;

        if (envConfig.error) {
          throw new BuildError(
            `Error loading .env file: ${envConfig.error.message}`,
            ErrorCodes.ENV_CONFIG,
          );
        }

        // Load environment variables (environment variables take precedence over .env)
        this.loadEnvironmentVariables_(envConfig.parsed || {});
      }

      // Log the configuration
      this.logConfiguration();

      return this.config;
    } catch (error) {
      if (error instanceof BuildError) {
        throw error;
      }
      throw new BuildError(
        `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.ENV_CONFIG,
      );
    }
  }

  /**
   * Parses command line arguments (supports both positional and flag-based)
   * @param args Command line arguments
   */
  private parseCommandLineArgs(args: string[]): void {
    for (const arg of args) {
      if (arg === '--watch') {
        this.cliWatch_ = true;
        this.config.isWatch = true;
      } else if (arg.startsWith('--profile=')) {
        this.profileName_ = arg.split('=')[1];
      } else if (arg === 'none' || arg === 'development' || arg === 'production') {
        this.cliMode_ = arg;
        this.config.mode = arg;
      }
    }
  }

  /**
   * Returns the active profile name, or null if using legacy .env mode.
   */
  get profileName(): string | null {
    return this.profileName_;
  }

  /**
   * Loads configuration from .env file + process.env (legacy mode)
   * @param envVars Environment variables from .env file
   */
  private loadEnvironmentVariables_(envVars: Record<string, string>): void {
    // Environment variables take precedence over .env variables
    this.config.settingsPath = process.env.SETTINGS_PATH ?? envVars.SETTINGS_PATH ?? this.config.settingsPath;
    this.config.favIconPath = process.env.FAVICON_PATH ?? envVars.FAVICON_PATH ?? this.config.favIconPath;
    this.config.textLogoPath = process.env.TEXT_LOGO_PATH ?? envVars.TEXT_LOGO_PATH ?? this.config.textLogoPath;
    this.config.styleCssPath = process.env.STYLE_CSS_PATH ?? envVars.STYLE_CSS_PATH ?? this.config.styleCssPath;
    this.config.loadingScreenCssPath = process.env.LOADING_SCREEN_CSS_PATH ?? envVars.LOADING_SCREEN_CSS_PATH ?? this.config.loadingScreenCssPath;
    this.config.primaryLogoPath = process.env.PRIMARY_LOGO_PATH ?? envVars.PRIMARY_LOGO_PATH ?? this.config.primaryLogoPath;
    this.config.secondaryLogoPath = process.env.SECONDARY_LOGO_PATH ?? envVars.SECONDARY_LOGO_PATH ?? this.config.secondaryLogoPath;
    this.config.mode = (process.env.MODE ?? envVars.MODE ?? this.config.mode ?? 'development') as 'development' | 'production' | 'none';

    // Parse isPro as boolean
    const isPro = process.env.IS_PRO ?? envVars.IS_PRO;

    this.config.PUBLIC_SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? envVars.PUBLIC_SUPABASE_URL;
    this.config.PUBLIC_SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY ?? envVars.PUBLIC_SUPABASE_ANON_KEY;

    this.config.isPro = isPro === 'true';
  }

  /**
   * Applies process.env overrides on top of profile config (for CI/CD)
   */
  private applyProcessEnvOverrides_(): void {
    if (process.env.SETTINGS_PATH) {
      this.config.settingsPath = process.env.SETTINGS_PATH;
    }
    if (process.env.FAVICON_PATH) {
      this.config.favIconPath = process.env.FAVICON_PATH;
    }
    if (process.env.TEXT_LOGO_PATH) {
      this.config.textLogoPath = process.env.TEXT_LOGO_PATH;
    }
    if (process.env.STYLE_CSS_PATH) {
      this.config.styleCssPath = process.env.STYLE_CSS_PATH;
    }
    if (process.env.LOADING_SCREEN_CSS_PATH) {
      this.config.loadingScreenCssPath = process.env.LOADING_SCREEN_CSS_PATH;
    }
    if (process.env.PRIMARY_LOGO_PATH) {
      this.config.primaryLogoPath = process.env.PRIMARY_LOGO_PATH;
    }
    if (process.env.SECONDARY_LOGO_PATH) {
      this.config.secondaryLogoPath = process.env.SECONDARY_LOGO_PATH;
    }
    if (process.env.MODE) {
      this.config.mode = process.env.MODE as BuildConfig['mode'];
    }
    if (process.env.IS_PRO) {
      this.config.isPro = process.env.IS_PRO === 'true';
    }
    if (process.env.PUBLIC_SUPABASE_URL) {
      this.config.PUBLIC_SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
    }
    if (process.env.PUBLIC_SUPABASE_ANON_KEY) {
      this.config.PUBLIC_SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
    }
  }

  /**
   * Logs the current configuration
   */
  private logConfiguration(): void {
    logWithStyle('Build Configuration:', ConsoleStyles.DEBUG);
    logWithStyle(`Mode: ${this.config.mode}`, ConsoleStyles.DEBUG);
    logWithStyle(`Watch: ${this.config.isWatch}`, ConsoleStyles.DEBUG);
    logWithStyle(`Settings path: ${this.config.settingsPath}`, ConsoleStyles.DEBUG);
    logWithStyle(`Favicon path: ${this.config.favIconPath}`, ConsoleStyles.DEBUG);
    logWithStyle(`Text logo path: ${this.config.textLogoPath}`, ConsoleStyles.DEBUG);
    logWithStyle(`Style CSS path: ${this.config.styleCssPath}`, ConsoleStyles.DEBUG);
    logWithStyle(`Loading screen CSS path: ${this.config.loadingScreenCssPath}`, ConsoleStyles.DEBUG);
    logWithStyle(`Primary logo path: ${this.config.primaryLogoPath}`, ConsoleStyles.DEBUG);
    logWithStyle(`Secondary logo path: ${this.config.secondaryLogoPath}`, ConsoleStyles.DEBUG);
    logWithStyle(`Pro features: ${this.config.isPro ? 'Enabled' : 'Disabled'}`, this.config.isPro ? ConsoleStyles.SUCCESS : ConsoleStyles.INFO);
  }
}
