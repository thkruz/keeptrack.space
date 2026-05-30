import * as mod from '@app/engine/plugins/lifecycle';

describe('engine/plugins/lifecycle import-smoke', () => {
  it('loads the module namespace without throwing', () => {
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});
