import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class Astronomy extends KeepTrackPlugin {
  init() {
    console.error(
      'Astronomy plugin is a pro plugin. Your .env file is improperly configured or you do not have the pro files!',
    );
  }
}
