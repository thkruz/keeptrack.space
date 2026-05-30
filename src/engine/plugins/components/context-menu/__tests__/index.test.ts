import * as mod from '@app/engine/plugins/components/context-menu';

describe('engine/plugins/components/context-menu import-smoke', () => {
  it('loads the module namespace without throwing', () => {
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});
