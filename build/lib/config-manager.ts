/* eslint-disable no-process-env */
// src/scripts/utils/configManager.ts
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { BuildError, ConsoleStyles, ErrorCodes, logWithStyle } from './build-error';

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
  isPro: boolean;

  PUBLIC_SUPABASE_URL?: string;
  PUBLIC_SUPABASE_ANON_KEY?: string;
}

/**
 * Loads and manages the build configuration
 */
export class ConfigManager {
  private config: BuildConfig;

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
      primaryLogoPath: 'public/img/logo-primary.png',
      secondaryLogoPath: 'public/img/logo-secondary.png',
      isPro: false,
    };
  }

  /**
   * Loads configuration from environment variables and command line arguments
   * @param args Command line arguments
   * @returns The build configuration
   */
  public loadConfig(args: string[]): BuildConfig {
    try {
      // Load environment variables from .env file if it exists
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

      // Process command line arguments
      this.parseCommandLineArgs(args);

      // Load environment variables (environment variables take precedence over .env)
      this.loadEnvironmentVariables(envConfig.parsed || {});

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
   * Parses command line arguments
   * @param args Command line arguments
   */
  private parseCommandLineArgs(args: string[]): void {
    // Parse build mode
    if (args.length > 0) {
      const mode = args[0];

      if (mode !== 'none' && mode !== 'development' && mode !== 'production') {
        throw new BuildError(
          `Invalid build mode: ${mode}. Use "none", "development", or "production".`,
          ErrorCodes.INVALID_MODE,
        );
      }
      this.config.mode = mode;
    }

    // Parse watch flag
    if (args.length > 1) {
      this.config.isWatch = args[1] === '--watch';
    }
  }

  /**
   * Loads configuration from environment variables
   * @param envVars Environment variables from .env file
   */
  private loadEnvironmentVariables(envVars: Record<string, string>): void {
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
