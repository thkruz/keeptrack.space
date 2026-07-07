import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

/**
 * Vitest config for EXTERNAL plugin tests. The main config excludes
 * src/plugins-external/** from the host suite (third-party tests run in their own
 * repos); `npm run plugin -- test <name>` uses this config to run one plugin's
 * tests with the same jsdom env, aliases, and setup, but scoped to that folder.
 */
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['src/plugins-external/**/?(*.)+(test|spec).?(m)[jt]s?(x)'],
    exclude: ['**/node_modules/**', 'dist/**'],
  },
});
