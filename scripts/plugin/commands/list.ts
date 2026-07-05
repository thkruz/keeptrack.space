/* eslint-disable no-console */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { classifyCompat } from '../lib/host-version';
import { readLockfile } from '../lib/lockfile';
import { log } from '../lib/log';
import { pluginDir } from '../lib/paths';
import { readManifest } from '../lib/plugin-meta';
import type { CompatLevel } from '../lib/host-version';

interface ListRow {
  name: string;
  version: string;
  configKeys: string[];
  ref: string;
  commit: string;
  engine: string;
  compat: CompatLevel | 'not-installed' | 'error';
  locales: number;
  onDisk: boolean;
}

function countLocales(dir: string, localesDir = 'locales'): number {
  const abs = join(dir, localesDir);

  if (!existsSync(abs)) {
    return 0;
  }

  return readdirSync(abs).filter((f) => f.endsWith('.src.json')).length;
}

function buildRows(): ListRow[] {
  const lock = readLockfile();

  return Object.entries(lock.plugins).map(([name, entry]): ListRow => {
    const dir = pluginDir(name);
    const onDisk = existsSync(dir);
    const base: ListRow = {
      name, version: '?', configKeys: [], ref: entry.ref, commit: entry.commit.slice(0, 7),
      engine: '?', compat: onDisk ? 'error' : 'not-installed', locales: 0, onDisk,
    };

    if (!onDisk) {
      return base;
    }

    try {
      const m = readManifest(dir);

      return {
        ...base,
        version: m.version,
        configKeys: m.plugins.map((p) => p.configKey),
        engine: m.engine,
        compat: classifyCompat(m.engine),
        locales: countLocales(dir, m.localesDir),
      };
    } catch {
      return base;
    }
  });
}

const COMPAT_LABEL: Record<ListRow['compat'], string> = {
  'ok': 'OK',
  'minor-mismatch': 'WARN',
  'incompatible': 'INCOMPATIBLE',
  'invalid-range': 'BAD-RANGE',
  'not-installed': 'NOT-INSTALLED',
  'error': 'ERROR',
};

export function listCommand(flags: Record<string, string | boolean>): number {
  const rows = buildRows();

  if (flags.json) {
    console.log(JSON.stringify(rows, null, 2));

    return 0;
  }

  if (rows.length === 0) {
    log.info('No external plugins installed. Add one with: npm run plugin -- add <git-url>');

    return 0;
  }

  log.plain(log.bold('\nInstalled external plugins:\n'));
  for (const r of rows) {
    const keys = r.configKeys.length > 0 ? r.configKeys.join(', ') : '—';

    log.plain(`  ${log.bold(r.name)}  ${log.dim(`v${r.version}`)}`);
    log.plain(`    plugins:  ${keys}`);
    log.plain(`    ref:      ${r.ref} @ ${r.commit}`);
    log.plain(`    engine:   ${r.engine}   [${COMPAT_LABEL[r.compat]}]`);
    log.plain(`    locales:  ${r.locales} language file(s)${r.onDisk ? '' : log.dim('   (not on disk — run restore)')}`);
    log.plain('');
  }

  return 0;
}
