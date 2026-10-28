import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { settingsManager } from '@app/settings/settings';
import { CatalogSource, Satellite } from '@ootk/src/main';
import { defaultMisl, defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { Mock, vi } from 'vitest';
import { KtocNoticesPlugin } from '../ktoc-notices';
import { KtocFetchResult, KtocNoticeQuery } from '../ktoc-notices-api';
import { KTOC_INFO_BOX_IDS, KtocNoticesInfoBoxSection } from '../ktoc-notices-info-box';
import { deferred, flush, jsonResponse, NOTICE_CANCELED, NOTICE_IN_CATALOG, NOTICE_RELOCATION, okResult, responseBody } from './ktoc-notices-fixtures';

type FetcherMock = Mock<(query: KtocNoticeQuery) => Promise<KtocFetchResult>>;

const section = () => document.getElementById(KTOC_INFO_BOX_IDS.SECTION)!;
const listRows = () => [...document.querySelectorAll<HTMLElement>(`#${KTOC_INFO_BOX_IDS.LIST} .ktoc-sat-info-row`)];
const satA = new Satellite({ ...defaultSat, id: 1, sccNum: '28158', name: 'USA 176' });
const satB = new Satellite({ ...defaultSat, id: 2, sccNum: '41866', name: 'GOES 16' });

describe('KtocNoticesInfoBoxSection', () => {
  let fetcher: FetcherMock;
  let onShowAll: Mock<(norad: number) => void>;
  let infoBox: KtocNoticesInfoBoxSection;

  beforeEach(() => {
    setupStandardEnvironment();
    settingsManager.apiKey = 'kt_00112233445566778899aabbccddeeff';
    fetcher = vi.fn(() => Promise.resolve(okResult([NOTICE_RELOCATION])));
    onShowAll = vi.fn();
    infoBox = new KtocNoticesInfoBoxSection(onShowAll, fetcher);
    document.body.insertAdjacentHTML('beforeend', (KtocNoticesInfoBoxSection as unknown as { createSectionHtml_: () => string }).createSectionHtml_());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads "25+" when the card request comes back full, since there may be more', async () => {
    const page = Array.from({ length: 25 }, (_, i) => ({ ...NOTICE_RELOCATION, notice_id: `KT-TEST-${i}` }));

    fetcher.mockResolvedValue(okResult(page));
    infoBox.update(satA);
    await flush();

    expect(document.getElementById(KTOC_INFO_BOX_IDS.TITLE)!.textContent).toBe('KTOC Notices (25+)');
    expect(document.querySelector(`#${KTOC_INFO_BOX_IDS.SHOW_ALL} .ktoc-sat-info-show-all-label`)!.textContent).toBe('Show all 25+ in KTOC Notices');
  });

  it('fetches once per selected NORAD number and shows the notices', async () => {
    infoBox.update(satA);
    await flush();

    expect(fetcher).toHaveBeenCalledWith({ norad: 28158, limit: 25 });
    expect(section().style.display).toBe('');
    expect(document.getElementById(KTOC_INFO_BOX_IDS.TITLE)!.textContent).toBe('KTOC Notices (1)');
    expect(listRows()).toHaveLength(1);
    expect(listRows()[0].textContent).toContain('Event 16: Relocation');
    expect(listRows()[0].textContent).toContain('2026-06-24 23:45 UTC');

    infoBox.update(satA);
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('renders notice links that open in a new tab', async () => {
    infoBox.update(satA);
    await flush();

    const link = listRows()[0] as HTMLAnchorElement;

    expect(link.tagName).toBe('A');
    expect(link.href).toBe(NOTICE_RELOCATION.url);
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.target).toBe('_blank');
  });

  it('ignores a stale reply after the selection changed', async () => {
    const first = deferred<KtocFetchResult>();
    const second = deferred<KtocFetchResult>();
    const queue = [first.promise, second.promise];

    fetcher.mockImplementation(() => queue.shift()!);

    infoBox.update(satA);
    infoBox.update(satB);
    first.resolve(okResult([NOTICE_RELOCATION]));
    await flush();

    expect(section().style.display).toBe('none');
    expect(listRows()).toHaveLength(0);

    second.resolve(okResult([NOTICE_CANCELED]));
    await flush();

    expect(listRows().map((r) => r.id)).toEqual([`ktoc-notices-sat-info-row-${NOTICE_CANCELED.notice_id}`]);
  });

  it('ignores a stale reply after deselection', async () => {
    const pending = deferred<KtocFetchResult>();

    fetcher.mockImplementation(() => pending.promise);
    infoBox.update(satA);
    infoBox.update(null);
    pending.resolve(okResult([NOTICE_RELOCATION]));
    await flush();

    expect(section().style.display).toBe('none');
  });

  it('stays hidden when the satellite has no notices', async () => {
    fetcher.mockResolvedValue(okResult([]));
    infoBox.update(satA);
    await flush();

    expect(section().style.display).toBe('none');
  });

  it('stays hidden and stops asking after the API rejects the key, until the key changes', async () => {
    fetcher.mockResolvedValue({ ok: false, failure: 'auth', status: 401 });
    infoBox.update(satA);
    await flush();
    infoBox.update(satB);
    await flush();

    expect(section().style.display).toBe('none');
    expect(fetcher).toHaveBeenCalledTimes(1);

    settingsManager.apiKey = 'kt_ffeeddccbbaa99887766554433221100';
    infoBox.update(satB);
    await flush();

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not cache a network failure', async () => {
    fetcher.mockResolvedValueOnce({ ok: false, failure: 'network' });
    infoBox.update(satA);
    await flush();
    infoBox.update(satA);
    await flush();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(section().style.display).toBe('');
  });

  it('skips objects without a public NORAD number', async () => {
    infoBox.update(defaultMisl);
    infoBox.update(new Satellite({ ...defaultSat, id: 3, sccNum: '99999', source: CatalogSource.VIMPEL }));
    await flush();

    expect(fetcher).not.toHaveBeenCalled();
    expect(KtocNoticesInfoBoxSection.noradOf(defaultSat)).toBe(5);
  });

  it('marks canceled notices and carries the reason as a kt-tooltip', async () => {
    fetcher.mockResolvedValue(okResult([NOTICE_CANCELED]));
    infoBox.update(satB);
    await flush();

    const [row] = listRows();

    expect(row.classList.contains('ktoc-notice-canceled')).toBe(true);
    expect(row.getAttribute('kt-tooltip')).toContain('&lt;b&gt;show&lt;/b&gt;');
    expect(row.textContent).toContain('Canceled');
  });

  it('shows at most five rows and a show-all link with the full count', async () => {
    fetcher.mockResolvedValue(okResult(Array.from({ length: 7 }, (_, i) => ({ ...NOTICE_IN_CATALOG, notice_id: `KT-${i}` }))));
    infoBox.update(satA);
    await flush();

    expect(listRows()).toHaveLength(5);
    expect(document.getElementById(KTOC_INFO_BOX_IDS.SHOW_ALL)!.textContent).toContain('Show all 7 in KTOC Notices');
  });
});

describe('KtocNoticesPlugin info box registration', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    global.fetch = vi.fn(() => Promise.resolve(jsonResponse(responseBody([NOTICE_RELOCATION])))) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds the section to the info box and the show-all link opens the filtered menu', async () => {
    const fetcher: FetcherMock = vi.fn(() => Promise.resolve(okResult([NOTICE_RELOCATION])));
    const plugin = new KtocNoticesPlugin(fetcher);

    websiteInit(plugin);

    expect(section()).toBeTruthy();

    plugin.infoBoxSection.update(satA);
    await flush();

    const show = vi.spyOn(plugin, 'showNoticesForNorad').mockImplementation(() => undefined);

    document.getElementById(KTOC_INFO_BOX_IDS.SHOW_ALL)!.click();
    expect(show).toHaveBeenCalledWith(28158);
  });
});
