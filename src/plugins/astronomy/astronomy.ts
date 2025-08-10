import { t7e } from '@app/locales/keys';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class Astronomy extends KeepTrackPlugin {
  init() {
    console.error(t7e('plugins.proOnlyMsg'));
  }
}
