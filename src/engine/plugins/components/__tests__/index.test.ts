import * as mod from '@app/engine/plugins/components';

describe('engine/plugins/components import-smoke', () => {
  it('loads the module namespace without throwing', () => {
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});
