/**
 * Mutant generation and the append-only journal for gates 2 (operator) and 3 (empty).
 * Approach from unclebob/mutator, reimplemented over the TypeScript compiler API: mutate AST token
 * positions, so strings, comments and types are never touched. Mutated text is written to a
 * per-worker overlay; sources are never edited in place.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript-api';
import { bodyHashOf, isFunctionLike, nameOf, toPosix } from './functions';

export type MutantKind = 'empty' | 'operator';
export type MutantResult = 'killed' | 'survived' | 'timeout' | 'uncovered' | 'error';

export interface Mutant {
  /** file + function + line + column + original + replacement. */
  id: string;
  kind: MutantKind;
  file: string;
  fn: string;
  fnStart: number;
  fnEnd: number;
  line: number;
  col: number;
  /** Character offsets of the replaced span in the original text. */
  start: number;
  end: number;
  original: string;
  replacement: string;
  /** Hash of the enclosing function (comments and whitespace ignored). */
  bodyHash: string;
}

export interface JournalEntry {
  id: string;
  kind: MutantKind;
  file: string;
  fn: string;
  line: number;
  col: number;
  original: string;
  replacement: string;
  result: MutantResult;
  durationMs: number;
  bodyHash: string;
  head: string;
  ts: string;
}

const BINARY_SWAPS: Record<string, string> = {
  '===': '!==', '!==': '===', '==': '!=', '!=': '==',
  '<': '<=', '<=': '<', '>': '>=', '>=': '>',
  '+': '-', '-': '+', '*': '/', '/': '*',
  '&&': '||', '||': '&&', '??': '||',
};

export function mutantId(file: string, fn: string, line: number, col: number, original: string, replacement: string): string {
  return `${file}|${fn}|${line}|${col}|${original}|${replacement}`;
}

/** Apply a mutant to the original text. */
export function applyMutant(text: string, m: Pick<Mutant, 'start' | 'end' | 'replacement'>): string {
  return text.slice(0, m.start) + m.replacement + text.slice(m.end);
}

export interface GenerateOptions {
  kinds?: MutantKind[];
  /** True when a line was executed by the unit tests; omitted = everything counts as covered. */
  covered?: (line: number) => boolean;
}

export function generateMutants(file: string, text: string, opts: GenerateOptions = {}): Mutant[] {
  const kinds = opts.kinds ?? ['empty', 'operator'];
  const covered = opts.covered ?? (() => true);
  const rel = toPosix(file);
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: Mutant[] = [];
  const lc = (pos: number) => sf.getLineAndCharacterOfPosition(pos);

  const forFunction = (fnNode: ts.Node & { body?: ts.Node }) => {
    const fnStart = lc(fnNode.getStart(sf)).line + 1;
    const fnEnd = lc(fnNode.getEnd()).line + 1;
    const fn = nameOf(fnNode as never, sf);
    const bodyHash = bodyHashOf(fnNode, sf);
    const add = (kind: MutantKind, start: number, end: number, replacement: string) => {
      const p = lc(start);
      const original = text.slice(start, end);
      const line = p.line + 1;
      const col = p.character + 1;

      out.push({
        id: mutantId(rel, fn, line, col, kind === 'empty' ? '{body}' : original, replacement),
        kind, file: rel, fn, fnStart, fnEnd, line, col, start, end, original, replacement, bodyHash,
      });
    };

    if (kinds.includes('empty') && fnNode.body && !ts.isConstructorDeclaration(fnNode)) {
      const body = fnNode.body;
      let anyCovered = false;

      for (let l = fnStart; l <= fnEnd && !anyCovered; l++) {
        anyCovered = covered(l);
      }

      if (ts.isBlock(body)) {
        const trivial = body.statements.length === 0 ||
          (body.statements.length === 1 && ts.isReturnStatement(body.statements[0]) && !body.statements[0].expression);

        if (!trivial && anyCovered) {
          add('empty', body.getStart(sf), body.getEnd(), '{}');
        }
      } else if (anyCovered && !/^(undefined|void 0)$/.test(body.getText(sf))) {
        add('empty', body.getStart(sf), body.getEnd(), 'undefined');
      }
    }

    if (kinds.includes('operator')) {
      const op = (pos: number, end: number, repl: string) => {
        if (covered(lc(pos).line + 1)) {
          add('operator', pos, end, repl);
        }
      };
      const visit = (n: ts.Node) => {
        if (ts.isLiteralTypeNode(n) || (ts.isTypeNode(n) && n.kind !== ts.SyntaxKind.TrueKeyword && n.kind !== ts.SyntaxKind.FalseKeyword && !ts.isExpressionWithTypeArguments(n))) {
          return;
        }

        if (ts.isBinaryExpression(n)) {
          const tok = n.operatorToken;
          const repl = BINARY_SWAPS[tok.getText(sf)];

          if (repl) {
            op(tok.getStart(sf), tok.getEnd(), repl);
          }
        } else if (n.kind === ts.SyntaxKind.TrueKeyword || n.kind === ts.SyntaxKind.FalseKeyword) {
          op(n.getStart(sf), n.getEnd(), n.kind === ts.SyntaxKind.TrueKeyword ? 'false' : 'true');
        } else if (ts.isNumericLiteral(n) && (n.text === '0' || n.text === '1') && n.getText(sf) === n.text) {
          op(n.getStart(sf), n.getEnd(), n.text === '0' ? '1' : '0');
        } else if (ts.isPrefixUnaryExpression(n) && (n.operator === ts.SyntaxKind.ExclamationToken || n.operator === ts.SyntaxKind.MinusToken)) {
          op(n.getStart(sf), n.getStart(sf) + 1, '');
        }
        const qd = (n as { questionDotToken?: ts.Node }).questionDotToken;

        if (qd) {
          op(qd.getStart(sf), qd.getEnd(), ts.isPropertyAccessExpression(n) ? '.' : '');
        }
        ts.forEachChild(n, visit);
      };

      visit(fnNode);
    }
  };

  const walk = (n: ts.Node) => {
    if (isFunctionLike(n)) {
      if (n.body) {
        forFunction(n);
      }

      return; // nested functions belong to the outermost one
    }
    ts.forEachChild(n, walk);
  };

  walk(sf);

  return out;
}

/** Parse journal text. Later lines win for the same id. Tolerates a torn last line. */
export function parseJournal(text: string): Map<string, JournalEntry> {
  const map = new Map<string, JournalEntry>();

  for (const line of text.split('\n')) {
    if (!line.trim()) {
      continue;
    }
    try {
      const e = JSON.parse(line) as JournalEntry;

      if (e && typeof e.id === 'string') {
        map.set(e.id, e);
      }
    } catch { /* partial line from a hard kill */ }
  }

  return map;
}

export function readJournal(file: string): Map<string, JournalEntry> {
  return existsSync(file) ? parseJournal(readFileSync(file, 'utf-8')) : new Map();
}

/** One journal line per finished mutant; appendFileSync hands it to the OS before returning. */
export function appendJournal(file: string, e: JournalEntry): void {
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(e)}\n`);
}

/** Already recorded for this id with an unchanged function body (errors are retried). */
export function isDone(journal: Map<string, JournalEntry>, m: Pick<Mutant, 'id' | 'bodyHash'>): boolean {
  const e = journal.get(m.id);

  return !!e && e.bodyHash === m.bodyHash && e.result !== 'error';
}
