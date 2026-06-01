import * as mod from '@app/engine/plugins/components/bottom-icon';

describe('engine/plugins/components/bottom-icon import-smoke', () => {
  it('loads the module namespace without throwing', () => {
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});
