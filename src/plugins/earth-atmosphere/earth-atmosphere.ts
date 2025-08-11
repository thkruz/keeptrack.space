import { t7e } from '@app/locales/keys';
import { KeepTrackPlugin } from '../../plugins/KeepTrackPlugin';

export class EarthAtmosphere extends KeepTrackPlugin {
  init() {
    console.error(t7e('plugins.proOnlyMsg'));
  }
}
