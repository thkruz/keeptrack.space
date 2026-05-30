import * as mod from '@app/engine/plugins/core/plugin-interface';

describe('plugin-interface import-smoke', () => {
  it('loads the module namespace without throwing', () => {
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});
