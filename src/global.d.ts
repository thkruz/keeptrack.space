import { KeepTrack } from './keeptrack';

declare global {
  const __VERSION__: string;
  const __VERSION_DATE__: string;
  const __COMMIT_HASH__: string;
  const __IS_PRO__: boolean;
  const __EDITION__: string;

  interface Window {
    keepTrack: KeepTrack;
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

export { };

