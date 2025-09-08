import { Constructor } from '@app/engine/core/interfaces';
import { KeepTrackPlugin } from '../plugins/base-plugin';

export class PluginRegistry {
  private static readonly instance_ = new PluginRegistry();

  loadedPlugins = <KeepTrackPlugin[]>[];

  /** Method for unregistering all plugins during testing */
  static unregisterAllPlugins() {
    this.instance_.loadedPlugins = [];
  }

  static getPlugin<T extends KeepTrackPlugin>(pluginClass: Constructor<T>): T | null {
    if (this.instance_.loadedPlugins.some((plugin: KeepTrackPlugin) => plugin instanceof pluginClass)) {
      return this.instance_.loadedPlugins.find((plugin: KeepTrackPlugin) => plugin instanceof pluginClass) as T;
    }

    return null;
  }

  static addPlugin(plugin: KeepTrackPlugin) {
    if (this.instance_.loadedPlugins.some((p: KeepTrackPlugin) => p.id === plugin.id)) {
      throw new Error(`Plugin with id ${plugin.id} is already registered.`);
    }

    this.instance_.loadedPlugins.push(plugin);
  }

  /**
   * Checks if a plugin with the given name is loaded
   * We use the id instead of the class name to avoid issues with minification
   */
  static checkIfLoaded(pluginName: string): boolean {
    return !!this.instance_.loadedPlugins.find((plugin) => plugin.id === pluginName);
  }

  /**
   * Retrieves a plugin by its name.
   *
   * This is for debugging from the console and should not be used in production.
   * @deprecated
   *
   * @param pluginName - The name of the plugin to retrieve.
   * @returns The plugin with the specified name, or null if not found.
   */
  static getPluginByName<T extends KeepTrackPlugin>(pluginName: string): T | null {
    if (this.instance_.loadedPlugins.some((plugin: KeepTrackPlugin) => plugin.id === pluginName)) {
      return this.instance_.loadedPlugins.find((plugin: KeepTrackPlugin) => plugin.id === pluginName) as T;
    }

    return null;
  }
}
