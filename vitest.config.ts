import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { defineConfig } from 'vitest/config';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

const PLUGINS_PRO_STUB_ID = '\0virtual:plugins-pro-stub';

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(packageJson.version),
    __VERSION_DATE__: JSON.stringify(new Date().toISOString()),
    __COMMIT_HASH__: JSON.stringify(execSync('git rev-parse --short HEAD').toString().trim()),
    __IS_PRO__: JSON.stringify(false),
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
      ],
      reportOnFailure: true,
      // Re-baselined against the full src denominator (coverage.include now counts every
      // src file, not just imported ones). Actuals: lines 60.94 / statements 60.82 /
      // functions 66.32 / branches 48.22 — ratchet upward as coverage climbs.
      thresholds: {
        statements: 60,
        branches: 48,
        functions: 66,
        lines: 60,
      },
    },
    include: ['**/?(*.)+(test).?(m)[jt]s?(x)'],
    exclude: [
      'node_modules/**',
      'offline/**',
      'dist/**',
      'src/admin/**',
      'src/engine/ootk/**',
    ],
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, './src'),
      '@engine': path.resolve(__dirname, './src/engine'),
      '@ootk': path.resolve(__dirname, './src/engine/ootk'),
      '@plugins-pro': path.resolve(__dirname, './src/plugins-pro'),
      '@public': path.resolve(__dirname, './public'),
      '@css': path.resolve(__dirname, './public/css'),
      '@test': path.resolve(__dirname, './test'),
      '@wallpapers': path.resolve(__dirname, './src/app/ui/default-wallpapers.ts'),
    },
  },
});
