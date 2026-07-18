/**
 * Catalog of deep-space satellites with their Chebyshev ephemeris data.
 * Add new entries here to register additional deep-space probes.
 * Coefficients are loaded at runtime from JSON files in public/data/ephemeris/.
 */
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { Kilometers, Seconds } from '@ootk/src/main';
import { KM_PER_AU } from 'astronomy-engine';
import { PlanetColors } from './celestial-body';
import { DeepSpaceSatellite, DeepSpaceSatelliteConfig, loadChebyshevJson } from './deep-space-satellite';

export const DEEP_SPACE_SATELLITE_CONFIGS: DeepSpaceSatelliteConfig[] = [
  {
    name: 'Voyager 1',
    color: PlanetColors.VOYAGER1,
    orbitalPeriod: (999 * 365.25 * 24 * 3600) as Seconds,
    meanDistanceToSun: (163 * KM_PER_AU) as Kilometers,
    dataFile: 'voyager-1.json',
    model: 'sat2',
  },
  // Future: Voyager 2, Pioneer 10, Pioneer 11, New Horizons, etc.
];

/** Synchronously creates satellite objects (without coefficient data). */
export function createDeepSpaceSatellites(): Record<string, DeepSpaceSatellite> {
  const result: Record<string, DeepSpaceSatellite> = {};

  for (const config of DEEP_SPACE_SATELLITE_CONFIGS) {
    result[config.name] = new DeepSpaceSatellite(config);
  }

  return result;
}

/** Fetches coefficient data for all deep-space satellites and sets their interpolators. */
export async function loadDeepSpaceSatelliteData(satellites: Record<string, DeepSpaceSatellite>): Promise<void> {
  await Promise.all(
    DEEP_SPACE_SATELLITE_CONFIGS.map(async (config) => {
      try {
        const coefficients = await loadChebyshevJson(config.dataFile);

        satellites[config.name].setCoefficients(coefficients);
      } catch {
        errorManagerInstance.log(`Failed to load ephemeris for ${config.name}, skipping`);
        delete satellites[config.name];
      }
    })
  );
}
