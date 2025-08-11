import { t7e } from '@app/locales/keys';

export class DebugMenuPlugin {
  init() {
    console.error(t7e('plugins.proOnlyMsg'));
  }
}
