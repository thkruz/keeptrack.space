/**
 * Vitest config used only by the mutation runner. It is the normal unit config plus
 *  - one plugin that serves the mutated text (a per-worker overlay file) for the single module in KT_MUTATE_TARGET,
 *  - an explicit test list (JSON array in the file named by KT_MUTATE_TESTS) replacing `include`.
 * The real source file on disk is never touched.
 */
import { readFileSync } from 'node:fs';
import { mergeConfig } from 'vitest/config';
import base from '../../vitest.config';

const norm = (p: string) => p.split(String.fromCharCode(92)).join('/').toLowerCase();
const target = norm(process.env.KT_MUTATE_TARGET ?? '');
const overlay = process.env.KT_MUTATE_OVERLAY ?? '';

const merged = mergeConfig(base, {
  plugins: [
    {
      name: 'mutation-overlay',
      enforce: 'pre',
      load(id: string) {
        if (target && overlay && norm(id.split('?')[0]) === target) {
          return readFileSync(overlay, 'utf-8');
        }

        return null;
      },
    },
  ],
  test: { maxWorkers: Number(process.env.KT_MUTATE_FORKS ?? 2) },
});

if (process.env.KT_MUTATE_TESTS) {
  (merged as { test: { include: string[] } }).test.include = JSON.parse(readFileSync(process.env.KT_MUTATE_TESTS, 'utf-8'));
}

export default merged;
