import { normalizePluginSearch, pluginSearchAliases } from '@app/engine/utils/plugin-search';
import { t7e } from '@app/locales/keys';
import type { Mock } from 'vitest';

vi.mock('@app/locales/keys', () => ({
  t7e: vi.fn((key: string) => key),
}));

describe('pluginSearchAliases', () => {
  beforeEach(() => {
    (t7e as unknown as Mock).mockImplementation((key: string) => key);
  });

  it('returns no aliases for unknown plugins', () => {
    expect(pluginSearchAliases('SomethingElse')).toEqual([]);
  });

  it('keeps the English aliases when the locale key is missing', () => {
    expect(pluginSearchAliases('TransponderChannelData')).toEqual(['Satellite Frequencies', 'Transponder', 'Channel Data']);
  });

  it('appends translated aliases, deduped and without empty entries', () => {
    (t7e as unknown as Mock).mockImplementation((key: string) => (key === 'plugins.TransponderChannelData.searchAliases' ? 'Satellitenfrequenzen, ,Transponder,,Kanaldaten' : key));

    expect(pluginSearchAliases('TransponderChannelData')).toEqual(['Satellite Frequencies', 'Transponder', 'Channel Data', 'Satellitenfrequenzen', 'Kanaldaten']);
  });

  it('reads multi-view aliases from the Plugin Manager namespace', () => {
    (t7e as unknown as Mock).mockImplementation((key: string) => (key === 'plugins.PluginManagerPlugin.searchAliases.multiView' ? 'マルチビュー,Multi View' : key));

    expect(pluginSearchAliases('multi-view')).toEqual(['Multi-View', 'マルチビュー']);
  });

  it('normalizes punctuation and case for matching', () => {
    expect(normalizePluginSearch('Multi-View')).toBe('multiview');
  });
});
