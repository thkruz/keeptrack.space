import { existsSync } from 'fs';
import { BuildConfig } from './config-manager';
import { BuildError, ConsoleStyles, ErrorCodes, logWithStyle } from './build-error';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates build configuration and environment
 */
export class BuildValidator {
  /**
   * Validates the build configuration
   * @param config Build configuration to validate
   * @returns Validation result
   */
  static validate(config: BuildConfig): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    logWithStyle('Validating build configuration...', ConsoleStyles.INFO);

    // Validate mode
    this.validateMode(config, result);

    // Validate file paths
    this.validateFilePaths(config, result);

    // Validate dependencies
    this.validateDependencies(result);

    // Validate environment variables for pro builds
    if (config.isPro) {
      this.validateProEnvironment(config, result);
    }

    // Print results
    if (result.warnings.length > 0) {
      logWithStyle('\nValidation Warnings:', ConsoleStyles.WARNING);
      result.warnings.forEach((warning) => {
        logWithStyle(`  ⚠ ${warning}`, ConsoleStyles.WARNING);
      });
    }

    if (result.errors.length > 0) {
      result.valid = false;
      logWithStyle('\nValidation Errors:', ConsoleStyles.ERROR);
      result.errors.forEach((error) => {
        logWithStyle(`  ✗ ${error}`, ConsoleStyles.ERROR);
      });
    } else {
      logWithStyle('✓ Build configuration is valid', ConsoleStyles.SUCCESS);
    }

    return result;
  }

  /**
   * Validates the build mode
   */
  private static validateMode(config: BuildConfig, result: ValidationResult): void {
    const validModes = ['development', 'production', 'none'];

    if (!validModes.includes(config.mode)) {
      result.errors.push(`Invalid build mode: ${config.mode}. Must be one of: ${validModes.join(', ')}`);
    }
  }

  /**
   * Validates file paths in configuration
   */
  private static validateFilePaths(config: BuildConfig, result: ValidationResult): void {
    const filesToCheck = [
      { path: config.styleCssPath, name: 'Style CSS' },
      { path: config.loadingScreenCssPath, name: 'Loading Screen CSS' },
    ];

    // Only check optional files if they're specified and not default
    const optionalFiles = [
      { path: config.textLogoPath, name: 'Text Logo', isDefault: config.textLogoPath === 'public/img/logo.png' },
      { path: config.primaryLogoPath, name: 'Primary Logo', isDefault: config.primaryLogoPath === 'public/img/logo-primary.png' },
      { path: config.secondaryLogoPath, name: 'Secondary Logo', isDefault: config.secondaryLogoPath === 'public/img/logo-secondary.png' },
      { path: config.favIconPath, name: 'Favicon', isDefault: config.favIconPath === 'public/img/favicons/favicon.ico' },
      { path: config.settingsPath, name: 'Settings Override', isDefault: config.settingsPath === 'public/settings/settingsOverride.js' },
    ];

    // Check required files
    filesToCheck.forEach(({ path, name }) => {
      if (!existsSync(path)) {
        result.errors.push(`${name} file not found: ${path}`);
      }
    });

    // Check optional files (only warn if custom path is set but file doesn't exist)
    optionalFiles.forEach(({ path, name, isDefault }) => {
      if (!isDefault && !existsSync(path)) {
        result.warnings.push(`Custom ${name} file not found: ${path} (will use default)`);
      }
    });
  }

  /**
   * Validates required dependencies
   */
  private static validateDependencies(result: ValidationResult): void {
    const requiredFiles = [
      'package.json',
      'tsconfig.build.json',
      'src/main.ts',
      'src/webworker/positionCruncher.ts',
      'src/webworker/orbitCruncher.ts',
      'public/index.html',
    ];

    requiredFiles.forEach((file) => {
      if (!existsSync(file)) {
        result.errors.push(`Required file missing: ${file}`);
      }
    });

    // Check for node_modules
    if (!existsSync('node_modules')) {
      result.errors.push('node_modules directory not found. Run npm install first.');
    }
  }

  /**
   * Validates pro environment variables
   */
  private static validateProEnvironment(config: BuildConfig, result: ValidationResult): void {
    if (!config.PUBLIC_SUPABASE_URL) {
      result.warnings.push('PUBLIC_SUPABASE_URL not set for pro build');
    }

    if (!config.PUBLIC_SUPABASE_ANON_KEY) {
      result.warnings.push('PUBLIC_SUPABASE_ANON_KEY not set for pro build');
    }

    // Check for pro source files
    const proFiles = [
      'src/plugins-pro',
    ];

    proFiles.forEach((file) => {
      if (!existsSync(file)) {
        result.warnings.push(`Pro features enabled but ${file} not found`);
      }
    });
  }

  /**
   * Validates that the build can proceed
   * Throws BuildError if validation fails
   */
  static validateOrThrow(config: BuildConfig): void {
    const result = this.validate(config);

    if (!result.valid) {
      throw new BuildError(
        `Build validation failed with ${result.errors.length} error(s)`,
        ErrorCodes.ENV_CONFIG,
      );
    }
  }
}
