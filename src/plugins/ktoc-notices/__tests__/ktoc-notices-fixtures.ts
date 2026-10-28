import { KtocFetchResult, KtocNotice, KtocNoticesResponse } from '../ktoc-notices-api';

/**
 * Rows shaped exactly like serve-keeptrack-api `GET /v4/notices` (src/routes/v4/notices.ts):
 * every column of the ktoc_notices table, `event_num` and `reason` nullable.
 */
export const NOTICE_RELOCATION: KtocNotice = {
  notice_id: 'KT-20260624-28158-REL',
  norad_id: 28158,
  event_type: 'RELOCATION',
  event_num: 16,
  title: 'USA 176 (DSP 22) Relocation',
  url: 'https://keeptrack.space/ktoc-notice/kt-20260624-28158-rel-usa-176-dsp-22-relocation',
  status: 'CONFIRMED',
  event_date_ms: 1782344700000,
  published_ms: 1785340676000,
  updated_ms: 1785362555000,
  reason: null,
};

/** NORAD 5 is the defaultSat in the standard test catalog. */
export const NOTICE_IN_CATALOG: KtocNotice = {
  notice_id: 'KT-20260801-00005-DEP',
  norad_id: 5,
  event_type: 'DEPARTURE',
  event_num: 47,
  title: 'VANGUARD 1 Departure',
  url: 'https://keeptrack.space/ktoc-notice/kt-20260801-00005-dep-vanguard-1-departure',
  status: 'POTENTIAL',
  event_date_ms: 1785542400000,
  published_ms: 1785550000000,
  updated_ms: 1785550000000,
  reason: null,
};

export const NOTICE_CANCELED: KtocNotice = {
  notice_id: 'KT-20260710-41866-FRG',
  norad_id: 41866,
  event_type: 'FRAGMENTATION',
  event_num: null,
  title: 'GOES 16 Fragmentation',
  url: 'https://keeptrack.space/ktoc-notice/kt-20260710-41866-frg-goes-16-fragmentation',
  status: 'CANCELED',
  event_date_ms: 1783641600000,
  published_ms: 1783650000000,
  updated_ms: 1783700000000,
  reason: 'Later elsets <b>show</b> no new objects near the parent.',
};

export const makeNotice = (i: number, overrides: Partial<KtocNotice> = {}): KtocNotice => ({
  ...NOTICE_RELOCATION,
  notice_id: `KT-2026-${String(i).padStart(5, '0')}`,
  event_num: i,
  event_date_ms: NOTICE_RELOCATION.event_date_ms - i * 86_400_000,
  ...overrides,
});

export const responseBody = (notices: KtocNotice[]): KtocNoticesResponse => ({ count: notices.length, notices });

/** A fetch Response stand-in with the fields fetchKtocNotices reads. */
export const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

export const okResult = (notices: KtocNotice[]): KtocFetchResult => ({ ok: true, notices });

/** A promise whose resolution the test controls, for stale-reply ordering. */
export const deferred = <T>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

export const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) {
    // biome-ignore lint/performance/noAwaitInLoops: microtask flushes must run sequentially
    await Promise.resolve();
  }
};
