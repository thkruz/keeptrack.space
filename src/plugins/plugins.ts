import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { KeepTrackPlugin } from '../engine/plugins/base-plugin';
import { errorManagerInstance } from '../engine/utils/errorManager';
import { getEl } from '../engine/utils/get-el';
import type { KeepTrackPluginsConfiguration } from './keeptrack-plugins-configuration';
import type { PluginDescriptor } from './plugin-descriptor';
import { pluginManifest } from './plugin-manifest';

interface ResolvedPlugin {
  mod: Record<string, unknown>;
  usedPro: boolean;
}

export class PluginManager {
  /**
   * Download a plugin module without initializing it.
   * Tries the pro import first when IS_PRO=true, falls back to OSS.
   */
  private static async resolveModule_(descriptor: PluginDescriptor): Promise<ResolvedPlugin | null> {
    if (__IS_PRO__ && descriptor.proImport) {
      try {
        return { mod: await descriptor.proImport(), usedPro: true };
      } catch {
        /* fall through to OSS */
      }
    }

    if (!descriptor.ossImport) {
      return null;
    }

    return { mod: await descriptor.ossImport(), usedPro: false };
  }

  /**
   * Instantiate and initialize a plugin from an already-resolved module.
   */
  private static initPlugin_(descriptor: PluginDescriptor, resolved: ResolvedPlugin): void {
    const className = resolved.usedPro ? (descriptor.proClassName ?? descriptor.ossClassName) : descriptor.ossClassName;

    if (!className) {
      return;
    }

    const PluginClass = resolved.mod[className] as new () => KeepTrackPlugin;
    const plugin = new PluginClass();

    if (descriptor.isLoginRequired && resolved.usedPro) {
      plugin.isLoginRequired = true;
    }

    plugin.init();
  }

  async loadPlugins(plugins: KeepTrackPluginsConfiguration): Promise<void> {
    if (isThisNode()) {
      // Don't load plugins when running Jest in Node environment
      return;
    }

    plugins ??= <KeepTrackPluginsConfiguration>{};
    try {
      // Build list of enabled descriptors
      const enabledDescriptors: PluginDescriptor[] = [];

      for (const descriptor of pluginManifest) {
        const config = descriptor.alwaysEnabled ? { enabled: true } : (plugins as Record<string, { enabled: boolean } | undefined>)[descriptor.configKey];

        if (config?.enabled) {
          enabledDescriptors.push(descriptor);
        }
      }

      // Phase 1: Download all plugin modules in parallel
      const resolvedModules = await Promise.all(
        enabledDescriptors.map((descriptor) =>
          PluginManager.resolveModule_(descriptor).catch((e) => {
            errorManagerInstance.warn(`Error downloading plugin ${descriptor.configKey}: ${(e as Error).message}`);

            return null;
          })
        )
      );

      // Phase 2: Initialize sequentially in manifest order (preserves dependency checks)
      for (let i = 0; i < enabledDescriptors.length; i++) {
        const resolved = resolvedModules[i];

        if (!resolved) {
          continue;
        }

        try {
          PluginManager.initPlugin_(enabledDescriptors[i], resolved);
        } catch (e) {
          errorManagerInstance.warn(`Error initializing plugin ${enabledDescriptors[i].configKey}: ${(e as Error).message}`);
        }
      }

      if (!plugins.TopMenu) {
        // Set --nav-bar-height of :root to 0px if topMenu is not enabled and ensure it overrides any other value
        document.documentElement.style.setProperty('--nav-bar-height', '0px');
      }

      // Load any settings from local storage after all plugins are loaded
      EventBus.getInstance().emit(EventBusEvent.loadSettings);

      EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
        this.uiManagerFinal_();
        KeepTrackPlugin.hideUnusedMenuModes();
      });
    } catch (e) {
      errorManagerInstance.info(`Error loading core plugins: ${(e as Error).message}`);
    }
  }

  private uiManagerFinal_(): void {
    const bicDom = getEl('bottom-icons-container');

    if (bicDom) {
      const bottomHeight = bicDom.offsetHeight;

      document.documentElement.style.setProperty('--bottom-menu-height', `${bottomHeight}px`);
    } else {
      document.documentElement.style.setProperty('--bottom-menu-height', '0px');
    }
  }
}
