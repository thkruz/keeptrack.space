import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from './paths';

/**
 * Regenerate the merged locale bundles + typed keys.ts by running the host's
 * translation generator. It scans src/ ** /locales/*.src.json, so external plugin
 * locales under src/plugins-external are merged automatically.
 */
export function runGenerateT7e(): boolean {
  const res = spawnSync('npx', ['tsx', './build/generate-translation.ts'], {
    cwd: REPO_ROOT,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  return res.status === 0;
}
