import { type Page } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Locale modes for the layout check (#615). KT_LAYOUT_LOCALE=<code> boots the app in that language; `longest`
 * boots in German with the German bundle replaced by one whose every key holds the longest string any shipped
 * language has for it.
 *
 * How the language is forced: the app's i18next uses the browser language detector, which reads localStorage
 * `i18nextLng` before navigator.language. An init script sets it before any page script runs. For `longest` the
 * German locale chunk (dist/js/<n>.<hash>.js, `e.exports=JSON.parse('...')`) is intercepted with page.route and
 * its JSON replaced, so the replacement is in place before locales load and before any menu DOM is built.
 */
export const DEFAULT_LOCALE = 'en';
export const LONGEST = 'longest';
const CARRIER = 'de';
const SHIPPED = ['en', 'cs', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'uk', 'zh'];
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DIST_JS = join(ROOT, 'dist/js');

/** The requested locale (`en` when KT_LAYOUT_LOCALE is unset). */
export const requestedLocale = (): string => (process.env.KT_LAYOUT_LOCALE ?? '').trim() || DEFAULT_LOCALE;

/** Allowlist key: the project name for the default locale, `<project>@<locale>` otherwise. */
export const allowKey = (project: string): string => (requestedLocale() === DEFAULT_LOCALE ? project : `${project}@${requestedLocale()}`);

/** Display width of a string: CJK and Hangul characters count double so a short CJK string does not win over a long Latin one. */
function width(s: string): number {
  let w = 0;

  for (const ch of s) {
    w += /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uff00-\uffef]/u.test(ch) ? 2 : 1;
  }

  return w;
}

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function walk(node: Json, path: string, visit: (path: string, value: string) => void): void {
  if (typeof node === 'string') {
    visit(path, node);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      walk(v, path ? `${path}\u0000${k}` : k, visit);
    }
  }
}

/** Builds the longest-per-key bundle from the locale JSON the build produces (src/locales/<code>.json, which already holds the plugin strings). */
export function buildLongestBundle(): { bundle: Json; keys: number; changed: number } {
  const longest = new Map<string, string>();
  const english = new Map<string, string>();

  for (const code of SHIPPED) {
    const data = JSON.parse(readFileSync(join(ROOT, 'src/locales', `${code}.json`), 'utf8')) as Json;

    walk(data, '', (path, value) => {
      if (code === 'en') {
        english.set(path, value);
      }
      const cur = longest.get(path);

      if (cur === undefined || width(value) > width(cur)) {
        longest.set(path, value);
      }
    });
  }
  const bundle: Record<string, Json> = {};
  let changed = 0;

  for (const [path, value] of longest) {
    const parts = path.split('\u0000');
    let node = bundle;

    for (const part of parts.slice(0, -1)) {
      node = (node[part] ??= {}) as Record<string, Json>;
    }
    node[parts[parts.length - 1]] = value;
    if (value !== english.get(path)) {
      changed++;
    }
  }

  return { bundle, keys: longest.size, changed };
}

/** Finds the German chunk by its content: the chunk whose JSON equals src/locales/de.json. */
function findCarrierChunk(): string {
  const de = JSON.stringify(JSON.parse(readFileSync(join(ROOT, 'src/locales/de.json'), 'utf8')));

  for (const f of readdirSync(DIST_JS).filter((n) => /^\d+\.[0-9a-f]+\.js$/u.test(n))) {
    const text = readFileSync(join(DIST_JS, f), 'utf8');
    const start = text.indexOf('JSON.parse(');
    const end = text.lastIndexOf(')}}]);');

    if (start < 0 || end < 0) {
      continue;
    }
    try {
      const literal = text.slice(start + 'JSON.parse('.length, end);
      const json = new Function(`return ${literal}`)() as string;

      if (JSON.stringify(JSON.parse(json)) === de) {
        return f;
      }
    } catch {
      // not a JSON locale chunk
    }
  }
  throw new Error('German locale chunk not found in dist/js (is dist/ a current build?)');
}

export interface LocaleState {
  locale: string;
  /** Keys in the longest bundle and how many differ from English (longest mode only). */
  keys?: number;
  changed?: number;
  /** True once the German chunk was replaced (longest mode only). */
  replaced: boolean;
}

/** Call before the first navigation. Returns state the test can assert on after boot. */
export async function installLocale(page: Page): Promise<LocaleState> {
  const locale = requestedLocale();
  const state: LocaleState = { locale, replaced: false };
  const code = locale === LONGEST ? CARRIER : locale;

  if (!SHIPPED.includes(code)) {
    throw new Error(`KT_LAYOUT_LOCALE=${locale}: not one of ${SHIPPED.join(', ')} or ${LONGEST}`);
  }
  if (code !== DEFAULT_LOCALE) {
    await page.addInitScript((lng) => {
      try {
        window.localStorage.setItem('i18nextLng', lng);
      } catch {
        // storage blocked: the assertion after boot reports it
      }
    }, code);
  }
  if (locale === LONGEST) {
    if (!existsSync(DIST_JS)) {
      throw new Error('dist/js not found');
    }
    const { bundle, keys, changed } = buildLongestBundle();
    const chunk = findCarrierChunk();
    const original = readFileSync(join(DIST_JS, chunk), 'utf8');
    const body = `${original.slice(0, original.indexOf('JSON.parse(') + 'JSON.parse('.length)}${JSON.stringify(JSON.stringify(bundle))}${original.slice(original.lastIndexOf(')}}]);'))}`;

    state.keys = keys;
    state.changed = changed;
    await page.route(`**/js/${chunk}`, async (route) => {
      state.replaced = true;
      await route.fulfill({ contentType: 'application/javascript', body });
    });
  }

  return state;
}

/** After boot: the document language is the one asked for (the carrier language in longest mode), and the longest bundle was served. */
export async function assertLocaleActive(page: Page, state: LocaleState): Promise<void> {
  const want = state.locale === LONGEST ? CARRIER : state.locale;
  const lang = await page.evaluate(() => document.documentElement.lang);

  if (lang !== want) {
    throw new Error(`active language is "${lang}", wanted "${want}" (KT_LAYOUT_LOCALE=${state.locale})`);
  }
  if (state.locale === LONGEST && !state.replaced) {
    throw new Error('longest mode: the German chunk was never requested, the longest bundle was not used');
  }
}
