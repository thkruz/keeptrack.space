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
      exclude: [
        'node_modules/**',
        'src/lib/external/**',
        'test/**',
        'dist/**',
        'src/engine/ootk/**',
        '**/*.test.ts',
        '**/*.test.js',
        '**/test.ts',
        '**/test.js',
        '**/*.stories.ts',
        '**/*.stories.js',
      ],
      reportOnFailure: true,
      thresholds: {
        statements: 34,
        branches: 25,
        functions: 41,
        lines: 34,
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
      '@public': path.resolve(__dirname, './public'),
      '@css': path.resolve(__dirname, './public/css'),
      '@test': path.resolve(__dirname, './test'),
      '@wallpapers': path.resolve(__dirname, './src/app/ui/default-wallpapers.ts'),
    },
  },
});
