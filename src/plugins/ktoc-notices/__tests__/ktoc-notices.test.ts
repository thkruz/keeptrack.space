import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { Mock, vi } from 'vitest';
import { KTOC_ALL_TYPES, KTOC_MENU_IDS, KtocNoticesPlugin } from '../ktoc-notices';
import { KtocFetchResult, KtocNoticeQuery } from '../ktoc-notices-api';
import { deferred, flush, jsonResponse, makeNotice, NOTICE_CANCELED, NOTICE_IN_CATALOG, NOTICE_RELOCATION, okResult, responseBody } from './ktoc-notices-fixtures';

type FetcherMock = Mock<(query: KtocNoticeQuery) => Promise<KtocFetchResult>>;

const rows = () => [...document.querySelectorAll<HTMLTableRowElement>(`#${KTOC_MENU_IDS.TABLE} tr.ktoc-notice-row`)];
const statusText = () => getEl(KTOC_MENU_IDS.STATUS_MSG)!.textContent;
const pageText = () => getEl(KTOC_MENU_IDS.PAGE_TEXT)!.textContent;
const openMenu = () => EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, KTOC_MENU_IDS.BOTTOM_ICON);

describe('KtocNoticesPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    // The default fetcher hits global fetch; keep the generic suites offline.
    global.fetch = vi.fn(() => Promise.resolve(jsonResponse(responseBody([])))) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(KtocNoticesPlugin, 'KtocNoticesPlugin');
  standardPluginMenuButtonTests(KtocNoticesPlugin, 'KtocNoticesPlugin');

  describe('configuration', () => {
    it('lives in Events mode with its own icon id', () => {
      const config = new KtocNoticesPlugin().getBottomIconConfig();

      expect(config.elementName).toBe(KTOC_MENU_IDS.BOTTOM_ICON);
      expect(config.label).toBe('KTOC Notices');
      expect(config.menuMode).toEqual([MenuMode.EVENTS, MenuMode.ALL]);
    });

    it('builds a v13 side menu with the expected ids', () => {
      const config = new KtocNoticesPlugin().getSideMenuConfig();

      expect(config.elementName).toBe(KTOC_MENU_IDS.MENU);
      expect(config.html).toContain('kt-ui-v13');
      for (const id of [KTOC_MENU_IDS.TABLE, KTOC_MENU_IDS.FILTER_ACTIVE, KTOC_MENU_IDS.TYPE_FILTER, KTOC_MENU_IDS.REFRESH]) {
        expect(config.html).toContain(`id="${id}"`);
      }
      expect(config.html).toContain('KTOC (KeepTrack Operations Center)');
    });

    it('registers Shift+K without claiming Ctrl+Shift+K', () => {
      const [shortcut] = new KtocNoticesPlugin().getKeyboardShortcuts();

      expect(shortcut).toMatchObject({ key: 'K', shift: true, ctrl: false });
    });

    it('exposes the two command palette entries', () => {
      const ids = new KtocNoticesPlugin().getCommandPaletteCommands().map((c) => c.id);

      expect(ids).toEqual(['KtocNoticesPlugin.open', 'KtocNoticesPlugin.forSelected']);
    });

    it('provides structured help', () => {
      const help = new KtocNoticesPlugin().getHelpConfig();

      expect(help.title).toBe('KTOC Notices');
      expect(help.sections!.length).toBe(3);
      expect(help.shortcuts![0].keys).toEqual(['Shift', 'K']);
    });
  });

  describe('menu', () => {
    let fetcher: FetcherMock;
    let plugin: KtocNoticesPlugin;

    const init = (result: KtocFetchResult | (() => Promise<KtocFetchResult>)) => {
      fetcher = vi.fn(typeof result === 'function' ? result : () => Promise.resolve(result));
      plugin = new KtocNoticesPlugin(fetcher);
      websiteInit(plugin);
    };

    it('loads the feed on open with no filters', async () => {
      init(okResult([NOTICE_RELOCATION]));
      openMenu();
      await flush();

      expect(plugin.isMenuButtonActive).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher).toHaveBeenCalledWith({});
      expect(rows()).toHaveLength(1);
    });

    it('caches a good result for the session and Refresh fetches again', async () => {
      init(okResult([NOTICE_RELOCATION]));
      openMenu();
      await flush();
      openMenu(); // close
      openMenu(); // reopen
      await flush();

      expect(fetcher).toHaveBeenCalledTimes(1);

      getEl(KTOC_MENU_IDS.REFRESH)!.click();
      await flush();

      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('does not cache a failure', async () => {
      init({ ok: false, failure: 'http', status: 503 });
      openMenu();
      await flush();
      openMenu();
      openMenu();
      await flush();

      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('keeps the list on screen when a Refresh fails, and the next open retries', async () => {
      const results: KtocFetchResult[] = [okResult([NOTICE_RELOCATION]), { ok: false, failure: 'http', status: 500 }, okResult([NOTICE_RELOCATION])];

      init(() => Promise.resolve(results.shift()!));
      openMenu();
      await flush();
      getEl(KTOC_MENU_IDS.REFRESH)!.click();
      await flush();

      expect(rows()).toHaveLength(1);
      expect(statusText()).toBe('Refresh failed (HTTP 500). Showing the previous list.');

      openMenu(); // close
      openMenu(); // reopen: the failure was not cached
      await flush();

      expect(fetcher).toHaveBeenCalledTimes(3);
    });

    it('shows the API key message inline and as a toast on 401', async () => {
      init({ ok: false, failure: 'auth', status: 401 });
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

      openMenu();
      await flush();

      const message = 'API key required. Get a free key at keeptrack.space and add it to settings/data-settings.ts';

      expect(statusText()).toBe(message);
      expect(getEl(KTOC_MENU_IDS.STATUS_MSG)!.classList.contains('ktoc-status-msg-error')).toBe(true);
      expect(toast).toHaveBeenCalledWith(message, expect.anything());
      expect(rows()).toHaveLength(0);
    });

    it('reports a network error inline and as a toast', async () => {
      init({ ok: false, failure: 'network' });
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

      openMenu();
      await flush();

      const message = 'KTOC notices did not load (network error). Select Refresh to try again.';

      expect(statusText()).toBe(message);
      expect(toast).toHaveBeenCalledWith(message, expect.anything());
    });

    it('shows a clear empty message and Page 1 of 1 for an empty feed', async () => {
      init(okResult([]));
      openMenu();
      await flush();

      expect(statusText()).toBe('KTOC has not published any notices yet.');
      expect(pageText()).toBe('Page 1 of 1');
      expect((getEl(KTOC_MENU_IDS.PREV_PAGE) as HTMLButtonElement).disabled).toBe(true);
      expect((getEl(KTOC_MENU_IDS.NEXT_PAGE) as HTMLButtonElement).disabled).toBe(true);
    });

    it('pages 20 rows at a time', async () => {
      init(okResult(Array.from({ length: 45 }, (_, i) => makeNotice(i + 1))));
      openMenu();
      await flush();

      expect(pageText()).toBe('Page 1 of 3');
      expect(rows()).toHaveLength(20);
      expect(rows()[0].cells[0].textContent).toBe('Event 1');

      getEl(KTOC_MENU_IDS.NEXT_PAGE)!.click();
      expect(pageText()).toBe('Page 2 of 3');
      expect(rows()[0].cells[0].textContent).toBe('Event 21');

      getEl(KTOC_MENU_IDS.NEXT_PAGE)!.click();
      expect(rows()).toHaveLength(5);
      expect((getEl(KTOC_MENU_IDS.NEXT_PAGE) as HTMLButtonElement).disabled).toBe(true);

      getEl(KTOC_MENU_IDS.PREV_PAGE)!.click();
      expect(pageText()).toBe('Page 2 of 3');
    });

    it('renders spelled-out columns, the catalog name, and a safe link', async () => {
      init(okResult([NOTICE_IN_CATALOG, NOTICE_RELOCATION]));
      openMenu();
      await flush();

      const [inCatalog, relocation] = rows();
      const cells = [...relocation.cells].map((c) => c.textContent);

      expect(cells.slice(0, 5)).toEqual(['Event 16', '2026-06-24 23:45', '28158', 'Relocation', 'Confirmed']);
      expect(inCatalog.cells[2].textContent).toBe('5 ISS (ZARYA)');
      expect(inCatalog.cells[4].textContent).toBe('Potential');
      expect(relocation.id).toBe(`ktoc-notice-row-${NOTICE_RELOCATION.notice_id}`);

      const link = relocation.querySelector('a.ktoc-notice-link') as HTMLAnchorElement;

      expect(link.href).toBe(NOTICE_RELOCATION.url);
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
    });

    it('marks canceled rows as retracted with the escaped reason as a tooltip', async () => {
      init(okResult([NOTICE_CANCELED]));
      openMenu();
      await flush();

      const [row] = rows();
      const badge = row.querySelector('.ktoc-status-badge')!;

      expect(row.classList.contains('ktoc-notice-canceled')).toBe(true);
      expect(row.cells[0].textContent).toBe('Unnumbered');
      expect(badge.textContent).toBe('Canceled');
      expect(badge.getAttribute('kt-tooltip')).toBe('Later elsets &lt;b&gt;show&lt;/b&gt; no new objects near the parent.');
      expect(badge.hasAttribute('title')).toBe(false);
    });

    describe('filters', () => {
      beforeEach(async () => {
        init(okResult([NOTICE_IN_CATALOG, NOTICE_CANCELED, NOTICE_RELOCATION]));
        openMenu();
        await flush();
      });

      it('Active only hides canceled notices', () => {
        expect(rows()).toHaveLength(3);
        getEl(KTOC_MENU_IDS.FILTER_ACTIVE)!.click();
        expect(rows().map((r) => r.dataset.noticeId)).toEqual([NOTICE_IN_CATALOG.notice_id, NOTICE_RELOCATION.notice_id]);
        expect(getEl(KTOC_MENU_IDS.FILTER_ACTIVE)!.getAttribute('aria-pressed')).toBe('true');

        getEl(KTOC_MENU_IDS.FILTER_ALL)!.click();
        expect(rows()).toHaveLength(3);
      });

      it('builds event type options from the data with explicit ids', () => {
        const select = getEl(KTOC_MENU_IDS.TYPE_FILTER) as HTMLSelectElement;
        const options = [...select.options].map((o) => [o.value, o.textContent]);

        expect(options).toEqual([
          [KTOC_ALL_TYPES, 'All event types'],
          ['DEPARTURE', 'Departure'],
          ['FRAGMENTATION', 'Fragmentation'],
          ['RELOCATION', 'Relocation'],
        ]);
        expect(select.options[1].id).toBe('ktoc-notices-type-option-DEPARTURE');
      });

      it('filters by event type and explains an empty combination', () => {
        const select = getEl(KTOC_MENU_IDS.TYPE_FILTER) as HTMLSelectElement;

        select.value = 'FRAGMENTATION';
        select.dispatchEvent(new Event('change'));
        expect(rows().map((r) => r.dataset.noticeId)).toEqual([NOTICE_CANCELED.notice_id]);

        getEl(KTOC_MENU_IDS.FILTER_ACTIVE)!.click();
        expect(rows()).toHaveLength(0);
        expect(statusText()).toBe('No notices match these filters.');
      });
    });

    describe('row click', () => {
      it('selects the satellite and jumps the clock, keeping play state and the menu open', async () => {
        init(okResult([NOTICE_IN_CATALOG]));
        openMenu();
        await flush();

        const timeManager = ServiceLocator.getTimeManager();
        const selectSat = vi.spyOn(PluginRegistry.getPlugin(SelectSatManager)!, 'selectSat').mockImplementation(() => undefined);
        const changeTime = vi.spyOn(timeManager, 'changeSimulationTime');

        timeManager.propRate = 0;
        rows()[0].cells[1].click();

        expect(changeTime).toHaveBeenCalledWith(NOTICE_IN_CATALOG.event_date_ms);
        expect(timeManager.propRate).toBe(0);
        expect(selectSat).toHaveBeenCalledWith(ServiceLocator.getCatalogManager().sccNum2Id(5));
        expect(plugin.isMenuButtonActive).toBe(true);
        expect(rows()[0].classList.contains('ktoc-notice-row-selected')).toBe(true);
      });

      it('toasts and changes nothing when the satellite is not in the loaded catalog', async () => {
        init(okResult([NOTICE_RELOCATION]));
        openMenu();
        await flush();

        const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');
        const selectSat = vi.spyOn(PluginRegistry.getPlugin(SelectSatManager)!, 'selectSat');
        const changeTime = vi.spyOn(ServiceLocator.getTimeManager(), 'changeSimulationTime');

        vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Id').mockReturnValue(null);
        rows()[0].cells[0].click();

        expect(toast).toHaveBeenCalledWith('NORAD 28158 is not in the loaded catalog.', expect.anything());
        expect(selectSat).not.toHaveBeenCalled();
        expect(changeTime).not.toHaveBeenCalled();
        expect(plugin.isMenuButtonActive).toBe(true);
      });

      it('does not select when the link icon is clicked', async () => {
        init(okResult([NOTICE_IN_CATALOG]));
        openMenu();
        await flush();

        const changeTime = vi.spyOn(ServiceLocator.getTimeManager(), 'changeSimulationTime');
        const link = rows()[0].querySelector('a') as HTMLAnchorElement;

        link.addEventListener('click', (evt) => evt.preventDefault());
        link.click();

        expect(changeTime).not.toHaveBeenCalled();
      });
    });

    describe('per-satellite view', () => {
      it('fetches with norad, shows the chip, and clears back to the full feed', async () => {
        init(okResult([NOTICE_IN_CATALOG]));
        plugin.showNoticesForNorad(5);
        await flush();

        expect(fetcher).toHaveBeenLastCalledWith({ norad: 5 });
        expect(getEl(KTOC_MENU_IDS.NORAD_FILTER)!.style.display).toBe('');
        expect(getEl(KTOC_MENU_IDS.NORAD_FILTER_TEXT)!.textContent).toBe('Showing notices for NORAD 5');

        getEl(KTOC_MENU_IDS.NORAD_FILTER_CLEAR)!.click();
        await flush();

        expect(fetcher).toHaveBeenLastCalledWith({});
        expect(getEl(KTOC_MENU_IDS.NORAD_FILTER)!.style.display).toBe('none');
      });

      it('shows a per-satellite empty message', async () => {
        init(okResult([]));
        plugin.showNoticesForNorad(25544);
        await flush();

        expect(statusText()).toBe('KTOC has not published any notices for NORAD 25544.');
      });

      it('ignores a reply that arrives after the query changed', async () => {
        const first = deferred<KtocFetchResult>();
        const second = deferred<KtocFetchResult>();
        const queue = [first.promise, second.promise];

        init(() => queue.shift()!);
        openMenu();
        plugin.showNoticesForNorad(5);

        second.resolve(okResult([NOTICE_IN_CATALOG]));
        await flush();
        first.resolve(okResult([NOTICE_RELOCATION, NOTICE_CANCELED]));
        await flush();

        expect(rows().map((r) => r.dataset.noticeId)).toEqual([NOTICE_IN_CATALOG.notice_id]);
      });

      it('the selected-satellite command is available only with a catalog satellite selected', () => {
        init(okResult([]));
        const command = plugin.getCommandPaletteCommands().find((c) => c.id === 'KtocNoticesPlugin.forSelected')!;
        const selectSatManager = PluginRegistry.getPlugin(SelectSatManager)!;

        expect(command.isAvailable!()).toBe(false);
        selectSatManager.primarySatObj = ServiceLocator.getCatalogManager().getObject(0) as typeof selectSatManager.primarySatObj;
        expect(command.isAvailable!()).toBe(true);

        const show = vi.spyOn(plugin, 'showNoticesForNorad');

        command.callback();
        expect(show).toHaveBeenCalledWith(5);
      });
    });
  });
});
