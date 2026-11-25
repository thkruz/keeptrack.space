/**
 * Gate 7: test-quality lint. Flags test cases with no assertion, or whose only assertions are
 * weak: `.not.toThrow()`, `toBeDefined()`, a lone `toMatchSnapshot()`.
 * Also reports whether the two test generators (test/generic-tests.ts, build/utils/create-test-file.ts)
 * produce assertion-free tests.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript-api';
import { changedLines, isChangedRange } from './lib/changed';
import { finish, isMain, parseGateArgs, type GateOptions } from './lib/cli';
import { REPO_ROOT, toPosix } from './lib/functions';
import { buildResult, failStatus, type GateItem, type GateResult } from './lib/report';

export type TestVerdict = 'ok' | 'no-assertion' | 'weak-only';

export interface TestCase { name: string; line: number; endLine: number; verdict: TestVerdict; assertions: string[]; viaHelper: boolean }

const TEST_FNS = new Set(['test', 'it']);
const WEAK = new Set(['not.toThrow', 'toBeDefined', 'toMatchSnapshot']);

/** Matcher chain of an expect call, e.g. `not.toThrow`, or null when the call is not an assertion. */
function assertionOf(call: ts.CallExpression): string | null {
  const names: string[] = [];
  let cur: ts.Expression = call.expression;

  while (ts.isPropertyAccessExpression(cur)) {
    names.unshift(cur.name.text);
    cur = cur.expression;
  }
  if (ts.isCallExpression(cur) && ts.isIdentifier(cur.expression) && cur.expression.text === 'expect' && names.length > 0) {
    return names.filter((n) => n !== 'resolves' && n !== 'rejects').join('.');
  }
  if (ts.isPropertyAccessExpression(call.expression) && ts.isIdentifier(call.expression.expression) &&
    call.expression.expression.text === 'expect' && call.expression.name.text === 'assertions') {
    return 'assertions';
  }
  if (ts.isIdentifier(call.expression) && (call.expression.text === 'assert' || call.expression.text === 'expectTypeOf')) {
    return call.expression.text;
  }

  return null;
}

function collectAssertions(node: ts.Node, helperAssertions: Map<string, string[]>): { list: string[]; viaHelper: boolean } {
  const list: string[] = [];
  let viaHelper = false;
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n)) {
      const a = assertionOf(n);

      if (a) {
        list.push(a);
      } else if (ts.isIdentifier(n.expression) && helperAssertions.has(n.expression.text)) {
        list.push(...helperAssertions.get(n.expression.text)!);
        viaHelper = true;
      }
    }
    ts.forEachChild(n, visit);
  };

  ts.forEachChild(node, visit);

  return { list, viaHelper };
}

export function classify(list: string[]): TestVerdict {
  if (list.length === 0) {
    return 'no-assertion';
  }

  return list.every((a) => WEAK.has(a)) ? 'weak-only' : 'ok';
}

/** Analyse one test file's source text. */
export function lintTestSource(file: string, text: string): TestCase[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const helpers = new Map<string, string[]>();

  // Local helper functions that contain assertions (e.g. standardPluginInit) count for tests that call them.
  const findHelpers = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) && n.name && n.body) {
      const a = collectAssertions(n.body, new Map()).list;

      if (a.length) {
        helpers.set(n.name.text, a);
      }
    } else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer &&
      (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) {
      const a = collectAssertions(n.initializer, new Map()).list;

      if (a.length) {
        helpers.set(n.name.text, a);
      }
    }
    ts.forEachChild(n, findHelpers);
  };

  findHelpers(sf);

  const cases: TestCase[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n)) {
      let callee = n.expression;

      // it.each(table)(name, fn)
      if (ts.isCallExpression(callee)) {
        callee = callee.expression;
      }
      const base = ts.isPropertyAccessExpression(callee) && (callee.name.text === 'each' || callee.name.text === 'concurrent') ? callee.expression : callee;
      const isTest = ts.isIdentifier(base) && TEST_FNS.has(base.text);
      const fn = n.arguments.find((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a)) as ts.ArrowFunction | ts.FunctionExpression | undefined;

      if (isTest && fn) {
        const { list, viaHelper } = collectAssertions(fn.body, helpers);
        const first = n.arguments[0];

        cases.push({
          name: first && ts.isStringLiteralLike(first) ? first.text : first ? first.getText(sf).slice(0, 60) : '<unnamed>',
          line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
          endLine: sf.getLineAndCharacterOfPosition(n.getEnd()).line + 1,
          verdict: classify(list),
          assertions: list,
          viaHelper,
        });

        return;
      }
    }
    ts.forEachChild(n, visit);
  };

  visit(sf);

  return cases;
}

function listTestFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (abs: string, rel: string) => {
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      const r = `${rel}/${e.name}`;

      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name.startsWith('.') || r === 'src/engine/ootk' || r === 'src/plugins-external') {
          continue;
        }
        walk(path.join(abs, e.name), r);
      } else if (/\.test\.(ts|tsx)$/.test(e.name)) {
        out.push(r);
      }
    }
  };

  for (const d of ['src', 'test']) {
    walk(path.join(root, d), d);
  }

  return out.sort();
}

export function runTestLint(opts: GateOptions): GateResult {
  const changed = changedLines(opts.base);
  const items: GateItem[] = [];
  const files = listTestFiles(REPO_ROOT);
  let cases = 0;

  for (const file of files) {
    for (const c of lintTestSource(file, readFileSync(path.join(REPO_ROOT, file), 'utf-8'))) {
      cases++;
      const isChanged = isChangedRange(changed, toPosix(file), c.line, c.endLine);

      if (c.verdict === 'ok' || (!opts.all && !isChanged)) {
        continue;
      }
      items.push({
        id: `${file}:${c.name}`,
        file,
        line: c.line,
        endLine: c.endLine,
        name: c.name,
        value: c.verdict === 'no-assertion' ? 2 : 1,
        changed: isChanged,
        status: failStatus(isChanged),
        message: c.verdict === 'no-assertion' ? 'no assertion' : `only weak assertions (${[...new Set(c.assertions)].join(', ')})`,
        detail: { verdict: c.verdict, assertions: c.assertions, viaHelper: c.viaHelper },
      });
    }
  }

  // Generators: do they emit assertion-free tests?
  const notes = [`${files.length} test files, ${cases} test cases scanned`];
  const gen = 'test/generic-tests.ts';
  const genCases = lintTestSource(gen, readFileSync(path.join(REPO_ROOT, gen), 'utf-8'));
  const genWeak = genCases.filter((c) => c.verdict !== 'ok');

  notes.push(`generator ${gen}: ${genCases.length} generated test templates, ${genWeak.filter((c) => c.verdict === 'no-assertion').length} with no assertion, ${genWeak.filter((c) => c.verdict === 'weak-only').length} with only weak assertions (not.toThrow/toBeDefined); every plugin using standardPluginSuite inherits these`);
  const creator = readFileSync(path.join(REPO_ROOT, 'build/utils/create-test-file.ts'), 'utf-8');

  notes.push(`generator build/utils/create-test-file.ts: ${/writeFileSync\([^,]+,\s*''\)/.test(creator) ? 'writes an EMPTY .test.ts file, so it generates no assertion-free tests' : 'writes non-empty content (review manually)'}`);

  return buildResult({ gate: 'test-lint', head: opts.head, base: opts.base, mode: opts.all ? 'all' : 'changed', notes, items });
}

if (isMain(import.meta.url)) {
  process.exit(finish(runTestLint(parseGateArgs(process.argv.slice(2)))));
}
