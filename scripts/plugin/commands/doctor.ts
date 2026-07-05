/* eslint-disable no-console */
import { classifyCompat, hostVersion } from '../lib/host-version';
import { existingConfigKeys } from '../lib/existing-keys';
import { checkLocales } from '../lib/locale-check';
import { CliError, log } from '../lib/log';
import { validateManifest } from '../lib/plugin-meta';
import { resolvePlugin } from '../lib/resolve-plugin';

type Status = 'PASS' | 'WARN' | 'FAIL';

function line(status: Status, label: string, detail = ''): void {
  const tag = status === 'PASS' ? log.dim('PASS') : status === 'WARN' ? '\x1b[33mWARN\x1b[0m' : '\x1b[31mFAIL\x1b[0m';

  console.log(`  [${tag}] ${label}${detail ? log.dim(`  — ${detail}`) : ''}`);
}

export function doctorCommand(positionals: string[]): number {
  const name = positionals[0];

  if (!name) {
    throw new CliError('Usage: npm run plugin -- doctor <name>');
  }

  const resolved = resolvePlugin(name);

  if (resolved.kind !== 'external') {
    throw new CliError(`"${name}" is a built-in plugin — doctor only checks external plugins.`);
  }

  const { dir, manifest, name: pkg } = resolved;
  const configKeys = manifest.plugins.map((p) => p.configKey);

  console.log(log.bold(`\nDoctor: ${pkg}@${manifest.version}\n`));

  let failed = false;

  // Manifest schema + disk consistency + collisions.
  const { errors, warnings } = validateManifest(manifest, { dir, expectedName: pkg, existingKeys: existingConfigKeys(pkg) });

  if (errors.length === 0) {
    line('PASS', 'Manifest schema, entry files, and configKey collisions');
  } else {
    failed = true;
    for (const e of errors) {
      line('FAIL', e);
    }
  }
  for (const w of warnings) {
    line('WARN', w);
  }

  // Engine compatibility.
  const compat = classifyCompat(manifest.engine);

  if (compat === 'ok') {
    line('PASS', `Engine ${manifest.engine} satisfies host ${hostVersion()}`);
  } else if (compat === 'minor-mismatch') {
    line('WARN', `Engine ${manifest.engine} vs host ${hostVersion()} (same major)`);
  } else {
    failed = true;
    line('FAIL', `Engine ${manifest.engine} incompatible with host ${hostVersion()}`);
  }

  // Locales.
  const loc = checkLocales(dir, configKeys, manifest.localesDir);

  if (!loc.hasLocales) {
    line('WARN', 'No locales/en.src.json found — user-facing strings will not localize');
  } else {
    if (!loc.namespaceOk) {
      line('WARN', `Locale roots should be plugins.<configKey> only (expected: ${configKeys.join(', ')})`);
    }
    if (loc.missingLangs.length > 0) {
      line('WARN', `Missing ${loc.missingLangs.length} language file(s)`, loc.missingLangs.join(', '));
    }
    for (const inc of loc.incompleteLangs) {
      line('WARN', `${inc.lang}.src.json missing ${inc.missingKeys.length} key(s)`, inc.missingKeys.join(', '));
    }
    if (loc.namespaceOk && loc.missingLangs.length === 0 && loc.incompleteLangs.length === 0) {
      line('PASS', 'Locales complete across all 12 languages');
    }
  }

  console.log('');
  if (failed) {
    log.error('Doctor found blocking issues.');

    return 1;
  }
  log.success('Doctor passed.');

  return 0;
}
