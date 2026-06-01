import * as mod from '@app/plugins/sat-info-box-object/sat-info-box-object-settings';

describe('sat-info-box-object-settings import-smoke', () => {
  it('loads the module namespace without throwing', () => {
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});
