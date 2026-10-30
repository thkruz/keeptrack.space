import { pluginT7e, settingsManager } from '@keeptrack/plugin-api';

/**
 * Client for the public KTOC (KeepTrack Operations Center) notice index,
 * `GET {apiServer}/v4/notices`. The server contract lives in
 * serve-keeptrack-api `src/routes/v4/notices.ts`: newest event first,
 * canceled notices included unless `activeOnly=true`, at most 100 rows.
 */

/** One row of the `/v4/notices` response, exactly as the server sends it. */
export interface KtocNotice {
  notice_id: string;
  norad_id: number;
  event_type: string;
  event_num: number | null;
  title: string;
  url: string;
  /** POTENTIAL | CONFIRMED | CANCELED (kept as string so a new server status does not break parsing). */
  status: string;
  event_date_ms: number;
  published_ms: number;
  updated_ms: number;
  /** Why the notice reached its current status; cancellations always carry one. */
  reason: string | null;
}

export interface KtocNoticesResponse {
  count: number;
  notices: KtocNotice[];
}

export type KtocFetchFailure = 'auth' | 'http' | 'network' | 'parse';

export interface KtocFetchSuccess {
  ok: true;
  notices: KtocNotice[];
}

export interface KtocFetchError {
  ok: false;
  failure: KtocFetchFailure;
  status?: number;
}

export type KtocFetchResult = KtocFetchSuccess | KtocFetchError;

/** `'failure' in` narrows even in the build tsconfig, where strictNullChecks is off and boolean discriminants do not. */
export const isKtocFetchError = (result: KtocFetchResult): result is KtocFetchError => 'failure' in result;

export interface KtocNoticeQuery {
  norad?: number;
  activeOnly?: boolean;
  limit?: number;
}

/** Server-side maximum for `limit`. */
export const KTOC_NOTICES_MAX_LIMIT = 100;

export const KTOC_STATUS = {
  CONFIRMED: 'CONFIRMED',
  POTENTIAL: 'POTENTIAL',
  CANCELED: 'CANCELED',
} as const;

/** Locale sub-keys under `plugins.KtocNoticesPlugin.types.*`, keyed by normalized event type. */
const EVENT_TYPE_KEYS: Record<string, string> = {
  RELOCATION: 'relocation',
  DEPARTURE: 'departure',
  ARRIVAL: 'arrival',
  DISPOSAL: 'disposal',
  FRAGMENTATION: 'fragmentation',
  BREAKUP: 'breakup',
  DEBRIS_SHED: 'debrisShed',
  PROXIMITY: 'proximity',
  DEPLOYMENT: 'deployment',
  MANEUVER: 'maneuver',
  DRIFT: 'drift',
  REENTRY: 'reentry',
};

/** Locale sub-keys under `plugins.KtocNoticesPlugin.statuses.*`, keyed by normalized status. */
const STATUS_KEYS: Record<string, string> = {
  CONFIRMED: 'confirmed',
  POTENTIAL: 'potential',
  CANCELED: 'canceled',
  CANCELLED: 'canceled',
};

const l = pluginT7e('KtocNoticesPlugin');

/** Strips trailing slashes without a backtracking regex. */
const trimTrailingSlashes_ = (url: string): string => {
  let end = url.length;

  while (end > 0 && url[end - 1] === '/') {
    end--;
  }

  return url.slice(0, end);
};

/** `limit=100` first, then the optional filters, so URLs are stable and easy to match in tests. */
export const buildKtocNoticesUrl = (query: KtocNoticeQuery = {}): string => {
  const base = trimTrailingSlashes_(settingsManager.apiServer);
  const params = new URLSearchParams({ limit: String(query.limit ?? KTOC_NOTICES_MAX_LIMIT) });

  if (typeof query.norad === 'number') {
    params.set('norad', String(query.norad));
  }
  if (query.activeOnly) {
    params.set('activeOnly', 'true');
  }

  return `${base}/v4/notices?${params.toString()}`;
};

/**
 * Fetches notices. Never throws: every failure comes back as a typed result so
 * callers can choose their own toast and inline copy. The key is sent only when
 * one is configured; first-party origins are accepted by the API without one,
 * so a missing key is reported by the server (401), not guessed here.
 */
export const fetchKtocNotices = async (query: KtocNoticeQuery = {}, signal?: AbortSignal): Promise<KtocFetchResult> => {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const apiKey = settingsManager.apiKey;

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  let response: Response;

  try {
    response = await fetch(buildKtocNoticesUrl(query), { method: 'GET', headers, signal });
  } catch {
    return { ok: false, failure: 'network' };
  }

  if (response.status === 401 || response.status === 403) {
    return { ok: false, failure: 'auth', status: response.status };
  }
  if (!response.ok) {
    return { ok: false, failure: 'http', status: response.status };
  }

  try {
    const body = (await response.json()) as Partial<KtocNoticesResponse> | null;

    if (!body || !Array.isArray(body.notices)) {
      return { ok: false, failure: 'parse', status: response.status };
    }

    // The server already sorts newest event first; sort again so the table order never depends on it.
    const notices = body.notices.filter(isNoticeShaped_).sort((a, b) => b.event_date_ms - a.event_date_ms);

    return { ok: true, notices };
  } catch {
    return { ok: false, failure: 'parse', status: response.status };
  }
};

const isNoticeShaped_ = (n: unknown): n is KtocNotice => {
  const notice = n as KtocNotice | null;

  return (
    typeof notice === 'object' &&
    notice !== null &&
    typeof notice.notice_id === 'string' &&
    typeof notice.norad_id === 'number' &&
    typeof notice.event_type === 'string' &&
    typeof notice.status === 'string' &&
    typeof notice.event_date_ms === 'number'
  );
};

/** Canonical upper-snake form used as the filter option id: "debris-shed" and "Debris Shed" both become DEBRIS_SHED. */
export const normalizeKtocCode = (raw: string): string =>
  (raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/gu, '_');

/** "ORBIT_RAISE" -> "Orbit Raise": readable fallback for codes the app does not know yet. */
const humanizeCode_ = (code: string): string =>
  code
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');

export const ktocEventTypeLabel = (rawType: string): string => {
  const code = normalizeKtocCode(rawType);
  const key = EVENT_TYPE_KEYS[code];

  if (key) {
    return l(`types.${key}`);
  }

  return humanizeCode_(code) || l('types.other');
};

export const ktocStatusLabel = (rawStatus: string): string => {
  const code = normalizeKtocCode(rawStatus);
  const key = STATUS_KEYS[code];

  if (key) {
    return l(`statuses.${key}`);
  }

  return humanizeCode_(code) || l('statuses.unknown');
};

export const isKtocCanceled = (notice: KtocNotice): boolean => STATUS_KEYS[normalizeKtocCode(notice.status)] === 'canceled';

/** "Event 47", or the unnumbered label when the event has no number yet. */
export const ktocEventLabel = (eventNum: number | null): string =>
  typeof eventNum === 'number' ? l('values.eventNumber').replace('{num}', String(eventNum)) : l('values.unnumbered');

/** The one UTC formatter for KTOC dates: "2026-06-24 23:45 UTC" (no suffix under a "Date (UTC)" header). */
export const formatKtocUtc = (ms: number, isSuffixed = true): string => {
  if (!Number.isFinite(ms)) {
    return l('values.unknownDate');
  }
  const stamp = new Date(ms).toISOString().slice(0, 16).replace('T', ' ');

  return isSuffixed ? `${stamp} UTC` : stamp;
};

/** Only http(s) notice links are rendered as anchors. */
export const isSafeNoticeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);

    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

/** Escapes text placed into the kt-tooltip attribute (the tooltip renders it as HTML). */
export const escapeKtocHtml = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
