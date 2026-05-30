import * as mod from '@app/engine/plugins/components/side-menu';

describe('engine/plugins/components/side-menu import-smoke', () => {
  it('loads the module namespace without throwing', () => {
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});
