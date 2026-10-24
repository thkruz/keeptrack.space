/** Search ignores punctuation and spacing while retaining letters from every locale. */
export const normalizePluginSearch = (value: string): string =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');

/** Historical and common names complement translated labels and stable plugin IDs. */
export const pluginSearchAliases = (id: string): string[] => {
  switch (normalizePluginSearch(id)) {
    case 'transponderchanneldata':
      return ['Satellite Frequencies', 'Transponder', 'Channel Data'];
    case 'multiview':
      return ['Multi-View', 'Multi View'];
    default:
      return [];
  }
};
