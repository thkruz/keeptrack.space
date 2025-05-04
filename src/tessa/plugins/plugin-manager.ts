import { EventBus } from '../events/event-bus';
import { CoreEngineEvents } from '../events/event-types';
import { Plugin } from './plugin';

export class PluginManager {
  private readonly plugins: Map<string, Plugin> = new Map();

  constructor(private readonly eventBus: EventBus) {
    this.eventBus.on(CoreEngineEvents.Initialize, this.initializePlugins.bind(this));
  }

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with id ${plugin.id} already registered`);
    }

    this.plugins.set(plugin.id, plugin);
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);

    if (plugin) {
      plugin.stop();
      this.plugins.delete(pluginId);
    }
  }

  getPlugin<T extends Plugin>(pluginId: string): T | undefined {
    return this.plugins.get(pluginId) as T | undefined;
  }

  private async initializePlugins(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      // eslint-disable-next-line no-await-in-loop
      await plugin.initialize(this.eventBus);
      plugin.start();
    }
  }
}
