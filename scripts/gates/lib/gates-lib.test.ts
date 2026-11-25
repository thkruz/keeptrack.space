import { describe, expect, it } from 'vitest';
import { extractImports, violates, type DepRule } from '../deps';
import { fingerprints, findDuplicates, jaccard } from '../dry';
import { classify, lintTestSource } from '../test-lint';
import { isChangedRange, parseDiff, rangesOverlap } from './changed';
import { crapScore, functionCoverage, mergeCoverage, parseLcov } from './coverage';
import { functionsInSource, globToRegExp } from './functions';
import { buildResult, exitCode, failStatus, summarize, worst, type GateItem } from './report';

describe('functions', () => {
  const src = `
export function a(x: number) {
  if (x > 1 && x < 5) { return 1; }
  for (const i of [1]) { if (i) { continue; } }
  return x ?? 0;
}
class K {
  m(o?: { p: number }) { return o?.p ? 1 : 2; }
  constructor() { /* nothing */ }
}
export const arrow = (v: number) => {
  switch (v) { case 1: return 1; case 2: return 2; default: return 3; }
};
function outer() { const cb = () => { if (true) { return 1; } }; return cb; }
declare function over(x: number): void;
`;
  const fns = functionsInSource('x.ts', src);
  const byName = (n: string) => fns.find((f) => f.name === n)!;

  it('counts decisions per crapper rules', () => {
    expect(byName('a').cc).toBe(1 + 1 + 1 + 1 + 1 + 1); // if, &&, for, inner if, ??
    expect(byName('K.m').cc).toBe(1 + 1 + 1); // ?. and ?:
    expect(byName('arrow').cc).toBe(3); // two case clauses, default free
  });

  it('charges nested callbacks to the enclosing function and skips overload signatures', () => {
    expect(byName('outer').cc).toBe(2);
    expect(fns.find((f) => f.name === 'over')).toBeUndefined();
    expect(fns.map((f) => f.name)).toContain('K.constructor');
  });

  it('hash ignores comments and whitespace but not code', () => {
    const h = (s: string) => functionsInSource('x.ts', s)[0].bodyHash;

    expect(h('function f(){return 1;}')).toBe(h('function f() {\n // c\n return 1;\n}'));
    expect(h('function f(){return 1;}')).not.toBe(h('function f(){return 2;}'));
  });

  it('globToRegExp handles ** and *', () => {
    expect(globToRegExp('src/**/x.ts').test('src/a/b/x.ts')).toBe(true);
    expect(globToRegExp('src/**/x.ts').test('src/x.ts')).toBe(true);
    expect(globToRegExp('src/*.ts').test('src/a/x.ts')).toBe(false);
  });
});

describe('changed', () => {
  const diff = ['diff --git a/a.ts b/a.ts', '--- a/a.ts', '+++ b/a.ts', '@@ -1,2 +1,3 @@', '@@ -10 +12 @@', '@@ -20,3 +0,0 @@', '+++ /dev/null'].join('\n');

  it('parses new-side hunks and ignores pure deletions', () => {
    const m = parseDiff(diff, 'pre/');

    expect(m.get('pre/a.ts')).toEqual([{ start: 1, end: 3 }, { start: 12, end: 12 }]);
  });

  it('overlaps ranges', () => {
    const m = parseDiff(diff);

    expect(isChangedRange(m, 'a.ts', 3, 5)).toBe(true);
    expect(isChangedRange(m, 'a.ts', 4, 11)).toBe(false);
    expect(isChangedRange(m, 'b.ts', 1, 99)).toBe(false);
    expect(rangesOverlap(undefined, 1, 2)).toBe(false);
  });
});

describe('coverage', () => {
  const lcov = 'SF:src/a.ts\nDA:1,1\nDA:2,0\nDA:3,2\nBRDA:3,0,0,1\nBRDA:3,0,1,-\nend_of_record\nSF:src/b.ts\nDA:1,0\nend_of_record\n';
  const cov = parseLcov(lcov);

  it('prefers branch records, falls back to lines, scores unknown as 0', () => {
    expect(functionCoverage(cov, 'src/a.ts', 3, 3)).toBe(0.5);
    expect(functionCoverage(cov, 'src/a.ts', 1, 2)).toBe(0.5);
    expect(functionCoverage(cov, 'src/a.ts', 50, 60)).toBe(0);
    expect(functionCoverage(cov, 'src/zzz.ts', 1, 9)).toBe(0);
  });

  it('merges maps by summing hits', () => {
    const merged = mergeCoverage(cov, parseLcov('SF:src/a.ts\nDA:2,4\nend_of_record\n'));

    expect(functionCoverage(merged, 'src/a.ts', 1, 2)).toBe(1);
  });

  it('computes CRAP', () => {
    expect(crapScore(5, 1)).toBe(5);
    expect(crapScore(5, 0)).toBe(30);
    expect(crapScore(10, 0.5)).toBeCloseTo(22.5);
  });
});

describe('report', () => {
  const mk = (changed: boolean, status: GateItem['status'], value = 1): GateItem => ({ id: String(Math.random()), file: 'f', line: 1, changed, status, message: '', value });

  it('changed fails, unchanged warns, unconfirmed always warns', () => {
    expect(failStatus(true)).toBe('fail');
    expect(failStatus(false)).toBe('warn');
    expect(failStatus(true, true)).toBe('warn');
  });

  it('exit code comes from changed failures only, and never for --all', () => {
    const items = [mk(true, 'fail'), mk(false, 'warn')];
    const base = { gate: 'g', head: 'h', base: 'b', items };

    expect(exitCode(buildResult({ ...base, mode: 'changed' }))).toBe(1);
    expect(exitCode(buildResult({ ...base, mode: 'all' }))).toBe(0);
    expect(exitCode(buildResult({ ...base, mode: 'changed', items: [mk(false, 'warn')] }))).toBe(0);
    expect(summarize(items)).toMatchObject({ total: 2, fail: 1, warn: 1, changedFail: 1 });
  });

  it('orders worst first', () => {
    expect(worst([mk(false, 'warn', 3), mk(false, 'warn', 9), mk(false, 'pass', 99)], 2).map((i) => i.value)).toEqual([9, 3]);
  });
});

describe('dry', () => {
  const nodes = (n: number, salt = '') => Array.from({ length: n }, (_, i) => `k${i}${salt}`);
  const fn = (name: string, ns: string[], lines = 10) => ({ file: 'f.ts', name, startLine: 1, endLine: lines, cc: 1, bodyHash: name, lines, nodes: ns });

  it('jaccard on fingerprint sets', () => {
    expect(jaccard(fingerprints(nodes(30)), fingerprints(nodes(30)))).toBe(1);
    expect(jaccard(fingerprints(nodes(30)), fingerprints(nodes(30, 'x')))).toBe(0);
  });

  it('reports identical shapes, skips small and dissimilar functions', () => {
    const pairs = findDuplicates([fn('a', nodes(30)), fn('b', nodes(30)), fn('c', nodes(30, 'z')), fn('tiny', nodes(10), 10), fn('short', nodes(30), 3)]);

    expect(pairs).toHaveLength(1);
    expect([pairs[0].a.name, pairs[0].b.name]).toEqual(['a', 'b']);
  });
});

describe('deps', () => {
  const rule: DepRule = { id: 'r', description: '', from: ['src/engine/**'], exceptFrom: ['src/engine/ootk/**'], to: ['src/plugins/**'], confirmed: false };

  it('extracts static, dynamic and re-export specifiers', () => {
    const refs = extractImports("import a from './a';\nexport * from '@app/b';\nconst c = await import('../c');\nconst d = require('d');");

    expect(refs.map((r) => r.specifier)).toEqual(['./a', '@app/b', '../c', 'd']);
    expect(refs[2].line).toBe(3);
  });

  it('matches from/to with exceptions', () => {
    expect(violates(rule, 'src/engine/x.ts', 'src/plugins/p/p.ts')).toBe(true);
    expect(violates(rule, 'src/engine/ootk/x.ts', 'src/plugins/p/p.ts')).toBe(false);
    expect(violates(rule, 'src/app/x.ts', 'src/plugins/p/p.ts')).toBe(false);
    expect(violates(rule, 'src/engine/x.ts', 'src/engine/y.ts')).toBe(false);
  });
});

describe('test-lint', () => {
  const lint = (body: string) => lintTestSource('a.test.ts', body);

  it('classifies assertion quality', () => {
    const cases = lint(`
test('none', () => { run(); });
test('weak', () => { expect(() => run()).not.toThrow(); expect(x).toBeDefined(); });
test('snap', () => { expect(x).toMatchSnapshot(); });
test('good', () => { expect(run()).toBe(1); });
test('mixed', () => { expect(x).toBeDefined(); expect(x.y).toEqual(2); });
it.skip('skipped', () => {});
`);

    expect(cases.map((c) => [c.name, c.verdict])).toEqual([
      ['none', 'no-assertion'], ['weak', 'weak-only'], ['snap', 'weak-only'], ['good', 'ok'], ['mixed', 'ok'], ['skipped', 'no-assertion'],
    ].filter((c) => c[0] !== 'skipped'));
  });

  it('credits local helpers that assert', () => {
    const [c] = lint("const check = () => { expect(1).toBe(1); };\ntest('h', () => { check(); });");

    expect(c.verdict).toBe('ok');
    expect(c.viaHelper).toBe(true);
  });

  it('classify handles empty list', () => {
    expect(classify([])).toBe('no-assertion');
  });
});
