import * as mod from '@app/engine/plugins/core';

describe('engine/plugins/core import-smoke', () => {
  it('loads the module namespace without throwing', () => {
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});
