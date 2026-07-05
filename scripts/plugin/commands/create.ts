/* eslint-disable no-console */
import { existsSync } from 'node:fs';
import { writeGeneratedManifest } from '../lib/codegen';
import { init as gitInit } from '../lib/git';
import { hostVersion } from '../lib/host-version';
import { validatePluginStrict } from '../lib/install-helpers';
import { readLockfile, writeLockfile } from '../lib/lockfile';
import { CliError, log } from '../lib/log';
import { pluginDir } from '../lib/paths';
import { promptSelect, promptText } from '../lib/prompt';
import { buildVars, kebabCase, type PluginKind, renderPlugin, titleCase } from '../lib/render-template';
import { runGenerateT7e } from '../lib/t7e';

async function gatherOptions(flags: Record<string, string | boolean>): Promise<{ base: string; kind: PluginKind; description: string; author: string }> {
  const skip = Boolean(flags.yes);
  const base = kebabCase(await resolveName_(flags, skip));

  if (!base) {
    throw new CliError('A plugin name is required. Usage: npm run plugin -- create <name>');
  }

  const kind = await resolveKind_(flags, skip);
  const defaultDesc = `A KeepTrack plugin (${titleCase(base)}).`;
  const description = await resolveOption_(flags.description, skip, defaultDesc, () => promptText('Short description', defaultDesc));
  const author = await resolveOption_(flags.author, skip, '', () => promptText('Author', ''));

  return { base, kind, description, author };
}

/** Return a flag value, its skip-default, or the interactive prompt result. */
async function resolveOption_(flag: string | boolean | undefined, skip: boolean, def: string, promptFn: () => Promise<string>): Promise<string> {
  if (typeof flag === 'string') {
    return flag;
  }

  return skip ? def : promptFn();
}

async function resolveName_(flags: Record<string, string | boolean>, skip: boolean): Promise<string> {
  if (typeof flags.name === 'string') {
    return flags.name;
  }

  return skip ? '' : promptText('Plugin name (kebab-case, e.g. aurora-overlay)');
}

async function resolveKind_(flags: Record<string, string | boolean>, skip: boolean): Promise<PluginKind> {
  const raw = await resolveOption_(flags.kind, skip, 'menu', () => promptSelect(
    'What kind of plugin?',
    [
      { value: 'menu', label: 'Menu plugin — a drawer icon that opens a side menu (feature UI)' },
      { value: 'overlay', label: 'Overlay/toggle — a drawer icon that toggles something on/off' },
    ],
  ));

  if (raw !== 'menu' && raw !== 'overlay') {
    throw new CliError(`Unknown kind "${raw}" (expected "menu" or "overlay").`);
  }

  return raw;
}

export async function createCommand(positionals: string[], flags: Record<string, string | boolean>): Promise<number> {
  const merged = { ...flags };

  if (positionals[0] && typeof merged.name !== 'string') {
    merged.name = positionals[0];
  }

  const { base, kind, description, author } = await gatherOptions(merged);
  const vars = buildVars(base, hostVersion(), { description, author });
  const dir = pluginDir(vars.PLUGIN_PKG);

  if (existsSync(dir)) {
    throw new CliError(`src/plugins-external/${vars.PLUGIN_PKG} already exists.`);
  }

  renderPlugin(dir, kind, vars);
  validatePluginStrict(dir, vars.PLUGIN_PKG);

  try {
    gitInit(dir);
  } catch {
    log.warn('git init failed; the plugin folder was created but is not a git repo yet.');
  }

  recordLocalEntry(vars.PLUGIN_PKG);
  writeGeneratedManifest();
  log.step('Regenerating locales…');
  runGenerateT7e();

  printNextSteps(vars.PLUGIN_PKG, vars.CONFIG_KEY, kind);

  return 0;
}

function printNextSteps(pkgName: string, configKey: string, kind: PluginKind): void {
  const devCmd = `npm run plugin -- dev ${configKey}`;

  console.log('');
  log.success(`Created a ${kind} plugin: src/plugins-external/${pkgName} (${configKey})`);
  console.log('');
  console.log(log.bold('  Next steps'));
  console.log(`    1. Preview live:   ${log.bold(devCmd)}`);
  console.log(`    2. Edit the code:  src/plugins-external/${pkgName}/src/plugin.ts`);
  console.log(`    3. Validate:       npm run plugin -- doctor ${configKey}`);
  console.log(`    4. Run tests:      npm run plugin -- test ${configKey}`);
  console.log('');
  console.log(log.dim(`  Publish: cd src/plugins-external/${pkgName} && git remote add origin <url> && git push -u origin main`));
  console.log(log.dim('  Guide:   https://keeptrack.space/docs/plugin-development/getting-started/'));
  console.log('');
}

function recordLocalEntry(pkgName: string): void {
  const lock = readLockfile();

  lock.plugins[pkgName] = {
    url: pluginDir(pkgName),
    ref: 'local',
    commit: 'local',
    installedAt: new Date().toISOString(),
    local: true,
  };
  writeLockfile(lock);
}
