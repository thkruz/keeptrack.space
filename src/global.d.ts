import { KeepTrack } from './keeptrack';

declare global {
  interface Window {
    keepTrack: KeepTrack;
    zaraz?: {
      consent?: {
        get: (key: string) => boolean;
        modal: boolean;
      };
    };
  }
}

export { };

