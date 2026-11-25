import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { appendJournal, applyMutant, generateMutants, isDone, parseJournal, readJournal, type JournalEntry } from './mutants';

const SRC = `
export function f(a: number, b: number, o?: { p: number }) {
  // a === b in a comment
  const s = 'a === b && true';
  if (a === b && !o) { return a + b; }
  return o?.p ?? 0;
}
export const g = (x: number) => x * 2;
class K { constructor() { this.v = 1; } m() { return true; } }
type T = true;
`;

describe('operator generation', () => {
  const ops = generateMutants('x.ts', SRC, { kinds: ['operator'] });
  const reps = ops.map((m) => `${m.original}>${m.replacement}`);

  it('mutates operators, literals, !, and ?.', () => {
    for (const r of ['===>!==', '&&>||', '+>-', '!>', '?.>.', '??>||', '0>1', '*>/', 'true>false', '1>0']) {
      expect(reps).toContain(r);
    }
  });

  it('skips strings, comments and types', () => {
    expect(ops.every((m) => m.line !== 3 && m.line !== 4 && m.line !== 10)).toBe(true);
    expect(ops.filter((m) => m.original === 'true')).toHaveLength(1);
  });

  it('applies to the original text without editing it', () => {
    const m = ops.find((x) => x.original === '===')!;
    const out = applyMutant(SRC, m);

    expect(out).toContain('a !== b && !o');
    expect(SRC).toContain('a === b && !o');
  });

  it('respects the coverage filter', () => {
    expect(generateMutants('x.ts', SRC, { kinds: ['operator'], covered: () => false })).toHaveLength(0);
  });
});

describe('empty generation', () => {
  const em = generateMutants('x.ts', SRC, { kinds: ['empty'] });

  it('one per function, none for constructors', () => {
    expect(em.map((m) => m.fn).sort()).toEqual(['K.m', 'f', 'g']);
    expect(applyMutant(SRC, em.find((m) => m.fn === 'g')!)).toContain('(x: number) => undefined');
    expect(applyMutant(SRC, em.find((m) => m.fn === 'f')!)).toMatch(/b: number, o\?: \{ p: number \}\) \{\}/);
  });
});

describe('ids', () => {
  it('are stable across runs and shift only with the code', () => {
    const a = generateMutants('x.ts', SRC).map((m) => m.id);
    const b = generateMutants('x.ts', SRC).map((m) => m.id);

    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
    expect(generateMutants('x.ts', SRC.replace('return o?.p ?? 0;', 'return o?.p ?? 0; // c')).map((m) => m.id)).toEqual(a);
  });

  it('body hash changes when the function changes, not for comments', () => {
    const h = (s: string) => generateMutants('x.ts', s, { kinds: ['empty'] }).find((m) => m.fn === 'g')!.bodyHash;

    expect(h(SRC.replace('x * 2', 'x * 2 /* c */'))).toBe(h(SRC));
    expect(h(SRC.replace('x * 2', 'x * 3'))).not.toBe(h(SRC));
  });
});

describe('journal', () => {
  const entry = (id: string, bodyHash: string, result: JournalEntry['result']): JournalEntry => ({
    id, kind: 'operator', file: 'x.ts', fn: 'f', line: 1, col: 1, original: 'a', replacement: 'b', result, durationMs: 5, bodyHash, head: 'abc', ts: 'now',
  });

  it('appends, resumes, skips unchanged ids, reruns changed hashes and errors', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'jr-'));
    const file = path.join(dir, 'journal.jsonl');

    try {
      appendJournal(file, entry('a', 'h1', 'killed'));
      appendJournal(file, entry('b', 'h1', 'error'));
      appendJournal(file, entry('c', 'h1', 'survived'));
      const j = readJournal(file);

      expect(isDone(j, { id: 'a', bodyHash: 'h1' })).toBe(true);
      expect(isDone(j, { id: 'a', bodyHash: 'h2' })).toBe(false);
      expect(isDone(j, { id: 'b', bodyHash: 'h1' })).toBe(false);
      expect(isDone(j, { id: 'zzz', bodyHash: 'h1' })).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ignores a torn last line and lets later lines win', () => {
    const text = `${JSON.stringify(entry('a', 'h', 'survived'))}\n${JSON.stringify(entry('a', 'h', 'killed'))}\n{"id":"b","resu`;
    const j = parseJournal(text);

    expect(j.size).toBe(1);
    expect(j.get('a')!.result).toBe('killed');
  });
});

describe('test map', () => {
  it('orders tests nearest first through the import graph', async () => {
    const { buildTestMap } = await import('./testmap');
    const files: Record<string, string> = {
      'a.test.ts': "import { b } from './b';",
      'c.test.ts': "import { x } from './mid'; import './a.test';",
      'b.ts': 'export const b = 1;',
      'mid.ts': "export * from './b';",
      'x.ts': '',
    };
    const map = buildTestMap(['a.test.ts', 'c.test.ts'], (f) => files[f] ?? null, (s, from) => `${from.includes('/') ? '' : ''}${s.replace('./', '')}${/\.ts$/.test(s) ? '' : '.ts'}`);

    expect(map.get('b.ts')).toEqual([{ test: 'a.test.ts', depth: 1 }, { test: 'c.test.ts', depth: 2 }]);
    expect(map.get('x.ts')).toBeUndefined();
  });
});
