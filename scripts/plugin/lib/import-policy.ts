/**
 * Import policy for external plugins: they may import only the public facade.
 *
 * The rule itself is the Biome grit plugin biome-plugins/plugin-api-imports.grit,
 * run here through its dedicated config (biome-plugins/plugin-api/). The host
 * `npm run lint` cannot carry it because it excludes src/plugins-external/**.
 * This module runs that check, maps each finding to a facade replacement hint,
 * and adds the one check grit cannot express: a relative import must stay inside
 * the plugin's own folder.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { REPO_ROOT } from './paths';

const require = createRequire(import.meta.url);

/** Keep in sync with the allowlist regex in biome-plugins/plugin-api-imports.grit. */
export const ALLOWED_SPECIFIER = /^(?:@keeptrack\/plugin-api(?:\/testing)?|ootk|vitest|\.\.?\/.*)$/u;

const BIOME_CONFIG_DIR = resolve(REPO_ROOT, 'biome-plugins', 'plugin-api');
const SOURCE_EXT = /\.(?:[cm]?[jt]sx?)$/u;

/** One disallowed import found in a plugin. */
export interface ImportViolation {
  /** Plugin-relative POSIX path of the file. */
  file: string;
  /** 1-based line. */
  line: number;
  /** The module specifier as written (or the raw expression for a non-literal dynamic import). */
  specifier: string;
  /** Why it is not allowed. */
  reason: 'not-allowed' | 'escapes-plugin';
  /** Suggested facade replacement, when one exists. */
  hint: string | null;
}

/** Result of {@link checkPluginImports}. */
export interface ImportCheckResult {
  violations: ImportViolation[];
  /** Set when Biome could not run; a TypeScript-based scan with the same allowlist ran instead. */
  biomeError: string | null;
}

const FACADE = "'@keeptrack/plugin-api'";
const TESTING = "'@keeptrack/plugin-api/testing'";

/** Internal module -> what to import instead. First match wins. */
const REPLACEMENTS: ReadonlyArray<{ match: RegExp; hint: string }> = [
  { match: /engine\/plugins\/base-plugin$/u, hint: `KeepTrackPlugin from ${FACADE}` },
  { match: /engine\/plugins\/top-menu-plugin$/u, hint: `TopMenuPlugin from ${FACADE}` },
  {
    match: /engine\/plugins\/core\/plugin-capabilities$/u,
    hint: `capability types (IBottomIconConfig, ISideMenuConfig, IHelpConfig, ICommandPaletteCommand, IKeyboardShortcut, ...), IconPlacement, UtilityGroup from ${FACADE}`,
  },
  { match: /engine\/core\/interfaces$/u, hint: `MenuMode, ToastMsgType, ToastAction from ${FACADE}` },
  { match: /engine\/events\/event-bus-events$/u, hint: `EventBusEvent from ${FACADE}` },
  { match: /engine\/events\/event-bus$/u, hint: `EventBus, EngineEventMap from ${FACADE}` },
  {
    match: /engine\/core\/service-locator$/u,
    hint: `a helper from ${FACADE} (toast, getSimTime, jumpToTime, getSensor, getSatByNorad, findObjectIdByNorad) or keepTrackApi.getXxxManager()`,
  },
  { match: /engine\/core\/plugin-registry$/u, hint: `keepTrackApi.getPlugin(...) from ${FACADE}` },
  { match: /keepTrackApi$/u, hint: `keepTrackApi from ${FACADE}` },
  { match: /engine\/utils\/get-el$/u, hint: `getEl from ${FACADE}` },
  { match: /engine\/utils\/development\/formatter$/u, hint: `html from ${FACADE}` },
  { match: /engine\/utils\/showLoading$/u, hint: `showLoading, hideLoading from ${FACADE}` },
  { match: /engine\/ui\/material-select$/u, hint: `initMaterialSelects from ${FACADE}` },
  { match: /engine\/ui\/side-menu-tabs$/u, hint: `buildSideMenuTabsHtml, initSideMenuTabs from ${FACADE}` },
  { match: /engine\/utils\/colorbox$/u, hint: `openColorbox, closeColorbox from ${FACADE}` },
  { match: /engine\/utils\/saveVariable$/u, hint: `saveCsv, saveXlsx, saveVariable, copyTsvToClipboard from ${FACADE}` },
  { match: /engine\/utils\/errorManager$/u, hint: `errorManagerInstance from ${FACADE}` },
  { match: /persistence(?:-manager|\/.*)?$/u, hint: `createPluginStorage(configKey) from ${FACADE}` },
  { match: /locales\/keys$/u, hint: `t7e, or pluginT7e(configKey) for your own keys, from ${FACADE}` },
  { match: /settings\/settings$/u, hint: `settingsManager from ${FACADE}` },
  { match: /select-sat-manager(?:\/.*)?$/u, hint: `getSelectedSat, selectSat, selectSatByNorad, isCurrentSelection from ${FACADE}` },
  { match: /sat-info-box(?:\/.*)?$/u, hint: `addSatInfoBoxSection, isCurrentSelection from ${FACADE}` },
  { match: /tooltips(?:\/.*)?$/u, hint: `createTooltip from ${FACADE}` },
  { match: /sensors\/DetailedSensor$/u, hint: `type DetailedSensor (and getSensor) from ${FACADE}` },
  { match: /^@ootk\//u, hint: "'ootk' (the public package; same code, single instance)" },
  { match: /^@test\/environment\/standard-env$/u, hint: `setupStandardEnvironment, setupDefaultHtml from ${TESTING}` },
  { match: /^@test\/generic-tests$/u, hint: `standardPluginSuite, standardPluginSmokeSuite, standardPluginMenuButtonTests, websiteInit from ${TESTING}` },
  { match: /^@public\//u, hint: 'copy the asset into your plugin folder and import it with a relative path' },
];

/** Facade replacement for a disallowed specifier, or null when none is known. */
export function replacementHint(specifier: string): string | null {
  return REPLACEMENTS.find((r) => r.match.test(specifier))?.hint ?? null;
}

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) {
      continue;
    }
    const abs = join(dir, name);

    if (statSync(abs).isDirectory()) {
      listSourceFiles(abs, out);
    } else if (SOURCE_EXT.test(name) && !name.endsWith('.d.ts')) {
      out.push(abs);
    }
  }

  return out;
}

const toPosix = (p: string): string => p.replaceAll('\\', '/');

/**
 * TypeScript-based scan of every literal import. Always reports relative
 * specifiers that resolve outside the plugin folder (grit allows any `./` or
 * `../`). With `includeDisallowed` it also reports non-allowed specifiers: the
 * fallback when Biome cannot run, so the gate never silently passes.
 */
function scanWithTypescript(pluginDir: string, includeDisallowed: boolean): ImportViolation[] {
  const violations: ImportViolation[] = [];

  for (const file of listSourceFiles(pluginDir)) {
    const text = readFileSync(file, 'utf8');
    const info = ts.preProcessFile(text, true, true);

    for (const ref of info.importedFiles) {
      const spec = ref.fileName;
      const line = text.slice(0, ref.pos).split('\n').length;
      const rel = toPosix(relative(pluginDir, file));

      if (spec.startsWith('.')) {
        const target = relative(pluginDir, resolve(dirname(file), spec));

        if (target.startsWith('..') || isAbsolute(target)) {
          violations.push({ file: rel, line, specifier: spec, reason: 'escapes-plugin', hint: replacementHint(spec) });
        }
      } else if (includeDisallowed && !ALLOWED_SPECIFIER.test(spec)) {
        violations.push({ file: rel, line, specifier: spec, reason: 'not-allowed', hint: replacementHint(spec) });
      }
    }
  }

  return violations;
}

interface BiomeDiagnostic {
  category?: string;
  location?: { path?: string; start?: { line: number; column: number } };
}

/** Read the specifier text Biome pointed at (1-based line/column at its opening quote or expression). */
function specifierAt(absFile: string, line: number, column: number): string {
  const lines = readFileSync(absFile, 'utf8').split(/\r?\n/u);
  const rest = (lines[line - 1] ?? '').slice(Math.max(0, column - 1));
  const quoted = /^(['"`])(.*?)\1/u.exec(rest);

  if (quoted) {
    return quoted[2];
  }

  return /^[^),;]*/u.exec(rest)?.[0].trim() || rest.trim();
}

function runBiome(pluginDir: string): { violations: ImportViolation[]; error: string | null } {
  let biomeBin: string;

  try {
    biomeBin = require.resolve('@biomejs/biome/bin/biome');
  } catch {
    return { violations: [], error: 'Biome is not installed (npm install).' };
  }

  /*
   * Lint the plugin as Biome's working directory (`.`) so the caller's path never
   * becomes a command-line argument: every argv entry below is a constant.
   */
  const target = resolve(pluginDir);

  if (!existsSync(target) || !statSync(target).isDirectory()) {
    return { violations: [], error: `Not a plugin folder: ${target}` };
  }

  const res = spawnSync(process.execPath, [biomeBin, 'lint', `--config-path=${BIOME_CONFIG_DIR}`, '--reporter=json', '--max-diagnostics=none', '.'], {
    cwd: target,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = res.stdout ?? '';
  const start = out.indexOf('{');

  if (start === -1) {
    return { violations: [], error: (res.stderr || out || `biome exited with ${res.status}`).trim().split('\n').slice(0, 5).join('\n') };
  }

  let parsed: { diagnostics?: BiomeDiagnostic[] };

  try {
    parsed = JSON.parse(out.slice(start)) as { diagnostics?: BiomeDiagnostic[] };
  } catch (e) {
    return { violations: [], error: `Could not parse Biome output: ${(e as Error).message}` };
  }

  const violations: ImportViolation[] = [];

  for (const d of parsed.diagnostics ?? []) {
    if (d.category !== 'plugin' || !d.location?.path || !d.location.start) {
      continue;
    }
    const absFile = resolve(target, d.location.path);
    const specifier = existsSync(absFile) ? specifierAt(absFile, d.location.start.line, d.location.start.column) : '(unknown)';

    violations.push({
      file: toPosix(relative(target, absFile)),
      line: d.location.start.line,
      specifier,
      reason: 'not-allowed',
      hint: replacementHint(specifier),
    });
  }

  return { violations, error: null };
}

/**
 * Check every source file of a plugin folder against the import policy. Under
 * src/plugins-external/ this runs the Biome grit rule (plus the relative-path
 * check); anywhere else it runs the TypeScript scan with the same allowlist.
 */
export function checkPluginImports(pluginDir: string): ImportCheckResult {
  const isUnderExternalDir = toPosix(resolve(pluginDir)).includes('/plugins-external/');
  // The grit rule only fires under plugins-external/ (by $filename); elsewhere
  // (e.g. the template export target) fall back to the TypeScript scan.
  const biome = isUnderExternalDir ? runBiome(pluginDir) : { violations: [], error: 'not under src/plugins-external/' };
  const violations = [...biome.violations, ...scanWithTypescript(pluginDir, biome.error !== null)];

  violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  return { violations, biomeError: biome.error };
}

/** One human-readable line per violation (used by doctor and the add/update gates). */
export function formatViolation(v: ImportViolation): string {
  const what = v.reason === 'escapes-plugin' ? 'reaches outside the plugin folder' : 'is not part of the plugin API';
  const fix = v.hint ? ` -> use ${v.hint}` : '';

  return `${v.file}:${v.line} '${v.specifier}' ${what}${fix}`;
}
