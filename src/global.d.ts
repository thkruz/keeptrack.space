import { KeepTrack } from './keeptrack';

declare global {
  const __VERSION__: string;
  const __VERSION_DATE__: string;
  const __COMMIT_HASH__: string;
  const __IS_PRO__: boolean;
  const __EDITION__: string;
  const __PROPAGATOR_BACKEND__: 'sgp4' | 'sgp4-wasm' | 'sgp4-xp-wasm';
  /** KEEPTRACK_DEV_API_KEY for dev/watch/test builds; always '' in production builds. */
  const __DEV_API_KEY__: string;
  /** PUBLIC_TURNSTILE_SITE_KEY (public Cloudflare Turnstile site key); '' disables captcha. */
  const __TURNSTILE_SITE_KEY__: string;

  interface Window {
    keepTrack: KeepTrack;
    /** Embed API facade, installed by src/main.ts in every build. */
    keepTrackEmbed?: import('./embed/embed-types').KeepTrackEmbedApi;
    zaraz?: {
      consent?: {
        get: (key: string) => boolean;
        modal: boolean;
      };
    };
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export {};
