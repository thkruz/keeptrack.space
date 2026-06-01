import * as mod from '@app/engine/utils/persistence-manager';

describe('persistence-manager import-smoke', () => {
  it('loads the module namespace without throwing', () => {
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});
