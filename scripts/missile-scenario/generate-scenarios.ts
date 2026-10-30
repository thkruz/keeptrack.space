/*
 * CLI for the notional missile-scenario generator.
 *
 * Regenerates the scripted "mass raid" JSON files the Missile Simulator plugin
 * loads, using the current in-app trajectory solver so scripted raids stay
 * identical to hand-created launches. Everything it produces is fictional and
 * meant for education / sensor-coverage what-ifs.
 *
 * Usage (from the repo root):
 *   npm run missile:scenarios -- --list
 *   npm run missile:scenarios -- --all
 *   npm run missile:scenarios -- --scenario iran-israel
 *   npm run missile:scenarios -- --all --out public/simulation
 *
 * Flags:
 *   --list                 print every scenario id and exit
 *   --all                  generate every scenario
 *   --scenario <id>        generate a single scenario (repeatable)
 *   --out <dir>            output directory (default: public/simulation)
 *   --seed <n>             extra seed offset (default: 0) for a different draw
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateScenario } from './generator';
import { SCENARIOS, Scenario, getScenario } from './scenario-config';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Return every value following each occurrence of a repeatable flag. */
function getArgAll(flag: string): string[] {
  const out: string[] = [];

  for (let i = 0; i < process.argv.length - 1; i++) {
    if (process.argv[i] === flag) {
      out.push(process.argv[i + 1]);
    }
  }

  return out;
}

/** Return the value following a single-valued flag, or undefined. */
function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);

  return idx === -1 || idx === process.argv.length - 1 ? undefined : process.argv[idx + 1];
}

// eslint-disable-next-line no-console
const log = console.log.bind(console);

if (process.argv.includes('--list')) {
  log('Available missile scenarios:\n');
  for (const s of SCENARIOS) {
    log(`  ${s.id.padEnd(28)} -> ${s.file.padEnd(30)} ${s.title}`);
  }
  process.exit(0);
}

const outDir = resolve(REPO_ROOT, getArg('--out') ?? join('public', 'simulation'));
const seedOffset = getArg('--seed') !== undefined ? Number.parseInt(getArg('--seed')!, 10) : 0;

let selected: Scenario[];

if (process.argv.includes('--all')) {
  selected = SCENARIOS;
} else {
  const ids = getArgAll('--scenario');

  if (ids.length === 0) {
    throw new Error('Nothing to do. Pass --all, one or more --scenario <id>, or --list. See --list for ids.');
  }
  selected = ids.map((id) => {
    const s = getScenario(id);

    if (!s) {
      throw new Error(`Unknown scenario "${id}". Run with --list to see the available ids.`);
    }

    return s;
  });
}

mkdirSync(outDir, { recursive: true });

const startAll = performance.now();

log(`Generating ${selected.length} scenario(s) into ${outDir}\n`);

for (const scenario of selected) {
  const start = performance.now();
  const { entries, stats } = generateScenario(scenario, seedOffset);
  const outPath = join(outDir, scenario.file);

  writeFileSync(outPath, JSON.stringify(entries));

  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  const capped = stats.warheads >= stats.cappedAt ? ' (hit cap)' : '';

  log(
    `  ${scenario.file.padEnd(30)} ${String(stats.warheads).padStart(3)} warheads / ${String(stats.buses).padStart(3)} buses${capped}` +
    `  cover ${stats.targetsCovered}/${stats.targetsAvailable} targets  ${elapsed}s`,
  );
}

const total = ((performance.now() - startAll) / 1000).toFixed(1);

log(`\nDone in ${total}s.`);
