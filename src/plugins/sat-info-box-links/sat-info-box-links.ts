import { t7e } from '@app/locales/keys';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';

export class SatInfoBoxLinks extends KeepTrackPlugin {
  init() {
    console.error(t7e('plugins.proOnlyMsg'));
  }
}
