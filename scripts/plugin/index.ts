/* eslint-disable no-console */
/**
 * KeepTrack plugin CLI — install, scaffold, and develop external plugins.
 *
 *   npm run plugin -- add <git-url|local-path> [--ref <r>] [--name <n>] [--force] [--yes]
 *   npm run plugin -- remove <name> [--keep-files]
 *   npm run plugin -- update [name] [--ref <r>] [--force]
 *   npm run plugin -- list [--json]
 *   npm run plugin -- restore
 *   npm run plugin -- sync [--check] [--skip-locales]
 *   npm run plugin -- create <name>
 *   npm run plugin -- dev <name> [--catalog] [--headless] [--full] [--no-open] [--screenshot] [--pro]
 *   npm run plugin -- test <name> [--watch]
 *   npm run plugin -- doctor <name>
 */
import { addCommand } from './commands/add';
import { createCommand } from './commands/create';
import { devCommand } from './commands/dev';
import { doctorCommand } from './commands/doctor';
import { listCommand } from './commands/list';
import { removeCommand } from './commands/remove';
import { restoreCommand } from './commands/restore';
import { syncCommand } from './commands/sync';
import { testCommand } from './commands/test';
import { updateCommand } from './commands/update';
import { CliError, log } from './lib/log';

interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

/** Parse `--flag`, `--flag value`, and `--flag=value`; everything else is a positional. */
function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }

    const body = arg.slice(2);
    const eq = body.indexOf('=');

    if (eq !== -1) {
      flags[body.slice(0, eq)] = body.slice(eq + 1);
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      flags[body] = argv[++i];
    } else {
      flags[body] = true;
    }
  }

  return { positionals, flags };
}

const HELP = `
KeepTrack Plugin CLI

  add <git-url|local-path>   Install a plugin (clones into src/plugins-external/)
  remove <name>              Uninstall a plugin
  update [name]              Update one or all plugins to their latest ref
  list [--json]              List installed plugins and compatibility
  restore                    Clone plugins recorded in external-plugins.json
  sync [--check]             Regenerate the manifest + locales from installed plugins
  create <name>              Scaffold a new plugin skeleton
  dev <name>                 Boot the app with only this plugin, live-reload
  test <name>                Run this plugin's unit tests
  doctor <name>              Validate a plugin (schema, collisions, locales)
`;

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);
  const { positionals, flags } = parseArgs(rest);

  switch (command) {
    case 'add': return addCommand(positionals, flags);
    case 'remove': return removeCommand(positionals, flags);
    case 'update': return updateCommand(positionals, flags);
    case 'list': return listCommand(flags);
    case 'restore': return restoreCommand();
    case 'sync': return syncCommand(flags);
    case 'create': return createCommand(positionals, flags);
    case 'dev': return devCommand(positionals, flags);
    case 'test': return testCommand(positionals, flags);
    case 'doctor': return doctorCommand(positionals, flags);
    case undefined:
    case 'help':
    case '--help':
      console.log(HELP);

      return 0;
    default:
      log.error(`Unknown command: ${command}`);
      console.log(HELP);

      return 1;
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((e: unknown) => {
    if (e instanceof CliError) {
      log.error(e.message);
    } else {
      log.error(`Unexpected error: ${(e as Error).message}`);
      console.error((e as Error).stack);
    }
    process.exitCode = 1;
  });
