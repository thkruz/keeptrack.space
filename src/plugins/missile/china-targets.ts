/**
 * Expanded China impact-point catalogs for the missile simulator's target dropdown:
 * major Chinese (PLA) military installations and the 50 most populous Chinese cities.
 *
 * Mirrors the US lists in `us-targets.ts` (literal proper names + decimal-degree
 * WGS84 coordinates; only the group headers are localized). Military entries cover
 * the well-documented sites - PLA Rocket Force bases, PLA Navy fleet bases, major
 * PLA Air Force airfields, and the national satellite launch / test centers.
 */

import type { GeoTarget } from './us-targets';

/** Major PLA military installations, grouped by service then alphabetically. */
export const CHINA_MILITARY_BASES: readonly GeoTarget[] = [
  // PLA Rocket Force operational bases
  { name: 'PLARF Base 61 (Huangshan)', lat: 30.40, lon: 118.37 },
  { name: 'PLARF Base 62 (Kunming)', lat: 25.04, lon: 102.71 },
  { name: 'PLARF Base 63 (Huaihua)', lat: 27.55, lon: 109.98 },
  { name: 'PLARF Base 64 (Lanzhou)', lat: 36.06, lon: 103.83 },
  { name: 'PLARF Base 65 (Shenyang)', lat: 41.80, lon: 123.43 },
  { name: 'PLARF Base 66 (Luoyang)', lat: 34.68, lon: 112.45 },

  // PLA Navy fleet & submarine bases
  { name: 'Dalian Naval Base', lat: 38.92, lon: 121.63 },
  { name: 'Ningbo Naval Base', lat: 29.87, lon: 121.54 },
  { name: 'Qingdao Naval Base', lat: 36.07, lon: 120.38 },
  { name: 'Xiangshan Naval Base', lat: 29.48, lon: 121.87 },
  { name: 'Yulin Submarine Base (Hainan)', lat: 18.23, lon: 109.55 },
  { name: 'Zhanjiang Naval Base', lat: 21.20, lon: 110.40 },

  // PLA Air Force airfields
  { name: 'Anshan Air Base', lat: 41.10, lon: 122.85 },
  { name: 'Dingxin Test & Training Base', lat: 40.00, lon: 99.80 },
  { name: 'Golmud Air Base', lat: 36.40, lon: 94.79 },
  { name: 'Wenjiang Air Base (Chengdu)', lat: 30.70, lon: 103.83 },
  { name: 'Wuhu Air Base', lat: 31.39, lon: 118.41 },
  { name: 'Yangcun Air Base (Tianjin)', lat: 39.38, lon: 117.05 },

  // Launch, space & nuclear test centers
  { name: 'Jiuquan Satellite Launch Center', lat: 40.96, lon: 100.29 },
  { name: 'Lop Nur Nuclear Test Base', lat: 41.50, lon: 88.30 },
  { name: 'Taiyuan Satellite Launch Center', lat: 38.85, lon: 111.61 },
  { name: 'Wenchang Space Launch Site (Hainan)', lat: 19.61, lon: 110.95 },
  { name: 'Xichang Satellite Launch Center', lat: 28.25, lon: 102.03 },
];

/**
 * The 50 most populous Chinese cities, ordered by urban population. Coordinates are
 * the city center in decimal degrees.
 */
export const CHINA_LARGEST_CITIES: readonly GeoTarget[] = [
  { name: 'Shanghai', lat: 31.23, lon: 121.47 },
  { name: 'Beijing', lat: 39.90, lon: 116.41 },
  { name: 'Chongqing', lat: 29.56, lon: 106.55 },
  { name: 'Guangzhou', lat: 23.13, lon: 113.26 },
  { name: 'Chengdu', lat: 30.57, lon: 104.07 },
  { name: 'Shenzhen', lat: 22.54, lon: 114.06 },
  { name: 'Tianjin', lat: 39.34, lon: 117.36 },
  { name: 'Wuhan', lat: 30.59, lon: 114.30 },
  { name: 'Dongguan', lat: 23.02, lon: 113.75 },
  { name: 'Xi\'an', lat: 34.34, lon: 108.94 },
  { name: 'Hangzhou', lat: 30.27, lon: 120.15 },
  { name: 'Foshan', lat: 23.02, lon: 113.12 },
  { name: 'Nanjing', lat: 32.06, lon: 118.80 },
  { name: 'Shenyang', lat: 41.81, lon: 123.43 },
  { name: 'Qingdao', lat: 36.07, lon: 120.38 },
  { name: 'Jinan', lat: 36.65, lon: 117.12 },
  { name: 'Harbin', lat: 45.80, lon: 126.53 },
  { name: 'Zhengzhou', lat: 34.75, lon: 113.63 },
  { name: 'Changsha', lat: 28.23, lon: 112.94 },
  { name: 'Kunming', lat: 25.04, lon: 102.72 },
  { name: 'Dalian', lat: 38.91, lon: 121.61 },
  { name: 'Ningbo', lat: 29.87, lon: 121.55 },
  { name: 'Suzhou', lat: 31.30, lon: 120.58 },
  { name: 'Shijiazhuang', lat: 38.04, lon: 114.51 },
  { name: 'Xiamen', lat: 24.48, lon: 118.09 },
  { name: 'Nanning', lat: 22.82, lon: 108.32 },
  { name: 'Hefei', lat: 31.82, lon: 117.23 },
  { name: 'Fuzhou', lat: 26.07, lon: 119.30 },
  { name: 'Wuxi', lat: 31.49, lon: 120.31 },
  { name: 'Changchun', lat: 43.82, lon: 125.32 },
  { name: 'Taiyuan', lat: 37.87, lon: 112.55 },
  { name: 'Nanchang', lat: 28.68, lon: 115.86 },
  { name: 'Guiyang', lat: 26.65, lon: 106.63 },
  { name: 'Wenzhou', lat: 27.99, lon: 120.70 },
  { name: 'Zhongshan', lat: 22.52, lon: 113.39 },
  { name: 'Urumqi', lat: 43.83, lon: 87.62 },
  { name: 'Changzhou', lat: 31.81, lon: 119.97 },
  { name: 'Xuzhou', lat: 34.26, lon: 117.18 },
  { name: 'Lanzhou', lat: 36.06, lon: 103.83 },
  { name: 'Huizhou', lat: 23.11, lon: 114.42 },
  { name: 'Baotou', lat: 40.66, lon: 109.84 },
  { name: 'Luoyang', lat: 34.62, lon: 112.45 },
  { name: 'Yantai', lat: 37.46, lon: 121.45 },
  { name: 'Handan', lat: 36.61, lon: 114.49 },
  { name: 'Weifang', lat: 36.71, lon: 119.16 },
  { name: 'Zibo', lat: 36.81, lon: 118.05 },
  { name: 'Nantong', lat: 31.98, lon: 120.89 },
  { name: 'Tangshan', lat: 39.63, lon: 118.18 },
  { name: 'Hohhot', lat: 40.84, lon: 111.75 },
  { name: 'Shantou', lat: 23.35, lon: 116.68 },
];
