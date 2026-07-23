/**
 * Catalog of deep-space satellites with their Chebyshev ephemeris data.
 * Add new entries here to register additional deep-space probes.
 * Coefficients are loaded at runtime from JSON files in public/data/ephemeris/.
 */
import { DeepSpaceDesignators } from '@app/app/data/deep-space-designators';
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
    sccNum: '10321',
    intlDes: '1977-084A',
  },
  {
    name: 'Voyager 2',
    color: PlanetColors.VOYAGER2,
    orbitalPeriod: (999 * 365.25 * 24 * 3600) as Seconds,
    meanDistanceToSun: (137 * KM_PER_AU) as Kilometers,
    dataFile: 'voyager-2.json',
    model: 'sat2',
    sccNum: '10271',
    intlDes: '1977-076A',
  },
  {
    name: 'Pioneer 10',
    color: PlanetColors.PIONEER10,
    orbitalPeriod: (999 * 365.25 * 24 * 3600) as Seconds,
    meanDistanceToSun: (140 * KM_PER_AU) as Kilometers,
    dataFile: 'pioneer-10.json',
    model: 'sat2',
    sccNum: '5860',
    intlDes: '1972-012A',
  },
  {
    name: 'Pioneer 11',
    color: PlanetColors.PIONEER11,
    orbitalPeriod: (999 * 365.25 * 24 * 3600) as Seconds,
    meanDistanceToSun: (117 * KM_PER_AU) as Kilometers,
    dataFile: 'pioneer-11.json',
    model: 'sat2',
    sccNum: '6421',
    intlDes: '1973-019A',
  },
  {
    name: 'New Horizons',
    color: PlanetColors.NEWHORIZONS,
    orbitalPeriod: (999 * 365.25 * 24 * 3600) as Seconds,
    meanDistanceToSun: (65 * KM_PER_AU) as Kilometers,
    dataFile: 'new-horizons.json',
    model: 'sat2',
    sccNum: '28928',
    intlDes: '2006-001A',
  },
];

// Make every probe with a designator reachable from ?sat=/?intldes= URLs.
// (The registry cannot import this module - see DeepSpaceDesignators.registerSeed.)
for (const config of DEEP_SPACE_SATELLITE_CONFIGS) {
  if (config.sccNum || config.intlDes) {
    DeepSpaceDesignators.registerSeed({
      kind: 'probe',
      displayName: config.name,
      bodyName: config.name,
      sccNum: config.sccNum,
      intlDes: config.intlDes,
    });
  }
}

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
