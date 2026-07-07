import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const EXPECTED_LANGS = ['en', 'cs', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'uk', 'zh'];

export interface LocaleReport {
  hasLocales: boolean;
  missingLangs: string[];
  /** Languages present but missing one or more keys relative to en. */
  incompleteLangs: { lang: string; missingKeys: string[] }[];
  /** True if every locale root is namespaced under plugins.<configKey>. */
  namespaceOk: boolean;
}

/** Recursively collect dotted leaf-key paths from a nested object. */
function flatten(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') {
    return [prefix];
  }

  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
}

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Check locale completeness + namespacing for an installed plugin. */
export function checkLocales(dir: string, configKeys: string[], localesDir = 'locales'): LocaleReport {
  const abs = join(dir, localesDir);
  const report: LocaleReport = { hasLocales: false, missingLangs: [...EXPECTED_LANGS], incompleteLangs: [], namespaceOk: true };

  if (!existsSync(abs)) {
    return report;
  }

  const enFile = join(abs, 'en.src.json');
  const en = existsSync(enFile) ? readJson(enFile) : null;

  if (!en) {
    return report;
  }

  report.hasLocales = true;

  const plugins = (en.plugins ?? {}) as Record<string, unknown>;

  report.namespaceOk = Object.keys(en).every((k) => k === 'plugins') && configKeys.every((ck) => ck in plugins);

  const present = readdirSync(abs).filter((f) => f.endsWith('.src.json')).map((f) => f.replace(/\.src\.json$/u, ''));

  report.missingLangs = EXPECTED_LANGS.filter((lang) => !present.includes(lang));

  const enKeys = new Set(flatten(en));

  for (const lang of present) {
    if (lang === 'en') {
      continue;
    }
    const data = readJson(join(abs, `${lang}.src.json`));
    const langKeys = data ? new Set(flatten(data)) : new Set<string>();
    const missingKeys = [...enKeys].filter((k) => !langKeys.has(k));

    if (missingKeys.length > 0) {
      report.incompleteLangs.push({ lang, missingKeys: missingKeys.slice(0, 8) });
    }
  }

  return report;
}
