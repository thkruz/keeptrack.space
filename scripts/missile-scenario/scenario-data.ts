/**
 * Geography dataset for the notional missile-scenario generator.
 *
 * Everything here is drawn from open-source, publicly reported coordinates of
 * cities, air bases, and missile fields. It exists purely to make the KeepTrack
 * "mass raid" educational simulations look realistic - every launch produced from
 * it is fictional.
 *
 * Two record kinds:
 *   - {@link LaunchSite}: where an attacker fires from, plus the class of missile
 *     (range + realistic apogee floor) and how many rounds that site contributes.
 *   - {@link Target}: an aimpoint, tagged `military` (counterforce) or
 *     `population` (countervalue) so a scenario's doctrine can weight the mix.
 *
 * Launch-site coordinates for the established nuclear powers (Russia, China,
 * North Korea, USA) are reshaped from the app's own `missile-data.ts` so the two
 * stay in sync; the regional actors (Iran, Israel, Ukraine) and every target set
 * are authored here.
 */
import { ChinaICBM, RussianICBM } from '@app/plugins/missile/missile-data';
import { US_LARGEST_CITIES, US_MILITARY_BASES } from '@app/plugins/missile/us-targets';
import { RUSSIA_LARGEST_CITIES, RUSSIA_MILITARY_BASES } from '@app/plugins/missile/russia-targets';
import { CHINA_LARGEST_CITIES, CHINA_MILITARY_BASES } from '@app/plugins/missile/china-targets';
import type { GeoTarget } from '@app/plugins/missile/us-targets';

/** A physical launch position plus the missile class fired from it. */
export interface LaunchSite {
  /** Human-readable site / system name (e.g. "Aleysk (SS-18)"). */
  name: string;
  lat: number;
  lon: number;
  /** Maximum modeled range (km); the solver rejects targets beyond it. */
  rangeKm: number;
  /** Apogee floor (km) handed to the trajectory solver - scales the loft. */
  minAltKm: number;
  /** How many rounds this site contributes to a full-arsenal salvo. */
  salvo: number;
}

/** An aimpoint, tagged so scenario doctrine can prefer military or population. */
export interface Target {
  name: string;
  lat: number;
  lon: number;
  kind: 'military' | 'population';
}

/**
 * Build a tagged {@link Target} set from the app's full impact-point catalogs: every
 * military base is a `military` aimpoint and every large city a `population` aimpoint.
 * Using the whole catalog (hundreds of points) instead of a hand-picked handful is what
 * spreads a raid across the entire country rather than clustering on ~20 famous cities.
 */
const geoToTargets = (military: readonly GeoTarget[], population: readonly GeoTarget[]): Target[] => [
  ...military.map((t) => ({ name: t.name, lat: t.lat, lon: t.lon, kind: 'military' as const })),
  ...population.map((t) => ({ name: t.name, lat: t.lat, lon: t.lon, kind: 'population' as const })),
];

/** Apogee floors (km) per missile class - keeps short-range shots from being rejected as "too lofted". */
const APOGEE_ICBM = 1120;
const APOGEE_IRBM = 350;
const APOGEE_MRBM = 250;
const APOGEE_SRBM = 90;

/**
 * Reshape one of the app's flat `[lat, lon, name, rangeKm, ...]` arrays into
 * structured {@link LaunchSite}s. Keeps the silo coordinates single-sourced with
 * the live plugin instead of re-typing them here.
 */
const fromAppData = (flat: readonly (number | string)[], minAltKm: number, salvo: number): LaunchSite[] => {
  const sites: LaunchSite[] = [];

  for (let i = 0; i + 3 < flat.length; i += 4) {
    const name = flat[i + 2] as string;

    // Skip the sub entries baked into the app arrays; submarines are handled separately
    // (the *_SUB_SITES lists below) so silos and SLBMs can be composed independently.
    if ((/\bsub\b/iu).test(name)) {
      continue;
    }
    sites.push({
      lat: flat[i] as number,
      lon: flat[i + 1] as number,
      name,
      rangeKm: flat[i + 3] as number,
      minAltKm,
      salvo,
    });
  }

  return sites;
};

// =========================================================================
// Launch sites, by attacker nation (silos only; SSBN launchers are the *_SUB_SITES below)
// =========================================================================

/** Russian ICBM silo + road-mobile fields (reshaped from the app arsenal, subs excluded). */
export const RUSSIA_SITES: LaunchSite[] = fromAppData(RussianICBM, APOGEE_ICBM, 8);

/** Chinese ICBM brigades (reshaped from the app arsenal, subs excluded). */
export const CHINA_SITES: LaunchSite[] = fromAppData(ChinaICBM, APOGEE_ICBM, 6);

/**
 * North Korean strategic + road-mobile launchers, spread across the country's real
 * missile operating bases so a raid does not stack on one or two silos. The long-range
 * road-mobile ICBMs (Hwasong-14/15/17/18, ~10000-13000 km) carry any strike on the US;
 * the shorter systems and the Sinpo SLBM cover regional targets (and self-skip on an
 * out-of-range shot). Coordinates are publicly reported base/site locations.
 */
export const NORTH_KOREA_SITES: LaunchSite[] = [
  { name: 'Pyongsong (Hwasong-15)', lat: 39.25, lon: 125.87, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 5 },
  { name: 'Sanum-dong (Hwasong-17)', lat: 39.15, lon: 125.68, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 5 },
  { name: 'Yeongjeo-dong (Hwasong-14)', lat: 41.87, lon: 129.35, rangeKm: 10000, minAltKm: APOGEE_ICBM, salvo: 4 },
  { name: 'Hoejung-ni (Hwasong-18)', lat: 41.63, lon: 129.10, rangeKm: 12000, minAltKm: APOGEE_ICBM, salvo: 4 },
  { name: 'Sino-ri (Nodong/Hwasong)', lat: 39.63, lon: 125.52, rangeKm: 10000, minAltKm: APOGEE_ICBM, salvo: 4 },
  { name: 'Sangnam-ni (Hwasong-16)', lat: 40.52, lon: 126.92, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 4 },
  { name: 'Kusong (Hwasong-12)', lat: 39.98, lon: 125.24, rangeKm: 6000, minAltKm: APOGEE_IRBM, salvo: 3 },
  { name: 'Sohae Launch Station', lat: 39.66, lon: 124.70, rangeKm: 10000, minAltKm: APOGEE_ICBM, salvo: 3 },
  { name: 'Sinpo Sub (Pukkuksong-1)', lat: 40.03, lon: 128.19, rangeKm: 2000, minAltKm: APOGEE_MRBM, salvo: 4 },
];

/**
 * US ICBM silo fields (Minuteman III). The real force is ~400 silos spread across
 * three wings covering tens of thousands of square miles, so it is modeled as several
 * dispersed squadron-area points per wing rather than one launcher per base - a raid
 * should not fire a hundred missiles from a single coordinate. (The Ohio SSBN force is
 * in USA_SUB_SITES.) Coordinates are approximate squadron-field centers.
 */
export const USA_SITES: LaunchSite[] = [
  // 91st MW - Minot AFB, NW North Dakota.
  { name: 'Minot Field (Minuteman III)', lat: 48.42, lon: -101.33, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 12 },
  { name: 'Minot Field N (Minuteman III)', lat: 48.90, lon: -101.05, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 12 },
  { name: 'Minot Field W (Minuteman III)', lat: 48.55, lon: -102.45, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 12 },
  { name: 'Minot Field S (Minuteman III)', lat: 48.05, lon: -100.35, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 12 },
  // 341st MW - Malmstrom AFB, central Montana.
  { name: 'Malmstrom Field (Minuteman III)', lat: 47.51, lon: -111.18, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 12 },
  { name: 'Malmstrom Field E (Minuteman III)', lat: 47.90, lon: -109.75, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 12 },
  { name: 'Malmstrom Field S (Minuteman III)', lat: 47.15, lon: -110.55, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 12 },
  { name: 'Malmstrom Field N (Minuteman III)', lat: 48.25, lon: -111.85, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 12 },
  // 90th MW - F.E. Warren AFB, Wyoming / Nebraska / Colorado.
  { name: 'F.E. Warren Field (Minuteman III)', lat: 41.15, lon: -104.86, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 12 },
  { name: 'F.E. Warren Field N (Minuteman III)', lat: 41.65, lon: -103.55, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 12 },
  { name: 'F.E. Warren Field E (Minuteman III)', lat: 41.10, lon: -102.85, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 12 },
  { name: 'F.E. Warren Field S (Minuteman III)', lat: 40.55, lon: -104.20, rangeKm: 13000, minAltKm: APOGEE_ICBM, salvo: 12 },
];

/**
 * Russian SSBN launchers. The name before " (" must match a class in `sub-launch.ts`
 * SUBMARINE_FLEETS ("Borei Sub", "Delta IV Sub") so the load-time planner relocates each
 * boat to its real patrol oceans; the lat/lon here is only a homeport placeholder used
 * for the generator's range check before that relocation happens.
 */
export const RUSSIA_SUB_SITES: LaunchSite[] = [
  { name: 'Borei Sub (Bulava)', lat: 69.25, lon: 33.30, rangeKm: 9000, minAltKm: APOGEE_ICBM, salvo: 32 },
  { name: 'Delta IV Sub (Sineva)', lat: 69.25, lon: 33.30, rangeKm: 11000, minAltKm: APOGEE_ICBM, salvo: 24 },
];

/** US SSBN launchers (Ohio class, Trident II). Relocated to Atlantic/Pacific patrols at load. */
export const USA_SUB_SITES: LaunchSite[] = [
  { name: 'Ohio Sub (Trident II)', lat: 30.80, lon: -81.52, rangeKm: 12000, minAltKm: APOGEE_ICBM, salvo: 48 },
];

/** Chinese SSBN launchers (Type 094 Jin class, JL-2/JL-3). Relocated to Pacific bastions at load. */
export const CHINA_SUB_SITES: LaunchSite[] = [
  { name: 'Type 092 Sub (JL-2)', lat: 18.23, lon: 109.51, rangeKm: 10000, minAltKm: APOGEE_ICBM, salvo: 24 },
];

/** UK SSBN launchers (Vanguard class, Trident II). Relocated to North Atlantic patrols at load. */
export const UK_SUB_SITES: LaunchSite[] = [
  { name: 'Vanguard Sub (Trident II)', lat: 56.07, lon: -4.82, rangeKm: 12000, minAltKm: APOGEE_ICBM, salvo: 16 },
];

/** French SSBN launchers (Triomphant class, M51). Relocated to North Atlantic patrols at load. */
export const FRANCE_SUB_SITES: LaunchSite[] = [
  { name: 'Triomphant Sub (M51)', lat: 48.30, lon: -4.50, rangeKm: 10000, minAltKm: APOGEE_ICBM, salvo: 16 },
];

/**
 * Iranian medium-range ballistic missile bases (Shahab-3 / Emad / Sejjil /
 * Kheibar Shekan class, ~1300-2000 km). Coordinates are the publicly reported
 * missile-city / IRGC aerospace base locations.
 */
export const IRAN_SITES: LaunchSite[] = [
  { name: 'Kermanshah (Emad)', lat: 34.31, lon: 47.06, rangeKm: 1700, minAltKm: APOGEE_IRBM, salvo: 5 },
  { name: 'Khorramabad (Sejjil)', lat: 33.49, lon: 48.36, rangeKm: 2000, minAltKm: APOGEE_IRBM, salvo: 5 },
  { name: 'Tabriz (Shahab-3)', lat: 38.08, lon: 46.29, rangeKm: 1300, minAltKm: APOGEE_MRBM, salvo: 4 },
  { name: 'Isfahan (Kheibar Shekan)', lat: 32.75, lon: 51.72, rangeKm: 1450, minAltKm: APOGEE_MRBM, salvo: 4 },
  { name: 'Bakhtaran (Ghadr)', lat: 34.36, lon: 47.12, rangeKm: 1600, minAltKm: APOGEE_IRBM, salvo: 4 },
  { name: 'Shiraz (Fattah)', lat: 29.54, lon: 52.59, rangeKm: 1400, minAltKm: APOGEE_MRBM, salvo: 4 },
  { name: 'Hamadan (Khorramshahr)', lat: 34.80, lon: 48.52, rangeKm: 2000, minAltKm: APOGEE_IRBM, salvo: 4 },
  { name: 'Qom (Sejjil)', lat: 34.64, lon: 50.88, rangeKm: 2000, minAltKm: APOGEE_IRBM, salvo: 4 },
];

/**
 * Israeli ballistic launchers. Sdot Micha (Zekharia) is the reported Jericho base;
 * the others are notional dispersed / road-mobile firing positions so the battery
 * does not launch every missile from one point. Jericho II/III overfly Iran easily.
 */
export const ISRAEL_SITES: LaunchSite[] = [
  { name: 'Sdot Micha (Jericho III)', lat: 31.70, lon: 34.92, rangeKm: 5000, minAltKm: APOGEE_IRBM, salvo: 5 },
  { name: 'Palmachim (Jericho III)', lat: 31.90, lon: 34.70, rangeKm: 5000, minAltKm: APOGEE_IRBM, salvo: 4 },
  { name: 'Negev Dispersal (Jericho II)', lat: 30.95, lon: 34.90, rangeKm: 4000, minAltKm: APOGEE_IRBM, salvo: 4 },
  { name: 'Golan Dispersal (Jericho II)', lat: 32.90, lon: 35.72, rangeKm: 4000, minAltKm: APOGEE_IRBM, salvo: 3 },
  { name: 'Ramon Dispersal (Jericho III)', lat: 30.60, lon: 34.80, rangeKm: 5000, minAltKm: APOGEE_IRBM, salvo: 4 },
];

/**
 * Ukrainian short-range ballistic launchers (Hrim-2 / Sapsan class, ~500 km),
 * ranged notionally to ~1000 km so northern launch boxes can reach Moscow for
 * the educational scenario. Positioned near the front and interior.
 */
export const UKRAINE_SITES: LaunchSite[] = [
  { name: 'Sumy (Hrim-2)', lat: 50.91, lon: 34.80, rangeKm: 1000, minAltKm: APOGEE_SRBM, salvo: 4 },
  { name: 'Kharkiv (Hrim-2)', lat: 49.99, lon: 36.23, rangeKm: 1000, minAltKm: APOGEE_SRBM, salvo: 4 },
  { name: 'Chernihiv (Hrim-2)', lat: 51.49, lon: 31.29, rangeKm: 1000, minAltKm: APOGEE_SRBM, salvo: 3 },
  { name: 'Dnipro (Hrim-2)', lat: 48.46, lon: 35.05, rangeKm: 1000, minAltKm: APOGEE_SRBM, salvo: 3 },
  { name: 'Poltava (Hrim-2)', lat: 49.59, lon: 34.55, rangeKm: 1000, minAltKm: APOGEE_SRBM, salvo: 3 },
  { name: 'Chernivtsi (Hrim-2)', lat: 48.29, lon: 25.94, rangeKm: 1000, minAltKm: APOGEE_SRBM, salvo: 3 },
];

/**
 * Indian strategic launchers (Agni family). Agni-II/III cover Pakistan; Agni-IV/V
 * (~4000-5500 km) reach deep into China. Coordinates are the Strategic Forces Command
 * missile group / test-range locations reported open-source.
 */
export const INDIA_SITES: LaunchSite[] = [
  { name: 'Wheeler Island (Agni-V)', lat: 20.76, lon: 87.09, rangeKm: 5500, minAltKm: APOGEE_IRBM, salvo: 5 },
  { name: 'Jodhpur (Agni-II)', lat: 26.29, lon: 73.02, rangeKm: 3000, minAltKm: APOGEE_MRBM, salvo: 4 },
  { name: 'Secunderabad (Agni-III)', lat: 17.50, lon: 78.50, rangeKm: 3500, minAltKm: APOGEE_IRBM, salvo: 4 },
  { name: 'Deolali (Agni-IV)', lat: 19.95, lon: 73.83, rangeKm: 4000, minAltKm: APOGEE_IRBM, salvo: 4 },
  { name: 'Bhopal (Agni-V)', lat: 23.26, lon: 77.41, rangeKm: 5500, minAltKm: APOGEE_IRBM, salvo: 4 },
  { name: 'Ambala (Agni-I)', lat: 30.38, lon: 76.78, rangeKm: 1200, minAltKm: APOGEE_MRBM, salvo: 4 },
];

/**
 * Pakistani strategic launchers (Shaheen / Ghauri family, ~1300-2750 km). Coordinates
 * are the reported Army Strategic Forces Command garrison / missile-base locations.
 */
export const PAKISTAN_SITES: LaunchSite[] = [
  { name: 'Sargodha (Shaheen-III)', lat: 32.05, lon: 72.67, rangeKm: 2750, minAltKm: APOGEE_IRBM, salvo: 5 },
  { name: 'Gujranwala (Ghauri)', lat: 32.16, lon: 74.19, rangeKm: 1300, minAltKm: APOGEE_MRBM, salvo: 4 },
  { name: 'Dera Ghazi Khan (Shaheen-II)', lat: 30.05, lon: 70.64, rangeKm: 2000, minAltKm: APOGEE_IRBM, salvo: 4 },
  { name: 'Pano Aqil (Shaheen-II)', lat: 27.85, lon: 69.11, rangeKm: 2000, minAltKm: APOGEE_IRBM, salvo: 4 },
  { name: 'Okara (Shaheen-I)', lat: 30.81, lon: 73.45, rangeKm: 900, minAltKm: APOGEE_SRBM, salvo: 4 },
  { name: 'Khuzdar (Shaheen-III)', lat: 27.81, lon: 66.61, rangeKm: 2750, minAltKm: APOGEE_IRBM, salvo: 4 },
];

/**
 * Russian tactical launchers arrayed against Ukraine (Iskander-M class, ~500 km
 * ranged notionally to ~800 km). Positioned in the border oblasts and Crimea.
 */
export const RUSSIA_TACTICAL_SITES: LaunchSite[] = [
  { name: 'Belgorod (Iskander)', lat: 50.60, lon: 36.59, rangeKm: 800, minAltKm: APOGEE_SRBM, salvo: 6 },
  { name: 'Kursk (Iskander)', lat: 51.73, lon: 36.19, rangeKm: 800, minAltKm: APOGEE_SRBM, salvo: 6 },
  { name: 'Bryansk (Iskander)', lat: 53.24, lon: 34.36, rangeKm: 800, minAltKm: APOGEE_SRBM, salvo: 5 },
  { name: 'Rostov-on-Don (Iskander)', lat: 47.24, lon: 39.71, rangeKm: 800, minAltKm: APOGEE_SRBM, salvo: 5 },
  { name: 'Voronezh (Iskander)', lat: 51.66, lon: 39.20, rangeKm: 800, minAltKm: APOGEE_SRBM, salvo: 4 },
  { name: 'Dzhankoi, Crimea (Iskander)', lat: 45.71, lon: 34.39, rangeKm: 800, minAltKm: APOGEE_SRBM, salvo: 5 },
];

// =========================================================================
// Target sets, by defending nation
// =========================================================================

/**
 * United States aimpoints: every major US military installation plus the 50 largest
 * cities, from the app's full catalog. Spreads a raid across the whole country (Alaska,
 * Hawaii, and Guam included) instead of a handful of famous metros.
 */
export const USA_TARGETS: Target[] = geoToTargets(US_MILITARY_BASES, US_LARGEST_CITIES);

/** Russia aimpoints: full military-base + largest-city catalog. */
export const RUSSIA_TARGETS: Target[] = geoToTargets(RUSSIA_MILITARY_BASES, RUSSIA_LARGEST_CITIES);

/** China aimpoints: full military-base + largest-city catalog. */
export const CHINA_TARGETS: Target[] = geoToTargets(CHINA_MILITARY_BASES, CHINA_LARGEST_CITIES);

/** North Korea: leadership, missile/nuclear sites, and cities. */
export const NORTH_KOREA_TARGETS: Target[] = [
  { name: 'Pyongyang (Leadership)', lat: 39.019, lon: 125.738, kind: 'military' },
  { name: 'Yongbyon Nuclear Center', lat: 39.797, lon: 125.755, kind: 'military' },
  { name: 'Sohae Launch Station', lat: 39.660, lon: 124.705, kind: 'military' },
  { name: 'Sinpo Naval Base (SLBM)', lat: 40.032, lon: 128.185, kind: 'military' },
  { name: 'Punggye-ri Test Site', lat: 41.280, lon: 129.087, kind: 'military' },
  { name: 'Pyongsong Missile Base', lat: 39.250, lon: 125.870, kind: 'military' },
  { name: 'Yeongjeo-dong Missile Base', lat: 41.870, lon: 129.350, kind: 'military' },
  { name: 'Hamhung', lat: 39.918, lon: 127.536, kind: 'population' },
  { name: 'Nampo', lat: 38.737, lon: 125.408, kind: 'population' },
  { name: 'Wonsan', lat: 39.147, lon: 127.445, kind: 'population' },
  { name: 'Chongjin', lat: 41.795, lon: 129.783, kind: 'population' },
  { name: 'Kaesong', lat: 37.972, lon: 126.554, kind: 'population' },
  { name: 'Sinuiju', lat: 40.101, lon: 124.398, kind: 'population' },
];

/** Israel: command, air/nuclear bases, and metros. */
export const ISRAEL_TARGETS: Target[] = [
  { name: 'Tel Aviv (Kirya HQ)', lat: 32.075, lon: 34.787, kind: 'military' },
  { name: 'Nevatim Airbase', lat: 31.208, lon: 35.012, kind: 'military' },
  { name: 'Tel Nof Airbase', lat: 31.840, lon: 34.822, kind: 'military' },
  { name: 'Dimona Nuclear Center', lat: 31.001, lon: 35.145, kind: 'military' },
  { name: 'Haifa Naval Base', lat: 32.826, lon: 34.988, kind: 'military' },
  { name: 'Ramat David Airbase', lat: 32.665, lon: 35.179, kind: 'military' },
  { name: 'Palmachim Airbase', lat: 31.897, lon: 34.690, kind: 'military' },
  { name: 'Nahal Sorek Nuclear Center', lat: 31.892, lon: 34.708, kind: 'military' },
  { name: 'Jerusalem', lat: 31.768, lon: 35.214, kind: 'population' },
  { name: 'Tel Aviv', lat: 32.085, lon: 34.781, kind: 'population' },
  { name: 'Beersheba', lat: 31.252, lon: 34.791, kind: 'population' },
  { name: 'Ashdod', lat: 31.804, lon: 34.655, kind: 'population' },
  { name: 'Ashkelon', lat: 31.669, lon: 34.574, kind: 'population' },
  { name: 'Netanya', lat: 32.328, lon: 34.857, kind: 'population' },
  { name: 'Rishon LeZion', lat: 31.964, lon: 34.804, kind: 'population' },
  { name: 'Eilat', lat: 29.558, lon: 34.948, kind: 'population' },
];

/** Iran: leadership, IRGC/nuclear sites, and metros. */
export const IRAN_TARGETS: Target[] = [
  { name: 'Tehran (Leadership)', lat: 35.689, lon: 51.389, kind: 'military' },
  { name: 'Natanz Enrichment', lat: 33.724, lon: 51.727, kind: 'military' },
  { name: 'Fordow Enrichment', lat: 34.884, lon: 50.994, kind: 'military' },
  { name: 'Bushehr Nuclear Plant', lat: 28.829, lon: 50.887, kind: 'military' },
  { name: 'Isfahan Nuclear Complex', lat: 32.573, lon: 51.813, kind: 'military' },
  { name: 'Bandar Abbas Naval Base', lat: 27.150, lon: 56.209, kind: 'military' },
  { name: 'Mashhad', lat: 36.297, lon: 59.606, kind: 'population' },
  { name: 'Isfahan', lat: 32.654, lon: 51.668, kind: 'population' },
  { name: 'Shiraz', lat: 29.591, lon: 52.584, kind: 'population' },
  { name: 'Tabriz', lat: 38.080, lon: 46.293, kind: 'population' },
  { name: 'Karaj', lat: 35.826, lon: 50.958, kind: 'population' },
];

/** Ukraine: command, air bases, and metros. */
export const UKRAINE_TARGETS: Target[] = [
  { name: 'Kyiv (National Command)', lat: 50.450, lon: 30.523, kind: 'military' },
  { name: 'Vasylkiv Airbase', lat: 50.234, lon: 30.328, kind: 'military' },
  { name: 'Starokostiantyniv Airbase', lat: 49.750, lon: 27.283, kind: 'military' },
  { name: 'Ochakiv Naval Base', lat: 46.612, lon: 31.552, kind: 'military' },
  { name: 'Kharkiv', lat: 49.994, lon: 36.230, kind: 'population' },
  { name: 'Dnipro', lat: 48.465, lon: 35.046, kind: 'population' },
  { name: 'Odesa', lat: 46.482, lon: 30.723, kind: 'population' },
  { name: 'Lviv', lat: 49.840, lon: 24.030, kind: 'population' },
  { name: 'Zaporizhzhia', lat: 47.839, lon: 35.140, kind: 'population' },
  { name: 'Kryvyi Rih', lat: 47.911, lon: 33.391, kind: 'population' },
];

/** India: command, strategic/nuclear/naval bases, and major metros. */
export const INDIA_TARGETS: Target[] = [
  { name: 'New Delhi (National Command)', lat: 28.614, lon: 77.209, kind: 'military' },
  { name: 'BARC Nuclear Center, Mumbai', lat: 19.017, lon: 72.925, kind: 'military' },
  { name: 'Hyderabad (Missile Complex)', lat: 17.385, lon: 78.487, kind: 'military' },
  { name: 'INS Kadamba Naval Base', lat: 14.847, lon: 74.130, kind: 'military' },
  { name: 'Sriharikota Space Center', lat: 13.720, lon: 80.230, kind: 'military' },
  { name: 'Kalpakkam Nuclear Center', lat: 12.558, lon: 80.176, kind: 'military' },
  { name: 'Mumbai', lat: 19.076, lon: 72.878, kind: 'population' },
  { name: 'Bengaluru', lat: 12.972, lon: 77.595, kind: 'population' },
  { name: 'Kolkata', lat: 22.573, lon: 88.364, kind: 'population' },
  { name: 'Chennai', lat: 13.083, lon: 80.270, kind: 'population' },
  { name: 'Ahmedabad', lat: 23.023, lon: 72.571, kind: 'population' },
  { name: 'Pune', lat: 18.520, lon: 73.857, kind: 'population' },
  { name: 'Jaipur', lat: 26.912, lon: 75.787, kind: 'population' },
];

/** Pakistan: command, strategic/air/nuclear bases, and major metros. */
export const PAKISTAN_TARGETS: Target[] = [
  { name: 'Islamabad (National Command)', lat: 33.684, lon: 73.048, kind: 'military' },
  { name: 'GHQ Rawalpindi', lat: 33.600, lon: 73.047, kind: 'military' },
  { name: 'Sargodha Airbase', lat: 32.049, lon: 72.665, kind: 'military' },
  { name: 'Kahuta Enrichment', lat: 33.590, lon: 73.386, kind: 'military' },
  { name: 'Karachi Naval Base', lat: 24.815, lon: 66.978, kind: 'military' },
  { name: 'Kamra Airbase', lat: 33.868, lon: 72.401, kind: 'military' },
  { name: 'Karachi', lat: 24.861, lon: 67.010, kind: 'population' },
  { name: 'Lahore', lat: 31.549, lon: 74.343, kind: 'population' },
  { name: 'Faisalabad', lat: 31.418, lon: 73.079, kind: 'population' },
  { name: 'Rawalpindi', lat: 33.626, lon: 73.071, kind: 'population' },
  { name: 'Multan', lat: 30.196, lon: 71.472, kind: 'population' },
  { name: 'Peshawar', lat: 34.008, lon: 71.578, kind: 'population' },
  { name: 'Quetta', lat: 30.183, lon: 66.997, kind: 'population' },
];
