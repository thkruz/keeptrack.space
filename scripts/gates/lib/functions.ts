/**
 * Enumerate functions in the gate scope with the TypeScript compiler API.
 * One entry per outermost function-like node (declaration, method, accessor,
 * constructor, arrow, function expression). Nested callbacks count toward the
 * enclosing entry, as in crapper's TypeScript rules.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript-api';

export const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..');

export interface FunctionInfo {
  /** Repo-relative path, forward slashes. */
  file: string;
  name: string;
  /** 1-based, inclusive. */
  startLine: number;
  endLine: number;
  /** Cyclomatic complexity (crapper TypeScript rules). */
  cc: number;
  /** sha1 (12 hex) of the function tokens, comments and whitespace removed. */
  bodyHash: string;
  /** Source lines the function spans. */
  lines: number;
  /** Normalized syntax-node sequence for duplication (see normalizeNodes). */
  nodes?: string[];
}

const EXCLUDE_DIRS = new Set(['node_modules', '__tests__', 'dist', 'coverage']);
const EXCLUDE_PREFIXES = ['src/engine/ootk', 'src/lib/external', 'src/plugins-external'];
const SOURCE_EXT = /\.(ts|tsx)$/;
const TEST_FILE = /(\.test\.|\.spec\.|\.stories\.|\.d\.ts$|\/test\.ts$)/;

export function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

export function globToRegExp(glob: string): RegExp {
  let re = '';

  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];

    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else {
          re += '.*';
        }
      } else {
        re += '[^/]*';
      }
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += `\\${c}`;
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c;
    }
  }

  return new RegExp(`^${re}$`);
}

/** Globs from the plugins-pro submodule's own coverage-exclude.json (dev tooling, not shipped). */
function loadProExcludes(root: string): RegExp[] {
  try {
    const list = JSON.parse(readFileSync(path.join(root, 'src/plugins-pro/coverage-exclude.json'), 'utf-8')) as string[];

    return list.map(globToRegExp);
  } catch {
    return [];
  }
}

/** All gate-scope source files, repo-relative. Scope: src/ minus ootk, vendored and test files; includes plugins-pro. */
export function listSourceFiles(root = REPO_ROOT): string[] {
  const out: string[] = [];
  const proExcludes = loadProExcludes(root);

  const walk = (dirAbs: string, dirRel: string) => {
    for (const entry of readdirSync(dirAbs, { withFileTypes: true })) {
      const rel = `${dirRel}/${entry.name}`;

      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name) || entry.name.startsWith('.')) {
          continue;
        }
        if (EXCLUDE_PREFIXES.includes(rel)) {
          continue;
        }
        walk(path.join(dirAbs, entry.name), rel);
      } else if (SOURCE_EXT.test(entry.name) && !TEST_FILE.test(rel)) {
        if (proExcludes.some((r) => r.test(rel))) {
          continue;
        }
        out.push(rel);
      }
    }
  };

  if (existsSync(path.join(root, 'src'))) {
    walk(path.join(root, 'src'), 'src');
  }

  return out.sort();
}

type FnNode = ts.FunctionDeclaration | ts.MethodDeclaration | ts.ConstructorDeclaration |
  ts.GetAccessorDeclaration | ts.SetAccessorDeclaration | ts.ArrowFunction | ts.FunctionExpression;

export function isFunctionLike(n: ts.Node): n is FnNode {
  return ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isConstructorDeclaration(n) ||
    ts.isGetAccessor(n) || ts.isSetAccessor(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n);
}

/** Cyclomatic complexity of a subtree: 1 + decision points. */
export function complexity(node: ts.Node): number {
  let cc = 1;
  const visit = (n: ts.Node) => {
    switch (n.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression:
      case ts.SyntaxKind.CaseClause:
        cc++;
        break;
      case ts.SyntaxKind.BinaryExpression: {
        const op = (n as ts.BinaryExpression).operatorToken.kind;

        if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken ||
          op === ts.SyntaxKind.QuestionQuestionToken || op === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
          op === ts.SyntaxKind.BarBarEqualsToken || op === ts.SyntaxKind.QuestionQuestionEqualsToken) {
          cc++;
        }
        break;
      }
      case ts.SyntaxKind.PropertyAccessExpression:
      case ts.SyntaxKind.ElementAccessExpression:
      case ts.SyntaxKind.CallExpression:
        if ((n as ts.PropertyAccessExpression | ts.ElementAccessExpression | ts.CallExpression).questionDotToken) {
          cc++;
        }
        break;
      default:
    }
    ts.forEachChild(n, visit);
  };

  ts.forEachChild(node, visit);

  return cc;
}

/**
 * Normalized preorder node sequence (dryer's normalization): locals, fields and
 * literals collapse to placeholders; call names and operators stay; keywords and
 * types drop.
 */
export function normalizeNodes(node: ts.Node, sf: ts.SourceFile): string[] {
  const seq: string[] = [];
  const visit = (n: ts.Node) => {
    if (n.kind === ts.SyntaxKind.EndOfFileToken || n.kind === ts.SyntaxKind.JSDoc) {
      return;
    }
    if (n.kind === ts.SyntaxKind.TrueKeyword || n.kind === ts.SyntaxKind.FalseKeyword || n.kind === ts.SyntaxKind.NullKeyword) {
      seq.push('lit');

      return;
    }
    if (n.kind >= ts.SyntaxKind.FirstKeyword && n.kind <= ts.SyntaxKind.LastKeyword) {
      return;
    }
    if (n.kind >= ts.SyntaxKind.FirstPunctuation && n.kind <= ts.SyntaxKind.LastPunctuation) {
      return; // operators are recorded on their parent below
    }
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      const isCallee = p && ((ts.isCallExpression(p) && p.expression === n) ||
        (ts.isPropertyAccessExpression(p) && p.name === n && p.parent && ts.isCallExpression(p.parent) && p.parent.expression === p));

      seq.push(isCallee ? `call:${n.text}` : 'id');

      return;
    }
    if (ts.isStringLiteralLike(n) || ts.isNumericLiteral(n) || ts.isBigIntLiteral(n) || ts.isRegularExpressionLiteral(n)) {
      seq.push('lit');

      return;
    }
    if (ts.isTypeNode(n)) {
      return; // types do not affect structure
    }
    if (ts.isBinaryExpression(n)) {
      seq.push(`Binary:${n.operatorToken.getText(sf)}`);
    } else if (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) {
      seq.push(`${ts.SyntaxKind[n.kind]}:${n.operator}`);
    } else {
      seq.push(ts.SyntaxKind[n.kind]);
    }
    ts.forEachChild(n, visit);
  };

  ts.forEachChild(node, visit);

  return seq;
}

export function nameOf(n: FnNode, sf: ts.SourceFile): string {
  const own = (n as { name?: ts.Node }).name;

  if (ts.isConstructorDeclaration(n)) {
    const cls = n.parent;

    return `${cls && ts.isClassLike(cls) && cls.name ? cls.name.text : 'class'}.constructor`;
  }

  let base = own ? own.getText(sf) : '';

  if (!base) {
    const p = n.parent;

    if (p && (ts.isVariableDeclaration(p) || ts.isPropertyDeclaration(p) || ts.isPropertyAssignment(p))) {
      base = p.name.getText(sf);
    } else if (p && ts.isBinaryExpression(p)) {
      base = p.left.getText(sf);
    } else if (p && ts.isExportAssignment(p)) {
      base = 'default';
    } else if (p && ts.isCallExpression(p)) {
      base = `${p.expression.getText(sf).slice(0, 40)}(callback)`;
    } else {
      base = '<anonymous>';
    }
  }
  if (ts.isGetAccessor(n)) {
    base = `get ${base}`;
  } else if (ts.isSetAccessor(n)) {
    base = `set ${base}`;
  }

  let cur: ts.Node | undefined = n.parent;

  while (cur) {
    if (ts.isClassLike(cur)) {
      return `${cur.name ? cur.name.text : '<class>'}.${base}`;
    }
    cur = cur.parent;
  }

  return base;
}

export function bodyHashOf(n: ts.Node, sf: ts.SourceFile): string {
  // Re-scan tokens so comments and whitespace do not change the hash.
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, sf.languageVariant, n.getText(sf));
  const toks: string[] = [];

  for (let t = scanner.scan(); t !== ts.SyntaxKind.EndOfFileToken; t = scanner.scan()) {
    toks.push(scanner.getTokenText());
  }

  return createHash('sha1').update(toks.join(' ')).digest('hex').slice(0, 12);
}

export interface ParseOptions {
  withNodes?: boolean;
}

/** Enumerate the outermost functions of one source text. */
export function functionsInSource(file: string, text: string, opts: ParseOptions = {}): FunctionInfo[] {
  const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const out: FunctionInfo[] = [];

  const visit = (n: ts.Node) => {
    if (isFunctionLike(n)) {
      if (!n.body) {
        return; // overload signature or abstract
      }
      const start = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      const end = sf.getLineAndCharacterOfPosition(n.getEnd()).line + 1;
      const info: FunctionInfo = {
        file: toPosix(file),
        name: nameOf(n, sf),
        startLine: start,
        endLine: end,
        cc: complexity(n),
        bodyHash: bodyHashOf(n, sf),
        lines: end - start + 1,
      };

      if (opts.withNodes) {
        info.nodes = normalizeNodes(n, sf);
      }
      out.push(info);

      return; // nested functions belong to this entry
    }
    ts.forEachChild(n, visit);
  };

  visit(sf);

  return out;
}

/** Enumerate functions for the given repo-relative files (default: whole gate scope). */
export function enumerateFunctions(files = listSourceFiles(), opts: ParseOptions = {}, root = REPO_ROOT): FunctionInfo[] {
  const all: FunctionInfo[] = [];

  for (const f of files) {
    const abs = path.join(root, f);

    if (!existsSync(abs) || !statSync(abs).isFile()) {
      continue;
    }
    all.push(...functionsInSource(f, readFileSync(abs, 'utf-8'), opts));
  }

  return all;
}
