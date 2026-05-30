import * as mod from '@app/engine/plugins/components/secondary-menu';

describe('engine/plugins/components/secondary-menu import-smoke', () => {
  it('loads the module namespace without throwing', () => {
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});
