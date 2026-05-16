// Ensure imports are type only to avoid circular dependencies
import type { PluginConfiguration } from '../keeptrack-plugins-configuration';


export interface SatInfoBoxObjectConfiguration extends PluginConfiguration {
  isShowStdMag: boolean;
  isShowAppMag: boolean;
  isEstimateRcs: boolean;
  isShowConfiguration: boolean;
  isShowLaunchVehicle: boolean;
  isShowAltName: boolean;
}

export const satInfoBoxObjectConfigurationDefaults: SatInfoBoxObjectConfiguration = {
  enabled: true,
  isShowStdMag: true,
  isShowAppMag: true,
  isEstimateRcs: true,
  isShowConfiguration: true,
  isShowLaunchVehicle: true,
  isShowAltName: true,
};
