/**
 * Static test-to-source map. `vitest related` has to transform every test file's import graph before it can
 * pick tests (measured: ~80 s of startup per invocation here), which is too slow for one run per mutant.
 * This builds the same relation once from the import graph (static, dynamic, re-exports; aliases resolved)
 * and orders each source file's tests nearest first (depth 1 = the test imports the file directly).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { extractImports, resolveSpecifier } from '../deps';
import { REPO_ROOT } from './functions';

const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', 'docs-local', 'offline', 'packages', '.git', '.metrics', '.worktrees']);
const SKIP_PREFIXES = ['src/admin', 'src/engine/ootk', 'src/plugins-external', 'src/plugins-pro/scripts/browser-agent'];
const TEST_RE = /\.test\.[mc]?[jt]sx?$/;

export function listTestFiles(root = REPO_ROOT): string[] {
  const out: string[] = [];
  const walk = (abs: string, rel: string) => {
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;

      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.') && !SKIP_PREFIXES.includes(r)) {
          walk(path.join(abs, e.name), r);
        }
      } else if (TEST_RE.test(e.name)) {
        out.push(r);
      }
    }
  };

  for (const top of ['src', 'test']) {
    if (existsSync(path.join(root, top))) {
      walk(path.join(root, top), top);
    }
  }

  return out;
}

export interface TestRef { test: string; depth: number }

/** Build file -> tests (nearest first). `read` is injectable for unit tests. */
export function buildTestMap(
  tests: string[],
  read: (rel: string) => string | null = (rel) => {
    try {
      return readFileSync(path.join(REPO_ROOT, rel), 'utf-8');
    } catch {
      return null;
    }
  },
  resolve: (spec: string, from: string) => string = (s, f) => resolveSpecifier(s, f),
): Map<string, TestRef[]> {
  const importsCache = new Map<string, string[]>();
  const importsOf = (file: string): string[] => {
    let v = importsCache.get(file);

    if (!v) {
      const text = /\.(ts|tsx|js|mjs|jsx)$/.test(file) ? read(file) : null;

      v = text === null ? [] : [...new Set(extractImports(text, file).map((i) => resolve(i.specifier, file)))]
        .filter((r) => /\.(ts|tsx|js|mjs|jsx)$/.test(r) && !r.endsWith('.d.ts'));
      importsCache.set(file, v);
    }

    return v;
  };
  const map = new Map<string, TestRef[]>();

  for (const t of tests) {
    const seen = new Map<string, number>([[t, 0]]);
    let frontier = [t];

    for (let d = 1; frontier.length; d++) {
      const next: string[] = [];

      for (const f of frontier) {
        for (const i of importsOf(f)) {
          if (!seen.has(i) && !i.startsWith('node_modules')) {
            seen.set(i, d);
            next.push(i);
          }
        }
      }
      frontier = next;
    }
    for (const [f, d] of seen) {
      if (f !== t) {
        const list = map.get(f) ?? [];

        list.push({ test: t, depth: d });
        map.set(f, list);
      }
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.depth - b.depth || a.test.localeCompare(b.test));
  }

  return map;
}
