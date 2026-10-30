import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import os from 'node:os';
import path from 'path';
import { defineConfig } from 'vitest/config';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

/*
 * The plugins-pro submodule keeps developer tooling (generators, media
 * pipelines, local datasets) alongside its plugin code. Those directories are
 * not shipped app code and are excluded from the coverage ratchet via a list
 * the submodule owns, so their names stay private. OSS checkouts have an
 * empty submodule and get an empty list.
 */
let pluginsProCoverageExcludes: string[] = [];

try {
  pluginsProCoverageExcludes = JSON.parse(readFileSync('./src/plugins-pro/coverage-exclude.json', 'utf-8'));
} catch {
  pluginsProCoverageExcludes = [];
}

const PLUGINS_PRO_STUB_ID = '\0virtual:plugins-pro-stub';

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(packageJson.version),
    __VERSION_DATE__: JSON.stringify(new Date().toISOString()),
    __COMMIT_HASH__: JSON.stringify(execSync('git rev-parse --short HEAD').toString().trim()),
    __IS_PRO__: JSON.stringify(false),
    __EDITION__: JSON.stringify('oss'),
    __PROPAGATOR_BACKEND__: JSON.stringify('sgp4'),
  },
  plugins: [
    {
      name: 'stub-plugins-pro',
      enforce: 'pre',
      async resolveId(id, importer) {
        if (!id.includes('plugins-pro/')) {
          return null;
        }

        const resolved = await this.resolve(id, importer, { skipSelf: true });

        if (resolved) {
          return resolved;
        }

        return PLUGINS_PRO_STUB_ID;
      },
      load(id) {
        if (id === PLUGINS_PRO_STUB_ID) {
          return 'export default {};';
        }

        return null;
      },
    },
  ],
  test: {
    /*
     * Cap fork concurrency. The default (one fork per logical core - 32 on the
     * dev box) makes the initial worker burst exceed what Windows will commit,
     * and forks die semi-randomly with "Zone Allocation failed - process out
     * of memory" at a few hundred MB of JS heap, failing the pre-push run.
     * 12 forks bounds peak memory; CI runners (2-4 cores) are unaffected.
     */
    maxWorkers: Math.min(12, Math.max(1, os.availableParallelism() - 1)),
    /*
     * The CI coverage run is ~8x slower than a local run: plugin smoke tests
     * that take well under a second here take 4-9 s there and trip the 5 s
     * default. Keep the defaults locally so a real hang still fails fast.
     */
    testTimeout: process.env.CI ? 30_000 : 5_000,
    hookTimeout: process.env.CI ? 30_000 : 10_000,
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/polyfills.js', './test/vitest-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'html', 'text'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/**',
        // 'node_modules/**' is root-relative and misses the copy inside the
        // plugins-pro submodule, which has its own package.json.
        '**/node_modules/**',
        'src/lib/external/**',
        'test/**',
        'dist/**',
        'src/engine/ootk/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.js',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/__tests__/**',
        '**/test.ts',
        '**/test.js',
        '**/*.stories.ts',
        '**/*.stories.js',
        // Third-party external plugins are not held to the host coverage ratchet.
        'src/plugins-external/**',
        // Pro developer tooling (list owned by the submodule; empty for OSS).
        ...pluginsProCoverageExcludes,
      ],
      reportOnFailure: true,
      // Re-baselined 2026-08-03 after excluding pro dev tooling from the denominator
      // (it had dragged the gate below threshold as tooling moved under src/). Actuals:
      // lines 72.41 / statements 72.39 / functions 73.37 / branches 58.86 — ratchet
      // upward as coverage climbs.
      thresholds: {
        statements: 72,
        branches: 58,
        functions: 73,
        lines: 72,
      },
    },
    include: ['**/?(*.)+(test).?(m)[jt]s?(x)'],
    exclude: [
      // Retained private QA workspaces junction the source tree; never rediscover tests there.
      'docs-local/**',
      'node_modules/**',
      '**/node_modules/**',
      // Private MCP harness tests use node:test and run separately.
      'src/plugins-pro/scripts/browser-agent/*.test.js',
      'offline/**',
      'dist/**',
      'src/admin/**',
      'src/engine/ootk/**',
      // External plugin tests run in the plugin's own repo CI, not the host suite.
      'src/plugins-external/**',
      // Bare "test.ts" files are CLI commands/tooling (e.g. the plugin CLI's
      // `test` command), not vitest suites. Real tests are named "*.test.ts".
      '**/test.ts',
      // CI helper scripts (e.g. the plugins-pro supgp logic tests) use Node's
      // built-in `node:test` runner and run in their own repo CI, not vitest.
      '**/.github/**',
    ],
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, './src'),
      '@engine': path.resolve(__dirname, './src/engine'),
      '@ootk': path.resolve(__dirname, './src/engine/ootk'),
      '@plugins-pro': path.resolve(__dirname, './src/plugins-pro'),
      '@plugins-external': path.resolve(__dirname, './src/plugins-external'),
      '@public': path.resolve(__dirname, './public'),
      '@css': path.resolve(__dirname, './public/css'),
      '@test': path.resolve(__dirname, './test'),
      '@wallpapers': path.resolve(__dirname, './src/app/ui/default-wallpapers.ts'),
      // Public plugin facade (docs/plugin-api.md). The `/testing` entry must come
      // first: aliases match in order and the bare key also matches `<key>/...`.
      '@keeptrack/plugin-api/testing': path.resolve(__dirname, './src/plugin-api/testing.ts'),
      '@keeptrack/plugin-api': path.resolve(__dirname, './src/plugin-api/index.ts'),
      // Bare `ootk` (used by external plugins) resolves to the in-tree submodule.
      ootk: path.resolve(__dirname, './src/engine/ootk/src/main.ts'),
    },
  },
});
