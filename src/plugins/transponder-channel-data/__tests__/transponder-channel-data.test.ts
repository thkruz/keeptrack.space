import { vi } from 'vitest';
/* eslint-disable dot-notation */
import { TransponderChannelData } from '@app/plugins/transponder-channel-data/transponder-channel-data';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

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
      }),
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

    it('should build side menu HTML with table', () => {
      const plugin = new TransponderChannelData();
      const menuHtml = plugin['buildSideMenuHtml_']();

      expect(menuHtml).toContain('TransponderChannelData-table');
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

  describe('cleanData_', () => {
    it('should remove duplicate entries', () => {
      const plugin = new TransponderChannelData();
      const duplicateData = [
        ...mockChannelData,
        mockChannelData[0], // exact duplicate
      ];

      const result = plugin['cleanData_'](duplicateData);

      expect(result.length).toBe(2);
    });

    it('should handle empty data', () => {
      const plugin = new TransponderChannelData();
      const result = plugin['cleanData_']([]);

      expect(result.length).toBe(0);
    });
  });

  describe('displayChannelData_', () => {
    it('should handle empty data array', () => {
      const plugin = new TransponderChannelData();

      websiteInit(plugin);

      expect(() => plugin['displayChannelData_']([])).not.toThrow();
    });

    it('should populate table with data', () => {
      const plugin = new TransponderChannelData();

      websiteInit(plugin);

      plugin['displayChannelData_'](mockChannelData);

      const table = document.getElementById('TransponderChannelData-table') as HTMLTableElement;

      if (table) {
        expect(table.rows.length).toBeGreaterThan(0);
      }
    });

    it('should cache data for export', () => {
      const plugin = new TransponderChannelData();

      websiteInit(plugin);

      plugin['displayChannelData_'](mockChannelData);

      expect(plugin['dataCache_'].length).toBe(2);
    });
  });

  describe('exportData_ / onDownload', () => {
    it('should not crash when data cache is empty', () => {
      const plugin = new TransponderChannelData();

      expect(() => plugin.onDownload()).not.toThrow();
    });

    it('should export data when cache is populated', () => {
      const plugin = new TransponderChannelData();

      plugin['dataCache_'] = mockChannelData;

      expect(() => plugin.onDownload()).not.toThrow();
    });
  });

  describe('showTable_', () => {
    it('should URL-encode satellite name in fetch', async () => {
      const plugin = new TransponderChannelData();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;

      // Mock a satellite with spaces in name
      const mockSat = {
        id: 0,
        isSatellite: () => true,
        sccNum: '39508',
        name: 'ASTRA 1N',
        altName: 'ASTRA-1N',
      };

      vi.spyOn(
        (await import('@app/engine/core/plugin-registry')).PluginRegistry,
        'getPlugin',
      ).mockReturnValue({ primarySatObj: mockSat } as never);

      await plugin['showTable_']();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.keeptrack.space/v4/channels/ASTRA%201N',
        expect.objectContaining({}),
      );
    });
  });
});
