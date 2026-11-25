/**
 * Changed-code detection: git diff against the merge-base with develop, parsed
 * into per-file changed line ranges, then intersected with function ranges.
 *
 * Limitation: src/plugins-pro is a submodule. The superproject diff only sees a
 * pointer change, so its files are diffed inside the submodule against the
 * merge-base of its HEAD with its own origin/develop (or origin/main, origin/HEAD,
 * whichever exists first). `--base` applies to the superproject only.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, toPosix } from './functions';

export interface LineRange { start: number; end: number }
export type ChangedMap = Map<string, LineRange[]>;

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
}

function tryGit(cwd: string, args: string[]): string | null {
  try {
    return git(cwd, args).trim();
  } catch {
    return null;
  }
}

/** Default base: merge-base of HEAD with local develop, else origin/develop. */
export function resolveBase(cwd = REPO_ROOT, explicit?: string): string {
  if (explicit) {
    return tryGit(cwd, ['merge-base', 'HEAD', explicit]) ?? explicit;
  }
  for (const ref of ['develop', 'origin/develop']) {
    const mb = tryGit(cwd, ['merge-base', 'HEAD', ref]);

    if (mb) {
      return mb;
    }
  }
  throw new Error('Cannot find develop or origin/develop; pass --base <ref>');
}

function resolveSubmoduleBase(cwd: string): string | null {
  for (const ref of ['origin/develop', 'origin/main', 'origin/HEAD']) {
    const mb = tryGit(cwd, ['merge-base', 'HEAD', ref]);

    if (mb) {
      return mb;
    }
  }

  return null;
}

/** Parse `git diff -U0` output into new-side line ranges per file. */
export function parseDiff(diff: string, prefix = ''): ChangedMap {
  const map: ChangedMap = new Map();
  let current: string | null = null;

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const p = line.slice(4).trim();

      current = p === '/dev/null' ? null : `${prefix}${p.replace(/^b\//, '')}`;
      if (current && !map.has(current)) {
        map.set(current, []);
      }
    } else if (line.startsWith('@@') && current) {
      const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);

      if (m) {
        const start = Number(m[1]);
        const count = m[2] === undefined ? 1 : Number(m[2]);

        if (count > 0) {
          map.get(current)!.push({ start, end: start + count - 1 });
        }
      }
    }
  }

  return map;
}

function diffRepo(cwd: string, base: string, prefix: string, map: ChangedMap) {
  const diff = git(cwd, ['diff', '-U0', '--no-color', '--no-ext-diff', '--diff-filter=ACMR', base, '--', '.']);

  for (const [f, r] of parseDiff(diff, prefix)) {
    map.set(f, r);
  }
  // Untracked, not ignored: whole file is new.
  const untracked = git(cwd, ['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);

  for (const u of untracked) {
    map.set(`${prefix}${toPosix(u)}`, [{ start: 1, end: Number.MAX_SAFE_INTEGER }]);
  }
}

/** Changed line ranges (repo-relative paths) for the superproject and the plugins-pro submodule. */
export function changedLines(base: string, root = REPO_ROOT): ChangedMap {
  const map: ChangedMap = new Map();

  diffRepo(root, base, '', map);

  const sub = path.join(root, 'src/plugins-pro');

  if (existsSync(path.join(sub, '.git'))) {
    const subBase = resolveSubmoduleBase(sub);

    if (subBase) {
      diffRepo(sub, subBase, 'src/plugins-pro/', map);
    }
  }

  return map;
}

export function rangesOverlap(ranges: LineRange[] | undefined, start: number, end: number): boolean {
  if (!ranges) {
    return false;
  }

  return ranges.some((r) => r.start <= end && r.end >= start);
}

export function isChangedRange(changed: ChangedMap, file: string, start: number, end: number): boolean {
  return rangesOverlap(changed.get(file), start, end);
}

/** Subset of items (anything with file/startLine/endLine) that touch a changed line. */
export function changedFunctions<T extends { file: string; startLine: number; endLine: number }>(items: T[], changed: ChangedMap): T[] {
  return items.filter((f) => isChangedRange(changed, f.file, f.startLine, f.endLine));
}
