import { t7e } from '@app/locales/keys';
import './offline-banner.css';

/** Cached catalog older than this is called out as possibly out of date. */
export const CATALOG_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** Message the service worker posts when it answers a catalog request from its cache. */
export interface CatalogFromCacheMessage {
  type: 'CATALOG_FROM_CACHE';
  /** Epoch ms when the cached copy was stored */
  cachedAt: number;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** Localized "3 days ago" style age for a cache timestamp. */
export const formatCatalogAge = (cachedAt: number, now = Date.now(), locale?: string): string => {
  const diff = Math.max(0, now - cachedAt);
  const [unit, ms] = UNITS.find(([, size]) => diff >= size) ?? UNITS[2];

  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.floor(diff / ms), unit);
  } catch {
    return `${Math.floor(diff / ms)} ${unit}`;
  }
};

/** Viewport width below which side menus fill the screen (matches the phone layout breakpoint). */
export const PHONE_MAX_WIDTH = 639;

/** #518: on a phone an open side menu fills the screen, so the banner steps aside instead of covering its title and fields. */
export const shouldYieldToMenu = (viewportWidth: number, menuOpen: boolean): boolean => viewportWidth <= PHONE_MAX_WIDTH && menuOpen;

const isMenuOpen_ = (): boolean =>
  Array.from(document.querySelectorAll<HTMLElement>('.side-menu-parent')).some((menu) => {
    const style = getComputedStyle(menu);

    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    const rect = menu.getBoundingClientRect();

    return rect.width > 0 && rect.height > 0;
  });

/**
 * Persistent, non-blocking notice while the browser is offline. Not tied to an account: it is
 * shown to anonymous and signed-in users alike. When the service worker serves the catalog from
 * its cache, the banner also states how old that copy is.
 */
export class OfflineBanner {
  private el_: HTMLDivElement | null = null;
  private catalogEl_: HTMLSpanElement | null = null;
  private cachedAt_: number | null = null;
  private readonly onOnline_ = (): void => this.render_();
  private readonly onOffline_ = (): void => this.render_();
  private menuObserver_: MutationObserver | null = null;
  private rafId_ = 0;
  private readonly syncMenu_ = (): void => {
    this.rafId_ = 0;
    this.el_?.classList.toggle('kt-offline-banner--behind-menu', shouldYieldToMenu(window.innerWidth, isMenuOpen_()));
  };
  private readonly scheduleSyncMenu_ = (): void => {
    if (!this.rafId_) {
      this.rafId_ = requestAnimationFrame(this.syncMenu_);
    }
  };
  private readonly onMessage_ = (event: MessageEvent): void => {
    const data = event.data as Partial<CatalogFromCacheMessage> | null;

    if (data?.type === 'CATALOG_FROM_CACHE' && typeof data.cachedAt === 'number') {
      this.cachedAt_ = data.cachedAt;
      this.render_();
    }
  };

  get isOffline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  init(): void {
    window.addEventListener('online', this.onOnline_);
    window.addEventListener('offline', this.onOffline_);
    navigator.serviceWorker?.addEventListener('message', this.onMessage_);
    window.addEventListener('resize', this.scheduleSyncMenu_);
    this.menuObserver_ = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.target instanceof Element && m.target.matches('.side-menu-parent'))) {
        this.scheduleSyncMenu_();
      }
    });
    this.menuObserver_.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'], subtree: true });
    this.render_();
  }

  destroy(): void {
    window.removeEventListener('online', this.onOnline_);
    window.removeEventListener('offline', this.onOffline_);
    navigator.serviceWorker?.removeEventListener('message', this.onMessage_);
    window.removeEventListener('resize', this.scheduleSyncMenu_);
    this.menuObserver_?.disconnect();
    this.menuObserver_ = null;
    this.el_?.remove();
    this.el_ = null;
    this.catalogEl_ = null;
  }

  private ensureElement_(): HTMLDivElement {
    if (!this.el_) {
      const el = document.createElement('div');

      el.id = 'kt-offline-banner';
      el.className = 'kt-offline-banner';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.innerHTML = '<span class="kt-offline-banner-message"></span><span class="kt-offline-banner-catalog" hidden></span>';
      document.body.appendChild(el);
      this.el_ = el;
      this.catalogEl_ = el.querySelector('.kt-offline-banner-catalog');
    }

    return this.el_;
  }

  private render_(): void {
    if (!this.isOffline) {
      if (this.el_) {
        this.el_.hidden = true;
      }

      return;
    }
    const el = this.ensureElement_();

    el.hidden = false;
    this.syncMenu_();
    (el.querySelector('.kt-offline-banner-message') as HTMLElement).textContent = t7e('offlineBanner.message');

    if (this.catalogEl_) {
      if (this.cachedAt_ === null) {
        this.catalogEl_.hidden = true;
      } else {
        const age = formatCatalogAge(this.cachedAt_);
        const stale = Date.now() - this.cachedAt_ > CATALOG_STALE_AFTER_MS;

        this.catalogEl_.textContent = t7e(stale ? 'offlineBanner.catalogStale' : 'offlineBanner.catalogAge', { age });
        this.catalogEl_.hidden = false;
      }
    }
  }
}

let instance: OfflineBanner | null = null;

/** Installs the single banner for the page (idempotent). */
export const installOfflineBanner = (): OfflineBanner => {
  if (!instance) {
    instance = new OfflineBanner();
    instance.init();
  }

  return instance;
};
