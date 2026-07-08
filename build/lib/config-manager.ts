/* eslint-disable no-process-env */
// src/scripts/utils/configManager.ts
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { BuildError, ConsoleStyles, ErrorCodes, logWithStyle } from './build-error';
import { ProfileLoader } from './profile-loader';

/** SGP4 propagator backend a build can default to. */
export type PropagatorBackend = 'sgp4' | 'sgp4-wasm' | 'sgp4-xp-wasm';

/** Valid PROPAGATOR_BACKEND values; anything else falls back to pure-TypeScript 'sgp4'. */
export const PROPAGATOR_BACKENDS: readonly PropagatorBackend[] = ['sgp4', 'sgp4-wasm', 'sgp4-xp-wasm'];

/**
 * Normalizes an untrusted PROPAGATOR_BACKEND string to a valid backend,
 * defaulting to 'sgp4' (the license-free pure-TypeScript propagator that every
 * edition can run).
 */
export const normalizePropagatorBackend = (value: string | undefined): PropagatorBackend =>
  (PROPAGATOR_BACKENDS as readonly string[]).includes(value ?? '') ? value as PropagatorBackend : 'sgp4';

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
  /** Build edition shown on the splash screen (e.g. 'oss', 'pro', 'celestrak', 'embed'). */
  edition: string;
  /** Path to the env file for dotenv-webpack (relative to project root). Defaults to '.env'. */
  envFilePath: string;
  /**
   * SGP4 backend this build defaults to (overridable at runtime via
   * settingsManager.propagatorBackend). Set per profile via PROPAGATOR_BACKEND.
   * OSS defaults to 'sgp4' (pure TypeScript); Pro selects a wasm build.
   */
  propagatorBackend: PropagatorBackend;

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
      edition: 'oss',
      envFilePath: '.env',
      propagatorBackend: 'sgp4',
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
        this.loadProfileConfig_(rootDir);
      } else {
        this.loadLegacyConfig_();
      }

      /*
       * Only Pro builds bundle the license-restricted Sgp4Prop wasm artifacts,
       * so a non-Pro build must always default to pure-TypeScript 'sgp4' (a
       * clean fallback, no missing-artifact warning). Pro clamps any
       * profile/env-supplied value to a known backend.
       */
      this.config.propagatorBackend = this.config.isPro
        ? normalizePropagatorBackend(this.config.propagatorBackend)
        : 'sgp4';

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
   * Profile mode: load from configs/<name>/.
   * @param rootDir Project root directory (for resolving profile paths)
   */
  private loadProfileConfig_(rootDir?: string): void {
    const profileLoader = new ProfileLoader(rootDir ?? process.cwd());
    const errors = profileLoader.validateProfile(this.profileName_!);

    if (errors.length > 0) {
      throw new BuildError(
        `Profile validation failed:\n  ${errors.join('\n  ')}`,
        ErrorCodes.PROFILE_NOT_FOUND,
      );
    }

    // Snapshot OS-level process.env BEFORE dotenv pollutes it. Only true OS
    // env vars (set by CI/CD or the shell) should be allowed to override
    // profile config; values loaded from the root .env must not silently
    // override profile paths (the legacy .env still defines SETTINGS_PATH,
    // STYLE_CSS_PATH, etc., which would otherwise clobber the profile).
    const osEnv: NodeJS.ProcessEnv = { ...process.env };

    const profileOverrides = profileLoader.loadProfile(this.profileName_!);

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

    // Apply only OS-level env overrides (CI/CD), using the pre-dotenv snapshot
    // so .env file values cannot silently override profile config.
    this.applyProcessEnvOverrides_(osEnv);
  }

  /**
   * Legacy mode: load from .env file.
   */
  private loadLegacyConfig_(): void {
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
    this.config.edition = process.env.EDITION ?? envVars.EDITION ?? (this.config.isPro ? 'pro' : 'oss');
    this.config.propagatorBackend = normalizePropagatorBackend(process.env.PROPAGATOR_BACKEND ?? envVars.PROPAGATOR_BACKEND);
  }

  /**
   * Applies env overrides on top of profile config (for CI/CD).
   * Must be passed a snapshot of process.env taken BEFORE dotenv.config calls,
   * so .env file values don't silently override profile config — only true
   * OS-level env vars do.
   */
  private applyProcessEnvOverrides_(env: NodeJS.ProcessEnv): void {
    if (env.SETTINGS_PATH) {
      this.config.settingsPath = env.SETTINGS_PATH;
    }
    if (env.FAVICON_PATH) {
      this.config.favIconPath = env.FAVICON_PATH;
    }
    if (env.TEXT_LOGO_PATH) {
      this.config.textLogoPath = env.TEXT_LOGO_PATH;
    }
    if (env.STYLE_CSS_PATH) {
      this.config.styleCssPath = env.STYLE_CSS_PATH;
    }
    if (env.LOADING_SCREEN_CSS_PATH) {
      this.config.loadingScreenCssPath = env.LOADING_SCREEN_CSS_PATH;
    }
    if (env.PRIMARY_LOGO_PATH) {
      this.config.primaryLogoPath = env.PRIMARY_LOGO_PATH;
    }
    if (env.SECONDARY_LOGO_PATH) {
      this.config.secondaryLogoPath = env.SECONDARY_LOGO_PATH;
    }
    if (env.MODE) {
      this.config.mode = env.MODE as BuildConfig['mode'];
    }
    if (env.IS_PRO) {
      this.config.isPro = env.IS_PRO === 'true';
    }
    if (env.EDITION) {
      this.config.edition = env.EDITION;
    }
    if (env.PROPAGATOR_BACKEND) {
      this.config.propagatorBackend = normalizePropagatorBackend(env.PROPAGATOR_BACKEND);
    }
    if (env.PUBLIC_SUPABASE_URL) {
      this.config.PUBLIC_SUPABASE_URL = env.PUBLIC_SUPABASE_URL;
    }
    if (env.PUBLIC_SUPABASE_ANON_KEY) {
      this.config.PUBLIC_SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY;
    }
  }

  /**
   * Logs the current configuration
   */
  private logConfiguration(): void {
    /*
     * Asset paths and mode can be supplied via environment variables / profiles, so we
     * must not echo their raw values into build output that CI may capture. Instead we log
     * non-sensitive, re-derived indicators: a 'set'/'default' flag per path and the mode as
     * a fixed literal. These helpers return constant strings, so the env-tainted values
     * never reach the log sink (CodeQL js/clear-text-logging).
     */
    const flag = (value?: string): string => (typeof value === 'string' && value.length > 0 ? 'set' : 'default');
    let safeMode: 'development' | 'production' | 'none' = 'development';

    if (this.config.mode === 'production') {
      safeMode = 'production';
    } else if (this.config.mode === 'none') {
      safeMode = 'none';
    }

    logWithStyle('Build Configuration:', ConsoleStyles.DEBUG);
    logWithStyle(`Mode: ${safeMode}`, ConsoleStyles.DEBUG);
    logWithStyle(`Watch: ${this.config.isWatch}`, ConsoleStyles.DEBUG);
    logWithStyle(`Settings path: ${flag(this.config.settingsPath)}`, ConsoleStyles.DEBUG);
    logWithStyle(`Favicon path: ${flag(this.config.favIconPath)}`, ConsoleStyles.DEBUG);
    logWithStyle(`Text logo path: ${flag(this.config.textLogoPath)}`, ConsoleStyles.DEBUG);
    logWithStyle(`Style CSS path: ${flag(this.config.styleCssPath)}`, ConsoleStyles.DEBUG);
    logWithStyle(`Loading screen CSS path: ${flag(this.config.loadingScreenCssPath)}`, ConsoleStyles.DEBUG);
    logWithStyle(`Primary logo path: ${flag(this.config.primaryLogoPath)}`, ConsoleStyles.DEBUG);
    logWithStyle(`Secondary logo path: ${flag(this.config.secondaryLogoPath)}`, ConsoleStyles.DEBUG);
    logWithStyle(`Pro features: ${this.config.isPro ? 'Enabled' : 'Disabled'}`, ConsoleStyles.DEBUG);
  }
}
