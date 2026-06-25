import { vi } from 'vitest';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { CatalogBrowserPlugin } from '@app/plugins/catalog-browser/catalog-browser';
import { CatalogBrowserData } from '@app/plugins/catalog-browser/catalog-browser-data';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';

describe('CatalogBrowserPlugin_class', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment();
  });

  standardPluginSuite(CatalogBrowserPlugin);
  standardPluginMenuButtonTests(CatalogBrowserPlugin);
});

describe('CatalogBrowserPlugin_composition', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment();
  });

  test('getBottomIconConfig returns correct config', () => {
    const plugin = new CatalogBrowserPlugin();
    const config = plugin.getBottomIconConfig();

    expect(config.elementName).toBe('menu-catalog-browser');
    expect(config.image).toBeDefined();
  });

  test('getSideMenuConfig returns correct config', () => {
    const plugin = new CatalogBrowserPlugin();
    const config = plugin.getSideMenuConfig();

    expect(config.elementName).toBe('catalog-browser-menu');
    expect(config.html).toContain('cb-orbital-data-only');
    expect(config.html).toContain('cb-catalog-list');
  });

  test('getHelpConfig returns help content', () => {
    const plugin = new CatalogBrowserPlugin();
    const config = plugin.getHelpConfig();

    expect(config.title).toBeDefined();
    expect(config.sections!.length).toBeGreaterThan(0);
  });

  test('getCommandPaletteCommands returns commands for all catalogs', () => {
    const plugin = new CatalogBrowserPlugin();
    const commands = plugin.getCommandPaletteCommands();
    const totalEntries = CatalogBrowserData.categories.reduce((sum, cat) => sum + cat.entries.length, 0);

    const keepTrackCatalogCount = 3; // default, celestrak-only, vimpel-only

    expect(commands.length).toBe(totalEntries + keepTrackCatalogCount);
    expect(commands.some((c) => c.id === 'CatalogBrowserPlugin.load.starlink')).toBe(true);
    expect(commands.some((c) => c.id === 'CatalogBrowserPlugin.load.gps-ops')).toBe(true);
  });
});

describe('CatalogBrowserPlugin_url', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment();
  });

  test('buildCelesTrackUrl_ uses main GP endpoint for GROUP queries', () => {
    const plugin = new CatalogBrowserPlugin();
    const url = (plugin as any).buildCelesTrackUrl_('GROUP=STARLINK');

    expect(url).toContain('gp.php');
    expect(url).toContain('GROUP=STARLINK');
    expect(url).toContain('FORMAT=3LE');
    expect(url).not.toContain('sup-gp.php');
  });

  test('buildCelesTrackUrl_ uses supplemental endpoint for FILE queries', () => {
    const plugin = new CatalogBrowserPlugin();
    const url = (plugin as any).buildCelesTrackUrl_('FILE=iss');

    expect(url).toContain('sup-gp.php');
    expect(url).toContain('FILE=iss');
    expect(url).toContain('FORMAT=3LE');
  });
});

describe('CatalogBrowserPlugin_fetch', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment();
  });

  test('fetchAndLoadCatalog_ prevents concurrent fetches', async () => {
    const plugin = new CatalogBrowserPlugin();

    (plugin as any).isLoading_ = true;

    const mockFetch = vi.fn();

    globalThis.fetch = mockFetch;
    await (plugin as any).fetchAndLoadCatalog_('GROUP=STARLINK');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('CatalogBrowserData', () => {
  test('categories getter returns non-empty array', () => {
    const categories = CatalogBrowserData.categories;

    expect(categories.length).toBeGreaterThan(0);
  });

  test('all entries have unique IDs', () => {
    const ids = CatalogBrowserData.categories.flatMap((cat) => cat.entries.map((e) => e.id));
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  test('all entries have valid queryParam format', () => {
    for (const cat of CatalogBrowserData.categories) {
      for (const entry of cat.entries) {
        expect(entry.queryParam).toMatch(/^(?<type>GROUP|SPECIAL|FILE)=/u);
      }
    }
  });

  test('all categories have unique IDs', () => {
    const ids = CatalogBrowserData.categories.map((cat) => cat.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });
});
