import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveWithin } from '../../lib/safe-path';

const HERE = dirname(fileURLToPath(import.meta.url));

export const BASE_TEMPLATES_DIR = resolve(HERE, '..', 'templates');
export const OVERLAY_TEMPLATES_DIR = resolve(HERE, '..', 'templates-overlay');
// The destination ultimately derives from a CLI argument (create/export), so
// every scaffold write is confined to the workspace that contains this repo:
// `create` targets src/plugins-external/ inside the repo, `export` a sibling repo.
const WORKSPACE_ROOT = resolve(HERE, '..', '..', '..', '..');
export const LANGS = ['en', 'cs', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'uk', 'zh'];

export type PluginKind = 'menu' | 'overlay';

export interface TemplateVars {
  PLUGIN_PKG: string;
  CLASS_NAME: string;
  CONFIG_KEY: string;
  DISPLAY_NAME: string;
  ELEMENT_BASE: string;
  ENGINE_RANGE: string;
  ENGINE_REF: string;
  DESCRIPTION: string;
  YEAR: string;
  AUTHOR: string;
}

export function pascalCase(kebab: string): string {
  return kebab.split('-').filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

export function titleCase(kebab: string): string {
  return kebab.split('-').filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

export function kebabCase(input: string): string {
  return input.replace(/^keeptrack-plugin-/u, '').toLowerCase().replaceAll(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '');
}

function substitute(content: string, vars: TemplateVars): string {
  let out = content;

  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`__${key}__`, value);
  }

  return out;
}

/** Map a template-relative path to its rendered destination path. */
function targetRelPath(templateRel: string, vars: TemplateVars): string {
  const segments = templateRel.split(/[\\/]/u);
  const mapped = segments.map((seg) => (seg === 'github' ? '.github' : seg));
  const last = mapped.length - 1;
  let base = mapped[last];

  if (base === 'gitignore.tmpl') {
    base = '.gitignore';
  } else if (base === 'icon.png') {
    // Unique per-plugin name — the png asset rule emits img/[name] without a hash,
    // so a shared "icon.png" would collide across plugins.
    base = `${vars.ELEMENT_BASE}-icon.png`;
  } else {
    base = base.replace(/\.tmpl$/u, '');
  }
  mapped[last] = base;

  return mapped.join('/');
}

function renderTree(srcDir: string, destDir: string, vars: TemplateVars, rel = ''): void {
  for (const name of readdirSync(join(srcDir, rel))) {
    const childRel = rel ? `${rel}/${name}` : name;
    const abs = join(srcDir, childRel);

    if (statSync(abs).isDirectory()) {
      renderTree(srcDir, destDir, vars, childRel);
      continue;
    }

    // en locale is written once here; the other 11 languages are copied afterward.
    if (childRel.startsWith('locales/') && !childRel.startsWith('locales/en.')) {
      continue;
    }

    // targetRelPath is derived from template file names + vars; confine the write
    // to destDir so a template path can never escape the scaffold directory.
    const destAbs = resolveWithin(destDir, targetRelPath(childRel, vars));

    mkdirSync(dirname(destAbs), { recursive: true });

    // Binary assets (e.g. icon.png) are copied verbatim; text templates are substituted.
    if (childRel.endsWith('.tmpl')) {
      writeFileSync(destAbs, substitute(readFileSync(abs, 'utf8'), vars), 'utf8');
    } else {
      copyFileSync(abs, destAbs);
    }
  }
}

/** Copy the rendered en.src.json to all 12 language files as translation stubs. */
function writeAllLocales(dir: string): void {
  const en = join(dir, 'locales', 'en.src.json');

  if (!existsSync(en)) {
    return;
  }

  for (const lang of LANGS) {
    if (lang === 'en') {
      continue;
    }
    copyFileSync(en, join(dir, 'locales', `${lang}.src.json`));
  }
}

/** Render a full plugin skeleton of the given kind into `destDir`. */
export function renderPlugin(destDir: string, kind: PluginKind, vars: TemplateVars): void {
  // destDir traces back to a CLI argument — validate it lands inside the
  // workspace before creating anything, then thread the validated path through.
  const safeDest = resolveWithin(WORKSPACE_ROOT, destDir);

  mkdirSync(safeDest, { recursive: true });
  renderTree(BASE_TEMPLATES_DIR, safeDest, vars);
  // Overlay kind replaces the menu-specific source/test/locale with toggle variants.
  if (kind === 'overlay') {
    renderTree(OVERLAY_TEMPLATES_DIR, safeDest, vars);
  }
  writeAllLocales(safeDest);
}

/** Build template vars for a plugin from its kebab base name + metadata. */
export function buildVars(base: string, hostVersion: string, opts: { description: string; author: string }): TemplateVars {
  const major = Number.parseInt(hostVersion.split('.')[0], 10);

  return {
    PLUGIN_PKG: `keeptrack-plugin-${base}`,
    CLASS_NAME: `${pascalCase(base)}Plugin`,
    CONFIG_KEY: `${pascalCase(base)}Plugin`,
    DISPLAY_NAME: titleCase(base),
    ELEMENT_BASE: base,
    ENGINE_RANGE: `>=${major}.0.0 <${major + 1}.0.0`,
    ENGINE_REF: `v${hostVersion}`,
    DESCRIPTION: opts.description,
    YEAR: String(new Date().getFullYear()),
    AUTHOR: opts.author,
  };
}
