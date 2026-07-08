import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Cloudflare Pages rejects any single deployed file larger than 25 MiB.
 *
 * On 2026-07-08 all three Cloudflare Pages builds broke because
 * public/tle/tle.json was converted to the verbose CelesTrak OMM JSON format,
 * which ballooned it from ~18.9 MiB to ~28 MiB:
 *
 *   ✘ [ERROR] Error: Pages only supports files up to 25 MiB in size
 *     tle/tle.json is 28 MiB in size
 *
 * Everything committed under public/ is copied verbatim into dist/ by
 * build/build-manager.ts (copyTopLevelFiles + the resourceDirs list) and shipped
 * to Cloudflare, so any tracked file that crosses the 25 MiB limit fails the
 * deploy. This test guards that invariant so the mistake cannot recur silently.
 *
 * It scopes to git-TRACKED files on purpose: Cloudflare builds from a fresh
 * clone, so gitignored local artifacts (e.g. the ~89 MiB
 * public/data/catalog.notes.md) never reach the deploy and must not fail CI.
 */
const MIB = 1024 * 1024;

/** Hard ceiling enforced by Cloudflare Pages. Exceeding it breaks the deploy. */
const CLOUDFLARE_MAX_FILE_BYTES = 25 * MIB;

/**
 * Early-warning threshold. Files at or above this are still deployable but are
 * close enough to the ceiling that the next content update could push them over,
 * so we surface them loudly without failing the build.
 */
const DANGER_ZONE_BYTES = 22 * MIB;

/** Repo-root-relative paths of every git-tracked file under public/. */
const trackedPublicFiles = (): string[] => {
  const stdout = execFileSync('git', ['ls-files', '-z', 'public'], {
    encoding: 'utf8',
    maxBuffer: 64 * MIB,
  });

  return stdout.split('\0').filter((path) => path.length > 0);
};

describe('Cloudflare Pages deploy asset size limits', () => {
  const files = trackedPublicFiles();

  it('finds tracked public/ assets to inspect', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('keeps every committed public/ asset under the Cloudflare Pages 25 MiB per-file limit', () => {
    const offenders: string[] = [];
    const approaching: string[] = [];

    for (const relPath of files) {
      let size: number;

      try {
        size = statSync(join(process.cwd(), relPath)).size;
      } catch {
        continue; // Tracked-but-missing or symlink edge cases are not our concern here.
      }

      const sizeMib = (size / MIB).toFixed(1);

      if (size >= CLOUDFLARE_MAX_FILE_BYTES) {
        offenders.push(`${relPath} - ${sizeMib} MiB (limit 25 MiB)`);
      } else if (size >= DANGER_ZONE_BYTES) {
        approaching.push(`${relPath} - ${sizeMib} MiB`);
      }
    }

    if (approaching.length > 0) {
      console.warn(
        `[deploy-asset-size] These committed public/ assets are approaching Cloudflare's 25 MiB per-file limit:\n  ${approaching.join('\n  ')}`,
      );
    }

    expect(
      offenders,
      `The following committed public/ assets exceed Cloudflare Pages' 25 MiB per-file limit and will break the deploy:\n  ${offenders.join('\n  ')}\n\nShrink the file (e.g. keep the compact catalog format instead of verbose OMM JSON), split it, or serve it from an external host.`,
    ).toEqual([]);
  });
});
