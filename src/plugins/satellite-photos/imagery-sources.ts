/**
 * Data-driven registry of public satellite-imagery feeds for the SatellitePhotos
 * plugin, plus the pure time-slot math behind the time-sliced feeds.
 *
 * This module is intentionally DOM-free and locale-free so it can be unit
 * tested in isolation. The plugin maps each {@link ImagerySource} to a v13
 * action row and, on click, calls {@link ImagerySource.buildImage} to resolve
 * the live URL for the current simulation/real time. Adding a new fixed feed is
 * a single entry in {@link IMAGERY_SOURCES}.
 */

import { Degrees } from '@ootk/src/main';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Moscow time (MSK) is UTC+3 with no DST; Elektro-L filenames use it. */
const MSK_OFFSET_MS = 3 * HOUR_MS;

/** The result of resolving an imagery source for a given instant. */
export interface ImageResult {
  /** The live image URL to open in the colorbox. */
  url: string;
  /**
   * Formatted UTC timestamp (e.g. "15 Jun 2025, 14:30") for time-sliced feeds.
   * When present, the plugin renders the title as "<name> at <time> UTC".
   */
  timestampUtc?: string;
  /** True when the simulation clock is in the future and live imagery was substituted. */
  isFuture?: boolean;
  /** Camera target for whole-Earth feeds (DSCOVR); the plugin snaps to it. */
  snap?: { lat: Degrees; lon: Degrees };
}

/** A single selectable imagery feed. */
export interface ImagerySource {
  /** Stable id; the menu row id is `${id}-link`. */
  id: string;
  /** Display label, also used as the colorbox title for untimed feeds. */
  label: string;
  /** NORAD/SCC number to select + fly to, or null for none. */
  sccNum: number | null;
  /** Resolve the live URL (and optional title/snap) for the given times. */
  buildImage(simulationTime: Date, realTime: number): ImageResult;
}

const pad2 = (value: number): string => value.toString().padStart(2, '0');

/**
 * Format an instant as a short UTC string, e.g. "15 Jun 2025, 14:30".
 * Uses en-GB (a valid BCP-47 tag; the legacy code used the invalid "en-UK").
 */
export function formatUtcTime(date: Date): string {
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

/**
 * Pick the most recent Elektro-L 2 slot that should be available. Elektro
 * publishes every 30 minutes with roughly an hour of latency, and the splash
 * archive only retains about a day, so:
 *   - a future or older-than-a-day sim clock falls back to the latest real slot,
 *   - the chosen instant is backed off ~1h and floored to the 30-min grid.
 */
export function computeElektroSlot(simulationTime: Date, realTime: number): Date {
  const SLOT_MS = 30 * MINUTE_MS;
  const PUBLISH_DELAY_MS = HOUR_MS;
  const simMs = simulationTime.getTime();

  let chosen = simMs;

  if (simMs > realTime || realTime - simMs > DAY_MS) {
    chosen = realTime;
  }

  chosen = Math.floor((chosen - PUBLISH_DELAY_MS) / SLOT_MS) * SLOT_MS;

  return new Date(chosen);
}

/**
 * Build the Elektro-L 2 URL for an instant. The filename is in Moscow time
 * (UTC+3), so both the date and the hour are derived from the MSK-shifted
 * instant. Deriving the hour as `getUTCHours() + 3` (the legacy bug) overflowed
 * past 23 and disagreed with the UTC date across midnight.
 */
export function elektroUrl(slot: Date): string {
  const msk = new Date(slot.getTime() + MSK_OFFSET_MS);
  const year = msk.getUTCFullYear();
  const month = pad2(msk.getUTCMonth() + 1);
  const day = pad2(msk.getUTCDate());
  const hour = pad2(msk.getUTCHours());

  return `https://electro.ntsomz.ru/i/splash/${year}${month}${day}-${hour}00.jpg`;
}

/**
 * Pick the most recent Himawari slot (10-min cadence) that should be available,
 * backing off ~30 minutes for publishing latency. Returns whether the sim clock
 * was in the future so the caller can warn the user.
 */
export function computeHimawariSlot(simulationTime: Date, realTime: number): { slot: Date; isFuture: boolean } {
  const SLOT_MS = 10 * MINUTE_MS;
  const PUBLISH_DELAY_MS = 30 * MINUTE_MS;
  const isFuture = simulationTime.getTime() >= realTime;
  const base = isFuture ? realTime : simulationTime.getTime();
  const slotMs = Math.floor((base - PUBLISH_DELAY_MS) / SLOT_MS) * SLOT_MS;

  return { slot: new Date(slotMs), isFuture };
}

/** Build the Himawari full-disk URL for an instant (UTC date/time). */
export function himawariUrl(slot: Date): string {
  const year = slot.getUTCFullYear();
  const month = pad2(slot.getUTCMonth() + 1);
  const day = pad2(slot.getUTCDate());
  const hour = pad2(slot.getUTCHours());
  const min = pad2(slot.getUTCMinutes());

  return `https://himawari8.nict.go.jp/img/D531106/1d/550/${year}/${month}/${day}/${hour}${min}00_0_0.png`;
}

/**
 * Fixed geostationary imagery feeds. Each is a single public CDN/agency JPEG of
 * the latest full disk. To add a feed, append an entry here; the menu row and
 * click handler are generated from it.
 *
 * NOTE: INSAT-3D (IMD/MOSDAC) and Fengyun-4 (NSMC) were evaluated but neither
 * agency exposes a stable, public single-image full-disk endpoint comparable to
 * the feeds below (their portals are session-gated or tiled), so they are
 * deliberately omitted rather than shipped as dead links. Add them here if a
 * stable URL becomes available.
 */
export const IMAGERY_SOURCES: ImagerySource[] = [
  {
    id: 'meteosat9',
    label: 'Meteosat-9 (IODC)',
    sccNum: 28912,
    buildImage: () => ({
      // IODC = Indian Ocean Data Coverage (Meteosat 9 since 2022).
      url: 'https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSGIODC_RGBNatColour_LowResolution.jpg',
    }),
  },
  {
    id: 'meteosat11',
    label: 'Meteosat-11 (0°)',
    sccNum: 40732,
    buildImage: () => ({
      // Meteosat 11 provides 0° full-earth images every 15 minutes.
      url: 'https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSG_RGBNatColour_LowResolution.jpg',
    }),
  },
  {
    id: 'himawari8',
    label: 'Himawari-8',
    sccNum: 40267,
    buildImage: (simulationTime, realTime) => {
      const { slot, isFuture } = computeHimawariSlot(simulationTime, realTime);

      return { url: himawariUrl(slot), isFuture };
    },
  },
  {
    id: 'goes19',
    label: 'GOES-19 (East)',
    sccNum: 60133,
    buildImage: () => ({
      url: 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/latest.jpg',
    }),
  },
  {
    id: 'goes18',
    label: 'GOES-18 (West)',
    sccNum: 51850,
    buildImage: () => ({
      url: 'https://cdn.star.nesdis.noaa.gov/GOES18/ABI/FD/GEOCOLOR/latest.jpg',
    }),
  },
  {
    id: 'elektro3',
    label: 'Elektro-L 2',
    sccNum: 41105,
    buildImage: (simulationTime, realTime) => {
      const slot = computeElektroSlot(simulationTime, realTime);

      return {
        url: elektroUrl(slot),
        timestampUtc: formatUtcTime(slot),
        isFuture: simulationTime.getTime() > realTime,
      };
    },
  },
];
