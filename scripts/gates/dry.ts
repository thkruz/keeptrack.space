/**
 * Gate 4: structural duplication. Jaccard similarity of normalized-syntax fingerprint sets
 * (4-grams of the normalized preorder node sequence). Defaults from unclebob/dryer:
 * threshold 0.8 (plan), min 4 lines, min 20 nodes. Reimplemented in TS.
 */
import { changedLines, isChangedRange } from './lib/changed';
import { finish, isMain, parseGateArgs, type GateOptions } from './lib/cli';
import { enumerateFunctions, listSourceFiles, type FunctionInfo } from './lib/functions';
import { buildResult, failStatus, type GateItem, type GateResult } from './lib/report';

export const DRY_THRESHOLD = 0.8;
export const DRY_MIN_LINES = 4;
export const DRY_MIN_NODES = 20;
const GRAM = 4;

export function fingerprints(nodes: string[]): Set<string> {
  const set = new Set<string>();

  if (nodes.length < GRAM) {
    set.add(nodes.join('|'));

    return set;
  }
  for (let i = 0; i + GRAM <= nodes.length; i++) {
    set.add(nodes.slice(i, i + GRAM).join('|'));
  }

  return set;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];

  for (const x of small) {
    if (big.has(x)) {
      inter++;
    }
  }

  return inter / (a.size + b.size - inter);
}

export interface DupPair { a: FunctionInfo; b: FunctionInfo; score: number }

/** Find pairs at or above the threshold, using an inverted index to avoid all-pairs scans. */
export function findDuplicates(fns: FunctionInfo[], threshold = DRY_THRESHOLD, minLines = DRY_MIN_LINES, minNodes = DRY_MIN_NODES): DupPair[] {
  const cands = fns.filter((f) => f.lines >= minLines && (f.nodes?.length ?? 0) >= minNodes);
  const prints = cands.map((f) => fingerprints(f.nodes!));
  const index = new Map<string, number[]>();

  prints.forEach((set, i) => {
    for (const fp of set) {
      const list = index.get(fp);

      if (list) {
        list.push(i);
      } else {
        index.set(fp, [i]);
      }
    }
  });

  const pairs: DupPair[] = [];

  for (let i = 0; i < cands.length; i++) {
    const shared = new Map<number, number>();

    for (const fp of prints[i]) {
      const list = index.get(fp)!;

      // Skip very common fingerprints: they cannot make a 0.8 pair on their own and blow up the scan.
      if (list.length > 400) {
        continue;
      }
      for (const j of list) {
        if (j > i) {
          shared.set(j, (shared.get(j) ?? 0) + 1);
        }
      }
    }
    for (const [j, count] of shared) {
      const bound = count / Math.max(prints[i].size, prints[j].size);

      if (bound < threshold - 0.2) {
        continue;
      }
      const score = jaccard(prints[i], prints[j]);

      if (score >= threshold) {
        pairs.push({ a: cands[i], b: cands[j], score });
      }
    }
  }

  return pairs.sort((x, y) => y.score - x.score);
}

export function runDry(opts: GateOptions): GateResult {
  const threshold = opts.flags.threshold ? Number(opts.flags.threshold) : DRY_THRESHOLD;
  const changed = changedLines(opts.base);
  const fns = enumerateFunctions(listSourceFiles(), { withNodes: true });
  const pairs = findDuplicates(fns, threshold);
  const items: GateItem[] = [];

  for (const p of pairs) {
    const aCh = isChangedRange(changed, p.a.file, p.a.startLine, p.a.endLine);
    const bCh = isChangedRange(changed, p.b.file, p.b.startLine, p.b.endLine);
    const isChanged = aCh || bCh;

    if (!opts.all && !isChanged) {
      continue;
    }
    items.push({
      id: `${p.a.file}:${p.a.name}~${p.b.file}:${p.b.name}`,
      file: p.a.file,
      line: p.a.startLine,
      endLine: p.a.endLine,
      name: p.a.name,
      value: Math.round(p.score * 1000) / 1000,
      changed: isChanged,
      status: failStatus(isChanged),
      message: `duplicates ${p.b.file}:${p.b.startLine}-${p.b.endLine} ${p.b.name} (score ${p.score.toFixed(2)})`,
      detail: { other: { file: p.b.file, startLine: p.b.startLine, endLine: p.b.endLine, name: p.b.name }, leftChanged: aCh, rightChanged: bCh, leftNodes: p.a.nodes?.length, rightNodes: p.b.nodes?.length },
    });
  }

  return buildResult({
    gate: 'dry', head: opts.head, base: opts.base, mode: opts.all ? 'all' : 'changed', threshold,
    notes: [`pairs with Jaccard >= ${threshold}, min ${DRY_MIN_LINES} lines, min ${DRY_MIN_NODES} normalized nodes; ${fns.length} functions scanned`], items,
  });
}

if (isMain(import.meta.url)) {
  process.exit(finish(runDry(parseGateArgs(process.argv.slice(2)))));
}
