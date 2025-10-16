// Ensure imports are type only to avoid circular dependencies
import type { PluginConfiguration } from '../keeptrack-plugins-configuration';


export interface SatInfoBoxOrbitalConfiguration extends PluginConfiguration {
  isShowCovariance: boolean;
}

export const satInfoBoxOrbitalConfigurationDefaults: SatInfoBoxOrbitalConfiguration = {
  enabled: true,
  isShowCovariance: true,
};
