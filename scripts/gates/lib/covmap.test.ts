import { describe, expect, it } from 'vitest';
import { CovMap, decodeRanges, encodeLines, failingTestFile, hashText, orderTests, segmentsOf, timeoutFor } from './covmap';

describe('covmap', () => {
  it('round-trips line ranges', () => {
    expect(encodeLines([5, 1, 2, 3, 9, 3])).toBe('1-3,5,9');
    expect(decodeRanges('1-3,5,9')).toEqual([[1, 3], [5, 5], [9, 9]]);
  });

  it('segments lines by identical test sets', () => {
    const per = new Map<number, [number, number][]>([[0, [[1, 5]]], [1, [[3, 8]]]]);

    expect(segmentsOf(per)).toEqual([[1, 2, [0]], [3, 5, [0, 1]], [6, 8, [1]]]);
  });

  it('selects covering tests and falls back when stale, missing or uncovered', () => {
    const text = 'abc';
    const data = {
      version: 1 as const, head: 'h', builtAt: '', buildSeconds: 0, tests: ['package.json', 'tsconfig.json'], testInfo: {},
      files: { 'a.ts': { hash: hashText(text), seg: [[1, 5, [0]], [6, 9, [0, 1]]] as [number, number, number[]][] } },
    };
    const cm = new CovMap(data, () => text);

    expect(cm.select('a.ts', 7, 7)).toEqual({ selector: 'coverage', tests: ['package.json', 'tsconfig.json'] });
    expect(cm.select('a.ts', 2, 3)).toEqual({ selector: 'coverage', tests: ['package.json'] });
    expect(cm.select('a.ts', 20, 30)).toEqual({ selector: 'import-graph', reason: 'no-covering-test' });
    expect(cm.select('b.ts', 1, 1)).toEqual({ selector: 'import-graph', reason: 'file-not-in-map' });
    expect(new CovMap(data, () => 'changed').select('a.ts', 2, 3)).toEqual({ selector: 'import-graph', reason: 'stale' });
  });

  it('orders by past kills then baseline duration, and sets the timeout from the baseline', () => {
    const ms = (t: string) => ({ a: 50, b: 10, c: 30 })[t] ?? 0;

    expect(orderTests(['a', 'b', 'c'], undefined, ms)).toEqual(['b', 'c', 'a']);
    expect(orderTests(['a', 'b', 'c'], new Map([['a', 2], ['c', 1]]), ms)).toEqual(['a', 'c', 'b']);
    expect(timeoutFor(1000)).toBe(30_000);
    expect(timeoutFor(20_000)).toBe(70_000);
  });

  it('reads the failing test file from reporter output', () => {
    expect(failingTestFile(' FAIL  src/app/x/__tests__/y.test.ts > suite > case\nAssertionError')).toBe('src/app/x/__tests__/y.test.ts');
    expect(failingTestFile('all good')).toBeNull();
  });
});
