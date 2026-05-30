import * as mod from '@app/plugins/catalog-browser/catalog-browser-settings';

describe('catalog-browser-settings import-smoke', () => {
  it('loads the module namespace without throwing', () => {
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});
