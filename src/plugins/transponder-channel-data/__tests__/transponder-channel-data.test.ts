/* eslint-disable dot-notation */
import { TransponderChannelData } from '@app/plugins/transponder-channel-data/transponder-channel-data';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const mockChannelData = [
  {
    satellite: 'ASTRA 1N',
    tvchannel: 'BBC One',
    beam: 'Europe',
    freq: '10773 H',
    system: 'DVB-S2',
    SRFEC: '22000 2/3',
    video: 'MPEG-4',
    lang: 'English',
    encryption: 'Free',
  },
  {
    satellite: 'ASTRA 1N',
    tvchannel: 'BBC Two',
    beam: 'Europe',
    freq: '10773 H',
    system: 'DVB-S2',
    SRFEC: '22000 2/3',
    video: 'MPEG-4',
    lang: 'English',
    encryption: 'Free',
  },
];

describe('TransponderChannelData_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockChannelData),
      })
    ) as vi.Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(TransponderChannelData, 'TransponderChannelData');
  standardPluginMenuButtonTests(TransponderChannelData, 'TransponderChannelData');

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new TransponderChannelData();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('menu-transponderChannelData');
      expect(config.image).toBeDefined();
      expect(config.isDisabledOnLoad).toBe(true);
    });

    it('should require internet', () => {
      const plugin = new TransponderChannelData();

      expect(plugin.requiresInternet).toBe(true);
    });

    it('should return correct side menu config', () => {
      const plugin = new TransponderChannelData();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('TransponderChannelData-menu');
      expect(config.dragOptions?.isDraggable).toBe(true);
      expect(config.dragOptions?.minWidth).toBe(600);
      expect(config.dragOptions?.maxWidth).toBe(1200);
    });

    it('should return correct help config', () => {
      const plugin = new TransponderChannelData();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.sections!.length).toBeGreaterThan(0);
    });

    it('should return keyboard shortcuts with T key', () => {
      const plugin = new TransponderChannelData();
      const shortcuts = plugin.getKeyboardShortcuts();

      expect(shortcuts.length).toBe(1);
      expect(shortcuts[0].key).toBe('T');
      expect(shortcuts[0].callback).toBeDefined();
    });

    it('should build side menu HTML with table, filter, and export buttons', () => {
      const plugin = new TransponderChannelData();
      const menuHtml = plugin['buildSideMenuHtml_']();

      expect(menuHtml).toContain('TransponderChannelData-table');
      expect(menuHtml).toContain('TransponderChannelData-filter');
      expect(menuHtml).toContain('TransponderChannelData-export-csv');
      expect(menuHtml).toContain('TransponderChannelData-export-xlsx');
    });
  });

  describe('onBottomIconClick', () => {
    it('should not fetch when menu is inactive', () => {
      const plugin = new TransponderChannelData();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = false;

      plugin.onBottomIconClick();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should call bottomIconCallback bridge', () => {
      const plugin = new TransponderChannelData();

      websiteInit(plugin);

      const spy = vi.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('renderTable_', () => {
    it('should handle empty data without throwing', () => {
      const plugin = new TransponderChannelData();

      websiteInit(plugin);

      expect(() => plugin['renderTable_']()).not.toThrow();
    });

    it('should populate the table and cache from rawData_', () => {
      const plugin = new TransponderChannelData();

      websiteInit(plugin);

      plugin['rawData_'] = [...mockChannelData];
      plugin['renderTable_']();

      const table = document.getElementById('TransponderChannelData-table') as HTMLTableElement;

      if (table) {
        expect(table.rows.length).toBeGreaterThan(0);
      }
      expect(plugin['dataCache_'].length).toBe(2);
    });

    it('should apply the filter to the displayed rows', () => {
      const plugin = new TransponderChannelData();

      websiteInit(plugin);

      plugin['rawData_'] = [...mockChannelData];
      plugin['filterQuery_'] = 'BBC Two';
      plugin['renderTable_']();

      expect(plugin['dataCache_'].length).toBe(1);
      expect(plugin['dataCache_'][0].tvchannel).toBe('BBC Two');
    });
  });

  describe('exportData_ / onDownload', () => {
    it('should not crash when data cache is empty', () => {
      const plugin = new TransponderChannelData();

      expect(() => plugin.onDownload()).not.toThrow();
    });

    it('should export data when cache is populated', () => {
      const plugin = new TransponderChannelData();

      plugin['dataCache_'] = [...mockChannelData];

      expect(() => plugin.onDownload()).not.toThrow();
      expect(() => plugin['exportData_']('csv')).not.toThrow();
    });
  });

  describe('loadChannelData_', () => {
    it('should URL-encode the satellite name in the fetch', async () => {
      const plugin = new TransponderChannelData();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;

      const mockSat = {
        id: 0,
        isSatellite: () => true,
        sccNum: '39508',
        name: 'ASTRA 1N',
        altName: 'ASTRA-1N',
      };

      vi.spyOn((await import('@app/engine/core/plugin-registry')).PluginRegistry, 'getPlugin').mockReturnValue({ primarySatObj: mockSat } as never);

      await plugin['loadChannelData_']();

      expect(global.fetch).toHaveBeenCalledWith('https://api.keeptrack.space/v4/channels/ASTRA%201N', expect.objectContaining({}));
    });

    it('should not re-request the alternate name when it matches the primary name', async () => {
      const plugin = new TransponderChannelData();

      websiteInit(plugin);

      const mockSat = {
        id: 0,
        isSatellite: () => true,
        sccNum: '39508',
        name: 'ASTRA 1N',
        altName: 'ASTRA 1N',
      };

      vi.spyOn((await import('@app/engine/core/plugin-registry')).PluginRegistry, 'getPlugin').mockReturnValue({ primarySatObj: mockSat } as never);

      await plugin['loadChannelData_']();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('channel request identity regression', () => {
  beforeEach(() => setupStandardEnvironment());
  afterEach(() => vi.restoreAllMocks());

  it.each([
    [0, 1, 2],
    [2, 1, 0],
    [1, 0, 2],
  ])('keeps newest A for A/B/A completion order %j', async (first, second, third) => {
    const plugin = new TransponderChannelData();
    websiteInit(plugin);
    const aSat = { id: 1, name: 'ABS2', altName: '', isSatellite: () => true };
    const bSat = { ...aSat, id: 2, name: 'ABS2A' };
    let selected = aSat;
    const { PluginRegistry } = await import('@app/engine/core/plugin-registry');
    vi.spyOn(PluginRegistry, 'getPlugin').mockImplementation(() => ({ primarySatObj: selected }) as never);
    const finish: ((value: Response) => void)[] = [];
    global.fetch = vi.fn(() => new Promise<Response>((resolve) => finish.push(resolve))) as never;
    const requests = [plugin['loadChannelData_']()];
    selected = bSat;
    requests.push(plugin['loadChannelData_']());
    selected = aSat;
    requests.push(plugin['loadChannelData_']());
    for (const index of [first, second, third]) {
      finish[index]({ ok: true, json: async () => [{ ...mockChannelData[0], tvchannel: `request-${index}` }] } as Response);
      await requests[index];
    }
    plugin['toggleSort_']('tvchannel');
    expect(plugin['dataCache_'][0].tvchannel).toBe('request-2');
    expect(plugin['lastLoadedSat_']).toBe(1);
  });

  it('keeps B after late A and stale rejection; clears on close and unsupported selection', async () => {
    const plugin = new TransponderChannelData();
    websiteInit(plugin);
    let selected = { id: 1, name: 'ABS2', altName: '', isSatellite: () => true };
    const { PluginRegistry } = await import('@app/engine/core/plugin-registry');
    vi.spyOn(PluginRegistry, 'getPlugin').mockImplementation(() => ({ primarySatObj: selected }) as never);
    let rejectOld!: (error: Error) => void;
    global.fetch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectOld = reject;
          })
      )
      .mockResolvedValueOnce({ ok: true, json: async () => [{ ...mockChannelData[0], satellite: 'ABS2A' }] }) as never;
    const old = plugin['loadChannelData_']();
    selected = { ...selected, id: 2, name: 'ABS2A' };
    await plugin['loadChannelData_']();
    rejectOld(new Error('late failure'));
    await old;
    plugin['toggleSort_']('tvchannel');
    expect(plugin['dataCache_'].map((row) => row.satellite)).toEqual(['ABS2A']);
    plugin.onBottomIconDeselect();
    expect(plugin['dataCache_']).toHaveLength(0);
    selected = { ...selected, isSatellite: () => false };
    await plugin['loadChannelData_']();
    expect(plugin['lastLoadedSat_']).toBe(-1);
  });
  it('offers retry after a failed request and restores export after recovery', async () => {
    const plugin = new TransponderChannelData();
    websiteInit(plugin);
    const selected = { id: 1, name: 'ABS2', altName: '', isSatellite: () => true };
    const { PluginRegistry } = await import('@app/engine/core/plugin-registry');
    vi.spyOn(PluginRegistry, 'getPlugin').mockImplementation(() => ({ primarySatObj: selected }) as never);
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true, json: async () => mockChannelData }) as never;
    await plugin['loadChannelData_']();
    const retry = document.getElementById('TransponderChannelData-retry') as HTMLButtonElement;
    expect(retry.hidden).toBe(false);
    retry.click();
    for (let count = 0; count < 10; count++) {
      // biome-ignore lint/performance/noAwaitInLoops: flush one request promise chain
      await Promise.resolve();
    }
    expect(plugin['dataCache_']).toHaveLength(2);
    expect(retry.hidden).toBe(true);
    expect((document.getElementById('TransponderChannelData-export-csv') as HTMLButtonElement).disabled).toBe(false);
  });
});
