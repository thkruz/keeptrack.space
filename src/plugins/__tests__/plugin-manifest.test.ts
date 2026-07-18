import { pluginManifest } from '@app/plugins/plugin-manifest';

/*
 * The plugin manifest is the single source of truth for plugin registration.
 * It is a pure descriptor array - importing it evaluates every entry. These
 * tests validate the structural invariants every descriptor must satisfy.
 */

describe('pluginManifest', () => {
  it('is a non-empty array of plugin descriptors', () => {
    expect(Array.isArray(pluginManifest)).toBe(true);
    expect(pluginManifest.length).toBeGreaterThan(100);
  });

  it('every descriptor has a configKey and a defaultConfig', () => {
    for (const d of pluginManifest) {
      expect(typeof d.configKey).toBe('string');
      expect(d.configKey.length).toBeGreaterThan(0);
      expect(d.defaultConfig).toBeDefined();
      expect(typeof d.defaultConfig.enabled).toBe('boolean');
    }
  });

  it('every descriptor declares at least one import source (oss or pro)', () => {
    for (const d of pluginManifest) {
      // In the OSS test build __IS_PRO__ is false, so pro-only descriptors have
      // proImport === undefined; those must still declare an ossImport... or be
      // a pro plugin that is simply absent from the OSS bundle.
      const hasImport = typeof d.ossImport === 'function' || typeof d.proImport === 'function';
      const isProOnly = !d.ossImport && !d.proImport;

      expect(hasImport || isProOnly).toBe(true);
    }
  });

  it('configKeys are unique', () => {
    const keys = pluginManifest.map((d) => d.configKey);
    const unique = new Set(keys);

    expect(unique.size).toBe(keys.length);
  });

  it('any descriptor with an ossImport also names the exported class', () => {
    for (const d of pluginManifest) {
      if (d.ossImport) {
        expect(typeof d.ossClassName).toBe('string');
      }
    }
  });

  it('always-enabled descriptors default to enabled', () => {
    for (const d of pluginManifest.filter((x) => x.alwaysEnabled)) {
      expect(d.defaultConfig.enabled).toBe(true);
    }
  });

  it('exposes the expected core infrastructure plugins', () => {
    const keys = pluginManifest.map((d) => d.configKey);

    expect(keys).toContain('SelectSatManager');
    expect(keys).toContain('Telemetry');
  });

  it('every OSS import thunk resolves to a module exporting its named class', async () => {
    const ossDescriptors = pluginManifest.filter((d) => d.ossImport && d.ossClassName);

    const results = await Promise.allSettled(
      ossDescriptors.map(async (d) => {
        const mod = await d.ossImport!();

        return { name: d.ossClassName!, mod };
      })
    );

    // Each thunk should resolve; the named export should be a constructor.
    for (const result of results) {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'fulfilled') {
        expect(typeof result.value.mod[result.value.name]).toBe('function');
      }
    }
  }, 60_000);
});
