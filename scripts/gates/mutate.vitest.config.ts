/**
 * Vitest config used only by the mutation runner. It is the normal unit config plus
 *  - one plugin that serves the mutated text (a per-worker overlay file) for the single module in KT_MUTATE_TARGET,
 *  - an explicit test list (JSON array in the file named by KT_MUTATE_TESTS) replacing `include`.
 * The real source file on disk is never touched.
 */
import { readFileSync } from 'node:fs';
import { BaseSequencer } from 'vitest/node';
import { mergeConfig } from 'vitest/config';
import base from '../../vitest.config';

const norm = (p: string) => p.split(String.fromCharCode(92)).join('/').toLowerCase();
const target = norm(process.env.KT_MUTATE_TARGET ?? '');
const overlay = process.env.KT_MUTATE_OVERLAY ?? '';

/** Runs test files in the order of the KT_MUTATE_TESTS list (kill-first ordering); vitest would otherwise sort by size/cache. */
class ListOrderSequencer extends BaseSequencer {
  async sort(files: Parameters<BaseSequencer['sort']>[0]) {
    const order: string[] = process.env.KT_MUTATE_TESTS ? JSON.parse(readFileSync(process.env.KT_MUTATE_TESTS, 'utf-8')) : [];
    const rank = (f: { moduleId: string }) => {
      const id = norm(f.moduleId);
      const i = order.findIndex((t) => id.endsWith(`/${t.toLowerCase()}`));

      return i < 0 ? order.length : i;
    };

    return [...files].sort((a, b) => rank(a) - rank(b));
  }
}

const merged = mergeConfig(base, {
  plugins: [
    {
      name: 'mutation-overlay',
      enforce: 'pre',
      configureVitest(ctx: { experimental_defineCacheKeyGenerator: (cb: (c: { id: string }) => string | false | undefined) => void }) {
        // Mandatory: without this the fs module cache serves the CLEAN transform for the mutated module.
        ctx.experimental_defineCacheKeyGenerator(({ id }) => (target && norm(id.split('?')[0]) === target ? false : undefined));
      },
      load(id: string) {
        if (target && overlay && norm(id.split('?')[0]) === target) {
          return readFileSync(overlay, 'utf-8');
        }

        return null;
      },
    },
  ],
  test: {
    maxWorkers: Number(process.env.KT_MUTATE_FORKS ?? 2),
    // KT_MUTATE_ISOLATE=0: all files in one worker without per-file isolation (the runner confirms every failure isolated).
    isolate: process.env.KT_MUTATE_ISOLATE !== '0',
    sequence: { sequencer: ListOrderSequencer },
    // Cross-process transform cache: each spawn otherwise re-transforms hundreds of modules (measured 2.5x faster kills).
    experimental: { fsModuleCache: true, fsModuleCachePath: process.env.KT_MUTATE_CACHE ?? 'node_modules/.mutate-vitest-cache' },
  },
});

if (process.env.KT_MUTATE_TESTS) {
  (merged as { test: { include: string[] } }).test.include = JSON.parse(readFileSync(process.env.KT_MUTATE_TESTS, 'utf-8'));
}

export default merged;
