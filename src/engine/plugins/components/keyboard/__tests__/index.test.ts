import * as mod from '@app/engine/plugins/components/keyboard';

describe('engine/plugins/components/keyboard import-smoke', () => {
  it('loads the module namespace without throwing', () => {
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});
