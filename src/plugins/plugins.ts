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

/** Where users can learn more about KeepTrack Pro. Matches the URL the README references. */
const LEARN_MORE_URL = 'https://keeptrack.space';

export class PluginManager {
  /**
   * Download a plugin module without initializing it.
   * Tries the pro import first when IS_PRO=true, falls back to OSS.
   */
  private static async resolveModule_(descriptor: PluginDescriptor): Promise<ResolvedPlugin | null> {
    if (__IS_PRO__ && descriptor.proImport) {
      try {
        return { mod: await descriptor.proImport(), usedPro: true };
      } catch (e) {
        // Fall through to OSS below; this block only explains what happened.
        // TODO: localize
        const consequence = descriptor.ossImport ? 'Loading the standard version instead.' : 'This feature will be unavailable this session.';

        errorManagerInstance.warn(
          `The Pro version of the "${descriptor.configKey}" plugin failed to load (${(e as Error).message}). ${consequence} ` +
            `This build includes KeepTrack Pro, so the src/plugins-pro files may be missing, out of date, or unreachable. Learn more at ${LEARN_MORE_URL}.`
        );
      }
    }

    if (!descriptor.ossImport) {
      return null;
    }

    return { mod: await descriptor.ossImport(), usedPro: false };
  }

  /**
   * Explain, once, which enabled Pro-only plugins were skipped because this build
   * does not include KeepTrack Pro. That is the normal, expected state for the
   * open-source build (the same stance scripts/pro.ts takes for the Pro tooling),
   * so this is an informational console message rather than a warning or toast.
   */
  private static explainSkippedProPlugins_(descriptors: PluginDescriptor[], resolvedModules: (ResolvedPlugin | null)[]): void {
    const skippedProFeatures = descriptors
      .filter(
        (descriptor, i) =>
          resolvedModules[i] === null &&
          !descriptor.ossImport &&
          // proImport is undefined in builds without Pro (compile-time ternary in the
          // manifest), so proClassName is what still identifies a Pro-only descriptor.
          // When proImport IS defined, the resolver's catch already warned about it.
          !descriptor.proImport &&
          descriptor.proClassName
      )
      .map((descriptor) => descriptor.configKey);

    if (skippedProFeatures.length === 0) {
      return;
    }

    // TODO: localize
    // eslint-disable-next-line no-console
    console.info(
      `KeepTrack: ${skippedProFeatures.length} ${skippedProFeatures.length === 1 ? 'plugin is' : 'plugins are'} part of KeepTrack Pro and not included in this open-source build: ` +
        `${skippedProFeatures.join(', ')}. The app runs normally without them. Learn more at ${LEARN_MORE_URL}.`
    );
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
            // TODO: localize
            errorManagerInstance.warn(
              `The "${descriptor.configKey}" plugin failed to download (${(e as Error).message}) and will be unavailable this session. ` +
                'This is usually a network interruption; reloading the page will retry it.'
            );

            return null;
          })
        )
      );

      PluginManager.explainSkippedProPlugins_(enabledDescriptors, resolvedModules);

      // Phase 2: Initialize sequentially in manifest order (preserves dependency checks)
      for (let i = 0; i < enabledDescriptors.length; i++) {
        const resolved = resolvedModules[i];

        if (!resolved) {
          continue;
        }

        try {
          PluginManager.initPlugin_(enabledDescriptors[i], resolved);
        } catch (e) {
          // TODO: localize
          errorManagerInstance.warn(`The "${enabledDescriptors[i].configKey}" plugin failed to initialize (${(e as Error).message}) and will be unavailable this session.`);
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
      // TODO: localize
      errorManagerInstance.info(`Plugin loading stopped early (${(e as Error).message}). Some features may be missing; reloading the page will retry.`);
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
