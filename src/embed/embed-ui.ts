import type { EmbedContext } from './embed-context';
import type { EmbedEngine } from './embed-engine';
import type { EmbedUiFlags } from './embed-types';

const STYLE_ID = 'keeptrack-embed-ui';

/** Elements with no engine setting to switch them off are hidden with CSS. */
const HIDE_SELECTORS: Partial<Record<keyof EmbedUiFlags, string[]>> = {
  bottomMenu: ['#nav-footer'],
  topMenu: ['#nav-wrapper'],
  search: ['#search-holder', '#search-results'],
  timeControls: ['#datetime-text', '#datetime-input', '#time-slider-container'],
  infoBox: ['#sat-infobox'],
};

/** Hide or show the CSS-controlled UI parts. Only listed flags change; true shows, false hides. */
export function applyEmbedUiCss(flags: Partial<EmbedUiFlags>, hidden: Set<keyof EmbedUiFlags>): void {
  for (const key of Object.keys(HIDE_SELECTORS) as (keyof EmbedUiFlags)[]) {
    if (flags[key] === false) {
      hidden.add(key);
    } else if (flags[key] === true) {
      hidden.delete(key);
    }
  }
  const css = [...hidden]
    .flatMap((key) => HIDE_SELECTORS[key] ?? [])
    .map((sel) => `${sel}{display:none !important;}`)
    .join('\n');

  try {
    let style = document.getElementById(STYLE_ID);

    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = css;
  } catch {
    // No DOM (tests): nothing to hide
  }
}

const FLAG_KEYS: (keyof EmbedUiFlags)[] = ['bottomMenu', 'topMenu', 'search', 'timeControls', 'keyboard', 'contextMenu', 'toasts', 'infoBox'];

/**
 * Runtime UI toggling. Best effort: never throws, ignores unknown keys and non-boolean values.
 *
 * Runtime: keyboard, contextMenu, toasts (the engine reads the setting on every use); topMenu,
 * timeControls, infoBox, bottomMenu, search (CSS show/hide).
 * Boot-only limitation: a bottomMenu or search disabled in the boot config was never built by the
 * engine, so enabling it later has nothing to show.
 * timeControls stays off while the host owns time.
 */
export class EmbedUi {
  private readonly hidden_ = new Set<keyof EmbedUiFlags>();

  constructor(
    private readonly ctx_: EmbedContext,
    private readonly engine_: EmbedEngine
  ) {}

  /** The set of flags hidden at boot, so later CSS updates build on it. */
  get hidden(): Set<keyof EmbedUiFlags> {
    return this.hidden_;
  }

  apply(flags: Partial<EmbedUiFlags>): void {
    try {
      if (!flags || typeof flags !== 'object') {
        return;
      }
      const clean: Partial<EmbedUiFlags> = {};

      for (const key of FLAG_KEYS) {
        if (typeof flags[key] === 'boolean') {
          clean[key] = flags[key];
        }
      }
      if (this.ctx_.ownerOf('time') === 'host' && clean.timeControls !== undefined) {
        clean.timeControls = false;
      }
      applyEmbedUiCss(clean, this.hidden_);
      this.engine_.applyRuntimeUi({ keyboard: clean.keyboard, contextMenu: clean.contextMenu, toasts: clean.toasts });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[keepTrackEmbed] setUi failed', e);
    }
  }
}
