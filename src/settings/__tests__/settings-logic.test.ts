import { SettingsManager } from '@app/settings/settings';

/*
 * SettingsManager.deepMerge is a pure recursive object merge used when applying
 * setting overrides: nested plain objects merge, arrays and scalars replace.
 */
describe('SettingsManager.deepMerge', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merge = (t: object, s: object) => (new SettingsManager() as any).deepMerge(t, s);

  it('adds new keys from the source', () => {
    expect(merge({ a: 1 }, { b: 2 })).toStrictEqual({ a: 1, b: 2 });
  });

  it('overrides scalar values', () => {
    expect(merge({ a: 1 }, { a: 2 })).toStrictEqual({ a: 2 });
  });

  it('recursively merges nested plain objects', () => {
    expect(merge({ a: { x: 1 } }, { a: { y: 2 } })).toStrictEqual({ a: { x: 1, y: 2 } });
  });

  it('replaces arrays rather than merging them', () => {
    expect(merge({ a: [1, 2] }, { a: [3] })).toStrictEqual({ a: [3] });
  });

  it('replaces an object with a scalar when the source is scalar', () => {
    expect(merge({ a: { x: 1 } }, { a: 5 })).toStrictEqual({ a: 5 });
  });
});

describe('SettingsManager.timeMachineString', () => {
  it('returns false (base implementation)', () => {
    expect(new SettingsManager().timeMachineString('2020')).toBe(false);
  });
});
