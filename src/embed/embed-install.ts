import { setProContentAllowed } from '../engine/core/pro-content-gate';
import type { PluginDescriptor } from '../plugins/plugin-descriptor';
import { pluginManifest } from '../plugins/plugin-manifest';
import { KeepTrackEmbed } from './embed-api';
import { catalogModeOf, mapEmbedConfigToSettings, readEmbedBootConfig, type SettingsOverrideLike } from './embed-boot';
import { KeepTrackEmbedEngine } from './embed-engine-impl';
import { type LicenseVerification, licenseWarning, verifyLicense } from './embed-license';
import { EMBED_API_VERSION, type EmbedConfig, type EmbedLicenseStatus } from './embed-types';

/**
 * Remove the Pro implementation from every plugin descriptor, so the plugin loader (which only takes
 * the Pro path when `descriptor.proImport` is set) skips Pro-only plugins and falls back to the open
 * implementation for plugins that have both. Returns the config keys that lost a Pro import.
 *
 * Pro plugins are the descriptors with a `proImport`. The embed always disables the login gate, so
 * this is the only thing keeping Pro plugins off for an unlicensed host.
 */
export function stripProPlugins(manifest: PluginDescriptor[]): string[] {
  const stripped: string[] = [];

  for (const descriptor of manifest) {
    if (descriptor.proImport) {
      descriptor.proImport = undefined;
      stripped.push(descriptor.configKey);
    }
  }

  return stripped;
}

export interface PrepareEmbedDeps {
  readConfig?: () => EmbedConfig | null;
  verify?: typeof verifyLicense;
  manifest?: PluginDescriptor[];
  isProBuild?: boolean;
  hostname?: string;
  warn?: (message: string) => void;
  setProContent?: (allowed: boolean) => void;
}

export interface PreparedEmbed {
  settingsOverride: SettingsOverrideLike | undefined;
  /** True when the SDK handed us a boot config. */
  isEmbedded: boolean;
  /**
   * Verify the license and, for the open edition in a Pro build, strip Pro plugins. Must settle before
   * KeepTrack.init() loads plugins. Never rejects.
   */
  resolveLicense: () => Promise<EmbedLicenseStatus>;
  /** Call after init() to expose window.keepTrackEmbed. */
  install: () => KeepTrackEmbed;
}

/**
 * Called from main.ts before KeepTrack.init(). Returns the settings override to boot with (the input
 * unchanged when not embedded).
 */
export function prepareEmbed(baseOverride: SettingsOverrideLike | undefined, deps: PrepareEmbedDeps = {}): PreparedEmbed {
  const config: EmbedConfig | null = (deps.readConfig ?? readEmbedBootConfig)();
  const settingsOverride = config ? mapEmbedConfigToSettings(config, baseOverride ?? {}) : baseOverride;
  const isProBuild = deps.isProBuild ?? __IS_PRO__;
  let license: EmbedLicenseStatus = { state: 'missing', edition: isProBuild ? 'pro' : 'open' };

  if (config?.apiVersion !== undefined && String(config.apiVersion).split('.')[0] !== EMBED_API_VERSION.split('.')[0]) {
    // eslint-disable-next-line no-console
    console.error(`[keepTrackEmbed] host requested API ${String(config.apiVersion)} but this build provides ${EMBED_API_VERSION}; booting anyway.`);
  }

  const resolveLicense = async (): Promise<EmbedLicenseStatus> => {
    if (!config) {
      return license;
    }
    let result: LicenseVerification;

    try {
      result = await (deps.verify ?? verifyLicense)(config.licenseKey, {
        hostname: deps.hostname ?? window.location.hostname,
        isProBuild,
      });
    } catch {
      result = { state: 'invalid', edition: 'open', reason: 'license verification failed' };
    }
    const { reason: _reason, ...status } = result;

    license = status;
    if (status.edition !== 'pro' && isProBuild) {
      stripProPlugins(deps.manifest ?? pluginManifest);
      // The hero-mesh and solar-system packs load outside the manifest; gate them the same way
      (deps.setProContent ?? setProContentAllowed)(false);
    }
    const warning = licenseWarning(result);

    if (warning) {
      (deps.warn ?? ((m: string) => console.warn(m)))(warning); // eslint-disable-line no-console
    }

    return license;
  };

  return {
    settingsOverride,
    isEmbedded: config !== null,
    resolveLicense,
    install: () => {
      const engine = new KeepTrackEmbedEngine(catalogModeOf(config));
      const api = new KeepTrackEmbed(engine, { config, license });

      window.keepTrackEmbed = api;
      api.start();

      return api;
    },
  };
}
