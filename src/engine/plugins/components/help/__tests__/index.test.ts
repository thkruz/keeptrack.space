import * as mod from '@app/engine/plugins/components/help';

describe('engine/plugins/components/help import-smoke', () => {
  it('loads the module namespace without throwing', () => {
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});
