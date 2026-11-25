/**
 * Gate 5: dependency direction. Rules in deps-rules.json are checked against the import graph.
 * Rules not marked confirmed always warn ("unconfirmed rule"), never fail.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript-api';
import { changedLines, isChangedRange } from './lib/changed';
import { finish, isMain, parseGateArgs, type GateOptions } from './lib/cli';
import { globToRegExp, listSourceFiles, REPO_ROOT } from './lib/functions';
import { buildResult, failStatus, type GateItem, type GateResult } from './lib/report';

export interface DepRule {
  id: string;
  description: string;
  from: string[];
  exceptFrom?: string[];
  to: string[];
  exceptTo?: string[];
  confirmed: boolean;
}

export interface ImportRef { specifier: string; line: number }

/** Path aliases (tsconfig.base.json / vitest.config.ts). Order matters: longer prefixes first. */
const ALIASES: [string, string][] = [
  ['@keeptrack/plugin-api/testing', 'src/plugin-api/testing'],
  ['@keeptrack/plugin-api', 'src/plugin-api/index'],
  ['@plugins-external/', 'src/plugins-external/'],
  ['@plugins-pro/', 'src/plugins-pro/'],
  ['@engine/', 'src/engine/'],
  ['@ootk/', 'src/engine/ootk/'],
  ['@app/', 'src/'],
];

export function extractImports(text: string, file = 'x.ts'): ImportRef[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: ImportRef[] = [];
  const add = (lit: ts.Node | undefined) => {
    if (lit && ts.isStringLiteralLike(lit)) {
      out.push({ specifier: lit.text, line: sf.getLineAndCharacterOfPosition(lit.getStart(sf)).line + 1 });
    }
  };
  const visit = (n: ts.Node) => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier) {
      add(n.moduleSpecifier);
    } else if (ts.isCallExpression(n) && n.arguments.length > 0 &&
      (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require'))) {
      add(n.arguments[0]);
    } else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument)) {
      add(n.argument.literal);
    }
    ts.forEachChild(n, visit);
  };

  visit(sf);

  return out;
}

const EXTS = ['', '.ts', '.tsx', '.js', '.d.ts', '/index.ts', '/index.tsx', '/index.js'];

function probe(rel: string, root: string): string | null {
  for (const e of EXTS) {
    const abs = path.join(root, rel + e);

    if (existsSync(abs) && statSync(abs).isFile()) {
      return rel + e;
    }
  }

  return null;
}

/** Resolve a specifier to a repo-relative path, or return the raw specifier for packages. */
export function resolveSpecifier(spec: string, fromFile: string, root = REPO_ROOT): string {
  if (spec.startsWith('.')) {
    const rel = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));

    return probe(rel, root) ?? rel;
  }
  for (const [prefix, target] of ALIASES) {
    if (spec === prefix || spec.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`) || (!prefix.endsWith('/') && spec === prefix)) {
      const rel = prefix.endsWith('/') ? target + spec.slice(prefix.length) : target;

      return probe(rel, root) ?? rel;
    }
  }

  return spec;
}

const compile = (globs: string[] | undefined) => (globs ?? []).map(globToRegExp);
const anyMatch = (res: RegExp[], s: string) => res.some((r) => r.test(s));

export function violates(rule: DepRule, fromFile: string, resolved: string): boolean {
  return anyMatch(compile(rule.from), fromFile) && !anyMatch(compile(rule.exceptFrom), fromFile) &&
    anyMatch(compile(rule.to), resolved) && !anyMatch(compile(rule.exceptTo), resolved);
}

export function loadRules(file = path.join(import.meta.dirname, 'deps-rules.json')): DepRule[] {
  return (JSON.parse(readFileSync(file, 'utf-8')) as { rules: DepRule[] }).rules;
}

export function runDeps(opts: GateOptions): GateResult {
  const rules = loadRules();
  const changed = changedLines(opts.base);
  const items: GateItem[] = [];
  const perRule: Record<string, number> = {};
  const files = listSourceFiles();
  // .d.ts shims are not in listSourceFiles but src/plugins-pro.d.ts is exempt by rule anyway.

  for (const file of files) {
    const rulesForFile = rules.filter((r) => anyMatch(compile(r.from), file) && !anyMatch(compile(r.exceptFrom), file));

    if (rulesForFile.length === 0) {
      continue;
    }
    for (const imp of extractImports(readFileSync(path.join(REPO_ROOT, file), 'utf-8'), file)) {
      const resolved = resolveSpecifier(imp.specifier, file);

      for (const rule of rulesForFile) {
        if (!violates(rule, file, resolved)) {
          continue;
        }
        const isChanged = isChangedRange(changed, file, imp.line, imp.line);

        if (!opts.all && !isChanged) {
          continue;
        }
        perRule[rule.id] = (perRule[rule.id] ?? 0) + 1;
        items.push({
          id: `${rule.id}:${file}:${imp.line}`,
          file,
          line: imp.line,
          name: rule.id,
          changed: isChanged,
          status: failStatus(isChanged, !rule.confirmed),
          unconfirmed: !rule.confirmed,
          message: `${rule.confirmed ? '' : 'unconfirmed rule: '}imports ${resolved} (${rule.description})`,
          detail: { rule: rule.id, specifier: imp.specifier, resolved },
        });
      }
    }
  }

  const notes = [`${files.length} files scanned`, `violations per rule: ${JSON.stringify(perRule)}`];

  if (rules.some((r) => !r.confirmed)) {
    notes.push(`unconfirmed rules (${rules.filter((r) => !r.confirmed).map((r) => r.id).join(', ')}): violations are warn-level until Ted confirms the rule list`);
  }

  return buildResult({ gate: 'deps', head: opts.head, base: opts.base, mode: opts.all ? 'all' : 'changed', notes, items });
}

if (isMain(import.meta.url)) {
  process.exit(finish(runDeps(parseGateArgs(process.argv.slice(2)))));
}
