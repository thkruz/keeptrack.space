/**
 * Expanded Russia impact-point catalogs for the missile simulator's target dropdown:
 * major Russian military installations and the 50 most populous Russian cities.
 *
 * Mirrors the US lists in `us-targets.ts` (literal proper names + decimal-degree
 * WGS84 coordinates; only the group headers are localized). Military entries cover
 * the well-documented strategic sites - Strategic Missile Forces (RVSN) divisions,
 * Long-Range Aviation air bases, fleet bases, and test/launch ranges.
 */

import type { GeoTarget } from './us-targets';

/** Major active Russian military installations, grouped by service then alphabetically. */
export const RUSSIA_MILITARY_BASES: readonly GeoTarget[] = [
  // Strategic Missile Forces (RVSN)
  { name: 'Barnaul Missile Division', lat: 53.36, lon: 83.76 },
  { name: 'Dombarovsky (Yasny) Missile Base', lat: 51.1, lon: 59.85 },
  { name: 'Irkutsk Missile Division', lat: 52.6, lon: 104.2 },
  { name: 'Kozelsk Missile Division', lat: 54.03, lon: 35.77 },
  { name: 'Nizhny Tagil Missile Division', lat: 57.9, lon: 60.0 },
  { name: 'Novosibirsk Missile Division', lat: 55.1, lon: 83.0 },
  { name: 'Tatishchevo Missile Division', lat: 51.66, lon: 45.55 },
  { name: 'Teykovo Missile Division', lat: 56.86, lon: 40.53 },
  { name: 'Uzhur Missile Division', lat: 55.3, lon: 89.8 },
  { name: 'Vypolzovo (Bologoye) Missile Division', lat: 57.9, lon: 33.6 },
  { name: 'Yoshkar-Ola Missile Division', lat: 56.63, lon: 47.89 },

  // Aerospace Forces (VKS) air bases
  { name: 'Baltimor Air Base (Voronezh)', lat: 51.7, lon: 39.16 },
  { name: 'Belaya Air Base', lat: 52.91, lon: 103.57 },
  { name: 'Besovets Air Base (Petrozavodsk)', lat: 61.88, lon: 34.15 },
  { name: 'Chkalovsky Air Base', lat: 55.88, lon: 38.06 },
  { name: 'Diaghilevo Air Base (Ryazan)', lat: 54.64, lon: 39.58 },
  { name: 'Engels-2 Air Base', lat: 51.48, lon: 46.21 },
  { name: 'Khotilovo Air Base', lat: 57.79, lon: 34.03 },
  { name: 'Kubinka Air Base', lat: 55.61, lon: 36.65 },
  { name: 'Lipetsk Air Base', lat: 52.7, lon: 39.53 },
  { name: 'Millerovo Air Base', lat: 48.95, lon: 40.3 },
  { name: 'Morozovsk Air Base', lat: 48.31, lon: 41.79 },
  { name: 'Olenya Air Base', lat: 68.15, lon: 33.46 },
  { name: 'Privolzhsky Air Base (Astrakhan)', lat: 46.29, lon: 48.06 },
  { name: 'Savasleyka Air Base', lat: 55.46, lon: 42.33 },
  { name: 'Shaykovka Air Base', lat: 54.23, lon: 34.37 },
  { name: 'Ukrainka Air Base', lat: 51.17, lon: 128.45 },

  // Navy
  { name: 'Baltiysk Naval Base', lat: 54.65, lon: 19.91 },
  { name: 'Gadzhiyevo Submarine Base', lat: 69.25, lon: 33.33 },
  { name: 'Kaspiysk Naval Base', lat: 42.88, lon: 47.64 },
  { name: 'Kronstadt Naval Base', lat: 59.99, lon: 29.77 },
  { name: 'Novorossiysk Naval Base', lat: 44.72, lon: 37.79 },
  { name: 'Polyarny Naval Base', lat: 69.2, lon: 33.45 },
  { name: 'Sevastopol Naval Base', lat: 44.62, lon: 33.53 },
  { name: 'Severomorsk Naval Base', lat: 69.07, lon: 33.42 },
  { name: 'Vilyuchinsk Submarine Base', lat: 52.93, lon: 158.4 },
  { name: 'Vladivostok Naval Base', lat: 43.11, lon: 131.87 },

  // Army & test/launch ranges
  { name: 'Alabino Training Ground', lat: 55.42, lon: 36.85 },
  { name: 'Kadamovsky Range (Rostov)', lat: 47.6, lon: 40.5 },
  { name: 'Kapustin Yar Test Range', lat: 48.57, lon: 45.73 },
  { name: 'Mulino Training Ground', lat: 56.28, lon: 43.13 },
  { name: 'Plesetsk Cosmodrome', lat: 62.93, lon: 40.57 },
];

/**
 * The 50 most populous Russian cities, ordered by population. Coordinates are the
 * city center in decimal degrees.
 */
export const RUSSIA_LARGEST_CITIES: readonly GeoTarget[] = [
  { name: 'Moscow', lat: 55.75, lon: 37.62 },
  { name: 'Saint Petersburg', lat: 59.94, lon: 30.31 },
  { name: 'Novosibirsk', lat: 55.03, lon: 82.92 },
  { name: 'Yekaterinburg', lat: 56.84, lon: 60.61 },
  { name: 'Kazan', lat: 55.79, lon: 49.12 },
  { name: 'Nizhny Novgorod', lat: 56.3, lon: 43.94 },
  { name: 'Chelyabinsk', lat: 55.16, lon: 61.4 },
  { name: 'Krasnoyarsk', lat: 56.01, lon: 92.85 },
  { name: 'Samara', lat: 53.2, lon: 50.15 },
  { name: 'Ufa', lat: 54.74, lon: 55.97 },
  { name: 'Rostov-on-Don', lat: 47.24, lon: 39.71 },
  { name: 'Omsk', lat: 54.99, lon: 73.37 },
  { name: 'Krasnodar', lat: 45.04, lon: 38.98 },
  { name: 'Voronezh', lat: 51.66, lon: 39.2 },
  { name: 'Perm', lat: 58.01, lon: 56.25 },
  { name: 'Volgograd', lat: 48.72, lon: 44.5 },
  { name: 'Saratov', lat: 51.53, lon: 46.03 },
  { name: 'Tyumen', lat: 57.15, lon: 65.53 },
  { name: 'Tolyatti', lat: 53.51, lon: 49.42 },
  { name: 'Barnaul', lat: 53.35, lon: 83.78 },
  { name: 'Izhevsk', lat: 56.85, lon: 53.2 },
  { name: 'Ulyanovsk', lat: 54.32, lon: 48.4 },
  { name: 'Irkutsk', lat: 52.29, lon: 104.3 },
  { name: 'Khabarovsk', lat: 48.48, lon: 135.08 },
  { name: 'Yaroslavl', lat: 57.63, lon: 39.87 },
  { name: 'Vladivostok', lat: 43.12, lon: 131.89 },
  { name: 'Makhachkala', lat: 42.98, lon: 47.5 },
  { name: 'Tomsk', lat: 56.49, lon: 84.95 },
  { name: 'Orenburg', lat: 51.77, lon: 55.1 },
  { name: 'Kemerovo', lat: 55.35, lon: 86.09 },
  { name: 'Novokuznetsk', lat: 53.79, lon: 87.21 },
  { name: 'Ryazan', lat: 54.63, lon: 39.74 },
  { name: 'Naberezhnye Chelny', lat: 55.74, lon: 52.41 },
  { name: 'Astrakhan', lat: 46.35, lon: 48.03 },
  { name: 'Penza', lat: 53.2, lon: 45.0 },
  { name: 'Kirov', lat: 58.6, lon: 49.66 },
  { name: 'Lipetsk', lat: 52.61, lon: 39.59 },
  { name: 'Cheboksary', lat: 56.13, lon: 47.25 },
  { name: 'Kaliningrad', lat: 54.71, lon: 20.51 },
  { name: 'Tula', lat: 54.19, lon: 37.62 },
  { name: 'Kursk', lat: 51.74, lon: 36.19 },
  { name: 'Stavropol', lat: 45.04, lon: 41.97 },
  { name: 'Ulan-Ude', lat: 51.83, lon: 107.58 },
  { name: 'Tver', lat: 56.86, lon: 35.9 },
  { name: 'Magnitogorsk', lat: 53.41, lon: 59.0 },
  { name: 'Sochi', lat: 43.6, lon: 39.73 },
  { name: 'Ivanovo', lat: 57.0, lon: 40.97 },
  { name: 'Bryansk', lat: 53.24, lon: 34.36 },
  { name: 'Belgorod', lat: 50.6, lon: 36.58 },
  { name: 'Surgut', lat: 61.25, lon: 73.42 },
];
