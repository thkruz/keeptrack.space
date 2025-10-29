// src/scripts/utils/pluginManager.ts
import { BuildError, ConsoleStyles, ErrorCodes, logWithStyle } from './build-error';
import { FileSystemManager } from './filesystem-manager';

interface PluginPathMapping {
  openSourcePath: string;
  proPath: string;
}

/**
 * Manages plugin configurations for different build modes
 */
export class PluginManager {
  private readonly fileManager: FileSystemManager;

  // Mapping of plugin paths for open source and pro versions
  /**
   * @private
   * A mapping of plugin identifiers to their respective source paths.
   *
   * 🚨 **IMPORTANT:** This is the central registry for all plugin paths!
   *
   * - To add a new **Pro** plugin, insert its entry here.
   * - Each plugin should have both `openSourcePath` and `proPath` specified.
   * - The `openSourcePath` is the path used to the empty plugin in the open source version.
   * - This ensures the plugin manager can correctly resolve and load plugins from the appropriate directories.
   *
   * **Add new Pro plugins here to make them available in the application.**
   */
  private readonly pluginPaths: Record<string, PluginPathMapping> = {
    'telemetry': {
      openSourcePath: '../plugins/telemetry/telemetry',
      proPath: '../plugins-pro/telemetry/telemetry',
    },
    'user-account': {
      openSourcePath: '../plugins/user-account/user-account',
      proPath: '../plugins-pro/user-account/user-account',
    },
    'about-menu': {
      openSourcePath: '../plugins/about-menu/about-menu',
      proPath: '../plugins-pro/about-menu/about-menu',
    },
    'sat-info-box-actions': {
      openSourcePath: '../plugins/sat-info-box-actions/sat-info-box-actions',
      proPath: '../plugins-pro/sat-info-box-actions/sat-info-box-actions',
    },
    'sat-inno-box-links': {
      openSourcePath: '../plugins/sat-info-box-links/sat-info-box-links',
      proPath: '../plugins-pro/sat-info-box-links/sat-info-box-links',
    },
    'sat-info-box-mission': {
      openSourcePath: '../plugins/sat-info-box-mission/sat-info-box-mission',
      proPath: '../plugins-pro/sat-info-box-mission/sat-info-box-mission',
    },
    'initial-orbit': {
      openSourcePath: '../plugins/initial-orbit/initial-orbit',
      proPath: '../plugins-pro/initial-orbit/initial-orbit',
    },
    'earth-atmosphere': {
      openSourcePath: '../plugins/earth-atmosphere/earth-atmosphere',
      proPath: '../plugins-pro/earth-atmosphere/earth-atmosphere',
    },
    debug: {
      openSourcePath: '../plugins/debug/debug',
      proPath: '../plugins-pro/debug/debug',
    },
    astronomy: {
      openSourcePath: '../plugins/astronomy/astronomy',
      proPath: '../plugins-pro/astronomy/astronomy',
    },
    planetarium: {
      openSourcePath: '../plugins/planetarium/planetarium',
      proPath: '../plugins-pro/planetarium/planetarium',
    },
    maneuver: {
      openSourcePath: '../plugins/maneuver/maneuver',
      proPath: '../plugins-pro/maneuver/maneuver',
    },
    'graphics-menu': {
      openSourcePath: '../plugins/graphics-menu/graphics-menu',
      proPath: '../plugins-pro/graphics-menu/graphics-menu',
    },
    'oem-reader': {
      openSourcePath: '../plugins/oem-reader/oem-reader',
      proPath: '../plugins-pro/oem-reader/oem-reader',
    },
    'user-account': {
      openSourcePath: '../plugins/user-account/user-account',
      proPath: '../plugins-pro/user-account/user-account',
    },
    'telemetry': {
      openSourcePath: '../plugins/telemetry/telemetry',
      proPath: '../plugins-pro/telemetry/telemetry',
    },
  };

  constructor(fileManager: FileSystemManager) {
    this.fileManager = fileManager;
  }

  /**
   * Configures plugins based on build mode
   * @param isPro Whether to enable pro features
   */
  public configurePlugins(isPro: boolean): void {
    try {
      const pluginsFile = 'src/plugins/plugins.ts';
      let pluginsContent = this.fileManager.readFile(pluginsFile);

      if (isPro) {
        logWithStyle('Enabling pro plugins', ConsoleStyles.SUCCESS);
        pluginsContent = this.enableProPlugins(pluginsContent);
      } else {
        logWithStyle('Using open source plugins', ConsoleStyles.INFO);
        pluginsContent = this.enableOpenSourcePlugins(pluginsContent);
      }

      this.fileManager.writeFile(pluginsFile, pluginsContent);
    } catch (error) {
      if (error instanceof BuildError) {
        throw error;
      }
      throw new BuildError(
        `Failed to configure plugins: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.PLUGIN_CONFIG,
      );
    }
  }

  /**
   * Enables pro plugins by updating import paths
   * @param pluginsContent The plugins file content
   * @returns Updated content with pro plugin paths
   */
  private enableProPlugins(pluginsContent: string): string {
    let updatedContent = pluginsContent;

    // Update each plugin path to use the pro version
    Object.entries(this.pluginPaths).forEach(([pluginName, paths]) => {
      const { openSourcePath, proPath } = paths;

      // Replace open source path with pro path if it exists in the content
      const pattern = new RegExp(`'${this.escapeRegExp(openSourcePath)}'`, 'gu');

      if (pattern.test(updatedContent)) {
        updatedContent = updatedContent.replace(pattern, `'${proPath}'`);
        logWithStyle(`Replaced ${pluginName} plugin path with pro version`, ConsoleStyles.SUCCESS);
      }
    });

    return updatedContent;
  }

  /**
   * Enables open source plugins by updating import paths
   * @param pluginsContent The plugins file content
   * @returns Updated content with open source plugin paths
   */
  private enableOpenSourcePlugins(pluginsContent: string): string {
    let updatedContent = pluginsContent;

    // Update each plugin path to use the open source version
    Object.entries(this.pluginPaths).forEach(([pluginName, paths]) => {
      const { openSourcePath, proPath } = paths;

      // Replace pro path with open source path if it exists in the content
      const pattern = new RegExp(`'${this.escapeRegExp(proPath)}'`, 'gu');

      if (pattern.test(updatedContent)) {
        updatedContent = updatedContent.replace(pattern, `'${openSourcePath}'`);
        logWithStyle(`Replaced ${pluginName} plugin path with open source version`, ConsoleStyles.INFO);
      }
    });

    return updatedContent;
  }

  /**
   * Escapes special characters in a string for use in a regular expression
   * @param string The string to escape
   * @returns The escaped string
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  }
}
