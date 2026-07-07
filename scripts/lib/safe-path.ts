import { isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Resolve `segments` against `baseDir` and assert the result stays inside
 * `baseDir`.
 *
 * These scripts are run from the CLI (and, per SonarCloud, by agentic tooling),
 * so any path derived from `process.argv` must be confined to a known-safe root
 * before it reaches the filesystem — otherwise a faulty argument like `../../..`
 * or an absolute system path could read, create, or delete files outside the
 * intended directory. Returns the validated absolute path; throws on escape.
 *
 * @param baseDir  Allowed root. The returned path is guaranteed to be `baseDir`
 *                 itself or a descendant of it.
 * @param segments Path segments (typically CLI-supplied) to join onto the base.
 */
export function resolveWithin(baseDir: string, ...segments: string[]): string {
  const base = resolve(baseDir);
  const target = resolve(base, ...segments);
  const rel = relative(base, target);

  if (rel !== '' && (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel))) {
    throw new Error(`Refusing path outside "${base}": "${target}".`);
  }

  return target;
}

/**
 * Like {@link resolveWithin} but additionally forbids the base directory itself,
 * so the result is always a strict descendant. Use this for destructive or
 * create-then-populate roots (e.g. `rmSync`) where operating on the base itself
 * would be catastrophic.
 */
export function resolveStrictlyWithin(baseDir: string, ...segments: string[]): string {
  const base = resolve(baseDir);
  const target = resolveWithin(base, ...segments);

  if (target === base) {
    throw new Error(`Refusing to operate on the allowed root itself: "${base}".`);
  }

  return target;
}
